function initializeTryHardHypercare() {
  TGI.AccessControlService.requirePermission('hypercare.manage');
  return TGI.HypercareService.initialize();
}

function startTryHardHypercare(input) {
  return TGI.HypercareService.createWindow(input || {});
}

function recordTryHardHypercareCheckpoint(hypercareId, notes) {
  return TGI.HypercareService.recordCheckpoint(hypercareId, notes);
}

function openTryHardHypercareIssue(input) {
  return TGI.HypercareService.openIssue(input || {});
}

function resolveTryHardHypercareIssue(issueId, resolution) {
  return TGI.HypercareService.resolveIssue(issueId, resolution);
}

function acceptTryHardHypercare(hypercareId, notes) {
  return TGI.HypercareService.acceptWindow(hypercareId, notes);
}

function showTryHardHypercareSummary() {
  TGI.AccessControlService.requirePermission('hypercare.view');
  var summary = TGI.HypercareService.summary();
  SpreadsheetApp.getUi().alert('TryHard Hypercare', JSON.stringify(summary, null, 2), SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}