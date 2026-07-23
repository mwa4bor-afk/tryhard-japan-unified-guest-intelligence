TGI.RecommendationEngineService = (function () {
  var SHEET = 'Guest_Recommendations';
  var HEADERS = ['recommendation_id','guest_id','policy_id','policy_version','recommendation_type','title','recommended_action','confidence','reason_json','input_snapshot_json','status','requires_approval','approved_by','approved_at','executed_at','expires_at','created_at','updated_at'];

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

  function parse_(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; } catch (error) { return fallback; }
  }

  function value_(object, key) {
    return String(key || '').split('.').reduce(function (current, part) {
      return current !== null && current !== undefined ? current[part] : undefined;
    }, object);
  }

  function evaluate_(conditions, context) {
    var reasons = [];
    var keys = Object.keys(conditions || {});
    var matched = keys.filter(function (key) {
      var expected = conditions[key];
      var operator = 'eq';
      var field = key;
      if (/_gte$/.test(key)) { operator = 'gte'; field = key.replace(/_gte$/, ''); }
      else if (/_lte$/.test(key)) { operator = 'lte'; field = key.replace(/_lte$/, ''); }
      else if (/_contains$/.test(key)) { operator = 'contains'; field = key.replace(/_contains$/, ''); }
      var actual = value_(context, field);
      var ok = operator === 'gte' ? Number(actual || 0) >= Number(expected) :
        operator === 'lte' ? Number(actual || 0) <= Number(expected) :
        operator === 'contains' ? String(actual || '').indexOf(String(expected)) !== -1 :
        Array.isArray(expected) ? expected.map(String).indexOf(String(actual)) !== -1 : String(actual) === String(expected);
      reasons.push({ field: field, operator: operator, expected: expected, actual: actual, matched: ok });
      return ok;
    });
    return { matched: keys.length === matched.length, confidence: keys.length ? matched.length / keys.length : 0.5, reasons: reasons };
  }

  function existing_(guestId, policyId) {
    return all().filter(function (row) {
      return row.guest_id === guestId && row.policy_id === policyId && ['PENDING','APPROVED','EXECUTED'].indexOf(String(row.status).toUpperCase()) !== -1;
    })[0] || null;
  }

  function generate(guestId, context) {
    TGI.AccessControlService.requirePermission('recommendations.generate');
    TGI.Util.assert(guestId, 'Guest ID is required.');
    context = context || {};
    context.guest_id = guestId;
    var now = new Date();
    var created = [];
    TGI.RecommendationPolicyService.active().forEach(function (policy) {
      if (existing_(guestId, policy.policy_id)) return;
      var result = evaluate_(parse_(policy.conditions_json, {}), context);
      var minimum = Number(policy.minimum_confidence || 0.5);
      if (!result.matched || result.confidence < minimum) return;
      var recommendation = parse_(policy.recommendation_json, {});
      var record = {
        recommendation_id: TGI.Util.id('REC'), guest_id: guestId, policy_id: policy.policy_id,
        policy_version: policy.version, recommendation_type: policy.recommendation_type,
        title: recommendation.title || policy.name, recommended_action: recommendation.action || 'AUDIT',
        confidence: result.confidence, reason_json: JSON.stringify(result.reasons),
        input_snapshot_json: JSON.stringify(context), status: policy.requires_approval === false ? 'APPROVED' : 'PENDING',
        requires_approval: policy.requires_approval, approved_by: '', approved_at: '', executed_at: '',
        expires_at: new Date(now.getTime() + 30 * 86400000), created_at: now, updated_at: now
      };
      ensureSheet_().appendRow(HEADERS.map(function (header) { return record[header]; }));
      created.push(record);
    });
    TGI.AuditLog.write(SHEET, guestId, 'GENERATE', { generated: created.length });
    return created;
  }

  function updateStatus_(recommendationId, status, fields) {
    var sheet = ensureSheet_();
    var rows = all();
    var index = -1;
    var record = null;
    rows.some(function (row, i) { if (row.recommendation_id === recommendationId) { index = i; record = row; return true; } return false; });
    TGI.Util.assert(record, 'Recommendation not found: ' + recommendationId);
    Object.keys(fields || {}).forEach(function (key) { record[key] = fields[key]; });
    record.status = status;
    record.updated_at = new Date();
    sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([HEADERS.map(function (header) { return record[header]; })]);
    TGI.AuditLog.write(SHEET, recommendationId, status, fields || {});
    return record;
  }

  function approve(recommendationId) {
    TGI.AccessControlService.requirePermission('recommendations.approve');
    return updateStatus_(recommendationId, 'APPROVED', { approved_by: TGI.AccessControlService.currentEmail(), approved_at: new Date() });
  }

  function reject(recommendationId, reason) {
    TGI.AccessControlService.requirePermission('recommendations.approve');
    return updateStatus_(recommendationId, 'REJECTED', { reason_json: JSON.stringify({ rejection_reason: reason || '' }) });
  }

  function recordExecution(recommendationId, outcome) {
    TGI.AccessControlService.requirePermission('recommendations.execute');
    var record = updateStatus_(recommendationId, 'EXECUTED', { executed_at: new Date() });
    if (TGI.RecommendationOutcomeService) TGI.RecommendationOutcomeService.record(recommendationId, record.guest_id, outcome || {});
    if (TGI.DomainEventService) TGI.DomainEventService.publish('recommendation.executed', { recommendation_id: recommendationId, guest_id: record.guest_id, outcome: outcome || {} }, {});
    return record;
  }

  return { ensureSheet: ensureSheet_, all: all, generate: generate, approve: approve, reject: reject, recordExecution: recordExecution };
})();