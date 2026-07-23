function initializeTryHardGuestCases() {
  TGI.GuestCaseService.ensureSheet();
  var report = TGI.CaseDashboardService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Guest case operations initialized.\nOpen cases: ' + report.open + '\nOverdue cases: ' + report.overdue, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function rebuildTryHardCaseDashboard() {
  var report = TGI.CaseDashboardService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Case dashboard rebuilt.\nOpen cases: ' + report.open + '\nOverdue cases: ' + report.overdue + '\nFirst-response breaches: ' + report.first_response_breaches, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function processTryHardCaseEscalations() {
  return TGI.CaseSlaService.escalateBreaches();
}

function installTryHardCaseEscalationTrigger() {
  var trigger = TGI.CaseSlaService.installTrigger();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Hourly case escalation monitoring installed.', SpreadsheetApp.getUi().ButtonSet.OK);
  return trigger;
}

function createTryHardGuestCase(input) {
  return TGI.GuestCaseService.save(input);
}

function acknowledgeTryHardGuestCase(caseId, ownerEmail) {
  return TGI.GuestCaseService.acknowledge(caseId, ownerEmail);
}

function resolveTryHardGuestCase(caseId, resolution) {
  return TGI.GuestCaseService.resolve(caseId, resolution);
}

function showTryHardCaseSummary() {
  var report = TGI.CaseDashboardService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Cases: ' + report.total + '\nOpen: ' + report.open + '\nOverdue: ' + report.overdue + '\nFirst-response breaches: ' + report.first_response_breaches, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}