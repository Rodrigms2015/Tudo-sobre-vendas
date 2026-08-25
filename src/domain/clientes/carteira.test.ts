/**
 * Carteira de clientes e metas — filial 37, Passo Fundo.
 *
 * Cada teste descreve a REGRA DE NEGÓCIO. Os números vêm do arquivo real
 * `CLIENTE_PASSO_FUNDO_21082026.xls`, medidos antes de escrever o código.
 */

import { describe, expect, it } from 'vitest';
import {
  CORTE_INATIVIDADE,
  diasSemComprar,
  ehRelatorioDeClientes,
  filialDaCarteira,
  inativos,
  lerCarteira,
  anoDeDoisDigitos,
  lerLinhaCliente,
  mediaDosFechados,
  mesDeReferencia,
  metaDoCliente,
  paraReal,
  resumirCarteira,
  rotulosDasColunas,
  separarCodigoNome,
  situacaoDoCliente,
} from './carteira.js';

/** A linha do ALCEU FOPPA, copiada do arquivo real. */
const LINHA_ALCEU = [
  '800677 ALCEU FOPPA & CIA LTDA        ', 'ALVO', '37', '3702 ', '3702', '    0',
  '  40.000,00', '   3.912,75', '     611,00', '       0,00', '   3.386,39',
  '10/08/26', '    3.912,75', '100', '0345',
];

describe('código e nome vêm grudados na mesma coluna', () => {
  it('separa os dois', () => {
    expect(separarCodigoNome('800677 ALCEU FOPPA & CIA LTDA   '))
      .toEqual({ codigo: '800677', nome: 'ALCEU FOPPA & CIA LTDA' });
  });

  it('recusa cabeçalho e separador em vez de inventar cliente', () => {
    expect(separarCodigoNome('Cliente       N o m e   ')).toBeNull();
    expect(separarCodigoNome('-------------------------')).toBeNull();
    expect(separarCodigoNome('')).toBeNull();
  });
});

describe('ano de dois dígitos não pode jogar cliente para o futuro', () => {
  it('lê 26 como 2026', () => {
    expect(anoDeDoisDigitos('26', 2026)).toBe(2026);
  });

  it('lê 99 como 1999, e não 2099', () => {
    /* O arquivo real tem cliente sem comprar desde os anos 90. Mapear tudo
       para 20xx faz "há quantos dias não compra" virar negativo. */
    expect(anoDeDoisDigitos('99', 2026)).toBe(1999);
    expect(anoDeDoisDigitos('05', 2026)).toBe(2005);
    expect(anoDeDoisDigitos('27', 2026)).toBe(2027);
  });
});

describe('valor em real: ponto é milhar, e vazio não é zero', () => {
  it('lê 40.000,00', () => {
    expect(paraReal('  40.000,00')).toBeCloseTo(40000, 2);
  });

  it('mantém o zero que é faturamento de verdade', () => {
    expect(paraReal('       0,00')).toBe(0);
  });

  it('devolve null para ausente e ilegível', () => {
    expect(paraReal('')).toBeNull();
    expect(paraReal('____')).toBeNull();
    expect(paraReal('-----')).toBeNull();
  });
});

describe('a linha do relatório vira cliente', () => {
  const c = lerLinhaCliente(LINHA_ALCEU, 2026);

  it('lê os campos que o ERP traz', () => {
    expect(c?.codigo).toBe('800677');
    expect(c?.nome).toBe('ALCEU FOPPA & CIA LTDA');
    expect(c?.tipo).toBe('ALVO');
    expect(c?.filial).toBe('37');
    expect(c?.potencial).toBeCloseTo(40000, 2);
    expect(c?.vendedor).toBe('0345');
  });

  it('guarda os quatro meses na ordem do relatório, o corrente primeiro', () => {
    expect(c?.faturamento).toEqual([3912.75, 611, 0, 3386.39]);
  });

  it('converte a última compra para data comparável', () => {
    expect(c?.ultimaCompra).toBe('2026-08-10');
    expect(c?.valorUltimaCompra).toBeCloseTo(3912.75, 2);
  });
});

describe('a média NÃO usa o mês corrente, que é parcial', () => {
  it('usa só os três meses fechados', () => {
    /* 611,00 + 0,00 + 3.386,39 = 3.997,39 ÷ 3 = 1.332,46 */
    const m = mediaDosFechados([3912.75, 611, 0, 3386.39]);
    expect(m?.mesesUsados).toBe(3);
    expect(m?.media).toBeCloseTo(1332.4633, 3);
  });

  it('incluir o mês corrente daria outro número — e mais baixo por ser parcial', () => {
    const comParcial = (3912.75 + 611 + 0 + 3386.39) / 4;
    const m = mediaDosFechados([3912.75, 611, 0, 3386.39]);
    expect(m?.media).not.toBeCloseTo(comParcial, 2);
  });

  it('sem nenhum mês fechado lido não há média', () => {
    expect(mediaDosFechados([100, null, null, null])).toBeNull();
    expect(mediaDosFechados([])).toBeNull();
  });
});

describe('meta sem base é lacuna, nunca zero', () => {
  it('a meta é a média dos fechados vezes o fator', () => {
    const r = metaDoCliente({ faturamento: [3912.75, 611, 0, 3386.39] }, 1);
    expect(r.meta).toBeCloseTo(1332.4633, 3);
    expect(r.base).toBeCloseTo(1332.4633, 3);
  });

  it('aplica o multiplicador que a gerência escolheu', () => {
    const r = metaDoCliente({ faturamento: [0, 1000, 1000, 1000] }, 1.1);
    expect(r.meta).toBeCloseTo(1100, 2);
  });

  it('quem não faturou nada nos fechados fica SEM meta, com o motivo', () => {
    const r = metaDoCliente({ faturamento: [500, 0, 0, 0] }, 1);
    expect(r.meta).toBeNull();
    expect(r.motivo).toMatch(/não faturou nada/i);
  });

  it('zero não é meta batida — é ausência de meta', () => {
    const r = metaDoCliente({ faturamento: [null, null, null, null] }, 1);
    expect(r.meta).toBeNull();
  });
});

describe('situação do cliente sai do que foi medido', () => {
  const fat = [0, 100, 100, 100];
  it('quem comprou este mês está ativo', () => {
    expect(situacaoDoCliente({ ultimaCompra: '2026-08-10', faturamento: fat }, '2026-08-21').situacao).toBe('ATIVO');
  });

  it('quem sumiu há mais de um ano está perdido', () => {
    const s = situacaoDoCliente({ ultimaCompra: '2013-07-23', faturamento: fat }, '2026-08-21');
    expect(s.situacao).toBe('PERDIDO');
    expect(s.rotulo).toMatch(/mais de um ano/);
  });

  it('os degraus do meio têm nome próprio', () => {
    expect(situacaoDoCliente({ ultimaCompra: '2026-06-20', faturamento: fat }, '2026-08-21').situacao).toBe('ESFRIANDO');
    expect(situacaoDoCliente({ ultimaCompra: '2026-02-10', faturamento: fat }, '2026-08-21').situacao).toBe('DORMINDO');
  });

  it('sem data de compra não inventa dias', () => {
    const s = situacaoDoCliente({ ultimaCompra: null, faturamento: [null, null, null, null] }, '2026-08-21');
    expect(s.dias).toBeNull();
    expect(s.situacao).toBe('SEM_DATA');
  });
});

describe('o mês de referência sai do arquivo, não do nome dele', () => {
  it('usa a compra mais recente', () => {
    const ref = mesDeReferencia([
      { ultimaCompra: '2026-07-02' }, { ultimaCompra: '2026-08-19' }, { ultimaCompra: '2013-07-23' },
    ]);
    expect(ref).toEqual({ ano: 2026, mes: 8 });
  });

  it('rotula as quatro colunas e marca a primeira como parcial', () => {
    const r = rotulosDasColunas({ ano: 2026, mes: 8 });
    expect(r.map((x) => x.rotulo)).toEqual(['agosto/26', 'julho/26', 'junho/26', 'maio/26']);
    expect(r[0].parcial).toBe(true);
    expect(r.slice(1).every((x) => x.parcial === false)).toBe(true);
  });

  it('vira o ano quando o recuo cruza janeiro', () => {
    const r = rotulosDasColunas({ ano: 2026, mes: 2 });
    expect(r.map((x) => x.rotulo)).toEqual(['fevereiro/26', 'janeiro/26', 'dezembro/25', 'novembro/25']);
  });
});

describe('o resumo separa as grandezas', () => {
  it('conta quem tem meta e quem ficou sem base', () => {
    const r = resumirCarteira([
      { faturamento: [100, 300, 300, 300] },
      { faturamento: [50, 0, 0, 0] },
      { faturamento: [null, null, null, null] },
    ], 1);
    expect(r.clientes).toBe(3);
    expect(r.comMeta).toBe(1);
    expect(r.semBase).toBe(2);
    expect(r.somaMeta).toBeCloseTo(300, 2);
  });

  it('o faturado do mês corrente fica separado, porque o mês não acabou', () => {
    const r = resumirCarteira([{ faturamento: [100, 300, 300, 300] }], 1);
    expect(r.faturadoNoMesParcial).toBeCloseTo(100, 2);
    expect(r.somaMeta).not.toBeCloseTo(r.faturadoNoMesParcial, 2);
  });
});

describe('reconhecer o relatório de clientes no meio dos outros', () => {
  /* Cabeçalho e duas primeiras linhas do CLIENTE_PASSO_FUNDO_21082026. */
  const CABECALHO = ['Cliente       N o m e                ', 'Tipo', 'Fi', 'Prom.', 'Repr',
    'Frot.', 'Potencial  ', 'Faturamento', 'Faturamento', 'Faturamento', 'Faturamento',
    'Dt U.Com', '    Vl U.Com', 'Ram', 'Vend'];
  const TRACOS = CABECALHO.map(() => '-----');
  const ALCEU = ['800677 ALCEU FOPPA & CIA LTDA        ', 'ALVO', '37', '3702 ', '3702', '    0',
    '  40.000,00', '   3.912,75', '     611,00', '       0,00', '   3.386,39', '10/08/26',
    '    3.912,75', '100', '0345'];

  it('acha o cabeçalho pelas quatro colunas com o mesmo nome', () => {
    expect(ehRelatorioDeClientes([CABECALHO, TRACOS, ALCEU])).toBe(0);
  });

  it('não confunde com o relatório de movimentação', () => {
    expect(ehRelatorioDeClientes([['FI', 'Alm', 'Produto', 'Descricao', 'Data', 'Documento', 'TR', 'TP', 'Quantidade']])).toBe(-1);
  });

  it('não confunde com o estoque', () => {
    expect(ehRelatorioDeClientes([['Cod Interno', 'Produto', 'Grupo', 'Descricao', 'Curva', 'Saldo']])).toBe(-1);
  });
});

describe('ler a carteira inteira', () => {
  const CABECALHO = ['Cliente       N o m e                ', 'Tipo', 'Fi', 'Prom.', 'Repr',
    'Frot.', 'Potencial  ', 'Faturamento', 'Faturamento', 'Faturamento', 'Faturamento',
    'Dt U.Com', '    Vl U.Com', 'Ram', 'Vend'];
  const TRACOS = CABECALHO.map(() => '-----');
  const ALCEU = ['800677 ALCEU FOPPA & CIA LTDA        ', 'ALVO', '37', '3702 ', '3702', '    0',
    '  40.000,00', '   3.912,75', '     611,00', '       0,00', '   3.386,39', '10/08/26',
    '    3.912,75', '100', '0345'];

  it('lê os clientes e conta o que ficou de fora', () => {
    const r = lerCarteira([CABECALHO, TRACOS, ALCEU, []], 0, 2026);
    expect(r.clientes).toHaveLength(1);
    expect(r.clientes[0].nome).toBe('ALCEU FOPPA & CIA LTDA');
    /* A linha de tracinhos e a linha vazia. Contadas, não escondidas. */
    expect(r.ignoradas).toBe(2);
  });

  it('a meta sai da média dos meses fechados, sem o mês corrente', () => {
    const [c] = lerCarteira([CABECALHO, TRACOS, ALCEU], 0, 2026).clientes;
    /* (611,00 + 0,00 + 3.386,39) / 3 = 1.332,46. Com o mês corrente entraria
       3.912,75 na conta e a média subiria para 1.977,53. */
    expect(metaDoCliente(c, 1).meta).toBeCloseTo(1332.46, 2);
  });
});

describe('a lista de ataque: quem não compra há 30 dias', () => {
  const cli = (nome: string, ultimaCompra: string | null, media = 1000) => ({
    nome, ultimaCompra, faturamento: [0, media, media, media] as Array<number | null>,
  });

  it('o corte padrão é 30 dias', () => {
    expect(CORTE_INATIVIDADE).toBe(30);
  });

  it('pega quem passou do corte e deixa quem comprou dentro dele', () => {
    const lista = inativos([
      cli('parou há 45', '2026-07-10'),
      cli('comprou ontem', '2026-08-23'),
      cli('parou há exatamente 30', '2026-07-25'),
    ], '2026-08-24');
    expect(lista.map((c) => c.nome)).toEqual(['parou há 45', 'parou há exatamente 30']);
  });

  it('o mais parado vem primeiro', () => {
    const lista = inativos([cli('A', '2026-06-01'), cli('B', '2026-01-01')], '2026-08-24');
    expect(lista[0].nome).toBe('B');
  });

  it('empate no tempo desempata pelo maior cliente — é ele que paga a ligação', () => {
    const lista = inativos([cli('pequeno', '2026-07-01', 100), cli('grande', '2026-07-01', 9000)], '2026-08-24');
    expect(lista[0].nome).toBe('grande');
  });

  it('cliente SEM data de compra fica de fora, não entra como parado', () => {
    /* Não dá para afirmar que parou há trinta dias quem não se sabe se
       comprou alguma vez. A lacuna aparece na carteira, não nesta lista. */
    expect(inativos([cli('sem data', null)], '2026-08-24')).toHaveLength(0);
  });

  it('o corte é escolha de quem trabalha, não constante', () => {
    expect(inativos([cli('X', '2026-08-01')], '2026-08-24', 60)).toHaveLength(0);
    expect(inativos([cli('X', '2026-08-01')], '2026-08-24', 10)).toHaveLength(1);
  });

  it('dias sem comprar é nulo sem data — nunca zero', () => {
    expect(diasSemComprar({ ultimaCompra: null }, '2026-08-24')).toBeNull();
    expect(diasSemComprar({ ultimaCompra: '2026-08-14' }, '2026-08-24')).toBe(10);
  });
});

describe('de quem é a carteira', () => {
  it('a filial que mais aparece é a dona', () => {
    /* Mesma regra do relatório de movimentação, e pelo mesmo motivo: a
       carteira de Londrina não pode virar a de Passo Fundo por descuido. */
    expect(filialDaCarteira([{ filial: '37' }, { filial: '37' }, { filial: '13' }])).toBe('37');
  });

  it('completa o código de um dígito só', () => {
    expect(filialDaCarteira([{ filial: '9' }])).toBe('09');
  });

  it('sem filial declarada não inventa dona', () => {
    expect(filialDaCarteira([{ filial: '' }])).toBeNull();
    expect(filialDaCarteira([])).toBeNull();
  });
});
