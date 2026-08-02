/**
 * Radar de Reposição — intervalo histórico de recompra.
 *
 * Este módulo faz UMA coisa: calcula a janela em que o cliente historicamente recompra
 * uma família. Ele NÃO usa quilometragem, idade de frota, sazonalidade ou perfil de rota,
 * porque esses dados não existem no ERP de uma distribuidora — e usá-los como se
 * existissem produziria astrologia com barra de progresso.
 *
 * Regra dura: com menos de 3 intervalos observados, NENHUMA janela é exibida.
 *
 * Especificação: docs/SCORING_ENGINE.md §7 e docs/CRITICAL_REVIEW.md §1.1
 */

import type { Cadencia, ProductFamily, RadarSignal } from '../types';
import type { CustomerContext } from './context';
import { hoje, somarDias } from '../dates';

/** Largura da janela por nível de evidência. Base fraca produz janela larga — isso é honesto. */
const LARGURA_JANELA = {
  BASE_RAZOAVEL: 0.15,
  BASE_FRACA: 0.3,
} as const;

function construirSinal(
  customerId: string,
  familyId: string | null,
  cadencia: Cadencia,
  nomeFamilia: string | null,
): RadarSignal {
  const base = {
    customerId,
    familyId,
    evidencia: cadencia.evidencia,
    intervalosObservados: cadencia.intervalos.length,
    intervaloMedianoDias: cadencia.intervaloMedianoDias,
  };

  if (cadencia.evidencia === 'SEM_BASE' || !cadencia.ultimaCompra || !cadencia.intervaloMedianoDias) {
    return {
      ...base,
      janelaInicio: null,
      janelaFim: null,
      fatores: [],
      penalidades: [],
      lacunas: [
        `Apenas ${cadencia.intervalos.length + 1} compra(s) registrada(s)${nomeFamilia ? ` de ${nomeFamilia}` : ''}. São necessárias 4 para calcular uma janela.`,
      ],
      proximaPergunta:
        'De quanto em quanto tempo vocês costumam repor esse item? Qual foi a última troca?',
    };
  }

  const largura = LARGURA_JANELA[cadencia.evidencia];
  const mediano = cadencia.intervaloMedianoDias;

  const fatores = [
    {
      rotulo: 'Intervalo mediano observado',
      peso: mediano,
      evidencia: `${Math.round(mediano)} dias, mediana de ${cadencia.intervalos.length} intervalos`,
    },
    {
      rotulo: 'Regularidade',
      peso: 0,
      evidencia:
        cadencia.coeficienteVariacao !== null
          ? `Variação de ${Math.round(cadencia.coeficienteVariacao * 100)}% entre intervalos`
          : 'Variação não calculável',
    },
  ];

  const penalidades =
    cadencia.evidencia === 'BASE_FRACA'
      ? [
          {
            rotulo: 'Base fraca',
            peso: 0,
            evidencia:
              cadencia.intervalos.length < 4
                ? `Apenas ${cadencia.intervalos.length} intervalos observados — a janela foi alargada.`
                : 'Compras irregulares demais para estreitar a janela.',
          },
        ]
      : [];

  return {
    ...base,
    janelaInicio: somarDias(cadencia.ultimaCompra, Math.round(mediano * (1 - largura))),
    janelaFim: somarDias(cadencia.ultimaCompra, Math.round(mediano * (1 + largura))),
    fatores,
    penalidades,
    lacunas: [],
    proximaPergunta:
      cadencia.evidencia === 'BASE_FRACA'
        ? 'A operação de vocês mudou de ritmo? O intervalo de troca varia bastante.'
        : 'A quilometragem da frota está no ritmo de sempre neste período?',
  };
}

/** Sinal geral da conta, considerando todas as compras. */
export function radarDaConta(ctx: CustomerContext): RadarSignal {
  return construirSinal(ctx.customer.id, null, ctx.cadencia, null);
}

/** Sinais por família — o que de fato interessa para preparar a ligação. */
export function radarPorFamilia(
  ctx: CustomerContext,
  familias: ProductFamily[],
  referencia = hoje(),
): RadarSignal[] {
  const porId = new Map(familias.map((f) => [f.id, f]));
  const sinais: RadarSignal[] = [];

  for (const [familyId, cadencia] of ctx.cadenciaPorFamilia) {
    const familia = porId.get(familyId);
    sinais.push(construirSinal(ctx.customer.id, familyId, cadencia, familia?.nome ?? null));
  }

  // Janelas que já se abriram primeiro; depois as futuras; depois as sem base.
  return sinais.sort((a, b) => {
    if (a.janelaInicio === null && b.janelaInicio === null) return 0;
    if (a.janelaInicio === null) return 1;
    if (b.janelaInicio === null) return -1;
    const aAberta = a.janelaInicio <= referencia;
    const bAberta = b.janelaInicio <= referencia;
    if (aAberta !== bAberta) return aAberta ? -1 : 1;
    return a.janelaInicio.localeCompare(b.janelaInicio);
  });
}

export type SituacaoJanela = 'SEM_BASE' | 'FUTURA' | 'ABERTA' | 'VENCIDA';

export function situacaoJanela(sinal: RadarSignal, referencia = hoje()): SituacaoJanela {
  if (!sinal.janelaInicio || !sinal.janelaFim) return 'SEM_BASE';
  if (referencia < sinal.janelaInicio) return 'FUTURA';
  if (referencia <= sinal.janelaFim) return 'ABERTA';
  return 'VENCIDA';
}

export const ROTULO_SITUACAO_JANELA: Record<SituacaoJanela, string> = {
  SEM_BASE: 'Sem base histórica',
  FUTURA: 'Janela ainda não abriu',
  ABERTA: 'Janela aberta agora',
  VENCIDA: 'Janela passou',
};
