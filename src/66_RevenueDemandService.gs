TGI.RevenueDemandService = (function () {
  var SHEET = 'Revenue_Demand';
  var HEADERS = ['snapshot_id','location_id','stay_date','rooms_available','rooms_sold','occupancy_pct','room_revenue','adr','revpar','pickup_1d','pickup_7d','pickup_14d','demand_score','source','captured_at'];

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

  function capture(input) {
    TGI.AccessControlService.requirePermission('revenue.manage');
    input = input || {};
    var available = Math.max(0, Number(input.rooms_available || 0));
    var sold = Math.max(0, Number(input.rooms_sold || 0));
    var revenue = Math.max(0, Number(input.room_revenue || 0));
    var occupancy = available ? sold / available : 0;
    var adr = sold ? revenue / sold : 0;
    var revpar = available ? revenue / available : 0;
    var pickup1 = Number(input.pickup_1d || 0);
    var pickup7 = Number(input.pickup_7d || 0);
    var pickup14 = Number(input.pickup_14d || 0);
    var pace = Math.max(-1, Math.min(1, (pickup1 * 0.5 + pickup7 * 0.3 + pickup14 * 0.2) / Math.max(1, available)));
    var score = Math.max(0, Math.min(100, Math.round((occupancy * 70 + Math.max(0, pace) * 30) * 100) / 100));
    var record = {
      snapshot_id: TGI.Util.id('RDS'), location_id: input.location_id || 'DEFAULT', stay_date: TGI.Util.normalizeDate(input.stay_date),
      rooms_available: available, rooms_sold: sold, occupancy_pct: Math.round(occupancy * 10000) / 100,
      room_revenue: revenue, adr: Math.round(adr * 100) / 100, revpar: Math.round(revpar * 100) / 100,
      pickup_1d: pickup1, pickup_7d: pickup7, pickup_14d: pickup14, demand_score: score,
      source: input.source || 'MANUAL', captured_at: new Date()
    };
    ensureSheet_().appendRow(HEADERS.map(function (header) { return record[header]; }));
    TGI.AuditLog.write(SHEET, record.snapshot_id, 'CAPTURE', { location_id: record.location_id, stay_date: record.stay_date });
    return record;
  }

  function latestByDate(locationId) {
    var map = {};
    all().filter(function (r) { return !locationId || String(r.location_id) === String(locationId); }).forEach(function (r) {
      var key = String(r.location_id) + '|' + String(r.stay_date);
      if (!map[key] || new Date(r.captured_at) > new Date(map[key].captured_at)) map[key] = r;
    });
    return Object.keys(map).map(function (key) { return map[key]; });
  }

  return { ensureSheet: ensureSheet_, all: all, capture: capture, latestByDate: latestByDate };
})();