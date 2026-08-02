/**
 * Fila completa de Next Best Action, com o modo "Recuperar orçamento" como lente.
 */

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../state/store';
import { CardAcao } from '../components/CardAcao';
import { Card, EstadoVazio, Rotulo, TituloSecao } from '../components/primitives';
import { MOTIVOS_PERDA, PRECEDENCIA_TIPO, ROTULO_TIPO_ACAO, type TipoAcao } from '../../domain/types';
import { diasEntre, formatarData, formatarMoeda, hoje } from '../../domain/dates';

const TIPOS: TipoAcao[] = (Object.keys(PRECEDENCIA_TIPO) as TipoAcao[]).sort(
  (a, b) => PRECEDENCIA_TIPO[a] - PRECEDENCIA_TIPO[b],
);

export function Acoes() {
  const { recomendacoes, contextos, contextoPorCliente, temDados } = useApp();
  const [params] = useSearchParams();
  const modo = params.get('modo');
  const referencia = useMemo(() => hoje(), []);
  const [filtroTipo, setFiltroTipo] = useState<TipoAcao | ''>('');

  const orcamentosEmRisco = useMemo(() => {
    return contextos
      .flatMap((ctx) =>
        ctx.orcamentosAbertos.map((q) => {
          const diasParado = diasEntre(q.data, referencia);
          const ultimaInteracao = [...ctx.interacoes]
            .filter((i) => i.data >= q.data)
            .sort((a, b) => b.data.localeCompare(a.data))[0];
          const perdaMaisComum = [...ctx.perdas].sort((a, b) => b.data.localeCompare(a.data))[0];
          return {
            quote: q,
            cliente: ctx.customer,
            diasParado,
            ultimaInteracao: ultimaInteracao?.resumo ?? null,
            motivoProvavel: perdaMaisComum
              ? `Histórico desta conta indica ${(
                  MOTIVOS_PERDA.find((m) => m.valor === perdaMaisComum.motivo)?.rotulo ??
                  perdaMaisComum.motivo
                ).toLowerCase()}`
              : 'Sem histórico de perda nesta conta — investigar sem hipótese prévia',
            risco: diasParado * Math.log10(1 + q.valorTotal),
          };
        }),
      )
      .sort((a, b) => b.risco - a.risco);
  }, [contextos, referencia]);

  const filtradas = filtroTipo ? recomendacoes.filter((r) => r.tipo === filtroTipo) : recomendacoes;

  const contagemPorTipo = useMemo(() => {
    const mapa = new Map<TipoAcao, number>();
    for (const r of recomendacoes) mapa.set(r.tipo, (mapa.get(r.tipo) ?? 0) + 1);
    return mapa;
  }, [recomendacoes]);

  if (!temDados) {
    return (
      <EstadoVazio
        titulo="Nenhuma carteira carregada"
        descricao="Carregue a demonstração ou importe sua base para gerar a fila de ações."
        acao={
          <Link to="/app/dados" className="btn-primario">
            Ir para Dados
          </Link>
        }
      />
    );
  }

  if (modo === 'recuperar-orcamento') {
    return (
      <div className="space-y-4">
        <div>
          <Link to="/app/cockpit" className="text-xs text-bruto-ash hover:text-bruto-yellow">
            ← Cockpit
          </Link>
          <TituloSecao descricao="Ordenados por valor e tempo parado. Todo orçamento precisa sair daqui com um desfecho.">
            Modo: Recuperar orçamento
          </TituloSecao>
        </div>

        {orcamentosEmRisco.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum orçamento aberto"
            descricao="Toda proposta emitida já tem desfecho registrado. Esse é o estado que se quer manter."
          />
        ) : (
          <ul className="space-y-3">
            {orcamentosEmRisco.map((o) => (
              <li key={o.quote.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Link
                        to={`/app/cliente/${o.cliente.id}`}
                        className="font-semibold hover:text-bruto-yellow"
                      >
                        {o.cliente.nomeFantasia}
                      </Link>
                      <p className="text-xs text-bruto-ash">
                        {o.cliente.cidade}/{o.cliente.uf} · emitido em{' '}
                        {formatarData(o.quote.data)} · validade {o.quote.validadeDias} dias
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="tabular text-xl font-bold leading-none">
                        {formatarMoeda(o.quote.valorTotal)}
                      </div>
                      <div className="text-[10px] text-bruto-ash uppercase">
                        parado há {o.diasParado} dias
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div>
                      <Rotulo>Última interação</Rotulo>
                      <p className="text-sm mt-0.5">
                        {o.ultimaInteracao ?? 'Nenhuma interação após o envio da proposta.'}
                      </p>
                    </div>
                    <div>
                      <Rotulo>Motivo provável</Rotulo>
                      <p className="text-sm mt-0.5 text-bruto-ash">{o.motivoProvavel}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-bruto-black/60 border border-bruto-steel p-3">
                    <Rotulo>Roteiro curto</Rotulo>
                    <ol className="mt-1 space-y-0.5 text-sm text-bruto-ash list-decimal list-inside">
                      <li>Abrir com informação nova, não com &ldquo;chegou o orçamento?&rdquo;</li>
                      <li>Perguntar diretamente: faltou preço, prazo, marca ou aplicação?</li>
                      <li>Se for preço, pedir o comparativo item a item antes de conceder.</li>
                      <li>Sair da ligação com desfecho: ganho, perdido ou nova data.</li>
                    </ol>
                  </div>

                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Link
                      to={`/app/cliente/${o.cliente.id}?preparar=1`}
                      className="btn-primario flex-1 min-w-[150px]"
                    >
                      Preparar ligação
                    </Link>
                    <Link to={`/app/cliente/${o.cliente.id}`} className="btn-secundario">
                      Registrar desfecho
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TituloSecao descricao="Ordenada por tipo de ação e, dentro de cada tipo, por prioridade. Urgência nunca fica atrás de oportunidade maior.">
        Próximas ações
      </TituloSecao>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFiltroTipo('')}
          aria-pressed={filtroTipo === ''}
          className={`shrink-0 rounded-lg px-3 min-h-[40px] text-xs font-semibold ${
            filtroTipo === ''
              ? 'bg-bruto-yellow text-bruto-black'
              : 'border border-bruto-steel text-bruto-ash'
          }`}
        >
          Todas ({recomendacoes.length})
        </button>
        {TIPOS.filter((t) => (contagemPorTipo.get(t) ?? 0) > 0).map((t) => (
          <button
            key={t}
            onClick={() => setFiltroTipo(t)}
            aria-pressed={filtroTipo === t}
            className={`shrink-0 rounded-lg px-3 min-h-[40px] text-xs font-semibold ${
              filtroTipo === t
                ? 'bg-bruto-yellow text-bruto-black'
                : 'border border-bruto-steel text-bruto-ash'
            }`}
          >
            {ROTULO_TIPO_ACAO[t]} ({contagemPorTipo.get(t)})
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma ação nesta fila"
          descricao="Sua carteira está dentro do ciclo, sem orçamentos parados nem compromissos vencidos. Use a Carteira Esquecida para trabalhar contas de longo prazo."
          acao={
            <Link to="/app/carteira?modo=carteira-esquecida" className="btn-secundario">
              Carteira esquecida
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((r) => (
            <CardAcao key={r.id} recomendacao={r} />
          ))}
        </div>
      )}

      {recomendacoes.some((r) => r.confianca === 'BAIXA') && (
        <Card className="p-4">
          <Rotulo>Sobre confiança baixa</Rotulo>
          <p className="text-sm text-bruto-ash mt-1">
            Recomendações de confiança baixa não entram no Top 3 do Cockpit — o topo do dia não pode
            ser ocupado por uma conclusão que o sistema não sustenta. Elas aparecem aqui com as
            lacunas em destaque:{' '}
            {contextos.filter((c) => c.lacunasCriticas.length >= 2).length} contas têm duas ou mais
            lacunas críticas de cadastro.
          </p>
        </Card>
      )}

      {contextoPorCliente.size === 0 && (
        <EstadoVazio titulo="Carteira vazia" descricao="Nenhum cliente atribuído a este vendedor." />
      )}
    </div>
  );
}
