/**
 * Debriefing comercial.
 *
 * Chega PRÉ-PREENCHIDO com o que foi de fato registrado no dia. Formulário em branco de
 * fim de dia é abandonado na segunda semana — e com ele morre o loop de aprendizado.
 * Meta: 60 segundos, sem digitar mais que duas frases.
 * Ver docs/CRITICAL_REVIEW.md §4.4 e docs/USER_JOURNEYS.md J8.
 */

import { useMemo, useState } from 'react';
import { useApp } from '../../state/store';
import { Card, EstadoVazio, Metrica, Rotulo, TituloSecao } from '../components/primitives';
import { baixarArquivo } from '../../data/csv';
import { formatarData, formatarMoeda, hoje } from '../../domain/dates';
import { MOTIVOS_PERDA } from '../../domain/types';

export function Debriefing() {
  const { dados, contextos, contextoPorCliente, recomendacoes, settings, salvarDebriefing, temDados } =
    useApp();
  const referencia = useMemo(() => hoje(), []);
  const idsClientes = useMemo(() => new Set(contextos.map((c) => c.customer.id)), [contextos]);

  /** Tudo que foi registrado hoje — a base do pré-preenchimento. */
  const doDia = useMemo(() => {
    const interacoes = dados.interactions.filter(
      (i) => i.data === referencia && idsClientes.has(i.customerId),
    );
    const perdas = dados.lostSales.filter(
      (p) => p.data === referencia && idsClientes.has(p.customerId),
    );
    const promessasCriadas = dados.promessas.filter(
      (p) => p.criadaEm === referencia && idsClientes.has(p.customerId),
    );
    const promessasCumpridas = dados.promessas.filter(
      (p) => p.status === 'CUMPRIDA' && idsClientes.has(p.customerId),
    );
    const feedback = dados.recommendationFeedback.filter(
      (f) => f.data === referencia && idsClientes.has(f.customerId),
    );
    const tarefasConcluidas = dados.tasks.filter(
      (t) => t.status === 'CONCLUIDA' && t.customerId !== null && idsClientes.has(t.customerId),
    );
    return {
      interacoes,
      perdas,
      promessasCriadas,
      promessasCumpridas,
      feedback,
      tarefasConcluidas,
      contatosUteis: interacoes.filter((i) => i.util).length,
      acoesExecutadas: feedback.filter((f) => f.aceita).length + tarefasConcluidas.length,
    };
  }, [dados, idsClientes, referencia]);

  const rejeicoes = doDia.feedback.filter((f) => !f.aceita);

  const avancosSugeridos = useMemo(() => {
    const linhas: string[] = [];
    for (const i of doDia.interacoes.filter((x) => x.util)) {
      const nome = contextoPorCliente.get(i.customerId)?.customer.nomeFantasia ?? i.customerId;
      linhas.push(`${nome}: ${i.resumo}`);
    }
    for (const p of doDia.promessasCriadas) {
      const nome = contextoPorCliente.get(p.customerId)?.customer.nomeFantasia ?? p.customerId;
      linhas.push(`${nome}: promessa registrada — ${p.descricao}`);
    }
    return linhas;
  }, [doDia, contextoPorCliente]);

  const travasSugeridas = useMemo(() => {
    const linhas: string[] = [];
    for (const p of doDia.perdas) {
      const nome = contextoPorCliente.get(p.customerId)?.customer.nomeFantasia ?? p.customerId;
      const motivo = MOTIVOS_PERDA.find((m) => m.valor === p.motivo);
      linhas.push(
        `${nome}: perda de ${formatarMoeda(p.valorEstimado)} por ${motivo?.rotulo.toLowerCase()} (gargalo: ${motivo?.gargalo})`,
      );
    }
    for (const r of rejeicoes) {
      const nome = contextoPorCliente.get(r.customerId)?.customer.nomeFantasia ?? r.customerId;
      linhas.push(`${nome}: recomendação dispensada — ${r.motivo}${r.comentario ? `, ${r.comentario}` : ''}`);
    }
    return linhas;
  }, [doDia, rejeicoes, contextoPorCliente]);

  const prioridadeSugerida = useMemo(() => {
    const top = recomendacoes[0];
    if (!top) return 'Enriquecer cadastro das contas sem perfil de frota.';
    const nome = contextoPorCliente.get(top.customerId)?.customer.nomeFantasia ?? top.customerId;
    return `${nome}: ${top.acao}`;
  }, [recomendacoes, contextoPorCliente]);

  const existente = dados.debriefs.find(
    (d) => d.data === referencia && d.sellerId === settings.sellerAtivoId,
  );

  const [avancos, setAvancos] = useState(existente?.avancos ?? avancosSugeridos.join('\n'));
  const [travas, setTravas] = useState(existente?.travas ?? travasSugeridas.join('\n'));
  const [aprendizado, setAprendizado] = useState(existente?.aprendizado ?? '');
  const [prioridade, setPrioridade] = useState(existente?.prioridadeAmanha ?? prioridadeSugerida);
  const [salvo, setSalvo] = useState(false);

  if (!temDados) {
    return (
      <EstadoVazio
        titulo="Nenhuma carteira carregada"
        descricao="O debriefing resume o que foi registrado no dia sobre a sua carteira."
      />
    );
  }

  const resumoTexto = () =>
    [
      `DEBRIEFING — ${formatarData(referencia)}`,
      `Vendedor: ${settings.sellerAtivoId}`,
      '',
      `Ações executadas: ${doDia.acoesExecutadas}`,
      `Contatos úteis: ${doDia.contatosUteis} de ${doDia.interacoes.length}`,
      `Promessas criadas: ${doDia.promessasCriadas.length}`,
      `Perdas registradas: ${doDia.perdas.length}`,
      '',
      'O QUE AVANÇOU:',
      avancos || '(nada registrado)',
      '',
      'O QUE TRAVOU:',
      travas || '(nada registrado)',
      '',
      'APRENDIZADO PARA O PLAYBOOK:',
      aprendizado || '(não informado)',
      '',
      'PRIORIDADE DE AMANHÃ:',
      prioridade || '(não definida)',
    ].join('\n');

  return (
    <div className="space-y-4">
      <TituloSecao descricao="Já vem preenchido com o que você registrou hoje. Confirme, corrija e escreva uma linha de aprendizado.">
        Debriefing do dia — {formatarData(referencia)}
      </TituloSecao>

      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metrica rotulo="Ações executadas" valor={String(doDia.acoesExecutadas)} destaque />
          <Metrica
            rotulo="Contatos úteis"
            valor={String(doDia.contatosUteis)}
            detalhe={`de ${doDia.interacoes.length} contatos`}
          />
          <Metrica rotulo="Promessas criadas" valor={String(doDia.promessasCriadas.length)} />
          <Metrica
            rotulo="Perdas registradas"
            valor={String(doDia.perdas.length)}
            detalhe={
              doDia.perdas.length > 0
                ? formatarMoeda(doDia.perdas.reduce((s, p) => s + p.valorEstimado, 0))
                : undefined
            }
          />
        </div>
        {doDia.acoesExecutadas === 0 && doDia.interacoes.length === 0 && (
          <p className="text-sm text-bruto-ash mt-4">
            Nada foi registrado hoje nesta carteira. O debriefing fica em branco de propósito — ele
            resume o que existe, não inventa atividade.
          </p>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <div>
          <label htmlFor="avancos" className="rotulo block mb-1">
            O que avançou
          </label>
          <textarea
            id="avancos"
            className="campo min-h-[100px]"
            value={avancos}
            onChange={(e) => setAvancos(e.target.value)}
            placeholder="Pré-preenchido com os contatos úteis e promessas do dia."
          />
        </div>

        <div>
          <label htmlFor="travas" className="rotulo block mb-1">
            O que travou
          </label>
          <textarea
            id="travas"
            className="campo min-h-[100px]"
            value={travas}
            onChange={(e) => setTravas(e.target.value)}
            placeholder="Pré-preenchido com perdas e recomendações dispensadas."
          />
        </div>

        <div>
          <label htmlFor="aprendizado" className="rotulo block mb-1">
            Aprendizado para o playbook (uma linha)
          </label>
          <input
            id="aprendizado"
            className="campo"
            value={aprendizado}
            onChange={(e) => setAprendizado(e.target.value)}
            placeholder="Ex.: pedir o comparativo antes de discutir desconto funcionou em duas contas"
          />
        </div>

        <div>
          <label htmlFor="prioridade" className="rotulo block mb-1">
            Prioridade de amanhã
          </label>
          <input
            id="prioridade"
            className="campo"
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value)}
          />
          <p className="text-xs text-bruto-ash mt-1">
            Sugerida pelo motor a partir da fila atual. Corrija se discordar.
          </p>
        </div>

        {salvo && <p className="text-sm text-bruto-green">Debriefing salvo.</p>}

        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primario flex-1 min-w-[160px]"
            onClick={async () => {
              await salvarDebriefing({
                data: referencia,
                sellerId: settings.sellerAtivoId,
                acoesExecutadas: doDia.acoesExecutadas,
                contatosUteis: doDia.contatosUteis,
                avancos,
                travas,
                aprendizado,
                prioridadeAmanha: prioridade,
                promessasCriadas: doDia.promessasCriadas.length,
                perdasRegistradas: doDia.perdas.length,
              });
              setSalvo(true);
            }}
          >
            Salvar debriefing
          </button>
          <button
            className="btn-secundario"
            onClick={() =>
              baixarArquivo(`bruto-os-debriefing-${referencia}.txt`, resumoTexto(), 'text/plain')
            }
          >
            Exportar resumo
          </button>
        </div>
      </Card>

      {dados.debriefs.length > 0 && (
        <Card className="p-4">
          <TituloSecao>Debriefings anteriores</TituloSecao>
          <ul className="divide-y divide-bruto-steel">
            {[...dados.debriefs]
              .sort((a, b) => b.data.localeCompare(a.data))
              .slice(0, 7)
              .map((d) => (
                <li key={d.id} className="py-2.5 first:pt-0">
                  <div className="flex justify-between gap-3">
                    <span className="text-sm font-medium tabular">{formatarData(d.data)}</span>
                    <span className="text-xs text-bruto-ash tabular">
                      {d.acoesExecutadas} ações · {d.contatosUteis} contatos úteis
                    </span>
                  </div>
                  {d.aprendizado && (
                    <p className="text-sm text-bruto-ash mt-1">
                      <Rotulo>Aprendizado</Rotulo> {d.aprendizado}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
