# Guest 360

The Guest 360 layer presents a unified operational view of one guest without duplicating source records.

## Components

- `49_GuestTimelineService.gs` aggregates guest-linked activity from CRM and enterprise sheets.
- `50_Guest360Service.gs` renders the profile and timeline into the `Guest_360` worksheet.
- `51_Guest360Entrypoints.gs` exposes functions for operators, dashboards, and future sidebars.

## Supported timeline sources

The service reads available records from:

- `Stays`
- `Reservations`
- `Preferences`
- `Loyalty`
- `Service_Recovery`
- `Tasks`
- `Contact_History`
- `Campaign_Recipients`
- `Guest_Insights`

Missing optional sheets are ignored. Every included record must contain a matching `guest_id`.

## Workbook workflow

1. Run `initializeTryHardGuest360()` once.
2. Open a sheet containing a `guest_id` column, such as `Guests`.
3. Select any cell on the target guest row.
4. Run `openTryHardGuest360FromActiveRow()`.
5. Review the generated `Guest_360` sheet.

The sheet contains:

- identity and contact details
- language and country
- guest status and marketing consent
- visit count and lifetime value
- last activity date
- activity counts by type
- up to 200 most recent timeline events
- source sheet and source record identifiers

## Programmatic API

```javascript
openTryHardGuest360ById('guest-id');
findTryHardGuests('name or email');
getTryHardGuestSnapshot('guest-id');
getTryHardGuestTimeline('guest-id', 50);
```

## Authorization

- `guest360.view`: inspect profiles and timelines
- `guest360.manage`: reserved for future profile actions and case-management controls

Viewer, Operator, Manager, and Admin roles may view Guest 360. Operator and higher roles also receive `guest360.manage`.

## Data handling

Guest 360 is a generated view. It does not create duplicate CRM records or change the underlying source rows. Every rebuild is written to the audit log with the guest ID and event count.