/**
 * Cadência — a base de todo o motor.
 *
 * A substituição mais importante do briefing original: "tempo sem compra" deixa de ser
 * medido em dias absolutos e passa a ser medido contra a cadência PRÓPRIA do cliente.
 *
 * 40 dias sem comprar é normal para quem compra a cada 90 e catastrófico para quem
 * compra a cada 7. Um limiar absoluto trata os dois igual — e é assim que quase todo
 * CRM de peças produz uma lista de "clientes esfriando" inútil.
 *
 * Especificação: docs/SCORING_ENGINE.md §1
 */

import type { Cadencia, NivelEvidencia, Sale, Temperatura } from '../types';
import { diasEntre, hoje } from '../dates';

/** Mínimo de intervalos para haver qualquer base. Menos que isso: SEM_BASE, sem exceção. */
export const MIN_INTERVALOS_BASE = 3;
/** Acima deste coeficiente de variação, o cliente é irregular demais para prever janela. */
export const CV_MAXIMO_BASE_RAZOAVEL = 0.6;
/** Intervalos necessários para a melhor evidência possível. */
export const MIN_INTERVALOS_RAZOAVEL = 4;

export const LIMIAR_NO_CICLO = 0.8;
export const LIMIAR_ATRASADO = 1.2;
export const LIMIAR_PERDA_PROVAVEL = 2.0;

/**
 * Mediana, não média. Uma única compra atípica (reforma de frota, obra) distorce a
 * média e corrompe todo o motor a jusante. A mediana absorve.
 */
export function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1] + ordenados[meio]) / 2
    : ordenados[meio];
}

/** Desvio padrão amostral (n−1). Retorna null com menos de dois valores. */
export function desvioPadrao(valores: number[]): number | null {
  if (valores.length < 2) return null;
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  const soma = valores.reduce((s, v) => s + (v - media) ** 2, 0);
  return Math.sqrt(soma / (valores.length - 1));
}

/**
 * Nível de evidência — substitui o "grau de confiança" percentual do briefing.
 *
 * Regularidade importa mais que volume: um cliente com 20 compras erráticas nunca
 * passa de BASE_FRACA. Um percentual sugeriria um modelo probabilístico que não existe.
 */
export function nivelEvidencia(intervalos: number[], cv: number | null): NivelEvidencia {
  if (intervalos.length < MIN_INTERVALOS_BASE) return 'SEM_BASE';
  if (cv === null || cv > CV_MAXIMO_BASE_RAZOAVEL) return 'BASE_FRACA';
  if (intervalos.length < MIN_INTERVALOS_RAZOAVEL) return 'BASE_FRACA';
  return 'BASE_RAZOAVEL';
}

export function classificarTemperatura(
  evidencia: NivelEvidencia,
  atrasoRelativo: number | null,
): Temperatura {
  if (evidencia === 'SEM_BASE' || atrasoRelativo === null) return 'SEM_BASE';
  if (atrasoRelativo < LIMIAR_NO_CICLO) return 'NO_CICLO';
  if (atrasoRelativo < LIMIAR_ATRASADO) return 'JANELA';
  if (atrasoRelativo < LIMIAR_PERDA_PROVAVEL) return 'ATRASADO';
  return 'PERDA_PROVAVEL';
}

/** Calcula os intervalos entre datas ordenadas. `n` datas produzem `n−1` intervalos. */
export function intervalosEntreDatas(datasIso: string[]): number[] {
  const ordenadas = [...datasIso].sort();
  const intervalos: number[] = [];
  for (let i = 1; i < ordenadas.length; i++) {
    const dias = diasEntre(ordenadas[i - 1], ordenadas[i]);
    // Duas compras no mesmo dia são um pedido dividido, não um ciclo de reposição.
    if (dias > 0) intervalos.push(dias);
  }
  return intervalos;
}

export function calcularCadenciaDeDatas(datasIso: string[], referencia = hoje()): Cadencia {
  const intervalos = intervalosEntreDatas(datasIso);
  const intervaloMedianoDias = mediana(intervalos);
  const dp = desvioPadrao(intervalos);
  const coeficienteVariacao =
    dp !== null && intervaloMedianoDias !== null && intervaloMedianoDias > 0
      ? dp / intervaloMedianoDias
      : null;

  const evidencia = nivelEvidencia(intervalos, coeficienteVariacao);
  const ordenadas = [...datasIso].sort();
  const ultimaCompra = ordenadas.length > 0 ? ordenadas[ordenadas.length - 1] : null;
  const diasDesdeUltimaCompra = ultimaCompra ? diasEntre(ultimaCompra, referencia) : null;

  const atrasoRelativo =
    diasDesdeUltimaCompra !== null && intervaloMedianoDias !== null && intervaloMedianoDias > 0
      ? diasDesdeUltimaCompra / intervaloMedianoDias
      : null;

  return {
    intervalos,
    intervaloMedianoDias,
    coeficienteVariacao,
    evidencia,
    ultimaCompra,
    diasDesdeUltimaCompra,
    atrasoRelativo,
    temperatura: classificarTemperatura(evidencia, atrasoRelativo),
  };
}

export function calcularCadencia(vendas: Sale[], referencia = hoje()): Cadencia {
  return calcularCadenciaDeDatas(
    vendas.map((v) => v.data),
    referencia,
  );
}

export const ROTULO_TEMPERATURA: Record<Temperatura, string> = {
  SEM_BASE: 'Sem base',
  NO_CICLO: 'No ciclo',
  JANELA: 'Janela de recompra',
  ATRASADO: 'Atrasado',
  PERDA_PROVAVEL: 'Perda provável',
};

export const DESCRICAO_TEMPERATURA: Record<Temperatura, string> = {
  SEM_BASE: 'Histórico insuficiente para estabelecer cadência. São necessárias 4 compras.',
  NO_CICLO: 'Comprou dentro do próprio ciclo. Não há motivo de reposição para contatar agora.',
  JANELA: 'Está na janela de recompra. É agora que a ligação converte.',
  ATRASADO: 'Passou do ciclo habitual. Um concorrente pode ter entrado.',
  PERDA_PROVAVEL: 'Mais que o dobro do ciclo habitual. A conversa é de reativação, não reposição.',
};

export const ROTULO_EVIDENCIA: Record<NivelEvidencia, string> = {
  SEM_BASE: 'Sem base histórica',
  BASE_FRACA: 'Base fraca',
  BASE_RAZOAVEL: 'Base razoável',
};
