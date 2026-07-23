function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(TGI.APP_NAME)
    .addItem('Install / repair workbook', 'installTryHardGuestIntelligence')
    .addSeparator()
    .addItem('Create / repair all five forms', 'createTryHardForms')
    .addItem('Install form-submit triggers', 'installTryHardFormTriggers')
    .addItem('Show form links', 'showTryHardFormLinks')
    .addSeparator()
    .addItem('Rebuild management dashboards', 'rebuildTryHardDashboards')
    .addItem('Show KPI snapshot', 'showTryHardKpiSnapshot')
    .addSeparator()
    .addItem('Run data-integrity check', 'runTryHardIntegrityCheck')
    .addItem('Find duplicate guest candidates', 'showTryHardDuplicateCandidates')
    .addSeparator()
    .addItem('Add sample guest', 'addSampleGuest')
    .addItem('Validate installation', 'validateTryHardInstallation')
    .addToUi();
}

function installTryHardGuestIntelligence() {
  var result = TGI.WorkbookInstaller.install();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Installation complete.\nSchema version: ' + result.schemaVersion, SpreadsheetApp.getUi().ButtonSet.OK);
  return result;
}

function createTryHardForms() {
  TGI.WorkbookInstaller.install();
  var forms = TGI.FormBuilder.createAll();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, forms.length + ' forms are ready. Install the form-submit triggers next.', SpreadsheetApp.getUi().ButtonSet.OK);
  return forms;
}

function installTryHardFormTriggers() {
  var triggers = TGI.TriggerManager.installFormSubmitTriggers();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, triggers.length + ' form-submit triggers installed.', SpreadsheetApp.getUi().ButtonSet.OK);
  return triggers;
}

function showTryHardFormLinks() {
  var registry = TGI.FormBuilder.getRegistry();
  var lines = Object.keys(registry).sort().map(function (key) {
    return registry[key].title + '\nPublic: ' + registry[key].publishedUrl + '\nEdit: ' + registry[key].editUrl;
  });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, lines.length ? lines.join('\n\n') : 'No forms are registered. Create the forms first.', SpreadsheetApp.getUi().ButtonSet.OK);
  return registry;
}

function rebuildTryHardDashboards() {
  var report = TGI.DashboardService.rebuild();
  SpreadsheetApp.getUi().alert(
    TGI.APP_NAME,
    'Dashboards rebuilt.\nGuests: ' + report.snapshot.total_guests +
      '\nStays: ' + report.snapshot.total_stays +
      '\nNPS: ' + report.snapshot.nps.toFixed(1),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return report;
}

function showTryHardKpiSnapshot() {
  var kpi = TGI.KpiService.snapshot();
  SpreadsheetApp.getUi().alert(
    TGI.APP_NAME,
    'Guests: ' + kpi.total_guests +
      '\nStays: ' + kpi.total_stays +
      '\nTotal spend: ¥' + Math.round(kpi.total_spend).toLocaleString() +
      '\nAverage rating: ' + kpi.average_rating.toFixed(2) +
      '\nNPS: ' + kpi.nps.toFixed(1) +
      '\nRecovery rate: ' + (kpi.service_recovery_rate * 100).toFixed(1) + '%' +
      '\nOpen tasks: ' + kpi.open_tasks +
      '\nOverdue tasks: ' + kpi.overdue_tasks,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return kpi;
}

function validateTryHardInstallation() {
  var report = TGI.DataIntegrityService.validate();
  var registry = TGI.FormBuilder.getRegistry();
  var triggerCount = TGI.TriggerManager.listManagedTriggers().length;
  var message = (report.valid ? 'Workbook data integrity is valid.' : 'Workbook integrity issues were found.') +
    '\nRegistered forms: ' + Object.keys(registry).length + '\nManaged form triggers: ' + triggerCount;
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, message, SpreadsheetApp.getUi().ButtonSet.OK);
  return { valid: report.valid, integrity: report, formCount: Object.keys(registry).length, triggerCount: triggerCount };
}

function runTryHardIntegrityCheck() {
  var report = TGI.DataIntegrityService.validate();
  var summary = report.summary;
  SpreadsheetApp.getUi().alert(
    TGI.APP_NAME,
    'Valid: ' + report.valid + '\nMissing sheets: ' + summary.missing_sheets +
      '\nHeader mismatches: ' + summary.header_mismatches + '\nDuplicate keys: ' + summary.duplicate_primary_keys +
      '\nOrphan references: ' + summary.orphaned_guest_references + '\nInvalid guests: ' + summary.invalid_guest_records,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return report;
}

function showTryHardDuplicateCandidates() {
  var candidates = TGI.DuplicateDetectionService.candidates(60);
  var lines = candidates.slice(0, 20).map(function (candidate) {
    return candidate.score + '% — ' + candidate.primary_candidate_id + ' / ' + candidate.duplicate_candidate_id + ' (' + candidate.reasons.join(', ') + ')';
  });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, lines.length ? lines.join('\n') : 'No duplicate candidates found at the 60% threshold.', SpreadsheetApp.getUi().ButtonSet.OK);
  return candidates;
}

function addSampleGuest() {
  var guest = TGI.GuestRepository.save({
    first_name: 'Sample', last_name: 'Guest', email: 'sample+' + new Date().getTime() + '@example.com',
    country: 'Japan', language: 'ja', source: TGI.Enums.SOURCE.SYSTEM,
    notes: 'Generated by the installation smoke test.'
  });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Created guest: ' + guest.guest_id, SpreadsheetApp.getUi().ButtonSet.OK);
  return guest;
}
