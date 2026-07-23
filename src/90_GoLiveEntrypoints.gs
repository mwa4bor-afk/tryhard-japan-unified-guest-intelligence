function initializeTryHardGoLive() {
  TGI.AccessControlService.requirePermission('golive.manage');
  TGI.GoLiveService.initialize();
  return { initialized: true, sheet: 'GoLive_Records' };
}

function runTryHardGoLivePreflight() {
  return TGI.GoLiveService.preflight();
}

function beginTryHardGoLive(input) {
  return TGI.GoLiveService.begin(input || {});
}

function verifyTryHardGoLive(goLiveId, notes) {
  return TGI.GoLiveService.verify(goLiveId, notes || '');
}

function markTryHardGoLiveRollback(goLiveId, reason) {
  return TGI.GoLiveService.markRollback(goLiveId, reason || '');
}

function showTryHardGoLiveSummary() {
  var latest = TGI.GoLiveService.latest();
  SpreadsheetApp.getUi().alert(latest ? JSON.stringify(latest, null, 2) : 'No go-live records found.');
  return latest;
}