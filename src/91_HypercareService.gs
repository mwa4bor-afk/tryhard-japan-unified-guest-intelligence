TGI.HypercareService = (function () {
  var SHEETS = {
    WINDOWS: 'Hypercare_Windows',
    CHECKPOINTS: 'Hypercare_Checkpoints',
    ISSUES: 'Hypercare_Issues'
  };

  var STATUS = {
    PLANNED: 'PLANNED',
    ACTIVE: 'ACTIVE',
    ACCEPTED: 'ACCEPTED',
    EXTENDED: 'EXTENDED',
    CLOSED: 'CLOSED'
  };

  function spreadsheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('A bound spreadsheet is required.');
    return ss;
  }

  function ensureSheet(name, headers) {
    var ss = spreadsheet();
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);
    return sheet;
  }

  function initialize() {
    ensureSheet(SHEETS.WINDOWS, ['hypercare_id', 'release_id', 'start_at', 'planned_end_at', 'actual_end_at', 'status', 'owner_email', 'acceptance_owner_email', 'acceptance_notes', 'created_at', 'updated_at']);
    ensureSheet(SHEETS.CHECKPOINTS, ['checkpoint_id', 'hypercare_id', 'checkpoint_at', 'health_status', 'open_incidents', 'open_cases', 'failed_integrations', 'workflow_backlog', 'notes', 'recorded_by']);
    ensureSheet(SHEETS.ISSUES, ['issue_id', 'hypercare_id', 'severity', 'title', 'description', 'owner_email', 'status', 'opened_at', 'resolved_at', 'resolution']);
    return { sheets: SHEETS };
  }

  function id(prefix) {
    return prefix + '-' + Utilities.getUuid();
  }

  function now() {
    return new Date();
  }

  function createWindow(input) {
    TGI.AccessControlService.requirePermission('hypercare.manage');
    initialize();
    input = input || {};
    if (!input.releaseId) throw new Error('releaseId is required.');
    var start = input.startAt ? new Date(input.startAt) : now();
    var plannedEnd = input.plannedEndAt ? new Date(input.plannedEndAt) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    var row = [id('HC'), input.releaseId, start, plannedEnd, '', STATUS.ACTIVE, input.ownerEmail || TGI.AccessControlService.currentEmail(), input.acceptanceOwnerEmail || '', '', now(), now()];
    spreadsheet().getSheetByName(SHEETS.WINDOWS).appendRow(row);
    TGI.AuditLog.write('HYPERCARE_STARTED', 'Hypercare', row[0], { releaseId: input.releaseId, plannedEndAt: plannedEnd });
    return { hypercareId: row[0], status: STATUS.ACTIVE };
  }

  function recordCheckpoint(hypercareId, notes) {
    TGI.AccessControlService.requirePermission('hypercare.run');
    initialize();
    if (!hypercareId) throw new Error('hypercareId is required.');
    var health = safeCall(function () { return TGI.PlatformHealthService.summary(); }, {});
    var incidents = safeCall(function () { return TGI.IncidentManagementService.summary(); }, {});
    var cases = safeCall(function () { return TGI.CaseDashboardService.summary(); }, {});
    var integrations = safeCall(function () { return TGI.IntegrationHealthService.summary(); }, {});
    var workflows = safeCall(function () { return TGI.WorkflowDashboardService.summary(); }, {});
    var row = [id('HCC'), hypercareId, now(), health.status || 'UNKNOWN', numberValue(incidents.open || incidents.openCount), numberValue(cases.open || cases.openCount), numberValue(integrations.failed || integrations.failedCount), numberValue(workflows.backlog || workflows.pending), notes || '', TGI.AccessControlService.currentEmail()];
    spreadsheet().getSheetByName(SHEETS.CHECKPOINTS).appendRow(row);
    return { checkpointId: row[0], healthStatus: row[3] };
  }

  function openIssue(input) {
    TGI.AccessControlService.requirePermission('hypercare.manage');
    initialize();
    input = input || {};
    if (!input.hypercareId || !input.title) throw new Error('hypercareId and title are required.');
    var row = [id('HCI'), input.hypercareId, String(input.severity || 'MEDIUM').toUpperCase(), input.title, input.description || '', input.ownerEmail || '', 'OPEN', now(), '', ''];
    spreadsheet().getSheetByName(SHEETS.ISSUES).appendRow(row);
    TGI.AuditLog.write('HYPERCARE_ISSUE_OPENED', 'HypercareIssue', row[0], { severity: row[2], title: row[3] });
    return { issueId: row[0], status: 'OPEN' };
  }

  function resolveIssue(issueId, resolution) {
    TGI.AccessControlService.requirePermission('hypercare.manage');
    var sheet = spreadsheet().getSheetByName(SHEETS.ISSUES);
    if (!sheet) throw new Error('Hypercare issues sheet is not initialized.');
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(issueId)) {
        sheet.getRange(i + 1, 7, 1, 4).setValues([['RESOLVED', values[i][7], now(), resolution || '']]);
        return { issueId: issueId, status: 'RESOLVED' };
      }
    }
    throw new Error('Hypercare issue not found: ' + issueId);
  }

  function acceptWindow(hypercareId, notes) {
    TGI.AccessControlService.requirePermission('hypercare.approve');
    initialize();
    var openIssues = countOpenIssues(hypercareId);
    var latest = latestCheckpoint(hypercareId);
    if (openIssues > 0) throw new Error('Cannot accept hypercare with open issues: ' + openIssues);
    if (!latest || String(latest.healthStatus).toUpperCase() === 'FAIL') throw new Error('A passing checkpoint is required before acceptance.');
    var sheet = spreadsheet().getSheetByName(SHEETS.WINDOWS);
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(hypercareId)) {
        sheet.getRange(i + 1, 5, 1, 7).setValues([[now(), STATUS.ACCEPTED, values[i][6], TGI.AccessControlService.currentEmail(), notes || '', values[i][9], now()]]);
        TGI.AuditLog.write('HYPERCARE_ACCEPTED', 'Hypercare', hypercareId, { notes: notes || '' });
        if (TGI.DomainEventService && TGI.DomainEventService.publish) TGI.DomainEventService.publish('platform.hypercare.accepted', { hypercareId: hypercareId });
        return { hypercareId: hypercareId, status: STATUS.ACCEPTED };
      }
    }
    throw new Error('Hypercare window not found: ' + hypercareId);
  }

  function countOpenIssues(hypercareId) {
    var sheet = spreadsheet().getSheetByName(SHEETS.ISSUES);
    if (!sheet || sheet.getLastRow() < 2) return 0;
    return sheet.getDataRange().getValues().slice(1).filter(function (r) { return String(r[1]) === String(hypercareId) && String(r[6]) !== 'RESOLVED'; }).length;
  }

  function latestCheckpoint(hypercareId) {
    var sheet = spreadsheet().getSheetByName(SHEETS.CHECKPOINTS);
    if (!sheet || sheet.getLastRow() < 2) return null;
    var rows = sheet.getDataRange().getValues().slice(1).filter(function (r) { return String(r[1]) === String(hypercareId); });
    if (!rows.length) return null;
    rows.sort(function (a, b) { return new Date(b[2]).getTime() - new Date(a[2]).getTime(); });
    return { checkpointId: rows[0][0], checkpointAt: rows[0][2], healthStatus: rows[0][3] };
  }

  function summary() {
    initialize();
    var windows = spreadsheet().getSheetByName(SHEETS.WINDOWS).getDataRange().getValues().slice(1);
    var issues = spreadsheet().getSheetByName(SHEETS.ISSUES).getDataRange().getValues().slice(1);
    return {
      activeWindows: windows.filter(function (r) { return r[5] === STATUS.ACTIVE || r[5] === STATUS.EXTENDED; }).length,
      acceptedWindows: windows.filter(function (r) { return r[5] === STATUS.ACCEPTED; }).length,
      openIssues: issues.filter(function (r) { return r[6] !== 'RESOLVED'; }).length
    };
  }

  function safeCall(fn, fallback) {
    try { return fn() || fallback; } catch (error) { return fallback; }
  }

  function numberValue(value) {
    var n = Number(value || 0);
    return isNaN(n) ? 0 : n;
  }

  return {
    STATUS: STATUS,
    initialize: initialize,
    createWindow: createWindow,
    recordCheckpoint: recordCheckpoint,
    openIssue: openIssue,
    resolveIssue: resolveIssue,
    acceptWindow: acceptWindow,
    summary: summary
  };
})();