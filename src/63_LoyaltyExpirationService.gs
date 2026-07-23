TGI.LoyaltyExpirationService = (function () {
  function processExpiredPoints() {
    TGI.AccessControlService.requirePermission('loyalty.manage');
    var now = new Date().getTime();
    var expired = TGI.LoyaltyLedgerService.all().filter(function (row) {
      return String(row.status).toUpperCase() === 'POSTED' && Number(row.points || 0) > 0 && row.expires_at && new Date(row.expires_at).getTime() <= now;
    });
    var processed = [];
    expired.forEach(function (row) {
      var history = TGI.LoyaltyLedgerService.historyForGuest(row.guest_id);
      var prior = history.some(function (item) { return String(item.reference_type) === 'EXPIRATION' && String(item.reference_id) === String(row.transaction_id); });
      if (prior) return;
      var member = TGI.LoyaltyProgramService.findMemberByGuest(row.guest_id);
      if (!member || Number(member.points_balance || 0) <= 0) return;
      var amount = Math.min(Number(row.points || 0), Number(member.points_balance || 0));
      processed.push(TGI.LoyaltyLedgerService.post(row.guest_id, -amount, {
        transaction_type: 'EXPIRE', qualifying: false, reference_type: 'EXPIRATION', reference_id: row.transaction_id,
        description: 'Expired loyalty points'
      }));
    });
    return { candidates: expired.length, processed: processed.length, transactions: processed };
  }

  function reconcile() {
    TGI.AccessControlService.requirePermission('loyalty.manage');
    var members = TGI.LoyaltyProgramService.allMembers();
    var ledger = TGI.LoyaltyLedgerService.all().filter(function (row) { return String(row.status).toUpperCase() === 'POSTED'; });
    var mismatches = [];
    members.forEach(function (member) {
      var calculated = ledger.filter(function (row) { return String(row.member_id) === String(member.member_id); })
        .reduce(function (sum, row) { return sum + Number(row.points || 0); }, 0);
      if (calculated !== Number(member.points_balance || 0)) mismatches.push({ member_id: member.member_id, guest_id: member.guest_id, stored: Number(member.points_balance || 0), calculated: calculated });
    });
    return { valid: !mismatches.length, members: members.length, mismatches: mismatches };
  }

  function installTrigger() {
    TGI.AccessControlService.requirePermission('loyalty.manage');
    ScriptApp.getProjectTriggers().filter(function (trigger) { return trigger.getHandlerFunction() === 'processTryHardLoyaltyExpirations'; }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
    return ScriptApp.newTrigger('processTryHardLoyaltyExpirations').timeBased().everyDays(1).atHour(3).create();
  }

  return { processExpiredPoints: processExpiredPoints, reconcile: reconcile, installTrigger: installTrigger };
})();