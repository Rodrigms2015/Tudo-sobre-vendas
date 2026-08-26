/**
 * Sugestão de compra a partir da venda das outras praças.
 *
 * FONTE ÚNICA DA VERDADE: testado pelo vitest E injetado na página. JS puro.
 *
 * ────────────────────────────────────────────────────────────────────────
 * A PERGUNTA QUE ISTO RESPONDE
 *
 * A comparação de estoque respondia "as outras praças têm esta peça?". Ter não
 * é vender: uma peça pode estar parada em cinco filiais. Com o relatório de
 * movimentação de cada praça, a pergunta vira **"lá gira?"** — e essa vira
 * compra.
 *
 * ────────────────────────────────────────────────────────────────────────
 * DE ONDE SAI A QUANTIDADE
 *
 * Cada praça tem o SEU período medido. Somar tudo e dividir por um período só
 * dilui quem mediu menos tempo: se Cascavel mediu 232 dias e Londrina 60, a
 * taxa de Londrina cai por um período que ela nunca teve.
 *
 * Então a conta é feita praça a praça — `unidades ÷ dias daquela praça` — e a
 * referência é a MÉDIA dessas taxas. A sugestão é essa média multiplicada pelos
 * dias de cobertura, menos o saldo local.
 *
 * Isso NÃO é previsão. É a pergunta "se aqui vender como a média das praças que
 * vendem, quanto dura?". Três coisas que a conta deliberadamente não faz:
 *
 * - **não corrige pelo tamanho da praça.** Seria preciso o faturamento de cada
 *   uma, e esse dado não está em nenhum relatório. Inventar o fator inventaria
 *   a quantidade.
 * - **não soma a venda de todas as praças.** Somar responde "quanto a rede
 *   inteira vende", que não é o que se compra para uma filial.
 * - **não usa praça sem medição.** Ausência de medida não é venda zero, e uma
 *   praça sem relatório carregado não entra no divisor.
 */

/** Cobertura padrão, em dias. A mesma da lista de compra. */
const DIAS_COBERTURA_PADRAO = 45;

/**
 * Quanto comprar para cobrir `diasCobertura` vendendo como a média das praças
 * que vendem.
 *
 * @param {Array<{unidades: number, dias: number}>} pracas uma entrada por praça
 *   COM medição. Praça sem relatório carregado não entra aqui.
 * @param {number} diasCobertura
 * @param {number|null} [saldoAqui] saldo local; `null` = não sabido
 * @returns {{qtd: number, porDiaPorPraca: number, pracasComVenda: number,
 *   unidades: number, base: string}|null} `null` quando falta base — e falta de
 *   base não vira quantidade.
 */
function quantidadePelaRede(pracas, diasCobertura, saldoAqui) {
  const validas = (pracas || []).filter((p) =>
    p && Number.isFinite(Number(p.unidades)) && Number(p.unidades) > 0 &&
    Number.isFinite(Number(p.dias)) && Number(p.dias) > 0);
  if (!validas.length) return null;
  const cobertura = Number(diasCobertura);
  if (!Number.isFinite(cobertura) || cobertura <= 0) return null;

  /* Média das taxas diárias, e não taxa da soma: cada praça é medida no
     período dela. */
  const taxas = validas.map((p) => Number(p.unidades) / Number(p.dias));
  const porDiaPorPraca = taxas.reduce((a, b) => a + b, 0) / taxas.length;
  const unidades = validas.reduce((a, p) => a + Number(p.unidades), 0);
  const bruto = porDiaPorPraca * cobertura;
  /* Saldo local desconhecido não vira zero: sem saber o que há aqui, a
     sugestão cobre o período inteiro e a lacuna aparece do lado. */
  const desconta = saldoAqui === null || saldoAqui === undefined ? 0 : Math.max(0, Number(saldoAqui) || 0);
  const dias = validas.map((p) => Number(p.dias));
  const mesmoPeriodo = dias.every((d) => d === dias[0]);
  return {
    qtd: Math.max(0, Math.ceil(bruto - desconta)),
    porDiaPorPraca,
    pracasComVenda: validas.length,
    unidades,
    base: 'média da taxa diária de ' + validas.length + (validas.length === 1 ? ' praça' : ' praças') +
      (mesmoPeriodo ? ', em ' + dias[0] + ' dias' : ', cada uma no período que mediu'),
  };
}

/**
 * Ordena o que comprar. Primeiro o que mais gira na rede; empate vai para o
 * que gira em mais praças, porque venda espalhada é demanda de mercado e não
 * de um cliente só.
 */
function ordenarPorGiro(a, b) {
  const ua = (a && a.venda && a.venda.unidades) || 0;
  const ub = (b && b.venda && b.venda.unidades) || 0;
  const pa = (a && a.venda && a.venda.pracasComVenda) || 0;
  const pb = (b && b.venda && b.venda.pracasComVenda) || 0;
  return ub - ua || pb - pa;
}

export { DIAS_COBERTURA_PADRAO, quantidadePelaRede, ordenarPorGiro };
