import { describe, expect, it } from 'vitest';
import { calcularScore, normalizarPesos, FRACAO_POR_TEMPERATURA } from './scoring';
import { construirContexto, construirIndices } from './context';
import { PESOS_PADRAO, type PesosScore } from '../types';
import { FAMILIAS } from '../seed/catalog';
import {
  REF,
  cliente,
  dataset,
  frota,
  interacao,
  orcamento,
  promessa,
  vendasRegulares,
} from '../../test/fixtures';

function contextoDe(parcial: Parameters<typeof dataset>[0]) {
  const dados = dataset({ customers: [cliente()], ...parcial });
  return construirContexto(dados.customers[0], construirIndices(dados), REF);
}

describe('normalizarPesos', () => {
  it('mantém pesos que já somam 100', () => {
    expect(normalizarPesos(PESOS_PADRAO)).toEqual(PESOS_PADRAO);
  });

  it('normaliza para 100 quando o gestor altera a soma', () => {
    const dobrados = Object.fromEntries(
      Object.entries(PESOS_PADRAO).map(([k, v]) => [k, v * 2]),
    ) as PesosScore;
    const normalizado = normalizarPesos(dobrados);
    const soma = Object.values(normalizado).reduce((s, v) => s + v, 0);
    expect(soma).toBeCloseTo(100, 5);
    expect(normalizado.recorrencia).toBeCloseTo(20, 5);
  });

  it('não divide por zero quando todos os pesos são zerados', () => {
    const zerados = Object.fromEntries(
      Object.keys(PESOS_PADRAO).map((k) => [k, 0]),
    ) as PesosScore;
    expect(() => normalizarPesos(zerados)).not.toThrow();
  });
});

describe('pesos padrão', () => {
  it('somam exatamente 100', () => {
    expect(Object.values(PESOS_PADRAO).reduce((s, v) => s + v, 0)).toBe(100);
  });
});

describe('componente tempo sem compra', () => {
  it('tem o pico na JANELA, não no atraso máximo', () => {
    // Decisão deliberada: o objetivo é ligar ANTES do concorrente,
    // não catalogar clientes já perdidos.
    expect(FRACAO_POR_TEMPERATURA.JANELA).toBe(1.0);
    expect(FRACAO_POR_TEMPERATURA.ATRASADO).toBeLessThan(FRACAO_POR_TEMPERATURA.JANELA);
    expect(FRACAO_POR_TEMPERATURA.PERDA_PROVAVEL).toBeLessThan(FRACAO_POR_TEMPERATURA.ATRASADO);
    expect(FRACAO_POR_TEMPERATURA.NO_CICLO).toBe(0);
  });

  it('não pontua cliente dentro do próprio ciclo', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 15);
    const ctx = contextoDe({ sales: vendas, saleItems: itens, fleets: [frota()] });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(ctx.cadencia.temperatura).toBe('NO_CICLO');
    expect(r.componentes.tempoSemCompra).toBe(0);
  });

  it('pontua o máximo na janela de recompra', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 57);
    const ctx = contextoDe({ sales: vendas, saleItems: itens, fleets: [frota()] });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(ctx.cadencia.temperatura).toBe('JANELA');
    expect(r.componentes.tempoSemCompra).toBe(PESOS_PADRAO.tempoSemCompra);
  });

  it('registra lacuna em vez de pontuar quando não há base', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 2, 100);
    const ctx = contextoDe({ sales: vendas, saleItems: itens, fleets: [frota()] });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.componentes.tempoSemCompra).toBe(0);
    expect(r.lacunas.some((l) => l.includes('cadência'))).toBe(true);
  });
});

describe('componente potencial de frota', () => {
  it('não pontua e registra lacuna quando a frota não está cadastrada', () => {
    const ctx = contextoDe({ fleets: [frota({ totalVeiculos: null, procedencia: 'AUSENTE' })] });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.componentes.potencialFrota).toBe(0);
    expect(r.lacunas.some((l) => l.includes('Frota'))).toBe(true);
  });

  it('satura em 50 veículos', () => {
    const ctxGrande = contextoDe({ fleets: [frota({ totalVeiculos: 200 })] });
    const r = calcularScore(ctxGrande, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.componentes.potencialFrota).toBe(PESOS_PADRAO.potencialFrota);
  });
});

describe('componente margem', () => {
  it('não assume média quando a margem está ausente', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 30);
    const semMargem = vendas.map((v) => ({ ...v, margemPercentual: null }));
    const ctx = contextoDe({ sales: semMargem, saleItems: itens, fleets: [frota()] });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.componentes.margemPotencial).toBe(0);
    expect(r.lacunas.some((l) => l.includes('Margem'))).toBe(true);
  });
});

describe('componente compromisso vencido', () => {
  it('pontua o máximo com promessa vencida', () => {
    const ctx = contextoDe({ promessas: [promessa()], fleets: [frota()] });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.componentes.compromissoVencido).toBe(PESOS_PADRAO.compromissoVencido);
  });

  it('pontua parcialmente quando a promessa vence hoje', () => {
    const ctx = contextoDe({
      promessas: [promessa({ dataPrometida: REF })],
      fleets: [frota()],
    });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.componentes.compromissoVencido).toBeGreaterThan(0);
    expect(r.componentes.compromissoVencido).toBeLessThan(PESOS_PADRAO.compromissoVencido);
  });
});

describe('componente orçamento aberto', () => {
  it('pontua e explica com o valor e a idade do orçamento', () => {
    const ctx = contextoDe({ quotes: [orcamento()], fleets: [frota()] });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.componentes.orcamentoAberto).toBeGreaterThan(0);
    const fator = r.fatores.find((f) => f.rotulo.includes('Orçamento'));
    expect(fator?.evidencia).toMatch(/orçamento/i);
  });

  it('ignora orçamentos já fechados', () => {
    const ctx = contextoDe({ quotes: [orcamento({ status: 'GANHO' })], fleets: [frota()] });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.componentes.orcamentoAberto).toBe(0);
  });
});

describe('score total', () => {
  it('nunca ultrapassa 100 mesmo com todos os sinais acesos', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 30, 14, 33);
    const ctx = contextoDe({
      sales: vendas,
      saleItems: itens,
      fleets: [frota({ totalVeiculos: 500 })],
      quotes: [orcamento({ valorTotal: 500000 })],
      promessas: [promessa()],
      interactions: [
        interacao({ id: 'i1', urgente: true, data: REF }),
        interacao({ id: 'i2' }),
        interacao({ id: 'i3' }),
        interacao({ id: 'i4' }),
        interacao({ id: 'i5' }),
        interacao({ id: 'i6' }),
        interacao({ id: 'i7' }),
      ],
    });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThan(60);
  });

  it('nunca é negativo em uma conta sem nenhum sinal', () => {
    const ctx = contextoDe({});
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it('expõe drivers dominantes sempre que houver pontuação', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 57);
    const ctx = contextoDe({ sales: vendas, saleItems: itens, fleets: [frota()] });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.score).toBeGreaterThan(0);
    expect(r.driversDominantes.length).toBeGreaterThan(0);
  });

  it('responde imediatamente à recalibração de pesos', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 57);
    const ctx = contextoDe({ sales: vendas, saleItems: itens, fleets: [frota()] });
    const padrao = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    const semTempo = calcularScore(
      ctx,
      { ...PESOS_PADRAO, tempoSemCompra: 0 },
      FAMILIAS,
      REF,
    );
    expect(semTempo.componentes.tempoSemCompra).toBe(0);
    expect(semTempo.score).not.toBe(padrao.score);
  });
});

describe('todo fator carrega evidência concreta', () => {
  it('nenhuma evidência é vazia ou genérica', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 8, 57);
    const ctx = contextoDe({
      sales: vendas,
      saleItems: itens,
      fleets: [frota()],
      quotes: [orcamento()],
      interactions: [interacao()],
    });
    const r = calcularScore(ctx, PESOS_PADRAO, FAMILIAS, REF);
    expect(r.fatores.length).toBeGreaterThan(0);
    for (const f of [...r.fatores, ...r.penalidades]) {
      expect(f.evidencia.trim().length).toBeGreaterThan(10);
      expect(f.rotulo.trim().length).toBeGreaterThan(0);
    }
  });
});
