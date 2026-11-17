"""Plan identity, complete narratives, financial joins and country period selection."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def load_script(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


exporter = load_script('uninfo_export', 'python/10-export_uninfo_json.py')
fetcher = load_script('uninfo_fetch', 'python/08-fetch_uninfo.py')
METRICS = {'required': 'Total Required Resources', 'available': 'Total Available Resources',
           'spent': 'Total Expenditure'}


def node(node_id, code='1', parent=None, spent=10, **extra):
    return {'id': node_id, 'code': code, 'parentId': parent, 'name': f'Node {node_id}',
            'metrics': [{'metricName': METRICS['spent'], 'total': spent}], **extra}


def walk(nodes, parent=None):
    for item in nodes:
        yield item, parent
        yield from walk(item.get('children', []), item['id'])


def source_metrics(item):
    values = {metric['metricName']: metric['total'] for metric in item.get('metrics', [])}
    return {key: round(values.get(label, 0), 2) for key, label in METRICS.items()}


class UninfoIntegrityTests(unittest.TestCase):
    def test_finances_bind_to_plan_and_include_its_whole_reported_period(self):
        with patch.object(fetcher, 'request', return_value=[]) as request:
            fetcher.finance(794, ['sdg'])
        params = request.call_args.kwargs['params']
        self.assertIn(('planIds', 794), params)
        self.assertNotIn('workspaceIds', dict(params))
        self.assertNotIn('financeYears', dict(params))

    def test_repeated_display_codes_keep_every_source_identity(self):
        data = {'sp': [node(1), node(2, code='2')],
                'oc': [node(3, parent=1), node(4, parent=2)],
                'ou': [node(5, parent=3), node(6, parent=4)]}
        actual = {item['id']: parent for item, parent in walk(exporter.build_framework_tree(data))}
        self.assertEqual(actual, {1: None, 2: None, 3: 1, 4: 2, 5: 3, 6: 4})

    def test_dated_descriptions_keep_latest_metadata_without_truncation(self):
        old = node(2, parent=1, endDate='2024-12-31')
        text = 'Full narrative description ' * 50
        latest = {**old, 'name': text, 'description': text, 'endDate': '2026-12-31'}
        tree = exporter.build_framework_tree({'sp': [node(1)], 'oc': [old, latest, old]})
        children = tree[0]['children']
        self.assertEqual(len(children), 1)
        self.assertEqual(children[0]['name'], text)
        self.assertEqual(children[0]['description'], text)

    def test_conflicting_identity_and_orphaned_nodes_fail(self):
        original = node(3, parent=1)
        for conflict in [node(3, parent=2), node(3, parent=1, code='2'),
                         node(3, parent=1, spent=20)]:
            with self.subTest(conflict=conflict), self.assertRaises(ValueError):
                exporter.build_framework_tree({'sp': [node(1), node(2)], 'oc': [original, conflict]})
        with self.assertRaises(ValueError):
            exporter.build_framework_tree({'sp': [node(1)], 'ou': [node(4, parent=99)]})

    def test_root_outputs_retain_their_actual_level(self):
        tree = exporter.build_framework_tree({'ou': [node(1)]}, allow_roots=True)
        self.assertEqual(tree[0]['level'], 2)

    def test_all_published_ids_descriptions_and_financial_joins_survive(self):
        raw = ROOT / 'data/uninfo/plans/raw'
        public = ROOT / 'public/data/uninfo/plans'
        manifest = json.loads((public / 'manifest.json').read_text())
        source_plans = {plan['id']: plan for plan in json.loads((raw / 'public_plans.json').read_text())}
        entities = json.loads((raw / 'public_framework_entities.json').read_text())
        finances = json.loads((raw / 'plan_finances.json').read_text())
        for plan_key, summary in manifest['plans'].items():
            plan_id = int(plan_key)
            expected = {}
            for row in entities:
                if row['planId'] != plan_id:
                    continue
                previous = expected.get(row['id'])
                end = row['planEntityVersion'].get('endDate') or ''
                previous_end = (previous or {}).get('planEntityVersion', {}).get('endDate') or ''
                if previous is None or end > previous_end:
                    expected[row['id']] = row
            payload = json.loads((public / f'{plan_id}.json').read_text())
            actual = list(walk(payload['framework']))
            source_finances = {
                row['id']: row for level in ('sp', 'oc', 'ou')
                for row in finances[plan_key][level]
            }
            with self.subTest(plan=plan_id):
                self.assertEqual({row['id'] for row, _ in actual}, set(expected))
                self.assertEqual(len(actual), len(expected))
                self.assertEqual(summary['start'], source_plans[plan_id]['planVersion']['startDate'])
                self.assertEqual(summary['end'], source_plans[plan_id]['planVersion']['endDate'])
                for row, parent in actual:
                    source = expected[row['id']]
                    self.assertEqual(parent, source['parentId'])
                    self.assertEqual(row['name'], source['planEntityVersion'].get('name') or '')
                    self.assertEqual(row.get('description') or '', source['planEntityVersion'].get('description') or '')
                    self.assertEqual(row['has_financial_data'], row['id'] in source_finances)
                    if row['id'] in source_finances:
                        self.assertEqual({key: row[key] for key in METRICS}, source_metrics(source_finances[row['id']]))

    def test_country_options_are_actual_plans_and_default_to_latest(self):
        raw = ROOT / 'data/uninfo/plans/raw'
        manifest = json.loads((ROOT / 'public/data/uninfo/plans/manifest.json').read_text())
        workspaces = {row['id']: row for row in json.loads((raw / 'workspaces.json').read_text())}
        basemap = json.loads((ROOT / 'public/data/world-map.geojson').read_text())
        mapped = {feature['properties']['ISO3'] for feature in basemap['features']}
        self.assertTrue(set(manifest['countries']) <= mapped)
        for iso, country in manifest['countries'].items():
            summaries = [manifest['plans'][str(plan_id)] for plan_id in country['plan_ids']]
            latest = max(summaries, key=lambda row: (row['start'] or '', row['end'] or '', row['id']))
            self.assertEqual(country['latest_plan_id'], latest['id'])
            for summary in summaries:
                codes = {row['iso3'] for row in workspaces[summary['workspace_id']]['countries']}
                self.assertIn(iso, codes)
        ethiopia = manifest['countries']['ETH']
        self.assertEqual(ethiopia['latest_plan_id'], 2693)
        self.assertIn(794, ethiopia['plan_ids'])


if __name__ == '__main__':
    unittest.main()
