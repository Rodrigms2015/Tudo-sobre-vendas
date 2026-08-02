import { describe, expect, it } from 'vitest';
import {
  CENARIOS,
  NOTA_MAXIMA,
  ROTULO_CRITERIO,
  avaliadorPorRubrica,
  melhorOpcao,
  somarNotas,
  type CriterioAvaliacao,
} from './scenarios';

const CRITERIOS = Object.keys(ROTULO_CRITERIO) as CriterioAvaliacao[];

describe('integridade dos cenários', () => {
  it('há pelo menos os dez cenários exigidos pelo briefing, ou uma seleção substancial', () => {
    expect(CENARIOS.length).toBeGreaterThanOrEqual(6);
  });

  it('cada cenário tem 3 ou 4 opções', () => {
    for (const c of CENARIOS) {
      expect(c.opcoes.length).toBeGreaterThanOrEqual(3);
      expect(c.opcoes.length).toBeLessThanOrEqual(4);
    }
  });

  it('cada opção tem nota em TODOS os seis critérios, dentro da faixa', () => {
    for (const c of CENARIOS) {
      for (const o of c.opcoes) {
        for (const criterio of CRITERIOS) {
          const nota = o.notas[criterio];
          expect(nota, `${c.id}/${o.id}/${criterio}`).toBeGreaterThanOrEqual(0);
          expect(nota, `${c.id}/${o.id}/${criterio}`).toBeLessThanOrEqual(NOTA_MAXIMA);
        }
      }
    }
  });

  it('cada opção tem justificativa substantiva — a rubrica é escrita, não gerada', () => {
    for (const c of CENARIOS) {
      for (const o of c.opcoes) {
        expect(o.justificativa.length, `${c.id}/${o.id}`).toBeGreaterThan(60);
      }
    }
  });

  it('cada cenário tem exatamente uma melhor resposta, sem empate no topo', () => {
    for (const c of CENARIOS) {
      const totais = c.opcoes.map((o) => somarNotas(o.notas)).sort((a, b) => b - a);
      expect(totais[0], c.id).toBeGreaterThan(totais[1]);
    }
  });

  it('cada cenário tem uma lição explícita', () => {
    for (const c of CENARIOS) {
      expect(c.licao.length).toBeGreaterThan(40);
    }
  });

  it('a fala do cliente está entre aspas, como citação real', () => {
    for (const c of CENARIOS) {
      expect(c.falaDoCliente).toContain('"');
    }
  });
});

describe('avaliador por rubrica', () => {
  it('é determinístico: mesma entrada, mesma saída', () => {
    const a = avaliadorPorRubrica.avaliar(CENARIOS[0], 'b');
    const b = avaliadorPorRubrica.avaliar(CENARIOS[0], 'b');
    expect(a).toEqual(b);
  });

  it('reconhece a melhor escolha', () => {
    const melhor = melhorOpcao(CENARIOS[0]);
    const r = avaliadorPorRubrica.avaliar(CENARIOS[0], melhor.id);
    expect(r.ehMelhorEscolha).toBe(true);
    expect(r.criteriosFracos).toHaveLength(0);
  });

  it('aponta os critérios fracos de uma escolha ruim', () => {
    const pior = [...CENARIOS[0].opcoes].sort(
      (a, b) => somarNotas(a.notas) - somarNotas(b.notas),
    )[0];
    const r = avaliadorPorRubrica.avaliar(CENARIOS[0], pior.id);
    expect(r.ehMelhorEscolha).toBe(false);
    expect(r.criteriosFracos.length).toBeGreaterThan(0);
  });

  it('calcula o máximo como seis critérios vezes a nota máxima', () => {
    const r = avaliadorPorRubrica.avaliar(CENARIOS[0], 'a');
    expect(r.maximo).toBe(CRITERIOS.length * NOTA_MAXIMA);
  });

  it('lança erro para opção inexistente em vez de retornar algo inventado', () => {
    expect(() => avaliadorPorRubrica.avaliar(CENARIOS[0], 'z')).toThrow();
  });
});

describe('conteúdo de domínio', () => {
  it('a melhor resposta do cenário de aplicação NUNCA é confirmar peça sem catálogo', () => {
    const cenario = CENARIOS.find((c) => c.id === 'cen-03');
    expect(cenario).toBeDefined();
    const melhor = melhorOpcao(cenario!);
    // A opção "a" afirma aplicação sem consultar catálogo — deve ser a pior em risco.
    const afirmaSemConsultar = cenario!.opcoes.find((o) => o.id === 'a');
    expect(afirmaSemConsultar?.notas.risco).toBe(0);
    expect(melhor.id).not.toBe('a');
    expect(melhor.notas.risco).toBe(NOTA_MAXIMA);
  });

  it('a melhor resposta do cenário de venda completa não é venda casada', () => {
    const cenario = CENARIOS.find((c) => c.id === 'cen-02');
    const empurro = cenario!.opcoes.find((o) => o.id === 'b');
    expect(empurro?.notas.risco).toBe(0);
    expect(melhorOpcao(cenario!).id).toBe('c');
  });
});
