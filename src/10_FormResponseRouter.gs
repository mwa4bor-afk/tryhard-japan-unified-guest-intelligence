TGI.FormResponseRouter = (function () {
  function handle(event) {
    TGI.Util.assert(event && event.response, 'A Google Forms submit event is required.');
    var form = event.source;
    var registration = TGI.FormBuilder.getByFormId(form.getId());
    TGI.Util.assert(registration, 'Submitted form is not registered: ' + form.getId());
    var values = extract_(event.response);

    if (registration.key === 'post_visit_feedback') return routeFeedback_(values);
    if (registration.key === 'guest_profile') return routeProfile_(values);
    if (registration.key === 'service_recovery') return routeRecovery_(values);
    if (registration.key === 'staff_guest_observation') return routeObservation_(values);
    if (registration.key === 'vip_loyalty_update') return routeLoyalty_(values);
    throw new Error('No router for form key: ' + registration.key);
  }

  function extract_(response) {
    var values = { submitted_at: response.getTimestamp() };
    response.getItemResponses().forEach(function (itemResponse) {
      var item = itemResponse.getItem();
      var helpText = item.getHelpText ? item.getHelpText() : '';
      var match = /\[field:([^\]]+)\]/.exec(helpText || '');
      if (!match) return;
      var answer = itemResponse.getResponse();
      values[match[1]] = Array.isArray(answer) ? answer.join(', ') : answer;
    });
    return values;
  }

  function resolveGuest_(values) {
    var email = values.email || values.guest_email || '';
    var phone = values.phone || values.guest_phone || '';
    var duplicates = TGI.GuestRepository.findDuplicates({ email: email, phone: phone });
    if (duplicates.length) return duplicates[0];

    var names = splitName_(values.guest_name || '');
    return TGI.GuestRepository.save({
      first_name: values.first_name || names.first,
      last_name: values.last_name || names.last,
      email: email,
      phone: phone,
      country: values.country || '',
      language: normalizeLanguage_(values.language),
      date_of_birth: values.date_of_birth || '',
      marketing_consent: truthy_(values.marketing_consent),
      source: 'FORM',
      first_seen_at: values.submitted_at,
      last_seen_at: values.submitted_at,
      notes: 'Created from Google Form submission.'
    });
  }

  function routeFeedback_(values) {
    var guest = resolveGuest_(values);
    guest.last_seen_at = values.visit_date || values.submitted_at;
    guest.visit_count = Number(guest.visit_count || 0) + 1;
    guest.marketing_consent = guest.marketing_consent || truthy_(values.marketing_consent);
    TGI.GuestRepository.save(guest);

    var stay = append_('Stays', {
      stay_id: TGI.Util.uuid(), guest_id: guest.guest_id, location: values.location,
      arrival_at: values.visit_date, departure_at: values.visit_date, party_size: '',
      booking_reference: values.booking_reference, room_or_table: '', spend: '', currency: 'JPY',
      experience_rating: values.experience_rating, nps_score: values.nps_score,
      feedback: values.feedback, service_recovery_required: truthy_(values.service_recovery_required),
      created_at: TGI.Util.nowIso(), updated_at: TGI.Util.nowIso()
    });

    if (truthy_(values.service_recovery_required)) {
      append_('Tasks', {
        task_id: TGI.Util.uuid(), guest_id: guest.guest_id,
        title: 'Follow up on guest feedback', description: values.feedback || 'Guest requested manager contact.',
        priority: Number(values.experience_rating || 5) <= 2 ? 'HIGH' : 'MEDIUM', status: 'OPEN',
        owner_email: '', due_at: addDays_(new Date(), 1), completed_at: '',
        created_at: TGI.Util.nowIso(), updated_at: TGI.Util.nowIso()
      });
    }
    return { guest: guest, stay: stay };
  }

  function routeProfile_(values) {
    var guest = resolveGuest_(values);
    guest.country = values.country || guest.country;
    guest.language = normalizeLanguage_(values.language) || guest.language;
    guest.date_of_birth = values.date_of_birth || guest.date_of_birth;
    guest.marketing_consent = guest.marketing_consent || truthy_(values.marketing_consent);
    guest = TGI.GuestRepository.save(guest);
    addPreference_(guest.guest_id, 'FOOD', values.food_preferences, 'FORM', 'HIGH');
    addPreference_(guest.guest_id, 'ALLERGY', values.allergies, 'FORM', 'HIGH');
    addPreference_(guest.guest_id, 'EXPERIENCE', values.experience_preferences, 'FORM', 'HIGH');
    return guest;
  }

  function routeRecovery_(values) {
    var guest = resolveGuest_(values);
    var task = append_('Tasks', {
      task_id: TGI.Util.uuid(), guest_id: guest.guest_id,
      title: 'Service recovery: ' + (values.location || 'Unknown location'),
      description: [values.incident_summary, values.immediate_action].filter(Boolean).join('\n\n'),
      priority: values.severity || 'MEDIUM', status: normalizeStatus_(values.status),
      owner_email: values.owner_email, due_at: values.follow_up_due, completed_at: '',
      created_at: TGI.Util.nowIso(), updated_at: TGI.Util.nowIso()
    });
    append_('ContactLog', {
      contact_id: TGI.Util.uuid(), guest_id: guest.guest_id, channel: 'IN_PERSON', direction: 'INBOUND',
      subject: 'Service recovery incident', summary: values.incident_summary,
      outcome: values.immediate_action, owner_email: values.owner_email,
      contacted_at: values.incident_date || values.submitted_at, created_at: TGI.Util.nowIso()
    });
    return task;
  }

  function routeObservation_(values) {
    var guest = resolveGuest_(values);
    return addPreference_(guest.guest_id, values.category || 'OTHER', values.preference_value,
      'STAFF_OBSERVATION:' + (values.staff_email || ''), values.confidence || 'MEDIUM');
  }

  function routeLoyalty_(values) {
    var guest = resolveGuest_(values);
    var existing = findRowByGuest_('Loyalty', guest.guest_id);
    var pointsDelta = parseInt(values.points_delta || '0', 10) || 0;
    var currentBalance = existing ? Number(existing.points_balance || 0) : 0;
    var lifetime = existing ? Number(existing.lifetime_points || 0) : 0;
    var record = {
      loyalty_id: existing ? existing.loyalty_id : TGI.Util.uuid(), guest_id: guest.guest_id,
      tier: values.tier || (existing && existing.tier) || 'STANDARD',
      points_balance: currentBalance + pointsDelta,
      lifetime_points: lifetime + Math.max(pointsDelta, 0),
      member_since: existing ? existing.member_since : values.submitted_at,
      last_activity_at: values.submitted_at, created_at: existing ? existing.created_at : TGI.Util.nowIso(),
      updated_at: TGI.Util.nowIso()
    };
    upsertByPrimaryKey_('Loyalty', record);
    if (values.next_best_action) {
      append_('Tasks', {
        task_id: TGI.Util.uuid(), guest_id: guest.guest_id, title: 'VIP / loyalty next action',
        description: values.next_best_action + (values.recognition_notes ? '\n\n' + values.recognition_notes : ''),
        priority: 'MEDIUM', status: 'OPEN', owner_email: values.owner_email, due_at: '', completed_at: '',
        created_at: TGI.Util.nowIso(), updated_at: TGI.Util.nowIso()
      });
    }
    return record;
  }

  function addPreference_(guestId, category, value, source, confidence) {
    if (!value) return null;
    return append_('Preferences', {
      preference_id: TGI.Util.uuid(), guest_id: guestId, category: category, value: value,
      confidence: String(confidence || 'MEDIUM').toUpperCase(), source: source,
      first_observed_at: TGI.Util.nowIso(), last_observed_at: TGI.Util.nowIso(),
      created_at: TGI.Util.nowIso(), updated_at: TGI.Util.nowIso()
    });
  }

  function append_(sheetName, record) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    TGI.Util.assert(sheet, sheetName + ' sheet is missing. Run installation first.');
    var headers = TGI.Schema.headers(sheetName);
    sheet.appendRow(headers.map(function (header) { return record[header] === undefined ? '' : record[header]; }));
    TGI.AuditLog.write(sheetName, record[headers[0]], 'CREATE', record);
    return record;
  }

  function upsertByPrimaryKey_(sheetName, record) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var headers = TGI.Schema.headers(sheetName);
    var key = headers[0];
    var row = 0;
    if (sheet.getLastRow() >= 2) {
      var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < ids.length; i += 1) if (ids[i][0] === record[key]) { row = i + 2; break; }
    }
    var values = headers.map(function (header) { return record[header] === undefined ? '' : record[header]; });
    if (row) sheet.getRange(row, 1, 1, headers.length).setValues([values]); else sheet.appendRow(values);
    TGI.AuditLog.write(sheetName, record[key], row ? 'UPDATE' : 'CREATE', record);
  }

  function findRowByGuest_(sheetName, guestId) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var headers = TGI.Schema.headers(sheetName);
    var guestColumn = headers.indexOf('guest_id');
    if (sheet.getLastRow() < 2 || guestColumn < 0) return null;
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i][guestColumn] === guestId) {
        var result = {}; headers.forEach(function (header, index) { result[header] = rows[i][index]; }); return result;
      }
    }
    return null;
  }

  function splitName_(name) { var parts = String(name || '').trim().split(/\s+/); return { first: parts.shift() || 'Unknown', last: parts.join(' ') || 'Guest' }; }
  function truthy_(value) { return /^(true|yes|1|i agree)/i.test(String(value || '')); }
  function normalizeLanguage_(value) { var map = { Japanese: 'ja', English: 'en', Chinese: 'zh', Korean: 'ko' }; return map[value] || value || ''; }
  function normalizeStatus_(value) { return String(value || 'OPEN').replace(/\s+/g, '_').toUpperCase(); }
  function addDays_(date, days) { var result = new Date(date); result.setDate(result.getDate() + days); return result; }

  return { handle: handle };
})();

function onUnifiedFormSubmit(event) {
  return TGI.FormResponseRouter.handle(event);
}
