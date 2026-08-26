/**
 * Folga aparente de uma praça irmã — o que ela poderia ceder sem se machucar.
 *
 * FONTE ÚNICA DA VERDADE: testado pelo vitest E injetado na página pelo
 * gerador. JavaScript puro, sem import.
 *
 * ────────────────────────────────────────────────────────────────────────
 * POR QUE "APARENTE"
 *
 * A palavra não é enfeite. A ferramenta NÃO sabe se a filial pode ceder uma
 * peça: não conhece o pedido que ela tem em carteira, o cliente que ela está
 * segurando, nem a compra que ela já colocou. O que ela conhece é o saldo de
 * uma foto e a saída de um período.
 *
 * Então a conta é só esta, e ela é dita com todas as letras na tela:
 *
 *     folga aparente = saldo dela − o que ela precisa para os próximos N dias
 *                      no ritmo que ela mesma mediu
 *
 * Se a movimentação daquela praça não foi carregada, o ritmo é DESCONHECIDO
 * e não existe folga a calcular. Não é folga zero, e muito menos folga
 * inteira: é `null`, com o motivo escrito. Tratar "não medi" como "não vende"
 * mandaria pedir a peça de uma filial que gira mais do que a nossa.
 */

/** Fração do saldo que a conta nunca pede, mesmo com folga de sobra. */
const RESERVA_MINIMA = 0.2;

/**
 * Folga aparente de uma praça.
 *
 * @param {{saldo: number|null, unidades: number|null, dias: number|null}} praca
 *   `saldo` é a foto do estoque dela; `unidades` e `dias` vêm da movimentação
 *   DELA. `unidades` nula significa movimentação não carregada.
 * @param {number} diasCobertura quantos dias ela precisa cobrir para si
 * @returns {{folga: number|null, precisa: number|null, porDia: number|null,
 *            base: string, motivo: string|null}}
 */
function folgaAparente(praca, diasCobertura) {
  const p = praca || {};
  /* `Number(null)` é 0 e `Number.isFinite(0)` é verdadeiro: sem esta guarda
     um saldo ausente virava folga zero medida, que é uma afirmação. */
  const numero = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
  const saldo = numero(p.saldo);
  const dias = numero(diasCobertura);

  if (!Number.isFinite(saldo)) {
    return { folga: null, precisa: null, porDia: null,
      base: 'sem saldo legível desta praça', motivo: 'o relatório de estoque dela não trouxe saldo' };
  }
  if (!Number.isFinite(dias) || dias <= 0) {
    return { folga: null, precisa: null, porDia: null,
      base: 'sem janela de cobertura definida', motivo: 'a cobertura em dias não foi informada' };
  }
  /* Movimentação não carregada: o ritmo dela é desconhecido. Ver o cabeçalho
     — este é o caso que mais engana, e ele NUNCA vira folga cheia. */
  if (!Number.isFinite(numero(p.unidades)) || !Number.isFinite(numero(p.dias)) || numero(p.dias) <= 0) {
    return { folga: null, precisa: null, porDia: null,
      base: 'saldo ' + saldo + ', ritmo não medido',
      motivo: 'a movimentação desta praça não foi carregada — não dá para saber do que ela precisa' };
  }

  const porDia = numero(p.unidades) / numero(p.dias);
  const precisa = porDia * dias;
  /* A reserva não é margem de segurança inventada: é o reconhecimento de que
     a foto do saldo tem dias de atraso e de que a praça tem compromissos que
     este arquivo não mostra. */
  const disponivel = saldo * (1 - RESERVA_MINIMA);
  const folga = Math.floor(Math.max(0, disponivel - precisa));
  return {
    folga,
    precisa,
    porDia,
    base: 'saldo ' + saldo + ' − ' + Math.ceil(precisa) + ' que ela consome em ' + dias +
      ' dias (' + porDia.toFixed(2).replace('.', ',') + '/dia medido no período dela)' +
      ' − ' + Math.round(RESERVA_MINIMA * 100) + '% de reserva',
    motivo: null,
  };
}

/**
 * De quem pedir, em ordem.
 *
 * Só entra quem tem folga aparente maior que zero. Quem não foi medido
 * aparece na lista com `folga: null` e o motivo — para que a tela possa
 * mostrar o que falta carregar em vez de esconder a praça.
 *
 * @param {Array<{nome: string, saldo: number|null, unidades: number|null, dias: number|null}>} pracas
 * @param {number} diasCobertura
 * @returns {{podem: Array, semMedida: Array, folgaTotal: number|null}}
 *   `folgaTotal` é `null` quando NENHUMA praça pôde ser medida.
 */
function dequemPedir(pracas, diasCobertura) {
  const podem = [];
  const semMedida = [];
  for (const p of pracas || []) {
    const f = folgaAparente(p, diasCobertura);
    const linha = Object.assign({}, p, f);
    if (f.folga === null) semMedida.push(linha);
    else if (f.folga > 0) podem.push(linha);
    /* Folga medida e igual a zero não é lacuna nem oferta: some da lista,
       porque pedir dela machucaria a praça. */
  }
  podem.sort((a, b) => b.folga - a.folga);
  return {
    podem,
    semMedida,
    folgaTotal: podem.length ? podem.reduce((t, x) => t + x.folga, 0)
      : (semMedida.length ? null : 0),
  };
}

export { RESERVA_MINIMA, folgaAparente, dequemPedir };
