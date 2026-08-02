import { describe, expect, it } from 'vitest';
import { gerarRecomendacoes, ordenarRecomendacoes, selecionarTop3 } from './recommendations';
import { construirTodosContextos } from './context';
import { PRECEDENCIA_TIPO, SETTINGS_PADRAO, type Recommendation } from '../types';
import { FAMILIAS } from '../seed/catalog';
import {
  REF,
  cliente,
  dataset,
  frota,
  interacao,
  orcamento,
  promessa,
  vendasRegulares,
} from '../../test/fixtures';

function gerar(parcial: Parameters<typeof dataset>[0]) {
  const dados = dataset(parcial);
  const contextos = construirTodosContextos(dados, 'vnd-001', REF);
  return gerarRecomendacoes(contextos, {
    familias: FAMILIAS,
    settings: SETTINGS_PADRAO,
    feedback: dados.recommendationFeedback,
    referencia: REF,
  });
}

describe('determinação de tipo', () => {
  it('urgência vence tudo', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 200);
    const recs = gerar({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota()],
      quotes: [orcamento()],
      promessas: [promessa()],
      interactions: [interacao({ urgente: true, data: REF })],
    });
    expect(recs[0].tipo).toBe('URGENCIA');
  });

  it('compromisso vence recuperação', () => {
    const recs = gerar({
      customers: [cliente()],
      fleets: [frota()],
      quotes: [orcamento()],
      promessas: [promessa()],
    });
    expect(recs[0].tipo).toBe('COMPROMISSO');
  });

  it('classifica reposição na janela de recompra', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 57);
    const recs = gerar({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota()],
    });
    expect(recs[0].tipo).toBe('REPOSICAO');
  });

  it('classifica reativação, e não reposição, quando passou do dobro do ciclo', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 30, 8, 90);
    const recs = gerar({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota()],
    });
    expect(recs[0].tipo).toBe('REATIVACAO');
  });

  it('classifica expansão para frota grande com poucas famílias', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 10);
    const recs = gerar({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota({ totalVeiculos: 60 })],
    });
    expect(recs[0].tipo).toBe('EXPANSAO');
  });

  it('não gera recomendação para conta sem sinal algum', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 10);
    const recs = gerar({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota({ totalVeiculos: 5 })],
      contacts: [
        {
          id: 'ctt-1',
          customerId: 'cli-t01',
          nome: 'Contato',
          cargo: 'Comprador',
          canalPreferido: 'TELEFONE',
          telefoneMascarado: '(11) 9····-0000',
        },
      ],
    });
    expect(recs).toHaveLength(0);
  });
});

describe('ordenação: precedência do tipo vence o score', () => {
  it('coloca urgência de score baixo acima de expansão de score alto', () => {
    const base: Omit<Recommendation, 'tipo' | 'score' | 'id' | 'customerId'> = {
      acao: 'x',
      componentes: {
        recorrencia: 0,
        tempoSemCompra: 0,
        orcamentoAberto: 0,
        potencialFrota: 0,
        urgencia: 0,
        aderenciaFamilia: 0,
        relacionamento: 0,
        margemPotencial: 0,
        compromissoVencido: 0,
      },
      confianca: 'ALTA',
      valorPotencial: 0,
      prazo: REF,
      driversDominantes: [],
      fatores: [],
      penalidades: [],
      lacunas: [],
      proximaPergunta: null,
    };

    const ordenadas = ordenarRecomendacoes([
      { ...base, id: 'a', customerId: 'c1', tipo: 'EXPANSAO', score: 88 },
      { ...base, id: 'b', customerId: 'c2', tipo: 'URGENCIA', score: 52 },
      { ...base, id: 'c', customerId: 'c3', tipo: 'REPOSICAO', score: 75 },
    ]);

    expect(ordenadas.map((r) => r.tipo)).toEqual(['URGENCIA', 'REPOSICAO', 'EXPANSAO']);
  });

  it('ordena por score dentro do mesmo tipo', () => {
    const clientes = [
      cliente({ id: 'cli-a', nomeFantasia: 'A' }),
      cliente({ id: 'cli-b', nomeFantasia: 'B' }),
    ];
    const a = vendasRegulares('cli-a', 60, 10, 57);
    const b = vendasRegulares('cli-b', 60, 5, 57);
    const recs = gerar({
      customers: clientes,
      sales: [...a.vendas, ...b.vendas],
      saleItems: [...a.itens, ...b.itens],
      fleets: [
        frota({ id: 'frt-a', customerId: 'cli-a', totalVeiculos: 50 }),
        frota({ id: 'frt-b', customerId: 'cli-b', totalVeiculos: 12 }),
      ],
    });
    expect(recs).toHaveLength(2);
    expect(recs[0].score).toBeGreaterThanOrEqual(recs[1].score);
  });

  it('a tabela de precedência cobre todos os tipos e é estritamente ordenada', () => {
    const valores = Object.values(PRECEDENCIA_TIPO);
    expect(new Set(valores).size).toBe(valores.length);
  });
});

describe('confiança', () => {
  it('marca BAIXA quando não há base de cadência', () => {
    const recs = gerar({
      customers: [cliente()],
      fleets: [frota({ totalVeiculos: null, procedencia: 'AUSENTE' })],
      quotes: [orcamento()],
    });
    expect(recs[0].confianca).toBe('BAIXA');
  });

  it('exclui confiança BAIXA do Top 3 do Cockpit', () => {
    const recs = gerar({
      customers: [cliente()],
      fleets: [frota({ totalVeiculos: null, procedencia: 'AUSENTE' })],
      quotes: [orcamento()],
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(selecionarTop3(recs)).toHaveLength(0);
  });

  it('limita o Top 3 a três itens', () => {
    const clientes = Array.from({ length: 6 }, (_, i) =>
      cliente({ id: `cli-${i}`, nomeFantasia: `Cliente ${i}` }),
    );
    const vendas = clientes.flatMap((c) => vendasRegulares(c.id, 60, 8, 57).vendas);
    const itens = clientes.flatMap((c) => vendasRegulares(c.id, 60, 8, 57).itens);
    const recs = gerar({
      customers: clientes,
      sales: vendas,
      saleItems: itens,
      fleets: clientes.map((c, i) =>
        frota({ id: `frt-${i}`, customerId: c.id, totalVeiculos: 30 }),
      ),
      contacts: clientes.map((c, i) => ({
        id: `ctt-${i}`,
        customerId: c.id,
        nome: 'Contato',
        cargo: 'Comprador',
        canalPreferido: 'TELEFONE' as const,
        telefoneMascarado: '(11) 9····-0000',
      })),
    });
    expect(selecionarTop3(recs).length).toBeLessThanOrEqual(3);
  });
});

describe('explicabilidade — imposta pelo tipo, verificada aqui', () => {
  it('toda recomendação tem ação, prazo e raciocínio ou lacuna', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 8, 57);
    const recs = gerar({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota()],
      quotes: [orcamento()],
    });
    for (const r of recs) {
      expect(r.acao.trim().length).toBeGreaterThan(10);
      expect(r.prazo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Nunca um card mudo: ou há fator, ou há lacuna explicando a ausência.
      expect(r.fatores.length + r.lacunas.length).toBeGreaterThan(0);
      for (const f of r.fatores) expect(f.evidencia.trim().length).toBeGreaterThan(5);
    }
  });
});

describe('aprendizado com rejeição', () => {
  it('suprime a recomendação por 30 dias após "já resolvido"', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 8, 57);
    const dados = dataset({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota()],
      recommendationFeedback: [
        {
          id: 'fbk-1',
          customerId: 'cli-t01',
          tipo: 'REPOSICAO',
          aceita: false,
          motivo: 'JA_RESOLVIDO',
          comentario: '',
          data: REF,
        },
      ],
    });
    const contextos = construirTodosContextos(dados, 'vnd-001', REF);
    const recs = gerarRecomendacoes(contextos, {
      familias: FAMILIAS,
      settings: SETTINGS_PADRAO,
      feedback: dados.recommendationFeedback,
      referencia: REF,
    });
    expect(recs.find((r) => r.tipo === 'REPOSICAO')).toBeUndefined();
  });

  it('reduz a prioridade e MOSTRA a redução após 3 rejeições', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 8, 57);
    const dados = dataset({
      customers: [cliente()],
      sales: vendas,
      saleItems: itens,
      fleets: [frota()],
      recommendationFeedback: Array.from({ length: 3 }, (_, i) => ({
        id: `fbk-${i}`,
        customerId: 'cli-t01',
        tipo: 'REPOSICAO' as const,
        aceita: false,
        // INFORMACAO_ERRADA não suprime; apenas penaliza após 3 ocorrências.
        motivo: 'INFORMACAO_ERRADA' as const,
        comentario: '',
        data: REF,
      })),
    });
    const contextos = construirTodosContextos(dados, 'vnd-001', REF);
    const recs = gerarRecomendacoes(contextos, {
      familias: FAMILIAS,
      settings: SETTINGS_PADRAO,
      feedback: dados.recommendationFeedback,
      referencia: REF,
    });
    const rec = recs.find((r) => r.tipo === 'REPOSICAO');
    expect(rec).toBeDefined();
    // O ajuste é visível: nenhum aprendizado acontece escondido.
    expect(rec?.penalidades.some((p) => p.rotulo === 'Rejeições anteriores')).toBe(true);
  });
});
