# Release Governance

The TryHard Guest Intelligence platform now includes controlled environment configuration, append-only schema migrations, release readiness gates, approval records, deployment markers, and rollback metadata.

## Environments

Supported environments:

- `DEVELOPMENT`
- `STAGING`
- `PRODUCTION`

The active environment is stored in document properties. Environment-specific values are stored in `Environment_Config`. Secret values are never written to spreadsheet cells; they are stored in Script Properties.

## Schema migrations

Migrations are registered in code through `TGI.SchemaMigrationService.register()` and executed in version order. Applied, failed, and running migrations are recorded in `Schema_Migrations` with checksums and execution metadata.

Migration execution is forward-only. Rollback logic must be implemented as a new compensating migration rather than deleting migration history.

## Release lifecycle

Release states:

1. `DRAFT`
2. `APPROVED`
3. `DEPLOYED`

Release records are stored in `Platform_Releases` and include the target environment, source commit SHA, release notes, rollback version, readiness report, approval identity, and deployment timestamp.

## Readiness gates

Approval requires all release readiness checks to pass:

- no pending schema migrations
- valid environment selection
- no failing or critical platform health checks
- no open critical incidents

A readiness snapshot is serialized into the release record at approval time.

## Permissions

- `release.view`
- `release.manage`
- `release.migrate`
- `release.approve`
- `release.deploy`

`release.deploy` is intentionally restricted to administrators through the wildcard administrator permission.

## Entrypoints

```javascript
initializeTryHardReleaseGovernance()
setTryHardEnvironment(environment)
saveTryHardEnvironmentConfig(input)
runTryHardSchemaMigrations()
createTryHardRelease(input)
approveTryHardRelease(releaseId)
markTryHardReleaseDeployed(releaseId)
showTryHardReleaseReadiness()
```

## Rollback policy

The platform stores rollback metadata but does not automatically reverse code or destructive data changes. Production rollback should restore the prior Apps Script deployment and execute a reviewed compensating migration when data structures changed.

## Recommended production sequence

1. Select `STAGING`.
2. Configure staging values and secrets.
3. Run pending migrations.
4. Run platform health checks and smoke tests.
5. Create and approve the release.
6. Promote the same source commit to production.
7. Select `PRODUCTION`.
8. Validate production configuration.
9. Run required migrations.
10. Mark the release deployed only after verification.