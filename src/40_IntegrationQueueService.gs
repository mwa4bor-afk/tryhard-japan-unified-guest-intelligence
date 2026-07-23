TGI.IntegrationQueueService = (function () {
  var SHEET = 'Integration_Queue';
  var HEADERS = ['job_id','integration_id','event_type','entity_type','entity_id','payload_json','status','attempts','max_attempts','next_attempt_at','last_attempt_at','last_error','created_at','completed_at'];

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

  function enqueue(integrationId, eventType, payload, metadata) {
    TGI.AccessControlService.requirePermission('integrations.enqueue');
    TGI.Util.assert(TGI.IntegrationRegistryService.find(integrationId), 'Integration not found: ' + integrationId);
    metadata = metadata || {};
    var record = {
      job_id: TGI.Util.id('JOB'), integration_id: integrationId, event_type: eventType,
      entity_type: metadata.entity_type || '', entity_id: metadata.entity_id || '',
      payload_json: JSON.stringify(payload || {}), status: 'PENDING', attempts: 0,
      max_attempts: Number(metadata.max_attempts || 5), next_attempt_at: new Date(),
      last_attempt_at: '', last_error: '', created_at: new Date(), completed_at: ''
    };
    ensureSheet_().appendRow(HEADERS.map(function (header) { return record[header]; }));
    TGI.AuditLog.write(SHEET, record.job_id, 'ENQUEUE', { integration_id: integrationId, event_type: eventType });
    return record;
  }

  function due(limit) {
    var now = new Date().getTime();
    return all().filter(function (job) {
      var next = job.next_attempt_at ? new Date(job.next_attempt_at).getTime() : 0;
      return (job.status === 'PENDING' || job.status === 'RETRY') && next <= now;
    }).slice(0, Number(limit || 25));
  }

  function update(job) {
    var values = HEADERS.map(function (header) { return job[header] === undefined ? '' : job[header]; });
    ensureSheet_().getRange(job._row, 1, 1, HEADERS.length).setValues([values]);
    return job;
  }

  function markSuccess(job) {
    job.status = 'COMPLETED';
    job.completed_at = new Date();
    job.last_error = '';
    return update(job);
  }

  function markFailure(job, errorMessage) {
    job.attempts = Number(job.attempts || 0) + 1;
    job.last_attempt_at = new Date();
    job.last_error = String(errorMessage || '').slice(0, 1000);
    if (job.attempts >= Number(job.max_attempts || 5)) {
      job.status = 'FAILED';
    } else {
      job.status = 'RETRY';
      var delayMinutes = Math.min(720, Math.pow(2, job.attempts) * 5);
      job.next_attempt_at = new Date(new Date().getTime() + delayMinutes * 60000);
    }
    return update(job);
  }

  function summary() {
    var result = { PENDING: 0, RETRY: 0, COMPLETED: 0, FAILED: 0 };
    all().forEach(function (job) { result[job.status] = (result[job.status] || 0) + 1; });
    return result;
  }

  return { ensureSheet: ensureSheet_, all: all, enqueue: enqueue, due: due, markSuccess: markSuccess, markFailure: markFailure, summary: summary };
})();