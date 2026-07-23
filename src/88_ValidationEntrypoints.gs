function initializeTryHardValidation() {
  TGI.AccessControlService.requirePermission('validation.run');
  TGI.ValidationService.ensureSheet();
  return { initialized: true };
}

function runTryHardPlatformValidation() {
  return TGI.ValidationService.run();
}

function showTryHardValidationSummary() {
  TGI.AccessControlService.requirePermission('validation.view');
  var results = TGI.ValidationService.latest();
  var summary = results.reduce(function (acc, item) {
    acc.total += 1;
    if (item.status === 'PASS') acc.passed += 1;
    else if (item.status === 'WARN') acc.warnings += 1;
    else if (item.status === 'FAIL') acc.failures += 1;
    return acc;
  }, { total: 0, passed: 0, warnings: 0, failures: 0 });
  SpreadsheetApp.getUi().alert('TryHard Validation', JSON.stringify(summary, null, 2), SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}