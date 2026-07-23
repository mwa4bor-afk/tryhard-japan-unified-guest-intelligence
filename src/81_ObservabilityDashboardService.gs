TGI.ObservabilityDashboardService = (function () {
  var SHEET = 'Observability_Dashboard';

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  }

  function rebuild() {
    TGI.AccessControlService.requirePermission('observability.view');
    var health = TGI.PlatformHealthService.latest();
    var incidents = TGI.IncidentManagementService.all();
    var open = incidents.filter(function (r) { return r.status !== 'RESOLVED'; });
    var sheet = ensureSheet_();
    sheet.clear();
    var rows = [
      ['TRYHARD PLATFORM OBSERVABILITY',''],
      ['Generated At', new Date()],
      ['Health Checks', health.length],
      ['Passing', health.filter(function (r) { return r.status === 'PASS'; }).length],
      ['Warnings', health.filter(function (r) { return r.status === 'WARN'; }).length],
      ['Failures', health.filter(function (r) { return r.status === 'FAIL'; }).length],
      ['Open Incidents', open.length],
      ['Critical Incidents', open.filter(function (r) { return r.severity === 'CRITICAL'; }).length],
      [],
      ['SERVICE HEALTH'],
      ['Service','Check','Status','Severity','Metric','Threshold','Message']
    ];
    health.forEach(function (r) { rows.push([r.service,r.check_name,r.status,r.severity,r.metric_value,r.threshold,r.message]); });
    rows.push([], ['OPEN INCIDENTS'], ['Incident ID','Title','Service','Severity','Status','Owner','Opened At']);
    open.forEach(function (r) { rows.push([r.incident_id,r.title,r.service,r.severity,r.status,r.owner_email,r.opened_at]); });
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
    rows = rows.map(function (r) { while (r.length < width) r.push(''); return r; });
    sheet.getRange(1, 1, rows.length, width).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, width);
    TGI.AuditLog.write('OBSERVABILITY_DASHBOARD_REBUILT', 'Observability', '', { health_checks: health.length, open_incidents: open.length });
    return { health_checks: health.length, open_incidents: open.length };
  }

  function summary() {
    var health = TGI.PlatformHealthService.latest();
    var incidents = TGI.IncidentManagementService.all();
    return {
      status: health.some(function (r) { return r.status === 'FAIL'; }) ? 'DEGRADED' : health.some(function (r) { return r.status === 'WARN'; }) ? 'WARNING' : 'HEALTHY',
      passing: health.filter(function (r) { return r.status === 'PASS'; }).length,
      warnings: health.filter(function (r) { return r.status === 'WARN'; }).length,
      failures: health.filter(function (r) { return r.status === 'FAIL'; }).length,
      open_incidents: incidents.filter(function (r) { return r.status !== 'RESOLVED'; }).length
    };
  }

  return { ensureSheet: ensureSheet_, rebuild: rebuild, summary: summary };
})();