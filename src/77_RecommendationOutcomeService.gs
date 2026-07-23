TGI.RecommendationOutcomeService = (function () {
  var OUTCOME_SHEET = 'Recommendation_Outcomes';
  var DASHBOARD_SHEET = 'Recommendation_Dashboard';
  var HEADERS = ['outcome_id','recommendation_id','guest_id','outcome_type','outcome_value','revenue_value','notes','recorded_by','recorded_at'];

  function ensureOutcomeSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(OUTCOME_SHEET) || ss.insertSheet(OUTCOME_SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function all() {
    var sheet = ensureOutcomeSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(function (row) {
      var record = {};
      HEADERS.forEach(function (header, index) { record[header] = row[index]; });
      return record;
    });
  }

  function record(recommendationId, guestId, input) {
    TGI.AccessControlService.requirePermission('recommendations.execute');
    input = input || {};
    var record = {
      outcome_id: TGI.Util.id('ROU'), recommendation_id: recommendationId, guest_id: guestId,
      outcome_type: String(input.outcome_type || 'COMPLETED').toUpperCase(),
      outcome_value: input.outcome_value === undefined ? 1 : Number(input.outcome_value),
      revenue_value: Number(input.revenue_value || 0), notes: input.notes || '',
      recorded_by: TGI.AccessControlService.currentEmail(), recorded_at: new Date()
    };
    ensureOutcomeSheet_().appendRow(HEADERS.map(function (header) { return record[header]; }));
    TGI.AuditLog.write(OUTCOME_SHEET, record.outcome_id, 'CREATE', { recommendation_id: recommendationId, outcome_type: record.outcome_type });
    return record;
  }

  function rebuildDashboard() {
    TGI.AccessControlService.requirePermission('recommendations.view');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(DASHBOARD_SHEET) || ss.insertSheet(DASHBOARD_SHEET);
    sheet.clear();
    var recommendations = TGI.RecommendationEngineService.all();
    var outcomes = all();
    var statuses = {};
    var types = {};
    recommendations.forEach(function (record) {
      var status = String(record.status || 'UNKNOWN').toUpperCase();
      var type = String(record.recommendation_type || 'UNKNOWN').toUpperCase();
      statuses[status] = (statuses[status] || 0) + 1;
      types[type] = types[type] || { generated: 0, executed: 0, revenue: 0 };
      types[type].generated += 1;
      if (status === 'EXECUTED') types[type].executed += 1;
    });
    var recommendationById = {};
    recommendations.forEach(function (record) { recommendationById[record.recommendation_id] = record; });
    outcomes.forEach(function (outcome) {
      var recommendation = recommendationById[outcome.recommendation_id];
      var type = recommendation ? String(recommendation.recommendation_type || 'UNKNOWN').toUpperCase() : 'UNKNOWN';
      types[type] = types[type] || { generated: 0, executed: 0, revenue: 0 };
      types[type].revenue += Number(outcome.revenue_value || 0);
    });
    var total = recommendations.length;
    var executed = statuses.EXECUTED || 0;
    var approved = (statuses.APPROVED || 0) + executed;
    var rows = [
      ['Recommendation Dashboard', new Date()],
      ['Metric','Value'],
      ['Total recommendations', total],
      ['Pending approval', statuses.PENDING || 0],
      ['Approved or executed', approved],
      ['Executed', executed],
      ['Execution rate', total ? executed / total : 0],
      ['Attributed revenue', outcomes.reduce(function (sum, item) { return sum + Number(item.revenue_value || 0); }, 0)],
      [],
      ['Status','Count']
    ];
    Object.keys(statuses).sort().forEach(function (status) { rows.push([status, statuses[status]]); });
    rows.push([]);
    rows.push(['Type','Generated','Executed','Execution Rate','Attributed Revenue']);
    Object.keys(types).sort().forEach(function (type) {
      var item = types[type];
      rows.push([type, item.generated, item.executed, item.generated ? item.executed / item.generated : 0, item.revenue]);
    });
    sheet.getRange(1, 1, rows.length, 5).setValues(rows.map(function (row) {
      var copy = row.slice(); while (copy.length < 5) copy.push(''); return copy;
    }));
    sheet.setFrozenRows(2);
    sheet.autoResizeColumns(1, 5);
    return { total: total, pending: statuses.PENDING || 0, executed: executed, outcomes: outcomes.length };
  }

  return { ensureSheet: ensureOutcomeSheet_, all: all, record: record, rebuildDashboard: rebuildDashboard };
})();