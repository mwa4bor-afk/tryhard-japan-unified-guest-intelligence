TGI.RecommendationPolicyService = (function () {
  var SHEET = 'Recommendation_Policies';
  var HEADERS = ['policy_id','name','recommendation_type','priority','minimum_confidence','conditions_json','recommendation_json','requires_approval','status','version','created_at','updated_at'];

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
      var record = {};
      HEADERS.forEach(function (header, index) { record[header] = row[index]; });
      return record;
    });
  }

  function active() {
    return all().filter(function (record) { return String(record.status).toUpperCase() === 'ACTIVE'; })
      .sort(function (a, b) { return Number(b.priority || 0) - Number(a.priority || 0); });
  }

  function save(input) {
    TGI.AccessControlService.requirePermission('recommendations.manage');
    input = input || {};
    TGI.Util.assert(input.name, 'Policy name is required.');
    TGI.Util.assert(input.recommendation_type, 'Recommendation type is required.');
    var now = new Date();
    var record = {
      policy_id: input.policy_id || TGI.Util.id('RPL'),
      name: input.name,
      recommendation_type: String(input.recommendation_type).toUpperCase(),
      priority: Number(input.priority || 0),
      minimum_confidence: Number(input.minimum_confidence || 0.5),
      conditions_json: typeof input.conditions_json === 'string' ? input.conditions_json : JSON.stringify(input.conditions_json || {}),
      recommendation_json: typeof input.recommendation_json === 'string' ? input.recommendation_json : JSON.stringify(input.recommendation_json || {}),
      requires_approval: input.requires_approval === false ? false : true,
      status: String(input.status || 'ACTIVE').toUpperCase(),
      version: Number(input.version || 1),
      created_at: input.created_at || now,
      updated_at: now
    };
    var sheet = ensureSheet_();
    var rows = all();
    var index = -1;
    rows.some(function (row, i) { if (row.policy_id === record.policy_id) { index = i; return true; } return false; });
    var values = HEADERS.map(function (header) { return record[header]; });
    if (index >= 0) sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([values]);
    else sheet.appendRow(values);
    TGI.AuditLog.write(SHEET, record.policy_id, index >= 0 ? 'UPDATE' : 'CREATE', { name: record.name, type: record.recommendation_type, version: record.version });
    return record;
  }

  function seedDefaults() {
    if (all().length) return all();
    [
      { name: 'VIP pre-arrival recognition', recommendation_type: 'SERVICE', priority: 100, minimum_confidence: 0.75, conditions_json: { loyalty_tier: ['GOLD','PLATINUM'] }, recommendation_json: { title: 'Prepare VIP recognition', action: 'CREATE_TASK', due_offset_hours: 4 }, requires_approval: false },
      { name: 'Service recovery follow-up', recommendation_type: 'RECOVERY', priority: 90, minimum_confidence: 0.8, conditions_json: { open_case_count_gte: 1 }, recommendation_json: { title: 'Manager service-recovery follow-up', action: 'CREATE_CASE', priority: 'HIGH' }, requires_approval: true },
      { name: 'Loyal guest direct-booking offer', recommendation_type: 'MARKETING', priority: 70, minimum_confidence: 0.7, conditions_json: { stay_count_gte: 3, marketing_consent: true }, recommendation_json: { title: 'Direct-booking loyalty offer', action: 'ENQUEUE_INTEGRATION' }, requires_approval: true }
    ].forEach(save);
    return all();
  }

  return { ensureSheet: ensureSheet_, all: all, active: active, save: save, seedDefaults: seedDefaults };
})();