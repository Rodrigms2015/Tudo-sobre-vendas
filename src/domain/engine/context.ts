/**
 * Contexto do cliente — visão agregada e indexada usada por todo o motor.
 *
 * Construído uma vez por leitura e reutilizado por scoring, ANDON, radar e telemetria.
 * Sem isso, cada módulo faria varredura linear sobre o dataset inteiro por cliente,
 * o que em uma carteira real (50 mil vendas) tornaria o Cockpit inutilizável.
 */

import type {
  Cadencia,
  Contact,
  Customer,
  Dataset,
  Fleet,
  Interaction,
  LostSale,
  Promessa,
  Quote,
  Sale,
  SaleItem,
  Task,
  Vehicle,
} from '../types';
import { calcularCadencia } from './cadence';
import { diasEntre, hoje } from '../dates';

export interface CustomerContext {
  customer: Customer;
  contatos: Contact[];
  frota: Fleet | null;
  veiculos: Vehicle[];
  vendas: Sale[];
  itensVendidos: SaleItem[];
  orcamentos: Quote[];
  interacoes: Interaction[];
  perdas: LostSale[];
  promessas: Promessa[];
  tarefas: Task[];

  cadencia: Cadencia;
  /** Cadência por família — base do Radar de Reposição. */
  cadenciaPorFamilia: Map<string, Cadencia>;

  comprasUltimos365: number;
  faturamentoUltimos365: number;
  ticketMedio: number;
  margemMedia: number | null;
  familiasCompradas: Set<string>;
  valorOrcamentoAberto: number;
  orcamentosAbertos: Quote[];
  diasDesdeUltimaInteracao: number | null;
  interacoesUteis90d: number;
  temUrgenciaAtiva: boolean;
  promessasVencidas: Promessa[];
  promessasHoje: Promessa[];
  /** Lacunas críticas de cadastro. Alimentam confiança e tarefas de enriquecimento. */
  lacunasCriticas: string[];
}

function agrupar<T>(itens: T[], chave: (item: T) => string): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const k = chave(item);
    const atual = mapa.get(k);
    if (atual) atual.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}

export interface IndicesDataset {
  vendasPorCliente: Map<string, Sale[]>;
  itensPorVenda: Map<string, SaleItem[]>;
  orcamentosPorCliente: Map<string, Quote[]>;
  interacoesPorCliente: Map<string, Interaction[]>;
  perdasPorCliente: Map<string, LostSale[]>;
  promessasPorCliente: Map<string, Promessa[]>;
  tarefasPorCliente: Map<string, Task[]>;
  contatosPorCliente: Map<string, Contact[]>;
  frotaPorCliente: Map<string, Fleet>;
  veiculosPorFrota: Map<string, Vehicle[]>;
}

export function construirIndices(dados: Dataset): IndicesDataset {
  const frotaPorCliente = new Map<string, Fleet>();
  for (const f of dados.fleets) frotaPorCliente.set(f.customerId, f);

  return {
    vendasPorCliente: agrupar(dados.sales, (v) => v.customerId),
    itensPorVenda: agrupar(dados.saleItems, (i) => i.saleId),
    orcamentosPorCliente: agrupar(dados.quotes, (q) => q.customerId),
    interacoesPorCliente: agrupar(dados.interactions, (i) => i.customerId),
    perdasPorCliente: agrupar(dados.lostSales, (p) => p.customerId),
    promessasPorCliente: agrupar(dados.promessas, (p) => p.customerId),
    tarefasPorCliente: agrupar(
      dados.tasks.filter((t) => t.customerId !== null),
      (t) => t.customerId as string,
    ),
    contatosPorCliente: agrupar(dados.contacts, (c) => c.customerId),
    frotaPorCliente,
    veiculosPorFrota: agrupar(dados.vehicles, (v) => v.fleetId),
  };
}

/** Janela em que uma interação marcada como urgente é considerada ativa. */
export const JANELA_URGENCIA_DIAS = 3;

export function construirContexto(
  customer: Customer,
  indices: IndicesDataset,
  referencia = hoje(),
): CustomerContext {
  const vendas = indices.vendasPorCliente.get(customer.id) ?? [];
  const orcamentos = indices.orcamentosPorCliente.get(customer.id) ?? [];
  const interacoes = indices.interacoesPorCliente.get(customer.id) ?? [];
  const perdas = indices.perdasPorCliente.get(customer.id) ?? [];
  const promessas = indices.promessasPorCliente.get(customer.id) ?? [];
  const tarefas = indices.tarefasPorCliente.get(customer.id) ?? [];
  const contatos = indices.contatosPorCliente.get(customer.id) ?? [];
  const frota = indices.frotaPorCliente.get(customer.id) ?? null;
  const veiculos = frota ? (indices.veiculosPorFrota.get(frota.id) ?? []) : [];

  const itensVendidos = vendas.flatMap((v) => indices.itensPorVenda.get(v.id) ?? []);

  const vendas365 = vendas.filter((v) => diasEntre(v.data, referencia) <= 365);
  const faturamentoUltimos365 = vendas365.reduce((s, v) => s + v.valorTotal, 0);
  const ticketMedio = vendas.length > 0
    ? vendas.reduce((s, v) => s + v.valorTotal, 0) / vendas.length
    : 0;

  const comMargem = vendas.filter((v) => v.margemPercentual !== null);
  const margemMedia =
    comMargem.length > 0
      ? comMargem.reduce((s, v) => s + (v.margemPercentual as number), 0) / comMargem.length
      : null;

  // Cadência por família, para o Radar de Reposição.
  const idsVendas365 = new Set(vendas365.map((v) => v.id));
  const datasPorFamilia = new Map<string, string[]>();
  const familiasCompradas = new Set<string>();
  const dataDaVenda = new Map(vendas.map((v) => [v.id, v.data]));
  for (const item of itensVendidos) {
    const data = dataDaVenda.get(item.saleId);
    if (!data) continue;
    if (idsVendas365.has(item.saleId)) familiasCompradas.add(item.familyId);
    const lista = datasPorFamilia.get(item.familyId);
    if (lista) lista.push(data);
    else datasPorFamilia.set(item.familyId, [data]);
  }
  const cadenciaPorFamilia = new Map<string, Cadencia>();
  for (const [familyId, datas] of datasPorFamilia) {
    cadenciaPorFamilia.set(
      familyId,
      calcularCadencia(
        datas.map((d) => ({ data: d }) as Sale),
        referencia,
      ),
    );
  }

  const orcamentosAbertos = orcamentos.filter((q) => q.status === 'ABERTO');
  const valorOrcamentoAberto = orcamentosAbertos.reduce((s, q) => s + q.valorTotal, 0);

  const interacoesOrdenadas = [...interacoes].sort((a, b) => b.data.localeCompare(a.data));
  const diasDesdeUltimaInteracao =
    interacoesOrdenadas.length > 0 ? diasEntre(interacoesOrdenadas[0].data, referencia) : null;

  const interacoesUteis90d = interacoes.filter(
    (i) => i.util && diasEntre(i.data, referencia) <= 90,
  ).length;

  const temUrgenciaAtiva = interacoes.some(
    (i) => i.urgente && diasEntre(i.data, referencia) <= JANELA_URGENCIA_DIAS,
  );

  const pendentes = promessas.filter((p) => p.status === 'PENDENTE');
  const promessasVencidas = pendentes.filter((p) => diasEntre(p.dataPrometida, referencia) > 0);
  const promessasHoje = pendentes.filter((p) => p.dataPrometida === referencia);

  const lacunasCriticas: string[] = [];
  if (!frota || frota.totalVeiculos === null) {
    lacunasCriticas.push('Frota não cadastrada');
  }
  if (contatos.length === 0) {
    lacunasCriticas.push('Nenhum contato registrado');
  }
  if (margemMedia === null && vendas.length > 0) {
    lacunasCriticas.push('Margem não disponível no histórico');
  }
  if (customer.potencial === null) {
    lacunasCriticas.push('Potencial nunca avaliado');
  }

  return {
    customer,
    contatos,
    frota,
    veiculos,
    vendas,
    itensVendidos,
    orcamentos,
    interacoes,
    perdas,
    promessas,
    tarefas,
    cadencia: calcularCadencia(vendas, referencia),
    cadenciaPorFamilia,
    comprasUltimos365: vendas365.length,
    faturamentoUltimos365,
    ticketMedio,
    margemMedia,
    familiasCompradas,
    valorOrcamentoAberto,
    orcamentosAbertos,
    diasDesdeUltimaInteracao,
    interacoesUteis90d,
    temUrgenciaAtiva,
    promessasVencidas,
    promessasHoje,
    lacunasCriticas,
  };
}

export function construirTodosContextos(
  dados: Dataset,
  sellerId: string | null,
  referencia = hoje(),
): CustomerContext[] {
  const indices = construirIndices(dados);
  const clientes = sellerId
    ? dados.customers.filter((c) => c.sellerId === sellerId)
    : dados.customers;
  return clientes.map((c) => construirContexto(c, indices, referencia));
}
