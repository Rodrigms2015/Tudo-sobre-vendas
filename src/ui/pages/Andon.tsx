/**
 * Painel ANDON completo.
 *
 * O controle de ruído é explicado na própria tela: o usuário precisa entender por que
 * só três críticos aparecem, senão vai achar que o sistema está escondendo coisas.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../state/store';
import { CardAlerta } from '../components/CardAlerta';
import { Card, EstadoVazio, Rotulo, TituloSecao } from '../components/primitives';
import { TETO_CRITICOS } from '../../domain/engine/andon';
import type { SeveridadeAlerta } from '../../domain/types';
import { formatarData, formatarMoeda } from '../../domain/dates';

export function Andon() {
  const { alertas, dados, temDados, contextoPorCliente } = useApp();
  const [filtro, setFiltro] = useState<SeveridadeAlerta | ''>('');

  const criticos = alertas.filter((a) => a.severidade === 'CRITICO');
  const atencao = alertas.filter((a) => a.severidade === 'ATENCAO');
  const informacao = alertas.filter((a) => a.severidade === 'INFORMACAO');

  const filtrados = filtro ? alertas.filter((a) => a.severidade === filtro) : alertas;
  const impactoTotal = alertas.reduce((s, a) => s + a.impactoEstimado, 0);

  if (!temDados) {
    return (
      <EstadoVazio
        titulo="Nenhuma carteira carregada"
        descricao="O ANDON só acende sobre dados reais ou de demonstração."
        acao={
          <Link to="/app/dados" className="btn-primario">
            Ir para Dados
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <TituloSecao descricao="Anormalidades, não atividade normal. Um alerta que não morre é ruído.">
        Painel ANDON
      </TituloSecao>

      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <Rotulo>Críticos</Rotulo>
            <p className="tabular text-2xl font-bold text-bruto-red">{criticos.length}</p>
          </div>
          <div>
            <Rotulo>Atenção</Rotulo>
            <p className="tabular text-2xl font-bold text-bruto-amber">{atencao.length}</p>
          </div>
          <div>
            <Rotulo>Informação</Rotulo>
            <p className="tabular text-2xl font-bold text-bruto-blue">{informacao.length}</p>
          </div>
          <div>
            <Rotulo>Impacto estimado</Rotulo>
            <p className="tabular text-2xl font-bold">{formatarMoeda(impactoTotal)}</p>
          </div>
        </div>

        <p className="text-xs text-bruto-ash mt-4 leading-relaxed">
          O painel limita <strong>{TETO_CRITICOS} alertas críticos</strong> simultâneos e{' '}
          <strong>um alerta por conta</strong>. Os demais sinais de cada conta aparecem como contexto
          dentro do alerta principal — você liga para o cliente, não para o alerta. Reconhecer um
          alerta silencia aquela causa por 7 dias.
        </p>
      </Card>

      <div className="flex gap-1.5">
        {(
          [
            ['', `Todos (${alertas.length})`],
            ['CRITICO', `Críticos (${criticos.length})`],
            ['ATENCAO', `Atenção (${atencao.length})`],
            ['INFORMACAO', `Informação (${informacao.length})`],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setFiltro(valor as SeveridadeAlerta | '')}
            aria-pressed={filtro === valor}
            className={`flex-1 rounded-lg min-h-[42px] px-2 text-xs font-semibold ${
              filtro === valor
                ? 'bg-bruto-yellow text-bruto-black'
                : 'border border-bruto-steel text-bruto-ash'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma anormalidade nesta faixa"
          descricao="Isso é um resultado válido. O ANDON só acende quando há algo fora do padrão — um painel sempre aceso seria um painel inútil."
        />
      ) : (
        <ul className="space-y-3">
          {filtrados.map((a) => (
            <li key={a.id}>
              <CardAlerta alerta={a} />
            </li>
          ))}
        </ul>
      )}

      {dados.alertAcks.length > 0 && (
        <Card className="p-4">
          <TituloSecao descricao="Alertas reconhecidos não retornam pela mesma causa durante a janela de silêncio.">
            Reconhecimentos recentes
          </TituloSecao>
          <ul className="divide-y divide-bruto-steel">
            {[...dados.alertAcks]
              .sort((a, b) => b.data.localeCompare(a.data))
              .slice(0, 8)
              .map((ack) => (
                <li key={ack.id} className="py-2 first:pt-0 flex justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{ack.motivo}</p>
                    <p className="text-xs text-bruto-ash">
                      {contextoPorCliente.get(ack.customerId)?.customer.nomeFantasia ??
                        ack.customerId}
                    </p>
                  </div>
                  <span className="text-xs text-bruto-ash tabular shrink-0">
                    {formatarData(ack.data)}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
