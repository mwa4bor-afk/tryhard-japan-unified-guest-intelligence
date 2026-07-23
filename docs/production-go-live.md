# Production Go-Live Controls

The go-live layer converts repository validation into an auditable production cutover process inside the bound Google Sheets deployment.

## Control objectives

- prevent deployment when validation, release readiness, or platform health fails
- record the responsible operator and exact release identifier
- preserve rollback metadata before cutover
- require a separate post-deployment verification step
- publish an auditable domain event after successful verification

## Data store

`GoLive_Records` contains:

- go-live identifier
- environment
- release identifier
- lifecycle status
- serialized preflight evidence
- rollback metadata
- initiating user and timestamp
- verifying user and timestamp
- operational notes

## Lifecycle

1. Initialize the module with `initializeTryHardGoLive()`.
2. Run `runTryHardGoLivePreflight()`.
3. Resolve every failed validation, readiness, health, or incident gate.
4. Start cutover with `beginTryHardGoLive({ release_id, environment, rollback, notes })`.
5. Deploy the Apps Script release and complete operational smoke tests.
6. Run `verifyTryHardGoLive(goLiveId, notes)`.
7. If cutover fails, execute the documented rollback and call `markTryHardGoLiveRollback(goLiveId, reason)`.

## Statuses

- `IN_PROGRESS`
- `VERIFIED`
- `ROLLED_BACK`

## Required permissions

- `golive.view`
- `golive.run`
- `golive.manage`
- `golive.approve`

Operators may view records. Managers can run, manage, and approve production cutovers. Administrators retain unrestricted access.

## Preflight requirements

A cutover is blocked unless all of the following are true:

- platform runtime validation returns `PASSED`
- release governance reports the release as ready
- no platform health check reports `FAILED`

The implementation intentionally fails closed when a dependency is unavailable.

## Post-deployment verification

Verification reruns the same preflight gates after deployment. Successful verification writes an audit entry and publishes the domain event:

`platform.golive.verified`

## Rollback metadata

The `rollback` input should identify at minimum:

- prior release version
- prior Apps Script deployment ID
- workbook backup identifier
- owner responsible for rollback
- maximum acceptable recovery time

Go-live records do not execute rollback automatically. They provide controlled evidence and accountability while the administrator performs the approved rollback procedure.