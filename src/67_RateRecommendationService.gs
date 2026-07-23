TGI.RateRecommendationService = (function () {
  var SHEET = 'Rate_Recommendations';
  var HEADERS = ['recommendation_id','location_id','stay_date','room_type','current_rate','recommended_rate','change_pct','demand_score','occupancy_pct','reason','status','approved_by','approved_at','created_at'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function multiplier_(demand, occupancy) {
    if (occupancy >= 90 || demand >= 85) return 1.25;
    if (occupancy >= 80 || demand >= 70) return 1.15;
    if (occupancy >= 65 || demand >= 55) return 1.08;
    if (occupancy < 35 && demand < 35) return 0.90;
    if (occupancy < 50 && demand < 45) return 0.95;
    return 1.00;
  }

  function generate(input) {
    TGI.AccessControlService.requirePermission('revenue.manage');
    input = input || {};
    var currentRate = Math.max(0, Number(input.current_rate || 0));
    var occupancy = Number(input.occupancy_pct || 0);
    var demand = Number(input.demand_score || 0);
    var factor = multiplier_(demand, occupancy);
    var floorRate = Math.max(0, Number(input.floor_rate || 0));
    var ceilingRate = Number(input.ceiling_rate || 0) || Number.MAX_VALUE;
    var recommended = Math.max(floorRate, Math.min(ceilingRate, Math.round(currentRate * factor)));
    var record = {
      recommendation_id: TGI.Util.id('RATE'), location_id: input.location_id || 'DEFAULT',
      stay_date: TGI.Util.normalizeDate(input.stay_date), room_type: input.room_type || 'STANDARD',
      current_rate: currentRate, recommended_rate: recommended,
      change_pct: currentRate ? Math.round(((recommended - currentRate) / currentRate) * 10000) / 100 : 0,
      demand_score: demand, occupancy_pct: occupancy,
      reason: input.reason || ('Demand ' + demand + ', occupancy ' + occupancy + '%'),
      status: 'PENDING', approved_by: '', approved_at: '', created_at: new Date()
    };
    ensureSheet_().appendRow(HEADERS.map(function (header) { return record[header]; }));
    return record;
  }

  function all() {
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(function (row, index) {
      var r = { _row: index + 2 }; HEADERS.forEach(function (h, i) { r[h] = row[i]; }); return r;
    });
  }

  function approve(recommendationId) {
    TGI.AccessControlService.requirePermission('revenue.approve');
    var record = all().filter(function (r) { return String(r.recommendation_id) === String(recommendationId); })[0];
    TGI.Util.assert(record, 'Recommendation not found: ' + recommendationId);
    record.status = 'APPROVED'; record.approved_by = TGI.AccessControlService.currentEmail(); record.approved_at = new Date();
    ensureSheet_().getRange(record._row, 1, 1, HEADERS.length).setValues([HEADERS.map(function (h) { return record[h] === undefined ? '' : record[h]; })]);
    TGI.AuditLog.write(SHEET, recommendationId, 'APPROVE', { recommended_rate: record.recommended_rate });
    return record;
  }

  return { ensureSheet: ensureSheet_, generate: generate, all: all, approve: approve };
})();