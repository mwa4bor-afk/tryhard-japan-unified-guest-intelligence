TGI.IntegrationRegistryService = (function () {
  var SHEET = 'Integrations';
  var HEADERS = ['integration_id','name','type','endpoint','auth_property_key','status','last_success_at','last_failure_at','last_error','created_at','updated_at'];

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

  function save(input) {
    TGI.AccessControlService.requirePermission('integrations.manage');
    input = input || {};
    TGI.Util.assert(input.name, 'Integration name is required.');
    TGI.Util.assert(input.type, 'Integration type is required.');
    TGI.Util.assert(input.endpoint, 'Integration endpoint is required.');
    var now = new Date();
    var record = {
      integration_id: input.integration_id || TGI.Util.id('INT'),
      name: input.name,
      type: String(input.type).toUpperCase(),
      endpoint: input.endpoint,
      auth_property_key: input.auth_property_key || '',
      status: input.status || 'ACTIVE',
      last_success_at: input.last_success_at || '',
      last_failure_at: input.last_failure_at || '',
      last_error: input.last_error || '',
      created_at: input.created_at || now,
      updated_at: now
    };
    var sheet = ensureSheet_();
    var rows = all();
    var index = -1;
    rows.some(function (row, i) {
      if (row.integration_id === record.integration_id) { index = i; return true; }
      return false;
    });
    var values = HEADERS.map(function (header) { return record[header]; });
    if (index >= 0) sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([values]);
    else sheet.appendRow(values);
    TGI.AuditLog.write(SHEET, record.integration_id, index >= 0 ? 'UPDATE' : 'CREATE', { name: record.name, type: record.type, status: record.status });
    return record;
  }

  function find(integrationId) {
    return all().filter(function (record) { return record.integration_id === integrationId; })[0] || null;
  }

  function active() {
    return all().filter(function (record) { return record.status === 'ACTIVE'; });
  }

  function secret(integration) {
    if (!integration || !integration.auth_property_key) return '';
    return PropertiesService.getScriptProperties().getProperty(integration.auth_property_key) || '';
  }

  function setSecret(propertyKey, value) {
    TGI.AccessControlService.requirePermission('integrations.manage');
    TGI.Util.assert(propertyKey, 'Secret property key is required.');
    PropertiesService.getScriptProperties().setProperty(propertyKey, String(value || ''));
    TGI.AuditLog.write(SHEET, propertyKey, 'SECRET_SET', { property_key: propertyKey });
    return true;
  }

  function recordDelivery(integrationId, success, errorMessage) {
    var integration = find(integrationId);
    if (!integration) return null;
    if (success) {
      integration.last_success_at = new Date();
      integration.last_error = '';
    } else {
      integration.last_failure_at = new Date();
      integration.last_error = String(errorMessage || '').slice(0, 500);
    }
    return save(integration);
  }

  return { ensureSheet: ensureSheet_, all: all, active: active, find: find, save: save, secret: secret, setSecret: setSecret, recordDelivery: recordDelivery };
})();