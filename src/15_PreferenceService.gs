TGI.PreferenceService = (function () {
  function normalize_(value) { return String(value || '').trim().toLowerCase(); }

  function upsert(input) {
    input = input || {};
    if (!input.value) return null;
    TGI.Util.assert(input.guest_id, 'guest_id is required.');
    var category = String(input.category || 'OTHER').trim().toUpperCase();
    var existing = TGI.SheetRepository.findBy('Preferences', 'guest_id', input.guest_id)
      .filter(function (record) {
        return String(record.category || '').toUpperCase() === category &&
          normalize_(record.value) === normalize_(input.value);
      })[0] || null;
    var now = TGI.Util.nowIso();
    var record = existing || {
      preference_id: TGI.Util.uuid(),
      guest_id: input.guest_id,
      category: category,
      value: String(input.value).trim(),
      confidence: String(input.confidence || 'MEDIUM').toUpperCase(),
      source: input.source || 'UNKNOWN',
      first_observed_at: input.observed_at || now,
      created_at: now
    };
    record.last_observed_at = input.observed_at || now;
    record.updated_at = now;
    if (input.confidence) record.confidence = String(input.confidence).toUpperCase();
    if (input.source) record.source = input.source;
    return TGI.SheetRepository.upsert('Preferences', record);
  }

  return { upsert: upsert };
})();
