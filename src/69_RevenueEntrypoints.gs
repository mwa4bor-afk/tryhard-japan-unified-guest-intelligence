function initializeTryHardRevenueManagement() {
  TGI.AccessControlService.requirePermission('revenue.manage');
  TGI.RevenueDemandService.ensureSheet();
  TGI.RateRecommendationService.ensureSheet();
  TGI.RevenueDashboardService.rebuild();
  return TGI.RevenueDashboardService.summary();
}

function captureTryHardRevenueDemand(input) {
  return TGI.RevenueDemandService.capture(input);
}

function generateTryHardRateRecommendation(input) {
  return TGI.RateRecommendationService.generate(input);
}

function approveTryHardRateRecommendation(recommendationId) {
  return TGI.RateRecommendationService.approve(recommendationId);
}

function rebuildTryHardRevenueDashboard() {
  return TGI.RevenueDashboardService.rebuild();
}

function showTryHardRevenueSummary() {
  TGI.AccessControlService.requirePermission('revenue.view');
  var summary = TGI.RevenueDashboardService.summary();
  SpreadsheetApp.getUi().alert('Revenue Summary', JSON.stringify(summary, null, 2), SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}

function installTryHardRevenueDashboardTrigger() {
  TGI.AccessControlService.requirePermission('revenue.manage');
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'rebuildTryHardRevenueDashboard') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('rebuildTryHardRevenueDashboard').timeBased().everyDays(1).atHour(6).create();
  return true;
}