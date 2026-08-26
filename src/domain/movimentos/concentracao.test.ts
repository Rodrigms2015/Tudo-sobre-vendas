/**
 * Concentração da saída.
 *
 * "Vendeu 100 em 8 meses" e "vendeu 90 num dia e 10 no resto" são a mesma
 * média mensal e decisões de compra opostas.
 */

import { describe, expect, it } from 'vitest';
import { LIMIAR_CONCENTRACAO, medirConcentracao, mediana, semMaiorDocumento } from './concentracao.js';

const s = (documento: string, qtd: number, data = '2026-03-10') => ({ documento, qtd, data });

describe('a pedrada aparece', () => {
  it('acusa quando um documento leva mais da metade', () => {
    /* O caso do enunciado: 100 unidades, 90 num pedido só. */
    const m = medirConcentracao([s('NF1', 90, '2026-01-05'), s('NF2', 5, '2026-02-05'), s('NF3', 5, '2026-03-05')]);
    expect(m?.total).toBe(100);
    expect(m?.maiorDocumento).toEqual({ documento: 'NF1', unidades: 90 });
    expect(m?.fracaoNoMaior).toBeCloseTo(0.9, 3);
    expect(m?.concentrada).toBe(true);
  });

  it('venda espalhada não é acusada', () => {
    const m = medirConcentracao([s('NF1', 10, '2026-01-05'), s('NF2', 10, '2026-02-05'), s('NF3', 10, '2026-03-05')]);
    expect(m?.fracaoNoMaior).toBeCloseTo(1 / 3, 3);
    expect(m?.concentrada).toBe(false);
  });

  it('o limiar é escolha de quem compra, não constante do código', () => {
    const saidas = [s('NF1', 40), s('NF2', 60)];
    expect(medirConcentracao(saidas, 0.5)?.concentrada).toBe(true);
    expect(medirConcentracao(saidas, 0.7)?.concentrada).toBe(false);
    expect(LIMIAR_CONCENTRACAO).toBe(0.5);
  });

  it('nunca descarta em silêncio: entrega o total com e sem o maior', () => {
    const saidas = [s('NF1', 90), s('NF2', 10)];
    expect(medirConcentracao(saidas)?.totalSemMaior).toBe(10);
    expect(semMaiorDocumento(saidas).map((x) => x.documento)).toEqual(['NF2']);
  });
});

describe('média e mediana lado a lado', () => {
  it('onde as duas se afastam, a média está sendo puxada', () => {
    /* Três meses: 5, 5 e 80. Média 30, mediana 5. */
    const m = medirConcentracao([
      s('NF1', 5, '2026-01-10'), s('NF2', 5, '2026-02-10'), s('NF3', 80, '2026-03-10'),
    ]);
    expect(m?.mesesAtivos).toBe(3);
    expect(m?.mediaMensal).toBeCloseTo(30, 3);
    expect(m?.medianaMensal).toBe(5);
  });

  it('soma o que saiu no mesmo mês em documentos diferentes', () => {
    const m = medirConcentracao([s('NF1', 4, '2026-01-05'), s('NF2', 6, '2026-01-20')]);
    expect(m?.mesesAtivos).toBe(1);
    expect(m?.mediaMensal).toBe(10);
  });

  it('mediana de lista vazia é nula, nunca zero', () => {
    expect(mediana([])).toBeNull();
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('o que não dá para afirmar', () => {
  it('sem documento não afirma concentração', () => {
    /* Sem saber em quantos pedidos aquilo saiu, não há concentração a medir —
       e juntar todas num balde só inventaria um pedido gigante. */
    const m = medirConcentracao([{ qtd: 50, data: '2026-01-05' }, { qtd: 50, data: '2026-02-05' }]);
    expect(m?.total).toBe(100);
    expect(m?.maiorDocumento).toBeNull();
    expect(m?.fracaoNoMaior).toBeNull();
    expect(m?.concentrada).toBeNull();
  });

  it('sem saída não há o que medir', () => {
    expect(medirConcentracao([])).toBeNull();
    expect(medirConcentracao(null)).toBeNull();
  });

  it('saída sem data não inventa mês', () => {
    const m = medirConcentracao([s('NF1', 10, ''), { documento: 'NF2', qtd: 10 }]);
    expect(m?.mesesAtivos).toBe(0);
    expect(m?.mediaMensal).toBeNull();
    expect(m?.medianaMensal).toBeNull();
  });
});
