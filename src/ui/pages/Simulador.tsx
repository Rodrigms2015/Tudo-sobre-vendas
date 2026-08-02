/**
 * Simulador de Cenários.
 *
 * A tela DIZ que isto não é inteligência artificial. Fingir seria desnecessário e caro:
 * uma rubrica explícita é discutível pelo vendedor, o que um modelo opaco não é.
 */

import { useMemo, useState } from 'react';
import {
  CENARIOS,
  DESCRICAO_CRITERIO,
  NOTA_MAXIMA,
  ROTULO_CRITERIO,
  avaliadorPorRubrica,
  type CriterioAvaliacao,
} from '../../domain/content/scenarios';
import { Aviso, Card, Rotulo, TituloSecao } from '../components/primitives';

const CRITERIOS = Object.keys(ROTULO_CRITERIO) as CriterioAvaliacao[];

export function Simulador() {
  const [indice, setIndice] = useState(0);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [historico, setHistorico] = useState<{ cenarioId: string; total: number; maximo: number }[]>(
    [],
  );

  const cenario = CENARIOS[indice];
  const resultado = useMemo(
    () => (escolha ? avaliadorPorRubrica.avaliar(cenario, escolha) : null),
    [cenario, escolha],
  );

  const mediaHistorico =
    historico.length > 0
      ? Math.round(
          (historico.reduce((s, h) => s + h.total, 0) /
            historico.reduce((s, h) => s + h.maximo, 0)) *
            100,
        )
      : null;

  function avancar() {
    if (resultado) {
      setHistorico((h) => [
        ...h.filter((x) => x.cenarioId !== cenario.id),
        { cenarioId: cenario.id, total: resultado.total, maximo: resultado.maximo },
      ]);
    }
    setEscolha(null);
    setIndice((i) => (i + 1) % CENARIOS.length);
  }

  return (
    <div className="space-y-4">
      <TituloSecao descricao="Cenários reais de abordagem e objeção, com avaliação por seis critérios.">
        Simulador de Cenários
      </TituloSecao>

      <Aviso titulo="Isto não é inteligência artificial">
        A avaliação vem de uma rubrica escrita à mão por conhecimento de domínio: cada resposta tem
        nota de 0 a 3 em seis critérios, e cada nota tem justificativa. Você pode discordar dela com
        argumentos — o que um modelo opaco não permitiria.
      </Aviso>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="rotulo">
          Cenário {indice + 1} de {CENARIOS.length}
        </p>
        {mediaHistorico !== null && (
          <p className="text-sm text-bruto-ash tabular">
            Aproveitamento nos {historico.length} cenários respondidos: {mediaHistorico}%
          </p>
        )}
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-bold">{cenario.titulo}</h2>
        <p className="text-sm text-bruto-ash mt-1">{cenario.situacao}</p>

        <blockquote className="mt-3 border-l-2 border-bruto-yellow pl-3 text-[15px]">
          {cenario.falaDoCliente}
        </blockquote>

        <p className="text-xs text-bruto-ash mt-3">
          <span className="rotulo">Contexto: </span>
          {cenario.contexto}
        </p>
      </Card>

      <Card className="p-4">
        <TituloSecao>O que você responde?</TituloSecao>
        <ul className="space-y-2">
          {cenario.opcoes.map((o) => {
            const selecionada = escolha === o.id;
            return (
              <li key={o.id}>
                <button
                  onClick={() => setEscolha(o.id)}
                  disabled={escolha !== null}
                  aria-pressed={selecionada}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selecionada
                      ? 'border-bruto-yellow bg-bruto-yellow/5'
                      : escolha !== null
                        ? 'border-bruto-steel opacity-50'
                        : 'border-bruto-steel hover:border-bruto-ash'
                  }`}
                >
                  <span className="text-sm">{o.texto}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {resultado && (
        <>
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <TituloSecao>Avaliação da sua resposta</TituloSecao>
              <div className="text-right">
                <div className="tabular text-2xl font-bold leading-none">
                  {resultado.total}
                  <span className="text-bruto-ash text-base">/{resultado.maximo}</span>
                </div>
                {resultado.ehMelhorEscolha && (
                  <p className="text-[10px] uppercase tracking-wide text-bruto-green mt-1">
                    melhor resposta
                  </p>
                )}
              </div>
            </div>

            <ul className="space-y-2 mt-2">
              {CRITERIOS.map((c) => {
                const nota = resultado.notas[c];
                const fraco = resultado.criteriosFracos.includes(c);
                return (
                  <li key={c}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm w-32 shrink-0">{ROTULO_CRITERIO[c]}</span>
                      <div className="flex-1 h-2 rounded-full bg-bruto-steel overflow-hidden">
                        <div
                          className={`h-full rounded-full ${fraco ? 'bg-bruto-red' : nota === NOTA_MAXIMA ? 'bg-bruto-green' : 'bg-bruto-yellow'}`}
                          style={{ width: `${(nota / NOTA_MAXIMA) * 100}%` }}
                        />
                      </div>
                      <span className="tabular text-sm w-8 text-right">
                        {nota}/{NOTA_MAXIMA}
                      </span>
                    </div>
                    <p className="text-[11px] text-bruto-ash ml-[8.75rem]">
                      {DESCRICAO_CRITERIO[c]}
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 border-t border-bruto-steel pt-3">
              <Rotulo>Por que essas notas</Rotulo>
              <p className="text-sm mt-1">{resultado.justificativa}</p>
            </div>
          </Card>

          {!resultado.ehMelhorEscolha && (
            <Card className="p-4 border-bruto-green/40">
              <Rotulo>Resposta de melhor pontuação</Rotulo>
              <p className="text-sm mt-1 font-medium">{resultado.melhorOpcao.texto}</p>
              <p className="text-sm text-bruto-ash mt-2">{resultado.melhorOpcao.justificativa}</p>
            </Card>
          )}

          <Card className="p-4">
            <Rotulo>O princípio deste cenário</Rotulo>
            <p className="text-sm mt-1">{cenario.licao}</p>
          </Card>

          <div className="flex gap-2">
            <button className="btn-primario flex-1" onClick={avancar}>
              Próximo cenário
            </button>
            <button className="btn-secundario" onClick={() => setEscolha(null)}>
              Tentar de novo
            </button>
          </div>
        </>
      )}

      {!resultado && (
        <div className="flex gap-2">
          <button
            className="btn-secundario flex-1"
            onClick={() => setIndice((i) => (i - 1 + CENARIOS.length) % CENARIOS.length)}
          >
            Cenário anterior
          </button>
          <button
            className="btn-secundario flex-1"
            onClick={() => setIndice((i) => (i + 1) % CENARIOS.length)}
          >
            Pular
          </button>
        </div>
      )}
    </div>
  );
}
