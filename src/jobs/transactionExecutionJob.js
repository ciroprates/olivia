require('dotenv').config();

const { banks: defaultBanks, options: defaultOptions } = require('../../config');
const TransactionService = require('../services/transactionService');
const { generateCSV, getTransactionsArray } = require('../utils/csvUtils');
const { updateSheet } = require('../services/googleSheetsService');

const transactionService = new TransactionService(
  process.env.PLUGGY_CLIENT_ID,
  process.env.PLUGGY_CLIENT_SECRET
);

function mergeOptions(overrideOptions = {}) {
  return {
    ...defaultOptions,
    ...overrideOptions
  };
}

function resolveBanks(bankIds) {
  if (!Array.isArray(bankIds) || bankIds.length === 0) {
    return defaultBanks;
  }

  return defaultBanks.filter((bank) => bankIds.includes(bank.id));
}

async function runTransactionExecution(params = {}, onProgress = () => {}) {
  const banks = resolveBanks(params.banks);
  const options = mergeOptions(params.options);
  const sheet = params.sheet || {};

  if (banks.length === 0) {
    throw new Error('Nenhum banco válido foi informado para execução');
  }

  onProgress({ step: 'FETCHING_TRANSACTIONS', progress: 20 });
  const transactions = await transactionService.fetchTransactions(banks, options);

  onProgress({ step: 'CREATING_INSTALLMENTS', progress: 45 });
  const transactionsWithInstallments = transactionService.createInstallmentTransactions(transactions);

  onProgress({ step: 'DEDUPLICATING', progress: 65 });
  const { result: deduplicatedTransactions, removed } = await transactionService.deduplicateTransactions(transactionsWithInstallments);

  onProgress({ step: 'GENERATING_CSV', progress: 85 });
  const csvPath = generateCSV(deduplicatedTransactions);

  let removedCsvPath = null;
  if (removed && removed.length > 0) {
    removedCsvPath = generateCSV(removed, { prefix: 'transactions_removed' });
  }

  const isSheetEnabled = sheet.enabled === true;
  const spreadsheetId = sheet.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID;
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
