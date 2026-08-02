/**
 * Next Best Action — geração de recomendações.
 *
 * Duas decisões estruturais:
 *
 * 1. A ordenação é `(precedência do tipo ASC, score DESC)`. Um veículo parado com score 52
 *    fica ACIMA de uma expansão com score 88. Score sozinho colocaria a expansão na frente,
 *    o que nenhum gerente comercial experiente faria.
 * 2. Recomendações são DERIVADAS, nunca semeadas. O que persiste é a decisão humana
 *    sobre elas (aceite/rejeição), não a recomendação em si.
 *
 * Especificação: docs/SCORING_ENGINE.md §3, §4, §5, §11
 */

import type {
  Confianca,
  ProductFamily,
  Recommendation,
  RecommendationFeedback,
  Settings,
  TipoAcao,
} from '../types';
import { PRECEDENCIA_TIPO } from '../types';
import type { CustomerContext } from './context';
import { calcularScore } from './scoring';
import { diasEntre, formatarDias, formatarMoeda, hoje, somarDias } from '../dates';

/** Multiplicador de valor potencial por tipo. Ver docs/SCORING_ENGINE.md §5. */
const MULTIPLICADOR_VALOR: Record<TipoAcao, number> = {
  URGENCIA: 1.4,
  COMPROMISSO: 0.5,
  RECUPERACAO: 1.0,
  REPOSICAO: 1.0,
  REATIVACAO: 0.6,
  EXPANSAO: 0.8,
  CADASTRO: 0,
};

/** Prazo padrão da ação, em dias, por tipo. */
const PRAZO_DIAS: Record<TipoAcao, number> = {
  URGENCIA: 0,
  COMPROMISSO: 0,
  RECUPERACAO: 1,
  REPOSICAO: 2,
  REATIVACAO: 5,
  EXPANSAO: 7,
  CADASTRO: 10,
};

/** Rejeições que suprimem a recomendação, e por quantos dias. */
const SUPRESSAO_POR_MOTIVO: Record<string, number> = {
  NAO_E_MEU_CLIENTE: 30,
  JA_RESOLVIDO: 30,
  MOMENTO_ERRADO: 7,
};

const REJEICOES_PARA_PENALIZAR = 3;
const PENALIDADE_POR_REJEICOES = 0.2;

function calcularConfianca(ctx: CustomerContext): Confianca {
  const lacunas = ctx.lacunasCriticas.length;
  if (ctx.cadencia.evidencia === 'SEM_BASE' || lacunas >= 2) return 'BAIXA';
  if (ctx.cadencia.evidencia === 'BASE_FRACA' || lacunas === 1) return 'MEDIA';
  return 'ALTA';
}

/** Determina o tipo da ação. A ordem dos testes É a precedência. */
function determinarTipo(ctx: CustomerContext): TipoAcao | null {
  if (ctx.temUrgenciaAtiva) return 'URGENCIA';
  if (ctx.promessasVencidas.length > 0 || ctx.promessasHoje.length > 0) return 'COMPROMISSO';
  if (ctx.valorOrcamentoAberto > 0) return 'RECUPERACAO';
  if (ctx.cadencia.temperatura === 'JANELA' || ctx.cadencia.temperatura === 'ATRASADO') {
    return 'REPOSICAO';
  }
  if (ctx.cadencia.temperatura === 'PERDA_PROVAVEL') return 'REATIVACAO';

  const totalVeiculos = ctx.frota?.totalVeiculos ?? null;
  if (totalVeiculos !== null && totalVeiculos >= 15 && ctx.familiasCompradas.size <= 3) {
    return 'EXPANSAO';
  }
  // Cadastro só vira ação em conta que vale o esforço de enriquecer.
  if (ctx.lacunasCriticas.length >= 2 && (ctx.faturamentoUltimos365 > 0 || ctx.vendas.length > 0)) {
    return 'CADASTRO';
  }
  return null;
}

function redigirAcao(tipo: TipoAcao, ctx: CustomerContext): string {
  const nome = ctx.customer.nomeFantasia;
  switch (tipo) {
    case 'URGENCIA':
      return `Atender urgência de ${nome} — confirmar sistema, prazo e retorno`;
    case 'COMPROMISSO': {
      const p = ctx.promessasVencidas[0] ?? ctx.promessasHoje[0];
      return `Cumprir promessa com ${nome}: ${p ? p.descricao : 'retorno prometido'}`;
    }
    case 'RECUPERACAO':
      return `Retomar ${formatarMoeda(ctx.valorOrcamentoAberto)} em orçamento aberto com ${nome}`;
    case 'REPOSICAO':
      return `Ligar para ${nome} — está na janela de reposição`;
    case 'REATIVACAO':
      return `Reativar ${nome} — entender o que mudou desde a última compra`;
    case 'EXPANSAO':
      return `Explorar famílias não compradas em ${nome}`;
    case 'CADASTRO':
      return `Enriquecer cadastro de ${nome} — a conta está sem dados-chave`;
  }
}

function redigirProximaPergunta(tipo: TipoAcao, ctx: CustomerContext): string | null {
  if (!ctx.frota || ctx.frota.totalVeiculos === null) {
    return 'Quantos veículos vocês têm rodando hoje, e de quais marcas?';
  }
  if (ctx.contatos.length === 0) {
    return 'Quem é a pessoa responsável pela compra de peças hoje?';
  }
  switch (tipo) {
    case 'URGENCIA':
      return 'Qual é o sintoma exato e o veículo está parado onde?';
    case 'REPOSICAO':
      return 'A quilometragem da frota está no ritmo de sempre neste período?';
    case 'REATIVACAO':
      return 'O que mudou na operação de vocês desde a última compra?';
    case 'EXPANSAO':
      return 'Quem atende vocês hoje em freio e arrefecimento?';
    case 'RECUPERACAO':
      return 'O que faltou na proposta para fechar: preço, prazo ou marca?';
    case 'CADASTRO':
      return 'Posso atualizar o perfil da frota de vocês no nosso sistema?';
    case 'COMPROMISSO':
      return null;
  }
}

function calcularValorPotencial(tipo: TipoAcao, ctx: CustomerContext): number {
  if (tipo === 'RECUPERACAO') return ctx.valorOrcamentoAberto;
  return Math.round(ctx.ticketMedio * MULTIPLICADOR_VALOR[tipo]);
}

export interface OpcoesRecomendacao {
  familias: ProductFamily[];
  settings: Settings;
  feedback: RecommendationFeedback[];
  referencia?: string;
}

/**
 * Aplica o aprendizado de rejeições. Conservador e explícito por decisão:
 * nenhum ajuste acontece sem que o vendedor possa ver que aconteceu e por quê.
 */
function aplicarAprendizado(
  ctx: CustomerContext,
  tipo: TipoAcao,
  feedback: RecommendationFeedback[],
  referencia: string,
): { suprimir: boolean; multiplicador: number; nota: string | null } {
  const relevantes = feedback.filter((f) => f.customerId === ctx.customer.id && f.tipo === tipo);
  const rejeicoes = relevantes.filter((f) => !f.aceita);

  for (const r of rejeicoes) {
    const janela = r.motivo ? SUPRESSAO_POR_MOTIVO[r.motivo] : undefined;
    if (janela !== undefined && diasEntre(r.data, referencia) < janela) {
      return { suprimir: true, multiplicador: 0, nota: null };
    }
  }

  if (rejeicoes.length >= REJEICOES_PARA_PENALIZAR) {
    return {
      suprimir: false,
      multiplicador: 1 - PENALIDADE_POR_REJEICOES,
      nota: `Prioridade reduzida em 20% após ${rejeicoes.length} rejeições anteriores deste tipo`,
    };
  }
  return { suprimir: false, multiplicador: 1, nota: null };
}

export function gerarRecomendacoes(
  contextos: CustomerContext[],
  opcoes: OpcoesRecomendacao,
): Recommendation[] {
  const referencia = opcoes.referencia ?? hoje();
  const recomendacoes: Recommendation[] = [];

  for (const ctx of contextos) {
    const tipo = determinarTipo(ctx);
    if (!tipo) continue;

    const aprendizado = aplicarAprendizado(ctx, tipo, opcoes.feedback, referencia);
    if (aprendizado.suprimir) continue;

    const resultado = calcularScore(ctx, opcoes.settings.pesos, opcoes.familias, referencia);
    const score = Math.round(resultado.score * aprendizado.multiplicador);

    const penalidades = [...resultado.penalidades];
    if (aprendizado.nota) {
      penalidades.push({
        rotulo: 'Rejeições anteriores',
        peso: -(resultado.score - score),
        evidencia: aprendizado.nota,
      });
    }

    recomendacoes.push({
      id: `rec-${ctx.customer.id}-${tipo.toLowerCase()}`,
      customerId: ctx.customer.id,
      tipo,
      acao: redigirAcao(tipo, ctx),
      score,
      componentes: resultado.componentes,
      confianca: calcularConfianca(ctx),
      valorPotencial: calcularValorPotencial(tipo, ctx),
      prazo: somarDias(referencia, PRAZO_DIAS[tipo]),
      driversDominantes: resultado.driversDominantes,
      fatores: resultado.fatores,
      penalidades,
      lacunas: resultado.lacunas,
      proximaPergunta: redigirProximaPergunta(tipo, ctx),
    });
  }

  return ordenarRecomendacoes(recomendacoes);
}

/** Precedência do tipo vence o score. Ver docs/SCORING_ENGINE.md §3. */
export function ordenarRecomendacoes(recs: Recommendation[]): Recommendation[] {
  return [...recs].sort((a, b) => {
    const precedencia = PRECEDENCIA_TIPO[a.tipo] - PRECEDENCIA_TIPO[b.tipo];
    if (precedencia !== 0) return precedencia;
    return b.score - a.score;
  });
}

/**
 * Top 3 do Cockpit. Recomendações de confiança BAIXA são excluídas de propósito:
 * o topo do dia não pode ser ocupado por uma conclusão que o sistema não sustenta.
 * Elas aparecem na fila secundária, com a lacuna em destaque.
 */
export function selecionarTop3(recs: Recommendation[]): Recommendation[] {
  return recs.filter((r) => r.confianca !== 'BAIXA').slice(0, 3);
}

export function descreverMomento(ctx: CustomerContext): string {
  const { cadencia } = ctx;
  if (cadencia.temperatura === 'SEM_BASE') {
    return `${ctx.vendas.length} compra(s) registrada(s). São necessárias 4 para calcular cadência.`;
  }
  const mediano = Math.round(cadencia.intervaloMedianoDias ?? 0);
  return `Compra a cada ${mediano} dias (mediana de ${cadencia.intervalos.length} intervalos). Última compra ${formatarDias(cadencia.diasDesdeUltimaCompra)}.`;
}
