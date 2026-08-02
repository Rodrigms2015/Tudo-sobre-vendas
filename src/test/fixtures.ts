/**
 * Fábricas de dados para teste. Todas produzem entidades mínimas e válidas,
 * com sobrescrita parcial, para que cada teste declare apenas o que lhe importa.
 */

import type {
  Customer,
  Dataset,
  Fleet,
  Interaction,
  LostSale,
  Promessa,
  Quote,
  Sale,
  SaleItem,
} from '../domain/types';
import { datasetVazio } from '../domain/types';
import { somarDias } from '../domain/dates';
import { FAMILIAS, RELACOES } from '../domain/seed/catalog';

export const REF = '2026-06-01';

export function cliente(over: Partial<Customer> = {}): Customer {
  return {
    id: 'cli-t01',
    nomeFantasia: 'Transportes Teste',
    cidade: 'Campinas',
    uf: 'SP',
    segmento: 'CARGA_RODOVIARIA',
    tipoCliente: 'TRANSPORTADORA',
    sellerId: 'vnd-001',
    potencial: 3,
    criadoEm: somarDias(REF, -700),
    observacoes: '',
    origem: 'DEMONSTRACAO',
    ...over,
  };
}

export function frota(over: Partial<Fleet> = {}): Fleet {
  return {
    id: 'frt-t01',
    customerId: 'cli-t01',
    totalVeiculos: 20,
    perfilOperacao: 'RODOVIARIO',
    idadeMediaAnos: 8,
    procedencia: 'ESTIMADO',
    ...over,
  };
}

/** Gera `quantidade` vendas com intervalo fixo, a última há `diasAtras` dias. */
export function vendasRegulares(
  customerId: string,
  intervalo: number,
  quantidade: number,
  diasAtras: number,
  valor = 4000,
): { vendas: Sale[]; itens: SaleItem[] } {
  const vendas: Sale[] = [];
  const itens: SaleItem[] = [];
  let cursor = somarDias(REF, -diasAtras);
  for (let i = 0; i < quantidade; i++) {
    const id = `vnd-t-${customerId}-${i}`;
    vendas.push({
      id,
      customerId,
      data: cursor,
      valorTotal: valor,
      margemPercentual: 18,
      quoteId: null,
    });
    itens.push({
      id: `itm-t-${customerId}-${i}`,
      saleId: id,
      productId: 'prd-001',
      familyId: 'fam-01',
      quantidade: 1,
      valorTotal: valor,
    });
    cursor = somarDias(cursor, -intervalo);
  }
  return { vendas, itens };
}

export function orcamento(over: Partial<Quote> = {}): Quote {
  return {
    id: 'orc-t01',
    customerId: 'cli-t01',
    data: somarDias(REF, -10),
    status: 'ABERTO',
    valorTotal: 15000,
    validadeDias: 15,
    ...over,
  };
}

export function interacao(over: Partial<Interaction> = {}): Interaction {
  return {
    id: 'int-t01',
    customerId: 'cli-t01',
    tipo: 'LIGACAO',
    data: somarDias(REF, -5),
    util: true,
    urgente: false,
    resumo: 'Contato de rotina',
    ...over,
  };
}

export function promessa(over: Partial<Promessa> = {}): Promessa {
  return {
    id: 'prm-t01',
    customerId: 'cli-t01',
    descricao: 'Retornar com prazo',
    dataPrometida: somarDias(REF, -3),
    criadaEm: somarDias(REF, -8),
    status: 'PENDENTE',
    ...over,
  };
}

export function perda(over: Partial<LostSale> = {}): LostSale {
  return {
    id: 'prd-t01',
    customerId: 'cli-t01',
    data: somarDias(REF, -10),
    motivo: 'ESTOQUE',
    valorEstimado: 8000,
    familyId: 'fam-03',
    recuperavel: true,
    detalhe: '',
    ...over,
  };
}

/** Dataset com catálogo real e as entidades passadas. */
export function dataset(parcial: Partial<Dataset> = {}): Dataset {
  return {
    ...datasetVazio(),
    sellers: [{ id: 'vnd-001', nome: 'Teste', regiao: 'Sudeste', metaMensal: 100000 }],
    productFamilies: FAMILIAS,
    productRelations: RELACOES,
    ...parcial,
  };
}
