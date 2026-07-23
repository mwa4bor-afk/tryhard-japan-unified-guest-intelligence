TGI.MarketingReportingService = (function () {
  var SHEET = 'Marketing_Dashboard';

  function rebuild() {
    TGI.AccessControlService.requirePermission('marketing.view');
    var summary = TGI.CampaignService.summary();
    var queue = TGI.IntegrationQueueService.summary();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    sheet.clear();
    var rows = [
      ['TRYHARD JAPAN MARKETING DASHBOARD', ''],
      ['Generated', new Date()],
      ['', ''],
      ['Campaigns', summary.campaigns],
      ['Draft campaigns', summary.draft],
      ['Launched campaigns', summary.launched],
      ['Audience selected', summary.audience],
      ['Messages queued', summary.queued],
      ['Recipients skipped', summary.skipped],
      ['', ''],
      ['Queue pending', queue.PENDING || 0],
      ['Queue retrying', queue.RETRY || 0],
      ['Queue completed', queue.COMPLETED || 0],
      ['Queue failed', queue.FAILED || 0]
    ];
    sheet.getRange(1,1,rows.length,2).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1,2);
    TGI.AuditLog.write(SHEET, 'MARKETING', 'REBUILD', { campaigns: summary.campaigns, queued: summary.queued });
    return { campaign_summary: summary, queue_summary: queue };
  }

  return { rebuild: rebuild };
})();