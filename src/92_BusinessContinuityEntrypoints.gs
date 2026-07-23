function initializeTryHardBusinessContinuity() {
  return TGI.BusinessContinuityService.initialize();
}

function createTryHardRecoveryPoint(input) {
  return TGI.BusinessContinuityService.createRecoveryPoint(input);
}

function beginTryHardRecoveryDrill(input) {
  return TGI.BusinessContinuityService.beginRecoveryDrill(input);
}

function completeTryHardRecoveryDrill(recordId, input) {
  return TGI.BusinessContinuityService.completeRecoveryDrill(recordId, input);
}

function showTryHardBusinessContinuitySummary() {
  var summary = TGI.BusinessContinuityService.summary();
  SpreadsheetApp.getUi().alert('Business Continuity', JSON.stringify(summary, null, 2), SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}