/**
 * Classificação dos códigos de movimento (TR).
 *
 * Os volumes destes testes são os dos quatro relatórios reais de 24/08:
 * 81.427 linhas, das quais 53.477 são TR 50.
 */

import { describe, expect, it } from 'vitest';
import {
  CLASSES_TR, chaveTr, classeDe, coberturaDeVenda, ehVenda,
  resumirTrs, saidasNaoClassificadas,
} from './tr.js';

const mov = (tp: string, tr: string, qtd = 1, extra: Record<string, unknown> = {}) =>
  ({ tp, tr, qtd, documento: 'NF00000001', filial: '37', data: '2026-03-10', ...extra });

describe('saída não classificada não é venda', () => {
  it('a ausência de classificação nunca vira venda', () => {
    /* Era o defeito: toda saída contava como demanda, e transferência entre
       filiais mandava comprar de novo o que só mudou de prateleira. */
    expect(ehVenda(mov('S', '50'), {})).toBe(false);
    expect(classeDe(mov('S', '50'), {})).toBe('desconhecido');
  });

  it('classificado como venda conta; como transferência, não', () => {
    expect(ehVenda(mov('S', '50'), { 'S·50': 'venda' })).toBe(true);
    expect(ehVenda(mov('S', '54'), { 'S·54': 'transferencia' })).toBe(false);
  });

  it('classe inventada é tratada como não classificada', () => {
    expect(classeDe(mov('S', '50'), { 'S·50': 'chute' })).toBe('desconhecido');
  });

  it('entrada e saída com o mesmo número são códigos diferentes', () => {
    /* No arquivo real existem E·10 e S·50, e também E·48. Misturar os dois
       lados faria uma entrada classificada valer por uma saída. */
    expect(chaveTr('S', '50')).toBe('S·50');
    expect(chaveTr('E', '50')).not.toBe(chaveTr('S', '50'));
    expect(ehVenda(mov('E', '10'), { 'S·10': 'venda' })).toBe(false);
  });

  it('lançamento sem TR não vira classe nenhuma', () => {
    expect(chaveTr('S', '')).toBe('');
    expect(classeDe({ tp: 'S' }, { 'S·50': 'venda' })).toBe('desconhecido');
  });
});

describe('o resumo mostra as evidências de quem é quem', () => {
  const movimentos = [
    ...Array.from({ length: 5 }, () => mov('S', '50', 2, { documento: 'NF00170803' })),
    ...Array.from({ length: 2 }, () => mov('S', 'RS', 1, { documento: 'RI00004401', filial: '13' })),
    mov('E', '10', 7, { documento: 'NF08834401' }),
  ];

  it('ordena do maior volume de linhas para o menor', () => {
    /* Três códigos cobrem 99,6% das saídas reais. Ordenar por volume é o que
       faz classificar três resolver quase tudo. */
    expect(resumirTrs(movimentos).map((r) => r.chave)).toEqual(['S·50', 'S·RS', 'E·10']);
  });

  it('conta linhas, unidades e documentos distintos', () => {
    const [r] = resumirTrs(movimentos);
    expect(r).toMatchObject({ chave: 'S·50', linhas: 5, unidades: 10, documentos: 1 });
  });

  it('mostra o prefixo do documento, que é a evidência mais forte na prática', () => {
    /* NF é nota fiscal, RI é requisição interna. É evidência para quem lê,
       nunca regra automática — a página não classifica sozinha. */
    const porChave = Object.fromEntries(resumirTrs(movimentos).map((r) => [r.chave, r]));
    expect(porChave['S·50'].prefixoMaisComum).toBe('NF');
    expect(porChave['S·RS'].prefixoMaisComum).toBe('RI');
  });

  it('registra em quais filiais o código aparece e o período', () => {
    const porChave = Object.fromEntries(resumirTrs(movimentos).map((r) => [r.chave, r]));
    expect(porChave['S·RS'].filiais).toEqual(['13']);
    expect(porChave['S·50'].primeira).toBe('2026-03-10');
  });

  it('lista vazia não inventa código', () => {
    expect(resumirTrs([])).toEqual([]);
    expect(resumirTrs(null)).toEqual([]);
  });
});

describe('a cobertura que toda tela de venda medida precisa mostrar', () => {
  const movimentos = [
    mov('S', '50', 100), mov('S', '50', 100),
    mov('S', '54', 50),
    mov('S', '70', 10),
    mov('E', '10', 999),
  ];

  it('mede só as saídas — entrada não entra na conta', () => {
    const c = coberturaDeVenda(movimentos, { 'S·50': 'venda' });
    expect(c.saidas).toEqual({ linhas: 4, unidades: 260 });
    expect(c.venda).toEqual({ linhas: 2, unidades: 200 });
  });

  it('dá a cobertura em linhas e em unidades, que não são a mesma coisa', () => {
    /* No arquivo real TR 54 é 1% das linhas e 4,8% das unidades: uma tem
       poucos lançamentos, cada um grande. */
    const c = coberturaDeVenda(movimentos, { 'S·50': 'venda' });
    expect(c.pctLinhas).toBeCloseTo(0.5, 3);
    expect(c.pctUnidades).toBeCloseTo(200 / 260, 3);
  });

  it('separa o que foi classificado como cada coisa', () => {
    const c = coberturaDeVenda(movimentos, { 'S·50': 'venda', 'S·54': 'transferencia' });
    expect(c.porClasse.transferencia).toEqual({ linhas: 1, unidades: 50 });
    expect(c.porClasse.desconhecido).toEqual({ linhas: 1, unidades: 10 });
  });

  it('avisa quando NADA foi classificado, em vez de mostrar venda zero', () => {
    /* Venda zero e venda não classificada levam a decisões opostas. */
    const c = coberturaDeVenda(movimentos, {});
    expect(c.semClassificacao).toBe(true);
    expect(c.venda.unidades).toBe(0);
  });

  it('sem saída nenhuma a cobertura é nula, não zero por cento', () => {
    const c = coberturaDeVenda([mov('E', '10')], {});
    expect(c.pctLinhas).toBeNull();
    expect(c.semClassificacao).toBe(false);
  });
});

describe('o que ainda falta classificar', () => {
  it('lista só as saídas pendentes, das maiores para as menores', () => {
    const movimentos = [
      ...Array.from({ length: 3 }, () => mov('S', '98')),
      mov('S', '70'),
      mov('S', '50'),
      mov('E', '10'),
    ];
    const faltam = saidasNaoClassificadas(movimentos, { 'S·50': 'venda' });
    expect(faltam.map((r) => r.chave)).toEqual(['S·98', 'S·70']);
  });

  it('todas classificadas não deixa pendência', () => {
    const mapa = Object.fromEntries(CLASSES_TR.map((c, i) => [`S·${i}`, c]));
    const movimentos = CLASSES_TR.map((_, i) => mov('S', String(i)));
    expect(saidasNaoClassificadas(movimentos, mapa)).toEqual([]);
  });
});
