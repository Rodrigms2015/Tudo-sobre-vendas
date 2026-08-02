/**
 * Testes de persistência sobre `fake-indexeddb` e de round-trip de backup.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  apagarBanco,
  carregarConfiguracoes,
  carregarDataset,
  limparDemonstracao,
  resetarInstancia,
  salvarConfiguracoes,
  salvarDataset,
} from './db';
import { lerBackup, montarBackup, serializarBackup } from './exporter';
import { SETTINGS_PADRAO } from '../domain/types';
import { gerarDadosDemo } from '../domain/seed';
import { cliente, dataset, vendasRegulares } from '../test/fixtures';

const REF = '2026-06-01';

beforeEach(() => {
  // Banco novo por teste, para isolamento total.
  globalThis.indexedDB = new IDBFactory();
  resetarInstancia();
});

afterEach(() => {
  resetarInstancia();
});

describe('persistência', () => {
  it('grava e lê o dataset completo', async () => {
    const demo = gerarDadosDemo(REF);
    await salvarDataset(demo);
    const lido = await carregarDataset();
    expect(lido.customers).toHaveLength(demo.customers.length);
    expect(lido.sales).toHaveLength(demo.sales.length);
    expect(lido.productFamilies).toHaveLength(demo.productFamilies.length);
  });

  it('substitui o conteúdo em vez de acumular ao salvar de novo', async () => {
    await salvarDataset(gerarDadosDemo(REF));
    await salvarDataset(gerarDadosDemo(REF));
    const lido = await carregarDataset();
    expect(lido.customers).toHaveLength(gerarDadosDemo(REF).customers.length);
  });

  it('retorna dataset vazio quando o banco está limpo', async () => {
    const lido = await carregarDataset();
    expect(lido.customers).toHaveLength(0);
  });

  it('grava e lê configurações', async () => {
    await salvarConfiguracoes({ ...SETTINGS_PADRAO, metaExecucaoDiaria: 15 });
    const lido = await carregarConfiguracoes();
    expect(lido.metaExecucaoDiaria).toBe(15);
  });

  it('mescla configuração salva com o padrão, para não quebrar bases antigas', async () => {
    // Simula uma base gravada antes de uma chave de configuração existir.
    await salvarConfiguracoes({ id: 'settings', metaExecucaoDiaria: 5 } as never);
    const lido = await carregarConfiguracoes();
    expect(lido.metaExecucaoDiaria).toBe(5);
    expect(lido.pesos).toEqual(SETTINGS_PADRAO.pesos);
    expect(lido.janelaSilencioDias).toBe(SETTINGS_PADRAO.janelaSilencioDias);
  });

  it('apaga o banco por completo', async () => {
    await salvarDataset(gerarDadosDemo(REF));
    await apagarBanco();
    const lido = await carregarDataset();
    expect(lido.customers).toHaveLength(0);
  });
});

describe('limpeza seletiva de demonstração', () => {
  it('remove os registros de demonstração e PRESERVA os importados', async () => {
    const { vendas, itens } = vendasRegulares('cli-demo', 60, 4, 30);
    const importadas = vendasRegulares('cli-real', 60, 4, 30);
    const dados = dataset({
      customers: [
        cliente({ id: 'cli-demo', origem: 'DEMONSTRACAO' }),
        cliente({ id: 'cli-real', nomeFantasia: 'Importado', origem: 'IMPORTADO' }),
      ],
      sales: [...vendas, ...importadas.vendas],
      saleItems: [...itens, ...importadas.itens],
    });
    await salvarDataset(dados);

    const limpo = await limparDemonstracao(dados);

    expect(limpo.customers).toHaveLength(1);
    expect(limpo.customers[0].id).toBe('cli-real');
    // As vendas do cliente removido também saíram — sem registros órfãos.
    expect(limpo.sales.every((s) => s.customerId === 'cli-real')).toBe(true);
    expect(limpo.sales.length).toBe(importadas.vendas.length);
    const idsVendas = new Set(limpo.sales.map((s) => s.id));
    expect(limpo.saleItems.every((i) => idsVendas.has(i.saleId))).toBe(true);
  });
});

describe('backup', () => {
  it('faz round-trip preservando os dados', () => {
    const demo = gerarDadosDemo(REF);
    const resultado = lerBackup(serializarBackup(demo));
    expect(resultado.ok).toBe(true);
    expect(resultado.dados?.customers).toHaveLength(demo.customers.length);
  });

  it('carrega versão e data de exportação', () => {
    const backup = montarBackup(gerarDadosDemo(REF));
    expect(backup.produto).toBe('BRUTO OS');
    expect(backup.versao).toBe(1);
    expect(backup.exportadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejeita JSON inválido com mensagem legível', () => {
    const r = lerBackup('{ isso não é json');
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('JSON');
  });

  it('rejeita backup de outro produto', () => {
    const r = lerBackup(JSON.stringify({ produto: 'OutroCRM', versao: 1, dados: {} }));
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('BRUTO OS');
  });

  it('rejeita versão futura em vez de tentar interpretar', () => {
    const r = lerBackup(
      JSON.stringify({ produto: 'BRUTO OS', versao: 99, dados: { customers: [] } }),
    );
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('99');
  });

  it('rejeita backup sem a lista de clientes', () => {
    const r = lerBackup(JSON.stringify({ produto: 'BRUTO OS', versao: 1, dados: {} }));
    expect(r.ok).toBe(false);
  });

  it('rejeita null sem lançar exceção', () => {
    expect(lerBackup('null').ok).toBe(false);
  });
});
