# Governance and Administration

## Access roles

The first authorized installer is bootstrapped as `ADMIN`. Roles are stored in document properties and evaluated against the active Google account.

- `ADMIN` — unrestricted system administration
- `MANAGER` — dashboards, intelligence, tasks, merging, exports, and privacy review
- `OPERATOR` — guest operations, contact history, and task handling
- `VIEWER` — read-only dashboard and insight access

Use `TGI.AccessControlService.setRole(email, role)` from the Apps Script editor to assign or change roles. Only an administrator can perform this action.

## Privacy operations

`TGI.PrivacyService.review()` identifies inactive guest profiles older than the configured retention period. Review does not alter records.

`TGI.PrivacyService.anonymizeGuest(guestId, reason)` removes direct identifiers while preserving operational aggregates and auditability. Anonymization is irreversible without restoring a prior backup.

`TGI.PrivacyService.withdrawMarketingConsent(guestId, source)` immediately disables marketing consent and records the request in contact history.

## Backups and exports

`TGI.BackupService.createSnapshot()` creates a timestamped spreadsheet containing value-only copies of every current sheet. Backups should be moved into an access-restricted Drive folder and retained according to company policy.

`TGI.BackupService.exportGuest(guestId)` returns a JSON package containing the guest profile and all linked CRM records. Treat exports as sensitive personal data.

## Admin console

The **Rebuild admin console** menu action creates or refreshes `Admin_Console` with:

- current user and role
- integrity status
- registered forms
- scheduled automations
- active guests
- open and overdue tasks
- retention-review candidates
- authorized users

## Operating controls

Before destructive privacy work:

1. Create a workbook backup.
2. Confirm the guest identifier.
3. Record the legal or operational basis.
4. Run anonymization.
5. Run the data-integrity check.
6. Rebuild the admin console.

Spreadsheet sharing permissions remain the primary security boundary. Access roles supplement, but do not replace, correct Google Workspace sharing controls.
