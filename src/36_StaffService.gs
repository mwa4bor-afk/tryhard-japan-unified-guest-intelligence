TGI.StaffService = (function () {
  var SHEET = 'Staff';
  var HEADERS = ['staff_id','email','name','role','department','location_id','manager_email','status','created_at','updated_at'];
  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
    return sheet;
  }
  function all() {
    var sheet = ensureSheet_(); if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS.length).getValues().map(function (row) {
      var r={}; HEADERS.forEach(function(h,i){r[h]=row[i];}); return r;
    });
  }
  function save(input) {
    TGI.AccessControlService.requirePermission('MANAGE_OPERATIONS');
    TGI.Util.assert(input && input.email, 'Staff email is required.');
    TGI.Util.assert(input.name, 'Staff name is required.');
    var now = new Date();
    var record = {
      staff_id: input.staff_id || TGI.Util.id('STF'), email: String(input.email).toLowerCase(), name: input.name,
      role: input.role || 'OPERATOR', department: input.department || 'Operations', location_id: input.location_id || '',
      manager_email: input.manager_email || '', status: input.status || 'ACTIVE', created_at: input.created_at || now, updated_at: now
    };
    var sheet=ensureSheet_(), rows=all(), index=-1;
    rows.some(function(row,i){if(row.staff_id===record.staff_id || String(row.email).toLowerCase()===record.email){index=i; record.staff_id=row.staff_id; record.created_at=row.created_at; return true;} return false;});
    var values=HEADERS.map(function(h){return record[h];});
    if(index>=0) sheet.getRange(index+2,1,1,HEADERS.length).setValues([values]); else sheet.appendRow(values);
    TGI.AuditLog.write(SHEET, record.staff_id, index>=0?'UPDATE':'CREATE', record); return record;
  }
  function activeByLocation(locationId) { return all().filter(function(r){return r.status==='ACTIVE' && (!locationId || r.location_id===locationId);}); }
  return { ensureSheet: ensureSheet_, all: all, save: save, activeByLocation: activeByLocation };
})();