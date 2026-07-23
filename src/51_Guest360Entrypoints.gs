function initializeTryHardGuest360() {
  TGI.Guest360Service.ensureSheet();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Guest 360 is ready. Select a guest row and run openTryHardGuest360FromActiveRow().', SpreadsheetApp.getUi().ButtonSet.OK);
  return { sheet: 'Guest_360', ready: true };
}

function openTryHardGuest360FromActiveRow() {
  var snapshot = TGI.Guest360Service.rebuildFromActiveRow();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Guest_360'));
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Guest 360 rebuilt for ' + (snapshot.guest.full_name || snapshot.guest.guest_id) + '.\nTimeline events: ' + snapshot.event_count, SpreadsheetApp.getUi().ButtonSet.OK);
  return snapshot;
}

function openTryHardGuest360ById(guestId) {
  var snapshot = TGI.Guest360Service.rebuild(guestId);
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Guest_360'));
  return snapshot;
}

function findTryHardGuests(query) {
  return TGI.Guest360Service.find(query);
}

function getTryHardGuestTimeline(guestId, limit) {
  return TGI.GuestTimelineService.timeline(guestId, { limit: Number(limit || 200) });
}

function getTryHardGuestSnapshot(guestId) {
  return TGI.GuestTimelineService.snapshot(guestId);
}