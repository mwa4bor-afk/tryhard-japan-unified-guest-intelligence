function initializeTryHardWorkflows() {
  TGI.DomainEventService.ensureSheet();
  TGI.WorkflowRuleService.ensureSheet();
  TGI.WorkflowEngineService.ensureLog();
  return TGI.WorkflowDashboardService.rebuild();
}

function publishTryHardDomainEvent(eventType, payload, metadata) {
  return TGI.DomainEventService.publish(eventType, payload, metadata);
}

function saveTryHardWorkflowRule(input) {
  return TGI.WorkflowRuleService.save(input);
}

function processTryHardWorkflowsNow() {
  return TGI.WorkflowEngineService.processPending(25);
}

function rebuildTryHardWorkflowDashboard() {
  return TGI.WorkflowDashboardService.rebuild();
}

function installTryHardWorkflowProcessor() {
  TGI.AccessControlService.requirePermission('workflows.manage');
  ScriptApp.getProjectTriggers().forEach(function(trigger){
    if(trigger.getHandlerFunction()==='processTryHardWorkflowsNow') ScriptApp.deleteTrigger(trigger);
  });
  var trigger=ScriptApp.newTrigger('processTryHardWorkflowsNow').timeBased().everyMinutes(15).create();
  TGI.AuditLog.write('Workflow_Processor','TRIGGER','INSTALL',{handler:'processTryHardWorkflowsNow',frequency_minutes:15});
  return trigger;
}
