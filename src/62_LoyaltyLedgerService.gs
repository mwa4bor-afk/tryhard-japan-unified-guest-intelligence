TGI.LoyaltyLedgerService = (function () {
  var SHEET = 'Loyalty_Ledger';
  var HEADERS = ['transaction_id','member_id','guest_id','transaction_type','points','qualifying_points','reference_type','reference_id','description','expires_at','status','created_at','created_by'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function all() {
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(function (row, index) {
      var item = { _row: index + 2 };
      HEADERS.forEach(function (header, column) { item[header] = row[column]; });
      return item;
    });
  }

  function post(guestId, points, options) {
    TGI.AccessControlService.requirePermission('loyalty.transact');
    options = options || {};
    var member = TGI.LoyaltyProgramService.findMemberByGuest(guestId) || TGI.LoyaltyProgramService.enroll(guestId);
    points = Number(points || 0);
    TGI.Util.assert(points !== 0, 'Points transaction cannot be zero.');
    TGI.Util.assert(Number(member.points_balance || 0) + points >= 0, 'Insufficient loyalty points.');
    var qualifying = options.qualifying === false ? 0 : Number(options.qualifying_points == null ? Math.max(points, 0) : options.qualifying_points);
    var record = {
      transaction_id: TGI.Util.id('LTX'), member_id: member.member_id, guest_id: guestId,
      transaction_type: String(options.transaction_type || (points > 0 ? 'EARN' : 'REDEEM')).toUpperCase(),
      points: points, qualifying_points: qualifying, reference_type: options.reference_type || '', reference_id: options.reference_id || '',
      description: options.description || '', expires_at: options.expires_at || '', status: 'POSTED', created_at: new Date(),
      created_by: TGI.AccessControlService.currentEmail()
    };
    ensureSheet_().appendRow(HEADERS.map(function (header) { return record[header]; }));
    member.points_balance = Number(member.points_balance || 0) + points;
    member.qualifying_points = Number(member.qualifying_points || 0) + qualifying;
    member.lifetime_points = Number(member.lifetime_points || 0) + Math.max(points, 0);
    member.last_activity_at = new Date();
    TGI.LoyaltyProgramService.refreshTier(member);
    TGI.AuditLog.write('LOYALTY_TRANSACTION_POSTED', 'LoyaltyTransaction', record.transaction_id, { guest_id: guestId, points: points, type: record.transaction_type });
    if (TGI.DomainEventService) TGI.DomainEventService.publish('loyalty.transaction.posted', record, { entity_type: 'LoyaltyTransaction', entity_id: record.transaction_id });
    return record;
  }

  function earnForSpend(guestId, amount, referenceId) {
    var member = TGI.LoyaltyProgramService.findMemberByGuest(guestId) || TGI.LoyaltyProgramService.enroll(guestId);
    var tiers = TGI.LoyaltyProgramService.allTiers();
    var tier = tiers.filter(function (item) { return String(item.tier_id) === String(member.tier_id); })[0];
    var multiplier = tier ? Number(tier.earn_multiplier || 1) : 1;
    var points = Math.floor(Number(amount || 0) * multiplier);
    return post(guestId, points, { transaction_type: 'EARN', reference_type: 'SPEND', reference_id: referenceId || '', description: 'Points earned from eligible spend' });
  }

  function redeem(guestId, points, referenceId, description) {
    return post(guestId, -Math.abs(Number(points || 0)), { transaction_type: 'REDEEM', qualifying: false, reference_type: 'REWARD', reference_id: referenceId || '', description: description || 'Reward redemption' });
  }

  function historyForGuest(guestId) {
    return all().filter(function (row) { return String(row.guest_id) === String(guestId); }).sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  }

  return { ensureSheet: ensureSheet_, all: all, post: post, earnForSpend: earnForSpend, redeem: redeem, historyForGuest: historyForGuest };
})();