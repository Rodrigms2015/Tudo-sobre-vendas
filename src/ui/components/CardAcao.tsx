/**
 * Card de recomendação.
 *
 * O bloco "POR QUE" é obrigatório e não colapsável quando `destaque` está ativo (Top 3).
 * Nenhum card existe sem fatores e evidências — o tipo `Explicavel` garante isso em
 * tempo de compilação. Ver docs/INFORMATION_ARCHITECTURE.md §4.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MotivoRejeicao, Recommendation } from '../../domain/types';
import { MOTIVOS_REJEICAO, ROTULO_COMPONENTE, type ChaveComponente } from '../../domain/types';
import { formatarData, formatarMoeda } from '../../domain/dates';
import { BarraSegmentada } from '../charts';
import { Card, ListaLacunas, Rotulo, SeloConfianca, SeloTipoAcao } from './primitives';
import { useApp } from '../../state/store';

const CORES_COMPONENTE: Record<ChaveComponente, string> = {
  recorrencia: 'bg-bruto-green',
  tempoSemCompra: 'bg-bruto-yellow',
  orcamentoAberto: 'bg-bruto-amber',
  potencialFrota: 'bg-bruto-blue',
  urgencia: 'bg-bruto-red',
  aderenciaFamilia: 'bg-emerald-600',
  relacionamento: 'bg-sky-600',
  margemPotencial: 'bg-teal-600',
  compromissoVencido: 'bg-orange-600',
};

export function CardAcao({
  recomendacao,
  destaque = false,
  aoExecutar,
}: {
  recomendacao: Recommendation;
  destaque?: boolean;
  aoExecutar?: (rec: Recommendation) => void;
}) {
  const { contextoPorCliente, registrarFeedback, resolucaoDe } = useApp();
  const [expandido, setExpandido] = useState(destaque);
  const [rejeitando, setRejeitando] = useState(false);
  const [motivo, setMotivo] = useState<MotivoRejeicao>('MOMENTO_ERRADO');
  const [comentario, setComentario] = useState('');

  // A resolução vive no store, não no componente: aceitar ou rejeitar faz o motor
  // recalcular e a recomendação some da fila. Se o estado fosse local, o card
  // desmontaria e o vendedor não veria confirmação nenhuma.
  const resolucao = resolucaoDe(recomendacao.id);

  const ctx = contextoPorCliente.get(recomendacao.customerId);
  const cliente = ctx?.customer;

  const segmentos = (Object.keys(recomendacao.componentes) as ChaveComponente[]).map((chave) => ({
    rotulo: ROTULO_COMPONENTE[chave],
    valor: recomendacao.componentes[chave],
    cor: CORES_COMPONENTE[chave],
  }));

  if (resolucao) {
    return (
      <Card className="p-4">
        <p className="text-sm">
          {resolucao.aceita ? (
            <>
              Ação aceita e adicionada às tarefas de hoje —{' '}
              <span className="text-bruto-ash">{cliente?.nomeFantasia}</span>.
            </>
          ) : (
            <>
              Recomendação dispensada —{' '}
              <span className="text-bruto-ash">{cliente?.nomeFantasia}</span>.{' '}
              <span className="text-bruto-ash">
                {MOTIVOS_REJEICAO.find((m) => m.valor === resolucao.motivo)?.efeito}.
              </span>
            </>
          )}
        </p>
      </Card>
    );
  }

  return (
    <Card className={destaque ? 'p-4 border-bruto-steel' : 'p-4'}>
      {/* Identidade e prioridade */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <SeloTipoAcao valor={recomendacao.tipo} />
          <SeloConfianca valor={recomendacao.confianca} />
        </div>
        <div className="text-right shrink-0">
          <div className="tabular text-2xl font-bold leading-none">{recomendacao.score}</div>
          <div className="text-[10px] text-bruto-ash uppercase tracking-wide">prioridade</div>
        </div>
      </div>

      {cliente && (
        <Link
          to={`/app/cliente/${cliente.id}`}
          className="block mt-2 font-semibold hover:text-bruto-yellow transition-colors"
        >
          {cliente.nomeFantasia}
          <span className="text-bruto-ash font-normal text-sm">
            {' '}
            · {cliente.cidade}/{cliente.uf}
          </span>
        </Link>
      )}

      {/* Ação */}
      <p className="mt-2 text-[15px] leading-snug">{recomendacao.acao}</p>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-bruto-ash tabular">
        <span>Prazo: {formatarData(recomendacao.prazo)}</span>
        {recomendacao.valorPotencial > 0 && (
          <span>Potencial estimado: {formatarMoeda(recomendacao.valorPotencial)}</span>
        )}
      </div>

      {/* Drivers sempre visíveis: o score nunca aparece sozinho. */}
      {recomendacao.driversDominantes.length > 0 && (
        <p className="mt-2 text-xs text-bruto-ash">
          Pesou mais: {recomendacao.driversDominantes.join(' · ')}
        </p>
      )}

      <div className="mt-3">
        <BarraSegmentada
          segmentos={segmentos}
          descricao={`Composição da pontuação ${recomendacao.score}`}
        />
      </div>

      {/* Raciocínio */}
      {!destaque && (
        <button
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
          className="mt-3 text-xs font-semibold text-bruto-yellow"
        >
          {expandido ? 'Ocultar raciocínio' : 'Por que esta recomendação apareceu'}
        </button>
      )}

      {expandido && (
        <div className="mt-3 space-y-3 border-t border-bruto-steel pt-3">
          <div>
            <Rotulo>Por que</Rotulo>
            <ul className="mt-1 space-y-1">
              {recomendacao.fatores.map((f) => (
                <li key={f.rotulo} className="text-sm flex gap-2">
                  <span className="text-bruto-green shrink-0" aria-hidden="true">
                    +
                  </span>
                  <span>
                    <span className="font-medium">{f.rotulo}</span>
                    <span className="text-bruto-ash"> — {f.evidencia}</span>
                    <span className="text-bruto-ash tabular"> ({f.peso.toFixed(0)} pts)</span>
                  </span>
                </li>
              ))}
              {recomendacao.fatores.length === 0 && (
                <li className="text-sm text-bruto-ash">
                  Nenhum fator positivo pontuou. Esta conta aparece por lacuna de cadastro.
                </li>
              )}
            </ul>
          </div>

          {recomendacao.penalidades.length > 0 && (
            <div>
              <Rotulo>Penalidades</Rotulo>
              <ul className="mt-1 space-y-1">
                {recomendacao.penalidades.map((p) => (
                  <li key={p.rotulo} className="text-sm flex gap-2">
                    <span className="text-bruto-amber shrink-0" aria-hidden="true">
                      −
                    </span>
                    <span>
                      <span className="font-medium">{p.rotulo}</span>
                      <span className="text-bruto-ash"> — {p.evidencia}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ListaLacunas lacunas={recomendacao.lacunas} />

          {recomendacao.proximaPergunta && (
            <div>
              <Rotulo>Pergunte</Rotulo>
              <p className="mt-1 text-sm text-bruto-yellow">{recomendacao.proximaPergunta}</p>
            </div>
          )}
        </div>
      )}

      {/* Saída sempre acionável */}
      {!rejeitando ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-primario flex-1 min-w-[140px]"
            onClick={async () => {
              await registrarFeedback(recomendacao, true, null, '');
              aoExecutar?.(recomendacao);
            }}
          >
            Executar
          </button>
          <button className="btn-secundario" onClick={() => setRejeitando(true)}>
            Não faz sentido
          </button>
          {cliente && (
            <Link to={`/app/cliente/${cliente.id}`} className="btn-fantasma">
              Detalhar
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-4 border-t border-bruto-steel pt-3 space-y-2">
          <div>
            <label htmlFor={`motivo-${recomendacao.id}`} className="rotulo block mb-1">
              Por que não faz sentido?
            </label>
            <select
              id={`motivo-${recomendacao.id}`}
              className="campo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoRejeicao)}
            >
              {MOTIVOS_REJEICAO.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.rotulo} — {m.efeito}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`comentario-${recomendacao.id}`} className="rotulo block mb-1">
              Comentário (opcional)
            </label>
            <input
              id={`comentario-${recomendacao.id}`}
              className="campo"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="O que o sistema não sabia?"
            />
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secundario flex-1"
              onClick={async () => {
                await registrarFeedback(recomendacao, false, motivo, comentario);
              }}
            >
              Registrar
            </button>
            <button className="btn-fantasma" onClick={() => setRejeitando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
