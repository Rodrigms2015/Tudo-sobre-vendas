/**
 * Pacote Técnico do Opus (PCARP12).
 *
 * As linhas destes testes são copiadas do PC_TECNIC de 04/08/26, com a
 * largura preservada — é a largura que carrega o significado.
 */

import { describe, expect, it } from 'vitest';
import {
  cabecalhoDoRelatorio, ehPacoteTecnico, fichaPorCodigo, lerPacoteTecnico,
  precoDoRelatorio, reguaDeColunas, separarMarca,
} from './pacoteTecnico.js';

/* Réguas e linhas reais do relatório, nas colunas originais. */
const REGUA_PACOTE =
  ' ---------- ---------------------------------------- -------- -------- -------- -------- --------';
const CAB_PACOTE =
  ' 6AS1010BO  CAMBIO 6AS1010BO - EURORICAMBI           31/10/25 01/01/17 31/12/26 01/11/25 31/12/26';
const APLIC_PACOTE = ' VOLKS 15-230OT/17-230OD/17-280OT/18-280OT/CONSTELLATION 17-280/24-280';
const REGUA_ITEM =
  ' ---------------- ---------------- ------------- -------------------------------------------- ------------------------ --------- -- -- ---------------------------------------------------------------------- --------------';
const ITEM_1 =
  ' REX12330098      2ZO300042G       0400000376    Eixo primairo (piloto)                       040   Cinpal                    1  PC S  MAN 6AS-1000TO/6AS1010BO/6S-1010BO                                           1.822,34';
/* Sem a coluna AS preenchida — metade das linhas do arquivo vem assim. */
const ITEM_2 =
  ' 3248T            1392708          0090015402    Retentor diant virabrequim Teflon            H55   CORTECO                   1  PC    Scania S4                                                                      182,74';
const ARQUIVO = [
  '+ 01 - PACAEMBU AUTOPECAS LTDA ------------------------------------- OPUSCase   Pag: 0001 +',
  '| 03 - RIBEIRAO PRETO                      01 - REVENDA                                    |',
  '| PCARP12(ARQ) - Consulta Pacote Tecnico                                  04/08/26 16:10 |',
  ' Pac.Tecnic Descricao                                Cadastro Ciclo De      Ate Compr De      Ate',
  REGUA_PACOTE, CAB_PACOTE, APLIC_PACOTE,
  ' --------------------------------------- COMPONENTES ---------------------------------------',
  ' Cod fabricante   Cod Original     Cod Interno   Descricao                                    Marca                    Qtde Min. UN AS Aplicacao                                                              Preco',
  REGUA_ITEM, ITEM_1, ITEM_2,
];

describe('reconhecer o relatório', () => {
  it('acha o Pacote Técnico pelo título que só ele tem', () => {
    expect(ehPacoteTecnico(ARQUIVO)).toBe(true);
  });

  it('não confunde com o relatório de movimentação', () => {
    expect(ehPacoteTecnico([' FI Alm Produto    Descricao   Data     Documento  TR TP Quantidade'])).toBe(false);
    expect(ehPacoteTecnico([])).toBe(false);
  });
});

describe('as colunas saem da régua do próprio relatório', () => {
  it('lê a régua de tracinhos como posições', () => {
    const r = reguaDeColunas(REGUA_ITEM);
    expect(r).not.toBeNull();
    expect(r).toHaveLength(10);
    expect(r?.[2]).toEqual([35, 48]);
  });

  it('linha com qualquer outra coisa não é régua', () => {
    expect(reguaDeColunas(ITEM_1)).toBeNull();
    expect(reguaDeColunas('')).toBeNull();
    /* Menos de oito grupos é separador de seção, não régua de colunas. */
    expect(reguaDeColunas(' --- --- ---')).toBeNull();
  });
});

describe('ler os pacotes e seus componentes', () => {
  it('separa o pacote, a aplicação dele e os itens', () => {
    const r = lerPacoteTecnico(ARQUIVO);
    expect(r.pacotes).toHaveLength(1);
    expect(r.pacotes[0].codigo).toBe('6AS1010BO');
    expect(r.pacotes[0].descricao).toBe('CAMBIO 6AS1010BO - EURORICAMBI');
    expect(r.pacotes[0].aplicacao).toContain('CONSTELLATION 17-280');
    expect(r.componentes).toBe(2);
    expect(r.ignoradas).toBe(0);
  });

  it('lê marca, preço e aplicação — os três campos que nenhum outro relatório traz', () => {
    const [item] = lerPacoteTecnico(ARQUIVO).pacotes[0].itens;
    expect(item.interno).toBe('0400000376');
    expect(item.marca).toBe('Cinpal');
    expect(item.marcaCodigo).toBe('040');
    expect(item.preco).toBe(1822.34);
    expect(item.aplicacao).toBe('MAN 6AS-1000TO/6AS1010BO/6S-1010BO');
    expect(item.qtdNoPacote).toBe(1);
  });

  it('lê a linha em que a coluna AS vem vazia', () => {
    /* Metade das linhas do arquivo real vem sem o "S". Exigir a coluna
       preenchida descartava essas linhas em silêncio. */
    const item = lerPacoteTecnico(ARQUIVO).pacotes[0].itens[1];
    expect(item.interno).toBe('0090015402');
    expect(item.marca).toBe('CORTECO');
    expect(item.preco).toBe(182.74);
    expect(item.aplicacao).toBe('Scania S4');
  });

  it('não engole a moldura nem os cabeçalhos repetidos de página', () => {
    expect(lerPacoteTecnico(ARQUIVO).ignoradas).toBe(0);
  });

  it('arquivo vazio não vira pacote', () => {
    expect(lerPacoteTecnico([]).pacotes).toHaveLength(0);
    expect(lerPacoteTecnico(null).componentes).toBe(0);
  });
});

describe('preço e marca do jeito que o relatório escreve', () => {
  it('lê o preço brasileiro com milhar', () => {
    expect(precoDoRelatorio('1.822,34')).toBe(1822.34);
    expect(precoDoRelatorio('36.277,19')).toBe(36277.19);
    expect(precoDoRelatorio('1,12')).toBe(1.12);
  });

  it('devolve null para o que não é preço — nunca zero', () => {
    expect(precoDoRelatorio('')).toBeNull();
    expect(precoDoRelatorio('PC')).toBeNull();
    expect(precoDoRelatorio('1822.34')).toBeNull();
  });

  it('separa o código do fornecedor do nome da marca', () => {
    expect(separarMarca('820   Euroricambi')).toEqual({ codigo: '820', nome: 'Euroricambi' });
    expect(separarMarca('G56   SKF')).toEqual({ codigo: 'G56', nome: 'SKF' });
    expect(separarMarca('H22   EATON VALVULA M')).toEqual({ codigo: 'H22', nome: 'EATON VALVULA M' });
  });

  it('marca sem código não perde o nome', () => {
    expect(separarMarca('Euroricambi')).toEqual({ codigo: '', nome: 'Euroricambi' });
  });
});

describe('a ficha por código', () => {
  const pacotes = [
    { codigo: 'A', descricao: '', cadastro: '', aplicacao: '', itens: [
      { interno: '0400000391', descricao: 'Eixo secundario', marca: 'Cinpal', marcaCodigo: '040',
        original: '2W0311460', fab: 'REX13330244', aplicacao: 'VOLKS', preco: 2843.09, qtdNoPacote: 1, un: 'PC' },
    ] },
    { codigo: 'B', descricao: '', cadastro: '', aplicacao: '', itens: [
      { interno: '0400000391', descricao: 'Eixo secundario', marca: 'Cinpal', marcaCodigo: '040',
        original: '2W0311460', fab: 'REX13330244', aplicacao: 'VOLKS', preco: 2843.09, qtdNoPacote: 1, un: 'PC' },
    ] },
  ];

  it('junta os pacotes em que o mesmo código aparece', () => {
    /* É o que permite dizer "esta peça faz parte destes serviços". */
    const { ficha } = fichaPorCodigo(pacotes);
    expect(ficha['0400000391'].pacotes).toEqual(['A', 'B']);
    expect(ficha['0400000391'].preco).toBe(2843.09);
  });

  it('não inventa divergência onde não há', () => {
    /* No arquivo real: 0 divergências em 1.337 linhas. */
    expect(fichaPorCodigo(pacotes).divergencias).toHaveLength(0);
  });

  it('registra a divergência em vez de escolher em silêncio', () => {
    const conflito = JSON.parse(JSON.stringify(pacotes));
    conflito[1].itens[0].preco = 3000;
    const { ficha, divergencias } = fichaPorCodigo(conflito);
    expect(divergencias).toHaveLength(1);
    expect(divergencias[0]).toMatchObject({ interno: '0400000391', campo: 'preco', a: 2843.09, b: 3000 });
    /* O primeiro preço continua valendo: mudar em silêncio seria o erro. */
    expect(ficha['0400000391'].preco).toBe(2843.09);
  });

  it('preenche o campo que faltava num pacote com o que veio no outro', () => {
    const parcial = JSON.parse(JSON.stringify(pacotes));
    parcial[0].itens[0].preco = null;
    parcial[0].itens[0].marca = '';
    const { ficha, divergencias } = fichaPorCodigo(parcial);
    expect(ficha['0400000391'].preco).toBe(2843.09);
    expect(ficha['0400000391'].marca).toBe('Cinpal');
    expect(divergencias).toHaveLength(0);
  });
});

describe('de qual filial e de quando é o relatório', () => {
  it('lê a filial e a data de emissão do cabeçalho', () => {
    /* Importa porque o PREÇO é o daquela filial naquela data. Mostrar a data
       do carregamento no lugar faz o número parecer mais novo do que é. */
    const c = cabecalhoDoRelatorio(ARQUIVO);
    expect(c.filial).toBe('03');
    expect(c.nomeFilial).toBe('RIBEIRAO PRETO');
    expect(c.emitidoEm).toBe('04/08/26');
  });

  it('não inventa cabeçalho quando ele não vem', () => {
    expect(cabecalhoDoRelatorio([])).toEqual({ filial: '', nomeFilial: '', emitidoEm: '' });
  });

  it('a leitura devolve o cabeçalho junto com os pacotes', () => {
    const r = lerPacoteTecnico(ARQUIVO);
    expect(r.emitidoEm).toBe('04/08/26');
    expect(r.filial).toBe('03');
  });
});
