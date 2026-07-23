TGI.EnvironmentConfigService = (function () {
  var SHEET = 'Environment_Config';
  var HEADERS = ['key','environment','value','is_secret','description','updated_by','updated_at'];
  var ENVIRONMENTS = ['DEVELOPMENT','STAGING','PRODUCTION'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function currentEnvironment() {
    return String(PropertiesService.getDocumentProperties().getProperty('TGI_ENVIRONMENT') || 'DEVELOPMENT').toUpperCase();
  }

  function setEnvironment(environment) {
    TGI.AccessControlService.requirePermission('release.manage');
    environment = String(environment || '').toUpperCase();
    TGI.Util.assert(ENVIRONMENTS.indexOf(environment) !== -1, 'Invalid environment.');
    PropertiesService.getDocumentProperties().setProperty('TGI_ENVIRONMENT', environment);
    TGI.AuditLog.write('ENVIRONMENT_SET', 'EnvironmentConfig', environment, {});
    return environment;
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
    TGI.AccessControlService.requirePermission('release.manage');
    input = input || {};
    var environment = String(input.environment || currentEnvironment()).toUpperCase();
    TGI.Util.assert(input.key, 'Configuration key is required.');
    TGI.Util.assert(ENVIRONMENTS.indexOf(environment) !== -1, 'Invalid environment.');
    var records = all();
    var index = -1;
    records.some(function (record, i) {
      if (record.key === input.key && record.environment === environment) { index = i; return true; }
      return false;
    });
    var value = input.is_secret ? '' : String(input.value == null ? '' : input.value);
    if (input.is_secret) PropertiesService.getScriptProperties().setProperty('TGI_CFG_' + environment + '_' + input.key, String(input.value || ''));
    var record = {
      key: input.key,
      environment: environment,
      value: value,
      is_secret: Boolean(input.is_secret),
      description: input.description || '',
      updated_by: TGI.AccessControlService.currentEmail(),
      updated_at: new Date()
    };
    var values = HEADERS.map(function (header) { return record[header]; });
    var sheet = ensureSheet_();
    if (index >= 0) sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([values]);
    else sheet.appendRow(values);
    return record;
  }

  function get(key, environment) {
    environment = String(environment || currentEnvironment()).toUpperCase();
    var record = all().filter(function (item) { return item.key === key && item.environment === environment; })[0];
    if (!record) return null;
    if (record.is_secret === true || String(record.is_secret).toLowerCase() === 'true') {
      return PropertiesService.getScriptProperties().getProperty('TGI_CFG_' + environment + '_' + key) || '';
    }
    return record.value;
  }

  return { ENVIRONMENTS: ENVIRONMENTS, ensureSheet: ensureSheet_, currentEnvironment: currentEnvironment, setEnvironment: setEnvironment, all: all, save: save, get: get };
})();