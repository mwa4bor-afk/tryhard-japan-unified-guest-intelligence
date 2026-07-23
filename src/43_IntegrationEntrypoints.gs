function initializeTryHardIntegrations() {
  TGI.AccessControlService.requirePermission('integrations.manage');
  TGI.IntegrationRegistryService.ensureSheet();
  TGI.IntegrationQueueService.ensureSheet();
  var report = TGI.IntegrationHealthService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Integration framework initialized.\nIntegrations: ' + report.integrations, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function installTryHardIntegrationProcessor() {
  TGI.WebhookDeliveryService.installTrigger();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Integration queue processor installed. It runs every 15 minutes.', SpreadsheetApp.getUi().ButtonSet.OK);
  return true;
}

function processTryHardIntegrationsNow() {
  var report = TGI.WebhookDeliveryService.process(25);
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Integration jobs processed: ' + report.processed + '\nSucceeded: ' + report.succeeded + '\nFailed: ' + report.failed, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function rebuildTryHardIntegrationHealth() {
  var report = TGI.IntegrationHealthService.rebuild();
  var queue = report.queue;
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Integration health rebuilt.\nIntegrations: ' + report.integrations + '\nPending: ' + queue.PENDING + '\nRetry: ' + queue.RETRY + '\nFailed: ' + queue.FAILED, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}