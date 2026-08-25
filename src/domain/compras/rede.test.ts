/**
 * Compra a partir da venda das outras praças.
 *
 * Os números vêm do cruzamento real de 24/08: Cascavel, Caxias do Sul, Porto
 * Alegre e Londrina contra o estoque de Passo Fundo.
 */

import { describe, expect, it } from 'vitest';
import { DIAS_COBERTURA_PADRAO, ordenarPorGiro, quantidadePelaRede } from './rede.js';

describe('quanto comprar vendendo como a média das praças', () => {
  it('divide pelas praças que vendem, não soma a rede inteira', () => {
    /* 2.430 unidades do disco de tacógrafo em 3 praças, em 232 dias:
       2430/232/3 = 3,49 por dia por praça. Em 45 dias, 158 peças.
       Somar as três praças responderia "quanto a rede vende", que não é o
       que se compra para uma filial. */
    const r = quantidadePelaRede({ unidades: 2430, dias: 232, pracasComVenda: 3 }, 45, 0);
    expect(r?.porDiaPorPraca).toBeCloseTo(3.491, 3);
    expect(r?.qtd).toBe(158);
    expect(r?.base).toBe('média de 3 praças que vendem, em 232 dias');
  });

  it('desconta o que já tem aqui', () => {
    const r = quantidadePelaRede({ unidades: 900, dias: 90, pracasComVenda: 2 }, 30, 100);
    /* 900/90/2 = 5 por dia · 30 dias = 150 · menos 100 de saldo = 50. */
    expect(r?.qtd).toBe(50);
  });

  it('saldo maior que a necessidade não vira compra negativa', () => {
    expect(quantidadePelaRede({ unidades: 900, dias: 90, pracasComVenda: 2 }, 30, 500)?.qtd).toBe(0);
  });

  it('saldo não lido cobre o período inteiro e não é tratado como zero', () => {
    /* `null` é "não sei", e não sei não desconta nada — mas também não
       impede a sugestão. Quem lê vê a lacuna do lado. */
    const semSaldo = quantidadePelaRede({ unidades: 900, dias: 90, pracasComVenda: 2 }, 30, null);
    const saldoZero = quantidadePelaRede({ unidades: 900, dias: 90, pracasComVenda: 2 }, 30, 0);
    expect(semSaldo?.qtd).toBe(saldoZero?.qtd);
  });

  it('arredonda para cima: meia peça não se compra', () => {
    expect(quantidadePelaRede({ unidades: 10, dias: 100, pracasComVenda: 1 }, 45, 0)?.qtd).toBe(5);
  });
});

describe('sem base não vira quantidade', () => {
  it('recusa período, praças ou unidades que não existem', () => {
    expect(quantidadePelaRede({ unidades: 100, dias: 0, pracasComVenda: 2 }, 45, 0)).toBeNull();
    expect(quantidadePelaRede({ unidades: 100, dias: 90, pracasComVenda: 0 }, 45, 0)).toBeNull();
    expect(quantidadePelaRede({ unidades: 0, dias: 90, pracasComVenda: 2 }, 45, 0)).toBeNull();
    expect(quantidadePelaRede(null, 45, 0)).toBeNull();
  });

  it('recusa cobertura inválida em vez de assumir uma', () => {
    expect(quantidadePelaRede({ unidades: 100, dias: 90, pracasComVenda: 2 }, 0, 0)).toBeNull();
    expect(quantidadePelaRede({ unidades: 100, dias: 90, pracasComVenda: 2 }, NaN, 0)).toBeNull();
  });

  it('a cobertura padrão é a mesma da lista de compra', () => {
    expect(DIAS_COBERTURA_PADRAO).toBe(45);
  });
});

describe('a ordem da lista', () => {
  it('quem mais gira na rede vem primeiro', () => {
    const lista = [
      { cod: 'a', venda: { unidades: 100, dias: 232, pracasComVenda: 1 } },
      { cod: 'b', venda: { unidades: 2430, dias: 232, pracasComVenda: 3 } },
    ].sort(ordenarPorGiro);
    expect(lista[0].cod).toBe('b');
  });

  it('empate no volume vai para quem gira em mais praças', () => {
    /* Venda espalhada é demanda de mercado; concentrada pode ser um cliente
       só, que pode ter ido embora. */
    const lista = [
      { cod: 'concentrada', venda: { unidades: 500, dias: 232, pracasComVenda: 1 } },
      { cod: 'espalhada', venda: { unidades: 500, dias: 232, pracasComVenda: 4 } },
    ].sort(ordenarPorGiro);
    expect(lista[0].cod).toBe('espalhada');
  });
});
