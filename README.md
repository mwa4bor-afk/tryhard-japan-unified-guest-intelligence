# TryHard Japan Unified Guest Intelligence

Google Apps Script CRM platform for unified post-visit guest feedback, guest profiles, preferences, service recovery, loyalty intelligence, operational reporting, and automated follow-up across TryHard Japan locations.

## Included capabilities

- five automatically generated Google Forms
- one canonical Google Sheets CRM workbook
- deterministic guest identity resolution
- duplicate detection and guest merging
- stays, preferences, loyalty, contacts, tasks, and audit history
- service-recovery workflows
- guest segmentation and rule-based next-best-action insights
- KPI aggregation and management dashboards
- scheduled dashboard, integrity, insight, and overdue-task processing
- repeatable demonstration data and production smoke tests
- `clasp` deployment tooling and GitHub Actions validation

## Quick deployment

```bash
npm install
cp .clasp.json.example .clasp.json
# Add the target Apps Script project ID to .clasp.json
npm run login
npm run push
```

In Apps Script, run:

1. `installTryHardGuestIntelligence`
2. `createTryHardForms`
3. `installTryHardFormTriggers`
4. `installTryHardAutomations`
5. `rebuildTryHardDashboards`
6. `runTryHardProductionSmokeTest`

Reload the workbook and use the **TryHard Guest Intelligence** menu.

See [`docs/deployment.md`](docs/deployment.md) for the complete production runbook.

## Repository structure

- `src/00–07` — namespace, utilities, schema, installer, audit, guest model, repository, and menu
- `src/08–11` — form definitions, creation, submission routing, and trigger management
- `src/12–17` — shared repositories and CRM business services
- `src/18–22` — guest merging, task/contact operations, duplicate detection, and integrity checks
- `src/23–24` — KPI aggregation and dashboard generation
- `src/25–27` — segmentation, guest intelligence, and scheduled automation
- `src/28–30` — configuration, test fixtures, and smoke testing
- `scripts/validate-project.js` — static project validation
- `.github/workflows/validate.yml` — continuous validation
- `docs/` — operator and deployment documentation

## Local commands

```bash
npm run validate  # Static checks
npm run pull      # Pull Apps Script project
npm run push      # Validate and push
npm run deploy    # Validate, push, and create a versioned deployment
npm run open      # Open Apps Script editor
```

## Data handling

The system stores guest information in the selected Google Spreadsheet. Restrict access to authorized personnel and configure privacy, retention, consent, and deletion practices according to applicable requirements.

Do not commit `.clasp.json`, OAuth tokens, guest exports, credentials, or production identifiers.

## Release status

Production-capable application baseline: `1.0.0`.
