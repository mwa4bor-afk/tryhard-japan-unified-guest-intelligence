# Platform Validation

The platform uses two complementary validation layers.

## Repository validation

Run:

```bash
npm install
npm run validate
```

The validator checks:

- required Apps Script source files
- manifest JSON and V8 runtime configuration
- required OAuth scopes
- JavaScript syntax for every `.gs` and `.js` file using Node's V8 parser
- duplicate critical entrypoints
- duplicate `TGI` namespace assignments
- required service namespace registrations
- embedded credential and project identifier patterns
- selected production-risk patterns

GitHub Actions runs this validation on every push and pull request through `.github/workflows/validate.yml`.

## Runtime validation

Run these Apps Script entrypoints from the bound spreadsheet:

```javascript
initializeTryHardValidation()
runTryHardPlatformValidation()
showTryHardValidationSummary()
```

Runtime validation checks:

- required `TGI` modules are loaded
- required operational sheets exist
- recommended scheduled triggers are installed
- an environment is selected
- the script is bound to a spreadsheet
- release-governance readiness checks pass

Results are appended to `Validation_Results`. Every record contains the validation run ID, category, status, severity, details, timestamp, and executing user.

## Validation status semantics

- `PASS`: required condition is satisfied.
- `WARN`: non-blocking operational recommendation is unmet.
- `FAIL`: blocking dependency, configuration, or release-readiness condition is unmet.

A runtime validation run is valid only when it contains zero `FAIL` results. Warnings remain visible for operational remediation.

## Permissions

- `validation.view`: inspect validation results.
- `validation.run`: initialize and execute validation.

Managers and administrators can run validation. Operators and viewers can inspect the latest results.

## Deployment gate

A production release should not be marked deployed until both conditions are met:

1. GitHub repository validation succeeds for the intended source commit.
2. `runTryHardPlatformValidation()` succeeds in the target Apps Script environment after migrations and initializers have run.

Repository validation cannot prove live Google authorization, trigger execution, sheet permissions, provider credentials, or third-party API behavior. Those require runtime validation and integration-specific acceptance testing.