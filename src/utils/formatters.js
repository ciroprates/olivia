const categories = require('../categories.json');
const { ACCOUNT_TYPE_LABELS, RECURRING_LABELS, TRANSACTION_TYPES, CLASSIFICATIONS } = require('../constants');

/**
 * Formata uma data, tratando especialmente transações parceladas no cartão de crédito 
 * @param {Object} transaction - Objeto da transação contendo metadados
 * @returns {string} Data formatada no formato YYYY/MM/DD
 */
function formatDate(transaction) {

  const transactionDate = new Date(transaction.date);  
  let d = transactionDate;

  // Se a transação for parcelada no cartão de crédito, usa a data de compra
  if (transaction.creditCardMetadata && transaction.creditCardMetadata.purchaseDate) {
    const purchaseDate = new Date(transaction.creditCardMetadata.purchaseDate);
    if (purchaseDate < transactionDate) {
      d = purchaseDate;
    }
  }

  let month = d.getMonth() + 1; // getMonth() retorna 0-11, então somamos 1
  let year = d.getFullYear();
  
  // Verifica se é uma transação parcelada no cartão de crédito
  if (transaction.creditCardMetadata && transaction.creditCardMetadata.installmentNumber > 1) {    
    // Calcula o incremento de meses baseado no número da parcela atual
    // Subtraímos 1 porque a primeira parcela já está na data original
    let monthIncrement = transaction.creditCardMetadata.installmentNumber - 1;
    // Soma o incremento ao mês atual para obter o mês correto da parcela
    month += monthIncrement;
    // Se a soma dos meses ultrapassar dezembro, ajusta para o próximo ano
    if (month > 12) {
      year++; // Incrementa o ano
      month -= 12; // Ajusta o mês      
    }     
  }    
  // Retorna a data no formato YYYY/MM/DD para transações não parceladas
  return `${year}/${month}/${d.getDate()}`;
}

function formatAmount(transaction) {
  const amount = transaction.amountInAccountCurrency !== null && transaction.amountInAccountCurrency !== undefined 
    ? transaction.amountInAccountCurrency 
    : transaction.amount;
    
  return Math.abs(amount).toFixed(2);
}

function formatAccountType(accountType) {
  return ACCOUNT_TYPE_LABELS[accountType];
}

function formatClassification(transactionType) {
  return transactionType === TRANSACTION_TYPES.DEBIT ? CLASSIFICATIONS.SAIDA : CLASSIFICATIONS.ENTRADA;
}

function _isRecurringTransaction(transaction) {
  return transaction.creditCardMetadata && transaction.creditCardMetadata.totalInstallments > 1;
}

function formatRecurringTransaction(transaction) {
  return _isRecurringTransaction(transaction) ? RECURRING_LABELS.SIM : RECURRING_LABELS.NAO;
}

function formatDescription(transaction) {
  let description = transaction.description;
  
  // Adiciona informação de parcelas para transações recorrentes
  if (_isRecurringTransaction(transaction)) {
    const installmentSufix = `${transaction.creditCardMetadata.installmentNumber}/${transaction.creditCardMetadata.totalInstallments}`;
    if (!description.includes(installmentSufix)) {
      description = `${description} - ${installmentSufix}`;  
    }
  }

  // Adiciona nome do pagador se existir
  const payerName = transaction.paymentData && transaction.paymentData.payer && transaction.paymentData.payer.name;
  if (payerName) {
    description = `${description} - ${payerName}`;
  }

  return description;
}

function formatCategory(category) {
  if (!category) return '';
  
  // Procura a categoria no mapeamento
  for (const [mappedCategory, values] of Object.entries(categories)) {
    if (values.includes(category)) {
      return mappedCategory;
    }
  }
  
  return category;
}

function formatOwner(owner) {
  const names = owner.split(' ');
  const formatName = (name) => {
    if (name === name.toUpperCase()) {
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    return name;
  };
  
  return `${formatName(names[0])}`;
}

module.exports = {
  formatDate,
  formatAmount,
  formatAccountType,
  formatRecurringTransaction,
  formatDescription,
  formatOwner,
  formatCategory,
  formatClassification
}; 