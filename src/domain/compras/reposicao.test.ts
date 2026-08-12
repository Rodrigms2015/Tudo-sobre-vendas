/**
 * Caracterização do cálculo de reposição.
 *
 * Estes testes descrevem a REGRA DE NEGÓCIO. Se um dia o algoritmo mudar de
 * forma, eles continuam valendo — e se um limiar mudar, eles têm de falhar.
 */

import { describe, expect, it } from 'vitest';
import {
  FONTE,
  PESOS_PRIORIDADE,
  porDiaMedido,
  quantidadeParaCobrir,
  ressalvaDeRuptura,
  separarPorFonte,
  validarPesos,
} from './reposicao.js';

describe('os pesos da prioridade somam 100', () => {
  it('soma exatamente 100 — a nota é pontos/100', () => {
    expect(validarPesos(PESOS_PRIORIDADE)).toBe(100);
  });

  it('mantém os pesos que o motor realmente usa', () => {
    expect(PESOS_PRIORIDADE).toEqual({ giro: 45, ruptura: 30, desvio: 15, essencialidade: 10 });
  });

  it('QUEBRA se alguém desbalancear os pesos', () => {
    expect(() => validarPesos({ giro: 45, ruptura: 30, desvio: 15, essencialidade: 5 })).toThrow(/somam 95/);
    expect(() => validarPesos({ giro: 50, ruptura: 30, desvio: 15, essencialidade: 10 })).toThrow(/somam 105/);
  });
});

describe('CASO 6 — 29 unidades em 213 dias, cobrindo 45 dias, dá 7', () => {
  it('calcula o ritmo diário medido', () => {
    expect(porDiaMedido(29, 213)).toBeCloseTo(0.13615, 5);
  });

  it('sugere 7 unidades, e não 6', () => {
    /* 29/213 × 45 = 6,127. Arredondar para baixo deixa o balcão descoberto. */
    expect(quantidadeParaCobrir({ porDia: porDiaMedido(29, 213), diasCobertura: 45, saldo: 0 })).toBe(7);
  });

  it('desconta o que já está na prateleira', () => {
    expect(quantidadeParaCobrir({ porDia: porDiaMedido(29, 213), diasCobertura: 45, saldo: 4 })).toBe(3);
  });

  it('nunca sugere menos de 1 para item que vende', () => {
    expect(quantidadeParaCobrir({ porDia: porDiaMedido(29, 213), diasCobertura: 45, saldo: 999 })).toBe(1);
  });

  it('devolve null quando não há ritmo — ausência não é zero', () => {
    expect(quantidadeParaCobrir({ porDia: null, diasCobertura: 45, saldo: 0 })).toBeNull();
    expect(quantidadeParaCobrir({ porDia: 0, diasCobertura: 45, saldo: 0 })).toBeNull();
  });

  it('não mede ritmo sem período', () => {
    expect(porDiaMedido(29, 0)).toBeNull();
    expect(porDiaMedido(29, null)).toBeNull();
    expect(porDiaMedido(null, 213)).toBeNull();
  });
});

describe('venda medida e estimativa nunca se somam num número só', () => {
  const lista = [
    { fonte: FONTE.MEDIDA, quantidade: 9 },
    { fonte: FONTE.MEDIDA, quantidade: 12 },
    { fonte: FONTE.ESTIMADA, quantidade: 12 },
    { fonte: FONTE.ESTIMADA, quantidade: 5 },
  ];

  it('separa itens e unidades por fonte', () => {
    const s = separarPorFonte(lista);
    expect(s.medida).toEqual({ itens: 2, unidades: 21 });
    expect(s.estimada).toEqual({ itens: 2, unidades: 17 });
  });

  it('o total fecha a soma das duas parcelas', () => {
    const s = separarPorFonte(lista);
    expect(s.total.itens).toBe(s.medida.itens + s.estimada.itens);
    expect(s.total.unidades).toBe(s.medida.unidades + s.estimada.unidades);
  });

  it('ignora quantidade nula ou zero — não é pedido', () => {
    const s = separarPorFonte([
      { fonte: FONTE.MEDIDA, quantidade: null },
      { fonte: FONTE.MEDIDA, quantidade: 0 },
      { fonte: FONTE.MEDIDA, quantidade: 3 },
    ]);
    expect(s.medida).toEqual({ itens: 1, unidades: 3 });
  });

  it('trata o antigo campo booleano `medida` como fonte medida', () => {
    const s = separarPorFonte([{ medida: true, quantidade: 4 }, { medida: false, quantidade: 6 }]);
    expect(s.medida.unidades).toBe(4);
    expect(s.estimada.unidades).toBe(6);
  });
});

describe('nenhuma data de ruptura é inferida sem histórico que a prove', () => {
  it('avisa da possível subestimação, mas NÃO mexe na quantidade', () => {
    const r = ressalvaDeRuptura({ saldo: 0, diasSemVender: 60 });
    expect(r).not.toBeNull();
    expect(r?.ajustaQuantidade).toBe(false);
    expect(r?.aviso).toMatch(/possivelmente subestimada/i);
  });

  it('some quando existe histórico de estoque para provar o período zerado', () => {
    expect(ressalvaDeRuptura({ saldo: 0, diasSemVender: 60, temHistoricoDeEstoque: true })).toBeNull();
  });

  it('não avisa nada para item com saldo', () => {
    expect(ressalvaDeRuptura({ saldo: 5, diasSemVender: 60 })).toBeNull();
  });

  it('não avisa quando nem se sabe há quanto tempo não vende', () => {
    expect(ressalvaDeRuptura({ saldo: 0, diasSemVender: null })).toBeNull();
  });

  it('a quantidade com ressalva é a MESMA de sem ressalva — nada muda em silêncio', () => {
    const porDia = porDiaMedido(29, 213) as number;
    const semRessalva = quantidadeParaCobrir({ porDia, diasCobertura: 45, saldo: 0 });
    const r = ressalvaDeRuptura({ saldo: 0, diasSemVender: 60 });
    const comRessalva = r && r.ajustaQuantidade
      ? quantidadeParaCobrir({ porDia: porDia * 2, diasCobertura: 45, saldo: 0 })
      : semRessalva;
    expect(comRessalva).toBe(semRessalva);
    expect(comRessalva).toBe(7);
  });
});
