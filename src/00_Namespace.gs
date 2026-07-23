var TGI = TGI || {};

TGI.VERSION = '0.1.0';
TGI.APP_NAME = 'TryHard Guest Intelligence';
TGI.PROPERTY_KEYS = Object.freeze({
  WORKBOOK_ID: 'TGI_WORKBOOK_ID',
  INSTALLED_AT: 'TGI_INSTALLED_AT',
  SCHEMA_VERSION: 'TGI_SCHEMA_VERSION'
});

TGI.Enums = Object.freeze({
  STATUS: Object.freeze({ ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', ARCHIVED: 'ARCHIVED' }),
  CONSENT: Object.freeze({ YES: 'YES', NO: 'NO', UNKNOWN: 'UNKNOWN' }),
  SOURCE: Object.freeze({ FORM: 'FORM', MANUAL: 'MANUAL', IMPORT: 'IMPORT', SYSTEM: 'SYSTEM' })
});