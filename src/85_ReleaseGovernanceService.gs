TGI.ReleaseGovernanceService = (function () {
  var SHEET = 'Platform_Releases';
  var HEADERS = ['release_id','version','environment','status','commit_sha','notes','rollback_version','readiness_json','created_by','created_at','approved_by','approved_at','deployed_at'];

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

  function find(releaseId) {
    return all().filter(function (record) { return record.release_id === releaseId; })[0] || null;
  }

  function save_(record) {
    var rows = all();
    var index = -1;
    rows.some(function (row, i) { if (row.release_id === record.release_id) { index = i; return true; } return false; });
    var values = HEADERS.map(function (header) { return record[header]; });
    var sheet = ensureSheet_();
    if (index >= 0) sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([values]);
    else sheet.appendRow(values);
    return record;
  }

  function readiness() {
    var checks = [];
    function add(name, ok, detail) { checks.push({ name: name, ok: Boolean(ok), detail: detail || '' }); }
    var pending = TGI.SchemaMigrationService.pending();
    add('schema_migrations', pending.length === 0, pending.length ? pending.length + ' migration(s) pending' : 'Current');
    var environment = TGI.EnvironmentConfigService.currentEnvironment();
    add('environment_selected', TGI.EnvironmentConfigService.ENVIRONMENTS.indexOf(environment) !== -1, environment);
    var health = TGI.PlatformHealthService && TGI.PlatformHealthService.latest ? TGI.PlatformHealthService.latest() : [];
    var failed = (health || []).filter(function (item) { return item.status === 'FAILED' || item.status === 'CRITICAL'; });
    add('platform_health', failed.length === 0, failed.length ? failed.length + ' failing check(s)' : 'Healthy or not yet evaluated');
    var openIncidents = TGI.IncidentManagementService && TGI.IncidentManagementService.open ? TGI.IncidentManagementService.open() : [];
    var critical = (openIncidents || []).filter(function (item) { return item.severity === 'CRITICAL'; });
    add('critical_incidents', critical.length === 0, critical.length ? critical.length + ' critical incident(s)' : 'None');
    return { ready: checks.every(function (check) { return check.ok; }), environment: environment, checks: checks, evaluated_at: new Date() };
  }

  function create(input) {
    TGI.AccessControlService.requirePermission('release.manage');
    input = input || {};
    TGI.Util.assert(input.version, 'Release version is required.');
    var record = {
      release_id: TGI.Util.id('REL'), version: input.version,
      environment: String(input.environment || TGI.EnvironmentConfigService.currentEnvironment()).toUpperCase(),
      status: 'DRAFT', commit_sha: input.commit_sha || '', notes: input.notes || '',
      rollback_version: input.rollback_version || '', readiness_json: '',
      created_by: TGI.AccessControlService.currentEmail(), created_at: new Date(),
      approved_by: '', approved_at: '', deployed_at: ''
    };
    return save_(record);
  }

  function approve(releaseId) {
    TGI.AccessControlService.requirePermission('release.approve');
    var record = find(releaseId);
    TGI.Util.assert(record, 'Release not found.');
    var report = readiness();
    TGI.Util.assert(report.ready, 'Release readiness checks failed.');
    record.status = 'APPROVED';
    record.readiness_json = JSON.stringify(report);
    record.approved_by = TGI.AccessControlService.currentEmail();
    record.approved_at = new Date();
    return save_(record);
  }

  function markDeployed(releaseId) {
    TGI.AccessControlService.requirePermission('release.deploy');
    var record = find(releaseId);
    TGI.Util.assert(record && record.status === 'APPROVED', 'Only approved releases can be deployed.');
    record.status = 'DEPLOYED';
    record.deployed_at = new Date();
    save_(record);
    PropertiesService.getDocumentProperties().setProperty('TGI_PLATFORM_VERSION', String(record.version));
    if (TGI.DomainEventService) TGI.DomainEventService.publish('platform.release.deployed', record, { source: 'ReleaseGovernanceService' });
    return record;
  }

  function currentVersion() {
    return PropertiesService.getDocumentProperties().getProperty('TGI_PLATFORM_VERSION') || 'UNVERSIONED';
  }

  return { ensureSheet: ensureSheet_, all: all, find: find, readiness: readiness, create: create, approve: approve, markDeployed: markDeployed, currentVersion: currentVersion };
})();