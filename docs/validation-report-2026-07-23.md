# Platform Validation Report — 2026-07-23

## Scope

This report records repository-level validation for the TryHard Japan unified guest-intelligence Apps Script platform.

Validated areas:

- JavaScript syntax for all `.gs` and `.js` files
- required source-module inventory
- Apps Script manifest parsing and V8 runtime configuration
- required OAuth scopes
- duplicate critical entrypoints
- duplicate `TGI` namespace assignments
- required service registrations
- credential and private-key pattern scanning
- embedded Apps Script project identifier scanning

## GitHub Actions Result

Workflow: `Validate Apps Script Project`

Run ID: `29980857467`

Run number: `101`

Commit: `01fdc2aa34de30736fd5812f5b81ee04a459da83`

Conclusion: **SUCCESS**

Successful job steps:

1. Check out repository
2. Set up Node.js
3. Install dependencies
4. Validate Apps Script project

## Certification Boundary

The repository has passed automated static validation.

This result does not certify live Google Apps Script execution because runtime behavior depends on the bound spreadsheet, authorization grants, installed triggers, Script Properties, environment configuration, external provider credentials, and live sheet data.

Deployment-stage runtime validation must be executed from the bound spreadsheet with:

```javascript
runTryHardPlatformValidation()
```

A production release should only be marked ready when that runtime validation contains no failed critical checks and the release-readiness service reports no blocking migrations, health failures, or critical incidents.
