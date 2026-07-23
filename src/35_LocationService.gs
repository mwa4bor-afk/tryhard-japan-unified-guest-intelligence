TGI.LocationService = (function () {
  var SHEET = 'Locations';
  var HEADERS = ['location_id','name','brand','region','timezone','currency','language','capacity','operating_hours','status','created_at','updated_at'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function all() {
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS.length).getValues().map(function (row) {
      var record = {}; HEADERS.forEach(function (h,i) { record[h] = row[i]; }); return record;
    });
  }

  function save(input) {
    TGI.AccessControlService.requirePermission('operations.manage');
    input = input || {};
    TGI.Util.assert(input.name, 'Location name is required.');
    var now = new Date();
    var record = {
      location_id: input.location_id || TGI.Util.id('LOC'),
      name: input.name,
      brand: input.brand || 'TryHard Japan',
      region: input.region || 'Japan',
      timezone: input.timezone || Session.getScriptTimeZone() || 'Asia/Tokyo',
      currency: input.currency || 'JPY',
      language: input.language || 'ja',
      capacity: Number(input.capacity || 0),
      operating_hours: input.operating_hours || '',
      status: input.status || 'ACTIVE',
      created_at: input.created_at || now,
      updated_at: now
    };
    var sheet = ensureSheet_();
    var rows = all();
    var index = -1;
    rows.some(function (row, i) { if (row.location_id === record.location_id) { index = i; return true; } return false; });
    var values = HEADERS.map(function (h) { return record[h]; });
    if (index >= 0) sheet.getRange(index + 2,1,1,HEADERS.length).setValues([values]); else sheet.appendRow(values);
    TGI.AuditLog.write(SHEET, record.location_id, index >= 0 ? 'UPDATE' : 'CREATE', record);
    return record;
  }

  function active() { return all().filter(function (row) { return row.status === 'ACTIVE'; }); }
  function archive(locationId) {
    var record = all().filter(function (row) { return row.location_id === locationId; })[0];
    TGI.Util.assert(record, 'Location not found: ' + locationId);
    record.status = 'ARCHIVED'; return save(record);
  }

  return { ensureSheet: ensureSheet_, all: all, active: active, save: save, archive: archive };
})();