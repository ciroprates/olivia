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
  const payerName = (transaction.paymentData && transaction.paymentData.payer && transaction.paymentData.payer.name) || '';
  return `${transaction.description}${recurringTransaction ? ` (${recurringTransaction})` : ''}${payerName ? ` - ${payerName}` : ''}`;
}

function formatOwner(owner) { 
  
  const names = owner.trim().split(/\s+/);
  if (names.length <= 1) return owner;
  
  return `${names[0]} ${names[names.length - 1]}`;
}

module.exports = {
  formatAmount,
  formatDate,
  formatAccountType,
  formatRecurringTransaction,
  formatDescription,
  formatOwner
}; 