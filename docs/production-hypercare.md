# Production Hypercare and Operational Handover

## Purpose

The hypercare layer controls the stabilization period after production go-live. It prevents premature operational acceptance by requiring recorded checkpoints, ownership of launch issues, and an explicit acceptance decision.

## Data sets

- `Hypercare_Windows`: release-linked stabilization windows and acceptance records.
- `Hypercare_Checkpoints`: timestamped operational snapshots.
- `Hypercare_Issues`: launch-specific issues, owners, severity, status, and resolution.

## Standard operating sequence

1. Complete and verify the go-live record.
2. Run `initializeTryHardHypercare()` once.
3. Start a window with `startTryHardHypercare({ releaseId, plannedEndAt, ownerEmail, acceptanceOwnerEmail })`.
4. Record checkpoints at least daily with `recordTryHardHypercareCheckpoint(hypercareId, notes)`.
5. Open launch issues with `openTryHardHypercareIssue(input)` and assign an owner.
6. Resolve every issue before acceptance.
7. Record a final passing checkpoint.
8. Complete formal handover with `acceptTryHardHypercare(hypercareId, notes)`.

## Acceptance gates

Hypercare cannot be accepted when:

- one or more hypercare issues remain unresolved;
- no operational checkpoint has been recorded;
- the latest checkpoint reports failed platform health.

Acceptance writes an audit event and publishes `platform.hypercare.accepted` when the domain-event service is available.

## Recommended checkpoint content

Each checkpoint captures the latest available platform-health status, open incidents, open guest cases, failed integrations, workflow backlog, operator notes, and recording user.

## Permissions

- `hypercare.view`: view summaries and records.
- `hypercare.run`: record checkpoints.
- `hypercare.manage`: start windows and manage issues.
- `hypercare.approve`: formally accept the production handover.

Managers receive all hypercare permissions. Operators can view and record checkpoints. Viewers have read-only access.

## Operational acceptance standard

Production should move to steady-state support only after the hypercare window is accepted. Acceptance indicates that critical launch defects are resolved, platform health is not failed, operational ownership is established, and the support team has received the relevant release and incident context.