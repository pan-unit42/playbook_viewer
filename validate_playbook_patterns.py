import json
import os
import sys

# https://github.com/oasis-open/cti-pattern-validator
# Tested with stix2-patterns 1.1.0, antlr4-python2-runtime 4.7.2
from stix2patterns.validator import run_validator


def validate_pattern(pb, oid, pattern):
    # Additional logic could be added here
    errors = run_validator(pattern)
    for e in errors:
        print '{} - {}\n{}\n{}\n'.format(pb, oid, pattern, e)


def process_playbook(pb, bundle):
    objects = bundle.get('objects', [])

    indicator_objects = [o for o in objects if o['type'] == 'indicator']

    for o in indicator_objects:
        oid = o['id']
        pattern = o.get('pattern', None)
        if pattern:
            validate_pattern(pb, oid, pattern)
        else:
            print '{} - {} has no pattern'.format(pb, oid)


def main():
    if len(sys.argv) == 1:
        p = os.path.join('.', 'playbook_json')
        pb_list = sorted([f for f in os.listdir(p) if os.path.isfile(os.path.join(p, f)) and f.endswith('.json')])

        for pb in pb_list:
            fp = os.path.join(p, pb)
            with open(fp, 'r') as raw_json:
                try:
                    bundle = json.load(raw_json)

                    if bundle.get('type', '') == 'bundle' and bundle.get('spec_version', '') == '2.0':
                        process_playbook(pb, bundle)
                    else:
                        print '{} - no valid stix 2.0 bundle found'.format(pb)
                except Exception as e:
                    print '{} - could not parse json from file\n{}'.format(pb, e)
    elif len(sys.argv) == 2:
        validate_pattern('-', '-', sys.argv[1])
    else:
        print 'error {} args given - use 0 args (process files) or 1 arg (process pattern)'.format(len(sys.argv))


if __name__ == '__main__':
    main()
