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

function formatRecurringTransaction(transaction) {
  const totalInstallments = transaction.creditCardMetadata && transaction.creditCardMetadata.totalInstallments;
  return totalInstallments > 1 ? 'Sim' : 'Não';
}

function formatDescription(transaction, recurringTransaction) {
  const description = transaction.description;
  if (recurringTransaction === 'Sim' && transaction.creditCardMetadata) {
    const installmentSufix = `${transaction.creditCardMetadata.installmentNumber}/${transaction.creditCardMetadata.totalInstallments}`;
    if (!description.includes(installmentSufix)) {
      return `${description} - ${installmentSufix}`;  
    }
  }
  return description;
}



module.exports = {
  formatAmount,
  formatDate,
  formatAccountType,
  formatRecurringTransaction,
  formatDescription
}; 