TGI.CaseSlaService = (function () {
  function isOpen_(record) {
    return ['OPEN','IN_PROGRESS','WAITING_GUEST'].indexOf(String(record.status)) !== -1;
  }

  function evaluate(record, now) {
    now = now || new Date();
    var due = record.due_at ? new Date(record.due_at) : null;
    var firstResponseDue = new Date(new Date(record.opened_at).getTime() + ({ LOW:24, NORMAL:8, HIGH:2, URGENT:1, CRITICAL:0.25 }[record.priority] || 8) * 3600000);
    return {
      case_id: record.case_id,
      overdue: isOpen_(record) && due && due.getTime() < now.getTime(),
      first_response_breached: isOpen_(record) && !record.first_response_at && firstResponseDue.getTime() < now.getTime(),
      hours_to_due: due ? (due.getTime() - now.getTime()) / 3600000 : null,
      first_response_due_at: firstResponseDue
    };
  }

  function scan() {
    TGI.AccessControlService.requirePermission('cases.view');
    var now = new Date();
    return TGI.GuestCaseService.openCases().map(function (record) {
      var status = evaluate(record, now);
      status.case = record;
      return status;
    });
  }

  function escalateBreaches() {
    TGI.AccessControlService.requirePermission('cases.escalate');
    var escalated = [];
    scan().forEach(function (item) {
      if (!item.overdue && !item.first_response_breached) return;
      var record = item.case;
      var last = record.last_escalated_at ? new Date(record.last_escalated_at).getTime() : 0;
      if (last && new Date().getTime() - last < 3600000) return;
      var updated = TGI.GuestCaseService.save({
        case_id: record.case_id,
        escalation_level: Number(record.escalation_level || 0) + 1,
        last_escalated_at: new Date(),
        priority: item.overdue && record.priority === 'NORMAL' ? 'HIGH' : record.priority
      });
      if (record.manager_email) {
        TGI.IntegrationRegistryService.active().forEach(function (integration) {
          if (String(integration.type).toUpperCase() === 'CASE_ALERTS') {
            TGI.IntegrationQueueService.enqueue(integration.integration_id, 'case.sla_breach', {
              case_id: updated.case_id,
              guest_id: updated.guest_id,
              subject: updated.subject,
              priority: updated.priority,
              owner_email: updated.owner_email,
              manager_email: updated.manager_email,
              overdue: item.overdue,
              first_response_breached: item.first_response_breached,
              due_at: updated.due_at
            }, { entity_type: 'GuestCase', entity_id: updated.case_id });
          }
        });
      }
      escalated.push(updated);
    });
    TGI.AuditLog.write('Guest_Cases', 'SLA_SCAN', 'ESCALATE', { escalated: escalated.length });
    return escalated;
  }

  function installTrigger() {
    TGI.AccessControlService.requirePermission('cases.escalate');
    ScriptApp.getProjectTriggers().filter(function (trigger) { return trigger.getHandlerFunction() === 'processTryHardCaseEscalations'; }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
    return ScriptApp.newTrigger('processTryHardCaseEscalations').timeBased().everyHours(1).create();
  }

  return { evaluate: evaluate, scan: scan, escalateBreaches: escalateBreaches, installTrigger: installTrigger };
})();