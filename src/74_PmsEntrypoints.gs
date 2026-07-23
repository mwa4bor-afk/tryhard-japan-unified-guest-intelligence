function initializeTryHardPmsConnectors() {
  TGI.AccessControlService.requirePermission('pms.manage');
  TGI.PmsProviderAdapters.install();
  TGI.PmsSyncService.ensureSheets();
  return TGI.PmsDashboardService.rebuild();
}

function ingestTryHardPmsReservations(provider, propertyId, payloads, cursor) {
  return TGI.PmsSyncService.ingest(provider, propertyId, payloads, cursor);
}

function rebuildTryHardPmsDashboard() {
  return TGI.PmsDashboardService.rebuild();
}

function showTryHardPmsSummary() {
  var summary = TGI.PmsDashboardService.rebuild();
  SpreadsheetApp.getUi().alert('PMS Sync', JSON.stringify(summary, null, 2), SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}