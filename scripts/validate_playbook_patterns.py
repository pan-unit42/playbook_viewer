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
            try:
                validate_pattern(pb, oid, pattern)
            except Exception as e:
                print '{} - {}\nerror validating: {}\n{}\n'.format(pb, oid, pattern, e)
        else:
            print '{} - {} has no pattern'.format(pb, oid)


def process_file(pb, fp):
    with open(fp, 'r') as raw_json:
        try:
            bundle = json.load(raw_json)

            if bundle.get('type', '') == 'bundle' and bundle.get('spec_version', '') == '2.0':
                process_playbook(pb, bundle)
            else:
                print '{} - no valid stix 2.0 bundle found'.format(pb)
        except Exception as e:
            print '{} - could not parse json from file\n{}'.format(pb, e)


def main():
    if len(sys.argv) == 1:
        p = os.path.join('.', 'playbooks')
        pb_list = sorted([f for f in os.listdir(p) if os.path.isfile(os.path.join(p, f)) and f.endswith('.json')])

        for pb in pb_list:
            fp = os.path.join(p, pb)
            process_file(pb, fp)

        print '\n\nprocessed {} files.'.format(len(pb_list))
    elif len(sys.argv) == 2:
        if sys.argv[1] in ["p", "'p'", "P", "'P'"]:
            # Use raw_input to avoid issues with bash or other shells escaping characters
            pattern = raw_input('--> ')
            print 'validating: {}'.format(pattern)
            validate_pattern('-', '-', pattern)
        else:
            pb = os.path.basename(sys.argv[1])
            fp = sys.argv[1]
            process_file(pb, fp)
    else:
        usage = "error {} args given - use 0 args (process playbooks) or " \
                "1 arg ('p' - process pattern, or './path/to/playbook.json' - process playbook)".format(len(sys.argv))
        print usage


if __name__ == '__main__':
    # A quick script for debugging STIX 2.0 patterns or validating Playbooks
    main()
