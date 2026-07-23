# PMS Connector Framework

The PMS connector layer normalizes reservation payloads from external property-management systems into the TryHard reservation model.

## Supported adapters

- Cloudbeds-style reservation payloads
- Mews-style reservation payloads
- OPERA-style reservation payloads

The adapters are normalization templates. Production deployments must confirm provider API versions, authentication, pagination, webhook signatures, rate limits, and field mappings before enabling live synchronization.

## Sheets

- `PMS_Sync_State`: provider/property checkpoints and synchronization metrics
- `PMS_Quarantine`: payloads that failed normalization or validation
- `Reservations`: normalized, upserted reservation records
- `PMS_Dashboard`: synchronization status and error metrics

## Processing model

1. A provider client fetches a page or webhook batch.
2. `ingestTryHardPmsReservations()` selects the registered adapter.
3. Each reservation is normalized and validated.
4. Valid records are upserted using `provider + external_reservation_id`.
5. Invalid records are written to quarantine without aborting the batch.
6. The checkpoint is updated and `pms.sync.completed` is published.

## Entry points

```javascript
initializeTryHardPmsConnectors()
ingestTryHardPmsReservations(provider, propertyId, payloads, cursor)
rebuildTryHardPmsDashboard()
showTryHardPmsSummary()
```

## Permissions

- `pms.view`: dashboard and synchronization visibility
- `pms.sync`: ingest reservation batches
- `pms.manage`: initialize and administer connectors

Managers receive all PMS permissions. Operators can view and synchronize. Viewers have read-only access.

## Security

Credentials must be stored in Apps Script properties through the integration registry. Do not store tokens, client secrets, or webhook secrets in spreadsheet cells or source files.
