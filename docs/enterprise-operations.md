# Enterprise Operations

This layer adds multi-property operating records and a PMS-neutral reservation import path.

## Modules

- `35_LocationService.gs` manages active and archived locations, brands, regions, time zones, currencies, languages, capacity, and operating hours.
- `36_StaffService.gs` manages staff identity, role, department, location assignment, reporting line, and status.
- `37_ReservationImportService.gs` accepts mapped row objects or CSV text, validates required fields, deduplicates by source and external ID, resolves or creates guests, writes reservations, and records import summaries.
- `38_EnterpriseReportingService.gs` creates the `Executive_Dashboard` sheet with location, staffing, reservation, and reservation-value summaries.

## Access control

The enterprise layer uses three explicit permissions:

- `operations.manage`
- `reservations.import`
- `reports.view`

Admins have all permissions. Managers can manage locations and staff, import reservations, and view reports. Operators can import reservations and view reports. Viewers can view reports.

## Initialization

From the spreadsheet menu, run **Initialize enterprise operations**. This creates:

- `Locations`
- `Staff`
- `Reservations`
- `Import_Log`
- `Executive_Dashboard`

The operation is idempotent and does not delete existing records.

## Reservation input contract

Canonical fields are:

- `external_id`
- `location_id`
- `guest_name`
- `email`
- `phone`
- `arrival_date`
- `departure_date`
- `party_size`
- `status`
- `total_value`
- `currency`

A mapping object may translate PMS-specific column names to these canonical fields.

## Example

```javascript
var result = TGI.ReservationImportService.importCsv(csvText, {
  source: 'PMS_NAME',
  mapping: {
    external_id: 'Booking Number',
    guest_name: 'Guest',
    arrival_date: 'Check In',
    departure_date: 'Check Out',
    total_value: 'Revenue'
  }
});
```

Each import records created, skipped, and failed row counts plus row-level error messages.