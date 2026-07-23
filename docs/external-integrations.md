# External Integrations

The integration framework provides a provider-neutral outbound delivery layer for PMS, CRM, messaging, marketing, accounting, and BI systems.

## Components

- `IntegrationRegistryService` stores connector metadata in the `Integrations` sheet.
- `IntegrationQueueService` stores durable outbound jobs in `Integration_Queue`.
- `WebhookDeliveryService` delivers jobs through authenticated HTTP POST requests.
- `IntegrationHealthService` generates the `Integration_Health` operating dashboard.

## Security model

Credentials are never stored in source files, queue payloads, or spreadsheet cells. Each integration record contains an `auth_property_key`. The corresponding token is stored in Apps Script Script Properties.

Example:

```javascript
TGI.IntegrationRegistryService.setSecret('LINE_CHANNEL_TOKEN', '<token>');
```

The integration record then uses `LINE_CHANNEL_TOKEN` as its `auth_property_key`.

## Registering a webhook

```javascript
var integration = TGI.IntegrationRegistryService.save({
  name: 'Guest CRM Webhook',
  type: 'WEBHOOK',
  endpoint: 'https://example.com/api/tryhard/events',
  auth_property_key: 'GUEST_CRM_WEBHOOK_TOKEN'
});
```

## Enqueueing an event

```javascript
TGI.IntegrationQueueService.enqueue(
  integration.integration_id,
  'guest.updated',
  { guest_id: guest.guest_id, loyalty_tier: guest.loyalty_tier },
  { entity_type: 'GUEST', entity_id: guest.guest_id }
);
```

## Delivery envelope

Webhook requests contain:

- unique event ID
- event type
- occurrence timestamp
- entity type and ID
- JSON payload

Authorization uses a bearer token when the integration has an `auth_property_key`.

## Retry policy

Failed deliveries use exponential backoff. The default maximum is five attempts. Jobs move through:

- `PENDING`
- `RETRY`
- `COMPLETED`
- `FAILED`

HTTP responses outside the 200–299 range are treated as failures. Response bodies and errors are truncated before storage.

## Installation

Run these entrypoints after deployment:

1. `initializeTryHardIntegrations()`
2. Configure integrations and Script Properties.
3. `installTryHardIntegrationProcessor()`
4. `rebuildTryHardIntegrationHealth()`

The processor runs every 15 minutes and processes up to 25 due jobs per execution.

## Permissions

- Administrators have all integration permissions.
- Managers can configure, enqueue, and process integrations.
- Operators can enqueue approved outbound events.
- Viewers can only access reporting views.

## Operational controls

Use `processTryHardIntegrationsNow()` for controlled manual processing. Review `Integration_Health` for failed jobs and connector-specific delivery errors. Do not place personal data in outbound payloads unless the destination, consent basis, retention policy, and data-processing terms have been approved.