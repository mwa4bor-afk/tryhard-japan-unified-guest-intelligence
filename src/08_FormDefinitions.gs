TGI.FormDefinitions = (function () {
  var FORMS = [
    {
      key: 'post_visit_feedback',
      title: 'TryHard Japan — Post-Visit Guest Feedback',
      description: 'Completed after the guest leaves. Captures satisfaction, NPS, feedback, and service-recovery needs.',
      confirmation: 'Thank you. Your feedback has been recorded and will be reviewed by the TryHard Japan team.',
      fields: [
        text('first_name', 'Guest first name', true),
        text('last_name', 'Guest last name', true),
        text('email', 'Email address', false, 'Email is used to match this response with the guest profile.'),
        text('phone', 'Phone number', false),
        text('location', 'Location visited', true),
        date('visit_date', 'Date of visit', true),
        text('booking_reference', 'Booking reference', false),
        scale('experience_rating', 'Overall experience', 1, 5, 'Very poor', 'Excellent', true),
        scale('nps_score', 'How likely are you to recommend TryHard Japan?', 0, 10, 'Not likely', 'Extremely likely', true),
        paragraph('feedback', 'What went well, and what could we improve?', false),
        multiple('service_recovery_required', 'Would you like a manager to contact you?', ['No', 'Yes'], true),
        checkbox('marketing_consent', 'Communication consent', ['I agree to receive relevant updates and offers from TryHard Japan.'], false)
      ]
    },
    {
      key: 'guest_profile',
      title: 'TryHard Japan — Guest Profile & Preferences',
      description: 'Captures guest identity, language, consent, and high-value preferences for future visits.',
      confirmation: 'Thank you. Your guest profile has been updated.',
      fields: [
        text('first_name', 'First name', true),
        text('last_name', 'Last name', true),
        text('email', 'Email address', false),
        text('phone', 'Phone number', false),
        text('country', 'Country or region', false),
        multiple('language', 'Preferred language', ['Japanese', 'English', 'Chinese', 'Korean', 'Other'], false),
        date('date_of_birth', 'Date of birth', false),
        paragraph('food_preferences', 'Food and beverage preferences', false),
        paragraph('allergies', 'Allergies or dietary restrictions', false),
        paragraph('experience_preferences', 'Experience, seating, room, music, or service preferences', false),
        checkbox('marketing_consent', 'Communication consent', ['I agree to receive relevant updates and offers from TryHard Japan.'], false)
      ]
    },
    {
      key: 'service_recovery',
      title: 'TryHard Japan — Service Recovery Record',
      description: 'Internal form for recording incidents, corrective action, ownership, and follow-up.',
      confirmation: 'The service-recovery record has been created.',
      fields: [
        text('guest_email', 'Guest email', false),
        text('guest_phone', 'Guest phone', false),
        text('guest_name', 'Guest name', true),
        text('location', 'Location', true),
        date('incident_date', 'Incident date', true),
        multiple('severity', 'Severity', ['Low', 'Medium', 'High', 'Critical'], true),
        paragraph('incident_summary', 'Incident summary', true),
        paragraph('immediate_action', 'Immediate action taken', true),
        text('owner_email', 'Case owner email', true),
        date('follow_up_due', 'Follow-up due date', false),
        multiple('status', 'Case status', ['Open', 'In progress', 'Resolved', 'Closed'], true)
      ]
    },
    {
      key: 'staff_guest_observation',
      title: 'TryHard Japan — Staff Guest Observation',
      description: 'Internal form for recording observed guest preferences and notable interaction details.',
      confirmation: 'The guest observation has been recorded.',
      fields: [
        text('guest_email', 'Guest email', false),
        text('guest_phone', 'Guest phone', false),
        text('guest_name', 'Guest name', true),
        text('location', 'Location', true),
        multiple('category', 'Observation category', ['Food', 'Beverage', 'Seating', 'Room', 'Entertainment', 'Accessibility', 'Communication', 'Celebration', 'Other'], true),
        paragraph('preference_value', 'Preference or observation', true),
        multiple('confidence', 'Confidence', ['Low', 'Medium', 'High'], true),
        text('staff_email', 'Staff member email', true)
      ]
    },
    {
      key: 'vip_loyalty_update',
      title: 'TryHard Japan — VIP & Loyalty Update',
      description: 'Internal form for loyalty membership, recognition, VIP status, points, and next-action updates.',
      confirmation: 'The loyalty record has been updated.',
      fields: [
        text('guest_email', 'Guest email', false),
        text('guest_phone', 'Guest phone', false),
        text('guest_name', 'Guest name', true),
        multiple('tier', 'Loyalty tier', ['Standard', 'Silver', 'Gold', 'Platinum', 'VIP'], true),
        text('points_delta', 'Points adjustment', false, 'Enter a positive or negative whole number.'),
        paragraph('recognition_notes', 'Recognition and loyalty notes', false),
        paragraph('next_best_action', 'Recommended next action', false),
        text('owner_email', 'Record owner email', true)
      ]
    }
  ];

  function base(type, key, title, required, helpText) {
    return { type: type, key: key, title: title, required: required === true, helpText: helpText || '' };
  }
  function text(key, title, required, helpText) { return base('text', key, title, required, helpText); }
  function paragraph(key, title, required, helpText) { return base('paragraph', key, title, required, helpText); }
  function date(key, title, required, helpText) { return base('date', key, title, required, helpText); }
  function multiple(key, title, choices, required) { var f = base('multiple', key, title, required); f.choices = choices; return f; }
  function checkbox(key, title, choices, required) { var f = base('checkbox', key, title, required); f.choices = choices; return f; }
  function scale(key, title, lower, upper, lowerLabel, upperLabel, required) {
    var f = base('scale', key, title, required); f.lower = lower; f.upper = upper; f.lowerLabel = lowerLabel; f.upperLabel = upperLabel; return f;
  }

  function all() { return FORMS.map(function (form) { return JSON.parse(JSON.stringify(form)); }); }
  function get(key) {
    var found = FORMS.filter(function (form) { return form.key === key; })[0];
    TGI.Util.assert(found, 'Unknown form definition: ' + key);
    return JSON.parse(JSON.stringify(found));
  }

  return { all: all, get: get };
})();
