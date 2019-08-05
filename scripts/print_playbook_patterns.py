import json
import os
import sys


def process_playbook(pb, bundle):
    objects = bundle.get('objects', [])

    indicator_objects = [o for o in objects if o['type'] == 'indicator']

    indicator_patterns = sorted([o['pattern'] for o in indicator_objects])

    print 'indicator patterns from {}\n'.format(pb)
    for p in indicator_patterns:
        print p


def process_file(fp):
    with open(fp, 'r') as raw_json:
        try:
            pb = os.path.basename(fp)
            bundle = json.load(raw_json)

            if bundle.get('type', '') == 'bundle' and bundle.get('spec_version', '') == '2.0':
                process_playbook(pb, bundle)
            else:
                print '{} - no valid stix 2.0 bundle found'.format(pb)
        except Exception as e:
            print '{} - could not parse json from file\n{}'.format(pb, e)


def main():
    if len(sys.argv) == 2:
        process_file(sys.argv[1])
    else:
        print 'error {} args given - use 1 arg (path to Playbook)'.format(len(sys.argv))


if __name__ == '__main__':
    main()
