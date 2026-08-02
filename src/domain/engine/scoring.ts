/**
 * Motor de score de oportunidade.
 *
 * O score é critério de ORDENAÇÃO, nunca "qualidade da conta". Ele responde
 * "o que olho primeiro", não "quanto essa conta vale". Toda exibição vem acompanhada
 * dos drivers dominantes — o score sozinho é um número que ninguém pode discutir.
 *
 * Especificação: docs/SCORING_ENGINE.md §2
 */

import type {
  ChaveComponente,
  ComponentesScore,
  Fator,
  PesosScore,
  ProductFamily,
} from '../types';
import { ROTULO_COMPONENTE } from '../types';
import type { CustomerContext } from './context';
import { formatarDias, formatarMoeda } from '../dates';

/** Nº de compras em 365 dias em que a recorrência satura. */
const SATURACAO_RECORRENCIA = 12;
/** Frota em que o potencial satura. */
const SATURACAO_FROTA = 50;
/** Valor de orçamento em que a escala logarítmica satura. */
const SATURACAO_ORCAMENTO = 50_000;
/** Interações úteis em 90 dias em que o relacionamento satura. */
const SATURACAO_RELACIONAMENTO = 6;
/** Margem percentual em que o componente satura. */
const SATURACAO_MARGEM = 30;
/** Frota mínima para que "famílias não exploradas" seja de fato oportunidade. */
const FROTA_REFERENCIA_EXPANSAO = 20;

/** Fração do peso de `tempoSemCompra` por temperatura. Ver docs/SCORING_ENGINE.md §2.1. */
export const FRACAO_POR_TEMPERATURA = {
  SEM_BASE: 0,
  NO_CICLO: 0,
  JANELA: 1.0,
  ATRASADO: 0.8,
  PERDA_PROVAVEL: 0.45,
} as const;

function limitar(valor: number, maximo: number): number {
  return Math.max(0, Math.min(maximo, valor));
}

/** Normaliza os pesos para somar 100, mantendo o score comparável após calibração. */
export function normalizarPesos(pesos: PesosScore): PesosScore {
  const total = Object.values(pesos).reduce((s, p) => s + p, 0);
  if (total === 0 || Math.abs(total - 100) < 0.001) return pesos;
  const fator = 100 / total;
  const saida = {} as PesosScore;
  for (const chave of Object.keys(pesos) as ChaveComponente[]) {
    saida[chave] = pesos[chave] * fator;
  }
  return saida;
}

export interface ResultadoScore {
  score: number;
  componentes: ComponentesScore;
  fatores: Fator[];
  penalidades: Fator[];
  lacunas: string[];
  driversDominantes: string[];
}

/**
 * Fator de idade do orçamento. O pico está em 3–7 dias: antes disso ainda está quente
 * e não é risco; depois de 15 esfriou, mas ainda vale tentar.
 */
function fatorIdadeOrcamento(dias: number): number {
  if (dias <= 2) return 0.5;
  if (dias <= 7) return 1.0;
  if (dias <= 15) return 0.85;
  return 0.6;
}

export function calcularScore(
  ctx: CustomerContext,
  pesos: PesosScore,
  familias: ProductFamily[],
  referencia: string,
): ResultadoScore {
  const p = normalizarPesos(pesos);
  const fatores: Fator[] = [];
  const penalidades: Fator[] = [];
  const lacunas: string[] = [];

  // --- Recorrência -------------------------------------------------------
  let recorrencia = 0;
  if (ctx.cadencia.evidencia === 'SEM_BASE') {
    lacunas.push('Menos de 4 compras registradas — recorrência não pode ser avaliada.');
  } else {
    recorrencia = limitar((ctx.comprasUltimos365 / SATURACAO_RECORRENCIA) * p.recorrencia, p.recorrencia);
    if (recorrencia > 0) {
      fatores.push({
        rotulo: ROTULO_COMPONENTE.recorrencia,
        peso: recorrencia,
        evidencia: `${ctx.comprasUltimos365} compras nos últimos 12 meses`,
      });
    }
  }

  // --- Momento de recompra (cadência relativa, não dias absolutos) --------
  const fracao = FRACAO_POR_TEMPERATURA[ctx.cadencia.temperatura];
  const tempoSemCompra = p.tempoSemCompra * fracao;
  if (ctx.cadencia.temperatura === 'SEM_BASE') {
    lacunas.push('Sem cadência estabelecida — o momento de recompra não pode ser calculado.');
  } else if (tempoSemCompra > 0) {
    const mediano = Math.round(ctx.cadencia.intervaloMedianoDias ?? 0);
    fatores.push({
      rotulo: ROTULO_COMPONENTE.tempoSemCompra,
      peso: tempoSemCompra,
      evidencia: `Compra a cada ${mediano} dias; última ${formatarDias(ctx.cadencia.diasDesdeUltimaCompra)}`,
    });
  } else if (ctx.cadencia.temperatura === 'NO_CICLO') {
    penalidades.push({
      rotulo: 'Dentro do ciclo',
      peso: 0,
      evidencia: `Comprou ${formatarDias(ctx.cadencia.diasDesdeUltimaCompra)}, dentro do ciclo de ${Math.round(ctx.cadencia.intervaloMedianoDias ?? 0)} dias`,
    });
  }

  // --- Orçamento aberto ---------------------------------------------------
  let orcamentoAberto = 0;
  if (ctx.valorOrcamentoAberto > 0) {
    const base = Math.min(
      1,
      Math.log10(1 + ctx.valorOrcamentoAberto) / Math.log10(1 + SATURACAO_ORCAMENTO),
    );
    const maisAntigo = [...ctx.orcamentosAbertos].sort((a, b) => a.data.localeCompare(b.data))[0];
    const dias = maisAntigo
      ? Math.max(0, Math.round((Date.parse(referencia) - Date.parse(maisAntigo.data)) / 86_400_000))
      : 0;
    orcamentoAberto = limitar(p.orcamentoAberto * base * fatorIdadeOrcamento(dias), p.orcamentoAberto);
    fatores.push({
      rotulo: ROTULO_COMPONENTE.orcamentoAberto,
      peso: orcamentoAberto,
      evidencia: `${formatarMoeda(ctx.valorOrcamentoAberto)} em ${ctx.orcamentosAbertos.length} orçamento(s), o mais antigo há ${dias} dias`,
    });
  }

  // --- Potencial de frota -------------------------------------------------
  let potencialFrota = 0;
  const totalVeiculos = ctx.frota?.totalVeiculos ?? null;
  if (totalVeiculos === null) {
    lacunas.push('Frota não cadastrada — o potencial da conta não pode ser dimensionado.');
  } else {
    potencialFrota = limitar((totalVeiculos / SATURACAO_FROTA) * p.potencialFrota, p.potencialFrota);
    fatores.push({
      rotulo: ROTULO_COMPONENTE.potencialFrota,
      peso: potencialFrota,
      evidencia: `${totalVeiculos} veículos${ctx.frota?.perfilOperacao ? `, operação ${ctx.frota.perfilOperacao.toLowerCase()}` : ''}`,
    });
  }

  // --- Urgência -----------------------------------------------------------
  let urgencia = 0;
  if (ctx.temUrgenciaAtiva) {
    urgencia = p.urgencia;
    fatores.push({
      rotulo: ROTULO_COMPONENTE.urgencia,
      peso: urgencia,
      evidencia: 'Interação urgente registrada nos últimos 3 dias',
    });
  }

  // --- Famílias não exploradas -------------------------------------------
  let aderenciaFamilia = 0;
  if (familias.length > 0 && totalVeiculos !== null) {
    const cobertura = ctx.familiasCompradas.size / familias.length;
    const fatorPotencial = Math.min(1, totalVeiculos / FROTA_REFERENCIA_EXPANSAO);
    aderenciaFamilia = limitar(
      p.aderenciaFamilia * (1 - cobertura) * fatorPotencial,
      p.aderenciaFamilia,
    );
    if (aderenciaFamilia > 0) {
      fatores.push({
        rotulo: ROTULO_COMPONENTE.aderenciaFamilia,
        peso: aderenciaFamilia,
        evidencia: `Compra ${ctx.familiasCompradas.size} de ${familias.length} famílias, com ${totalVeiculos} veículos`,
      });
    }
  }

  // --- Relacionamento -----------------------------------------------------
  const relacionamento = limitar(
    (ctx.interacoesUteis90d / SATURACAO_RELACIONAMENTO) * p.relacionamento,
    p.relacionamento,
  );
  if (relacionamento > 0) {
    fatores.push({
      rotulo: ROTULO_COMPONENTE.relacionamento,
      peso: relacionamento,
      evidencia: `${ctx.interacoesUteis90d} contatos úteis em 90 dias`,
    });
  } else if (ctx.diasDesdeUltimaInteracao !== null && ctx.diasDesdeUltimaInteracao > 60) {
    penalidades.push({
      rotulo: 'Relacionamento frio',
      peso: 0,
      evidencia: `Sem contato útil ${formatarDias(ctx.diasDesdeUltimaInteracao)}`,
    });
  }

  // --- Margem potencial ---------------------------------------------------
  let margemPotencial = 0;
  if (ctx.margemMedia === null) {
    if (ctx.vendas.length > 0) {
      lacunas.push('Margem não disponível no histórico — o componente de margem não pontua.');
    }
  } else {
    margemPotencial = limitar((ctx.margemMedia / SATURACAO_MARGEM) * p.margemPotencial, p.margemPotencial);
    fatores.push({
      rotulo: ROTULO_COMPONENTE.margemPotencial,
      peso: margemPotencial,
      evidencia: `Margem média histórica de ${ctx.margemMedia.toFixed(1)}%`,
    });
  }

  // --- Compromisso vencido ------------------------------------------------
  let compromissoVencido = 0;
  if (ctx.promessasVencidas.length > 0) {
    compromissoVencido = p.compromissoVencido;
    fatores.push({
      rotulo: ROTULO_COMPONENTE.compromissoVencido,
      peso: compromissoVencido,
      evidencia: `${ctx.promessasVencidas.length} promessa(s) vencida(s)`,
    });
  } else if (ctx.promessasHoje.length > 0) {
    compromissoVencido = p.compromissoVencido * 0.6;
    fatores.push({
      rotulo: ROTULO_COMPONENTE.compromissoVencido,
      peso: compromissoVencido,
      evidencia: `${ctx.promessasHoje.length} promessa(s) vencendo hoje`,
    });
  }

  const componentes: ComponentesScore = {
    recorrencia,
    tempoSemCompra,
    orcamentoAberto,
    potencialFrota,
    urgencia,
    aderenciaFamilia,
    relacionamento,
    margemPotencial,
    compromissoVencido,
  };

  const score = Math.round(
    limitar(
      Object.values(componentes).reduce((s, v) => s + v, 0),
      100,
    ),
  );

  // Drivers dominantes: os fatores que respondem pela maior parte do score.
  // O score nunca aparece sem eles — ver docs/CRITICAL_REVIEW.md §1.2.
  const driversDominantes = [...fatores]
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 3)
    .filter((f) => f.peso > 0)
    .map((f) => f.rotulo);

  return { score, componentes, fatores, penalidades, lacunas, driversDominantes };
}
