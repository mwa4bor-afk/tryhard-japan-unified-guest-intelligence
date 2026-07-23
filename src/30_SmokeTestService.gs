TGI.SmokeTestService = (function () {
  function run(options) {
    options = options || {};
    var tests = [];
    execute_(tests, 'Configuration', function () { return TGI.ConfigService.validate(); });
    execute_(tests, 'Workbook installation', function () { return TGI.WorkbookInstaller.install(); });
    execute_(tests, 'Schema integrity', function () { return TGI.DataIntegrityService.validate(); });
    execute_(tests, 'Form registry', function () {
      var registry = TGI.FormBuilder.getRegistry();
      return { valid: Object.keys(registry).length === 5, count: Object.keys(registry).length };
    });
    execute_(tests, 'Form triggers', function () {
      var triggers = TGI.TriggerManager.listManagedTriggers();
      return { valid: triggers.length === 5, count: triggers.length };
    });
    execute_(tests, 'Automation triggers', function () {
      var triggers = TGI.AutomationService.listManagedTriggers();
      return { valid: triggers.length >= 2, count: triggers.length };
    });
    execute_(tests, 'KPI snapshot', function () { return TGI.KpiService.snapshot(); });
    execute_(tests, 'Guest segmentation', function () { return TGI.GuestSegmentationService.summary(); });
    execute_(tests, 'Dashboard rebuild', function () { return TGI.DashboardService.rebuild(); });
    if (options.seedTestData) execute_(tests, 'Test data seed', function () { return TGI.TestDataService.seed(); });

    var failed = tests.filter(function (test) { return !test.passed; });
    var report = {
      passed: failed.length === 0,
      executed_at: TGI.Util.nowIso(),
      total: tests.length,
      passed_count: tests.length - failed.length,
      failed_count: failed.length,
      tests: tests
    };
    TGI.AuditLog.write('System', 'smoke_test', report.passed ? 'PASS' : 'FAIL', report);
    return report;
  }

  function execute_(tests, name, fn) {
    var started = new Date().getTime();
    try {
      var result = fn();
      var explicitInvalid = result && result.valid === false;
      tests.push({ name: name, passed: !explicitInvalid, duration_ms: new Date().getTime() - started, result: result });
    } catch (error) {
      tests.push({ name: name, passed: false, duration_ms: new Date().getTime() - started, error: error.message, stack: error.stack || '' });
    }
  }

  return { run: run };
})();