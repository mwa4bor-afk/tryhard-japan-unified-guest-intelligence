TGI.ValidationService = (function () {
  var SHEET = 'Validation_Results';
  var HEADERS = ['validation_id','run_id','category','check_name','status','severity','details','checked_at','checked_by'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function result_(runId, category, name, status, severity, details) {
    return {
      validation_id: TGI.Util.id('VAL'),
      run_id: runId,
      category: category,
      check_name: name,
      status: status,
      severity: severity,
      details: typeof details === 'string' ? details : JSON.stringify(details || {}),
      checked_at: new Date(),
      checked_by: TGI.AccessControlService.currentEmail()
    };
  }

  function checkNamespace_(runId) {
    var required = [
      'Util','AuditLog','AccessControlService','GuestRepository','SheetRepository',
      'IntegrationRegistryService','DomainEventService','LoyaltyProgramService',
      'RevenueDemandService','PmsSyncService','RecommendationEngineService',
      'PlatformHealthService','ReleaseGovernanceService'
    ];
    return required.map(function (name) {
      var ok = typeof TGI[name] !== 'undefined' && TGI[name] !== null;
      return result_(runId, 'NAMESPACE', name, ok ? 'PASS' : 'FAIL', ok ? 'INFO' : 'CRITICAL', ok ? 'Module available.' : 'Required TGI module is missing.');
    });
  }

  function checkSheets_(runId) {
    var required = [
      'Guests','Stays','Preferences','Tasks','Contact_History','Audit_Log',
      'Integrations','Domain_Events','Loyalty_Ledger','Revenue_Demand',
      'Reservations','Platform_Health','Platform_Incidents','Environment_Config',
      'Schema_Migrations','Platform_Releases'
    ];
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return required.map(function (name) {
      var ok = !!ss.getSheetByName(name);
      return result_(runId, 'SHEET', name, ok ? 'PASS' : 'FAIL', ok ? 'INFO' : 'ERROR', ok ? 'Sheet available.' : 'Required sheet is missing; run the relevant initializer or migration.');
    });
  }

  function checkTriggers_(runId) {
    var handlers = {};
    ScriptApp.getProjectTriggers().forEach(function (trigger) { handlers[trigger.getHandlerFunction()] = true; });
    var expected = ['processTryHardWorkflowsNow','runTryHardPlatformHealthChecks'];
    return expected.map(function (handler) {
      var ok = !!handlers[handler];
      return result_(runId, 'TRIGGER', handler, ok ? 'PASS' : 'WARN', ok ? 'INFO' : 'WARNING', ok ? 'Trigger installed.' : 'Recommended scheduled trigger is not installed.');
    });
  }

  function checkConfiguration_(runId) {
    var results = [];
    var env = '';
    try { env = TGI.EnvironmentConfigService.currentEnvironment(); } catch (error) {}
    results.push(result_(runId, 'CONFIG', 'environment', env ? 'PASS' : 'FAIL', env ? 'INFO' : 'ERROR', env ? ('Current environment: ' + env) : 'No environment is configured.'));
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    results.push(result_(runId, 'CONFIG', 'spreadsheet_binding', spreadsheet ? 'PASS' : 'FAIL', spreadsheet ? 'INFO' : 'CRITICAL', spreadsheet ? spreadsheet.getId() : 'No active spreadsheet binding.'));
    return results;
  }

  function checkReleaseReadiness_(runId) {
    try {
      var readiness = TGI.ReleaseGovernanceService.readiness();
      return [result_(runId, 'RELEASE', 'deployment_readiness', readiness.ready ? 'PASS' : 'FAIL', readiness.ready ? 'INFO' : 'ERROR', readiness)];
    } catch (error) {
      return [result_(runId, 'RELEASE', 'deployment_readiness', 'FAIL', 'ERROR', error.message)];
    }
  }

  function persist_(results) {
    var sheet = ensureSheet_();
    if (!results.length) return results;
    sheet.getRange(sheet.getLastRow() + 1, 1, results.length, HEADERS.length).setValues(results.map(function (record) {
      return HEADERS.map(function (header) { return record[header]; });
    }));
    return results;
  }

  function run() {
    TGI.AccessControlService.requirePermission('validation.run');
    var runId = TGI.Util.id('VRUN');
    var results = [];
    results = results.concat(checkNamespace_(runId));
    results = results.concat(checkSheets_(runId));
    results = results.concat(checkTriggers_(runId));
    results = results.concat(checkConfiguration_(runId));
    results = results.concat(checkReleaseReadiness_(runId));
    persist_(results);
    var failures = results.filter(function (item) { return item.status === 'FAIL'; }).length;
    var warnings = results.filter(function (item) { return item.status === 'WARN'; }).length;
    var summary = { run_id: runId, passed: results.length - failures - warnings, warnings: warnings, failures: failures, total: results.length, valid: failures === 0 };
    TGI.AuditLog.write('VALIDATION_RUN', 'Validation', runId, summary);
    return summary;
  }

  function latest() {
    TGI.AccessControlService.requirePermission('validation.view');
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
    var records = rows.map(function (row) { var r = {}; HEADERS.forEach(function (h, i) { r[h] = row[i]; }); return r; });
    var runId = records.length ? records[records.length - 1].run_id : '';
    return records.filter(function (record) { return record.run_id === runId; });
  }

  return { ensureSheet: ensureSheet_, run: run, latest: latest };
})();