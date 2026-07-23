TGI.LoyaltyDashboardService = (function () {
  var SHEET = 'Loyalty_Dashboard';

  function summary() {
    TGI.AccessControlService.requirePermission('loyalty.view');
    var members = TGI.LoyaltyProgramService.allMembers();
    var tiers = TGI.LoyaltyProgramService.allTiers();
    var ledger = TGI.LoyaltyLedgerService.all();
    var byTier = {};
    members.forEach(function (member) { byTier[member.tier_id] = (byTier[member.tier_id] || 0) + 1; });
    var earned = ledger.filter(function (row) { return Number(row.points || 0) > 0; }).reduce(function (sum, row) { return sum + Number(row.points || 0); }, 0);
    var redeemed = Math.abs(ledger.filter(function (row) { return String(row.transaction_type).toUpperCase() === 'REDEEM'; }).reduce(function (sum, row) { return sum + Number(row.points || 0); }, 0));
    var expired = Math.abs(ledger.filter(function (row) { return String(row.transaction_type).toUpperCase() === 'EXPIRE'; }).reduce(function (sum, row) { return sum + Number(row.points || 0); }, 0));
    var liability = members.reduce(function (sum, member) { return sum + Number(member.points_balance || 0); }, 0);
    return { members: members.length, active_members: members.filter(function (m) { return String(m.status).toUpperCase() === 'ACTIVE'; }).length, tiers: tiers.length, points_earned: earned, points_redeemed: redeemed, points_expired: expired, outstanding_points: liability, by_tier: byTier };
  }

  function rebuild() {
    var data = summary();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    sheet.clear();
    var rows = [
      ['TryHard Loyalty Program Dashboard', ''],
      ['Generated at', new Date()],
      ['', ''],
      ['Metric', 'Value'],
      ['Members', data.members],
      ['Active members', data.active_members],
      ['Points earned', data.points_earned],
      ['Points redeemed', data.points_redeemed],
      ['Points expired', data.points_expired],
      ['Outstanding points liability', data.outstanding_points],
      ['', ''],
      ['Tier', 'Members']
    ];
    Object.keys(data.by_tier).sort().forEach(function (tier) { rows.push([tier, data.by_tier[tier]]); });
    sheet.getRange(1, 1, rows.length, 2).setValues(rows);
    sheet.setFrozenRows(4);
    sheet.autoResizeColumns(1, 2);
    TGI.AuditLog.write('LOYALTY_DASHBOARD_REBUILT', 'Dashboard', SHEET, data);
    return data;
  }

  return { summary: summary, rebuild: rebuild };
})();