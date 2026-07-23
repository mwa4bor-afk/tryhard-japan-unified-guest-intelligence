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
    .addItem('Initialize enterprise operations', 'initializeTryHardEnterpriseOperations')
    .addItem('Rebuild executive operations dashboard', 'rebuildTryHardEnterpriseDashboard')
    .addItem('Show enterprise operations summary', 'showTryHardEnterpriseSummary')
    .addSeparator()
    .addItem('Generate guest intelligence', 'generateTryHardGuestIntelligence')
    .addItem('Show guest segment summary', 'showTryHardSegmentSummary')
    .addItem('Install scheduled automations', 'installTryHardAutomations')
    .addSeparator()
    .addItem('Rebuild admin console', 'rebuildTryHardAdminConsole')
    .addItem('Create workbook backup', 'createTryHardBackup')
    .addItem('Review retention candidates', 'reviewTryHardRetention')
    .addItem('Show access roles', 'showTryHardAccessRoles')
    .addSeparator()
    .addItem('Run production smoke test', 'runTryHardSmokeTest')
    .addItem('Seed demonstration data', 'seedTryHardTestData')
    .addItem('Show runtime configuration', 'showTryHardConfiguration')
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
  TGI.AccessControlService.bootstrap();
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
  var lines = Object.keys(registry).sort().map(function (key) { return registry[key].title + '\nPublic: ' + registry[key].publishedUrl + '\nEdit: ' + registry[key].editUrl; });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, lines.length ? lines.join('\n\n') : 'No forms are registered. Create the forms first.', SpreadsheetApp.getUi().ButtonSet.OK);
  return registry;
}

function rebuildTryHardDashboards() {
  var report = TGI.DashboardService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Dashboards rebuilt.\nGuests: ' + report.snapshot.total_guests + '\nStays: ' + report.snapshot.total_stays + '\nNPS: ' + report.snapshot.nps.toFixed(1), SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function showTryHardKpiSnapshot() {
  var kpi = TGI.KpiService.snapshot();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Guests: ' + kpi.total_guests + '\nStays: ' + kpi.total_stays + '\nTotal spend: ¥' + Math.round(kpi.total_spend).toLocaleString() + '\nAverage rating: ' + kpi.average_rating.toFixed(2) + '\nNPS: ' + kpi.nps.toFixed(1) + '\nRecovery rate: ' + (kpi.service_recovery_rate * 100).toFixed(1) + '%\nOpen tasks: ' + kpi.open_tasks + '\nOverdue tasks: ' + kpi.overdue_tasks, SpreadsheetApp.getUi().ButtonSet.OK);
  return kpi;
}

function initializeTryHardEnterpriseOperations() {
  TGI.LocationService.ensureSheet();
  TGI.StaffService.ensureSheet();
  TGI.ReservationImportService.ensureSheets();
  var report = TGI.EnterpriseReportingService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Enterprise operations initialized.\nLocations: ' + report.locations + '\nStaff: ' + report.staff + '\nReservations: ' + report.reservations, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function rebuildTryHardEnterpriseDashboard() {
  var report = TGI.EnterpriseReportingService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Executive operations dashboard rebuilt.\nLocations: ' + report.locations + '\nStaff: ' + report.staff + '\nReservations: ' + report.reservations, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function showTryHardEnterpriseSummary() {
  TGI.AccessControlService.requirePermission('reports.view');
  var locations = TGI.LocationService.all();
  var staff = TGI.StaffService.all();
  var reservations = TGI.ReservationImportService.all();
  var value = reservations.reduce(function (sum, row) { return sum + Number(row.total_value || 0); }, 0);
  var summary = { locations: locations.length, active_locations: TGI.LocationService.active().length, staff: staff.length, reservations: reservations.length, reservation_value: value };
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Locations: ' + summary.locations + '\nActive locations: ' + summary.active_locations + '\nStaff: ' + summary.staff + '\nReservations: ' + summary.reservations + '\nReservation value: ¥' + Math.round(summary.reservation_value).toLocaleString(), SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}

function generateTryHardGuestIntelligence() {
  var insights = TGI.GuestIntelligenceService.generateAll();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, insights.length + ' guest insights generated or refreshed.', SpreadsheetApp.getUi().ButtonSet.OK);
  return insights;
}

function showTryHardSegmentSummary() {
  var summary = TGI.GuestSegmentationService.summary();
  var lines = Object.keys(summary).sort().map(function (segment) { return segment + ': ' + summary[segment]; });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, lines.length ? lines.join('\n') : 'No guests available for segmentation.', SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}

function installTryHardAutomations() {
  var triggers = TGI.AutomationService.install();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, triggers.length + ' scheduled automation triggers installed.', SpreadsheetApp.getUi().ButtonSet.OK);
  return triggers;
}

function rebuildTryHardAdminConsole() {
  var report = TGI.AdminConsoleService.rebuild();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Admin console rebuilt.\nRetention candidates: ' + report.privacy_candidates + '\nAuthorized users: ' + report.roles.length, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function createTryHardBackup() {
  var backup = TGI.BackupService.createSnapshot();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Backup created:\n' + backup.name + '\n' + backup.url, SpreadsheetApp.getUi().ButtonSet.OK);
  return backup;
}

function reviewTryHardRetention() {
  var report = TGI.PrivacyService.review();
  var lines = report.candidates.slice(0, 20).map(function (item) { return item.guest_id + ' — ' + item.last_activity; });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Retention period: ' + report.retention_days + ' days\nCandidates: ' + report.candidates.length + (lines.length ? '\n\n' + lines.join('\n') : ''), SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function showTryHardAccessRoles() {
  var roles = TGI.AccessControlService.summary();
  var lines = roles.map(function (entry) { return entry.email + ': ' + entry.role; });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, lines.length ? lines.join('\n') : 'No access roles configured.', SpreadsheetApp.getUi().ButtonSet.OK);
  return roles;
}

function runTryHardSmokeTest() {
  var report = TGI.SmokeTestService.run();
  var failures = report.tests.filter(function (test) { return !test.passed; }).map(function (test) { return test.name; });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, (report.passed ? 'Smoke test passed.' : 'Smoke test failed.') + '\nPassed: ' + report.passed_count + '/' + report.total + (failures.length ? '\nFailures: ' + failures.join(', ') : ''), SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function seedTryHardTestData() {
  var result = TGI.TestDataService.seed();
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, result.guest_ids.length + ' demonstration guests created.', SpreadsheetApp.getUi().ButtonSet.OK);
  return result;
}

function showTryHardConfiguration() {
  var validation = TGI.ConfigService.validate();
  var lines = Object.keys(validation.values).sort().map(function (key) { return key + ': ' + validation.values[key]; });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Valid: ' + validation.valid + '\n\n' + lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
  return validation;
}

function validateTryHardInstallation() {
  var report = TGI.DataIntegrityService.validate();
  var registry = TGI.FormBuilder.getRegistry();
  var triggerCount = TGI.TriggerManager.listManagedTriggers().length;
  var automationCount = TGI.AutomationService.list().length;
  var config = TGI.ConfigService.validate();
  var roles = TGI.AccessControlService.summary();
  var message = (report.valid ? 'Workbook data integrity is valid.' : 'Workbook integrity issues were found.') + '\nConfiguration valid: ' + config.valid + '\nRegistered forms: ' + Object.keys(registry).length + '\nManaged form triggers: ' + triggerCount + '\nScheduled automations: ' + automationCount + '\nAuthorized users: ' + roles.length;
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, message, SpreadsheetApp.getUi().ButtonSet.OK);
  return { valid: report.valid && config.valid, integrity: report, configuration: config, formCount: Object.keys(registry).length, triggerCount: triggerCount, automationCount: automationCount, accessRoles: roles };
}

function runTryHardIntegrityCheck() {
  var report = TGI.DataIntegrityService.validate();
  var summary = report.summary;
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Valid: ' + report.valid + '\nMissing sheets: ' + summary.missing_sheets + '\nHeader mismatches: ' + summary.header_mismatches + '\nDuplicate keys: ' + summary.duplicate_primary_keys + '\nOrphan references: ' + summary.orphaned_guest_references + '\nInvalid guests: ' + summary.invalid_guest_records, SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

function showTryHardDuplicateCandidates() {
  var candidates = TGI.DuplicateDetectionService.candidates(TGI.ConfigService.getNumber('DUPLICATE_SCORE_THRESHOLD'));
  var lines = candidates.slice(0, 20).map(function (candidate) { return candidate.score + '% — ' + candidate.primary_candidate_id + ' / ' + candidate.duplicate_candidate_id + ' (' + candidate.reasons.join(', ') + ')'; });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, lines.length ? lines.join('\n') : 'No duplicate candidates found.', SpreadsheetApp.getUi().ButtonSet.OK);
  return candidates;
}

function addSampleGuest() {
  var guest = TGI.GuestRepository.save({ first_name: 'Sample', last_name: 'Guest', email: 'sample+' + new Date().getTime() + '@example.com', country: 'Japan', language: 'ja', source: TGI.Enums.SOURCE.SYSTEM, notes: 'Generated by the installation smoke test.' });
  SpreadsheetApp.getUi().alert(TGI.APP_NAME, 'Created guest: ' + guest.guest_id, SpreadsheetApp.getUi().ButtonSet.OK);
  return guest;
}