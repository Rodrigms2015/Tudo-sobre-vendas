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
 * A rede vendeu `unidades` em `dias`, espalhadas por `pracasComVenda` praças.
 * A média diária **de uma praça** é `unidades / dias / pracasComVenda`. A
 * sugestão é essa média multiplicada pelos dias de cobertura.
 *
 * Isso NÃO é previsão. É a pergunta "se aqui vender como a média das praças
 * que vendem, quanto dura?". Duas coisas que a conta deliberadamente não faz:
 *
 * - **não corrige pelo tamanho da praça.** Seria preciso saber o faturamento
 *   de cada uma, e esse dado não está em nenhum dos relatórios. Inventar o
 *   fator inventaria a quantidade.
 * - **não soma a venda de todas as praças.** Somar responderia "quanto a rede
 *   inteira vende", que não é o que se compra para uma filial.
 *
 * Praça sem relatório de movimentação carregado fica FORA do divisor. Ausência
 * de medida não é venda zero.
 */

/** Cobertura padrão, em dias. A mesma da lista de compra. */
const DIAS_COBERTURA_PADRAO = 45;

/**
 * Quanto comprar para cobrir `diasCobertura` vendendo como a média das praças
 * que vendem.
 *
 * @param {{unidades: number, dias: number, pracasComVenda: number}} venda
 * @param {number} diasCobertura
 * @param {number} [saldoAqui] saldo local; `null` ou ausente = não sabido
 * @returns {{qtd: number, porDiaPorPraca: number, base: string}|null}
 *   `null` quando falta base — e falta de base não vira quantidade.
 */
function quantidadePelaRede(venda, diasCobertura, saldoAqui) {
  const v = venda || {};
  const dias = Number(v.dias);
  const pracas = Number(v.pracasComVenda);
  const unidades = Number(v.unidades);
  if (!Number.isFinite(dias) || dias <= 0) return null;
  if (!Number.isFinite(pracas) || pracas <= 0) return null;
  if (!Number.isFinite(unidades) || unidades <= 0) return null;
  const cobertura = Number(diasCobertura);
  if (!Number.isFinite(cobertura) || cobertura <= 0) return null;

  const porDiaPorPraca = unidades / dias / pracas;
  const bruto = porDiaPorPraca * cobertura;
  /* Saldo local desconhecido não vira zero: sem saber o que há aqui, a
     sugestão cobre o período inteiro e diz que o saldo não foi lido. */
  const desconta = saldoAqui === null || saldoAqui === undefined ? 0 : Math.max(0, Number(saldoAqui) || 0);
  const qtd = Math.max(0, Math.ceil(bruto - desconta));
  return {
    qtd,
    porDiaPorPraca,
    base: 'média de ' + pracas + (pracas === 1 ? ' praça' : ' praças') + ' que vendem, em ' + dias + ' dias',
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
