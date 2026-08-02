/**
 * Centro de Conhecimento.
 *
 * REGRA INEGOCIÁVEL: conteúdo validado e não validado NUNCA aparecem na mesma lista.
 * São seções fisicamente separadas, com rótulo explícito. Ver PROMPT_MASTER §6.11.
 */

import { useMemo, useState } from 'react';
import { useApp } from '../../state/store';
import { Aviso, Card, EstadoVazio, Rotulo, TituloSecao } from '../components/primitives';
import type { CategoriaConhecimento } from '../../domain/types';

const ROTULO_CATEGORIA: Record<CategoriaConhecimento, string> = {
  FAMILIA: 'Famílias',
  SISTEMA: 'Sistemas',
  DIAGNOSTICO: 'Diagnóstico',
  OBJECAO: 'Objeções',
  SCRIPT: 'Scripts',
  BOA_PRATICA: 'Boas práticas',
  GLOSSARIO: 'Glossário',
  PROCEDIMENTO: 'Procedimentos',
};

export function Conhecimento() {
  const { dados } = useApp();
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<CategoriaConhecimento | ''>('');
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const termo = busca.trim().toLowerCase();

  const casa = (texto: string) => texto.toLowerCase().includes(termo);

  const artigos = useMemo(
    () =>
      dados.knowledgeArticles.filter((a) => {
        if (categoria && a.categoria !== categoria) return false;
        if (!termo) return true;
        return casa(a.titulo) || casa(a.conteudo) || a.tags.some(casa);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados.knowledgeArticles, categoria, termo],
  );

  const playbooks = useMemo(
    () =>
      dados.playbooks.filter((p) => {
        if (!termo) return true;
        return casa(p.titulo) || casa(p.contexto) || p.passos.some(casa) || p.tags.some(casa);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados.playbooks, termo],
  );

  const validados = artigos.filter((a) => a.validado);
  const naoValidados = artigos.filter((a) => !a.validado);
  const categorias = [...new Set(dados.knowledgeArticles.map((a) => a.categoria))];

  const nada = artigos.length === 0 && playbooks.length === 0;

  return (
    <div className="space-y-4">
      <TituloSecao descricao="Conhecimento comercial: o que perguntar, como abordar, como tratar objeção.">
        Centro de Conhecimento
      </TituloSecao>

      <Aviso titulo="Conteúdo comercial, não catálogo técnico">
        Nenhum artigo aqui afirma aplicação de peça em veículo. Aplicação exige catálogo validado com
        fonte rastreável. Conteúdo validado e não validado aparecem em seções separadas, sempre.
      </Aviso>

      <Card className="p-3 space-y-3">
        <label htmlFor="busca-conhecimento" className="sr-only">
          Buscar no conhecimento
        </label>
        <input
          id="busca-conhecimento"
          className="campo"
          placeholder="Buscar por título, conteúdo ou tag"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoria('')}
            aria-pressed={categoria === ''}
            className={`shrink-0 rounded-lg px-3 min-h-[38px] text-xs font-semibold ${
              categoria === ''
                ? 'bg-bruto-yellow text-bruto-black'
                : 'border border-bruto-steel text-bruto-ash'
            }`}
          >
            Tudo
          </button>
          {categorias.map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              aria-pressed={categoria === c}
              className={`shrink-0 rounded-lg px-3 min-h-[38px] text-xs font-semibold ${
                categoria === c
                  ? 'bg-bruto-yellow text-bruto-black'
                  : 'border border-bruto-steel text-bruto-ash'
              }`}
            >
              {ROTULO_CATEGORIA[c]}
            </button>
          ))}
        </div>
        <p className="text-xs text-bruto-ash tabular" aria-live="polite">
          {artigos.length} artigo(s) · {playbooks.length} playbook(s)
        </p>
      </Card>

      {nada && (
        <EstadoVazio
          titulo="Nada encontrado"
          descricao="Ajuste a busca ou limpe o filtro de categoria."
          acao={
            <button
              className="btn-secundario"
              onClick={() => {
                setBusca('');
                setCategoria('');
              }}
            >
              Limpar busca
            </button>
          }
        />
      )}

      {playbooks.length > 0 && (
        <section>
          <TituloSecao descricao="Roteiros passo a passo por situação comercial.">
            Playbooks
          </TituloSecao>
          <div className="space-y-2">
            {playbooks.map((p) => (
              <Card key={p.id} className="p-4">
                <button
                  className="w-full text-left"
                  onClick={() => setAbertoId((v) => (v === p.id ? null : p.id))}
                  aria-expanded={abertoId === p.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{p.titulo}</h3>
                      <p className="text-sm text-bruto-ash mt-0.5">{p.contexto}</p>
                    </div>
                    <span className="text-bruto-ash shrink-0" aria-hidden="true">
                      {abertoId === p.id ? '−' : '+'}
                    </span>
                  </div>
                </button>
                {abertoId === p.id && (
                  <ol className="mt-3 space-y-1.5 list-decimal list-inside border-t border-bruto-steel pt-3">
                    {p.passos.map((passo) => (
                      <li key={passo} className="text-sm">
                        {passo}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] uppercase tracking-wide text-bruto-ash border border-bruto-steel rounded px-1.5 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {validados.length > 0 && (
        <section>
          <TituloSecao descricao="Conferido contra a fonte e aprovado para uso operacional.">
            Conteúdo validado
          </TituloSecao>
          <div className="space-y-2">
            {validados.map((a) => (
              <ArtigoCard
                key={a.id}
                artigo={a}
                aberto={abertoId === a.id}
                aoAlternar={() => setAbertoId((v) => (v === a.id ? null : a.id))}
              />
            ))}
          </div>
        </section>
      )}

      {naoValidados.length > 0 && (
        <section>
          <TituloSecao descricao="Ainda não conferido contra a fonte. Não use como verdade operacional.">
            Conteúdo não validado
          </TituloSecao>
          <div className="space-y-2">
            {naoValidados.map((a) => (
              <div key={a.id} className="border-l-2 border-bruto-amber pl-2">
                <ArtigoCard
                  artigo={a}
                  aberto={abertoId === a.id}
                  aoAlternar={() => setAbertoId((v) => (v === a.id ? null : a.id))}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ArtigoCard({
  artigo,
  aberto,
  aoAlternar,
}: {
  artigo: { id: string; titulo: string; categoria: CategoriaConhecimento; conteudo: string; validado: boolean; tags: string[] };
  aberto: boolean;
  aoAlternar: () => void;
}) {
  return (
    <Card className="p-4">
      <button className="w-full text-left" onClick={aoAlternar} aria-expanded={aberto}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Rotulo>{ROTULO_CATEGORIA[artigo.categoria]}</Rotulo>
            <h3 className="font-semibold mt-0.5">{artigo.titulo}</h3>
          </div>
          <span className="text-bruto-ash shrink-0" aria-hidden="true">
            {aberto ? '−' : '+'}
          </span>
        </div>
      </button>
      {aberto && (
        <div className="mt-3 border-t border-bruto-steel pt-3">
          {artigo.conteudo.split('\n\n').map((paragrafo, i) => (
            <p key={i} className="text-sm mb-2 last:mb-0 whitespace-pre-line">
              {paragrafo}
            </p>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {artigo.tags.map((t) => (
          <span
            key={t}
            className="text-[10px] uppercase tracking-wide text-bruto-ash border border-bruto-steel rounded px-1.5 py-0.5"
          >
            {t}
          </span>
        ))}
      </div>
    </Card>
  );
}
