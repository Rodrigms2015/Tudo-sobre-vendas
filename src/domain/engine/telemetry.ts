/**
 * Telemetria comercial — execução antes de faturamento.
 *
 * O painel NÃO abre com receita. Abre com execução, porque receita é resultado
 * de execução e não se corrige diretamente. Ver docs/USER_JOURNEYS.md J9.
 *
 * Métrica antifraude: "% de recomendações aceitas" é capturável — um motor que só
 * recomenda o fácil atinge 95%. Ela é sempre acompanhada de promessas cumpridas e
 * orçamentos recuperados, que são RESULTADOS. Ver docs/CRITICAL_REVIEW.md §4.5.
 */

import type { Dataset, MotivoPerda } from '../types';
import { MOTIVOS_PERDA } from '../types';
import type { CustomerContext } from './context';
import { diasEntre, hoje } from '../dates';

export interface Metrica {
  chave: string;
  rotulo: string;
  valor: number;
  formato: 'NUMERO' | 'PERCENTUAL' | 'MOEDA';
  /** O que o número significa e o que fazer com ele. Métrica sem leitura é decoração. */
  leitura: string;
  /** Alerta quando a métrica está em faixa suspeita. */
  aviso: string | null;
}

export interface TelemetriaComercial {
  execucao: Metrica[];
  qualidade: Metrica[];
  resultado: Metrica[];
  perdasPorMotivo: { motivo: MotivoPerda; rotulo: string; gargalo: string; contagem: number; valor: number }[];
  tendenciaPerdas: { periodo: string; valor: number }[];
}

const PERIODO_DIAS = 90;

export function calcularTelemetria(
  dados: Dataset,
  contextos: CustomerContext[],
  sellerId: string,
  referencia = hoje(),
): TelemetriaComercial {
  const noPeriodo = <T extends { data: string }>(itens: T[]) =>
    itens.filter((i) => diasEntre(i.data, referencia) <= PERIODO_DIAS && diasEntre(i.data, referencia) >= 0);

  const idsClientes = new Set(contextos.map((c) => c.customer.id));
  const doVendedor = <T extends { customerId: string }>(itens: T[]) =>
    itens.filter((i) => idsClientes.has(i.customerId));

  const interacoes = noPeriodo(doVendedor(dados.interactions));
  const contatosUteis = interacoes.filter((i) => i.util).length;
  const taxaUtilidade = interacoes.length > 0 ? (contatosUteis / interacoes.length) * 100 : 0;

  const promessas = doVendedor(dados.promessas).filter(
    (p) => diasEntre(p.criadaEm, referencia) <= PERIODO_DIAS,
  );
  const promessasResolvidas = promessas.filter((p) => p.status !== 'PENDENTE');
  const promessasCumpridas = promessas.filter((p) => p.status === 'CUMPRIDA').length;
  const taxaPromessas =
    promessasResolvidas.length > 0 ? (promessasCumpridas / promessasResolvidas.length) * 100 : 0;

  const feedback = doVendedor(dados.recommendationFeedback).filter(
    (f) => diasEntre(f.data, referencia) <= PERIODO_DIAS,
  );
  const aceitas = feedback.filter((f) => f.aceita).length;
  const taxaAceitacao = feedback.length > 0 ? (aceitas / feedback.length) * 100 : 0;

  const orcamentos = noPeriodo(doVendedor(dados.quotes));
  const orcamentosFechados = orcamentos.filter((q) => q.status !== 'ABERTO');
  const ganhos = orcamentos.filter((q) => q.status === 'GANHO');
  const taxaConversao =
    orcamentosFechados.length > 0 ? (ganhos.length / orcamentosFechados.length) * 100 : 0;

  const perdas = noPeriodo(doVendedor(dados.lostSales));
  const perdasClassificadas = perdas.filter((p) => p.motivo !== 'OUTRO').length;
  const taxaClassificacao = perdas.length > 0 ? (perdasClassificadas / perdas.length) * 100 : 0;
  const valorPerdido = perdas.reduce((s, p) => s + p.valorEstimado, 0);

  const vendas = noPeriodo(doVendedor(dados.sales));
  const receita = vendas.reduce((s, v) => s + v.valorTotal, 0);
  const comMargem = vendas.filter((v) => v.margemPercentual !== null);
  const margemMedia =
    comMargem.length > 0
      ? comMargem.reduce((s, v) => s + (v.margemPercentual as number), 0) / comMargem.length
      : 0;

  // Venda de solução completa: pedidos com mais de uma família.
  const idsVendas = new Set(vendas.map((v) => v.id));
  const familiasPorVenda = new Map<string, Set<string>>();
  for (const item of dados.saleItems) {
    if (!idsVendas.has(item.saleId)) continue;
    const atual = familiasPorVenda.get(item.saleId);
    if (atual) atual.add(item.familyId);
    else familiasPorVenda.set(item.saleId, new Set([item.familyId]));
  }
  const multiFamilia = [...familiasPorVenda.values()].filter((s) => s.size > 1).length;
  const taxaSolucaoCompleta =
    familiasPorVenda.size > 0 ? (multiFamilia / familiasPorVenda.size) * 100 : 0;

  // Qualidade de cadastro.
  const semLacunas = contextos.filter((c) => c.lacunasCriticas.length === 0).length;
  const qualidadeCadastro = contextos.length > 0 ? (semLacunas / contextos.length) * 100 : 0;

  // Clientes reativados: estavam em perda provável e voltaram a comprar no período.
  const reativados = contextos.filter(
    (c) =>
      c.cadencia.temperatura !== 'PERDA_PROVAVEL' &&
      c.vendas.some((v) => diasEntre(v.data, referencia) <= PERIODO_DIAS) &&
      c.vendas.length >= 4,
  ).length;

  const execucao: Metrica[] = [
    {
      chave: 'contatosUteis',
      rotulo: 'Contatos úteis',
      valor: contatosUteis,
      formato: 'NUMERO',
      leitura: `De ${interacoes.length} contatos em ${PERIODO_DIAS} dias, ${contatosUteis} avançaram alguma conta.`,
      aviso:
        taxaUtilidade < 40 && interacoes.length >= 10
          ? 'Menos de 40% dos contatos foram úteis. O problema pode ser a priorização, não o volume.'
          : null,
    },
    {
      chave: 'taxaUtilidade',
      rotulo: 'Taxa de contato útil',
      valor: taxaUtilidade,
      formato: 'PERCENTUAL',
      leitura: 'Volume de ligações não é medido aqui. O que conta é o contato que moveu a conta.',
      aviso: null,
    },
    {
      chave: 'perdasClassificadas',
      rotulo: 'Perdas classificadas',
      valor: taxaClassificacao,
      formato: 'PERCENTUAL',
      leitura: `${perdasClassificadas} de ${perdas.length} perdas têm motivo definido.`,
      aviso:
        taxaClassificacao < 90 && perdas.length >= 5
          ? 'Abaixo de 90%: o loop de aprendizado com perdas está enfraquecendo.'
          : null,
    },
    {
      chave: 'qualidadeCadastro',
      rotulo: 'Cadastros completos',
      valor: qualidadeCadastro,
      formato: 'PERCENTUAL',
      leitura: `${semLacunas} de ${contextos.length} contas sem lacuna crítica. Lacuna reduz a confiança das recomendações.`,
      aviso: null,
    },
  ];

  const qualidade: Metrica[] = [
    {
      chave: 'taxaAceitacao',
      rotulo: 'Recomendações aceitas',
      valor: taxaAceitacao,
      formato: 'PERCENTUAL',
      leitura: `${aceitas} aceitas de ${feedback.length} avaliadas. Leia sempre junto com promessas cumpridas.`,
      aviso:
        taxaAceitacao > 85 && feedback.length >= 10
          ? 'Acima de 85% pode indicar que o motor está recomendando apenas o óbvio. Aceitação sem resultado é ruído.'
          : taxaAceitacao < 30 && feedback.length >= 10
            ? 'Abaixo de 30%: o motor está errando o alvo. Revise os pesos em Configurações.'
            : null,
    },
    {
      chave: 'solucaoCompleta',
      rotulo: 'Venda de solução completa',
      valor: taxaSolucaoCompleta,
      formato: 'PERCENTUAL',
      leitura: `${multiFamilia} de ${familiasPorVenda.size} pedidos com mais de uma família. Mede se a equipe vende solução ou tira pedido.`,
      aviso: null,
    },
    {
      chave: 'taxaConversao',
      rotulo: 'Conversão de orçamento',
      valor: taxaConversao,
      formato: 'PERCENTUAL',
      leitura: `${ganhos.length} ganhos de ${orcamentosFechados.length} orçamentos com desfecho.`,
      aviso: null,
    },
  ];

  const resultado: Metrica[] = [
    {
      chave: 'promessasCumpridas',
      rotulo: 'Promessas cumpridas',
      valor: taxaPromessas,
      formato: 'PERCENTUAL',
      leitura: `${promessasCumpridas} de ${promessasResolvidas.length} promessas resolvidas foram cumpridas. Este é resultado, não aceitação.`,
      aviso:
        taxaPromessas < 80 && promessasResolvidas.length >= 5
          ? 'Abaixo de 80%. Promessa quebrada é o dano de reputação mais caro do setor.'
          : null,
    },
    {
      chave: 'clientesReativados',
      rotulo: 'Contas ativas com histórico',
      valor: reativados,
      formato: 'NUMERO',
      leitura: 'Contas com cadência estabelecida que compraram no período.',
      aviso: null,
    },
    {
      chave: 'valorPerdido',
      rotulo: 'Valor perdido',
      valor: valorPerdido,
      formato: 'MOEDA',
      leitura: `${perdas.length} perdas em ${PERIODO_DIAS} dias. Veja o ranking de motivos abaixo para saber onde atacar.`,
      aviso: null,
    },
    {
      chave: 'receita',
      rotulo: 'Receita no período',
      valor: receita,
      formato: 'MOEDA',
      leitura: `${vendas.length} vendas${margemMedia > 0 ? `, margem média de ${margemMedia.toFixed(1)}%` : ''}.`,
      aviso: null,
    },
  ];

  const contagemPorMotivo = new Map<MotivoPerda, { contagem: number; valor: number }>();
  for (const p of perdas) {
    const atual = contagemPorMotivo.get(p.motivo) ?? { contagem: 0, valor: 0 };
    contagemPorMotivo.set(p.motivo, {
      contagem: atual.contagem + 1,
      valor: atual.valor + p.valorEstimado,
    });
  }
  const perdasPorMotivo = MOTIVOS_PERDA.map((m) => ({
    motivo: m.valor,
    rotulo: m.rotulo,
    gargalo: m.gargalo,
    contagem: contagemPorMotivo.get(m.valor)?.contagem ?? 0,
    valor: contagemPorMotivo.get(m.valor)?.valor ?? 0,
  }))
    .filter((m) => m.contagem > 0)
    .sort((a, b) => b.valor - a.valor);

  // Tendência: seis janelas de 30 dias.
  const tendenciaPerdas: { periodo: string; valor: number }[] = [];
  const todasPerdas = doVendedor(dados.lostSales);
  for (let i = 5; i >= 0; i--) {
    const inicio = i * 30 + 30;
    const fim = i * 30;
    const valor = todasPerdas
      .filter((p) => {
        const d = diasEntre(p.data, referencia);
        return d > fim && d <= inicio;
      })
      .reduce((s, p) => s + p.valorEstimado, 0);
    tendenciaPerdas.push({ periodo: `${inicio}-${fim}d`, valor });
  }

  void sellerId;
  return { execucao, qualidade, resultado, perdasPorMotivo, tendenciaPerdas };
}

export function formatarMetrica(m: Metrica): string {
  if (m.formato === 'PERCENTUAL') return `${m.valor.toFixed(0)}%`;
  if (m.formato === 'MOEDA') {
    return m.valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  }
  return m.valor.toLocaleString('pt-BR');
}
