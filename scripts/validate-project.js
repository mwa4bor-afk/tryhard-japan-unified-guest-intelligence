#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }
function read(file) { return fs.readFileSync(file, 'utf8'); }

if (!fs.existsSync(src)) fail('Missing src directory.');

const requiredFiles = [
  'appsscript.json',
  '00_Namespace.gs',
  '01_Utilities.gs',
  '02_Schema.gs',
  '07_MenuAndEntrypoints.gs',
  '10_FormResponseRouter.gs',
  '22_DataIntegrityService.gs',
  '24_DashboardService.gs',
  '27_AutomationService.gs',
  '30_SmokeTestService.gs',
  '31_AccessControlService.gs',
  '39_IntegrationRegistryService.gs',
  '56_DomainEventService.gs',
  '61_LoyaltyProgramService.gs',
  '66_RevenueDemandService.gs',
  '70_PmsAdapterRegistryService.gs',
  '75_RecommendationPolicyService.gs',
  '79_PlatformHealthService.gs',
  '83_EnvironmentConfigService.gs',
  '84_SchemaMigrationService.gs',
  '85_ReleaseGovernanceService.gs',
  '87_ValidationService.gs',
  '88_ValidationEntrypoints.gs'
];

requiredFiles.forEach((name) => {
  if (!fs.existsSync(path.join(src, name))) fail(`Missing required source file: src/${name}`);
});

const manifestPath = path.join(src, 'appsscript.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(read(manifestPath));
    if (manifest.runtimeVersion !== 'V8') fail('appsscript.json must use runtimeVersion V8.');
    if (manifest.timeZone !== 'Asia/Tokyo') warn('Manifest timezone is not Asia/Tokyo.');
    const scopes = manifest.oauthScopes || [];
    [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/forms'
    ].forEach((scope) => {
      if (!scopes.includes(scope)) fail(`Missing OAuth scope: ${scope}`);
    });
  } catch (error) {
    fail(`Invalid appsscript.json: ${error.message}`);
  }
}

if (fs.existsSync(src)) {
  const files = fs.readdirSync(src).filter((name) => /\.(gs|js|json)$/.test(name)).sort();
  const scriptFiles = files.filter((name) => /\.(gs|js)$/.test(name));
  const combined = scriptFiles.map((name) => read(path.join(src, name))).join('\n');

  scriptFiles.forEach((name) => {
    const text = read(path.join(src, name));
    try {
      new vm.Script(text, { filename: `src/${name}` });
    } catch (error) {
      fail(`JavaScript syntax error in src/${name}: ${error.message}`);
    }
  });

  const uniqueEntrypoints = [
    'onOpen',
    'onUnifiedFormSubmit',
    'installTryHardGuestIntelligence',
    'runTryHardPlatformValidation'
  ];
  uniqueEntrypoints.forEach((fn) => {
    const matches = combined.match(new RegExp(`function\\s+${fn}\\s*\\(`, 'g')) || [];
    if (matches.length !== 1) fail(`Expected exactly one ${fn} function; found ${matches.length}.`);
  });

  const forbidden = [
    /AKIA[0-9A-Z]{16}/,
    /AIza[0-9A-Za-z\-_]{35}/,
    /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /scriptId"\s*:\s*"(?!REPLACE_WITH_)[^"]+"/
  ];
  forbidden.forEach((pattern) => {
    if (pattern.test(combined)) fail(`Possible credential or project identifier detected: ${pattern}`);
  });

  const assignments = {};
  scriptFiles.forEach((name) => {
    const text = read(path.join(src, name));
    const regex = /TGI\.([A-Za-z0-9_]+)\s*=\s*/g;
    let match;
    while ((match = regex.exec(text))) {
      const service = match[1];
      assignments[service] = assignments[service] || [];
      assignments[service].push(name);
    }
  });
  Object.keys(assignments).forEach((service) => {
    if (assignments[service].length > 1) {
      fail(`TGI.${service} is assigned in multiple files: ${assignments[service].join(', ')}`);
    }
  });

  const requiredServices = [
    'Util', 'AuditLog', 'AccessControlService', 'IntegrationRegistryService',
    'DomainEventService', 'LoyaltyProgramService', 'RevenueDemandService',
    'PmsSyncService', 'RecommendationEngineService', 'PlatformHealthService',
    'EnvironmentConfigService', 'SchemaMigrationService',
    'ReleaseGovernanceService', 'ValidationService'
  ];
  requiredServices.forEach((service) => {
    if (!assignments[service]) fail(`Missing namespace assignment for TGI.${service}.`);
  });

  scriptFiles.forEach((name) => {
    const text = read(path.join(src, name));
    if (/\beval\s*\(/.test(text)) warn(`Use of eval detected in src/${name}.`);
    if (/console\.log\s*\(/.test(text)) warn(`console.log detected in src/${name}; prefer structured audit logging for production paths.`);
  });
}

warnings.forEach((message) => console.warn(`WARNING: ${message}`));
errors.forEach((message) => console.error(`ERROR: ${message}`));

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(`Validation passed across repository structure and JavaScript syntax${warnings.length ? ` with ${warnings.length} warning(s)` : ''}.`);