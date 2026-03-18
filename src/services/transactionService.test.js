jest.mock('pluggy-sdk', () => ({
  PluggyClient: jest.fn().mockImplementation(() => ({}))
}));

const TransactionService = require('./transactionService');

function makeService() {
  return new TransactionService('id', 'secret');
}

function makeItem(overrides = {}) {
  const tx = {
    id: 'tx-1',
    accountId: 'acc-1',
    amount: 100,
    description: 'AMAZON 01/03',
    descriptionRaw: 'AMAZON 01/03',
    creditCardMetadata: {
      installmentNumber: 1,
      totalInstallments: 3
    },
    ...overrides
  };
  return { transaction: tx };
}

// ─── _adjustInstallmentDescription ───────────────────────────────────────────

describe('_adjustInstallmentDescription', () => {
  const svc = makeService();

  test('substitui número inline (01/03 → 02/03)', () => {
    expect(svc._adjustInstallmentDescription('AMAZON 01/03', 2, 3)).toBe('AMAZON 02/03');
  });

  test('mantém zero-padding quando aplicável', () => {
    expect(svc._adjustInstallmentDescription('AMAZON 01/12', 9, 12)).toBe('AMAZON 09/12');
  });

  test('sem zero-padding quando installmentNumber >= 10', () => {
    expect(svc._adjustInstallmentDescription('AMAZON 01/12', 10, 12)).toBe('AMAZON 10/12');
  });

  test('appenda sufixo quando padrão não encontrado', () => {
    expect(svc._adjustInstallmentDescription('AMAZON', 2, 3)).toBe('AMAZON - 2/3');
  });

  test('retorna descrição sem alteração se sufixo já existe', () => {
    expect(svc._adjustInstallmentDescription('AMAZON - 2/3', 2, 3)).toBe('AMAZON - 2/3');
  });

  test('retorna description sem alteração se for null/undefined', () => {
    expect(svc._adjustInstallmentDescription(null, 2, 3)).toBeNull();
    expect(svc._adjustInstallmentDescription(undefined, 2, 3)).toBeUndefined();
  });

  test('substitui número colado à letra (Sao01/03 → Sao03/03)', () => {
    expect(svc._adjustInstallmentDescription('ALPARGATAS S.A.Sao01/03', 3, 3)).toBe('ALPARGATAS S.A.Sao03/03');
  });
});

// ─── _normalizeInstallmentDescription ────────────────────────────────────────

describe('_normalizeInstallmentDescription', () => {
  const svc = makeService();

  test('remove sufixo inline "AMAZON 01/03" → "AMAZON"', () => {
    expect(svc._normalizeInstallmentDescription('AMAZON 01/03', 3)).toBe('AMAZON');
  });

  test('remove sufixo appended "AMAZON - 1/3" → "AMAZON"', () => {
    expect(svc._normalizeInstallmentDescription('AMAZON - 1/3', 3)).toBe('AMAZON');
  });

  test('funciona com totalInstallments de 2 dígitos (12)', () => {
    expect(svc._normalizeInstallmentDescription('AMAZON 01/12', 12)).toBe('AMAZON');
    expect(svc._normalizeInstallmentDescription('AMAZON 09/12', 12)).toBe('AMAZON');
  });

  test('retorna string vazia se description for falsy', () => {
    expect(svc._normalizeInstallmentDescription(null, 3)).toBe('');
    expect(svc._normalizeInstallmentDescription(undefined, 3)).toBe('');
    expect(svc._normalizeInstallmentDescription('', 3)).toBe('');
  });

  test('remove sufixo colado à letra "ALPARGATAS S.A.Sao01/03" → "ALPARGATAS S.A.Sao"', () => {
    expect(svc._normalizeInstallmentDescription('ALPARGATAS S.A.Sao01/03', 3)).toBe('ALPARGATAS S.A.Sao');
  });
});

// ─── createInstallmentTransactions ───────────────────────────────────────────

describe('createInstallmentTransactions', () => {
  const svc = makeService();

  test('gera sintéticas 2..N quando banco retorna só parcela 1', () => {
    const result = svc.createInstallmentTransactions([makeItem()]);
    expect(result).toHaveLength(3);
    const numbers = result.map(i => i.transaction.creditCardMetadata.installmentNumber);
    expect(numbers).toEqual([1, 2, 3]);
  });

  test('não gera sintética para parcela que já existe como real', () => {
    const items = [
      makeItem(),
      makeItem({ id: 'tx-2', description: 'AMAZON 02/03', descriptionRaw: 'AMAZON 02/03', creditCardMetadata: { installmentNumber: 2, totalInstallments: 3 } })
    ];
    const result = svc.createInstallmentTransactions(items);
    expect(result).toHaveLength(3); // parcela 1 real + parcela 2 real + parcela 3 sintética
    const ids = result.map(i => i.transaction.id);
    expect(ids).toContain('tx-1');
    expect(ids).toContain('tx-2');
    expect(ids).toContain('synthetic-parcel-tx-1-3/3');
    expect(ids).not.toContain('synthetic-parcel-tx-1-2/3');
  });

  test('não gera nenhuma sintética quando todas as parcelas já existem como reais', () => {
    const items = [
      makeItem(),
      makeItem({ id: 'tx-2', description: 'AMAZON 02/03', descriptionRaw: 'AMAZON 02/03', creditCardMetadata: { installmentNumber: 2, totalInstallments: 3 } }),
      makeItem({ id: 'tx-3', description: 'AMAZON 03/03', descriptionRaw: 'AMAZON 03/03', creditCardMetadata: { installmentNumber: 3, totalInstallments: 3 } })
    ];
    const result = svc.createInstallmentTransactions(items);
    expect(result).toHaveLength(3);
    const ids = result.map(i => i.transaction.id);
    expect(ids).toEqual(['tx-1', 'tx-2', 'tx-3']);
  });

  test('não gera sintéticas para transação com totalInstallments <= 1', () => {
    const item = makeItem({ creditCardMetadata: { installmentNumber: 1, totalInstallments: 1 } });
    const result = svc.createInstallmentTransactions([item]);
    expect(result).toHaveLength(1);
  });

  test('não quebra quando totalInstallments é undefined (bug do pipeline)', () => {
    const item = makeItem({ creditCardMetadata: { installmentNumber: undefined, totalInstallments: undefined } });
    expect(() => svc.createInstallmentTransactions([item])).not.toThrow();
    const result = svc.createInstallmentTransactions([item]);
    expect(result).toHaveLength(1);
  });

  test('não quebra quando creditCardMetadata é null', () => {
    const item = makeItem({ creditCardMetadata: null });
    expect(() => svc.createInstallmentTransactions([item])).not.toThrow();
  });

  test('não cria sintéticas quando não há âncora na parcela 1', () => {
    // banco retorna parcela 2 e 3 mas não a 1
    const items = [
      makeItem({ id: 'tx-2', description: 'AMAZON 02/03', descriptionRaw: 'AMAZON 02/03', creditCardMetadata: { installmentNumber: 2, totalInstallments: 3 } }),
      makeItem({ id: 'tx-3', description: 'AMAZON 03/03', descriptionRaw: 'AMAZON 03/03', creditCardMetadata: { installmentNumber: 3, totalInstallments: 3 } })
    ];
    const result = svc.createInstallmentTransactions(items);
    expect(result).toHaveLength(2); // sem sintéticas, sem âncora
  });

  test('gera sintéticas corretas para banco B mesmo quando banco A tem parcelas com mesmo accountId', () => {
    // Simula Open Finance: mesmo accountId exposto por dois bancos diferentes
    const bankA1 = { ...makeItem({ id: 'a1', description: 'AMAZON 01/03', descriptionRaw: 'AMAZON 01/03', creditCardMetadata: { installmentNumber: 1, totalInstallments: 3 } }), bankName: 'BancoA' };
    const bankA2 = { ...makeItem({ id: 'a2', description: 'AMAZON 02/03', descriptionRaw: 'AMAZON 02/03', creditCardMetadata: { installmentNumber: 2, totalInstallments: 3 } }), bankName: 'BancoA' };
    const bankB1 = { ...makeItem({ id: 'b1', description: 'AMAZON 01/03', descriptionRaw: 'AMAZON 01/03', creditCardMetadata: { installmentNumber: 1, totalInstallments: 3 } }), bankName: 'BancoB' };

    const result = svc.createInstallmentTransactions([bankA1, bankA2, bankB1]);
    // BancoA: real 1, real 2, sintética 3 = 3 itens
    // BancoB: real 1, sintéticas 2 e 3 = 3 itens
    expect(result).toHaveLength(6);
    const bankBSyntheticIds = result.map(i => i.transaction.id).filter(id => id.startsWith('synthetic-parcel-b1'));
    expect(bankBSyntheticIds).toContain('synthetic-parcel-b1-2/3');
    expect(bankBSyntheticIds).toContain('synthetic-parcel-b1-3/3');
  });

  test('não mistura parcelas de compras diferentes', () => {
    const amazon = makeItem({ id: 'amazon-1', accountId: 'acc-1', amount: 100, description: 'AMAZON 01/03', descriptionRaw: 'AMAZON 01/03', creditCardMetadata: { installmentNumber: 1, totalInstallments: 3 } });
    const netflix = makeItem({ id: 'netflix-1', accountId: 'acc-1', amount: 50, description: 'NETFLIX 01/03', descriptionRaw: 'NETFLIX 01/03', creditCardMetadata: { installmentNumber: 1, totalInstallments: 3 } });
    // parcela 2 do amazon já existe
    const amazon2 = makeItem({ id: 'amazon-2', accountId: 'acc-1', amount: 100, description: 'AMAZON 02/03', descriptionRaw: 'AMAZON 02/03', creditCardMetadata: { installmentNumber: 2, totalInstallments: 3 } });

    const result = svc.createInstallmentTransactions([amazon, netflix, amazon2]);
    // amazon: real 1,2 + sintética 3 = 3 itens
    // netflix: real 1 + sintéticas 2,3 = 3 itens
    expect(result).toHaveLength(6);
  });
});
