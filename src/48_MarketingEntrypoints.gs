function initializeTryHardMarketing() {
  TGI.MessageTemplateService.ensureSheet();
  TGI.CampaignService.ensureSheets();
  var report = TGI.MarketingReportingService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Marketing workflows initialized.\nCampaigns: ' + report.campaign_summary.campaigns, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function rebuildTryHardMarketingDashboard() {
  var report = TGI.MarketingReportingService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Marketing dashboard rebuilt.\nCampaigns: ' + report.campaign_summary.campaigns + '\nQueued: ' + report.campaign_summary.queued, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function showTryHardMarketingSummary() {
  TGI.AccessControlService.requirePermission('marketing.view');
  var summary = TGI.CampaignService.summary();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Campaigns: ' + summary.campaigns + '\nDraft: ' + summary.draft + '\nLaunched: ' + summary.launched + '\nAudience: ' + summary.audience + '\nQueued: ' + summary.queued + '\nSkipped: ' + summary.skipped, SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}