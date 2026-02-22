require('dotenv').config();

const { banks: defaultBanks, options: defaultOptions } = require('../../config');
const TransactionService = require('../services/transactionService');
const { generateCSV, getTransactionsArray } = require('../utils/csvUtils');
const { updateSheet } = require('../services/googleSheetsService');

const transactionService = new TransactionService(
  process.env.PLUGGY_CLIENT_ID,
  process.env.PLUGGY_CLIENT_SECRET
);

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeBankEntry(entry, fallbackOwner = 'Env') {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const id = String(entry.id || '').trim();
  if (!id) {
    return null;
  }

  const nameRaw = entry.name;
  const ownerRaw = entry.owner;

  const name = nameRaw === undefined || nameRaw === null || String(nameRaw).trim().length === 0
    ? id
    : String(nameRaw).trim();

  const owner = ownerRaw === undefined || ownerRaw === null || String(ownerRaw).trim().length === 0
    ? fallbackOwner
    : String(ownerRaw).trim();

  return { id, name, owner };
}

function parseBanksJsonEnv() {
  const rawBanksJson = process.env.BANKS_JSON;
  if (rawBanksJson === undefined) {
    return [];
  }

  const normalizedRaw = String(rawBanksJson).trim();
  if (normalizedRaw.length === 0) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(normalizedRaw);
  } catch (error) {
    console.warn('BANKS_JSON inválido: não foi possível fazer parse do JSON. Ignorando variável.');
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn('BANKS_JSON inválido: o valor deve ser um array JSON. Ignorando variável.');
    return [];
  }

  return parsed
    .map((entry) => normalizeBankEntry(entry, 'Env'))
    .filter(Boolean);
}

function parseCsvEnv(name) {
  const raw = process.env[name];
  if (raw === undefined) {
    return { defined: false, value: [] };
  }

  const value = String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return { defined: true, value };
}

function parseBooleanEnv(name) {
  const raw = process.env[name];
  if (raw === undefined) {
    return { defined: false, value: null };
  }

  const normalized = String(raw).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return { defined: true, value: true };
  }

  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return { defined: true, value: false };
  }

  return { defined: false, value: null };
}

function parseStartDateEnv() {
  const raw = process.env.OPTIONS_START_DATE;
  if (raw === undefined) {
    return { defined: false, value: null };
  }

  const normalized = String(raw).trim();
  if (normalized.length === 0 || normalized.toLowerCase() === 'null') {
    return { defined: true, value: null };
  }

  return { defined: true, value: normalized };
}

function mergeOptions(overrideOptions = {}) {
  return {
    ...defaultOptions,
    ...overrideOptions
  };
}

function mapBanksByIds(bankIds, fallbackOwner = 'Payload') {
  const defaultBanksById = new Map(defaultBanks.map((bank) => [bank.id, bank]));

  return bankIds.map((bankId) => {
    const normalizedId = String(bankId).trim();
    const fromConfig = defaultBanksById.get(normalizedId);
    if (fromConfig) {
      return fromConfig;
    }

    return {
      id: normalizedId,
      name: normalizedId,
      owner: fallbackOwner
    };
  });
}

function resolveBanks(bankIds) {
  if (Array.isArray(bankIds)) {
    return mapBanksByIds(bankIds, 'Payload');
  }

  const envBanksJson = parseBanksJsonEnv();
  if (envBanksJson.length > 0) {
    return envBanksJson;
  }

  return defaultBanks;
}

function resolveOptions(payloadOptions = {}) {
  const options = mergeOptions();
  const envStartDate = parseStartDateEnv();
  const envExcludeCategories = parseCsvEnv('OPTIONS_EXCLUDE_CATEGORIES');

  if (envStartDate.defined) {
    options.startDate = envStartDate.value;
  }
  if (envExcludeCategories.defined) {
    options.excludeCategories = envExcludeCategories.value;
  }

  if (payloadOptions && typeof payloadOptions === 'object') {
    if (hasOwn(payloadOptions, 'startDate')) {
      options.startDate = payloadOptions.startDate;
    }
    if (hasOwn(payloadOptions, 'excludeCategories')) {
      options.excludeCategories = payloadOptions.excludeCategories;
    }
  }

  return options;
}

function resolveSheet(payloadSheet = {}) {
  const sheet = {
    enabled: true,
    spreadsheetId: null,
    tabName: 'Homologação'
  };

  const envSheetEnabled = parseBooleanEnv('SHEET_ENABLED');
  if (envSheetEnabled.defined) {
    sheet.enabled = envSheetEnabled.value;
  }

  if (process.env.SHEET_SPREADSHEET_ID) {
    sheet.spreadsheetId = process.env.SHEET_SPREADSHEET_ID;
  } else if (process.env.GOOGLE_SPREADSHEET_ID) {
    sheet.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  }

  if (process.env.SHEET_TAB_NAME) {
    sheet.tabName = process.env.SHEET_TAB_NAME;
  }

  if (payloadSheet && typeof payloadSheet === 'object') {
    if (hasOwn(payloadSheet, 'enabled')) {
      sheet.enabled = payloadSheet.enabled;
    }
    if (hasOwn(payloadSheet, 'spreadsheetId')) {
      sheet.spreadsheetId = payloadSheet.spreadsheetId;
    }
    if (hasOwn(payloadSheet, 'tabName')) {
      sheet.tabName = payloadSheet.tabName;
    }
  }

  return sheet;
}

function resolveArtifacts(payloadArtifacts = {}) {
  const artifacts = {
    csvEnabled: false
  };

  const envCsvEnabled = parseBooleanEnv('ARTIFACTS_CSV_ENABLED');
  if (envCsvEnabled.defined) {
    artifacts.csvEnabled = envCsvEnabled.value;
  }

  if (payloadArtifacts && typeof payloadArtifacts === 'object' && hasOwn(payloadArtifacts, 'csvEnabled')) {
    artifacts.csvEnabled = payloadArtifacts.csvEnabled;
  }

  return artifacts;
}

async function runTransactionExecution(params = {}, onProgress = () => {}) {
  const banks = resolveBanks(params.banks);
  const options = resolveOptions(params.options);
  const sheet = resolveSheet(params.sheet);
  const artifacts = resolveArtifacts(params.artifacts);
  const isCsvEnabled = artifacts.csvEnabled === true;

  if (banks.length === 0) {
    throw new Error('Nenhum banco válido foi informado para execução');
  }

  onProgress({ step: 'FETCHING_TRANSACTIONS', progress: 20 });
  const transactions = await transactionService.fetchTransactions(banks, options);

  onProgress({ step: 'CREATING_INSTALLMENTS', progress: 45 });
  const transactionsWithInstallments = transactionService.createInstallmentTransactions(transactions);

  onProgress({ step: 'DEDUPLICATING', progress: 65 });
  const { result: deduplicatedTransactions, removed } = await transactionService.deduplicateTransactions(transactionsWithInstallments);

  let removedCsvPath = null;
  let csvPath = null;
  if (isCsvEnabled) {
    onProgress({ step: 'GENERATING_CSV', progress: 85 });
    csvPath = generateCSV(deduplicatedTransactions);

    if (removed && removed.length > 0) {
      removedCsvPath = generateCSV(removed, { prefix: 'transactions_removed' });
    }
  }

  const isSheetEnabled = sheet.enabled === true;
  const spreadsheetId = sheet.spreadsheetId || null;
  const tabName = sheet.tabName || 'Homologação';

  if (isSheetEnabled && spreadsheetId) {
    onProgress({ step: 'UPDATING_SHEET', progress: 95 });
    const sheetData = getTransactionsArray(deduplicatedTransactions);
    await updateSheet(spreadsheetId, tabName, sheetData);
  }

  onProgress({ step: 'FINALIZING', progress: 99 });

  return {
    metrics: {
      transactionsFetched: transactions.length,
      installmentsCreated: transactionsWithInstallments.length - transactions.length,
      duplicatesRemoved: removed.length
    },
    artifacts: {
      csvEnabled: isCsvEnabled,
      csvPath,
      removedCsvPath
    }
  };
}

module.exports = {
  runTransactionExecution,
  resolveBanks,
  mergeOptions
};
