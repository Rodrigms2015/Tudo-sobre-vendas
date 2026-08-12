/**
 * Reposição: quanto comprar, com que base, e com que grau de prova.
 *
 * FONTE ÚNICA DA VERDADE, no mesmo esquema de `estoque/identidade.js`: este
 * arquivo é testado pelo vitest E injetado em `plataforma/corpo.html` por
 * `scripts/gerar-plataforma.mjs`. JavaScript puro, sem import, por causa da
 * injeção — a página é um arquivo só, sem build.
 *
 * ────────────────────────────────────────────────────────────────────────
 * O PRINCÍPIO QUE ORGANIZA TUDO AQUI
 *
 * Uma quantidade sugerida vale pelo que a sustenta. Venda medida no relatório
 * de movimentação é saída de verdade; referência por classe e curva é chute
 * educado. Somar as duas e chamar o total de "sugestão pela venda medida" é
 * mentir sobre a origem de metade do pedido.
 *
 * Por isso toda sugestão carrega `fonte`, e toda soma é feita por fonte —
 * nunca no agregado.
 */

/**
 * Pesos do score de prioridade. A soma É 100 por construção, e
 * `validarPesos()` existe para que uma alteração desatenta quebre o teste em
 * vez de desbalancear o motor em silêncio.
 */
const PESOS_PRIORIDADE = Object.freeze({
  giro: 45,
  ruptura: 30,
  desvio: 15,
  essencialidade: 10,
});

/** Rótulo de cada componente, para a interface não inventar nome. */
const ROTULO_PESO = Object.freeze({
  giro: 'Giro',
  ruptura: 'Falta',
  desvio: 'Venda por outra filial',
  essencialidade: 'Essencialidade',
});

/**
 * Devolve a soma dos pesos e lança se não fecha 100 — o motor inteiro assume
 * que `pontos/100` é a nota, então uma soma diferente muda toda escala sem
 * avisar ninguém.
 *
 * @param {Record<string, number>} pesos
 * @returns {number} sempre 100
 */
function validarPesos(pesos) {
  const p = pesos || PESOS_PRIORIDADE;
  const soma = Object.values(p).reduce((a, b) => a + b, 0);
  if (soma !== 100) {
    throw new Error('Os pesos da prioridade somam ' + soma + ', não 100: ' +
      Object.entries(p).map(([k, v]) => k + '=' + v).join(', '));
  }
  return soma;
}

/**
 * Ritmo diário medido. `null` quando não dá para medir — nunca zero, porque
 * zero é "não vendeu" e ausência é "não sei".
 *
 * @param {number|null} unidades
 * @param {number|null} dias
 * @returns {number|null}
 */
function porDiaMedido(unidades, dias) {
  if (unidades === null || unidades === undefined) return null;
  if (!dias || dias <= 0) return null;
  const n = Number(unidades);
  if (!Number.isFinite(n) || n < 0) return null;
  return n / dias;
}

/**
 * Quantidade para cobrir um período, descontando o que já está na prateleira.
 *
 * Arredonda para cima: meia peça não atende ninguém. O piso é 1 quando há
 * ritmo — se o item vende, repor zero não é decisão, é omissão.
 *
 * 29 unidades em 213 dias, cobrindo 45 dias, com saldo 0:
 *   29/213 = 0,13615 por dia → × 45 = 6,127 → 7 unidades.
 *
 * @param {{porDia: number|null, diasCobertura: number, saldo: number|null}} e
 * @returns {number|null} `null` quando não há ritmo para calcular
 */
function quantidadeParaCobrir({ porDia, diasCobertura, saldo }) {
  if (porDia === null || porDia === undefined || !(porDia > 0)) return null;
  if (!diasCobertura || diasCobertura <= 0) return null;
  const emCasa = saldo === null || saldo === undefined ? 0 : saldo;
  const alvo = porDia * diasCobertura;
  return Math.max(1, Math.ceil(alvo - emCasa));
}

/**
 * As duas fontes possíveis de uma sugestão, e a diferença entre elas é o que
 * o comprador precisa ver antes de assinar o pedido.
 */
const FONTE = Object.freeze({
  MEDIDA: 'medida',
  ESTIMADA: 'estimada',
});

const ROTULO_FONTE = Object.freeze({
  medida: 'venda real',
  estimada: 'estimativa por classe e curva',
});

/**
 * Separa uma lista de sugestões pelas duas fontes e soma cada uma por
 * separado. Nunca devolve um total único: o agregado é justamente o número
 * que engana.
 *
 * @param {Array<{fonte?: string, medida?: boolean, quantidade?: number|null}>} itens
 * @returns {{medida: {itens: number, unidades: number}, estimada: {itens: number, unidades: number}, total: {itens: number, unidades: number}}}
 */
function separarPorFonte(itens) {
  const vazio = () => ({ itens: 0, unidades: 0 });
  const fora = { medida: vazio(), estimada: vazio() };
  for (const i of itens || []) {
    const q = i && i.quantidade;
    if (q === null || q === undefined || !(q > 0)) continue;
    const chave = (i.fonte === FONTE.MEDIDA || i.medida === true) ? 'medida' : 'estimada';
    fora[chave].itens++;
    fora[chave].unidades += q;
  }
  return {
    ...fora,
    /* O total existe, mas só para conferência de fechamento — a interface
       mostra as duas parcelas, nunca só esta. */
    total: {
      itens: fora.medida.itens + fora.estimada.itens,
      unidades: fora.medida.unidades + fora.estimada.unidades,
    },
  };
}

/**
 * Ressalva de ruptura, e o que ela NÃO faz.
 *
 * Um item zerado hoje que não vende há muito tempo pode ter parado por falta
 * — ou pode ter parado de ser procurado. O relatório de movimentação não
 * distingue os dois: ele diz quando houve venda, não quando houve peça.
 *
 * A versão anterior concluía "parou por falta" e trocava o divisor pelo
 * período em que o item supostamente esteve disponível, aumentando a
 * quantidade em silêncio. Isso é inferir data de ruptura sem histórico que a
 * prove.
 *
 * Agora: o ritmo é sempre o do período completo, e a dúvida vira texto. Só um
 * histórico de estoque que identifique os dias efetivamente zerados pode
 * autorizar o outro cálculo — e enquanto ele não existir, `null`.
 *
 * @param {{saldo: number|null, diasSemVender: number|null, temHistoricoDeEstoque?: boolean}} e
 * @returns {{aviso: string, ajustaQuantidade: boolean}|null}
 */
function ressalvaDeRuptura({ saldo, diasSemVender, temHistoricoDeEstoque }) {
  if (temHistoricoDeEstoque) return null;
  if (saldo === null || saldo === undefined || saldo > 0) return null;
  if (diasSemVender === null || diasSemVender === undefined) return null;
  return {
    aviso: 'Demanda possivelmente subestimada por ruptura atual: o item está zerado e a última ' +
      'venda foi há ' + diasSemVender + ' dias. Sem histórico de estoque não dá para saber desde ' +
      'quando faltou, então o ritmo usado é o do período inteiro.',
    /* A ressalva informa. Ela nunca mexe na quantidade. */
    ajustaQuantidade: false,
  };
}

export {
  PESOS_PRIORIDADE,
  ROTULO_PESO,
  validarPesos,
  porDiaMedido,
  quantidadeParaCobrir,
  FONTE,
  ROTULO_FONTE,
  separarPorFonte,
  ressalvaDeRuptura,
};
