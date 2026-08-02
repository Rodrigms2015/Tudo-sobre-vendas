/**
 * Perfil 360 do cliente.
 *
 * O botão "Preparar ligação" é persistente no topo, em todas as abas: é a ação mais
 * frequente da tela e não pode exigir navegação.
 * Ver docs/INFORMATION_ARCHITECTURE.md §6.
 */

import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../state/store';
import { calcularScore } from '../../domain/engine/scoring';
import { descreverMomento } from '../../domain/engine/recommendations';
import { radarPorFamilia, situacaoJanela, ROTULO_SITUACAO_JANELA } from '../../domain/engine/radar';
import { prepararLigacao, scarComoTexto } from '../../domain/engine/scar';
import { calcularCorrelacaoDeCesta, montarGrafo, perguntasDeVendaCompleta, ROTULO_SISTEMA, ROTULO_TIPO_RELACAO } from '../../domain/engine/graph';
import { DESCRICAO_TEMPERATURA } from '../../domain/engine/cadence';
import {
  MOTIVOS_PERDA,
  ROTULO_COMPONENTE,
  ROTULO_PERFIL_OPERACAO,
  ROTULO_SEGMENTO,
  ROTULO_TIPO_CLIENTE,
  type ChaveComponente,
  type MotivoPerda,
  type SistemaVeicular,
} from '../../domain/types';
import {
  Abas,
  Aviso,
  Card,
  EstadoVazio,
  ListaLacunas,
  Metrica,
  Rotulo,
  SeloEvidencia,
  SeloProcedencia,
  SeloTemperatura,
  TituloSecao,
} from '../components/primitives';
import { formatarData, formatarDias, formatarMoeda, hoje, somarDias } from '../../domain/dates';
import { CardAcao } from '../components/CardAcao';

type Aba = 'SITUACAO' | 'HISTORICO' | 'FROTA' | 'OPORTUNIDADE' | 'EXECUCAO';

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'SITUACAO', rotulo: 'Situação' },
  { valor: 'HISTORICO', rotulo: 'Histórico' },
  { valor: 'FROTA', rotulo: 'Frota' },
  { valor: 'OPORTUNIDADE', rotulo: 'Oportunidade' },
  { valor: 'EXECUCAO', rotulo: 'Execução' },
];

export function Cliente360() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const {
    contextoPorCliente,
    dados,
    settings,
    recomendacoes,
    registrarInteracao,
    registrarPerda,
    criarPromessa,
    resolverPromessa,
    concluirTarefa,
  } = useApp();
  const referencia = useMemo(() => hoje(), []);

  const [aba, setAba] = useState<Aba>('SITUACAO');
  const [preparoAberto, setPreparoAberto] = useState(params.get('preparar') === '1');
  const [copiado, setCopiado] = useState(false);

  const ctx = id ? contextoPorCliente.get(id) : undefined;

  const recomendacao = useMemo(
    () => recomendacoes.find((r) => r.customerId === id) ?? null,
    [recomendacoes, id],
  );

  const resultado = useMemo(
    () => (ctx ? calcularScore(ctx, settings.pesos, dados.productFamilies, referencia) : null),
    [ctx, settings.pesos, dados.productFamilies, referencia],
  );

  const preparo = useMemo(
    () => (ctx ? prepararLigacao(ctx, recomendacao, dados.productFamilies, referencia) : null),
    [ctx, recomendacao, dados.productFamilies, referencia],
  );

  const sinais = useMemo(
    () => (ctx ? radarPorFamilia(ctx, dados.productFamilies, referencia) : []),
    [ctx, dados.productFamilies, referencia],
  );

  const correlacoes = useMemo(() => calcularCorrelacaoDeCesta(dados), [dados]);

  if (!ctx || !resultado || !preparo) {
    return (
      <EstadoVazio
        titulo="Cliente não encontrado nesta carteira"
        descricao="O cliente pode pertencer a outro vendedor. Troque o papel para Gestor para ver todas as carteiras."
        acao={
          <Link to="/app/carteira" className="btn-secundario">
            Voltar para a carteira
          </Link>
        }
      />
    );
  }

  const familiaPorId = new Map(dados.productFamilies.map((f) => [f.id, f]));

  return (
    <div className="space-y-5">
      {/* Cabeçalho persistente */}
      <div>
        <Link to="/app/carteira" className="text-xs text-bruto-ash hover:text-bruto-yellow">
          ← Carteira
        </Link>
        <div className="mt-1 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{ctx.customer.nomeFantasia}</h1>
            <p className="text-sm text-bruto-ash">
              {ctx.customer.cidade}/{ctx.customer.uf} ·{' '}
              {ROTULO_TIPO_CLIENTE[ctx.customer.tipoCliente]} ·{' '}
              {ROTULO_SEGMENTO[ctx.customer.segmento]}
            </p>
          </div>
          <button className="btn-primario shrink-0" onClick={() => setPreparoAberto((v) => !v)}>
            {preparoAberto ? 'Fechar preparo' : 'Preparar ligação'}
          </button>
        </div>
      </div>

      {/* Preparo de ligação */}
      {preparoAberto && (
        <Card elevado className="p-4 space-y-4">
          <TituloSecao
            descricao="Montado a partir do histórico registrado. Nenhum número aqui é inventado."
            acao={
              <button
                className="btn-secundario !min-h-[36px] text-xs"
                onClick={async () => {
                  const texto = scarComoTexto(preparo, ctx.customer.nomeFantasia);
                  try {
                    await navigator.clipboard.writeText(texto);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2500);
                  } catch {
                    setCopiado(false);
                  }
                }}
              >
                {copiado ? 'Copiado' : 'Copiar SCAR'}
              </button>
            }
          >
            Preparo da ligação
          </TituloSecao>

          <div>
            <Rotulo>Objetivo</Rotulo>
            <p className="mt-0.5">{preparo.objetivo}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                ['Situação', preparo.scar.situacao],
                ['Contexto', preparo.scar.contexto],
                ['Análise', preparo.scar.analise],
                ['Recomendação', preparo.scar.recomendacao],
              ] as const
            ).map(([rotulo, texto]) => (
              <div key={rotulo} className="rounded-lg border border-bruto-steel p-3">
                <Rotulo>{rotulo}</Rotulo>
                <p className="text-sm mt-1">{texto}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Rotulo>Perguntas recomendadas</Rotulo>
              <ul className="mt-1 space-y-1">
                {preparo.perguntas.map((p) => (
                  <li key={p} className="text-sm flex gap-2">
                    <span className="text-bruto-yellow shrink-0" aria-hidden="true">
                      ?
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Rotulo>Oportunidades</Rotulo>
              <ul className="mt-1 space-y-1">
                {preparo.oportunidades.map((o) => (
                  <li key={o} className="text-sm text-bruto-ash">
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <Rotulo>Objeções prováveis</Rotulo>
            <div className="mt-1 space-y-2">
              {preparo.objecoesProvaveis.map((o) => (
                <div key={o.objecao} className="rounded-lg border border-bruto-steel p-3">
                  <p className="text-sm font-medium">{o.objecao}</p>
                  <p className="text-sm text-bruto-ash mt-1">{o.resposta}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Rotulo>Histórico essencial</Rotulo>
              <ul className="mt-1 space-y-0.5">
                {preparo.historicoEssencial.map((h) => (
                  <li key={h} className="text-sm text-bruto-ash tabular">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
            <ListaLacunas lacunas={preparo.lacunas} />
          </div>

          <Aviso tom="atencao" titulo="Antes de confirmar qualquer item">
            O BRUTO OS não afirma aplicação técnica. Confirme marca, modelo, ano e motor no catálogo
            validado antes de fechar.
          </Aviso>

          <div>
            <Rotulo>Próxima ação esperada</Rotulo>
            <p className="text-sm mt-0.5">{preparo.proximaAcaoEsperada}</p>
          </div>

          <RegistroRapido
            customerId={ctx.customer.id}
            valorSugerido={Math.round(ctx.ticketMedio)}
            aoRegistrarInteracao={registrarInteracao}
            aoRegistrarPerda={registrarPerda}
            aoCriarPromessa={criarPromessa}
          />
        </Card>
      )}

      <Abas abas={ABAS} ativa={aba} aoTrocar={setAba} />

      {/* ---------------- SITUAÇÃO ---------------- */}
      {aba === 'SITUACAO' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <Rotulo>Temperatura da conta</Rotulo>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <SeloTemperatura valor={ctx.cadencia.temperatura} />
                  <SeloEvidencia valor={ctx.cadencia.evidencia} />
                </div>
                <p className="text-sm text-bruto-ash mt-2 max-w-prose">
                  {DESCRICAO_TEMPERATURA[ctx.cadencia.temperatura]}
                </p>
                <p className="text-sm mt-1">{descreverMomento(ctx)}</p>
              </div>
              <div className="text-right">
                <div className="tabular text-4xl font-bold leading-none">{resultado.score}</div>
                <div className="text-[10px] text-bruto-ash uppercase tracking-wide mt-1">
                  prioridade
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <TituloSecao descricao="O score é critério de ordenação, não nota de qualidade da conta.">
              Composição da prioridade
            </TituloSecao>
            <ul className="space-y-1.5">
              {(Object.keys(resultado.componentes) as ChaveComponente[]).map((chave) => {
                const valor = resultado.componentes[chave];
                return (
                  <li key={chave} className="flex items-center gap-3">
                    <span className="text-sm w-44 shrink-0 text-bruto-ash">
                      {ROTULO_COMPONENTE[chave]}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-bruto-steel overflow-hidden">
                      <div
                        className="h-full bg-bruto-yellow rounded-full"
                        style={{ width: `${Math.min(100, (valor / 20) * 100)}%` }}
                      />
                    </div>
                    <span className="tabular text-sm w-10 text-right">{valor.toFixed(0)}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 space-y-3 border-t border-bruto-steel pt-3">
              <div>
                <Rotulo>Fatores</Rotulo>
                <ul className="mt-1 space-y-1">
                  {resultado.fatores.map((f) => (
                    <li key={f.rotulo} className="text-sm">
                      <span className="text-bruto-green" aria-hidden="true">
                        +{' '}
                      </span>
                      <span className="font-medium">{f.rotulo}</span>
                      <span className="text-bruto-ash"> — {f.evidencia}</span>
                    </li>
                  ))}
                  {resultado.fatores.length === 0 && (
                    <li className="text-sm text-bruto-ash">Nenhum fator positivo pontuou.</li>
                  )}
                </ul>
              </div>
              {resultado.penalidades.length > 0 && (
                <div>
                  <Rotulo>Penalidades</Rotulo>
                  <ul className="mt-1 space-y-1">
                    {resultado.penalidades.map((p) => (
                      <li key={p.rotulo} className="text-sm">
                        <span className="text-bruto-amber" aria-hidden="true">
                          −{' '}
                        </span>
                        <span className="font-medium">{p.rotulo}</span>
                        <span className="text-bruto-ash"> — {p.evidencia}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ListaLacunas lacunas={resultado.lacunas} />
            </div>
          </Card>

          {/* Radar de reposição */}
          <Card className="p-4">
            <TituloSecao descricao="Intervalo histórico de recompra. Não é previsão de falha — nenhum dado de quilometragem ou desgaste entra nesta conta.">
              Radar de Reposição
            </TituloSecao>
            {sinais.length === 0 ? (
              <p className="text-sm text-bruto-ash">
                Nenhuma compra registrada. O radar precisa de histórico por família.
              </p>
            ) : (
              <ul className="space-y-2">
                {sinais.map((s) => {
                  const familia = s.familyId ? familiaPorId.get(s.familyId) : null;
                  const situacao = situacaoJanela(s, referencia);
                  return (
                    <li key={s.familyId ?? 'conta'} className="rounded-lg border border-bruto-steel p-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-medium text-sm">{familia?.nome ?? 'Conta'}</p>
                          <p className="text-xs text-bruto-ash">
                            {ROTULO_SITUACAO_JANELA[situacao]}
                            {s.janelaInicio && s.janelaFim && (
                              <>
                                {' '}
                                · {formatarData(s.janelaInicio)} a {formatarData(s.janelaFim)}
                              </>
                            )}
                          </p>
                        </div>
                        <SeloEvidencia valor={s.evidencia} />
                      </div>
                      <ul className="mt-2 space-y-0.5">
                        {s.fatores.map((f) => (
                          <li key={f.rotulo} className="text-xs text-bruto-ash">
                            {f.rotulo}: {f.evidencia}
                          </li>
                        ))}
                        {s.penalidades.map((p) => (
                          <li key={p.rotulo} className="text-xs text-bruto-amber">
                            {p.rotulo}: {p.evidencia}
                          </li>
                        ))}
                        {s.lacunas.map((l) => (
                          <li key={l} className="text-xs text-bruto-ash">
                            ○ {l}
                          </li>
                        ))}
                      </ul>
                      {s.proximaPergunta && (
                        <p className="text-xs text-bruto-yellow mt-1.5">
                          Pergunte: {s.proximaPergunta}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {recomendacao && (
            <div>
              <TituloSecao>Próxima ação recomendada</TituloSecao>
              <CardAcao recomendacao={recomendacao} destaque />
            </div>
          )}
        </div>
      )}

      {/* ---------------- HISTÓRICO ---------------- */}
      {aba === 'HISTORICO' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3">
              <Metrica
                rotulo="12 meses"
                valor={formatarMoeda(ctx.faturamentoUltimos365)}
                detalhe={`${ctx.comprasUltimos365} compras`}
              />
            </Card>
            <Card className="p-3">
              <Metrica rotulo="Ticket médio" valor={formatarMoeda(ctx.ticketMedio)} />
            </Card>
            <Card className="p-3">
              <Metrica
                rotulo="Margem média"
                valor={ctx.margemMedia !== null ? `${ctx.margemMedia.toFixed(1)}%` : '—'}
                detalhe={ctx.margemMedia === null ? 'não disponível' : undefined}
              />
            </Card>
            <Card className="p-3">
              <Metrica
                rotulo="Última compra"
                valor={formatarDias(ctx.cadencia.diasDesdeUltimaCompra)}
                detalhe={formatarData(ctx.cadencia.ultimaCompra)}
              />
            </Card>
          </div>

          <ListaHistorico
            titulo="Compras"
            vazio="Nenhuma compra registrada."
            itens={[...ctx.vendas]
              .sort((a, b) => b.data.localeCompare(a.data))
              .slice(0, 12)
              .map((v) => ({
                id: v.id,
                data: v.data,
                principal: formatarMoeda(v.valorTotal),
                secundario:
                  v.margemPercentual !== null
                    ? `margem ${v.margemPercentual.toFixed(1)}%`
                    : 'margem não informada',
              }))}
          />

          <ListaHistorico
            titulo="Orçamentos"
            vazio="Nenhum orçamento registrado."
            itens={[...ctx.orcamentos]
              .sort((a, b) => b.data.localeCompare(a.data))
              .map((q) => ({
                id: q.id,
                data: q.data,
                principal: formatarMoeda(q.valorTotal),
                secundario: q.status.toLowerCase(),
              }))}
          />

          <ListaHistorico
            titulo="Interações"
            vazio="Nenhuma interação registrada — esta é uma lacuna, não um dado."
            itens={[...ctx.interacoes]
              .sort((a, b) => b.data.localeCompare(a.data))
              .map((i) => ({
                id: i.id,
                data: i.data,
                principal: i.resumo,
                secundario: `${i.tipo.toLowerCase()}${i.util ? ' · útil' : ''}${i.urgente ? ' · urgente' : ''}`,
              }))}
          />

          <ListaHistorico
            titulo="Vendas perdidas"
            vazio="Nenhuma perda registrada nesta conta."
            itens={[...ctx.perdas]
              .sort((a, b) => b.data.localeCompare(a.data))
              .map((p) => ({
                id: p.id,
                data: p.data,
                principal: `${formatarMoeda(p.valorEstimado)} — ${MOTIVOS_PERDA.find((m) => m.valor === p.motivo)?.rotulo ?? p.motivo}`,
                secundario: p.recuperavel ? 'recuperável' : 'não recuperável',
              }))}
          />
        </div>
      )}

      {/* ---------------- FROTA ---------------- */}
      {aba === 'FROTA' && (
        <div className="space-y-4">
          <Card className="p-4">
            <TituloSecao
              acao={ctx.frota && <SeloProcedencia valor={ctx.frota.procedencia} />}
              descricao="Perfil de frota é a base do dimensionamento de oportunidade. Sem ele, o sistema não consegue priorizar a conta."
            >
              Perfil de frota
            </TituloSecao>

            {!ctx.frota || ctx.frota.totalVeiculos === null ? (
              <EstadoVazio
                titulo="Frota não cadastrada"
                descricao="Esta é a lacuna de maior impacto nesta conta. Sem o total de veículos, os componentes de potencial e de expansão não pontuam."
                acao={
                  <p className="text-sm text-bruto-yellow">
                    Pergunte: quantos veículos vocês têm rodando hoje, e de quais marcas?
                  </p>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Metrica rotulo="Veículos" valor={String(ctx.frota.totalVeiculos)} />
                  <Metrica
                    rotulo="Operação"
                    valor={
                      ctx.frota.perfilOperacao
                        ? ROTULO_PERFIL_OPERACAO[ctx.frota.perfilOperacao]
                        : '—'
                    }
                  />
                  <Metrica
                    rotulo="Idade média"
                    valor={ctx.frota.idadeMediaAnos !== null ? `${ctx.frota.idadeMediaAnos} anos` : '—'}
                  />
                </div>

                {ctx.veiculos.length > 0 && (
                  <ul className="mt-4 divide-y divide-bruto-steel">
                    {ctx.veiculos.map((v) => (
                      <li key={v.id} className="py-2 flex justify-between text-sm">
                        <span>
                          {v.marca} {v.modelo}
                          {v.ano !== null && (
                            <span className="text-bruto-ash"> · {v.ano}</span>
                          )}
                        </span>
                        <span className="tabular text-bruto-ash">{v.quantidade} un.</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Card>

          <Card className="p-4">
            <TituloSecao>Aplicações técnicas</TituloSecao>
            <EstadoVazio
              titulo="Catálogo de aplicações não importado"
              descricao="O BRUTO OS não infere aplicação veículo–motor–sistema–peça. Enquanto não houver catálogo validado com fonte rastreável, esta tela permanece vazia. Essa recusa é a funcionalidade, não uma pendência."
              acao={
                <Link to="/app/conhecimento" className="btn-secundario">
                  Por que o sistema recusa
                </Link>
              }
            />
          </Card>

          <Card className="p-4">
            <TituloSecao>Contatos</TituloSecao>
            {ctx.contatos.length === 0 ? (
              <p className="text-sm text-bruto-ash">
                Nenhum contato registrado. Sem responsável identificado, a conta depende de quem
                atender o telefone.
              </p>
            ) : (
              <ul className="divide-y divide-bruto-steel">
                {ctx.contatos.map((c) => (
                  <li key={c.id} className="py-2.5 first:pt-0">
                    <p className="text-sm font-medium">{c.nome}</p>
                    <p className="text-xs text-bruto-ash">
                      {c.cargo} · prefere {c.canalPreferido.toLowerCase()} ·{' '}
                      <span className="tabular">{c.telefoneMascarado}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-bruto-ash mt-3">
              Telefones são exibidos mascarados nos dados de demonstração. Ver política de dados.
            </p>
          </Card>
        </div>
      )}

      {/* ---------------- OPORTUNIDADE ---------------- */}
      {aba === 'OPORTUNIDADE' && (
        <div className="space-y-4">
          <Aviso titulo="O que este grafo afirma e o que não afirma">
            Ele mostra <strong>correlação comercial de cesta</strong>: o que costuma ser comprado
            junto, com base no histórico de pedidos. Ele opera no nível de sistema e família, e nunca
            desce a número de peça, marca ou modelo de veículo — isso exigiria catálogo validado.
          </Aviso>

          <GrafoOportunidadeCliente
            familiasCompradas={ctx.familiasCompradas}
            familias={dados.productFamilies}
            relacoes={dados.productRelations}
            correlacoes={correlacoes}
          />
        </div>
      )}

      {/* ---------------- EXECUÇÃO ---------------- */}
      {aba === 'EXECUCAO' && (
        <div className="space-y-4">
          <Card className="p-4">
            <TituloSecao>Promessas</TituloSecao>
            {ctx.promessas.length === 0 ? (
              <p className="text-sm text-bruto-ash">Nenhuma promessa registrada nesta conta.</p>
            ) : (
              <ul className="divide-y divide-bruto-steel">
                {[...ctx.promessas]
                  .sort((a, b) => b.dataPrometida.localeCompare(a.dataPrometida))
                  .map((p) => (
                    <li key={p.id} className="py-3 first:pt-0 flex justify-between gap-3 items-start">
                      <div className="min-w-0">
                        <p className="text-sm">{p.descricao}</p>
                        <p className="text-xs text-bruto-ash tabular">
                          Prometido para {formatarData(p.dataPrometida)} · {p.status.toLowerCase()}
                        </p>
                      </div>
                      {p.status === 'PENDENTE' && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            className="btn-secundario !min-h-[36px] !px-3 text-xs"
                            onClick={() => resolverPromessa(p.id, true)}
                          >
                            Cumprida
                          </button>
                          <button
                            className="btn-perigo !min-h-[36px] !px-3 text-xs"
                            onClick={() => resolverPromessa(p.id, false)}
                          >
                            Quebrada
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <TituloSecao>Tarefas</TituloSecao>
            {ctx.tarefas.filter((t) => t.status === 'ABERTA').length === 0 ? (
              <p className="text-sm text-bruto-ash">Nenhuma tarefa aberta.</p>
            ) : (
              <ul className="divide-y divide-bruto-steel">
                {ctx.tarefas
                  .filter((t) => t.status === 'ABERTA')
                  .map((t) => (
                    <li key={t.id} className="py-3 first:pt-0 flex justify-between gap-3 items-center">
                      <div className="min-w-0">
                        <p className="text-sm">{t.titulo}</p>
                        <p className="text-xs text-bruto-ash tabular">
                          Prazo {formatarData(t.prazo)}
                        </p>
                      </div>
                      <button
                        className="btn-secundario !min-h-[36px] !px-3 text-xs shrink-0"
                        onClick={() => concluirTarefa(t.id)}
                      >
                        Concluir
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <TituloSecao descricao="Registro rápido — o objetivo é menos de 20 segundos.">
              Registrar resultado
            </TituloSecao>
            <RegistroRapido
              customerId={ctx.customer.id}
              valorSugerido={Math.round(ctx.ticketMedio)}
              aoRegistrarInteracao={registrarInteracao}
              aoRegistrarPerda={registrarPerda}
              aoCriarPromessa={criarPromessa}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ListaHistorico({
  titulo,
  itens,
  vazio,
}: {
  titulo: string;
  itens: { id: string; data: string; principal: string; secundario: string }[];
  vazio: string;
}) {
  return (
    <Card className="p-4">
      <TituloSecao>{titulo}</TituloSecao>
      {itens.length === 0 ? (
        <p className="text-sm text-bruto-ash">{vazio}</p>
      ) : (
        <ul className="divide-y divide-bruto-steel">
          {itens.map((i) => (
            <li key={i.id} className="py-2 first:pt-0 flex justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate">{i.principal}</p>
                <p className="text-xs text-bruto-ash">{i.secundario}</p>
              </div>
              <span className="text-xs text-bruto-ash tabular shrink-0">
                {formatarData(i.data)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function GrafoOportunidadeCliente({
  familias,
  relacoes,
  correlacoes,
  familiasCompradas,
}: {
  familias: { id: string; nome: string; sistema: SistemaVeicular }[];
  relacoes: Parameters<typeof montarGrafo>[2];
  correlacoes: Parameters<typeof montarGrafo>[3];
  familiasCompradas: Set<string>;
}) {
  const sistemas = useMemo(
    () => [...new Set(familias.map((f) => f.sistema))] as SistemaVeicular[],
    [familias],
  );
  const [sistema, setSistema] = useState<SistemaVeicular>(sistemas[0]);

  const grafo = useMemo(
    () =>
      montarGrafo(
        sistema,
        familias as Parameters<typeof montarGrafo>[1],
        relacoes,
        correlacoes,
        familiasCompradas,
      ),
    [sistema, familias, relacoes, correlacoes, familiasCompradas],
  );

  const nomePorId = new Map(familias.map((f) => [f.id, f.nome]));

  const perguntas = useMemo(() => {
    const doSistema = familias.filter((f) => f.sistema === sistema && familiasCompradas.has(f.id));
    return doSistema.flatMap((f) =>
      perguntasDeVendaCompleta(
        f.id,
        familias as Parameters<typeof perguntasDeVendaCompleta>[1],
        grafo.arestas,
        familiasCompradas,
      ),
    );
  }, [familias, sistema, familiasCompradas, grafo.arestas]);

  return (
    <>
      <Card className="p-4">
        <TituloSecao descricao="Sistema → Família → Família correlata. O grafo nunca desce a nível de peça.">
          Grafo de oportunidade
        </TituloSecao>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {sistemas.map((s) => (
            <button
              key={s}
              onClick={() => setSistema(s)}
              aria-pressed={sistema === s}
              className={`shrink-0 rounded-lg px-3 min-h-[38px] text-xs font-semibold ${
                sistema === s
                  ? 'bg-bruto-yellow text-bruto-black'
                  : 'border border-bruto-steel text-bruto-ash'
              }`}
            >
              {ROTULO_SISTEMA[s]}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {grafo.arestas.length === 0 ? (
            <p className="text-sm text-bruto-ash">
              Nenhuma correlação com suporte suficiente neste sistema. São necessários pelo menos 3
              pedidos com a família de origem.
            </p>
          ) : (
            grafo.arestas.slice(0, 8).map((a) => (
              <div
                key={`${a.origemFamilyId}-${a.destinoFamilyId}`}
                className="rounded-lg border border-bruto-steel p-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium">
                    {nomePorId.get(a.origemFamilyId)}{' '}
                    <span className="text-bruto-ash" aria-hidden="true">
                      →
                    </span>{' '}
                    {nomePorId.get(a.destinoFamilyId)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-bruto-ash">
                      {ROTULO_TIPO_RELACAO[a.tipo]}
                    </span>
                    <SeloProcedencia valor={a.procedencia} />
                  </div>
                </div>
                <p className="text-xs text-bruto-ash mt-1 tabular">
                  Suporte {Math.round(a.suporte * 100)}%
                  {a.pedidosObservados !== null && ` · ${a.pedidosObservados} pedidos observados`}
                  {a.procedencia === 'DEMONSTRACAO' && ' · valor ilustrativo'}
                </p>
                <p className="text-sm text-bruto-yellow mt-1.5">{a.perguntaSugerida}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-4">
        <TituloSecao descricao="Venda completa não é venda casada: o objetivo é impedir que a oficina abra o conjunto duas vezes.">
          Perguntas de venda completa
        </TituloSecao>
        {perguntas.length === 0 ? (
          <p className="text-sm text-bruto-ash">
            Nenhuma família deste sistema foi comprada por este cliente, ou ele já compra todas as
            correlatas.
          </p>
        ) : (
          <ul className="space-y-2">
            {perguntas.slice(0, 6).map((p) => (
              <li key={p.familia.id} className="rounded-lg border border-bruto-steel p-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium">{p.familia.nome}</p>
                  <SeloProcedencia valor={p.procedencia} />
                </div>
                <p className="text-sm text-bruto-yellow mt-1">{p.pergunta}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

/** Registro em uma tela: útil, promessa ou perda. Meta de 20 segundos. */
function RegistroRapido({
  customerId,
  valorSugerido,
  aoRegistrarInteracao,
  aoRegistrarPerda,
  aoCriarPromessa,
}: {
  customerId: string;
  valorSugerido: number;
  aoRegistrarInteracao: ReturnType<typeof useApp>['registrarInteracao'];
  aoRegistrarPerda: ReturnType<typeof useApp>['registrarPerda'];
  aoCriarPromessa: ReturnType<typeof useApp>['criarPromessa'];
}) {
  const referencia = useMemo(() => hoje(), []);
  const [modo, setModo] = useState<'INTERACAO' | 'PROMESSA' | 'PERDA'>('INTERACAO');
  const [resumo, setResumo] = useState('');
  const [util, setUtil] = useState(true);
  const [urgente, setUrgente] = useState(false);
  const [descricaoPromessa, setDescricaoPromessa] = useState('');
  const [prazoPromessa, setPrazoPromessa] = useState(somarDias(referencia, 1));
  const [motivo, setMotivo] = useState<MotivoPerda>('PRECO');
  const [valorPerda, setValorPerda] = useState(String(valorSugerido));
  const [recuperavel, setRecuperavel] = useState(true);
  const [mensagem, setMensagem] = useState('');

  return (
    <div className="border-t border-bruto-steel pt-4 space-y-3">
      <div className="flex gap-1.5">
        {(
          [
            ['INTERACAO', 'Contato'],
            ['PROMESSA', 'Promessa'],
            ['PERDA', 'Perda'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => {
              setModo(valor);
              setMensagem('');
            }}
            aria-pressed={modo === valor}
            className={`flex-1 rounded-lg min-h-[44px] text-sm font-semibold ${
              modo === valor
                ? 'bg-bruto-yellow text-bruto-black'
                : 'border border-bruto-steel text-bruto-ash'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {mensagem && <p className="text-sm text-bruto-green">{mensagem}</p>}

      {modo === 'INTERACAO' && (
        <div className="space-y-2">
          <label htmlFor="resumo" className="rotulo block">
            O que aconteceu
          </label>
          <input
            id="resumo"
            className="campo"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            placeholder="Ex.: confirmou reposição para a semana que vem"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={util} onChange={(e) => setUtil(e.target.checked)} />
              Contato útil
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={urgente}
                onChange={(e) => setUrgente(e.target.checked)}
              />
              Urgência / veículo parado
            </label>
          </div>
          <button
            className="btn-primario w-full"
            disabled={resumo.trim().length === 0}
            onClick={async () => {
              await aoRegistrarInteracao({
                customerId,
                tipo: 'LIGACAO',
                data: referencia,
                util,
                urgente,
                resumo: resumo.trim(),
              });
              setResumo('');
              setMensagem('Contato registrado.');
            }}
          >
            Registrar contato
          </button>
        </div>
      )}

      {modo === 'PROMESSA' && (
        <div className="space-y-2">
          <label htmlFor="promessa" className="rotulo block">
            O que você prometeu
          </label>
          <input
            id="promessa"
            className="campo"
            value={descricaoPromessa}
            onChange={(e) => setDescricaoPromessa(e.target.value)}
            placeholder="Ex.: retornar com prazo confirmado"
          />
          <label htmlFor="prazo" className="rotulo block">
            Para quando
          </label>
          <input
            id="prazo"
            type="date"
            className="campo"
            value={prazoPromessa}
            onChange={(e) => setPrazoPromessa(e.target.value)}
          />
          <button
            className="btn-primario w-full"
            disabled={descricaoPromessa.trim().length === 0}
            onClick={async () => {
              await aoCriarPromessa({
                customerId,
                descricao: descricaoPromessa.trim(),
                dataPrometida: prazoPromessa,
              });
              setDescricaoPromessa('');
              setMensagem('Promessa registrada. Ela vira alerta crítico se vencer.');
            }}
          >
            Registrar promessa
          </button>
        </div>
      )}

      {modo === 'PERDA' && (
        <div className="space-y-2">
          <span className="rotulo block">Motivo real da perda</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {MOTIVOS_PERDA.map((m) => (
              <button
                key={m.valor}
                onClick={() => setMotivo(m.valor)}
                aria-pressed={motivo === m.valor}
                className={`rounded-lg min-h-[44px] px-2 text-xs font-semibold ${
                  motivo === m.valor
                    ? 'bg-bruto-yellow text-bruto-black'
                    : 'border border-bruto-steel text-bruto-ash'
                }`}
              >
                {m.rotulo}
              </button>
            ))}
          </div>
          <p className="text-xs text-bruto-ash">
            Gargalo associado: {MOTIVOS_PERDA.find((m) => m.valor === motivo)?.gargalo}
          </p>
          <label htmlFor="valor-perda" className="rotulo block">
            Valor estimado
          </label>
          <input
            id="valor-perda"
            type="number"
            min="0"
            className="campo tabular"
            value={valorPerda}
            onChange={(e) => setValorPerda(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={recuperavel}
              onChange={(e) => setRecuperavel(e.target.checked)}
            />
            Recuperável
          </label>
          <button
            className="btn-primario w-full"
            onClick={async () => {
              await aoRegistrarPerda({
                customerId,
                data: referencia,
                motivo,
                valorEstimado: Number(valorPerda) || 0,
                familyId: null,
                recuperavel,
                detalhe: '',
              });
              setMensagem('Perda registrada. Ela entra no ranking de motivos.');
            }}
          >
            Registrar perda
          </button>
        </div>
      )}
    </div>
  );
}
