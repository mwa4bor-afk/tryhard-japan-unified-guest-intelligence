# Reporting and Dashboards

Use **TryHard Guest Intelligence → Rebuild management dashboards** from the spreadsheet menu.

The command regenerates three reporting sheets from the canonical datasets:

- `Dashboard` — executive KPI summary
- `Location_Performance` — stays, spend, satisfaction, NPS, and recovery metrics by location
- `Loyalty_Segments` — members and points by loyalty tier

## KPI definitions

- **Average rating**: arithmetic mean of recorded experience ratings.
- **NPS**: percentage of promoters (9–10) minus percentage of detractors (0–6), using recorded NPS responses.
- **Recovery rate**: stays marked as requiring service recovery divided by all stays.
- **Open tasks**: tasks whose status is neither `COMPLETED` nor `CANCELLED`.
- **Overdue tasks**: open tasks with a due date earlier than the current time.
- **Total spend**: sum of recorded stay spend. Currency is assumed to be JPY in the current dashboard release.

## Refresh behavior

Dashboard sheets are regenerated from source data each time. Existing charts and dashboard values are cleared before rebuilding; canonical CRM datasets are not modified.

The rebuild action writes an audit event containing the generation timestamp and segment counts.
