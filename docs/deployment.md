# Deployment Runbook

## Prerequisites

- Node.js 18 or newer
- A Google account authorized to manage the target workbook and Apps Script project
- A Google Spreadsheet selected as the production CRM workbook
- Git checkout of this repository

## 1. Install local tooling

```bash
npm install
npm run validate
```

## 2. Create or bind the Apps Script project

Open the production Google Spreadsheet, choose **Extensions → Apps Script**, and copy the Script ID from **Project Settings**.

Create the local configuration:

```bash
cp .clasp.json.example .clasp.json
```

Replace the placeholder in `.clasp.json` with the Script ID. Do not commit `.clasp.json`.

## 3. Authenticate and push

```bash
npm run login
npm run push
npm run open
```

`npm run push` runs static validation before uploading anything.

## 4. Authorize and install

In the Apps Script editor, run these functions in order:

1. `installTryHardGuestIntelligence`
2. `createTryHardForms`
3. `installTryHardFormTriggers`
4. `installTryHardAutomations`
5. `rebuildTryHardDashboards`
6. `runTryHardProductionSmokeTest`

Accept the requested Google authorization prompts. Reload the spreadsheet after installation so the custom menu appears.

## 5. Verify production readiness

Confirm that:

- all canonical data sheets exist
- exactly five forms are registered
- each form has one managed submit trigger
- scheduled automation triggers are installed
- dashboard sheets render successfully
- the production smoke test passes
- form public and edit links are visible from the custom menu

Submit one controlled test response to each form and verify that the expected canonical record is created.

## Updating an existing deployment

```bash
npm install
npm run validate
npm run push
```

Then run `installTryHardGuestIntelligence` to apply idempotent workbook repairs and `runTryHardProductionSmokeTest` to verify the release.

## Versioned deployments

A versioned Apps Script deployment is optional for this spreadsheet-bound application. To create one:

```bash
npm run deploy
```

Normal spreadsheet menu and trigger execution use the latest saved project code and do not require a web-app deployment.

## Rollback

1. Identify the last known-good Git commit.
2. Check out or revert to that commit.
3. Run `npm run validate`.
4. Run `npm run push`.
5. Run `installTryHardGuestIntelligence` and the production smoke test.

Do not delete production sheets during rollback. Schema and installer operations are designed to be non-destructive.

## Secrets and repository hygiene

Never commit:

- `.clasp.json`
- `.clasprc.json`
- OAuth tokens
- API keys
- exported guest data
- production spreadsheet identifiers in test fixtures

The CI validator scans source files for common credential patterns and fails the build when one is detected.
