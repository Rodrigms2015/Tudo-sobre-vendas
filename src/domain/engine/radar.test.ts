import { describe, expect, it } from 'vitest';
import { radarDaConta, radarPorFamilia, situacaoJanela } from './radar';
import { construirContexto, construirIndices } from './context';
import { FAMILIAS } from '../seed/catalog';
import { diasEntre } from '../dates';
import { REF, cliente, dataset, frota, vendasRegulares } from '../../test/fixtures';

function contextoDe(parcial: Parameters<typeof dataset>[0]) {
  const dados = dataset({ customers: [cliente()], fleets: [frota()], ...parcial });
  return construirContexto(dados.customers[0], construirIndices(dados), REF);
}

describe('regra dura: sem base, sem janela', () => {
  it('não exibe janela com menos de 4 compras', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 3, 40);
    const sinal = radarDaConta(contextoDe({ sales: vendas, saleItems: itens }));
    expect(sinal.evidencia).toBe('SEM_BASE');
    expect(sinal.janelaInicio).toBeNull();
    expect(sinal.janelaFim).toBeNull();
  });

  it('em vez da janela, entrega a lacuna e a pergunta que cria a base', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 2, 40);
    const sinal = radarDaConta(contextoDe({ sales: vendas, saleItems: itens }));
    expect(sinal.lacunas.length).toBeGreaterThan(0);
    expect(sinal.lacunas[0]).toMatch(/4 para calcular/);
    expect(sinal.proximaPergunta).toBeTruthy();
  });

  it('lida com histórico completamente vazio', () => {
    const sinal = radarDaConta(contextoDe({}));
    expect(sinal.janelaInicio).toBeNull();
    expect(sinal.intervalosObservados).toBe(0);
  });
});

describe('largura da janela por nível de evidência', () => {
  it('produz janela estreita com base razoável', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 40);
    const sinal = radarDaConta(contextoDe({ sales: vendas, saleItems: itens }));
    expect(sinal.evidencia).toBe('BASE_RAZOAVEL');
    expect(sinal.janelaInicio).not.toBeNull();
    const largura = diasEntre(sinal.janelaInicio as string, sinal.janelaFim as string);
    // ±15% de 60 dias = 18 dias de largura.
    expect(largura).toBe(18);
  });

  it('alarga a janela quando a base é fraca — janela larga é honesta', () => {
    // Exatamente 3 intervalos regulares: BASE_FRACA por contagem.
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 4, 40);
    const sinal = radarDaConta(contextoDe({ sales: vendas, saleItems: itens }));
    expect(sinal.evidencia).toBe('BASE_FRACA');
    const largura = diasEntre(sinal.janelaInicio as string, sinal.janelaFim as string);
    // ±30% de 60 dias = 36 dias.
    expect(largura).toBe(36);
  });

  it('registra o número de intervalos observados, para o vendedor julgar', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 40);
    const sinal = radarDaConta(contextoDe({ sales: vendas, saleItems: itens }));
    expect(sinal.intervalosObservados).toBe(5);
    expect(sinal.fatores.some((f) => f.evidencia.includes('5 intervalos'))).toBe(true);
  });
});

describe('situação da janela', () => {
  it('classifica corretamente futura, aberta e vencida', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 57);
    const sinal = radarDaConta(contextoDe({ sales: vendas, saleItems: itens }));
    expect(situacaoJanela(sinal, REF)).toBe('ABERTA');
    expect(situacaoJanela(sinal, '2020-01-01')).toBe('FUTURA');
    expect(situacaoJanela(sinal, '2030-01-01')).toBe('VENCIDA');
  });

  it('retorna SEM_BASE quando não há janela', () => {
    const sinal = radarDaConta(contextoDe({}));
    expect(situacaoJanela(sinal, REF)).toBe('SEM_BASE');
  });
});

describe('radar por família', () => {
  it('produz um sinal por família comprada', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 40);
    const sinais = radarPorFamilia(contextoDe({ sales: vendas, saleItems: itens }), FAMILIAS, REF);
    expect(sinais).toHaveLength(1);
    expect(sinais[0].familyId).toBe('fam-01');
  });

  it('não inventa sinal para família nunca comprada', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 40);
    const sinais = radarPorFamilia(contextoDe({ sales: vendas, saleItems: itens }), FAMILIAS, REF);
    expect(sinais.every((s) => s.familyId === 'fam-01')).toBe(true);
  });
});

describe('o radar não usa dados que não existem', () => {
  it('a janela depende exclusivamente dos intervalos, não da frota nem da idade', () => {
    const { vendas, itens } = vendasRegulares('cli-t01', 60, 6, 40);
    const comFrotaGrande = radarDaConta(
      contextoDe({
        sales: vendas,
        saleItems: itens,
        fleets: [frota({ totalVeiculos: 500, idadeMediaAnos: 20 })],
      }),
    );
    const semFrota = radarDaConta(
      contextoDe({
        sales: vendas,
        saleItems: itens,
        fleets: [frota({ totalVeiculos: null, idadeMediaAnos: null, procedencia: 'AUSENTE' })],
      }),
    );
    expect(comFrotaGrande.janelaInicio).toBe(semFrota.janelaInicio);
    expect(comFrotaGrande.janelaFim).toBe(semFrota.janelaFim);
  });
});
