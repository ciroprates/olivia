const categories = require('../categories.json');

function formatAmount(transaction) {
  const amount = transaction.amountInAccountCurrency !== null && transaction.amountInAccountCurrency !== undefined 
    ? transaction.amountInAccountCurrency 
    : transaction.amount;
    
  return Math.abs(amount).toFixed(2);
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatAccountType(accountType) {
  return accountType === 'BANK' ? 'Conta Corrente' : 'Cartão de Crédito';
}

function _isRecurringTransaction(transaction) {
  return transaction.creditCardMetadata && transaction.creditCardMetadata.totalInstallments > 1;
}

function formatRecurringTransaction(transaction) {
  return _isRecurringTransaction(transaction) ? 'Sim' : 'Não';
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
  return `${names[0]} ${names[names.length - 1]}`;
}

module.exports = {
  formatAmount,
  formatDate,
  formatAccountType,
  formatRecurringTransaction,
  formatDescription,
  formatOwner,
  formatCategory
}; 