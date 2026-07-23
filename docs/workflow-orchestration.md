# Workflow Orchestration

The workflow layer connects CRM domain events to controlled actions without hard-coding every operational response into form handlers or repositories.

## Components

- `Domain_Events`: durable event journal.
- `Workflow_Rules`: configurable event-to-action rules.
- `Workflow_Executions`: idempotent execution ledger.
- `Workflow_Dashboard`: processing and rule-health summary.

## Supported actions

- `CREATE_CASE`
- `CREATE_TASK`
- `ENQUEUE_INTEGRATION`
- `AUDIT`

## Example: create a critical case from a low rating

```javascript
saveTryHardWorkflowRule({
  name: 'Escalate one-star feedback',
  event_type: 'feedback.submitted',
  conditions: {
    rating: { operator: 'lte', value: 1 }
  },
  action_type: 'CREATE_CASE',
  action: {
    guest_id: '{{event.guest_id}}',
    title: 'Critical guest feedback',
    description: 'Automated from feedback event {{event.event_id}}',
    priority: 'CRITICAL',
    category: 'FEEDBACK'
  },
  priority: 10
});
```

## Example: forward an event to an external connector

```javascript
saveTryHardWorkflowRule({
  name: 'Send resolved cases to data warehouse',
  event_type: 'case.resolved',
  action_type: 'ENQUEUE_INTEGRATION',
  action: {
    integration_id: 'INT_DATA_WAREHOUSE',
    event_type: 'case.resolved',
    payload: {
      case_id: '{{payload.case_id}}',
      guest_id: '{{event.guest_id}}',
      resolution: '{{payload.resolution}}'
    }
  }
});
```

## Event publication

```javascript
publishTryHardDomainEvent(
  'feedback.submitted',
  { rating: 1, comments: 'Guest requested manager contact.' },
  { entity_type: 'Feedback', entity_id: 'FDB_123', guest_id: 'GST_123' }
);
```

## Processing

Run `installTryHardWorkflowProcessor()` once. The processor checks up to 25 pending events every 15 minutes. Completed event-rule pairs are not executed twice.

Failed actions remain visible in `Workflow_Executions`; the event is marked `RETRY` with a diagnostic message. Correct the rule or dependent configuration and process again.

## Security

Operators may publish events but cannot create or modify rules. Managers and administrators can manage and process workflows. Viewers can inspect the dashboard only.

Rule action JSON must not contain credentials. Connector secrets remain in Apps Script Script Properties and are referenced indirectly through the integration registry.
