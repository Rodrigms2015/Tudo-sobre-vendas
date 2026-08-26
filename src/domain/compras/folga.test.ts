/**
 * Folga aparente de uma praça irmã.
 *
 * Cada teste descreve a REGRA DE NEGÓCIO: o que a tela pode e o que ela nunca
 * pode afirmar sobre a capacidade de outra filial ceder uma peça.
 */

import { describe, expect, it } from 'vitest';
import { RESERVA_MINIMA, dequemPedir, folgaAparente } from './folga.js';

describe('folga aparente', () => {
  it('desconta o que a praça consome na janela, no ritmo que ela mesma mediu', () => {
    /* 100 de saldo, 90 unidades em 90 dias = 1/dia. Para 45 dias ela precisa
       de 45. Sobram 80 (100 menos a reserva) menos 45 = 35. */
    const r = folgaAparente({ saldo: 100, unidades: 90, dias: 90 }, 45);
    expect(r.porDia).toBe(1);
    expect(r.precisa).toBe(45);
    expect(r.folga).toBe(35);
  });

  it('guarda uma reserva do saldo: a foto tem atraso e a praça tem compromissos que o arquivo não mostra', () => {
    const r = folgaAparente({ saldo: 100, unidades: 0, dias: 90 }, 45);
    expect(r.folga).toBe(100 * (1 - RESERVA_MINIMA));
  });

  it('quem gira mais do que tem não cede nada — folga zero, não negativa', () => {
    const r = folgaAparente({ saldo: 10, unidades: 900, dias: 90 }, 45);
    expect(r.folga).toBe(0);
  });

  it('sem a movimentação da praça a folga é DESCONHECIDA, nunca o saldo inteiro', () => {
    const r = folgaAparente({ saldo: 100, unidades: null, dias: null }, 45);
    expect(r.folga).toBeNull();
    expect(r.motivo).toContain('movimentação desta praça não foi carregada');
  });

  it('não confunde "não medi" com "não vende": as duas dariam respostas opostas', () => {
    const naoMedida = folgaAparente({ saldo: 100, unidades: null, dias: null }, 45);
    const mediuZero = folgaAparente({ saldo: 100, unidades: 0, dias: 90 }, 45);
    expect(naoMedida.folga).toBeNull();
    expect(mediuZero.folga).toBe(80);
  });

  it('sem saldo legível não há conta a fazer', () => {
    expect(folgaAparente({ saldo: null, unidades: 90, dias: 90 }, 45).folga).toBeNull();
  });

  it('a base explica a conta inteira, com os números que entraram nela', () => {
    const r = folgaAparente({ saldo: 100, unidades: 90, dias: 90 }, 45);
    expect(r.base).toContain('saldo 100');
    expect(r.base).toContain('45 dias');
    expect(r.base).toContain('1,00/dia');
    expect(r.base).toContain('20% de reserva');
  });
});

describe('de quem pedir', () => {
  it('ordena por folga, da maior para a menor', () => {
    const r = dequemPedir([
      { nome: 'A', saldo: 50, unidades: 0, dias: 90 },
      { nome: 'B', saldo: 200, unidades: 0, dias: 90 },
    ], 45);
    expect(r.podem.map((p) => p.nome)).toEqual(['B', 'A']);
  });

  it('quem não foi medido fica numa lista à parte, com o motivo — não some da tela', () => {
    const r = dequemPedir([
      { nome: 'A', saldo: 200, unidades: 0, dias: 90 },
      { nome: 'B', saldo: 500, unidades: null, dias: null },
    ], 45);
    expect(r.podem).toHaveLength(1);
    expect(r.semMedida.map((p) => p.nome)).toEqual(['B']);
  });

  it('quem tem folga zero medida não aparece: pedir dela machucaria a praça', () => {
    const r = dequemPedir([{ nome: 'A', saldo: 10, unidades: 900, dias: 90 }], 45);
    expect(r.podem).toHaveLength(0);
    expect(r.semMedida).toHaveLength(0);
    expect(r.folgaTotal).toBe(0);
  });

  it('com nenhuma praça medida o total é desconhecido, não zero', () => {
    const r = dequemPedir([{ nome: 'B', saldo: 500, unidades: null, dias: null }], 45);
    expect(r.folgaTotal).toBeNull();
  });
});
