TGI.GuestCaseService = (function () {
  var SHEET = 'Guest_Cases';
  var HEADERS = ['case_id','guest_id','location_id','source_type','source_id','category','priority','subject','description','status','owner_email','manager_email','opened_at','first_response_at','due_at','resolved_at','closed_at','resolution','escalation_level','last_escalated_at','created_by','updated_at'];
  var STATUSES = ['OPEN','IN_PROGRESS','WAITING_GUEST','RESOLVED','CLOSED','CANCELLED'];
  var PRIORITIES = ['LOW','NORMAL','HIGH','URGENT','CRITICAL'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function all() {
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(function (row, index) {
      var record = { _row: index + 2 };
      HEADERS.forEach(function (header, column) { record[header] = row[column]; });
      return record;
    });
  }

  function find(caseId) {
    return all().filter(function (record) { return String(record.case_id) === String(caseId); })[0] || null;
  }

  function defaultDueAt_(priority, openedAt) {
    var hours = { LOW: 72, NORMAL: 24, HIGH: 8, URGENT: 2, CRITICAL: 1 }[priority] || 24;
    return new Date(new Date(openedAt).getTime() + hours * 3600000);
  }

  function save(input) {
    TGI.AccessControlService.requirePermission('cases.manage');
    input = input || {};
    var existing = input.case_id ? find(input.case_id) : null;
    var now = new Date();
    var priority = String(input.priority || (existing && existing.priority) || 'NORMAL').toUpperCase();
    var status = String(input.status || (existing && existing.status) || 'OPEN').toUpperCase();
    TGI.Util.assert(PRIORITIES.indexOf(priority) !== -1, 'Invalid case priority: ' + priority);
    TGI.Util.assert(STATUSES.indexOf(status) !== -1, 'Invalid case status: ' + status);
    TGI.Util.assert(input.guest_id || (existing && existing.guest_id), 'guest_id is required.');
    TGI.Util.assert(input.subject || (existing && existing.subject), 'Case subject is required.');

    var openedAt = input.opened_at || (existing && existing.opened_at) || now;
    var record = {
      case_id: input.case_id || TGI.Util.id('CASE'), guest_id: input.guest_id || existing.guest_id,
      location_id: input.location_id !== undefined ? input.location_id : (existing ? existing.location_id : ''),
      source_type: input.source_type !== undefined ? input.source_type : (existing ? existing.source_type : 'MANUAL'),
      source_id: input.source_id !== undefined ? input.source_id : (existing ? existing.source_id : ''),
      category: input.category !== undefined ? input.category : (existing ? existing.category : 'GENERAL'),
      priority: priority, subject: input.subject || existing.subject,
      description: input.description !== undefined ? input.description : (existing ? existing.description : ''),
      status: status, owner_email: input.owner_email !== undefined ? input.owner_email : (existing ? existing.owner_email : ''),
      manager_email: input.manager_email !== undefined ? input.manager_email : (existing ? existing.manager_email : ''),
      opened_at: openedAt,
      first_response_at: input.first_response_at !== undefined ? input.first_response_at : (existing ? existing.first_response_at : ''),
      due_at: input.due_at || (existing && existing.due_at) || defaultDueAt_(priority, openedAt),
      resolved_at: input.resolved_at !== undefined ? input.resolved_at : (existing ? existing.resolved_at : ''),
      closed_at: input.closed_at !== undefined ? input.closed_at : (existing ? existing.closed_at : ''),
      resolution: input.resolution !== undefined ? input.resolution : (existing ? existing.resolution : ''),
      escalation_level: Number(input.escalation_level !== undefined ? input.escalation_level : (existing ? existing.escalation_level : 0)),
      last_escalated_at: input.last_escalated_at !== undefined ? input.last_escalated_at : (existing ? existing.last_escalated_at : ''),
      created_by: (existing && existing.created_by) || TGI.AccessControlService.currentEmail(), updated_at: now
    };

    if (status === 'RESOLVED' && !record.resolved_at) record.resolved_at = now;
    if (status === 'CLOSED' && !record.closed_at) record.closed_at = now;
    var sheet = ensureSheet_();
    var values = HEADERS.map(function (header) { return record[header] === undefined ? '' : record[header]; });
    if (existing) sheet.getRange(existing._row, 1, 1, HEADERS.length).setValues([values]); else sheet.appendRow(values);
    TGI.AuditLog.write(SHEET, record.case_id, existing ? 'UPDATE' : 'CREATE', { guest_id: record.guest_id, priority: record.priority, status: record.status });
    return record;
  }

  function acknowledge(caseId, ownerEmail) {
    var record = find(caseId); TGI.Util.assert(record, 'Case not found: ' + caseId);
    return save({ case_id: caseId, status: 'IN_PROGRESS', owner_email: ownerEmail || TGI.AccessControlService.currentEmail(), first_response_at: record.first_response_at || new Date() });
  }

  function resolve(caseId, resolution) {
    var record = find(caseId); TGI.Util.assert(record, 'Case not found: ' + caseId);
    return save({ case_id: caseId, status: 'RESOLVED', resolution: resolution || '', resolved_at: new Date() });
  }

  function openCases() {
    return all().filter(function (record) { return ['OPEN','IN_PROGRESS','WAITING_GUEST'].indexOf(record.status) !== -1; });
  }

  return { ensureSheet: ensureSheet_, all: all, find: find, save: save, acknowledge: acknowledge, resolve: resolve, openCases: openCases, STATUSES: STATUSES, PRIORITIES: PRIORITIES };
})();