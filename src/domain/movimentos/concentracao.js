/**
 * Concentração da saída: quanto de tudo saiu num documento só.
 *
 * FONTE ÚNICA DA VERDADE: testado pelo vitest E injetado na página. JS puro.
 *
 * ────────────────────────────────────────────────────────────────────────
 * POR QUE ISTO EXISTE
 *
 * "Vendeu 100 unidades em 8 meses" e "vendeu 90 num dia e 10 no resto" são a
 * mesma média mensal e decisões de compra opostas. A primeira é giro; a
 * segunda foi um pedido grande que pode não voltar nunca.
 *
 * A página media documentos distintos, mas não media o TAMANHO do maior. Uma
 * saída única de 90 em 100 aparecia como demanda recorrente.
 *
 * ────────────────────────────────────────────────────────────────────────
 * O QUE ESTE MÓDULO NÃO FAZ
 *
 * Não descarta nada. Concentração é FATO, não veredito: o módulo mede e quem
 * decide é quem compra, com as três opções à mão — incluir, excluir, ver com
 * e sem. Excluir em silêncio um pedido grande seria tão errado quanto contá-lo
 * como se fosse rotina.
 *
 * A mediana entra ao lado da média pelo mesmo motivo: onde as duas se afastam,
 * a média está sendo puxada por um mês fora do padrão.
 */

/** Acima disto a saída é chamada de concentrada. Quem usa escolhe. */
const LIMIAR_CONCENTRACAO = 0.5;

/** Mediana de uma lista de números. `null` para lista vazia — nunca zero. */
function mediana(valores) {
  const v = (valores || []).filter((x) => Number.isFinite(Number(x))).map(Number).sort((a, b) => a - b);
  if (!v.length) return null;
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

/**
 * Mede a concentração de uma lista de saídas de UMA peça.
 *
 * @param {Array<{documento?: string, qtd?: number, data?: string}>} saidas
 * @param {number} [limiar] fração acima da qual se chama de concentrada
 * @returns {object|null} `null` quando não há saída — e não há o que medir
 */
function medirConcentracao(saidas, limiar = LIMIAR_CONCENTRACAO) {
  const lista = (saidas || []).filter((m) => Number.isFinite(Number(m && m.qtd)));
  if (!lista.length) return null;

  const porDocumento = new Map();
  const porMes = new Map();
  let total = 0;
  for (const m of lista) {
    const q = Number(m.qtd);
    total += q;
    /* Saída sem documento conta no total mas não vira "um documento": somar
       todas elas num balde só inventaria um pedido gigante que não existe. */
    if (m.documento) porDocumento.set(m.documento, (porDocumento.get(m.documento) || 0) + q);
    if (m.data) {
      const mes = String(m.data).slice(0, 7);
      porMes.set(mes, (porMes.get(mes) || 0) + q);
    }
  }

  const documentos = [...porDocumento.entries()].sort((a, b) => b[1] - a[1]);
  const maior = documentos.length ? { documento: documentos[0][0], unidades: documentos[0][1] } : null;
  const fracao = maior && total > 0 ? maior.unidades / total : null;
  const meses = [...porMes.values()];

  return {
    total,
    lancamentos: lista.length,
    documentos: documentos.length,
    maiorDocumento: maior,
    /* `null` quando nenhuma saída trouxe documento: não dá para afirmar
       concentração sem saber em quantos pedidos aquilo saiu. */
    fracaoNoMaior: fracao,
    concentrada: fracao === null ? null : fracao > limiar,
    limiar,
    mesesAtivos: porMes.size,
    mediaMensal: porMes.size ? total / porMes.size : null,
    medianaMensal: mediana(meses),
    /* O que sobra tirando o maior documento. É o "ver sem" da decisão. */
    totalSemMaior: maior ? total - maior.unidades : total,
  };
}

/**
 * As saídas sem o maior documento — para a opção "ver sem".
 *
 * Devolve a lista inteira quando não há documento identificado: sem saber qual
 * é o maior, não há o que tirar.
 */
function semMaiorDocumento(saidas) {
  const m = medirConcentracao(saidas);
  if (!m || !m.maiorDocumento) return (saidas || []).slice();
  return (saidas || []).filter((s) => s.documento !== m.maiorDocumento.documento);
}

export { LIMIAR_CONCENTRACAO, mediana, medirConcentracao, semMaiorDocumento };
