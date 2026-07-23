function initializeTryHardObservability() {
  TGI.AccessControlService.requirePermission('observability.run');
  TGI.PlatformHealthService.ensureSheet();
  TGI.IncidentManagementService.ensureSheet();
  TGI.ObservabilityDashboardService.ensureSheet();
  var checks = TGI.PlatformHealthService.runChecks();
  var incidents = TGI.IncidentManagementService.createFromFailedChecks();
  var dashboard = TGI.ObservabilityDashboardService.rebuild();
  return { checks: checks.length, incidents_opened: incidents.length, dashboard: dashboard };
}

function runTryHardPlatformHealthChecks() {
  TGI.AccessControlService.requirePermission('observability.run');
  var checks = TGI.PlatformHealthService.runChecks();
  var incidents = TGI.IncidentManagementService.createFromFailedChecks();
  TGI.ObservabilityDashboardService.rebuild();
  return { checks: checks, incidents_opened: incidents };
}

function acknowledgeTryHardPlatformIncident(incidentId, ownerEmail) {
  return TGI.IncidentManagementService.acknowledge(incidentId, ownerEmail);
}

function resolveTryHardPlatformIncident(incidentId, resolution) {
  return TGI.IncidentManagementService.resolve(incidentId, resolution);
}

function rebuildTryHardObservabilityDashboard() {
  return TGI.ObservabilityDashboardService.rebuild();
}

function showTryHardObservabilitySummary() {
  TGI.AccessControlService.requirePermission('observability.view');
  var summary = TGI.ObservabilityDashboardService.summary();
  SpreadsheetApp.getUi().alert('TryHard Platform Status', JSON.stringify(summary, null, 2), SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}

function installTryHardObservabilityTrigger() {
  TGI.AccessControlService.requirePermission('observability.manage');
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'runTryHardPlatformHealthChecks') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('runTryHardPlatformHealthChecks').timeBased().everyHours(1).create();
  TGI.AuditLog.write('OBSERVABILITY_TRIGGER_INSTALLED', 'Observability', '', { cadence: 'HOURLY' });
  return true;
}