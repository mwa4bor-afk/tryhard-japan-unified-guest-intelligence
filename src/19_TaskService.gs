TGI.TaskService = (function () {
  var VALID_STATUS = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
  var VALID_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  function create(input) {
    input = input || {};
    TGI.Util.assert(input.title, 'Task title is required.');
    var now = TGI.Util.nowIso();
    var task = {
      task_id: TGI.Util.uuid(),
      guest_id: input.guest_id || '',
      title: String(input.title),
      description: input.description || '',
      priority: normalizePriority_(input.priority),
      status: 'OPEN',
      owner_email: TGI.Util.email(input.owner_email),
      due_at: input.due_at || '',
      completed_at: '',
      created_at: now,
      updated_at: now
    };
    return TGI.SheetRepository.append('Tasks', task);
  }

  function assign(taskId, ownerEmail) {
    var task = require_(taskId);
    task.owner_email = TGI.Util.email(ownerEmail);
    task.updated_at = TGI.Util.nowIso();
    return TGI.SheetRepository.upsert('Tasks', task);
  }

  function transition(taskId, status, note) {
    var task = require_(taskId);
    var normalized = String(status || '').toUpperCase();
    TGI.Util.assert(VALID_STATUS.indexOf(normalized) >= 0, 'Invalid task status: ' + status);
    task.status = normalized;
    task.completed_at = normalized === 'COMPLETED' ? TGI.Util.nowIso() : '';
    task.updated_at = TGI.Util.nowIso();
    if (note) task.description = [task.description, String(note)].filter(Boolean).join('\n\n');
    return TGI.SheetRepository.upsert('Tasks', task);
  }

  function complete(taskId, note) { return transition(taskId, 'COMPLETED', note); }
  function cancel(taskId, note) { return transition(taskId, 'CANCELLED', note); }

  function openForGuest(guestId) {
    return TGI.SheetRepository.findBy('Tasks', 'guest_id', guestId).filter(function (task) {
      return ['OPEN', 'IN_PROGRESS', 'BLOCKED'].indexOf(String(task.status)) >= 0;
    });
  }

  function overdue(asOf) {
    var cutoff = asOf ? new Date(asOf) : new Date();
    return TGI.SheetRepository.all('Tasks').filter(function (task) {
      if (!task.due_at || ['COMPLETED', 'CANCELLED'].indexOf(String(task.status)) >= 0) return false;
      return new Date(task.due_at) < cutoff;
    });
  }

  function require_(taskId) {
    var task = TGI.SheetRepository.findById('Tasks', taskId);
    TGI.Util.assert(task, 'Task not found: ' + taskId);
    return task;
  }

  function normalizePriority_(value) {
    var normalized = String(value || 'MEDIUM').toUpperCase();
    return VALID_PRIORITY.indexOf(normalized) >= 0 ? normalized : 'MEDIUM';
  }

  return {
    create: create,
    assign: assign,
    transition: transition,
    complete: complete,
    cancel: cancel,
    openForGuest: openForGuest,
    overdue: overdue
  };
})();
