function initializeTryHardLoyaltyProgram() {
  var result = TGI.LoyaltyProgramService.initializeDefaults();
  TGI.LoyaltyLedgerService.ensureSheet();
  var summary = TGI.LoyaltyDashboardService.rebuild();
  return { initialization: result, summary: summary };
}

function enrollTryHardLoyaltyGuest(guestId) {
  return TGI.LoyaltyProgramService.enroll(guestId);
}

function earnTryHardLoyaltyPoints(guestId, amount, referenceId) {
  return TGI.LoyaltyLedgerService.earnForSpend(guestId, amount, referenceId);
}

function redeemTryHardLoyaltyPoints(guestId, points, referenceId, description) {
  return TGI.LoyaltyLedgerService.redeem(guestId, points, referenceId, description);
}

function processTryHardLoyaltyExpirations() {
  return TGI.LoyaltyExpirationService.processExpiredPoints();
}

function reconcileTryHardLoyaltyBalances() {
  return TGI.LoyaltyExpirationService.reconcile();
}

function rebuildTryHardLoyaltyDashboard() {
  return TGI.LoyaltyDashboardService.rebuild();
}

function showTryHardLoyaltySummary() {
  var summary = TGI.LoyaltyDashboardService.summary();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Members: ' + summary.members + '\nActive members: ' + summary.active_members + '\nPoints earned: ' + summary.points_earned + '\nPoints redeemed: ' + summary.points_redeemed + '\nOutstanding points: ' + summary.outstanding_points, SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}

function installTryHardLoyaltyExpirationTrigger() {
  return TGI.LoyaltyExpirationService.installTrigger();
}