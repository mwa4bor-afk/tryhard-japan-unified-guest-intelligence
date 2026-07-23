TGI.AudienceService = (function () {
  function eligibleGuests_() {
    return TGI.GuestRepository.all().filter(function (guest) {
      return String(guest.status || '').toUpperCase() === 'ACTIVE' &&
        String(guest.marketing_consent || '').toUpperCase() === 'YES' &&
        Boolean(guest.email || guest.phone);
    });
  }

  function matches_(guest, criteria) {
    criteria = criteria || {};
    if (criteria.language && String(guest.language || '') !== String(criteria.language)) return false;
    if (criteria.country && String(guest.country || '') !== String(criteria.country)) return false;
    if (criteria.min_visits !== undefined && Number(guest.visit_count || 0) < Number(criteria.min_visits)) return false;
    if (criteria.min_lifetime_value !== undefined && Number(guest.lifetime_value || 0) < Number(criteria.min_lifetime_value)) return false;
    if (criteria.max_last_seen_days !== undefined) {
      var lastSeen = guest.last_seen_at ? new Date(guest.last_seen_at).getTime() : 0;
      var ageDays = lastSeen ? Math.floor((new Date().getTime() - lastSeen) / 86400000) : 999999;
      if (ageDays > Number(criteria.max_last_seen_days)) return false;
    }
    if (criteria.segment) {
      var segment = TGI.GuestSegmentationService.segmentGuest(guest);
      if (String(segment).toUpperCase() !== String(criteria.segment).toUpperCase()) return false;
    }
    return true;
  }

  function build(criteria) {
    TGI.AccessControlService.requirePermission('marketing.audience');
    var guests = eligibleGuests_().filter(function (guest) { return matches_(guest, criteria); });
    return {
      criteria: criteria || {},
      generated_at: new Date(),
      count: guests.length,
      guests: guests
    };
  }

  return { build: build };
})();