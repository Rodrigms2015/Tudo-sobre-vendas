/**
 * Caracterização do leitor de .xlsx.
 *
 * As linhas destes testes são as do relatório de movimentação de Passo Fundo,
 * medidas no arquivo de 21/08/2026. O que quebra em silêncio aqui é o
 * alinhamento: um campo no lugar do vizinho não dá erro, dá número errado.
 */

import { describe, expect, it } from 'vitest';
import {
  alinharNaGrade,
  alinharPorCabecalho,
  dataDoSerial,
  dataSerialBr,
  escolherCabecalho,
  formatoEhData,
  indiceDaColuna,
  montarGrade,
} from './xlsx.js';

const cel = (pares: Array<[number, string]>) => pares.map(([coluna, valor]) => ({ coluna, valor }));

/* Cabeçalho real: FI=1, Alm=4, Produto=7, Descricao=10, Data=34, Documento=37,
   TR=40, TP=43, Quantidade=46. */
const CABECALHO = cel([
  [1, 'FI'], [4, 'Alm'], [7, 'Produto'], [10, 'Descricao'], [34, 'Data'],
  [37, 'Documento'], [40, 'TR'], [43, 'TP'], [46, 'Quantidade'],
]);
const REFS = CABECALHO.map((c) => c.coluna);

describe('referência de célula vira índice de coluna', () => {
  it('lê uma letra', () => {
    expect(indiceDaColuna('A1')).toBe(0);
    expect(indiceDaColuna('B2')).toBe(1);
    expect(indiceDaColuna('Z9')).toBe(25);
  });

  it('lê duas letras — é onde este relatório mora', () => {
    expect(indiceDaColuna('AA1')).toBe(26);
    expect(indiceDaColuna('AI3')).toBe(34);
    expect(indiceDaColuna('BH7')).toBe(59);
  });

  it('devolve -1 para o que não é referência', () => {
    expect(indiceDaColuna('')).toBe(-1);
    expect(indiceDaColuna('123')).toBe(-1);
  });
});

describe('o deslize de coluna não pode embaralhar os campos', () => {
  it('lê a linha que começa na mesma coluna do cabeçalho', () => {
    const linha = cel([
      [1, '37'], [4, '01'], [7, '0090000133'], [10, 'Kit cubo roda tras'],
      [34, '26/01/2026'], [37, 'NF08834401'], [40, '10'], [43, 'E'], [46, '1.00'],
    ]);
    expect(alinharNaGrade(linha, REFS)).toEqual([
      '37', '01', '0090000133', 'Kit cubo roda tras', '26/01/2026', 'NF08834401', '10', 'E', '1.00',
    ]);
  });

  it('lê a linha DESLOCADA uma coluna para a esquerda', () => {
    /* 7.714 das 7.832 linhas do arquivo vêm assim: o gerador omite a célula
       vazia da frente. Ler por letra fixa põe "NF00023202" no lugar do tipo. */
    const linha = cel([
      [0, '37'], [3, '01'], [6, '4120000030'], [9, 'Fita diagrama tacografo'],
      [33, '27/01/2026'], [36, 'NF00023202'], [39, '50'], [42, 'S'], [45, '30.00'],
    ]);
    expect(alinharNaGrade(linha, REFS)).toEqual([
      '37', '01', '4120000030', 'Fita diagrama tacografo', '27/01/2026', 'NF00023202', '50', 'S', '30.00',
    ]);
  });

  it('a descrição que caiu uma coluna antes continua sendo descrição', () => {
    /* Em 2.521 linhas a descrição está na coluna 8 e não na 9. A coluna 8 fica
       entre Produto (6) e Descrição (9): quem escolhe "a última que cabe"
       cola a descrição no código do produto. */
    const linha = cel([
      [0, '37'], [3, '01'], [6, '6160000282'], [8, 'Junta carter motor'],
      [33, '13/08/2026'], [36, 'NF00155502'], [39, '50'], [42, 'S'], [45, '1.00'],
    ]);
    const r = alinharNaGrade(linha, REFS);
    expect(r[2]).toBe('6160000282');
    expect(r[3]).toBe('Junta carter motor');
  });

  it('junta com espaço a descrição que veio partida em duas células', () => {
    const linha = cel([[0, '37'], [9, 'Elemento filtro'], [11, 'comb separador']]);
    expect(alinharNaGrade(linha, REFS)[3]).toBe('Elemento filtro comb separador');
  });

  it('campo ausente vira string vazia, não o valor do vizinho', () => {
    const r = alinharNaGrade(cel([[1, '37'], [4, '01'], [7, '0090000133']]), REFS);
    expect(r[7]).toBe('');
    expect(r[8]).toBe('');
  });

  it('linha vazia vira linha em branco, e não uma linha mais curta', () => {
    /* A grade tem de ser retangular: quem lê depois procura o campo pelo
       índice do cabeçalho. Uma linha curta desloca todos os campos dela. */
    expect(alinharNaGrade([], REFS)).toEqual(['', '', '', '', '', '', '', '', '']);
  });

  it('a versão por nome de campo segue a mesma regra', () => {
    const colunas = { fi: 1, produto: 7, tp: 43, qtd: 46 };
    expect(alinharPorCabecalho(cel([[0, '37'], [6, '1681411090'], [42, 'S'], [45, '4.00']]), colunas, 1))
      .toEqual({ fi: '37', produto: '1681411090', tp: 'S', qtd: '4.00' });
    expect(alinharPorCabecalho([], colunas, 1)).toEqual({});
  });
});

describe('achar o cabeçalho no meio da moldura do relatório', () => {
  it('pula a faixa de título e para na linha de rótulos', () => {
    const linhas = [
      cel([[0, '| IBMMHNA(AEA) - Movimentacao Atual de Produto']]),
      cel([[0, '+                    +']]),
      CABECALHO,
      cel([[0, '37'], [3, '01'], [6, '0090000133']]),
    ];
    expect(escolherCabecalho(linhas)).toBe(2);
  });

  it('não confunde linha de dados com cabeçalho', () => {
    /* A linha de dados tem texto na descrição, mas só um rótulo de verdade. */
    const linhas = [cel([[0, '37'], [3, '01'], [6, '0090000133'], [9, 'Kit cubo roda tras']])];
    expect(escolherCabecalho(linhas)).toBe(-1);
  });
});

describe('montar a grade que o resto da página lê', () => {
  const linhas = [
    cel([[0, '| IBMMHNA(AEA) - Movimentacao Atual de Produto']]),
    CABECALHO,
    cel([[0, '37'], [3, '01'], [6, '4120000030'], [8, 'Fita diagrama'],
      [33, '27/01/2026'], [36, 'NF00023202'], [39, '50'], [42, 'S'], [45, '30.00']]),
    cel([[0, '37 01  4656000394 Rolamento roda diant.int  04/08/26\n37 01  4755000021 Retentor cubo roda tras   06/08/26']]),
  ];

  it('devolve a linha de cabeçalho e as de dados com o mesmo número de colunas', () => {
    const { grade, cabecalho } = montarGrade(linhas);
    expect(cabecalho).toBe(1);
    expect(grade[cabecalho]).toEqual(['FI', 'Alm', 'Produto', 'Descricao', 'Data', 'Documento', 'TR', 'TP', 'Quantidade']);
    expect(grade[2][7]).toBe('S');
    expect(grade.every((l) => l.length === grade[cabecalho].length)).toBe(true);
  });

  it('separa o bloco de texto em vez de deixá-lo virar uma linha errada', () => {
    /* 8 movimentos do arquivo real vêm assim, dentro de uma célula só. Se
       ninguém os separar, somem — e sumir movimento é sumir venda medida. */
    const { grade, textoSolto } = montarGrade(linhas);
    expect(textoSolto).toHaveLength(2);
    expect(textoSolto[0]).toContain('4656000394');
    expect(grade.some((l) => l[0].includes('Rolamento'))).toBe(false);
  });
});

describe('data serial do Excel', () => {
  it('converte os seriais das pontas do arquivo real', () => {
    /* Medido no MOVIMENTA__O_PRODUTO_PASSO_FUNDO: o menor serial do arquivo é
       46027 (05/01/2026, primeiro dia útil do ano) e o maior é 46254
       (20/08/2026, dia em que o relatório foi tirado). */
    expect(dataDoSerial(46027)).toBe('2026-01-05');
    expect(dataDoSerial('46254')).toBe('2026-08-20');
  });

  it('devolve a data no formato que a pessoa vê no Excel', () => {
    expect(dataSerialBr(46027)).toBe('05/01/2026');
    expect(dataSerialBr('nao e data')).toBeNull();
  });

  it('respeita a origem 30/12/1899, que é o bug de 1900 preservado', () => {
    expect(dataDoSerial(1)).toBe('1899-12-31');
    expect(dataDoSerial(61)).toBe('1900-03-01');
  });

  it('recusa o que não é data em vez de devolver 1899', () => {
    expect(dataDoSerial(0)).toBeNull();
    expect(dataDoSerial(-5)).toBeNull();
    expect(dataDoSerial('NF08834401')).toBeNull();
    expect(dataDoSerial('')).toBeNull();
  });
});

describe('quem decide que a célula é data é o formato, não o valor', () => {
  it('reconhece o formato deste relatório', () => {
    /* `dd/mm/yy;@` é o formato 167 do arquivo de Passo Fundo. */
    expect(formatoEhData('dd/mm/yy;@', 167)).toBe(true);
  });

  it('reconhece os formatos de data embutidos, que não vêm declarados', () => {
    expect(formatoEhData(null, 14)).toBe(true);
    expect(formatoEhData(null, 47)).toBe(true);
    expect(formatoEhData(null, 0)).toBe(false);
  });

  it('não chama de data o formato de número', () => {
    /* 166 é `0000000000`, o código do produto: dez dígitos, não uma data. */
    expect(formatoEhData('0000000000', 166)).toBe(false);
    expect(formatoEhData('0.00', 168)).toBe(false);
    expect(formatoEhData('0_);(0)', 170)).toBe(false);
  });

  it('não se deixa enganar por letra dentro de literal', () => {
    expect(formatoEhData('"Dia"0', 200)).toBe(false);
    expect(formatoEhData('[Red]0.00', 201)).toBe(false);
  });
});
