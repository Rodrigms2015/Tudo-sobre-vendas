import { describe, expect, it } from 'vitest';
import { TETO_CRITICOS, aplicarOrcamentoDeSeveridade, chaveAlerta, gerarAlertas } from './andon';
import { construirTodosContextos } from './context';
import { SETTINGS_PADRAO, type Alert } from '../types';
import { FAMILIAS } from '../seed/catalog';
import { somarDias } from '../dates';
import {
  REF,
  cliente,
  dataset,
  frota,
  interacao,
  orcamento,
  perda,
  promessa,
  vendasRegulares,
} from '../../test/fixtures';

function alertasDe(parcial: Parameters<typeof dataset>[0], acks: Alert extends never ? never : Parameters<typeof gerarAlertas>[1]['acks'] = []) {
  const dados = dataset(parcial);
  const contextos = construirTodosContextos(dados, 'vnd-001', REF);
  return gerarAlertas(contextos, {
    settings: SETTINGS_PADRAO,
    familias: FAMILIAS,
    acks,
    referencia: REF,
  });
}

describe('detecção', () => {
  it('acende VEICULO_PARADO como crítico', () => {
    const alertas = alertasDe({
      customers: [cliente()],
      fleets: [frota()],
      interactions: [interacao({ urgente: true, data: REF, resumo: 'Ônibus parado no pátio' })],
    });
    expect(alertas[0].tipo).toBe('VEICULO_PARADO');
    expect(alertas[0].severidade).toBe('CRITICO');
  });

  it('acende PROMESSA_VENCIDA como crítico', () => {
    const alertas = alertasDe({
      customers: [cliente()],
      fleets: [frota()],
      promessas: [promessa()],
    });
    expect(alertas[0].tipo).toBe('PROMESSA_VENCIDA');
    expect(alertas[0].severidade).toBe('CRITICO');
  });

  it('não acende orçamento parado se houve interação depois da proposta', () => {
    const alertas = alertasDe({
      customers: [cliente()],
      fleets: [frota()],
      quotes: [orcamento({ data: somarDias(REF, -12) })],
      interactions: [interacao({ data: somarDias(REF, -2) })],
    });
    expect(alertas.some((a) => a.tipo === 'ORCAMENTO_PARADO')).toBe(false);
  });

  it('acende orçamento parado sem interação posterior', () => {
    const alertas = alertasDe({
      customers: [cliente()],
      fleets: [frota()],
      quotes: [orcamento({ data: somarDias(REF, -12), valorTotal: 20000 })],
    });
    const alerta = alertas.find((a) => a.tipo === 'ORCAMENTO_PARADO');
    expect(alerta).toBeDefined();
    expect(alerta?.severidade).toBe('CRITICO'); // ≥10 dias e ≥R$10k
  });

  it('acende demanda repetida sem estoque na mesma família', () => {
    const alertas = alertasDe({
      customers: [cliente()],
      fleets: [frota()],
      lostSales: [
        perda({ id: 'p1', data: somarDias(REF, -10), familyId: 'fam-03' }),
        perda({ id: 'p2', data: somarDias(REF, -30), familyId: 'fam-03' }),
      ],
    });
    const chaves = alertas.flatMap((a) => [a.tipo, ...a.contextoAdicional.map(() => a.tipo)]);
    expect(chaves.includes('PERDA_POR_ESTOQUE') || chaves.includes('DEMANDA_REPETIDA_SEM_ESTOQUE')).toBe(
      true,
    );
  });
});

describe('controle de ruído', () => {
  it('gera no máximo UM alerta por conta', () => {
    // Conta com urgência, promessa vencida, orçamento parado e perdas — tudo junto.
    const { vendas, itens } = vendasRegulares('cli-t01', 30, 8, 120);
    const alertas = alertasDe({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota()],
      promessas: [promessa()],
      quotes: [orcamento({ data: somarDias(REF, -20) })],
      lostSales: [perda()],
      interactions: [interacao({ urgente: true, data: REF })],
    });
    expect(alertas.filter((a) => a.customerId === 'cli-t01')).toHaveLength(1);
    // Os demais sinais viram contexto dentro do alerta principal.
    expect(alertas[0].contextoAdicional.length).toBeGreaterThan(0);
  });

  it('limita a três alertas críticos, rebaixando o excedente', () => {
    const clientes = Array.from({ length: 6 }, (_, i) =>
      cliente({ id: `cli-${i}`, nomeFantasia: `Cliente ${i}` }),
    );
    const alertas = alertasDe({
      customers: clientes,
      fleets: clientes.map((c, i) => frota({ id: `frt-${i}`, customerId: c.id })),
      promessas: clientes.map((c, i) => promessa({ id: `prm-${i}`, customerId: c.id })),
    });
    expect(alertas.filter((a) => a.severidade === 'CRITICO').length).toBe(TETO_CRITICOS);
    expect(alertas.length).toBe(6);
    const rebaixado = alertas.find((a) =>
      a.contextoAdicional.some((c) => c.includes('Rebaixado a atenção')),
    );
    expect(rebaixado).toBeDefined();
  });

  it('respeita o reconhecimento dentro da janela de silêncio', () => {
    const parcial = {
      customers: [cliente()],
      fleets: [frota()],
      promessas: [promessa()],
    };
    const semAck = alertasDe(parcial);
    expect(semAck).toHaveLength(1);

    const comAck = alertasDe(parcial, [
      {
        id: 'ack-1',
        alertKey: chaveAlerta('cli-t01', 'PROMESSA_VENCIDA'),
        customerId: 'cli-t01',
        motivo: 'já liguei hoje',
        data: REF,
      },
    ]);
    expect(comAck.some((a) => a.tipo === 'PROMESSA_VENCIDA')).toBe(false);
  });

  it('o alerta volta depois da janela de silêncio', () => {
    const alertas = alertasDe(
      { customers: [cliente()], fleets: [frota()], promessas: [promessa()] },
      [
        {
          id: 'ack-1',
          alertKey: chaveAlerta('cli-t01', 'PROMESSA_VENCIDA'),
          customerId: 'cli-t01',
          motivo: 'antigo',
          data: somarDias(REF, -SETTINGS_PADRAO.janelaSilencioDias - 1),
        },
      ],
    );
    expect(alertas.some((a) => a.tipo === 'PROMESSA_VENCIDA')).toBe(true);
  });
});

describe('formato obrigatório', () => {
  it('todo alerta tem os seis campos narrativos preenchidos', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 30, 8, 120);
    const alertas = alertasDe({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota()],
      promessas: [promessa()],
      lostSales: [perda()],
      interactions: [interacao({ urgente: true, data: REF })],
    });
    expect(alertas.length).toBeGreaterThan(0);
    for (const a of alertas) {
      expect(a.oQueAconteceu.trim().length).toBeGreaterThan(10);
      expect(a.porQueImporta.trim().length).toBeGreaterThan(10);
      expect(a.acaoSugerida.trim().length).toBeGreaterThan(10);
      expect(a.responsavel.trim().length).toBeGreaterThan(0);
      expect(a.prazo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.impactoEstimado).toBeGreaterThanOrEqual(0);
      // Contrato de explicabilidade.
      expect(a.fatores.length).toBeGreaterThan(0);
      for (const f of a.fatores) expect(f.evidencia.trim().length).toBeGreaterThan(5);
    }
  });
});

describe('aplicarOrcamentoDeSeveridade', () => {
  it('preserva alertas quando estão dentro do teto', () => {
    const base = {
      id: 'a',
      customerId: 'c',
      tipo: 'PROMESSA_VENCIDA' as const,
      oQueAconteceu: 'x',
      porQueImporta: 'y',
      impactoEstimado: 100,
      acaoSugerida: 'z',
      responsavel: 'v',
      prazo: REF,
      criadoEm: REF,
      contextoAdicional: [],
      fatores: [],
      penalidades: [],
      lacunas: [],
      proximaPergunta: null,
    };
    const entrada: Alert[] = [
      { ...base, id: '1', severidade: 'CRITICO' },
      { ...base, id: '2', severidade: 'ATENCAO' },
    ];
    const saida = aplicarOrcamentoDeSeveridade(entrada);
    expect(saida.filter((a) => a.severidade === 'CRITICO')).toHaveLength(1);
  });

  it('coloca veículo parado acima de perda por estoque de impacto muito maior', () => {
    // Impacto sozinho é o critério errado: a perda já aconteceu, o veículo parado
    // ainda é reversível. Ver PRECEDENCIA_ALERTA em andon.ts.
    const base = {
      customerId: 'c',
      severidade: 'CRITICO' as const,
      oQueAconteceu: 'x',
      porQueImporta: 'y',
      acaoSugerida: 'z',
      responsavel: 'v',
      prazo: REF,
      criadoEm: REF,
      contextoAdicional: [],
      fatores: [],
      penalidades: [],
      lacunas: [],
      proximaPergunta: null,
    };
    const saida = aplicarOrcamentoDeSeveridade([
      { ...base, id: '1', tipo: 'PERDA_POR_ESTOQUE', impactoEstimado: 28_000 },
      { ...base, id: '2', tipo: 'VEICULO_PARADO', impactoEstimado: 5_000 },
    ]);
    expect(saida[0].tipo).toBe('VEICULO_PARADO');
  });

  it('mantém os críticos de maior impacto ao rebaixar', () => {
    const base = {
      customerId: 'c',
      tipo: 'PROMESSA_VENCIDA' as const,
      severidade: 'CRITICO' as const,
      oQueAconteceu: 'x',
      porQueImporta: 'y',
      acaoSugerida: 'z',
      responsavel: 'v',
      prazo: REF,
      criadoEm: REF,
      contextoAdicional: [],
      fatores: [],
      penalidades: [],
      lacunas: [],
      proximaPergunta: null,
    };
    const entrada: Alert[] = [
      { ...base, id: '1', impactoEstimado: 100 },
      { ...base, id: '2', impactoEstimado: 900 },
      { ...base, id: '3', impactoEstimado: 500 },
      { ...base, id: '4', impactoEstimado: 800 },
    ];
    const criticos = aplicarOrcamentoDeSeveridade(entrada).filter(
      (a) => a.severidade === 'CRITICO',
    );
    expect(criticos.map((a) => a.id)).toEqual(['2', '4', '3']);
  });
});
