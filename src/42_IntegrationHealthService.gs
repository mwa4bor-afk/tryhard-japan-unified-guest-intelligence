TGI.IntegrationHealthService = (function () {
  var SHEET = 'Integration_Health';

  function rebuild() {
    TGI.AccessControlService.requirePermission('reports.view');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    sheet.clear();
    var integrations = TGI.IntegrationRegistryService.all();
    var queue = TGI.IntegrationQueueService.all();
    var counts = {};
    queue.forEach(function (job) {
      if (!counts[job.integration_id]) counts[job.integration_id] = { PENDING: 0, RETRY: 0, COMPLETED: 0, FAILED: 0 };
      counts[job.integration_id][job.status] = (counts[job.integration_id][job.status] || 0) + 1;
    });
    var rows = [['INTEGRATION','TYPE','STATUS','PENDING','RETRY','COMPLETED','FAILED','LAST SUCCESS','LAST FAILURE','LAST ERROR']];
    integrations.forEach(function (integration) {
      var summary = counts[integration.integration_id] || { PENDING: 0, RETRY: 0, COMPLETED: 0, FAILED: 0 };
      rows.push([integration.name, integration.type, integration.status, summary.PENDING, summary.RETRY, summary.COMPLETED, summary.FAILED, integration.last_success_at, integration.last_failure_at, integration.last_error]);
    });
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, rows[0].length);
    TGI.AuditLog.write(SHEET, 'HEALTH', 'REBUILD', { integrations: integrations.length, queue_jobs: queue.length });
    return { integrations: integrations.length, queue: TGI.IntegrationQueueService.summary() };
  }

  return { rebuild: rebuild };
})();