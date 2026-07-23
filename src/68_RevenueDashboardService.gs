TGI.RevenueDashboardService = (function () {
  var SHEET = 'Revenue_Dashboard';

  function rebuild() {
    TGI.AccessControlService.requirePermission('revenue.view');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    sheet.clear();
    var demand = TGI.RevenueDemandService.latestByDate();
    var recommendations = TGI.RateRecommendationService.all();
    var pendingByKey = {};
    recommendations.filter(function (r) { return r.status === 'PENDING'; }).forEach(function (r) {
      pendingByKey[String(r.location_id) + '|' + String(r.stay_date)] = (pendingByKey[String(r.location_id) + '|' + String(r.stay_date)] || 0) + 1;
    });
    var headers = ['location_id','stay_date','rooms_available','rooms_sold','occupancy_pct','adr','revpar','pickup_1d','pickup_7d','demand_score','pending_recommendations','captured_at'];
    var rows = demand.sort(function (a, b) { return new Date(a.stay_date) - new Date(b.stay_date); }).map(function (r) {
      var key = String(r.location_id) + '|' + String(r.stay_date);
      return [r.location_id,r.stay_date,r.rooms_available,r.rooms_sold,r.occupancy_pct,r.adr,r.revpar,r.pickup_1d,r.pickup_7d,r.demand_score,pendingByKey[key] || 0,r.captured_at];
    });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.setFrozenRows(1); sheet.autoResizeColumns(1, headers.length);
    TGI.AuditLog.write(SHEET, 'DASHBOARD', 'REBUILD', { rows: rows.length });
    return summary();
  }

  function summary() {
    var demand = TGI.RevenueDemandService.latestByDate();
    var recommendations = TGI.RateRecommendationService.all();
    var sold = 0, available = 0, revenue = 0;
    demand.forEach(function (r) { sold += Number(r.rooms_sold || 0); available += Number(r.rooms_available || 0); revenue += Number(r.room_revenue || 0); });
    return {
      dates: demand.length,
      portfolio_occupancy_pct: available ? Math.round((sold / available) * 10000) / 100 : 0,
      portfolio_adr: sold ? Math.round((revenue / sold) * 100) / 100 : 0,
      portfolio_revpar: available ? Math.round((revenue / available) * 100) / 100 : 0,
      pending_recommendations: recommendations.filter(function (r) { return r.status === 'PENDING'; }).length,
      approved_recommendations: recommendations.filter(function (r) { return r.status === 'APPROVED'; }).length
    };
  }

  return { rebuild: rebuild, summary: summary };
})();