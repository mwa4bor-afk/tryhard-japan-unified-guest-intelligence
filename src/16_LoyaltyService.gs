TGI.LoyaltyService = (function () {
  function update(input) {
    input = input || {};
    TGI.Util.assert(input.guest_id, 'guest_id is required.');
    var existing = TGI.SheetRepository.findBy('Loyalty', 'guest_id', input.guest_id)[0] || null;
    var delta = parseInt(input.points_delta || 0, 10) || 0;
    var now = TGI.Util.nowIso();
    var currentBalance = existing ? Number(existing.points_balance || 0) : 0;
    var lifetimePoints = existing ? Number(existing.lifetime_points || 0) : 0;
    var newBalance = currentBalance + delta;
    TGI.Util.assert(newBalance >= 0, 'Points balance cannot become negative.');

    var record = {
      loyalty_id: existing ? existing.loyalty_id : TGI.Util.uuid(),
      guest_id: input.guest_id,
      tier: String(input.tier || (existing && existing.tier) || 'STANDARD').toUpperCase(),
      points_balance: newBalance,
      lifetime_points: lifetimePoints + Math.max(delta, 0),
      member_since: existing ? existing.member_since : (input.occurred_at || now),
      last_activity_at: input.occurred_at || now,
      created_at: existing ? existing.created_at : now,
      updated_at: now
    };
    return TGI.SheetRepository.upsert('Loyalty', record);
  }

  return { update: update };
})();
