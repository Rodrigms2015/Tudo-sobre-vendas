/**
 * Comportamento de compra do cliente — filial 37, Passo Fundo.
 *
 * FONTE ÚNICA DA VERDADE: testado pelo vitest E injetado na página pelo
 * gerador. JavaScript puro, sem import.
 *
 * ────────────────────────────────────────────────────────────────────────
 * DE ONDE VEM CADA CATEGORIA — E O QUE ELA *NÃO* SIGNIFICA
 *
 * O relatório de clientes traz quatro colunas de faturamento (a primeira é o
 * mês corrente, PARCIAL — ver `carteira.js`) e a data da última compra. Isso é
 * tudo. Não há nota fiscal, não há item comprado, não há histórico além de
 * quatro meses.
 *
 * Portanto:
 *
 *   • A categoria descreve o COMPORTAMENTO DE FATURAMENTO em três meses
 *     fechados. Não descreve o cliente, não descreve o motivo, e não diz o
 *     que oferecer — a ferramenta não sabe o que ele compra.
 *   • Coluna não lida é LACUNA, não zero. Um cliente com uma coluna ilegível
 *     não vira "esporádico" por causa disso: ele fica SEM_BASE.
 *   • Faturamento zero num mês fechado é informação de verdade (ele não
 *     comprou). Coluna `null` não é.
 *
 * A precedência existe porque as categorias se sobrepõem: quem comprou nos
 * três meses e sumiu também está, tecnicamente, caindo. Sumir é mais urgente
 * do que cair, e cair é mais urgente do que ser esporádico.
 */

/** Meses fechados do relatório. Espelha `MESES_FECHADOS` da carteira. */
const MESES_FECHADOS_COMP = 3;

/**
 * Quantos dias sem comprar já contam como "sumiu" / "inativo".
 *
 * É a mesma régua da lista de ataque, e ela é escolhida por quem usa
 * (15/30/45/60/90). Não é um limiar fixo escondido no código.
 */
const REGUA_DIAS = [15, 30, 45, 60, 90];

const CATEGORIAS_CLIENTE = ['SEM_BASE', 'SEM_COMPRA_REGISTRADA', 'REGULAR_E_SUMIU',
  'ESTA_CAINDO', 'COMPRA_ESPORADICA', 'INATIVO', 'ATIVO'];

/** Quanto menor o número, mais cedo a categoria ganha. */
const PRECEDENCIA_CLIENTE = {
  SEM_BASE: 0,
  SEM_COMPRA_REGISTRADA: 1,
  REGULAR_E_SUMIU: 2,
  ESTA_CAINDO: 3,
  COMPRA_ESPORADICA: 4,
  INATIVO: 5,
  ATIVO: 6,
};

const ROTULO_CATEGORIA_CLIENTE = {
  SEM_BASE: 'sem base para classificar',
  SEM_COMPRA_REGISTRADA: 'sem compra registrada',
  REGULAR_E_SUMIU: 'comprava todo mês e parou',
  ESTA_CAINDO: 'está caindo',
  COMPRA_ESPORADICA: 'compra esporádica',
  INATIVO: 'inativo',
  ATIVO: 'ativo',
};

/**
 * O que o vendedor faz com cada categoria.
 *
 * Se não há ação, a categoria não deveria existir — mesma regra dos alertas.
 */
const ACAO_CATEGORIA_CLIENTE = {
  SEM_BASE: 'confira o cadastro: o relatório não trouxe faturamento legível deste cliente',
  SEM_COMPRA_REGISTRADA: 'cadastro sem nenhuma compra no relatório — prospecte do zero ou tire da carteira ativa',
  REGULAR_E_SUMIU: 'ligue hoje e pergunte o que mudou — ele tinha rotina de compra',
  ESTA_CAINDO: 'ligue antes de sumir: o faturamento caiu mês a mês',
  COMPRA_ESPORADICA: 'trate como cliente de oportunidade, não como rotina',
  INATIVO: 'reative ou tire da carteira ativa',
  ATIVO: 'mantenha a rotina; não precisa de ação hoje',
};

/**
 * Mediana de uma lista de números.
 *
 * Anda ao lado da média em toda a tela de clientes porque as duas contam
 * histórias diferentes: um cliente com 1.000 / 1.000 / 30.000 tem média
 * 10.667 e mediana 1.000. A média é o pedido grande; a mediana é a rotina.
 *
 * @param {Array<number>} valores
 * @returns {number|null} `null` quando não há nenhum valor — nunca 0.
 */
function medianaDeValores(valores) {
  const v = (valores || []).filter((x) => typeof x === 'number' && Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

/**
 * Os meses FECHADOS do cliente, do mais recente para o mais antigo.
 *
 * A coluna 0 é o mês corrente e é parcial — ela nunca entra aqui, pelo mesmo
 * motivo documentado em `carteira.js`: incluí-la derruba tudo que depende
 * dela em cerca de um terço de um mês.
 *
 * @param {{faturamento: Array<number|null>}} cliente
 * @returns {Array<number|null>} três posições, `null` onde a coluna não foi lida.
 */
function fechadosDoCliente(cliente) {
  const f = (cliente && cliente.faturamento) || [];
  const saida = [];
  for (let i = 1; i <= MESES_FECHADOS_COMP; i++) {
    const v = f[i];
    saida.push(v === null || v === undefined ? null : Number(v));
  }
  return saida;
}

/**
 * A mediana do faturamento nos meses fechados.
 *
 * @param {{faturamento: Array<number|null>}} cliente
 * @returns {{mediana: number, mesesUsados: number}|null}
 */
function medianaDosFechados(cliente) {
  const lidos = fechadosDoCliente(cliente).filter((v) => v !== null);
  if (!lidos.length) return null;
  return { mediana: medianaDeValores(lidos), mesesUsados: lidos.length };
}

/**
 * Categoria de comportamento do cliente.
 *
 * `dias` é a distância até a última compra; vem de `diasSemComprar` e pode
 * ser `null` (cliente sem data no relatório).
 *
 * Cada retorno traz `evidencia`: os números concretos que levaram àquela
 * categoria, para a tela poder responder "por que este cliente apareceu?".
 * Quando falta dado, `lacuna` diz o que falta — e as duas nunca ficam vazias
 * ao mesmo tempo.
 *
 * @param {{faturamento: Array<number|null>, ultimaCompra: string|null}} cliente
 * @param {number|null} dias
 * @param {number} corte régua escolhida por quem usa (15/30/45/60/90)
 * @returns {{categoria: string, rotulo: string, acao: string, evidencia: string|null, lacuna: string|null}}
 */
function categoriaDoCliente(cliente, dias, corte) {
  const regua = Number.isFinite(Number(corte)) && Number(corte) > 0 ? Number(corte) : 30;
  const fechados = fechadosDoCliente(cliente);
  const lidos = fechados.filter((v) => v !== null);
  const dinheiro = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const devolver = (categoria, evidencia, lacuna) => ({
    categoria,
    rotulo: ROTULO_CATEGORIA_CLIENTE[categoria],
    acao: ACAO_CATEGORIA_CLIENTE[categoria],
    evidencia: evidencia || null,
    lacuna: lacuna || null,
  });

  /* Sem nenhuma coluna fechada legível não há comportamento a descrever.
     Note que isso é diferente de "faturou zero": zero é medição, null não é. */
  if (!lidos.length) {
    return devolver('SEM_BASE', null,
      'nenhum dos ' + MESES_FECHADOS_COMP + ' meses fechados foi lido no relatório');
  }

  const compradosNosFechados = lidos.filter((v) => v > 0).length;
  const todosLidos = lidos.length === MESES_FECHADOS_COMP;
  const semData = dias === null || dias === undefined;

  /* fechados[0] é o mês fechado mais RECENTE. "Caindo" é do passado para o
     presente: o mais antigo maior que o do meio, e o do meio maior que o
     mais recente. */
  const [recente, meio, antigo] = fechados;

  const linhaDoTempo = todosLidos
    ? dinheiro(antigo) + ' → ' + dinheiro(meio) + ' → ' + dinheiro(recente) + ' nos 3 meses fechados'
    : lidos.length + ' de ' + MESES_FECHADOS_COMP + ' meses fechados lidos';

  /* 1 — Comprava todo mês e parou. A rotina existia e sumiu: é o caso mais
         caro da carteira, e por isso ganha de todos os outros. */
  if (compradosNosFechados === MESES_FECHADOS_COMP && todosLidos && !semData && dias > regua) {
    return devolver('REGULAR_E_SUMIU',
      'faturou nos 3 meses fechados (' + linhaDoTempo + ') e está há ' + dias + ' dias sem comprar',
      null);
  }

  /* 2 — Está caindo. Exige os três meses lidos e queda estrita: dois meses
         iguais não são queda, são estabilidade. */
  if (todosLidos && antigo > meio && meio > recente) {
    return devolver('ESTA_CAINDO',
      'faturamento caiu mês a mês: ' + linhaDoTempo,
      null);
  }

  /* 3 — Compra esporádica: faturou em no máximo um dos meses fechados, mas
         faturou em algum. Sem os três meses lidos não dá para afirmar isso,
         porque a coluna que falta pode ser justamente uma compra. */
  if (todosLidos && compradosNosFechados > 0 && compradosNosFechados <= 1) {
    return devolver('COMPRA_ESPORADICA',
      'faturou em 1 dos 3 meses fechados: ' + linhaDoTempo,
      null);
  }

  /* 4 — Inativo: não faturou em nenhum mês fechado lido E passou da régua.
         Sem data de última compra a segunda metade não é verificável. */
  if (compradosNosFechados === 0) {
    if (semData) {
      /* Zero faturado E sem data NÃO é lacuna: o arquivo diz R$ 0,00 em cada
         coluna e não traz última compra. Isso descreve o CADASTRO — não prova
         que o cliente nunca comprou na vida, só que este relatório não tem
         compra dele. Chamar isso de "sem base" jogava 437 dos 1.142 clientes
         de Passo Fundo numa caixa que não dizia nada. */
      return devolver('SEM_COMPRA_REGISTRADA',
        'R$ 0,00 nos ' + lidos.length + ' meses fechados lidos e sem data de última compra no relatório',
        null);
    }
    if (dias > regua) {
      return devolver('INATIVO',
        'não faturou em nenhum dos ' + lidos.length + ' meses fechados e está há ' + dias + ' dias sem comprar',
        null);
    }
  }

  /* 5 — O resto está ativo: comprou dentro da régua, ou comprou em mais de um
         mês sem cair. */
  const dentro = semData ? 'comprou nos meses fechados' : 'última compra há ' + dias + ' dias';
  return devolver('ATIVO',
    dentro + '; faturou em ' + compradosNosFechados + ' de ' + lidos.length + ' meses fechados lidos',
    semData ? 'sem data de última compra no relatório' : null);
}

/**
 * A lista de ligações de hoje.
 *
 * Ordem: primeiro a categoria mais urgente (precedência), depois o dinheiro
 * que está em jogo — a MEDIANA dos meses fechados, não a média, para que um
 * pedido grande e único não jogue um cliente esporádico para o topo.
 *
 * ATIVO e SEM_BASE ficam de fora: um não precisa de ligação hoje, o outro
 * precisa de conferência de cadastro, não de telefonema.
 *
 * @param {Array<object>} clientes
 * @param {string} hojeIso
 * @param {number} corte régua em dias
 * @param {(cliente: object, hojeIso: string) => number|null} calcularDias
 * @returns {Array<{cliente: object, dias: number|null, categoria: string, rotulo: string, acao: string, evidencia: string|null, lacuna: string|null, mediana: number|null}>}
 */
function listaDeLigacoes(clientes, hojeIso, corte, calcularDias) {
  /* Fora da lista de hoje: quem está em dia (não precisa), quem não tem base
     (precisa de conferência de cadastro, não de telefonema) e o cadastro sem
     compra registrada (é prospecção, não reativação — outro trabalho, outro
     dia). Os três continuam contados nos blocos acima da lista. */
  const fora = new Set(['ATIVO', 'SEM_BASE', 'SEM_COMPRA_REGISTRADA']);
  const linhas = [];
  for (const c of clientes || []) {
    if (!c) continue;
    const dias = calcularDias ? calcularDias(c, hojeIso) : null;
    const cat = categoriaDoCliente(c, dias, corte);
    if (fora.has(cat.categoria)) continue;
    const med = medianaDosFechados(c);
    linhas.push({
      cliente: c,
      dias,
      categoria: cat.categoria,
      rotulo: cat.rotulo,
      acao: cat.acao,
      evidencia: cat.evidencia,
      lacuna: cat.lacuna,
      mediana: med ? med.mediana : null,
    });
  }
  linhas.sort((a, b) => {
    const pa = PRECEDENCIA_CLIENTE[a.categoria];
    const pb = PRECEDENCIA_CLIENTE[b.categoria];
    if (pa !== pb) return pa - pb;
    /* Mediana desconhecida vai para o fim do próprio bloco: não dá para
       afirmar que vale mais do que quem tem número medido. */
    const ma = a.mediana === null ? -1 : a.mediana;
    const mb = b.mediana === null ? -1 : b.mediana;
    if (mb !== ma) return mb - ma;
    return (b.dias || 0) - (a.dias || 0);
  });
  return linhas;
}

/**
 * Quantos clientes há em cada categoria.
 *
 * Serve para a tela dizer o tamanho de cada bloco antes de abrir a lista.
 *
 * @returns {Record<string, number>} toda categoria presente, inclusive com 0 —
 *   aqui zero é contagem medida, não ausência de dado.
 */
function contarCategorias(clientes, hojeIso, corte, calcularDias) {
  const conta = {};
  for (const k of CATEGORIAS_CLIENTE) conta[k] = 0;
  for (const c of clientes || []) {
    if (!c) continue;
    const dias = calcularDias ? calcularDias(c, hojeIso) : null;
    conta[categoriaDoCliente(c, dias, corte).categoria] += 1;
  }
  return conta;
}

export {
  MESES_FECHADOS_COMP,
  REGUA_DIAS,
  CATEGORIAS_CLIENTE,
  PRECEDENCIA_CLIENTE,
  ROTULO_CATEGORIA_CLIENTE,
  ACAO_CATEGORIA_CLIENTE,
  medianaDeValores,
  fechadosDoCliente,
  medianaDosFechados,
  categoriaDoCliente,
  listaDeLigacoes,
  contarCategorias,
};
