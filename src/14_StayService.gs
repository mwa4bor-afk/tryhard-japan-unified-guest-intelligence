TGI.StayService = (function () {
  function create(input) {
    input = input || {};
    TGI.Util.assert(input.guest_id, 'guest_id is required.');
    var now = TGI.Util.nowIso();
    var stay = {
      stay_id: input.stay_id || TGI.Util.uuid(),
      guest_id: input.guest_id,
      location: input.location || '',
      arrival_at: input.arrival_at || input.visit_date || now,
      departure_at: input.departure_at || input.visit_date || input.arrival_at || now,
      party_size: input.party_size || '',
      booking_reference: input.booking_reference || '',
      room_or_table: input.room_or_table || '',
      spend: Number(input.spend || 0),
      currency: input.currency || 'JPY',
      experience_rating: input.experience_rating || '',
      nps_score: input.nps_score || '',
      feedback: input.feedback || '',
      service_recovery_required: Boolean(input.service_recovery_required),
      created_at: input.created_at || now,
      updated_at: now
    };
    TGI.SheetRepository.append('Stays', stay);
    updateGuestTotals_(stay);
    return stay;
  }

  function updateGuestTotals_(stay) {
    var guest = TGI.GuestRepository.findById(stay.guest_id);
    if (!guest) return;
    guest.visit_count = Number(guest.visit_count || 0) + 1;
    guest.lifetime_value = Number(guest.lifetime_value || 0) + Number(stay.spend || 0);
    guest.last_seen_at = stay.departure_at || stay.arrival_at || TGI.Util.nowIso();
    TGI.GuestRepository.save(guest);
  }

  return { create: create };
})();
