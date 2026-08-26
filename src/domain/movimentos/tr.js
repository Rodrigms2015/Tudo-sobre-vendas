/**
 * Classificação dos códigos de movimento (TR).
 *
 * FONTE ÚNICA DA VERDADE: testado pelo vitest E injetado na página. JS puro.
 *
 * ────────────────────────────────────────────────────────────────────────
 * O DEFEITO QUE ISTO CORRIGE
 *
 * A página tratava TODA saída como venda. Numa rede que transfere mercadoria
 * entre filiais, isso conta transferência interna como demanda e manda comprar
 * de novo o que só mudou de prateleira — e nada na tela denunciava.
 *
 * Medido nos quatro relatórios reais (81.427 linhas), as saídas se distribuem
 * assim:
 *
 *   TR 50   53.477 linhas   204.419 un   93,4% das saídas   documento NF
 *   TR 98    2.974 linhas    17.601 un    5,2%              documento NF
 *   TR 54      600 linhas     9.858 un    1,0%              documento NF
 *   TR 70      199 linhas      1.128 un                     documento NF
 *   TR RS       48 linhas         53 un                     documento RI
 *   TR 92/RW/JS 19 linhas         25 un
 *
 * Três códigos cobrem 99,6% das linhas. Por isso a tela ordena por volume:
 * classificar três resolve quase tudo, e o resto fica visível como lacuna.
 *
 * ────────────────────────────────────────────────────────────────────────
 * A REGRA
 *
 * TR não classificado **não é venda**. Não é venda zero também — é venda não
 * classificada, que é outra coisa e aparece como lacuna. A página não adivinha
 * pelo volume nem pelo prefixo do documento: ela MOSTRA essas evidências e
 * quem decide é quem conhece o ERP.
 */

/** As classes que quem usa pode atribuir. `desconhecido` não se atribui: é a ausência. */
const CLASSES_TR = ['venda', 'transferencia', 'ajuste', 'devolucao', 'outro'];

/* Nomes longos de propósito: a página já tem `CLASSES` e `ROTULO_CLASSE`
   para classe de peça (consumível, desgaste), e o escopo é o mesmo. */
const ROTULO_CLASSE_TR = {
  venda: 'Venda',
  transferencia: 'Transferência',
  ajuste: 'Ajuste',
  devolucao: 'Devolução',
  outro: 'Outro',
  desconhecido: 'Não classificado',
};

/** `S` + `50` → `'S·50'`. Entrada e saída com o mesmo número são coisas diferentes. */
function chaveTr(tp, tr) {
  const a = String(tp === null || tp === undefined ? '' : tp).trim().toUpperCase();
  const b = String(tr === null || tr === undefined ? '' : tr).trim().toUpperCase();
  if (!a || !b) return '';
  return a + '·' + b;
}

/**
 * A classe de um lançamento, segundo o mapa de classificação.
 *
 * @param {{tp?: string, tr?: string}} mov
 * @param {Record<string, string>} mapa
 * @returns {string} uma de CLASSES, ou `'desconhecido'`
 */
function classeDe(mov, mapa) {
  const k = chaveTr(mov && mov.tp, mov && mov.tr);
  if (!k) return 'desconhecido';
  const c = (mapa || {})[k];
  return CLASSES_TR.includes(c) ? c : 'desconhecido';
}

/**
 * Só é venda o que foi classificado como venda. A ausência de classificação
 * NÃO vira venda — é justamente o defeito que este módulo existe para tirar.
 */
function ehVenda(mov, mapa) {
  return classeDe(mov, mapa) === 'venda';
}

/**
 * Resume os códigos encontrados, com as evidências que ajudam a classificar:
 * volume, período, em quantas filiais aparece e que prefixo de documento usa.
 *
 * O prefixo é evidência forte na prática — `NF` é nota fiscal, `RI` é
 * requisição interna — mas é evidência para QUEM LÊ, nunca regra automática.
 *
 * @param {Array<object>} movimentos
 * @returns {Array<object>} do maior volume de linhas para o menor
 */
function resumirTrs(movimentos) {
  const mapa = new Map();
  for (const m of movimentos || []) {
    const k = chaveTr(m && m.tp, m && m.tr);
    if (!k) continue;
    let r = mapa.get(k);
    if (!r) {
      r = {
        chave: k,
        tp: String(m.tp).trim().toUpperCase(),
        tr: String(m.tr).trim().toUpperCase(),
        linhas: 0,
        unidades: 0,
        documentos: new Set(),
        filiais: new Set(),
        prefixos: new Map(),
        primeira: null,
        ultima: null,
      };
      mapa.set(k, r);
    }
    r.linhas++;
    const q = Number(m.qtd);
    if (Number.isFinite(q)) r.unidades += q;
    if (m.documento) {
      r.documentos.add(m.documento);
      const p = String(m.documento).replace(/[0-9]+/g, '').slice(0, 3) || '(só número)';
      r.prefixos.set(p, (r.prefixos.get(p) || 0) + 1);
    }
    if (m.filial) r.filiais.add(String(m.filial).trim());
    if (m.data) {
      if (!r.primeira || m.data < r.primeira) r.primeira = m.data;
      if (!r.ultima || m.data > r.ultima) r.ultima = m.data;
    }
  }
  return [...mapa.values()]
    .map((r) => ({
      chave: r.chave,
      tp: r.tp,
      tr: r.tr,
      linhas: r.linhas,
      unidades: r.unidades,
      documentos: r.documentos.size,
      filiais: [...r.filiais].sort(),
      prefixoMaisComum: [...r.prefixos.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p)[0] || '',
      primeira: r.primeira,
      ultima: r.ultima,
    }))
    .sort((a, b) => b.linhas - a.linhas || a.chave.localeCompare(b.chave));
}

/**
 * Quanto das SAÍDAS já está classificado como venda.
 *
 * É o número que a página mostra em toda tela que usa venda medida: sem ele,
 * quem lê não sabe se está vendo a demanda inteira ou um pedaço dela.
 *
 * @param {Array<object>} movimentos
 * @param {Record<string, string>} mapa
 */
function coberturaDeVenda(movimentos, mapa) {
  const zero = () => ({ linhas: 0, unidades: 0 });
  const saidas = zero();
  const venda = zero();
  const porClasse = {};
  for (const c of CLASSES_TR.concat('desconhecido')) porClasse[c] = zero();

  for (const m of movimentos || []) {
    if (String(m && m.tp).trim().toUpperCase() !== 'S') continue;
    const q = Number(m.qtd);
    const un = Number.isFinite(q) ? q : 0;
    saidas.linhas++;
    saidas.unidades += un;
    const c = classeDe(m, mapa);
    porClasse[c].linhas++;
    porClasse[c].unidades += un;
    if (c === 'venda') { venda.linhas++; venda.unidades += un; }
  }

  /* Sem nenhuma saída não há cobertura para calcular. `null` e não 0: 0%
     sugere que existe saída e nada foi classificado, que é outra situação. */
  const pct = (parte, todo) => (todo > 0 ? parte / todo : null);
  return {
    saidas,
    venda,
    porClasse,
    pctLinhas: pct(venda.linhas, saidas.linhas),
    pctUnidades: pct(venda.unidades, saidas.unidades),
    /* Verdadeiro quando NADA foi classificado ainda: a página não mostra
       "venda zero", mostra "falta classificar". */
    semClassificacao: saidas.linhas > 0 && porClasse.desconhecido.linhas === saidas.linhas,
  };
}

/**
 * Os códigos de saída que ainda faltam classificar, do maior volume para o
 * menor — que é a ordem em que classificar rende mais.
 */
function saidasNaoClassificadas(movimentos, mapa) {
  return resumirTrs(movimentos)
    .filter((r) => r.tp === 'S' && !CLASSES_TR.includes((mapa || {})[r.chave]));
}

export {
  CLASSES_TR,
  ROTULO_CLASSE_TR,
  chaveTr,
  classeDe,
  ehVenda,
  resumirTrs,
  coberturaDeVenda,
  saidasNaoClassificadas,
};
