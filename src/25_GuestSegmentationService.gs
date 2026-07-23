TGI.GuestSegmentationService = (function () {
  function segmentGuest(guest) {
    var visitCount = Number(guest.visit_count || 0);
    var lifetimeValue = Number(guest.lifetime_value || 0);
    var lastSeen = guest.last_seen_at ? new Date(guest.last_seen_at) : null;
    var daysSinceVisit = lastSeen && !isNaN(lastSeen.getTime())
      ? Math.floor((new Date().getTime() - lastSeen.getTime()) / 86400000)
      : null;

    if (guest.status === 'MERGED') return 'MERGED';
    if (lifetimeValue >= 250000 || visitCount >= 10) return 'VIP';
    if (visitCount >= 5 || lifetimeValue >= 100000) return 'HIGH_VALUE';
    if (daysSinceVisit !== null && daysSinceVisit > 180 && visitCount >= 2) return 'LAPSED';
    if (visitCount >= 2) return 'RETURNING';
    if (visitCount === 1) return 'NEW';
    return 'PROSPECT';
  }

  function all() {
    return TGI.GuestRepository.all().map(function (guest) {
      return {
        guest_id: guest.guest_id,
        full_name: guest.full_name,
        segment: segmentGuest(guest),
        visit_count: Number(guest.visit_count || 0),
        lifetime_value: Number(guest.lifetime_value || 0),
        last_seen_at: guest.last_seen_at || ''
      };
    });
  }

  function summary() {
    return all().reduce(function (result, row) {
      result[row.segment] = (result[row.segment] || 0) + 1;
      return result;
    }, {});
  }

  return {
    segmentGuest: segmentGuest,
    all: all,
    summary: summary
  };
})();