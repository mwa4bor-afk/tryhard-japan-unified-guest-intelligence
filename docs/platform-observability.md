# Platform Observability and Incident Response

## Purpose

The observability layer provides operational health checks, incident creation, ownership, resolution tracking, and a consolidated management dashboard for the TryHard Guest Intelligence platform.

## Worksheets

- `Platform_Health`: latest service health results.
- `Platform_Incidents`: open, acknowledged, and resolved incidents.
- `Observability_Dashboard`: executive service-health and incident summary.

## Default health checks

The initial checks monitor:

- pending and failed workflow events;
- failed or dead integration deliveries;
- quarantined PMS reservation records;
- guest-case SLA breaches;
- loyalty-ledger availability.

Thresholds are intentionally conservative defaults and should be tuned using actual production volumes.

## Incident lifecycle

1. Hourly health checks evaluate platform conditions.
2. Failed checks create incidents when no active incident already exists for the check result.
3. Operators acknowledge incidents and assign an owner.
4. The owner records a resolution when the underlying condition is corrected.
5. Incident-opened and incident-resolved domain events become available to workflow automation and external integrations.

Statuses:

- `OPEN`
- `ACKNOWLEDGED`
- `RESOLVED`

## Entrypoints

```javascript
initializeTryHardObservability()
runTryHardPlatformHealthChecks()
acknowledgeTryHardPlatformIncident(incidentId, ownerEmail)
resolveTryHardPlatformIncident(incidentId, resolution)
rebuildTryHardObservabilityDashboard()
showTryHardObservabilitySummary()
installTryHardObservabilityTrigger()
```

## Permissions

- `observability.view`: view health and dashboards.
- `observability.run`: execute health checks.
- `observability.manage`: install and manage monitoring automation.
- `incidents.manage`: acknowledge and resolve incidents.

## Operational setup

Run `initializeTryHardObservability()` after deployment, then run `installTryHardObservabilityTrigger()` to schedule hourly checks. Review failed checks before changing thresholds. A warning should prompt investigation, while a failed critical check should have an assigned owner and documented resolution.

## Limitations

The module observes workbook and application state available to Apps Script. It does not independently monitor Google service availability, external PMS uptime, network latency, or provider-specific API status pages. Those signals can be added through the existing integration and workflow framework.