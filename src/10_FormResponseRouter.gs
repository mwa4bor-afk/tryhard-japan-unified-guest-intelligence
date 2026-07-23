TGI.FormResponseRouter = (function () {
  function handle(event) {
    TGI.Util.assert(event && event.response, 'A Google Forms submit event is required.');
    var registration = TGI.FormBuilder.getByFormId(event.source.getId());
    TGI.Util.assert(registration, 'Submitted form is not registered: ' + event.source.getId());
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

  function guestInput_(values) {
    return {
      guest_name: values.guest_name,
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email || values.guest_email,
      phone: values.phone || values.guest_phone,
      country: values.country,
      language: normalizeLanguage_(values.language),
      date_of_birth: values.date_of_birth,
      marketing_consent: truthy_(values.marketing_consent),
      submitted_at: values.submitted_at,
      occurred_at: values.visit_date || values.incident_date || values.submitted_at,
      source: 'FORM'
    };
  }

  function routeFeedback_(values) {
    var guest = TGI.GuestResolutionService.resolve(guestInput_(values));
    var stay = TGI.StayService.create({
      guest_id: guest.guest_id,
      location: values.location,
      visit_date: values.visit_date,
      booking_reference: values.booking_reference,
      experience_rating: values.experience_rating,
      nps_score: values.nps_score,
      feedback: values.feedback,
      service_recovery_required: truthy_(values.service_recovery_required)
    });
    if (stay.service_recovery_required) {
      TGI.ServiceRecoveryService.open({
        guest_id: guest.guest_id,
        location: values.location,
        title: 'Follow up on guest feedback',
        description: values.feedback || 'Guest requested manager contact.',
        priority: Number(values.experience_rating || 5) <= 2 ? 'HIGH' : 'MEDIUM',
        occurred_at: values.submitted_at
      });
    }
    return { guest: guest, stay: stay };
  }

  function routeProfile_(values) {
    var guest = TGI.GuestResolutionService.resolve(guestInput_(values));
    TGI.PreferenceService.upsert({ guest_id: guest.guest_id, category: 'FOOD', value: values.food_preferences, source: 'FORM', confidence: 'HIGH' });
    TGI.PreferenceService.upsert({ guest_id: guest.guest_id, category: 'ALLERGY', value: values.allergies, source: 'FORM', confidence: 'HIGH' });
    TGI.PreferenceService.upsert({ guest_id: guest.guest_id, category: 'EXPERIENCE', value: values.experience_preferences, source: 'FORM', confidence: 'HIGH' });
    return guest;
  }

  function routeRecovery_(values) {
    var guest = TGI.GuestResolutionService.resolve(guestInput_(values));
    return TGI.ServiceRecoveryService.open({
      guest_id: guest.guest_id,
      location: values.location,
      incident_summary: values.incident_summary,
      immediate_action: values.immediate_action,
      severity: values.severity,
      status: values.status,
      owner_email: values.owner_email,
      follow_up_due: values.follow_up_due,
      incident_date: values.incident_date
    });
  }

  function routeObservation_(values) {
    var guest = TGI.GuestResolutionService.resolve(guestInput_(values));
    return TGI.PreferenceService.upsert({
      guest_id: guest.guest_id,
      category: values.category || 'OTHER',
      value: values.preference_value,
      source: 'STAFF_OBSERVATION:' + (values.staff_email || ''),
      confidence: values.confidence || 'MEDIUM',
      observed_at: values.submitted_at
    });
  }

  function routeLoyalty_(values) {
    var guest = TGI.GuestResolutionService.resolve(guestInput_(values));
    var loyalty = TGI.LoyaltyService.update({
      guest_id: guest.guest_id,
      tier: values.tier,
      points_delta: values.points_delta,
      occurred_at: values.submitted_at
    });
    if (values.next_best_action) {
      TGI.SheetRepository.append('Tasks', {
        task_id: TGI.Util.uuid(), guest_id: guest.guest_id,
        title: 'VIP / loyalty next action',
        description: values.next_best_action + (values.recognition_notes ? '\n\n' + values.recognition_notes : ''),
        priority: 'MEDIUM', status: 'OPEN', owner_email: values.owner_email || '',
        due_at: '', completed_at: '', created_at: TGI.Util.nowIso(), updated_at: TGI.Util.nowIso()
      });
    }
    return loyalty;
  }

  function truthy_(value) { return /^(true|yes|1|i agree)/i.test(String(value || '')); }
  function normalizeLanguage_(value) {
    var map = { Japanese: 'ja', English: 'en', Chinese: 'zh', Korean: 'ko' };
    return map[value] || value || '';
  }

  return { handle: handle };
})();

function onUnifiedFormSubmit(event) {
  return TGI.FormResponseRouter.handle(event);
}
