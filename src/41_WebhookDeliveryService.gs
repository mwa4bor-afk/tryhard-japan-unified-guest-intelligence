TGI.WebhookDeliveryService = (function () {
  function headers_(integration) {
    var headers = { 'Content-Type': 'application/json', 'X-TGI-Integration-Id': integration.integration_id };
    var secret = TGI.IntegrationRegistryService.secret(integration);
    if (secret) headers.Authorization = 'Bearer ' + secret;
    return headers;
  }

  function deliver(job) {
    var integration = TGI.IntegrationRegistryService.find(job.integration_id);
    TGI.Util.assert(integration, 'Integration not found: ' + job.integration_id);
    TGI.Util.assert(integration.status === 'ACTIVE', 'Integration is not active: ' + job.integration_id);
    TGI.Util.assert(integration.type === 'WEBHOOK' || integration.type === 'HTTP', 'Unsupported integration type: ' + integration.type);
    var envelope = {
      event_id: job.job_id,
      event_type: job.event_type,
      occurred_at: job.created_at,
      entity: { type: job.entity_type || '', id: job.entity_id || '' },
      payload: JSON.parse(job.payload_json || '{}')
    };
    var response = UrlFetchApp.fetch(integration.endpoint, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(envelope),
      headers: headers_(integration), muteHttpExceptions: true, followRedirects: false
    });
    var code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error('HTTP ' + code + ': ' + String(response.getContentText() || '').slice(0, 300));
    }
    return { status_code: code, response_excerpt: String(response.getContentText() || '').slice(0, 300) };
  }

  function process(limit) {
    TGI.AccessControlService.requirePermission('integrations.process');
    var jobs = TGI.IntegrationQueueService.due(limit || 25);
    var result = { processed: 0, succeeded: 0, failed: 0, errors: [] };
    jobs.forEach(function (job) {
      result.processed += 1;
      try {
        deliver(job);
        TGI.IntegrationQueueService.markSuccess(job);
        TGI.IntegrationRegistryService.recordDelivery(job.integration_id, true, '');
        result.succeeded += 1;
      } catch (error) {
        TGI.IntegrationQueueService.markFailure(job, error.message);
        TGI.IntegrationRegistryService.recordDelivery(job.integration_id, false, error.message);
        result.failed += 1;
        result.errors.push(job.job_id + ': ' + error.message);
      }
    });
    TGI.AuditLog.write('Integration_Queue', 'PROCESSOR', 'PROCESS', result);
    return result;
  }

  function installTrigger() {
    TGI.AccessControlService.requirePermission('integrations.manage');
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() === 'processTryHardIntegrationQueue') ScriptApp.deleteTrigger(trigger);
    });
    ScriptApp.newTrigger('processTryHardIntegrationQueue').timeBased().everyMinutes(15).create();
    return true;
  }

  return { deliver: deliver, process: process, installTrigger: installTrigger };
})();

function processTryHardIntegrationQueue() {
  return TGI.WebhookDeliveryService.process(25);
}