/**
 * Testes de regressão da identidade da peça.
 *
 * Cada teste descreve a REGRA DE NEGÓCIO, não a implementação — se um dia o
 * agrupamento mudar de algoritmo, estes testes continuam valendo.
 *
 * Os nove primeiros são os casos que o Rodrigo especificou depois de achar,
 * um a um, os erros da versão anterior. Eles existem para que esses erros
 * não voltem.
 */

import { describe, expect, it } from 'vitest';
import {
  agruparCadastros,
  montarChaveDuplicidade,
  normalizarCodigoFabrica,
  normalizarGrupoProduto,
  paraNumeroBr,
  qualidadeDaImportacao,
  registroCanonico,
  resumirEstoque,
} from './identidade.js';

/** Atalho: monta um registro canônico a partir do essencial. */
const reg = (interno: string, produto: string, grupo: string, saldo: unknown, descricao = 'Peça') =>
  registroCanonico({ interno, produto, grupo, saldo, descricao, original: '', curva: 'A', localizacao: '1 01 001' });

/** O mesmo, com marca — que só existe quando um catálogo externo foi importado. */
const regM = (interno: string, produto: string, grupo: string, saldo: unknown, descricao: string, marca: string) =>
  registroCanonico({ interno, produto, grupo, saldo, descricao, marca, original: '', curva: 'A', localizacao: '1 01 001' });

describe('o sufixo entre colchetes é a única coisa que o código perde', () => {
  it('tira o [n] do fim e devolve o código base', () => {
    expect(normalizarCodigoFabrica('8PK1420[5]')).toBe('8PK1420');
    expect(normalizarCodigoFabrica('ABC123[2]')).toBe('ABC123');
    expect(normalizarCodigoFabrica('ABC123[20]')).toBe('ABC123');
  });

  it('deixa intacto o código que não tem sufixo', () => {
    expect(normalizarCodigoFabrica('8PK1420')).toBe('8PK1420');
    expect(normalizarCodigoFabrica('ABC123')).toBe('ABC123');
    expect(normalizarCodigoFabrica('12345A')).toBe('12345A');
  });

  it('NÃO corta HD — 8PK1420 e 8PK1420HD são peças diferentes', () => {
    expect(normalizarCodigoFabrica('8PK1420HD')).toBe('8PK1420HD');
    expect(normalizarCodigoFabrica('8PK1420HD[8]')).toBe('8PK1420HD');
    expect(normalizarCodigoFabrica('8PK1420HD[3]')).toBe('8PK1420HD');
    expect(normalizarCodigoFabrica('8PK1420HD[2]')).toBe('8PK1420HD');
    expect(normalizarCodigoFabrica('8PK1420HD')).not.toBe(normalizarCodigoFabrica('8PK1420'));
  });

  it('só mexe em colchetes no FIM — no meio o código fica como está', () => {
    expect(normalizarCodigoFabrica('ABC[3]XYZ')).toBe('ABC[3]XYZ');
    expect(normalizarCodigoFabrica('A[1]B')).toBe('A[1]B');
  });

  it('preserva zeros à esquerda, porque código de produto é texto', () => {
    expect(normalizarCodigoFabrica('000123[2]')).toBe('000123');
    expect(normalizarCodigoFabrica('000123')).toBe('000123');
  });

  it('não confunde hífen e barra com sufixo', () => {
    expect(normalizarCodigoFabrica('ABCD-10')).toBe('ABCD-10');
    expect(normalizarCodigoFabrica('ABCD/10')).toBe('ABCD/10');
  });

  it('remove um sufixo só, nunca dois', () => {
    expect(normalizarCodigoFabrica('ABC[1][2]')).toBe('ABC[1]');
  });
});

describe('a chave de duplicidade separa grupos de produto', () => {
  it('junta o mesmo código base do mesmo grupo de produto', () => {
    expect(montarChaveDuplicidade({ grupoProduto: '000084', codigoFabrica: '8PK1420' }))
      .toBe(montarChaveDuplicidade({ grupoProduto: '000084', codigoFabrica: '8PK1420[5]' }));
  });

  it('NÃO junta o mesmo código base de grupos de produto diferentes', () => {
    expect(montarChaveDuplicidade({ grupoProduto: '000084', codigoFabrica: '8PK1420' }))
      .not.toBe(montarChaveDuplicidade({ grupoProduto: '000271', codigoFabrica: '8PK1420' }));
  });

  it('recusa a chave quando falta identidade, em vez de juntar os incompletos', () => {
    expect(montarChaveDuplicidade({ grupoProduto: '', codigoFabrica: '8PK1420' })).toBeNull();
    expect(montarChaveDuplicidade({ grupoProduto: '000084', codigoFabrica: '' })).toBeNull();
  });

  it('trata 84 e 000084 como o mesmo grupo de produto', () => {
    expect(normalizarGrupoProduto('84')).toBe(normalizarGrupoProduto('000084'));
  });
});

describe('número brasileiro: o ponto é milhar', () => {
  it('lê 1.718 como mil setecentos e dezoito', () => {
    expect(paraNumeroBr('1.718')).toBe(1718);
    expect(paraNumeroBr('10.000')).toBe(10000);
  });

  it('lê inteiros simples', () => {
    expect(paraNumeroBr('0')).toBe(0);
    expect(paraNumeroBr('27')).toBe(27);
    expect(paraNumeroBr(' 27 ')).toBe(27);
  });

  it('lê decimal com vírgula', () => {
    expect(paraNumeroBr('1.234,56')).toBeCloseTo(1234.56, 2);
    expect(paraNumeroBr('0,5')).toBeCloseTo(0.5, 3);
  });

  it('lê saldo negativo', () => {
    expect(paraNumeroBr('-4')).toBe(-4);
  });

  it('devolve null para ausente ou ilegível — nunca zero', () => {
    expect(paraNumeroBr('')).toBeNull();
    expect(paraNumeroBr(null)).toBeNull();
    expect(paraNumeroBr(undefined)).toBeNull();
    expect(paraNumeroBr('____')).toBeNull();
    expect(paraNumeroBr('abc')).toBeNull();
    expect(paraNumeroBr(NaN)).toBeNull();
  });
});

describe('CASO 1 — cadastro zerado ao lado de cadastro com saldo não é ruptura', () => {
  const grupos = agruparCadastros([
    reg('0840201180', '8PK1420', '000084', '0'),
    reg('0849972248', '8PK1420[5]', '000084', '27'),
  ]);

  it('forma um grupo só, com dois cadastros', () => {
    expect(grupos).toHaveLength(1);
    expect(grupos[0].quantidadeCadastros).toBe(2);
  });

  it('soma o estoque dos dois cadastros', () => {
    expect(grupos[0].estoqueGrupo).toBe(27);
  });

  it('NÃO declara ruptura', () => {
    expect(grupos[0].rupturaReal).toBe(false);
  });

  it('marca que existe cadastro zerado coberto por outro do mesmo grupo', () => {
    expect(grupos[0].zeradoCobertoPorOutroCadastro).toBe(true);
    expect(grupos[0].cadastrosZerados).toBe(1);
  });
});

describe('CASO 2 — grupo inteiro zerado é ruptura de verdade', () => {
  const grupos = agruparCadastros([
    reg('1', '8PK1420HD', '000271', '0'),
    reg('2', '8PK1420HD[2]', '000271', '0'),
    reg('3', '8PK1420HD[3]', '000271', '0'),
    reg('4', '8PK1420HD[8]', '000271', '0'),
  ]);

  it('forma um grupo com quatro cadastros e estoque zero', () => {
    expect(grupos).toHaveLength(1);
    expect(grupos[0].quantidadeCadastros).toBe(4);
    expect(grupos[0].estoqueGrupo).toBe(0);
  });

  it('declara ruptura real', () => {
    expect(grupos[0].rupturaReal).toBe(true);
  });
});

describe('CASO 3 — grupos de produto diferentes não se misturam', () => {
  const grupos = agruparCadastros([
    reg('1', '79111', '000212', '0', 'Bolsa pneumatica su'),
    reg('2', '79111[3]', '004785', '10', 'Junta radiador oleo'),
  ]);

  it('mantém dois grupos separados', () => {
    expect(grupos).toHaveLength(2);
  });

  it('o grupo zerado continua em ruptura, sem herdar o saldo do outro', () => {
    const zerado = grupos.find((g) => g.duplicateKey.startsWith('000212'));
    expect(zerado?.estoqueGrupo).toBe(0);
    expect(zerado?.rupturaReal).toBe(true);
  });

  it('não considera coberta uma peça cujo irmão tem outra descrição', () => {
    const zerado = grupos.find((g) => g.duplicateKey.startsWith('000212'));
    expect(zerado?.cobertoPorGrupoIrmao).toBe(false);
    expect(zerado?.estoqueEmGrupoIrmao).toBeNull();
  });
});

describe('CASO 4 — HD é parte do código, não sufixo', () => {
  const grupos = agruparCadastros([
    reg('1', '8PK1420', '000084', '0'),
    reg('2', '8PK1420HD', '000084', '20'),
  ]);

  it('mantém dois grupos, mesmo dentro do mesmo grupo de produto', () => {
    expect(grupos).toHaveLength(2);
  });

  it('o 8PK1420 zerado continua em ruptura', () => {
    const g = grupos.find((x) => x.codigoFabricaBase === '8PK1420');
    expect(g?.rupturaReal).toBe(true);
  });
});

describe('CASO 8 — cinco cadastros, um com saldo', () => {
  const grupos = agruparCadastros([
    reg('1', 'A', '000001', '0'),
    reg('2', 'A[1]', '000001', '0'),
    reg('3', 'A[2]', '000001', '27'),
    reg('4', 'A[3]', '000001', '0'),
    reg('5', 'A[4]', '000001', '0'),
  ]);

  it('consolida em 27 unidades, com 4 cadastros sem saldo', () => {
    expect(grupos).toHaveLength(1);
    expect(grupos[0].quantidadeCadastros).toBe(5);
    expect(grupos[0].cadastrosZerados).toBe(4);
    expect(grupos[0].estoqueGrupo).toBe(27);
    expect(grupos[0].rupturaReal).toBe(false);
  });
});

describe('saldo ilegível é lacuna, não ruptura', () => {
  it('não declara ruptura quando nenhum saldo pôde ser lido', () => {
    const grupos = agruparCadastros([reg('1', 'ZK900', '000001', '____')]);
    expect(grupos[0].estoqueGrupo).toBeNull();
    expect(grupos[0].rupturaReal).toBeNull();
  });

  it('soma só o que foi lido quando parte do grupo está ilegível', () => {
    const grupos = agruparCadastros([
      reg('1', 'ZK900', '000001', '____'),
      reg('2', 'ZK900[2]', '000001', '5'),
    ]);
    expect(grupos[0].estoqueGrupo).toBe(5);
    expect(grupos[0].rupturaReal).toBe(false);
  });
});

describe('linha não é peça — as grandezas ficam separadas', () => {
  const registros = [
    reg('1', 'A', '000001', '0'),
    reg('2', 'A[2]', '000001', '10'),
    reg('3', 'B', '000001', '0'),
    reg('4', 'C', '000002', '5'),
  ];
  const grupos = agruparCadastros(registros);
  const resumo = resumirEstoque(registros, grupos);

  it('conta 4 linhas cadastrais e 3 peças consolidadas', () => {
    expect(resumo.linhasCadastrais).toBe(4);
    expect(resumo.gruposConsolidados).toBe(3);
    expect(resumo.cadastrosDuplicados).toBe(1);
  });

  it('conta 2 linhas com saldo zero mas só 1 grupo em ruptura', () => {
    expect(resumo.linhasComSaldoZero).toBe(2);
    expect(resumo.gruposEmRupturaReal).toBe(1);
  });

  it('diz quantas linhas zeradas estão cobertas por outro cadastro do grupo', () => {
    expect(resumo.linhasZeradasCobertasPorOutroCadastro).toBe(1);
  });
});

describe('a mesma peça cadastrada em dois grupos de produto', () => {
  /* Caso medido no arquivo real: o filtro P777639 existe nos grupos 004808
     (5 unidades) e 004594 (zerado). Antes, o segundo entrava na lista de
     compra — mandava comprar filtro que estava na prateleira. */
  const grupos = agruparCadastros([
    reg('4504000070', 'P777639', '004808', '5', 'Filtro ar secundari'),
    reg('4504000212', 'P777639', '004594', '0', 'Filtro ar secundari'),
  ]);
  const zerado = grupos.find((g) => g.duplicateKey.startsWith('004594'));

  it('continua sendo duas peças — o motor não junta famílias por conta própria', () => {
    expect(grupos).toHaveLength(2);
  });

  it('mostra o grupo irmão em vez de esconder a ligação', () => {
    expect(zerado?.gruposIrmaos).toHaveLength(1);
    expect(zerado?.gruposIrmaos[0].duplicateKey).toBe('004808|P777639');
    expect(zerado?.gruposIrmaos[0].mesmaDenominacao).toBe(true);
    /* Sem marca, a comparação não é "diferente" — é "não sei". */
    expect(zerado?.gruposIrmaos[0].mesmaMarca).toBeNull();
    expect(zerado?.estoqueEmGrupoIrmao).toBeNull();
    expect(zerado?.estoqueEmGrupoIrmaoSemProva).toBe(5);
  });

  it('sem marca dos dois lados, NÃO conclui cobertura — manda conferir', () => {
    expect(zerado?.rupturaReal).toBe(true);
    expect(zerado?.cobertoPorGrupoIrmao).toBe(false);
    expect(zerado?.conferirGrupoIrmao).toBe(true);
    expect(zerado?.estoqueEmGrupoIrmaoSemProva).toBe(5);
  });

  it('com a mesma marca comprovada, aí sim tira da lista de compra', () => {
    const g = agruparCadastros([
      regM('4504000070', 'P777639', '004808', '5', 'Filtro ar secundari', 'DONALDSON'),
      regM('4504000212', 'P777639', '004594', '0', 'Filtro ar secundari', 'DONALDSON'),
    ]);
    const z = g.find((x) => x.duplicateKey.startsWith('004594'));
    expect(z?.cobertoPorGrupoIrmao).toBe(true);
    expect(z?.estoqueEmGrupoIrmao).toBe(5);
    expect(z?.conferirGrupoIrmao).toBe(false);
  });

  it('não marca cobertura quando o irmão também está zerado', () => {
    const ambos = agruparCadastros([
      reg('1', 'P777639', '004808', '0', 'Filtro ar secundari'),
      reg('2', 'P777639', '004594', '0', 'Filtro ar secundari'),
    ]);
    expect(ambos.every((g) => g.cobertoPorGrupoIrmao === false)).toBe(true);
  });

  it('conta as peças cobertas por grupo irmão no resumo', () => {
    const registros = [
      regM('4504000070', 'P777639', '004808', '5', 'Filtro ar secundari', 'DONALDSON'),
      regM('4504000212', 'P777639', '004594', '0', 'Filtro ar secundari', 'DONALDSON'),
    ];
    const resumo = resumirEstoque(registros, agruparCadastros(registros));
    expect(resumo.gruposEmRupturaReal).toBe(1);
    expect(resumo.gruposCobertosPorGrupoIrmao).toBe(1);
    expect(resumo.gruposAConferirComGrupoIrmao).toBe(0);
  });

  /* O caso que o catálogo da loja desmentiu, virado teste: mesma descrição,
     mesmo código base, MARCAS DIFERENTES. Suprimir a compra aqui deixa quem
     pede Dayco sem atendimento. */
  it('marcas diferentes NUNCA cobrem uma à outra, mesmo com descrição igual', () => {
    const grupos = agruparCadastros([
      regM('2710000086', '8PK1700[8]', '004831', '6', 'Correia micro V BA/', 'AGRO-GATES'),
      regM('2710000127', '8PK1700', '004874', '0', 'Correia micro V BA/', 'AGRO-DAYCO'),
    ]);
    const dayco = grupos.find((g) => g.duplicateKey.startsWith('004874'));
    expect(dayco?.rupturaReal).toBe(true);
    expect(dayco?.cobertoPorGrupoIrmao).toBe(false);
    expect(dayco?.conferirGrupoIrmao).toBe(false);
    expect(dayco?.gruposIrmaos[0].mesmaMarca).toBe(false);
    expect(dayco?.estoqueEmGrupoIrmao).toBeNull();
  });

  it('não inventa irmão para quem tem código base único', () => {
    const g = agruparCadastros([reg('1', 'ZK900', '000001', '0')]);
    expect(g[0].gruposIrmaos).toHaveLength(0);
    expect(g[0].cobertoPorGrupoIrmao).toBe(false);
  });
});

describe('qualidade da importação não esconde nada', () => {
  it('registra colisão do mesmo código base entre grupos de produto diferentes', () => {
    const registros = [
      reg('1', '79111', '000212', '6', 'Bolsa pneumatica'),
      reg('2', '79111[3]', '004785', '5', 'Junta radiador oleo'),
    ];
    const q = qualidadeDaImportacao(registros, agruparCadastros(registros));
    expect(q.colisoesDeCodigoBase).toHaveLength(1);
    expect(q.colisoesDeCodigoBase[0].codigoFabricaBase).toBe('79111');
    expect(q.colisoesDeCodigoBase[0].grupos).toHaveLength(2);
    expect(q.colisoesDeCodigoBase[0].mesmaDenominacao).toBe(false);
    expect(q.colisoesEntreProdutosDiferentes).toBe(1);
    expect(q.provavelMesmoProdutoEmDoisGrupos).toBe(0);
  });

  it('separa colisão de verdade de peça cadastrada em dois grupos', () => {
    const registros = [
      reg('4504000070', 'P777639', '004808', '5', 'Filtro ar secundari'),
      reg('4504000212', 'P777639', '004594', '0', 'Filtro ar secundari'),
    ];
    const q = qualidadeDaImportacao(registros, agruparCadastros(registros));
    expect(q.provavelMesmoProdutoEmDoisGrupos).toBe(1);
    expect(q.colisoesEntreProdutosDiferentes).toBe(0);
  });

  it('conta quantos códigos a normalização alterou e quantos ficaram iguais', () => {
    const registros = [
      reg('1', 'A', '000001', '1'),
      reg('2', 'A[2]', '000001', '1'),
      reg('3', 'B', '000001', '1'),
    ];
    const q = qualidadeDaImportacao(registros, agruparCadastros(registros));
    expect(q.codigosAlteradosPelaNormalizacao).toBe(1);
    expect(q.codigosSemAlteracao).toBe(2);
  });

  it('não descarta linha sem identidade — ela vira grupo de um, marcado', () => {
    const registros = [reg('1', '', '000001', '3')];
    const grupos = agruparCadastros(registros);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].semIdentidade).toBe(true);
    expect(grupos[0].estoqueGrupo).toBe(3);
  });
});

describe('o registro canônico preserva o original ao lado do normalizado', () => {
  it('guarda o código de fábrica como veio e como ficou', () => {
    const r = reg('0849972248', '8PK1420[5]', '000084', '27');
    expect(r.codigoFabricaOriginal).toBe('8PK1420[5]');
    expect(r.codigoFabricaBase).toBe('8PK1420');
    expect(r.registroOriginal).toBeDefined();
  });
});

describe('desempenho: agrupar é O(n), não O(n²)', () => {
  it('agrupa 100.000 linhas em menos de um segundo', () => {
    const registros = [];
    for (let i = 0; i < 100000; i++) {
      const peca = i % 25000;
      /* O grupo de produto acompanha a peça, como no arquivo real: o mesmo
         código de fábrica não fica espalhado por nove famílias. */
      registros.push(reg(String(i), 'COD' + peca + (i % 4 ? '[' + (i % 4) + ']' : ''), '00000' + (peca % 9), '1'));
    }
    const t0 = Date.now();
    const grupos = agruparCadastros(registros);
    const ms = Date.now() - t0;
    expect(grupos.length).toBeGreaterThan(20000);
    expect(ms).toBeLessThan(1000);
  });
});

describe('placeholder não é identidade', () => {
  it('não junta cadastros cujo código é N/E, ponto ou traço', () => {
    const registros = [
      reg('1', 'N/E', '000992', '5', 'Bucha coluna direcao'),
      reg('2', 'N/E', '000992', '3', 'Bomba agua kombi'),
      reg('3', '.', '000992', '2', 'Parafuso'),
    ];
    const grupos = agruparCadastros(registros);
    expect(grupos).toHaveLength(3);
    expect(grupos.every((g) => g.semIdentidade)).toBe(true);
  });

  it('continua juntando código legítimo do mesmo grupo de produto', () => {
    const grupos = agruparCadastros([
      reg('1', '8PK1420', '000084', '0'),
      reg('2', '8PK1420[5]', '000084', '27'),
    ]);
    expect(grupos).toHaveLength(1);
  });
});
