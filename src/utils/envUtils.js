const EXPECTED_ENV_VARS = [
  'PLUGGY_CLIENT_ID',
  'PLUGGY_CLIENT_SECRET',
  'BANKS_JSON',
  'OPTIONS_START_DATE',
  'OPTIONS_EXCLUDE_CATEGORIES',
  'SHEET_ENABLED',
  'SHEET_SPREADSHEET_ID',
  'SHEET_TAB_NAME',
  'ARTIFACTS_CSV_ENABLED',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_SPREADSHEET_ID'
];

function hasMissingValue(name) {
  const value = process.env[name];
  return value === undefined || String(value).trim() === '';
}

function logMissingEnvVars() {
  const missing = EXPECTED_ENV_VARS.filter(hasMissingValue);

  if (missing.length === 0) {
    console.log('[ENV] Todas as variaveis esperadas possuem valor.');
    return;
  }

  console.warn('[ENV] Variaveis sem valor no .env:', missing.join(', '));
}

module.exports = {
  logMissingEnvVars
};
