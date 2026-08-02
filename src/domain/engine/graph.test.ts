/**
 * O teste mais importante deste arquivo é o último bloco: verificar que o grafo é
 * INCAPAZ de descer a nível de peça. A restrição é estrutural, não uma convenção.
 */

import { describe, expect, it } from 'vitest';
import { calcularCorrelacaoDeCesta, montarGrafo, perguntasDeVendaCompleta } from './graph';
import { FAMILIAS, RELACOES } from '../seed/catalog';
import { gerarDadosDemo } from '../seed';
import { dataset } from '../../test/fixtures';
import type { Sale, SaleItem } from '../types';

const REF = '2026-06-01';

function vendaCom(saleId: string, familias: string[]): { venda: Sale; itens: SaleItem[] } {
  return {
    venda: {
      id: saleId,
      customerId: 'cli-t01',
      data: REF,
      valorTotal: 1000,
      margemPercentual: 15,
      quoteId: null,
    },
    itens: familias.map((f, i) => ({
      id: `${saleId}-${i}`,
      saleId,
      productId: `prd-${f}`,
      familyId: f,
      quantidade: 1,
      valorTotal: 500,
    })),
  };
}

describe('correlação de cesta', () => {
  it('calcula suporte como fração de pedidos que contêm a origem', () => {
    const vendas = [
      vendaCom('v1', ['fam-01', 'fam-02']),
      vendaCom('v2', ['fam-01', 'fam-02']),
      vendaCom('v3', ['fam-01', 'fam-02']),
      vendaCom('v4', ['fam-01']),
    ];
    const dados = dataset({
      sales: vendas.map((v) => v.venda),
      saleItems: vendas.flatMap((v) => v.itens),
    });
    const arestas = calcularCorrelacaoDeCesta(dados, 3, 0.2);
    const aresta = arestas.find(
      (a) => a.origemFamilyId === 'fam-01' && a.destinoFamilyId === 'fam-02',
    );
    expect(aresta?.suporte).toBeCloseTo(0.75, 5);
  });

  it('ignora relação sem pedidos suficientes — não inventa correlação com n pequeno', () => {
    const vendas = [vendaCom('v1', ['fam-01', 'fam-02'])];
    const dados = dataset({
      sales: vendas.map((v) => v.venda),
      saleItems: vendas.flatMap((v) => v.itens),
    });
    expect(calcularCorrelacaoDeCesta(dados, 3, 0.2)).toHaveLength(0);
  });

  it('marca correlações calculadas como CONFIRMADO, com o número de pedidos visível', () => {
    const vendas = [
      vendaCom('v1', ['fam-01', 'fam-02']),
      vendaCom('v2', ['fam-01', 'fam-02']),
      vendaCom('v3', ['fam-01', 'fam-02']),
    ];
    const dados = dataset({
      sales: vendas.map((v) => v.venda),
      saleItems: vendas.flatMap((v) => v.itens),
    });
    const arestas = calcularCorrelacaoDeCesta(dados, 3, 0.2);
    expect(arestas[0].procedencia).toBe('CONFIRMADO');
    expect(arestas[0].pedidosObservados).toBe(3);
  });

  it('dado observado vence dado declarado no grafo montado', () => {
    const vendas = Array.from({ length: 5 }, (_, i) => vendaCom(`v${i}`, ['fam-01', 'fam-02']));
    const dados = dataset({
      sales: vendas.map((v) => v.venda),
      saleItems: vendas.flatMap((v) => v.itens),
    });
    const calculadas = calcularCorrelacaoDeCesta(dados, 3, 0.2);
    const grafo = montarGrafo('EMBREAGEM', FAMILIAS, RELACOES, calculadas, new Set());
    const aresta = grafo.arestas.find(
      (a) => a.origemFamilyId === 'fam-01' && a.destinoFamilyId === 'fam-02',
    );
    expect(aresta?.procedencia).toBe('CONFIRMADO');
  });
});

describe('montagem do grafo', () => {
  it('inclui as relações declaradas quando não há histórico', () => {
    const grafo = montarGrafo('EMBREAGEM', FAMILIAS, RELACOES, [], new Set());
    expect(grafo.arestas.length).toBeGreaterThan(0);
    expect(grafo.arestas.every((a) => a.procedencia === 'DEMONSTRACAO')).toBe(true);
  });

  it('marca os nós que o cliente já compra', () => {
    const grafo = montarGrafo('EMBREAGEM', FAMILIAS, RELACOES, [], new Set(['fam-01']));
    expect(grafo.nos.find((n) => n.familyId === 'fam-01')?.jaCompra).toBe(true);
    expect(grafo.nos.find((n) => n.familyId === 'fam-02')?.jaCompra).toBe(false);
  });

  it('não retorna arestas para sistema sem relações', () => {
    const grafo = montarGrafo('DIRECAO', FAMILIAS, RELACOES, [], new Set());
    expect(grafo.arestas).toHaveLength(0);
  });
});

describe('perguntas de venda completa', () => {
  it('só sugere famílias que o cliente ainda NÃO compra', () => {
    const perguntas = perguntasDeVendaCompleta(
      'fam-01',
      FAMILIAS,
      montarGrafo('EMBREAGEM', FAMILIAS, RELACOES, [], new Set(['fam-01'])).arestas,
      new Set(['fam-01', 'fam-02']),
    );
    expect(perguntas.every((p) => p.familia.id !== 'fam-02')).toBe(true);
  });

  it('retorna PERGUNTAS, nunca instruções de venda', () => {
    const perguntas = perguntasDeVendaCompleta(
      'fam-01',
      FAMILIAS,
      montarGrafo('EMBREAGEM', FAMILIAS, RELACOES, [], new Set()).arestas,
      new Set(),
    );
    expect(perguntas.length).toBeGreaterThan(0);
    for (const p of perguntas) {
      expect(p.pergunta).toContain('?');
    }
  });
});

describe('restrição estrutural: o grafo é incapaz de descer a nível de peça', () => {
  const dados = gerarDadosDemo(REF);
  const correlacoes = calcularCorrelacaoDeCesta(dados);
  const idsFamilias = new Set(dados.productFamilies.map((f) => f.id));
  const idsProdutos = new Set(dados.products.map((p) => p.id));

  it('toda aresta calculada liga família a família', () => {
    for (const a of correlacoes) {
      expect(idsFamilias.has(a.origemFamilyId)).toBe(true);
      expect(idsFamilias.has(a.destinoFamilyId)).toBe(true);
      expect(idsProdutos.has(a.origemFamilyId)).toBe(false);
      expect(idsProdutos.has(a.destinoFamilyId)).toBe(false);
    }
  });

  it('nenhum nó do grafo é um produto', () => {
    for (const sistema of new Set(dados.productFamilies.map((f) => f.sistema))) {
      const grafo = montarGrafo(
        sistema,
        dados.productFamilies,
        dados.productRelations,
        correlacoes,
        new Set(),
      );
      for (const no of grafo.nos) {
        expect(idsFamilias.has(no.familyId)).toBe(true);
      }
    }
  });

  it('nenhuma pergunta sugerida menciona marca ou modelo de veículo', () => {
    const marcas = ['Scania', 'Volvo', 'Mercedes', 'Iveco', 'DAF', 'MAN', 'Volkswagen'];
    for (const a of [...correlacoes, ...dados.productRelations]) {
      const texto = 'perguntaSugerida' in a ? a.perguntaSugerida : '';
      for (const marca of marcas) {
        expect(texto).not.toContain(marca);
      }
    }
  });
});
