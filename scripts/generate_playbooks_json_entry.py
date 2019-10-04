import json
import os
import sys

from collections import OrderedDict


def build_entry(file_name, industries, regions, malwares):
    title = file_name.split('.')[0].upper()

    # entry = {
    #     "pb_file": file_name,
    #     "title": title,
    #     "industries": industries,
    #     "regions": regions,
    #     "malwares": malwares
    # }

    entry = OrderedDict()
    entry['pb_file'] = file_name
    entry['title'] = title
    entry['industries'] = industries
    entry['regions'] = regions
    entry['malwares'] = malwares

    entry_json = json.dumps(entry)

    print(entry_json)


def process_playbook(pb, bundle):
    objects = bundle.get('objects', [])
    identity_objects = [o for o in objects if o['type'] == 'identity']
    malware_objects = [o for o in objects if o['type'] == 'malware']

    industries = []
    regions = []
    malwares = []

    for obj in identity_objects:
        for sector in obj['sectors']:
            if sector not in industries:
                industries.append(sector)

        for country in obj['x_cta_country']:
            if country not in regions:
                regions.append(country)

    for obj in malware_objects:
        if obj['name'] not in malwares:
            malwares.append(obj['name'])

    industries.sort()
    regions.sort()
    malwares.sort()

    build_entry(pb, industries, regions, malwares)


def process_file(fp):
    with open(fp, 'r') as raw_json:
        try:
            pb = os.path.basename(fp)
            bundle = json.load(raw_json)

            if bundle.get('type', '') == 'bundle' and bundle.get('spec_version', '') == '2.0':
                process_playbook(pb, bundle)
            else:
                print('{} - no valid stix 2.0 bundle found'.format(pb))
        except Exception as e:
            print('{} - could not parse json from file\n{}'.format(pb, e))


def main():
    if len(sys.argv) == 2:
        process_file(sys.argv[1])
    else:
        print('error {} args given - use 1 arg (path to Playbook)'.format(len(sys.argv)))


if __name__ == '__main__':
    main()
