/**
 * ANDON Comercial — sinalização de anormalidades.
 *
 * O risco central deste módulo não é deixar de detectar: é detectar demais.
 * Dez tipos × 800 clientes produzem centenas de sinais por dia, e um painel que
 * acende inteiro é um painel apagado. O controle de ruído (§ ruído, abaixo) é tão
 * importante quanto a detecção.
 *
 * Especificação: docs/SCORING_ENGINE.md §6
 */

import type {
  Alert,
  AlertAck,
  Fator,
  ProductFamily,
  SeveridadeAlerta,
  Settings,
  TipoAlerta,
} from '../types';
import type { CustomerContext } from './context';
import { diasEntre, formatarDias, formatarMoeda, hoje, somarDias } from '../dates';

/** Teto de alertas críticos simultâneos. Se tudo é crítico, nada é. */
export const TETO_CRITICOS = 3;

const ORDEM_SEVERIDADE: Record<SeveridadeAlerta, number> = {
  CRITICO: 0,
  ATENCAO: 1,
  INFORMACAO: 2,
};

/**
 * Precedência entre alertas de mesma severidade.
 *
 * Impacto estimado sozinho é o critério errado: uma perda por estoque de R$ 28 mil
 * ficaria acima de um veículo parado de R$ 5 mil, e nenhum gerente comercial faria
 * isso. Um veículo parado é reversível AGORA; uma perda já aconteceu.
 * O impacto continua desempatando dentro do mesmo tipo.
 */
const PRECEDENCIA_ALERTA: Record<TipoAlerta, number> = {
  VEICULO_PARADO: 1,
  PROMESSA_VENCIDA: 2,
  ORCAMENTO_PARADO: 3,
  DEMANDA_REPETIDA_SEM_ESTOQUE: 4,
  PERDA_POR_ESTOQUE: 5,
  CLIENTE_ESFRIANDO: 6,
  QUEDA_DE_COMPORTAMENTO: 7,
  CONTA_IMPORTANTE_SEM_CONTATO: 8,
  MARGEM_BAIXA: 9,
  KIT_INCOMPLETO: 10,
  CADASTRO_CRITICO: 11,
};

/** Ordenação canônica: severidade, depois tipo, depois impacto. */
function compararAlertas(
  a: { severidade: SeveridadeAlerta; tipo: TipoAlerta; impactoEstimado: number },
  b: { severidade: SeveridadeAlerta; tipo: TipoAlerta; impactoEstimado: number },
): number {
  return (
    ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade] ||
    PRECEDENCIA_ALERTA[a.tipo] - PRECEDENCIA_ALERTA[b.tipo] ||
    b.impactoEstimado - a.impactoEstimado
  );
}

interface AlertaCandidato {
  tipo: TipoAlerta;
  severidade: SeveridadeAlerta;
  oQueAconteceu: string;
  porQueImporta: string;
  impactoEstimado: number;
  acaoSugerida: string;
  prazoDias: number;
  fatores: Fator[];
  lacunas?: string[];
  proximaPergunta?: string | null;
}

/** Chave estável usada para deduplicar reconhecimentos. */
export function chaveAlerta(customerId: string, tipo: TipoAlerta): string {
  return `${customerId}::${tipo}`;
}

function detectarCandidatos(
  ctx: CustomerContext,
  settings: Settings,
  familias: ProductFamily[],
  referencia: string,
): AlertaCandidato[] {
  const candidatos: AlertaCandidato[] = [];
  const nome = ctx.customer.nomeFantasia;

  // --- Veículo parado -----------------------------------------------------
  const urgentes = ctx.interacoes
    .filter((i) => i.urgente && diasEntre(i.data, referencia) <= 3)
    .sort((a, b) => b.data.localeCompare(a.data));
  if (urgentes.length > 0) {
    candidatos.push({
      tipo: 'VEICULO_PARADO',
      severidade: 'CRITICO',
      oQueAconteceu: `${nome} registrou urgência em ${formatarDias(diasEntre(urgentes[0].data, referencia))}: ${urgentes[0].resumo}`,
      porQueImporta:
        'Veículo parado gera custo por hora para o cliente e é a situação em que o fornecedor é trocado mais rápido.',
      impactoEstimado: Math.round(ctx.ticketMedio * 1.4),
      acaoSugerida: 'Confirmar sistema e sintoma, checar disponibilidade e dar um prazo agora.',
      prazoDias: 0,
      fatores: [
        {
          rotulo: 'Urgência registrada',
          peso: 10,
          evidencia: `Interação urgente em ${urgentes[0].data}`,
        },
      ],
      proximaPergunta: 'O veículo está parado onde, e desde quando?',
    });
  }

  // --- Promessa vencida ---------------------------------------------------
  if (ctx.promessasVencidas.length > 0) {
    const p = ctx.promessasVencidas[0];
    const atraso = diasEntre(p.dataPrometida, referencia);
    candidatos.push({
      tipo: 'PROMESSA_VENCIDA',
      severidade: 'CRITICO',
      oQueAconteceu: `Promessa a ${nome} venceu há ${atraso} dia(s): ${p.descricao}`,
      porQueImporta:
        'Promessa quebrada é o dano de reputação mais caro do setor e o motivo de perda mais fácil de evitar.',
      impactoEstimado: Math.round(ctx.ticketMedio * 0.5),
      acaoSugerida: 'Ligar hoje, dar posição mesmo sem solução, e repactuar o prazo.',
      prazoDias: 0,
      fatores: [
        {
          rotulo: 'Compromisso vencido',
          peso: 5,
          evidencia: `Prometido para ${p.dataPrometida}, ${ctx.promessasVencidas.length} pendente(s)`,
        },
      ],
    });
  }

  // --- Orçamento parado ---------------------------------------------------
  for (const orc of ctx.orcamentosAbertos) {
    const diasParado = diasEntre(orc.data, referencia);
    const interacaoAposOrcamento = ctx.interacoes.some((i) => i.data > orc.data);
    if (diasParado < 5 || interacaoAposOrcamento) continue;

    const critico = diasParado >= 10 && orc.valorTotal >= 10_000;
    candidatos.push({
      tipo: 'ORCAMENTO_PARADO',
      severidade: critico ? 'CRITICO' : 'ATENCAO',
      oQueAconteceu: `Orçamento de ${formatarMoeda(orc.valorTotal)} para ${nome} está há ${diasParado} dias sem interação.`,
      porQueImporta:
        'Orçamento sem acompanhamento não é neutro: o cliente já pediu preço para outro fornecedor.',
      impactoEstimado: orc.valorTotal,
      acaoSugerida: 'Ligar para entender o que falta — preço, prazo ou marca — e ajustar hoje.',
      prazoDias: 1,
      fatores: [
        {
          rotulo: 'Orçamento aberto',
          peso: 15,
          evidencia: `${formatarMoeda(orc.valorTotal)} emitido em ${orc.data}, validade ${orc.validadeDias} dias`,
        },
      ],
      proximaPergunta: 'O que faltou na proposta para fechar?',
    });
    break; // Um alerta de orçamento por conta; o resto vira contexto.
  }

  // --- Cliente esfriando --------------------------------------------------
  if (ctx.cadencia.temperatura === 'PERDA_PROVAVEL' && ctx.vendas.length >= 6) {
    candidatos.push({
      tipo: 'CLIENTE_ESFRIANDO',
      severidade: 'ATENCAO',
      oQueAconteceu: `${nome} comprava a cada ${Math.round(ctx.cadencia.intervaloMedianoDias ?? 0)} dias e está ${formatarDias(ctx.cadencia.diasDesdeUltimaCompra)} sem comprar.`,
      porQueImporta: `Histórico forte (${ctx.vendas.length} compras) com parada longa costuma significar que um concorrente entrou.`,
      impactoEstimado: Math.round(ctx.faturamentoUltimos365 * 0.3),
      acaoSugerida: 'Ligar para entender o que mudou. Não oferecer preço antes de saber o motivo.',
      prazoDias: 3,
      fatores: [
        {
          rotulo: 'Atraso relativo',
          peso: 12,
          evidencia: `${(ctx.cadencia.atrasoRelativo ?? 0).toFixed(1)}× o ciclo habitual`,
        },
        {
          rotulo: 'Histórico forte',
          peso: 8,
          evidencia: `${ctx.vendas.length} compras, ${formatarMoeda(ctx.faturamentoUltimos365)} em 12 meses`,
        },
      ],
      proximaPergunta: 'O que mudou na operação de vocês desde a última compra?',
    });
  }

  // --- Perda por estoque e demanda repetida -------------------------------
  const perdasEstoque30d = ctx.perdas.filter(
    (p) => p.motivo === 'ESTOQUE' && diasEntre(p.data, referencia) <= 30,
  );
  if (perdasEstoque30d.length > 0) {
    const valor = perdasEstoque30d.reduce((s, p) => s + p.valorEstimado, 0);
    candidatos.push({
      tipo: 'PERDA_POR_ESTOQUE',
      severidade: perdasEstoque30d.length >= 2 ? 'CRITICO' : 'ATENCAO',
      oQueAconteceu: `${perdasEstoque30d.length} venda(s) perdida(s) para ${nome} por falta de estoque, ${formatarMoeda(valor)} em 30 dias.`,
      porQueImporta:
        'Perda por estoque é a única categoria de perda que o comercial não resolve sozinho. Precisa chegar em compras.',
      impactoEstimado: valor,
      acaoSugerida: 'Registrar a demanda para compras e oferecer alternativa equivalente ao cliente.',
      prazoDias: 2,
      fatores: [
        {
          rotulo: 'Perdas por estoque',
          peso: 10,
          evidencia: `${perdasEstoque30d.length} ocorrência(s) em 30 dias`,
        },
      ],
    });
  }

  const perdasEstoque60d = ctx.perdas.filter(
    (p) => p.motivo === 'ESTOQUE' && p.familyId && diasEntre(p.data, referencia) <= 60,
  );
  const porFamilia = new Map<string, number>();
  for (const p of perdasEstoque60d) {
    porFamilia.set(p.familyId as string, (porFamilia.get(p.familyId as string) ?? 0) + 1);
  }
  for (const [familyId, contagem] of porFamilia) {
    if (contagem < 2) continue;
    const familia = familias.find((f) => f.id === familyId);
    candidatos.push({
      tipo: 'DEMANDA_REPETIDA_SEM_ESTOQUE',
      severidade: 'ATENCAO',
      oQueAconteceu: `${familia?.nome ?? 'Família'} foi perdida ${contagem}× por estoque em 60 dias para ${nome}.`,
      porQueImporta: 'Demanda repetida sem estoque é sinal de erro de curva de compra, não de venda.',
      impactoEstimado: perdasEstoque60d
        .filter((p) => p.familyId === familyId)
        .reduce((s, p) => s + p.valorEstimado, 0),
      acaoSugerida: 'Levar a família para a reunião de compras com o histórico de demanda.',
      prazoDias: 5,
      fatores: [
        { rotulo: 'Reincidência', peso: 8, evidencia: `${contagem} perdas da mesma família em 60 dias` },
      ],
    });
    break;
  }

  // --- Margem baixa -------------------------------------------------------
  const vendasRecentes = ctx.vendas.filter((v) => diasEntre(v.data, referencia) <= 60);
  const abaixoDoPiso = vendasRecentes.filter(
    (v) => v.margemPercentual !== null && v.margemPercentual < settings.pisoMargemPercentual,
  );
  if (abaixoDoPiso.length > 0) {
    const valor = abaixoDoPiso.reduce((s, v) => s + v.valorTotal, 0);
    candidatos.push({
      tipo: 'MARGEM_BAIXA',
      severidade: 'ATENCAO',
      oQueAconteceu: `${abaixoDoPiso.length} venda(s) para ${nome} abaixo do piso de ${settings.pisoMargemPercentual}% em 60 dias.`,
      porQueImporta: 'Volume com margem abaixo do piso consome capacidade de atendimento sem gerar resultado.',
      impactoEstimado: Math.round(valor * (settings.pisoMargemPercentual / 100)),
      acaoSugerida: 'Revisar a política aplicada nesta conta antes do próximo orçamento.',
      prazoDias: 7,
      fatores: [
        {
          rotulo: 'Margem abaixo do piso',
          peso: 5,
          evidencia: `Menor margem: ${Math.min(...abaixoDoPiso.map((v) => v.margemPercentual as number)).toFixed(1)}%`,
        },
      ],
    });
  }

  // --- Conta importante sem contato ---------------------------------------
  const totalVeiculos = ctx.frota?.totalVeiculos ?? null;
  const contaImportante = (totalVeiculos !== null && totalVeiculos >= 25) || ctx.faturamentoUltimos365 >= 60_000;
  if (contaImportante && (ctx.diasDesdeUltimaInteracao === null || ctx.diasDesdeUltimaInteracao > 30)) {
    candidatos.push({
      tipo: 'CONTA_IMPORTANTE_SEM_CONTATO',
      severidade: 'ATENCAO',
      oQueAconteceu: `${nome} está ${ctx.diasDesdeUltimaInteracao === null ? 'sem nenhum contato registrado' : `há ${ctx.diasDesdeUltimaInteracao} dias sem contato`}.`,
      porQueImporta: 'Contas do topo da carteira perdem share silenciosamente quando não são visitadas.',
      impactoEstimado: Math.round(ctx.faturamentoUltimos365 * 0.15),
      acaoSugerida: 'Agendar contato de relacionamento sem pauta de venda imediata.',
      prazoDias: 5,
      fatores: [
        {
          rotulo: 'Conta relevante',
          peso: 10,
          evidencia:
            totalVeiculos !== null
              ? `${totalVeiculos} veículos, ${formatarMoeda(ctx.faturamentoUltimos365)} em 12 meses`
              : `${formatarMoeda(ctx.faturamentoUltimos365)} em 12 meses`,
        },
      ],
    });
  }

  // --- Queda de comportamento ---------------------------------------------
  const janelaAtual = ctx.vendas.filter((v) => diasEntre(v.data, referencia) <= 90);
  const janelaAnterior = ctx.vendas.filter((v) => {
    const d = diasEntre(v.data, referencia);
    return d > 90 && d <= 180;
  });
  const volumeAtual = janelaAtual.reduce((s, v) => s + v.valorTotal, 0);
  const volumeAnterior = janelaAnterior.reduce((s, v) => s + v.valorTotal, 0);
  if (volumeAnterior > 5_000 && volumeAtual < volumeAnterior * 0.4) {
    candidatos.push({
      tipo: 'QUEDA_DE_COMPORTAMENTO',
      severidade: 'ATENCAO',
      oQueAconteceu: `${nome} caiu de ${formatarMoeda(volumeAnterior)} para ${formatarMoeda(volumeAtual)} comparando os dois últimos trimestres.`,
      porQueImporta: 'Queda de volume com a conta ainda ativa costuma indicar divisão de compra com concorrente.',
      impactoEstimado: Math.round(volumeAnterior - volumeAtual),
      acaoSugerida: 'Investigar mudança de operação, de comprador ou entrada de concorrente.',
      prazoDias: 4,
      fatores: [
        {
          rotulo: 'Queda de volume',
          peso: 10,
          evidencia: `${Math.round((1 - volumeAtual / volumeAnterior) * 100)}% de queda entre trimestres`,
        },
      ],
      proximaPergunta: 'Mudou alguma coisa na operação ou na equipe de compras de vocês?',
    });
  }

  // --- Kit incompleto -----------------------------------------------------
  const familiasKit = familias.filter((f) => f.sistema === 'EMBREAGEM' || f.sistema === 'FREIO');
  const idsKit = new Set(familiasKit.map((f) => f.id));
  const dataDaVenda = new Map(ctx.vendas.map((v) => [v.id, v.data]));
  const itensRecentesKit = ctx.itensVendidos.filter((i) => {
    const data = dataDaVenda.get(i.saleId);
    return idsKit.has(i.familyId) && data !== undefined && diasEntre(data, referencia) <= 30;
  });
  if (itensRecentesKit.length > 0) {
    const sistemasVendidos = new Set(
      itensRecentesKit.map((i) => familias.find((f) => f.id === i.familyId)?.sistema),
    );
    const familiasDoSistema = familias.filter((f) => sistemasVendidos.has(f.sistema));
    const compradas = new Set(itensRecentesKit.map((i) => i.familyId));
    const faltantes = familiasDoSistema.filter((f) => !compradas.has(f.id));
    if (faltantes.length > 0) {
      candidatos.push({
        tipo: 'KIT_INCOMPLETO',
        severidade: 'INFORMACAO',
        oQueAconteceu: `${nome} comprou item de ${[...sistemasVendidos].join(', ').toLowerCase()} sem os itens correlatos do mesmo sistema.`,
        porQueImporta:
          'Item de sistema comprado isolado costuma gerar segunda parada do veículo e retrabalho. Não é venda casada — é evitar que o cliente esqueça.',
        impactoEstimado: Math.round(ctx.ticketMedio * 0.4),
        acaoSugerida: `Perguntar se ${faltantes
          .slice(0, 2)
          .map((f) => f.nome.toLowerCase())
          .join(' e ')} já estão resolvidos na manutenção.`,
        prazoDias: 7,
        fatores: [
          {
            rotulo: 'Sistema parcialmente atendido',
            peso: 6,
            evidencia: `${faltantes.length} família(s) do mesmo sistema sem compra em 30 dias`,
          },
        ],
        proximaPergunta: 'Quem vai fazer a instalação já tem tudo que precisa?',
      });
    }
  }

  // --- Cadastro crítico ---------------------------------------------------
  if (ctx.lacunasCriticas.length >= 2 && ctx.faturamentoUltimos365 >= 20_000) {
    candidatos.push({
      tipo: 'CADASTRO_CRITICO',
      severidade: 'INFORMACAO',
      oQueAconteceu: `${nome} fatura ${formatarMoeda(ctx.faturamentoUltimos365)} por ano com ${ctx.lacunasCriticas.length} lacunas de cadastro.`,
      porQueImporta:
        'Sem frota e contato, o sistema não consegue dimensionar oportunidade nesta conta — e ela é grande.',
      impactoEstimado: Math.round(ctx.faturamentoUltimos365 * 0.1),
      acaoSugerida: 'Levantar frota e responsável de compras na próxima conversa.',
      prazoDias: 10,
      fatores: [
        { rotulo: 'Conta relevante sem dados', peso: 6, evidencia: ctx.lacunasCriticas.join('; ') },
      ],
      lacunas: ctx.lacunasCriticas,
      proximaPergunta: 'Quantos veículos vocês têm rodando hoje, e de quais marcas?',
    });
  }

  return candidatos;
}

export interface OpcoesAndon {
  settings: Settings;
  familias: ProductFamily[];
  acks: AlertAck[];
  referencia?: string;
}

export function gerarAlertas(contextos: CustomerContext[], opcoes: OpcoesAndon): Alert[] {
  const referencia = opcoes.referencia ?? hoje();
  const { settings } = opcoes;

  // Reconhecimentos ainda dentro da janela de silêncio.
  const silenciados = new Set(
    opcoes.acks
      .filter((a) => diasEntre(a.data, referencia) < settings.janelaSilencioDias)
      .map((a) => a.alertKey),
  );

  const alertas: Alert[] = [];

  for (const ctx of contextos) {
    const candidatos = detectarCandidatos(ctx, settings, opcoes.familias, referencia)
      .filter((c) => !silenciados.has(chaveAlerta(ctx.customer.id, c.tipo)))
      // Sem ação sugerida, sem alerta: o sistema não tem o direito de interromper
      // o vendedor se não sabe o que pedir a ele.
      .filter((c) => c.acaoSugerida.trim().length > 0)
      .sort(compararAlertas);

    if (candidatos.length === 0) continue;

    // Deduplicação por conta: o vendedor liga para o cliente, não para o alerta.
    // O principal vira alerta; os demais viram contexto dentro dele.
    const principal = candidatos[0];
    const contextoAdicional = candidatos.slice(1).map((c) => c.oQueAconteceu);

    alertas.push({
      id: `alert-${ctx.customer.id}-${principal.tipo.toLowerCase()}`,
      customerId: ctx.customer.id,
      tipo: principal.tipo,
      severidade: principal.severidade,
      oQueAconteceu: principal.oQueAconteceu,
      porQueImporta: principal.porQueImporta,
      impactoEstimado: principal.impactoEstimado,
      acaoSugerida: principal.acaoSugerida,
      responsavel: ctx.customer.sellerId,
      prazo: somarDias(referencia, principal.prazoDias),
      criadoEm: referencia,
      contextoAdicional,
      fatores: principal.fatores,
      penalidades: [],
      lacunas: principal.lacunas ?? [],
      proximaPergunta: principal.proximaPergunta ?? null,
    });
  }

  return aplicarOrcamentoDeSeveridade(alertas);
}

/**
 * Orçamento de severidade: no máximo TETO_CRITICOS críticos simultâneos.
 * O excedente é rebaixado a atenção, com o motivo registrado no contexto.
 */
export function aplicarOrcamentoDeSeveridade(alertas: Alert[]): Alert[] {
  const ordenados = [...alertas].sort(compararAlertas);

  let criticos = 0;
  return ordenados.map((alerta) => {
    if (alerta.severidade !== 'CRITICO') return alerta;
    criticos += 1;
    if (criticos <= TETO_CRITICOS) return alerta;
    return {
      ...alerta,
      severidade: 'ATENCAO' as SeveridadeAlerta,
      contextoAdicional: [
        ...alerta.contextoAdicional,
        `Rebaixado a atenção: já existem ${TETO_CRITICOS} alertas críticos com impacto maior.`,
      ],
    };
  });
}

export function alertasCriticos(alertas: Alert[]): Alert[] {
  return alertas.filter((a) => a.severidade === 'CRITICO');
}
