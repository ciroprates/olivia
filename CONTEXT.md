# Olivia — Gestão de Transações Financeiras

Busca transações bancárias via Pluggy, trata parcelas de cartão, deduplica lançamentos e atualiza uma planilha no Google Sheets. Um app CLI + API REST.

## Language

**Transação**:
A unidade central do domínio: um movimento financeiro enriquecido com seu contexto (conta, banco, dono) que se torna uma linha na planilha. Flui pelo pipeline: busca → parcelas → deduplicação → planilha.
_Avoid_: item, lançamento, entry, row

**Item**:
Reservado ao sentido da Pluggy: uma conexão bancária (um login vinculado a uma instituição, identificado por `itemId`). Não usar "item" para se referir a uma Transação.
_Avoid_: usar "item" para a transação embrulhada

**Banco**:
Uma conexão configurada pelo usuário: um Item da Pluggy acrescido de `owner` e um `name` de exibição livre. Pode haver mais de um Banco por instituição financeira. Não é a instituição em si — a instituição é apenas o valor default do `name`.
_Avoid_: instituição (como sinônimo), conexão (use "Item" para o conceito Pluggy)

**Parcela / Parcelamento**:
Uma compra dividida em N cobranças conhecidas e finitas (uma TV em 12x). Cada Parcela tem um número (`installmentNumber`) e um total (`totalInstallments`). O sistema gera as Parcelas futuras que a Pluggy ainda não retornou. A primeira parcela É a Transação; as demais são parcelas dela. Agrupar parcelas da mesma compra é detalhe interno da deduplicação — não há entidade "Compra".
_Avoid_: recorrente, recorrência (é outro conceito — ver abaixo); compra, purchase (fale em Transação)

**Parcela Real**:
Uma Parcela que veio da Pluggy — já existe de fato (foi ou está sendo faturada).
_Avoid_: (nenhum)

**Parcela Sintética**:
Uma projeção futura gerada pelo Olivia para preencher as parcelas que a Pluggy ainda não retornou (`id` prefixado com `synthetic-parcel-`). Quando uma Sintética coincide com uma Real, a Real vence e a Sintética é descartada.
_Avoid_: projetada, futura, gerada (como termo canônico — use "sintética")

**Entrada / Saída**:
O sentido do fluxo de uma Transação. Entrada = dinheiro entrando (Pluggy `CREDIT`); Saída = dinheiro saindo (Pluggy `DEBIT`). É o que o código chama de "Classificação".
_Avoid_: crédito/débito soltos, CREDIT/DEBIT (na fala do domínio)

**Cartão de Crédito / Conta Corrente**:
O tipo de conta de onde a Transação veio. Cartão de Crédito = Pluggy `CREDIT`; Conta Corrente = Pluggy `BANK`.
_Avoid_: dizer só "crédito" (colide com Entrada) — sempre qualificar "Cartão de Crédito"

**Duplicata**:
Duas Transações são a mesma (uma é Duplicata da outra) quando coincidem em conta, valor, data e descrição — independente de fatura ou mês. Na deduplicação vence a de `updatedAt` mais recente; as demais são descartadas.
_Avoid_: repetida, cópia

**Dono**:
A pessoa a quem pertence o Banco e, por consequência, a Transação (ex.: Ciro, Ursula).
_Avoid_: titular, pessoa

**Execução**:
Uma rodada do pipeline (buscar → parcelas → deduplicação → planilha), disparada e acompanhada pela API (`executionId`, status). Não confundir com o `executionStatus` da Pluggy, que é o status de atualização de um Item — esse nunca é chamado de "Execução".
_Avoid_: rodada, job, run; usar "execução" para o sync de Item da Pluggy

**Recorrência** _(não modelada)_:
Uma cobrança que se repete indefinidamente, sem fim conhecido (uma assinatura mensal). O sistema **não** modela recorrência hoje. Cuidado: a coluna da planilha rotulada **"Recorrente?"** na verdade significa **"Parcelado?"** — é um rótulo legado enganoso, não recorrência de verdade.
_Avoid_: usar "recorrente" para descrever parcelamentos
