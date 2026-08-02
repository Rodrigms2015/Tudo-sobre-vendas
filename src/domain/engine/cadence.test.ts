import { describe, expect, it } from 'vitest';
import {
  calcularCadenciaDeDatas,
  classificarTemperatura,
  desvioPadrao,
  intervalosEntreDatas,
  mediana,
  nivelEvidencia,
} from './cadence';
import { somarDias } from '../dates';

const REF = '2026-06-01';

/** Gera datas de compra terminando em `diasAtras` antes da referência. */
function datasComIntervalo(intervalo: number, quantidade: number, diasAtras: number): string[] {
  const datas: string[] = [];
  let cursor = somarDias(REF, -diasAtras);
  for (let i = 0; i < quantidade; i++) {
    datas.push(cursor);
    cursor = somarDias(cursor, -intervalo);
  }
  return datas.reverse();
}

describe('mediana', () => {
  it('retorna null para lista vazia', () => {
    expect(mediana([])).toBeNull();
  });

  it('calcula a mediana de lista ímpar', () => {
    expect(mediana([10, 30, 20])).toBe(20);
  });

  it('calcula a mediana de lista par', () => {
    expect(mediana([10, 20, 30, 40])).toBe(25);
  });

  it('absorve compra atípica que destruiria a média', () => {
    // Um pedido de reforma de frota com intervalo de 400 dias entre compras de 30.
    const intervalos = [30, 30, 30, 400, 30];
    expect(mediana(intervalos)).toBe(30);
    const media = intervalos.reduce((s, v) => s + v, 0) / intervalos.length;
    expect(media).toBeGreaterThan(100);
  });
});

describe('desvioPadrao', () => {
  it('retorna null com menos de dois valores', () => {
    expect(desvioPadrao([])).toBeNull();
    expect(desvioPadrao([5])).toBeNull();
  });

  it('retorna zero para valores idênticos', () => {
    expect(desvioPadrao([10, 10, 10])).toBe(0);
  });
});

describe('intervalosEntreDatas', () => {
  it('produz n-1 intervalos', () => {
    const datas = ['2026-01-01', '2026-02-01', '2026-03-01'];
    expect(intervalosEntreDatas(datas)).toHaveLength(2);
  });

  it('ignora duas compras no mesmo dia (pedido dividido, não ciclo)', () => {
    const datas = ['2026-01-01', '2026-01-01', '2026-02-01'];
    expect(intervalosEntreDatas(datas)).toEqual([31]);
  });

  it('ordena antes de calcular', () => {
    expect(intervalosEntreDatas(['2026-03-01', '2026-01-01', '2026-02-01'])).toEqual([31, 28]);
  });
});

describe('nivelEvidencia', () => {
  it('exige pelo menos 3 intervalos para haver qualquer base', () => {
    expect(nivelEvidencia([30, 30], 0.1)).toBe('SEM_BASE');
    expect(nivelEvidencia([30, 30, 30], 0.1)).toBe('BASE_FRACA');
  });

  it('exige 4 intervalos e regularidade para base razoável', () => {
    expect(nivelEvidencia([30, 30, 30, 30], 0.05)).toBe('BASE_RAZOAVEL');
  });

  it('nunca passa de base fraca quando o cliente é irregular, mesmo com muito volume', () => {
    const muitosIntervalos = Array(20).fill(30);
    expect(nivelEvidencia(muitosIntervalos, 0.9)).toBe('BASE_FRACA');
  });
});

describe('classificarTemperatura', () => {
  it('força SEM_BASE quando não há evidência, ignorando o atraso', () => {
    expect(classificarTemperatura('SEM_BASE', 5)).toBe('SEM_BASE');
  });

  it('aplica os limiares 0.8 / 1.2 / 2.0', () => {
    expect(classificarTemperatura('BASE_RAZOAVEL', 0.79)).toBe('NO_CICLO');
    expect(classificarTemperatura('BASE_RAZOAVEL', 0.8)).toBe('JANELA');
    expect(classificarTemperatura('BASE_RAZOAVEL', 1.19)).toBe('JANELA');
    expect(classificarTemperatura('BASE_RAZOAVEL', 1.2)).toBe('ATRASADO');
    expect(classificarTemperatura('BASE_RAZOAVEL', 1.99)).toBe('ATRASADO');
    expect(classificarTemperatura('BASE_RAZOAVEL', 2.0)).toBe('PERDA_PROVAVEL');
  });
});

describe('cadência relativa — a correção central do briefing', () => {
  it('trata 40 dias como NORMAL para quem compra a cada 90', () => {
    const cadencia = calcularCadenciaDeDatas(datasComIntervalo(90, 6, 40), REF);
    expect(cadencia.temperatura).toBe('NO_CICLO');
    expect(cadencia.diasDesdeUltimaCompra).toBe(40);
  });

  it('trata os MESMOS 40 dias como perda provável para quem compra a cada 7', () => {
    const cadencia = calcularCadenciaDeDatas(datasComIntervalo(7, 8, 40), REF);
    expect(cadencia.temperatura).toBe('PERDA_PROVAVEL');
    expect(cadencia.diasDesdeUltimaCompra).toBe(40);
  });

  it('não calcula temperatura com menos de 4 compras', () => {
    const cadencia = calcularCadenciaDeDatas(datasComIntervalo(30, 3, 60), REF);
    expect(cadencia.evidencia).toBe('SEM_BASE');
    expect(cadencia.temperatura).toBe('SEM_BASE');
  });

  it('identifica a janela de recompra', () => {
    const cadencia = calcularCadenciaDeDatas(datasComIntervalo(60, 6, 57), REF);
    expect(cadencia.temperatura).toBe('JANELA');
    expect(cadencia.intervaloMedianoDias).toBe(60);
  });

  it('lida com histórico vazio sem quebrar', () => {
    const cadencia = calcularCadenciaDeDatas([], REF);
    expect(cadencia.evidencia).toBe('SEM_BASE');
    expect(cadencia.ultimaCompra).toBeNull();
    expect(cadencia.atrasoRelativo).toBeNull();
  });
});
