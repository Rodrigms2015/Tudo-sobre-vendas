/**
 * Caracterização da leitura de arquivo.
 *
 * Primeiro degrau de tudo: se a leitura erra, nenhuma regra adiante conserta.
 */

import { describe, expect, it } from 'vitest';
import { chave, dataBrParaIso, lerCsv, paraInteiro, semAcento } from './leitura.js';

describe('CSV do Excel brasileiro', () => {
  it('escolhe ponto-e-vírgula quando a primeira linha tem mais deles', () => {
    expect(lerCsv('a;b;c\n1;2;3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('escolhe vírgula quando é ela que separa', () => {
    expect(lerCsv('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('mantém inteiro o campo entre aspas que contém o separador', () => {
    expect(lerCsv('desc;saldo\n"Junta 7; sem furo";4'))
      .toEqual([['desc', 'saldo'], ['Junta 7; sem furo', '4']]);
  });

  it('lê aspas duplicadas — é assim que 7" chega até aqui', () => {
    expect(lerCsv('desc\n"Diafragma 7"" tipo"')).toEqual([['desc'], ['Diafragma 7" tipo']]);
  });

  it('não perde a última linha quando o arquivo não termina em quebra', () => {
    expect(lerCsv('a;b\n1;2')).toHaveLength(2);
  });

  it('ignora o retorno de carro do Windows', () => {
    expect(lerCsv('a;b\r\n1;2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('inteiro brasileiro: ponto é milhar', () => {
  it('lê 1.718 como mil setecentos e dezoito', () => {
    expect(paraInteiro('1.718')).toBe(1718);
  });

  it('lê decimal com vírgula, arredondando', () => {
    expect(paraInteiro('4,6')).toBe(5);
    expect(paraInteiro('4,4')).toBe(4);
  });

  it('devolve null para vazio e ilegível — nunca zero', () => {
    expect(paraInteiro('')).toBeNull();
    expect(paraInteiro('-')).toBeNull();
    expect(paraInteiro(null)).toBeNull();
    expect(paraInteiro('abc')).toBeNull();
  });

  it('mantém o zero que é saldo de verdade', () => {
    expect(paraInteiro('0')).toBe(0);
  });

  it('lê negativo, que é devolução', () => {
    expect(paraInteiro('-4')).toBe(-4);
  });
});

describe('comparação de texto ignora acento e pontuação', () => {
  it('tira acento sem mudar a letra', () => {
    expect(semAcento('Ribeirão Preto')).toBe('Ribeirao Preto');
  });

  it('monta a chave só com letras e números', () => {
    expect(chave('Cód. Interno')).toBe('codinterno');
    expect(chave('Saldo --')).toBe('saldo');
  });
});

describe('data brasileira', () => {
  it('lê dd/mm/aaaa', () => {
    expect(dataBrParaIso('07/08/2026')).toBe('2026-08-07');
  });

  it('lê dd-mm-aa como 20xx', () => {
    expect(dataBrParaIso('07-08-26')).toBe('2026-08-07');
  });

  it('recusa data que não existe, mesmo com o formato certo', () => {
    /* 31/02 o Date "conserta" para 03/03 se ninguém conferir. */
    expect(dataBrParaIso('31/02/2026')).toBeNull();
    expect(dataBrParaIso('00/08/2026')).toBeNull();
    expect(dataBrParaIso('07/13/2026')).toBeNull();
  });

  it('recusa o que não é data', () => {
    expect(dataBrParaIso('')).toBeNull();
    expect(dataBrParaIso('8PK1420')).toBeNull();
    expect(dataBrParaIso(null)).toBeNull();
  });
});
