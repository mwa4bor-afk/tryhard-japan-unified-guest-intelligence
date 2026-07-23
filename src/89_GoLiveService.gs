TGI.GoLiveService = (function () {
  var SHEET = 'GoLive_Records';
  var HEADERS = ['go_live_id', 'environment', 'release_id', 'status', 'preflight_json', 'rollback_json', 'started_by', 'started_at', 'verified_by', 'verified_at', 'notes'];

  function sheet() {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    return sh;
  }

  function id() {
    return 'GL-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 1000);
  }

  function preflight() {
    TGI.AccessControlService.requirePermission('golive.run');
    var validation = typeof TGI.ValidationService !== 'undefined' ? TGI.ValidationService.run() : { status: 'UNKNOWN', message: 'ValidationService unavailable' };
    var readiness = typeof TGI.ReleaseGovernanceService !== 'undefined' && TGI.ReleaseGovernanceService.readiness ? TGI.ReleaseGovernanceService.readiness() : { ready: false, reasons: ['Release readiness unavailable'] };
    var health = typeof TGI.PlatformHealthService !== 'undefined' && TGI.PlatformHealthService.runAll ? TGI.PlatformHealthService.runAll() : [];
    var failedHealth = health.filter(function (x) { return String(x.status || '').toUpperCase() === 'FAILED'; });
    return {
      checked_at: new Date().toISOString(),
      validation: validation,
      release_readiness: readiness,
      failed_health_checks: failedHealth,
      ready: String(validation.status || '').toUpperCase() === 'PASSED' && readiness.ready === true && failedHealth.length === 0
    };
  }

  function begin(input) {
    TGI.AccessControlService.requirePermission('golive.manage');
    input = input || {};
    var check = preflight();
    if (!check.ready) throw new Error('Go-live preflight failed. Review validation, release readiness, and health checks.');
    var record = {
      go_live_id: id(),
      environment: input.environment || (TGI.EnvironmentConfigService && TGI.EnvironmentConfigService.current ? TGI.EnvironmentConfigService.current() : 'UNKNOWN'),
      release_id: input.release_id || '',
      status: 'IN_PROGRESS',
      preflight_json: JSON.stringify(check),
      rollback_json: JSON.stringify(input.rollback || {}),
      started_by: TGI.AccessControlService.currentEmail(),
      started_at: new Date(),
      verified_by: '',
      verified_at: '',
      notes: input.notes || ''
    };
    sheet().appendRow(HEADERS.map(function (h) { return record[h]; }));
    TGI.AuditLog.write('GO_LIVE_STARTED', 'GoLive', record.go_live_id, record);
    return record;
  }

  function verify(goLiveId, notes) {
    TGI.AccessControlService.requirePermission('golive.approve');
    var check = preflight();
    if (!check.ready) throw new Error('Post-deployment verification failed.');
    var sh = sheet();
    var values = sh.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(goLiveId)) {
        sh.getRange(i + 1, 4).setValue('VERIFIED');
        sh.getRange(i + 1, 9).setValue(TGI.AccessControlService.currentEmail());
        sh.getRange(i + 1, 10).setValue(new Date());
        if (notes) sh.getRange(i + 1, 11).setValue(notes);
        TGI.AuditLog.write('GO_LIVE_VERIFIED', 'GoLive', goLiveId, check);
        if (TGI.DomainEventService && TGI.DomainEventService.publish) TGI.DomainEventService.publish('platform.golive.verified', { go_live_id: goLiveId, verification: check });
        return { go_live_id: goLiveId, status: 'VERIFIED', verification: check };
      }
    }
    throw new Error('Go-live record not found: ' + goLiveId);
  }

  function markRollback(goLiveId, reason) {
    TGI.AccessControlService.requirePermission('golive.manage');
    var sh = sheet();
    var values = sh.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(goLiveId)) {
        sh.getRange(i + 1, 4).setValue('ROLLED_BACK');
        sh.getRange(i + 1, 11).setValue(reason || 'Rollback executed');
        TGI.AuditLog.write('GO_LIVE_ROLLED_BACK', 'GoLive', goLiveId, { reason: reason || '' });
        return { go_live_id: goLiveId, status: 'ROLLED_BACK' };
      }
    }
    throw new Error('Go-live record not found: ' + goLiveId);
  }

  function latest() {
    TGI.AccessControlService.requirePermission('golive.view');
    var values = sheet().getDataRange().getValues();
    if (values.length < 2) return null;
    var row = values[values.length - 1];
    var out = {};
    HEADERS.forEach(function (h, i) { out[h] = row[i]; });
    return out;
  }

  return { initialize: sheet, preflight: preflight, begin: begin, verify: verify, markRollback: markRollback, latest: latest };
})();