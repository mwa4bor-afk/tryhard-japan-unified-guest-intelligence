TGI.IncidentManagementService = (function () {
  var SHEET = 'Platform_Incidents';
  var HEADERS = ['incident_id','title','service','severity','status','source_check_id','owner_email','opened_at','acknowledged_at','resolved_at','resolution','details_json','updated_at'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function all() {
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(function (row) {
      var record = {}; HEADERS.forEach(function (h, i) { record[h] = row[i]; }); return record;
    });
  }

  function save_(record) {
    var sheet = ensureSheet_();
    var rows = all();
    var index = -1;
    rows.some(function (row, i) { if (row.incident_id === record.incident_id) { index = i; return true; } return false; });
    var values = HEADERS.map(function (h) { return record[h] || ''; });
    if (index >= 0) sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([values]); else sheet.appendRow(values);
    return record;
  }

  function find(id) { return all().filter(function (r) { return r.incident_id === id; })[0] || null; }

  function openFromHealth(check) {
    TGI.AccessControlService.requirePermission('incidents.manage');
    var existing = all().filter(function (r) { return r.source_check_id === check.check_id && r.status !== 'RESOLVED'; })[0];
    if (existing) return existing;
    var now = new Date();
    var record = {
      incident_id: TGI.Util.id('INC'), title: check.service + ': ' + check.check_name,
      service: check.service, severity: check.severity, status: 'OPEN', source_check_id: check.check_id,
      owner_email: '', opened_at: now, acknowledged_at: '', resolved_at: '', resolution: '',
      details_json: check.details_json || '{}', updated_at: now
    };
    save_(record);
    if (TGI.DomainEventService) TGI.DomainEventService.publish('platform.incident.opened', record, { source: 'health_check' });
    TGI.AuditLog.write('INCIDENT_OPENED', 'PlatformIncident', record.incident_id, { service: record.service, severity: record.severity });
    return record;
  }

  function createFromFailedChecks() {
    var checks = TGI.PlatformHealthService.latest();
    return checks.filter(function (c) { return c.status === 'FAIL'; }).map(openFromHealth);
  }

  function acknowledge(id, ownerEmail) {
    TGI.AccessControlService.requirePermission('incidents.manage');
    var record = find(id); TGI.Util.assert(record, 'Incident not found.');
    record.status = 'ACKNOWLEDGED'; record.owner_email = ownerEmail || TGI.AccessControlService.currentEmail();
    record.acknowledged_at = new Date(); record.updated_at = new Date();
    save_(record); TGI.AuditLog.write('INCIDENT_ACKNOWLEDGED', 'PlatformIncident', id, { owner: record.owner_email });
    return record;
  }

  function resolve(id, resolution) {
    TGI.AccessControlService.requirePermission('incidents.manage');
    var record = find(id); TGI.Util.assert(record, 'Incident not found.');
    record.status = 'RESOLVED'; record.resolution = String(resolution || ''); record.resolved_at = new Date(); record.updated_at = new Date();
    save_(record);
    if (TGI.DomainEventService) TGI.DomainEventService.publish('platform.incident.resolved', record, { source: 'incident_management' });
    TGI.AuditLog.write('INCIDENT_RESOLVED', 'PlatformIncident', id, { resolution: record.resolution });
    return record;
  }

  return { ensureSheet: ensureSheet_, all: all, find: find, openFromHealth: openFromHealth, createFromFailedChecks: createFromFailedChecks, acknowledge: acknowledge, resolve: resolve };
})();