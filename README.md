![WIP](https://img.shields.io/badge/status-WIP-yellow)

# UN Results

- **UN Secretariat:** Explore the entities and subprogrammes in the proposed UN programme budget. The Secretariat directory groups entities by priority area and links to their objectives, strategies, past performance and planned results.
- **UN System:** TBD.

## Run locally

Use Node.js 24 (22.18 or later is supported) and pnpm 11.22.0.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). For local site or analytics
settings, copy `.env.example` to `.env.local`.

## Refresh the data

The site builds from `data/ppb-2027.json`. Page content comes from the 2027
proposed programme budget exports. The priority directory uses Open UN's 2025
financial classifications, so an entity can appear under several priorities.

With the Programme Budget Data and Open UN checkouts alongside this one and
Python 3 available, run:

```bash
python3 scripts/read-chart-annotations.py \
  ../programme-budget-data/data/downloads/ppb2027 \
  > /tmp/ppb-2027-chart-annotations.json

node scripts/import-programme-budget.mjs \
  ../programme-budget-data/apps/portal/public/data \
  ../open/data/references/programme-budget-data-ppb-entities/2027.json \
  ../open/public/data/secretariat-overview-2025.json \
  /tmp/ppb-2027-chart-annotations.json
```

The importer checks that the entity overlay matches the budget exports and records
the input checksums. Chart annotations identify explicit missing values and
percentages from the Word charts. Review any unmapped entities or strategies
reported during the import. The original OICT dashboard exports are preserved
in `data/oict/` for reference. The results pages use the proposed programme
budget snapshot.

## Checks and publishing

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

The [GitHub Pages workflow](.github/workflows/nextjs.yml) builds the static site
on pushes to `main`.

- [Customize the site](docs/customization.md)
- [Configure GitHub Pages](docs/github-pages.md)
- [Maintain dependencies and run checks](docs/maintenance.md)
