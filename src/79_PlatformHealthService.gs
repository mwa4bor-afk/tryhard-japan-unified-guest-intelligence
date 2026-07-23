TGI.PlatformHealthService = (function () {
  var SHEET = 'Platform_Health';
  var HEADERS = ['check_id','service','check_name','status','severity','message','metric_value','threshold','checked_at','details_json'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function sheetCount_(name) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
  }

  function pendingCount_(name, statusColumn, statuses) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) return 0;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var index = headers.indexOf(statusColumn);
    if (index < 0) return 0;
    return sheet.getRange(2, index + 1, sheet.getLastRow() - 1, 1).getValues().filter(function (row) {
      return statuses.indexOf(String(row[0]).toUpperCase()) >= 0;
    }).length;
  }

  function result_(service, name, status, severity, message, value, threshold, details) {
    return {
      check_id: TGI.Util.id('HLT'), service: service, check_name: name,
      status: status, severity: severity, message: message,
      metric_value: value, threshold: threshold, checked_at: new Date(),
      details_json: JSON.stringify(details || {})
    };
  }

  function runChecks() {
    TGI.AccessControlService.requirePermission('observability.run');
    var checks = [];
    var pendingEvents = pendingCount_('Domain_Events', 'status', ['PENDING','FAILED']);
    checks.push(result_('Workflows', 'Event backlog', pendingEvents > 100 ? 'FAIL' : pendingEvents > 25 ? 'WARN' : 'PASS', pendingEvents > 100 ? 'CRITICAL' : 'MEDIUM', 'Pending or failed domain events.', pendingEvents, 25));
    var failedIntegrations = pendingCount_('Integration_Queue', 'status', ['FAILED','DEAD']);
    checks.push(result_('Integrations', 'Delivery failures', failedIntegrations > 20 ? 'FAIL' : failedIntegrations > 0 ? 'WARN' : 'PASS', failedIntegrations > 20 ? 'HIGH' : 'MEDIUM', 'Failed outbound integration deliveries.', failedIntegrations, 0));
    var quarantined = sheetCount_('PMS_Quarantine');
    checks.push(result_('PMS', 'Quarantined records', quarantined > 50 ? 'FAIL' : quarantined > 0 ? 'WARN' : 'PASS', quarantined > 50 ? 'HIGH' : 'LOW', 'PMS records requiring review.', quarantined, 0));
    var breachedCases = pendingCount_('Guest_Cases', 'sla_status', ['BREACHED']);
    checks.push(result_('Cases', 'SLA breaches', breachedCases > 10 ? 'FAIL' : breachedCases > 0 ? 'WARN' : 'PASS', breachedCases > 10 ? 'CRITICAL' : 'HIGH', 'Guest cases currently in SLA breach.', breachedCases, 0));
    var reconciliationRows = sheetCount_('Loyalty_Ledger');
    checks.push(result_('Loyalty', 'Ledger availability', reconciliationRows === 0 ? 'WARN' : 'PASS', 'LOW', 'Loyalty ledger row availability.', reconciliationRows, 1));

    var sheet = ensureSheet_();
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).clearContent();
    if (checks.length) sheet.getRange(2, 1, checks.length, HEADERS.length).setValues(checks.map(function (r) { return HEADERS.map(function (h) { return r[h]; }); }));
    TGI.AuditLog.write('HEALTH_CHECK_COMPLETED', 'PlatformHealth', '', { checks: checks.length });
    return checks;
  }

  function latest() {
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(function (row) {
      var record = {}; HEADERS.forEach(function (h, i) { record[h] = row[i]; }); return record;
    });
  }

  return { ensureSheet: ensureSheet_, runChecks: runChecks, latest: latest };
})();