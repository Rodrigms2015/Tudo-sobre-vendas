/**
 * Compra a partir da venda das outras praças.
 *
 * Os números vêm do cruzamento real de 24/08: Cascavel, Caxias do Sul, Porto
 * Alegre e Londrina contra o estoque de Passo Fundo.
 */

import { describe, expect, it } from 'vitest';
import { DIAS_COBERTURA_PADRAO, ordenarPorGiro, quantidadePelaRede } from './rede.js';

describe('cada praça é medida no período dela', () => {
  it('usa a média das taxas diárias, não a taxa da soma', () => {
    /* Uma praça vendeu 232 em 232 dias (1/dia); a outra vendeu 60 em 60 dias
       (1/dia). A média das taxas é 1/dia. Somar tudo e dividir pelo período
       mais longo daria 292/232 = 1,26 — inflando por um período que a segunda
       praça nunca teve. */
    const r = quantidadePelaRede([{ unidades: 232, dias: 232 }, { unidades: 60, dias: 60 }], 45, 0);
    expect(r?.porDiaPorPraca).toBeCloseTo(1, 6);
    expect(r?.qtd).toBe(45);
  });

  it('quem mediu menos tempo não é diluído', () => {
    /* Londrina vendeu 30 em 30 dias: 1/dia. Se entrasse no período de 232
       dias da outra, viraria 0,13/dia e sumiria da lista. */
    const comLondrina = quantidadePelaRede([{ unidades: 10, dias: 232 }, { unidades: 30, dias: 30 }], 45, 0);
    const soCascavel = quantidadePelaRede([{ unidades: 10, dias: 232 }], 45, 0);
    expect(comLondrina!.porDiaPorPraca).toBeGreaterThan(soCascavel!.porDiaPorPraca);
  });

  it('diz na base quando os períodos não são o mesmo', () => {
    expect(quantidadePelaRede([{ unidades: 1, dias: 30 }, { unidades: 1, dias: 60 }], 45, 0)?.base)
      .toBe('média da taxa diária de 2 praças, cada uma no período que mediu');
    expect(quantidadePelaRede([{ unidades: 1, dias: 30 }, { unidades: 1, dias: 30 }], 45, 0)?.base)
      .toBe('média da taxa diária de 2 praças, em 30 dias');
  });

  it('praça sem medição não entra no divisor', () => {
    /* Ausência de medida não é venda zero: uma praça com dias 0 sairia
       puxando a média para baixo se contasse. */
    const r = quantidadePelaRede([{ unidades: 90, dias: 90 }, { unidades: 0, dias: 0 }], 30, 0);
    expect(r?.pracasComVenda).toBe(1);
    expect(r?.qtd).toBe(30);
  });
});

describe('a quantidade', () => {
  it('desconta o que já tem aqui', () => {
    expect(quantidadePelaRede([{ unidades: 450, dias: 90 }, { unidades: 450, dias: 90 }], 30, 100)?.qtd).toBe(50);
  });

  it('saldo maior que a necessidade não vira compra negativa', () => {
    expect(quantidadePelaRede([{ unidades: 450, dias: 90 }], 30, 500)?.qtd).toBe(0);
  });

  it('saldo não lido cobre o período inteiro e não é tratado como zero', () => {
    const semSaldo = quantidadePelaRede([{ unidades: 450, dias: 90 }], 30, null);
    const saldoZero = quantidadePelaRede([{ unidades: 450, dias: 90 }], 30, 0);
    expect(semSaldo?.qtd).toBe(saldoZero?.qtd);
  });

  it('arredonda para cima: meia peça não se compra', () => {
    expect(quantidadePelaRede([{ unidades: 10, dias: 100 }], 45, 0)?.qtd).toBe(5);
  });

  it('soma as unidades das praças que entraram, para a tela mostrar', () => {
    expect(quantidadePelaRede([{ unidades: 100, dias: 50 }, { unidades: 20, dias: 50 }], 30, 0)?.unidades).toBe(120);
  });
});

describe('sem base não vira quantidade', () => {
  it('recusa lista vazia, período zero e unidades zero', () => {
    expect(quantidadePelaRede([], 45, 0)).toBeNull();
    expect(quantidadePelaRede(null, 45, 0)).toBeNull();
    expect(quantidadePelaRede([{ unidades: 100, dias: 0 }], 45, 0)).toBeNull();
    expect(quantidadePelaRede([{ unidades: 0, dias: 90 }], 45, 0)).toBeNull();
  });

  it('recusa cobertura inválida em vez de assumir uma', () => {
    expect(quantidadePelaRede([{ unidades: 100, dias: 90 }], 0, 0)).toBeNull();
    expect(quantidadePelaRede([{ unidades: 100, dias: 90 }], NaN, 0)).toBeNull();
  });

  it('a cobertura padrão é a mesma da lista de compra', () => {
    expect(DIAS_COBERTURA_PADRAO).toBe(45);
  });
});

describe('a ordem da lista', () => {
  it('quem mais gira na rede vem primeiro', () => {
    const lista = [
      { cod: 'a', venda: { unidades: 100, pracasComVenda: 1 } },
      { cod: 'b', venda: { unidades: 2430, pracasComVenda: 3 } },
    ].sort(ordenarPorGiro);
    expect(lista[0].cod).toBe('b');
  });

  it('empate no volume vai para quem gira em mais praças', () => {
    /* Venda espalhada é demanda de mercado; concentrada pode ser um cliente
       só, que pode ter ido embora. */
    const lista = [
      { cod: 'concentrada', venda: { unidades: 500, pracasComVenda: 1 } },
      { cod: 'espalhada', venda: { unidades: 500, pracasComVenda: 4 } },
    ].sort(ordenarPorGiro);
    expect(lista[0].cod).toBe('espalhada');
  });
});
