TGI.SchemaMigrationService = (function () {
  var SHEET = 'Schema_Migrations';
  var HEADERS = ['migration_id','version','name','checksum','status','started_at','completed_at','executed_by','error_message'];
  var REGISTRY = [];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function register(migration) {
    TGI.Util.assert(migration && migration.version && migration.name && typeof migration.up === 'function', 'Invalid migration.');
    REGISTRY.push(migration);
    REGISTRY.sort(function (a, b) { return String(a.version).localeCompare(String(b.version)); });
    return migration;
  }

  function history() {
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(function (row) {
      var record = {};
      HEADERS.forEach(function (header, index) { record[header] = row[index]; });
      return record;
    });
  }

  function appliedVersions_() {
    var map = {};
    history().forEach(function (record) { if (record.status === 'APPLIED') map[record.version] = true; });
    return map;
  }

  function checksum_(migration) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, migration.version + '|' + migration.name + '|' + migration.up.toString());
    return bytes.map(function (b) { var v = (b + 256) % 256; return ('0' + v.toString(16)).slice(-2); }).join('');
  }

  function pending() {
    var applied = appliedVersions_();
    return REGISTRY.filter(function (migration) { return !applied[migration.version]; });
  }

  function runPending() {
    TGI.AccessControlService.requirePermission('release.migrate');
    var results = [];
    pending().forEach(function (migration) {
      var record = {
        migration_id: TGI.Util.id('MIG'), version: migration.version, name: migration.name,
        checksum: checksum_(migration), status: 'RUNNING', started_at: new Date(), completed_at: '',
        executed_by: TGI.AccessControlService.currentEmail(), error_message: ''
      };
      var sheet = ensureSheet_();
      sheet.appendRow(HEADERS.map(function (header) { return record[header]; }));
      var row = sheet.getLastRow();
      try {
        migration.up();
        record.status = 'APPLIED';
        record.completed_at = new Date();
        sheet.getRange(row, 1, 1, HEADERS.length).setValues([HEADERS.map(function (header) { return record[header]; })]);
        results.push(record);
      } catch (error) {
        record.status = 'FAILED';
        record.completed_at = new Date();
        record.error_message = String(error && error.message || error).slice(0, 1000);
        sheet.getRange(row, 1, 1, HEADERS.length).setValues([HEADERS.map(function (header) { return record[header]; })]);
        throw error;
      }
    });
    return results;
  }

  return { ensureSheet: ensureSheet_, register: register, history: history, pending: pending, runPending: runPending };
})();