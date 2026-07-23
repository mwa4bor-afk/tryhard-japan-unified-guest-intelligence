TGI.ServiceRecoveryService = (function () {
  function addDays_(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function open(input) {
    input = input || {};
    TGI.Util.assert(input.guest_id, 'guest_id is required.');
    var now = TGI.Util.nowIso();
    var priority = String(input.priority || input.severity || 'MEDIUM').toUpperCase();
    var task = {
      task_id: TGI.Util.uuid(),
      guest_id: input.guest_id,
      title: input.title || ('Service recovery: ' + (input.location || 'Unknown location')),
      description: input.description || [input.incident_summary, input.immediate_action].filter(Boolean).join('\n\n'),
      priority: priority,
      status: String(input.status || 'OPEN').replace(/\s+/g, '_').toUpperCase(),
      owner_email: input.owner_email || '',
      due_at: input.due_at || input.follow_up_due || addDays_(new Date(), priority === 'HIGH' || priority === 'CRITICAL' ? 1 : 2),
      completed_at: '',
      created_at: now,
      updated_at: now
    };
    TGI.SheetRepository.append('Tasks', task);

    if (input.incident_summary || input.immediate_action) {
      TGI.SheetRepository.append('ContactLog', {
        contact_id: TGI.Util.uuid(),
        guest_id: input.guest_id,
        channel: input.channel || 'IN_PERSON',
        direction: input.direction || 'INBOUND',
        subject: input.subject || 'Service recovery incident',
        summary: input.incident_summary || input.description || '',
        outcome: input.immediate_action || '',
        owner_email: input.owner_email || '',
        contacted_at: input.incident_date || input.occurred_at || now,
        created_at: now
      });
    }
    return task;
  }

  return { open: open };
})();
