/**
 * Comportamento de compra do cliente.
 *
 * Cada teste descreve a REGRA DE NEGÓCIO — o que o vendedor vê e por quê.
 * Se um limiar mudar, o teste correspondente tem de falhar.
 */

import { describe, expect, it } from 'vitest';
import {
  ACAO_CATEGORIA_CLIENTE,
  CATEGORIAS_CLIENTE,
  PRECEDENCIA_CLIENTE,
  ROTULO_CATEGORIA_CLIENTE,
  categoriaDoCliente,
  contarCategorias,
  fechadosDoCliente,
  listaDeLigacoes,
  medianaDeValores,
  medianaDosFechados,
} from './comportamento.js';
import { diasSemComprar } from './carteira.js';

/** Cliente de teste. `faturamento[0]` é o mês corrente, parcial. */
function cliente(faturamento: Array<number | null>, ultimaCompra: string | null = '2026-08-20') {
  return { codigo: '800677', nome: 'TESTE', faturamento, ultimaCompra };
}

/** Distância em dias, do jeito que a tela calcula. */
const dias = (n: number | null) => n;

describe('mediana', () => {
  it('sem nenhum valor devolve null, nunca zero — zero seria lido como "não vendeu"', () => {
    expect(medianaDeValores([])).toBeNull();
    expect(medianaDeValores([null as never, undefined as never])).toBeNull();
  });

  it('separa o pedido grande da rotina: 1.000 / 1.000 / 30.000 tem mediana 1.000', () => {
    expect(medianaDeValores([1000, 1000, 30000])).toBe(1000);
  });

  it('com número par de meses tira a média dos dois do meio', () => {
    expect(medianaDeValores([10, 20, 30, 40])).toBe(25);
  });
});

describe('meses fechados', () => {
  it('ignora a coluna do mês corrente, que é parcial', () => {
    expect(fechadosDoCliente(cliente([999, 10, 20, 30]))).toEqual([10, 20, 30]);
  });

  it('coluna não lida vira null, não zero', () => {
    expect(fechadosDoCliente(cliente([0, 10, null, 30]))).toEqual([10, null, 30]);
  });

  it('a mediana dos fechados não conta a coluna que faltou', () => {
    expect(medianaDosFechados(cliente([0, 10, null, 30]))).toEqual({ mediana: 20, mesesUsados: 2 });
  });

  it('sem nenhuma coluna fechada lida não há mediana', () => {
    expect(medianaDosFechados(cliente([500, null, null, null]))).toBeNull();
  });
});

describe('categoria do cliente', () => {
  it('sem nenhum mês fechado legível fica SEM_BASE e diz o que faltou', () => {
    const r = categoriaDoCliente(cliente([500, null, null, null]), dias(10), 30);
    expect(r.categoria).toBe('SEM_BASE');
    expect(r.evidencia).toBeNull();
    expect(r.lacuna).toContain('nenhum dos 3 meses fechados');
  });

  it('quem faturou nos 3 meses e está há 60 dias sem comprar é REGULAR_E_SUMIU', () => {
    const r = categoriaDoCliente(cliente([0, 1000, 1200, 900]), dias(60), 30);
    expect(r.categoria).toBe('REGULAR_E_SUMIU');
    expect(r.evidencia).toContain('60 dias sem comprar');
    expect(r.lacuna).toBeNull();
  });

  it('quem faturou nos 3 meses mas comprou dentro da régua continua ATIVO', () => {
    const r = categoriaDoCliente(cliente([0, 1000, 1200, 900]), dias(10), 30);
    expect(r.categoria).toBe('ATIVO');
  });

  it('a régua é escolhida por quem usa: 45 dias não é sumiço numa régua de 60', () => {
    expect(categoriaDoCliente(cliente([0, 1000, 1200, 900]), dias(45), 30).categoria).toBe('REGULAR_E_SUMIU');
    expect(categoriaDoCliente(cliente([0, 1000, 1200, 900]), dias(45), 60).categoria).toBe('ATIVO');
  });

  it('faturamento caindo mês a mês é ESTA_CAINDO, mesmo com compra recente', () => {
    const r = categoriaDoCliente(cliente([0, 500, 900, 1500]), dias(5), 30);
    expect(r.categoria).toBe('ESTA_CAINDO');
    expect(r.evidencia).toContain('caiu mês a mês');
  });

  it('dois meses iguais não são queda — estabilidade não vira alerta', () => {
    expect(categoriaDoCliente(cliente([0, 900, 900, 1500]), dias(5), 30).categoria).toBe('ATIVO');
  });

  it('sumir ganha de cair: quem caiu E parou aparece como REGULAR_E_SUMIU', () => {
    const r = categoriaDoCliente(cliente([0, 500, 900, 1500]), dias(60), 30);
    expect(r.categoria).toBe('REGULAR_E_SUMIU');
    expect(PRECEDENCIA_CLIENTE.REGULAR_E_SUMIU).toBeLessThan(PRECEDENCIA_CLIENTE.ESTA_CAINDO);
  });

  it('faturar em 1 dos 3 meses fechados é COMPRA_ESPORADICA', () => {
    const r = categoriaDoCliente(cliente([0, 0, 2000, 0]), dias(50), 30);
    expect(r.categoria).toBe('COMPRA_ESPORADICA');
  });

  it('não afirma "esporádico" quando um dos três meses não foi lido', () => {
    const r = categoriaDoCliente(cliente([0, 0, 2000, null]), dias(50), 30);
    expect(r.categoria).not.toBe('COMPRA_ESPORADICA');
  });

  it('zero faturado nos fechados e além da régua é INATIVO', () => {
    const r = categoriaDoCliente(cliente([0, 0, 0, 0]), dias(120), 30);
    expect(r.categoria).toBe('INATIVO');
    expect(r.evidencia).toContain('120 dias');
  });

  it('R$ 0,00 lido em todos os meses e sem data é SEM_COMPRA_REGISTRADA, não lacuna', () => {
    const r = categoriaDoCliente(cliente([0, 0, 0, 0], null), dias(null), 30);
    expect(r.categoria).toBe('SEM_COMPRA_REGISTRADA');
    expect(r.evidencia).toContain('R$ 0,00');
    expect(r.lacuna).toBeNull();
  });

  it('não confunde coluna ilegível com R$ 0,00: uma é lacuna, a outra é medição', () => {
    expect(categoriaDoCliente(cliente([null, null, null, null], null), dias(null), 30).categoria)
      .toBe('SEM_BASE');
    expect(categoriaDoCliente(cliente([0, 0, 0, 0], null), dias(null), 30).categoria)
      .toBe('SEM_COMPRA_REGISTRADA');
  });

  it('toda categoria tem rótulo e ação — nunca aparece um cliente sem saber o que fazer', () => {
    for (const c of CATEGORIAS_CLIENTE) {
      expect(ROTULO_CATEGORIA_CLIENTE[c as keyof typeof ROTULO_CATEGORIA_CLIENTE]).toBeTruthy();
      expect(ACAO_CATEGORIA_CLIENTE[c as keyof typeof ACAO_CATEGORIA_CLIENTE]).toBeTruthy();
    }
  });

  it('nunca devolve evidência e lacuna as duas vazias', () => {
    const casos = [
      categoriaDoCliente(cliente([500, null, null, null]), dias(10), 30),
      categoriaDoCliente(cliente([0, 1000, 1200, 900]), dias(60), 30),
      categoriaDoCliente(cliente([0, 500, 900, 1500]), dias(5), 30),
      categoriaDoCliente(cliente([0, 0, 0, 0], null), dias(null), 30),
      categoriaDoCliente(cliente([null, null, null, null], null), dias(null), 30),
      categoriaDoCliente(cliente([0, 1000, 1200, 900]), dias(10), 30),
    ];
    for (const r of casos) expect(r.evidencia !== null || r.lacuna !== null).toBe(true);
  });
});

describe('lista de ligações de hoje', () => {
  /* Datas de verdade, medidas contra o mesmo "hoje" que a tela usa. Assim o
     teste passa pelo mesmo `diasSemComprar` da tela, e não por um atalho. */
  const HOJE = '2026-08-26';
  const HA = (dias: number) =>
    new Date(Date.parse(HOJE + 'T00:00:00Z') - dias * 86400000).toISOString().slice(0, 10);

  it('deixa de fora quem está ativo e quem não tem base — nenhum dos dois é telefonema de hoje', () => {
    const lista = listaDeLigacoes(
      [
        cliente([0, 1000, 1200, 900], HA(10)),
        cliente([500, null, null, null], HA(10)),
        cliente([0, 1000, 1200, 900], HA(60)),
      ],
      HOJE, 30, diasSemComprar,
    );
    expect(lista).toHaveLength(1);
    expect(lista[0].categoria).toBe('REGULAR_E_SUMIU');
  });

  it('põe quem sumiu antes de quem está caindo', () => {
    const lista = listaDeLigacoes(
      [
        cliente([0, 500, 900, 1500], HA(5)),
        cliente([0, 1000, 1200, 900], HA(60)),
      ],
      HOJE, 30, diasSemComprar,
    );
    expect(lista.map((l: { categoria: string }) => l.categoria))
      .toEqual(['REGULAR_E_SUMIU', 'ESTA_CAINDO']);
  });

  it('dentro da mesma categoria, ordena pela mediana — não pelo pedido grande e único', () => {
    const lista = listaDeLigacoes(
      [
        cliente([0, 1000, 1000, 30000], HA(60)),
        cliente([0, 3000, 3000, 3000], HA(60)),
      ],
      HOJE, 30, diasSemComprar,
    );
    expect(lista[0].mediana).toBe(3000);
  });

  it('cada linha traz a ação e a evidência que a colocou ali', () => {
    const lista = listaDeLigacoes([cliente([0, 1000, 1200, 900], HA(60))], HOJE, 30, diasSemComprar);
    expect(lista[0].acao).toContain('Ligue hoje'.toLowerCase());
    expect(lista[0].evidencia).toContain('3 meses fechados');
  });

  it('a régua muda o tamanho da lista, e é ela que manda', () => {
    const carteira = [cliente([0, 1000, 1200, 900], HA(45))];
    expect(listaDeLigacoes(carteira, HOJE, 30, diasSemComprar)).toHaveLength(1);
    expect(listaDeLigacoes(carteira, HOJE, 60, diasSemComprar)).toHaveLength(0);
  });
});

describe('contagem por categoria', () => {
  const HOJE = '2026-08-26';

  it('traz todas as categorias, inclusive as vazias — aqui zero é contagem, não ausência', () => {
    const conta = contarCategorias([cliente([0, 1000, 1200, 900], '2026-06-27')], HOJE, 30, diasSemComprar);
    for (const c of CATEGORIAS_CLIENTE) expect(conta).toHaveProperty(c);
    expect(conta.REGULAR_E_SUMIU).toBe(1);
    expect(conta.ATIVO).toBe(0);
  });

  it('a soma das categorias fecha com o total da carteira — ninguém some da conta', () => {
    const carteira = [
      cliente([0, 1000, 1200, 900], '2026-06-27'),
      cliente([0, 500, 900, 1500], '2026-08-21'),
      cliente([500, null, null, null], '2026-08-21'),
      cliente([0, 0, 0, 0], '2025-01-10'),
      cliente([0, 1000, 1200, 900], '2026-08-21'),
    ];
    const conta = contarCategorias(carteira, HOJE, 30, diasSemComprar);
    const soma = CATEGORIAS_CLIENTE.reduce(
      (t, c) => t + conta[c as keyof typeof conta], 0);
    expect(soma).toBe(carteira.length);
  });
});
