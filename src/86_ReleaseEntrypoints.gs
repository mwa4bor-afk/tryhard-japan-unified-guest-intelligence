function initializeTryHardReleaseGovernance() {
  TGI.AccessControlService.requirePermission('release.manage');
  TGI.EnvironmentConfigService.ensureSheet();
  TGI.SchemaMigrationService.ensureSheet();
  TGI.ReleaseGovernanceService.ensureSheet();
  return {
    environment: TGI.EnvironmentConfigService.currentEnvironment(),
    version: TGI.ReleaseGovernanceService.currentVersion(),
    readiness: TGI.ReleaseGovernanceService.readiness()
  };
}

function setTryHardEnvironment(environment) {
  return TGI.EnvironmentConfigService.setEnvironment(environment);
}

function saveTryHardEnvironmentConfig(input) {
  return TGI.EnvironmentConfigService.save(input);
}

function runTryHardSchemaMigrations() {
  return TGI.SchemaMigrationService.runPending();
}

function createTryHardRelease(input) {
  return TGI.ReleaseGovernanceService.create(input);
}

function approveTryHardRelease(releaseId) {
  return TGI.ReleaseGovernanceService.approve(releaseId);
}

function markTryHardReleaseDeployed(releaseId) {
  return TGI.ReleaseGovernanceService.markDeployed(releaseId);
}

function showTryHardReleaseReadiness() {
  TGI.AccessControlService.requirePermission('release.view');
  var report = TGI.ReleaseGovernanceService.readiness();
  SpreadsheetApp.getUi().alert('Release readiness', JSON.stringify(report, null, 2), SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}