const TRANSACTION_TYPES = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT'
};

const CLASSIFICATIONS = {
  SAIDA: 'Saída',
  ENTRADA: 'Entrada'
};

const ACCOUNT_TYPES = {
  BANK: 'BANK',
  CREDIT: 'CREDIT'
};

const ACCOUNT_TYPE_LABELS = {
  BANK: 'Conta Corrente',
  CREDIT: 'Cartão de Crédito'
};

const RECURRING_LABELS = {
  SIM: 'Sim',
  NAO: 'Não'
};

const CSV_HEADER = '"Classificação", "Data", "Descrição", "Valor", "Categoria", "Dono", "Banco", "Conta", "Recorrente?", "Id"';

const BUCKET_NAME = 'olivia-transactions';

module.exports = {
  TRANSACTION_TYPES,
  CLASSIFICATIONS,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  RECURRING_LABELS,
  CSV_HEADER,
  BUCKET_NAME
}; 