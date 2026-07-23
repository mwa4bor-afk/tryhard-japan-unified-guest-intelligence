# Production Readiness

## Recommended deployment sequence

1. Create or open the destination Google Sheets workbook.
2. Bind the Apps Script project to the workbook.
3. Copy the files in `src/` into the Apps Script project, preserving file order by numeric prefix.
4. Run `installTryHardGuestIntelligence` and approve the requested scopes.
5. Run `createTryHardForms`.
6. Run `installTryHardFormTriggers`.
7. Run `installTryHardAutomations`.
8. Run `runTryHardSmokeTest`.
9. Review the generated dashboard and form links.

## Runtime configuration

Configuration is stored in document properties and accessed through `TGI.ConfigService`.

Supported keys:

- `DEFAULT_CURRENCY`
- `DEFAULT_LANGUAGE`
- `DEFAULT_LOCATION`
- `DUPLICATE_SCORE_THRESHOLD`
- `RECOVERY_DUE_HOURS`
- `LAPSED_GUEST_DAYS`
- `VIP_LIFETIME_VALUE`
- `HIGH_VALUE_LIFETIME_VALUE`
- `DAILY_REFRESH_HOUR`
- `AUTOMATION_ENABLED`

Example:

```javascript
TGI.ConfigService.set('DUPLICATE_SCORE_THRESHOLD', 70);
TGI.ConfigService.set('VIP_LIFETIME_VALUE', 150000);
```

## Smoke testing

Use the spreadsheet menu action **Run production smoke test**. The smoke test checks:

- configuration validity
- workbook installation
- schema and referential integrity
- five-form registration
- form-submit triggers
- scheduled automation triggers
- KPI calculations
- guest segmentation
- dashboard generation

The result is also written to `AuditLog`.

## Demonstration data

The **Seed demonstration data** menu action creates four synthetic guests, stays, preferences, loyalty activity, one overdue task, and one complaint record. Data is clearly marked with `[TGI_TEST_DATA]`.

Do not run the demonstration-data action in a live production workbook unless synthetic records are acceptable.

## Release checklist

- Confirm the workbook owner is the intended operational account.
- Confirm all five public form URLs open correctly.
- Submit one controlled test response to every form.
- Confirm each submission appears in the canonical CRM tabs.
- Confirm exactly five managed form-submit triggers exist.
- Confirm scheduled dashboard and escalation triggers exist.
- Run the data-integrity report with zero blocking errors.
- Rebuild dashboards and verify KPI totals against source rows.
- Review marketing consent and personal-data access permissions.
- Restrict workbook and form-editor access to authorized staff.
- Record the deployed Apps Script version and repository commit.

## Rollback

Before a production release, create a spreadsheet copy and an Apps Script version. A rollback should restore both the workbook copy and the matching script version so schema and code remain synchronized.
