/**
 * Testes de volume e integridade do seed.
 *
 * Os mínimos vêm do PROMPT_MASTER §11. Alertas e recomendações NÃO são semeados —
 * são derivados —, então o teste verifica que a carteira gerada PRODUZ pelo menos
 * os volumes exigidos quando o motor roda sobre ela.
 */

import { describe, expect, it } from 'vitest';
import { contarRegistros, gerarDadosDemo } from './index';
import { construirTodosContextos } from '../engine/context';
import { gerarRecomendacoes } from '../engine/recommendations';
import { gerarAlertas } from '../engine/andon';
import { SETTINGS_PADRAO } from '../types';

const REF = '2026-06-01';
const dados = gerarDadosDemo(REF);
const contagens = contarRegistros(dados);

const contextos = construirTodosContextos(dados, null, REF);
const recomendacoes = gerarRecomendacoes(contextos, {
  familias: dados.productFamilies,
  settings: SETTINGS_PADRAO,
  feedback: [],
  referencia: REF,
});
const alertas = gerarAlertas(contextos, {
  settings: SETTINGS_PADRAO,
  familias: dados.productFamilies,
  acks: [],
  referencia: REF,
});

describe('volumes mínimos do PROMPT_MASTER §11', () => {
  const minimos: [string, number][] = [
    ['clientes', 30],
    ['cidades', 10],
    ['segmentos', 5],
    ['produtos', 120],
    ['familias', 12],
    ['vendas', 80],
    ['orcamentos', 25],
    ['interacoes', 35],
    ['perdas', 20],
    ['promessas', 15],
  ];

  for (const [chave, minimo] of minimos) {
    it(`${chave}: pelo menos ${minimo}`, () => {
      expect(contagens[chave]).toBeGreaterThanOrEqual(minimo);
    });
  }

  it('produz pelo menos 20 recomendações derivadas', () => {
    expect(recomendacoes.length).toBeGreaterThanOrEqual(20);
  });

  it('produz pelo menos 10 alertas derivados', () => {
    expect(alertas.length).toBeGreaterThanOrEqual(10);
  });
});

describe('recusa estrutural de aplicação técnica', () => {
  it('NENHUM registro de VehicleApplication existe no seed', () => {
    // Ver docs/CRITICAL_REVIEW.md §1.4 e docs/SECURITY.md §6.
    expect(dados.vehicleApplications).toHaveLength(0);
  });

  it('as relações entre produtos ligam FAMÍLIA a FAMÍLIA, nunca produto a produto', () => {
    const idsFamilia = new Set(dados.productFamilies.map((f) => f.id));
    for (const r of dados.productRelations) {
      expect(idsFamilia.has(r.origemFamilyId)).toBe(true);
      expect(idsFamilia.has(r.destinoFamilyId)).toBe(true);
    }
  });

  it('toda relação demonstrativa está marcada como DEMONSTRACAO', () => {
    for (const r of dados.productRelations) {
      expect(r.procedencia).toBe('DEMONSTRACAO');
    }
  });

  it('toda relação traz uma PERGUNTA, não uma instrução de venda', () => {
    for (const r of dados.productRelations) {
      expect(r.perguntaSugerida.trim().length).toBeGreaterThan(10);
      expect(r.perguntaSugerida).toContain('?');
    }
  });
});

describe('privacidade dos dados sintéticos', () => {
  it('todos os clientes estão marcados como demonstração', () => {
    for (const c of dados.customers) expect(c.origem).toBe('DEMONSTRACAO');
  });

  it('nenhum telefone está completo — todos mascarados', () => {
    for (const c of dados.contacts) {
      expect(c.telefoneMascarado).toContain('····');
    }
  });

  it('o modelo não tem campo de CNPJ nem de e-mail', () => {
    const cliente = dados.customers[0] as unknown as Record<string, unknown>;
    expect(cliente.cnpj).toBeUndefined();
    expect(cliente.email).toBeUndefined();
    const contato = dados.contacts[0] as unknown as Record<string, unknown>;
    expect(contato.email).toBeUndefined();
  });

  it('nenhum texto do seed contém padrão de CNPJ', () => {
    const serializado = JSON.stringify(dados);
    expect(serializado).not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
  });
});

describe('integridade referencial', () => {
  const idsClientes = new Set(dados.customers.map((c) => c.id));
  const idsFrotas = new Set(dados.fleets.map((f) => f.id));
  const idsVendas = new Set(dados.sales.map((s) => s.id));
  const idsOrcamentos = new Set(dados.quotes.map((q) => q.id));
  const idsProdutos = new Set(dados.products.map((p) => p.id));
  const idsFamilias = new Set(dados.productFamilies.map((f) => f.id));
  const idsVendedores = new Set(dados.sellers.map((s) => s.id));

  it('toda chave estrangeira aponta para um registro existente', () => {
    for (const c of dados.customers) expect(idsVendedores.has(c.sellerId)).toBe(true);
    for (const c of dados.contacts) expect(idsClientes.has(c.customerId)).toBe(true);
    for (const f of dados.fleets) expect(idsClientes.has(f.customerId)).toBe(true);
    for (const v of dados.vehicles) expect(idsFrotas.has(v.fleetId)).toBe(true);
    for (const p of dados.products) expect(idsFamilias.has(p.familyId)).toBe(true);
    for (const s of dados.sales) expect(idsClientes.has(s.customerId)).toBe(true);
    for (const i of dados.saleItems) {
      expect(idsVendas.has(i.saleId)).toBe(true);
      if (i.productId) expect(idsProdutos.has(i.productId)).toBe(true);
      expect(idsFamilias.has(i.familyId)).toBe(true);
    }
    for (const q of dados.quotes) expect(idsClientes.has(q.customerId)).toBe(true);
    for (const i of dados.quoteItems) expect(idsOrcamentos.has(i.quoteId)).toBe(true);
    for (const i of dados.interactions) expect(idsClientes.has(i.customerId)).toBe(true);
    for (const p of dados.lostSales) {
      expect(idsClientes.has(p.customerId)).toBe(true);
      if (p.familyId) expect(idsFamilias.has(p.familyId)).toBe(true);
    }
    for (const p of dados.promessas) expect(idsClientes.has(p.customerId)).toBe(true);
    for (const t of dados.tasks) {
      if (t.customerId) expect(idsClientes.has(t.customerId)).toBe(true);
    }
  });

  it('toda venda tem pelo menos um item', () => {
    const comItens = new Set(dados.saleItems.map((i) => i.saleId));
    for (const s of dados.sales) expect(comItens.has(s.id)).toBe(true);
  });

  it('nenhum nome de cliente se repete — duas contas iguais parecem defeito de dados', () => {
    const nomes = dados.customers.map((c) => c.nomeFantasia);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('nenhum identificador é duplicado', () => {
    expect(new Set(dados.customers.map((c) => c.id)).size).toBe(dados.customers.length);
    expect(new Set(dados.sales.map((s) => s.id)).size).toBe(dados.sales.length);
    expect(new Set(dados.products.map((p) => p.id)).size).toBe(dados.products.length);
  });
});

describe('determinismo', () => {
  it('duas execuções com a mesma referência produzem dados idênticos', () => {
    const a = gerarDadosDemo(REF);
    const b = gerarDadosDemo(REF);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('cobertura do motor', () => {
  it('a carteira exercita todos os tipos de ação relevantes', () => {
    const tipos = new Set(recomendacoes.map((r) => r.tipo));
    expect(tipos.has('URGENCIA')).toBe(true);
    expect(tipos.has('COMPROMISSO')).toBe(true);
    expect(tipos.has('RECUPERACAO')).toBe(true);
    expect(tipos.has('REPOSICAO')).toBe(true);
    expect(tipos.has('REATIVACAO')).toBe(true);
    expect(tipos.has('EXPANSAO')).toBe(true);
  });

  it('há contas em todas as temperaturas relevantes', () => {
    const temps = new Set(contextos.map((c) => c.cadencia.temperatura));
    expect(temps.has('JANELA') || temps.has('ATRASADO')).toBe(true);
    expect(temps.has('PERDA_PROVAVEL')).toBe(true);
    expect(temps.has('NO_CICLO')).toBe(true);
  });

  it('há contas com lacuna de frota, para exercitar o loop de enriquecimento', () => {
    expect(contextos.some((c) => c.lacunasCriticas.includes('Frota não cadastrada'))).toBe(true);
  });

  it('a carteira do vendedor ATIVO também tem lacunas e variedade de arquétipos', () => {
    // Sem isso, atribuir vendedores por bloco de índice concentraria os arquétipos
    // finais em um vendedor só, e a demonstração padrão ficaria sem lacuna nenhuma.
    const daCarteira = construirTodosContextos(dados, SETTINGS_PADRAO.sellerAtivoId, REF);
    expect(daCarteira.some((c) => c.lacunasCriticas.length > 0)).toBe(true);

    const recsDaCarteira = gerarRecomendacoes(daCarteira, {
      familias: dados.productFamilies,
      settings: SETTINGS_PADRAO,
      feedback: [],
      referencia: REF,
    });
    expect(recsDaCarteira.length).toBeGreaterThanOrEqual(15);
    expect(new Set(recsDaCarteira.map((r) => r.tipo)).size).toBeGreaterThanOrEqual(5);
  });

  it('a carteira se espalha de forma desigual pelas praças — mapa de calor informativo', () => {
    const porCidade = new Map<string, number>();
    for (const c of dados.customers) {
      porCidade.set(c.cidade, (porCidade.get(c.cidade) ?? 0) + 1);
    }
    const contagens = [...porCidade.values()];
    // Se toda cidade tivesse o mesmo número de contas, o mapa de calor não informaria nada.
    expect(new Set(contagens).size).toBeGreaterThan(1);
    expect(Math.max(...contagens)).toBeGreaterThan(Math.min(...contagens) + 1);
  });

  it('o teto de alertas críticos é respeitado mesmo na carteira completa', () => {
    expect(alertas.filter((a) => a.severidade === 'CRITICO').length).toBeLessThanOrEqual(3);
  });

  it('cada conta gera no máximo um alerta', () => {
    const porCliente = new Map<string, number>();
    for (const a of alertas) porCliente.set(a.customerId, (porCliente.get(a.customerId) ?? 0) + 1);
    for (const contagem of porCliente.values()) expect(contagem).toBe(1);
  });
});

describe('conhecimento', () => {
  it('separa conteúdo validado de não validado', () => {
    expect(dados.knowledgeArticles.some((a) => a.validado)).toBe(true);
    expect(dados.knowledgeArticles.some((a) => !a.validado)).toBe(true);
  });

  it('todo playbook tem passos acionáveis', () => {
    for (const p of dados.playbooks) {
      expect(p.passos.length).toBeGreaterThanOrEqual(4);
      for (const passo of p.passos) expect(passo.trim().length).toBeGreaterThan(15);
    }
  });
});
