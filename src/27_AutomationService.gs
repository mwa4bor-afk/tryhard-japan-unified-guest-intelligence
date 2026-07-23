TGI.AutomationService = (function () {
  var HANDLERS = ['runTryHardDailyAutomation', 'runTryHardHourlyAutomation'];

  function install() {
    removeManaged_();
    ScriptApp.newTrigger('runTryHardDailyAutomation').timeBased().everyDays(1).atHour(5).create();
    ScriptApp.newTrigger('runTryHardHourlyAutomation').timeBased().everyHours(1).create();
    var result = list();
    TGI.AuditLog.write('Automation', 'MANAGED', 'INSTALL', result);
    return result;
  }

  function list() {
    return ScriptApp.getProjectTriggers().filter(function (trigger) {
      return HANDLERS.indexOf(trigger.getHandlerFunction()) >= 0;
    }).map(function (trigger) {
      return {
        handler: trigger.getHandlerFunction(),
        event_type: String(trigger.getEventType()),
        trigger_source: String(trigger.getTriggerSource()),
        unique_id: trigger.getUniqueId()
      };
    });
  }

  function runDaily() {
    var insights = TGI.GuestIntelligenceService.generateAll();
    var dashboard = TGI.DashboardService.rebuild();
    var integrity = TGI.DataIntegrityService.validate();
    var result = {
      generated_at: TGI.Util.nowIso(),
      insights_generated: insights.length,
      dashboard: dashboard,
      integrity_valid: integrity.valid
    };
    TGI.AuditLog.write('Automation', 'DAILY', 'RUN', result);
    return result;
  }

  function runHourly() {
    var overdue = TGI.TaskService.overdue();
    var escalated = [];
    overdue.forEach(function (task) {
      if (task.priority === 'HIGH' || task.priority === 'CRITICAL') return;
      task.priority = 'HIGH';
      task.updated_at = TGI.Util.nowIso();
      TGI.SheetRepository.upsert('Tasks', task);
      escalated.push(task.task_id);
    });
    var result = { checked_at: TGI.Util.nowIso(), overdue_count: overdue.length, escalated_task_ids: escalated };
    TGI.AuditLog.write('Automation', 'HOURLY', 'RUN', result);
    return result;
  }

  function removeManaged_() {
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (HANDLERS.indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
    });
  }

  return {
    install: install,
    list: list,
    runDaily: runDaily,
    runHourly: runHourly
  };
})();

function runTryHardDailyAutomation() {
  return TGI.AutomationService.runDaily();
}

function runTryHardHourlyAutomation() {
  return TGI.AutomationService.runHourly();
}