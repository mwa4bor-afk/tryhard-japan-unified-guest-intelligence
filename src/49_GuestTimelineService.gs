TGI.GuestTimelineService = (function () {
  var GUEST_SHEET = 'Guests';
  var TIMELINE_SOURCES = [
    { sheet: 'Stays', type: 'STAY', dateFields: ['check_in_date', 'arrival_date', 'created_at', 'updated_at'] },
    { sheet: 'Reservations', type: 'RESERVATION', dateFields: ['arrival_date', 'imported_at', 'created_at'] },
    { sheet: 'Preferences', type: 'PREFERENCE', dateFields: ['observed_at', 'created_at', 'updated_at'] },
    { sheet: 'Loyalty', type: 'LOYALTY', dateFields: ['earned_at', 'created_at', 'updated_at'] },
    { sheet: 'Service_Recovery', type: 'SERVICE_RECOVERY', dateFields: ['opened_at', 'created_at', 'updated_at', 'resolved_at'] },
    { sheet: 'Tasks', type: 'TASK', dateFields: ['created_at', 'due_at', 'completed_at', 'updated_at'] },
    { sheet: 'Contact_History', type: 'CONTACT', dateFields: ['contacted_at', 'created_at', 'updated_at'] },
    { sheet: 'Campaign_Recipients', type: 'CAMPAIGN', dateFields: ['queued_at', 'created_at', 'updated_at'] },
    { sheet: 'Guest_Insights', type: 'INSIGHT', dateFields: ['generated_at', 'created_at', 'updated_at'] }
  ];

  function rows_(sheetName) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
    var values = sheet.getDataRange().getValues();
    var headers = values.shift().map(function (value) { return String(value || '').trim(); });
    return values.map(function (row) {
      var record = {};
      headers.forEach(function (header, index) { record[header] = row[index]; });
      return record;
    });
  }

  function firstValue_(record, fields) {
    for (var index = 0; index < fields.length; index += 1) {
      if (record[fields[index]] !== '' && record[fields[index]] !== null && record[fields[index]] !== undefined) return record[fields[index]];
    }
    return '';
  }

  function dateValue_(record, fields) {
    var value = firstValue_(record, fields || []);
    if (!value) return new Date(0);
    var date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? new Date(0) : date;
  }

  function summary_(record, type) {
    var preferred = {
      STAY: ['property', 'location_id', 'room', 'status', 'total_spend'],
      RESERVATION: ['guest_name', 'location_id', 'status', 'party_size', 'total_value'],
      PREFERENCE: ['category', 'preference', 'value', 'notes'],
      LOYALTY: ['program', 'tier', 'points', 'status'],
      SERVICE_RECOVERY: ['issue_type', 'severity', 'status', 'resolution'],
      TASK: ['title', 'task_type', 'status', 'owner_email'],
      CONTACT: ['channel', 'direction', 'subject', 'summary'],
      CAMPAIGN: ['campaign_id', 'channel', 'status', 'skip_reason'],
      INSIGHT: ['segment', 'risk_level', 'recommended_action', 'summary']
    }[type] || [];
    var parts = [];
    preferred.forEach(function (field) {
      var value = record[field];
      if (value !== '' && value !== null && value !== undefined) parts.push(field + ': ' + value);
    });
    if (!parts.length) {
      Object.keys(record).slice(0, 6).forEach(function (field) {
        if (field !== 'guest_id' && record[field] !== '') parts.push(field + ': ' + record[field]);
      });
    }
    return parts.join(' | ').slice(0, 1000);
  }

  function guest(guestId) {
    TGI.AccessControlService.requirePermission('guest360.view');
    var record = rows_(GUEST_SHEET).filter(function (row) { return String(row.guest_id) === String(guestId); })[0];
    TGI.Util.assert(record, 'Guest not found: ' + guestId);
    return record;
  }

  function timeline(guestId, options) {
    TGI.AccessControlService.requirePermission('guest360.view');
    options = options || {};
    var events = [];
    TIMELINE_SOURCES.forEach(function (source) {
      rows_(source.sheet).forEach(function (record) {
        if (String(record.guest_id || '') !== String(guestId)) return;
        var occurredAt = dateValue_(record, source.dateFields);
        events.push({
          event_id: String(firstValue_(record, ['event_id', 'stay_id', 'reservation_id', 'task_id', 'contact_id', 'recovery_id', 'recipient_id', 'insight_id']) || ''),
          guest_id: guestId,
          occurred_at: occurredAt,
          event_type: source.type,
          source_sheet: source.sheet,
          status: String(firstValue_(record, ['status', 'state']) || ''),
          summary: summary_(record, source.type),
          record: record
        });
      });
    });
    events.sort(function (a, b) { return b.occurred_at.getTime() - a.occurred_at.getTime(); });
    return options.limit ? events.slice(0, Number(options.limit)) : events;
  }

  function snapshot(guestId) {
    var profile = guest(guestId);
    var events = timeline(guestId);
    var counts = {};
    events.forEach(function (event) { counts[event.event_type] = (counts[event.event_type] || 0) + 1; });
    return {
      guest: profile,
      event_count: events.length,
      event_counts: counts,
      last_activity_at: events.length ? events[0].occurred_at : profile.last_seen_at || profile.updated_at || '',
      latest_events: events.slice(0, 10)
    };
  }

  return { guest: guest, timeline: timeline, snapshot: snapshot };
})();