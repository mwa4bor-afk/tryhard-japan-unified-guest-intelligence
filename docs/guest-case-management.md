# Guest Case Management and SLA Escalation

The guest case layer converts complaints, service failures, follow-up requests, and operational exceptions into owned, time-bound records.

## Sheets

- `Guest_Cases` stores one row per case.
- `Case_Dashboard` summarizes workload, ownership, priority, and SLA breaches.

## Case lifecycle

Supported statuses:

- `OPEN`
- `IN_PROGRESS`
- `WAITING_GUEST`
- `RESOLVED`
- `CLOSED`
- `CANCELLED`

Supported priorities:

- `LOW`
- `NORMAL`
- `HIGH`
- `URGENT`
- `CRITICAL`

Default resolution targets are calculated from priority. First-response targets are evaluated separately.

## Core functions

```javascript
createTryHardGuestCase({
  guest_id: 'guest-id',
  subject: 'Guest reported room issue',
  description: 'Details of the issue',
  priority: 'HIGH',
  category: 'SERVICE_RECOVERY',
  owner_email: 'operator@example.com',
  manager_email: 'manager@example.com'
});

acknowledgeTryHardGuestCase('case-id', 'operator@example.com');
resolveTryHardGuestCase('case-id', 'Issue corrected and guest contacted.');
```

## SLA monitoring

`processTryHardCaseEscalations()` scans open cases and escalates records that:

- passed their case due time; or
- missed their first-response target.

Escalations are rate-limited to once per case per hour. Each escalation increments `escalation_level` and records `last_escalated_at`.

Install hourly monitoring with:

```javascript
installTryHardCaseEscalationTrigger();
```

## External alerts

When an active integration has type `CASE_ALERTS`, an SLA breach creates a `case.sla_breach` event in `Integration_Queue`. The existing webhook processor handles authenticated delivery and retries.

## Permissions

- `cases.view`: inspect cases and dashboards
- `cases.manage`: create, assign, acknowledge, resolve, and close cases
- `cases.escalate`: run escalation scans and install escalation triggers

Viewer roles can inspect cases. Operator roles can manage cases. Manager and Admin roles can also run escalations.

## Operational entrypoints

```javascript
initializeTryHardGuestCases();
rebuildTryHardCaseDashboard();
showTryHardCaseSummary();
processTryHardCaseEscalations();
installTryHardCaseEscalationTrigger();
```

## Recommended operating procedure

1. Create a case for every issue requiring ownership or follow-up.
2. Assign an owner and manager.
3. Acknowledge the case when work begins.
4. Record the resolution before changing the status to resolved.
5. Review `Case_Dashboard` during daily operations meetings.
6. Keep the hourly escalation trigger installed in production.