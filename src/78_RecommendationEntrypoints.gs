function initializeTryHardRecommendations() {
  TGI.AccessControlService.requirePermission('recommendations.manage');
  TGI.RecommendationPolicyService.ensureSheet();
  TGI.RecommendationEngineService.ensureSheet();
  TGI.RecommendationOutcomeService.ensureSheet();
  TGI.RecommendationPolicyService.seedDefaults();
  return TGI.RecommendationOutcomeService.rebuildDashboard();
}

function saveTryHardRecommendationPolicy(input) {
  return TGI.RecommendationPolicyService.save(input);
}

function generateTryHardGuestRecommendations(guestId, context) {
  return TGI.RecommendationEngineService.generate(guestId, context || {});
}

function approveTryHardRecommendation(recommendationId) {
  return TGI.RecommendationEngineService.approve(recommendationId);
}

function rejectTryHardRecommendation(recommendationId, reason) {
  return TGI.RecommendationEngineService.reject(recommendationId, reason);
}

function executeTryHardRecommendation(recommendationId, outcome) {
  return TGI.RecommendationEngineService.recordExecution(recommendationId, outcome || {});
}

function recordTryHardRecommendationOutcome(recommendationId, guestId, outcome) {
  return TGI.RecommendationOutcomeService.record(recommendationId, guestId, outcome || {});
}

function rebuildTryHardRecommendationDashboard() {
  return TGI.RecommendationOutcomeService.rebuildDashboard();
}

function showTryHardRecommendationSummary() {
  TGI.AccessControlService.requirePermission('recommendations.view');
  var summary = TGI.RecommendationOutcomeService.rebuildDashboard();
  SpreadsheetApp.getUi().alert('Recommendation Summary',
    'Total: ' + summary.total + '\nPending: ' + summary.pending + '\nExecuted: ' + summary.executed + '\nOutcomes: ' + summary.outcomes,
    SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}