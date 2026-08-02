/**
 * Cockpit do Dia.
 *
 * Ordem de leitura obrigatória (docs/INFORMATION_ARCHITECTURE.md §3):
 * status → ANDON crítico → Top 3 → compromissos → modos → mapa → debriefing.
 *
 * ANDON vem ANTES do Top 3 de propósito: um veículo parado invalida o plano do dia.
 * Colocar o plano antes da anormalidade é o erro que a aviação corrigiu há décadas.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../state/store';
import { selecionarTop3 } from '../../domain/engine/recommendations';
import { CardAcao } from '../components/CardAcao';
import { CardAlerta } from '../components/CardAlerta';
import { Aviso, Card, EstadoVazio, Metrica, Rotulo, TituloSecao } from '../components/primitives';
import { MapaCalorCidades } from '../charts';
import { diasEntre, formatarData, formatarMoeda, hoje } from '../../domain/dates';

const MODOS = [
  {
    id: 'veiculo-parado',
    titulo: 'Veículo parado',
    descricao: 'Captura rápida para urgência, com cronômetro operacional.',
    para: '/app/diagnostico?modo=veiculo-parado',
  },
  {
    id: 'recuperar-orcamento',
    titulo: 'Recuperar orçamento',
    descricao: 'Orçamentos em risco, ordenados por valor e tempo parado.',
    para: '/app/acoes?modo=recuperar-orcamento',
  },
  {
    id: 'carteira-esquecida',
    titulo: 'Carteira esquecida',
    descricao: 'Contas sem atividade, classificadas por potencial e histórico.',
    para: '/app/carteira?modo=carteira-esquecida',
  },
  {
    id: 'venda-completa',
    titulo: 'Venda completa',
    descricao: 'Perguntas para verificar se falta item do mesmo sistema.',
    para: '/app/diagnostico?modo=venda-completa',
  },
];

/** O card de debriefing só aparece após as 16h: às 8h ele seria ruído por sete horas. */
const HORA_DEBRIEFING = 16;

export function Cockpit() {
  const {
    temDados,
    carregando,
    erro,
    contextos,
    recomendacoes,
    alertas,
    dados,
    settings,
    carregarDemonstracao,
  } = useApp();
  const navegar = useNavigate();
  const referencia = useMemo(() => hoje(), []);
  const [carregandoDemo, setCarregandoDemo] = useState(false);

  const criticos = alertas.filter((a) => a.severidade === 'CRITICO');
  const top3 = selecionarTop3(recomendacoes);

  const idsClientes = useMemo(() => new Set(contextos.map((c) => c.customer.id)), [contextos]);

  const compromissos = useMemo(() => {
    const promessas = dados.promessas
      .filter(
        (p) =>
          p.status === 'PENDENTE' &&
          idsClientes.has(p.customerId) &&
          diasEntre(p.dataPrometida, referencia) >= 0,
      )
      .sort((a, b) => a.dataPrometida.localeCompare(b.dataPrometida));
    const tarefas = dados.tasks
      .filter(
        (t) =>
          t.status === 'ABERTA' &&
          (t.customerId === null || idsClientes.has(t.customerId)) &&
          diasEntre(t.prazo, referencia) >= 0,
      )
      .sort((a, b) => a.prazo.localeCompare(b.prazo));
    return { promessas, tarefas };
  }, [dados.promessas, dados.tasks, idsClientes, referencia]);

  const cidades = useMemo(() => {
    const mapa = new Map<string, { cidade: string; uf: string; clientes: number; emAcao: number }>();
    const comAcao = new Set(recomendacoes.map((r) => r.customerId));
    for (const ctx of contextos) {
      const chave = `${ctx.customer.cidade}/${ctx.customer.uf}`;
      const atual = mapa.get(chave) ?? {
        cidade: ctx.customer.cidade,
        uf: ctx.customer.uf,
        clientes: 0,
        emAcao: 0,
      };
      atual.clientes += 1;
      if (comAcao.has(ctx.customer.id)) atual.emAcao += 1;
      mapa.set(chave, atual);
    }
    return [...mapa.values()].sort((a, b) => b.clientes - a.clientes);
  }, [contextos, recomendacoes]);

  const valorEmJogo = recomendacoes.reduce((s, r) => s + r.valorPotencial, 0);
  const mostrarDebriefing = new Date().getHours() >= HORA_DEBRIEFING;

  if (carregando) {
    return <p className="text-bruto-ash">Abrindo o banco local…</p>;
  }

  if (erro) {
    return (
      <EstadoVazio
        titulo="Não foi possível abrir o armazenamento local"
        descricao={`${erro} Isso costuma acontecer em janela anônima ou com armazenamento de site bloqueado. O BRUTO OS precisa do IndexedDB para funcionar offline.`}
      />
    );
  }

  if (!temDados) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Cockpit do Dia</h1>
        <EstadoVazio
          titulo="Sua carteira está vazia"
          descricao="O BRUTO OS não inventa dados. Escolha por onde começar — dá para cadastrar um cliente agora mesmo, sem planilha nenhuma."
          acao={
            <>
              <Link to="/app/carteira" className="btn-primario">
                Cadastrar meu primeiro cliente
              </Link>
              <button
                className="btn-secundario"
                disabled={carregandoDemo}
                onClick={async () => {
                  setCarregandoDemo(true);
                  await carregarDemonstracao();
                  setCarregandoDemo(false);
                }}
              >
                {carregandoDemo ? 'Carregando…' : 'Ver com dados de demonstração'}
              </button>
              <Link to="/app/dados" className="btn-secundario">
                Importar CSV
              </Link>
            </>
          }
        />

        <Card className="p-4">
          <Rotulo>Como o sistema começa a funcionar</Rotulo>
          <ol className="mt-2 space-y-1.5 text-sm text-bruto-ash list-decimal list-inside">
            <li>Cadastre um cliente — só o nome é obrigatório.</li>
            <li>
              Registre as compras que ele já fez. <strong className="text-bruto-white">São
              necessárias 4</strong> para o motor calcular a cadência e dizer quando ligar.
            </li>
            <li>
              Com menos de 4, ele mostra &ldquo;sem base&rdquo; em vez de inventar uma previsão —
              e diz qual pergunta cria essa base.
            </li>
          </ol>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Faixa de status do dia */}
      <section>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">Cockpit do Dia</h1>
          <p className="text-sm text-bruto-ash tabular">{formatarData(referencia)}</p>
        </div>

        <Card className="mt-3 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Metrica
              rotulo="Ações na fila"
              valor={String(recomendacoes.length)}
              detalhe={`meta de execução: ${settings.metaExecucaoDiaria}`}
              destaque
            />
            <Metrica
              rotulo="Alertas críticos"
              valor={String(criticos.length)}
              detalhe={criticos.length > 0 ? 'exigem ação hoje' : 'nada crítico agora'}
            />
            <Metrica
              rotulo="Compromissos hoje"
              valor={String(compromissos.promessas.length + compromissos.tarefas.length)}
              detalhe="promessas e tarefas"
            />
            <Metrica
              rotulo="Potencial em jogo"
              valor={formatarMoeda(valorEmJogo)}
              detalhe="estimado, soma da fila"
            />
          </div>

          {top3.length > 0 && (
            <button
              className="btn-primario w-full mt-4"
              onClick={() => navegar(`/app/cliente/${top3[0].customerId}?preparar=1`)}
            >
              Iniciar próxima ação
            </button>
          )}
        </Card>
      </section>

      {/* 2. ANDON crítico — antes do plano do dia */}
      <section>
        <TituloSecao
          descricao="Anormalidades que exigem ação hoje. Máximo de três, um alerta por conta."
          acao={
            <Link to="/app/andon" className="btn-fantasma !min-h-[36px] text-xs">
              Ver painel
            </Link>
          }
        >
          Painel ANDON
        </TituloSecao>

        {criticos.length > 0 ? (
          <div className="space-y-3">
            {criticos.map((a) => (
              <CardAlerta key={a.id} alerta={a} compacto />
            ))}
          </div>
        ) : (
          <Card className="p-4">
            <p className="text-sm">
              Nenhuma anormalidade crítica.{' '}
              <span className="text-bruto-ash">
                {alertas.length > 0
                  ? `${alertas.length} alerta(s) de atenção e informação no painel.`
                  : 'A carteira está estável.'}
              </span>
            </p>
          </Card>
        )}
      </section>

      {/* 3. Top 3 */}
      <section>
        <TituloSecao
          descricao="Ordenadas por tipo de ação e depois por prioridade. Urgência sempre vem antes de oportunidade maior."
          acao={
            <Link to="/app/acoes" className="btn-fantasma !min-h-[36px] text-xs">
              Fila completa
            </Link>
          }
        >
          Top 3 próximas ações
        </TituloSecao>

        {top3.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {top3.map((r) => (
              <CardAcao key={r.id} recomendacao={r} destaque />
            ))}
          </div>
        ) : recomendacoes.length > 0 ? (
          // A fila NÃO está vazia — as ações existem, mas nenhuma tem confiança suficiente
          // para ocupar o topo do dia. Esconder isso contradiria o contador logo acima e
          // faria o vendedor achar que o sistema perdeu as contas dele.
          <div className="space-y-3">
            <Aviso tom="atencao" titulo="Nenhuma ação com confiança alta o bastante para o topo do dia">
              As {recomendacoes.length} ação(ões) da fila dependem de dados que ainda faltam. Elas
              aparecem abaixo com a lacuna em destaque — feche a lacuna e elas sobem para o Top 3.
            </Aviso>
            <div className="grid gap-3 lg:grid-cols-3">
              {recomendacoes.slice(0, 3).map((r) => (
                <CardAcao key={r.id} recomendacao={r} destaque />
              ))}
            </div>
          </div>
        ) : (
          <EstadoVazio
            titulo="Sua carteira está dentro do ciclo"
            descricao="Nenhuma conta exige ação agora. Isso é um resultado válido, não uma tela vazia — use a Carteira Esquecida para trabalhar contas de longo prazo."
            acao={
              <Link to="/app/carteira?modo=carteira-esquecida" className="btn-secundario">
                Ver carteira esquecida
              </Link>
            }
          />
        )}
      </section>

      {/* 4. Compromissos */}
      <section>
        <TituloSecao descricao="Promessas e tarefas com prazo em aberto.">
          Compromissos
        </TituloSecao>
        <Card className="p-4">
          {compromissos.promessas.length === 0 && compromissos.tarefas.length === 0 ? (
            <p className="text-sm text-bruto-ash">
              Nenhum compromisso com prazo aberto. Promessas vencidas, se houver, aparecem no ANDON.
            </p>
          ) : (
            <ul className="divide-y divide-bruto-steel">
              {compromissos.promessas.map((p) => (
                <li key={p.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">{p.descricao}</p>
                    <Link
                      to={`/app/cliente/${p.customerId}`}
                      className="text-xs text-bruto-ash hover:text-bruto-yellow"
                    >
                      {contextosNome(contextos, p.customerId)}
                    </Link>
                  </div>
                  <span className="text-xs text-bruto-ash tabular shrink-0">
                    {formatarData(p.dataPrometida)}
                  </span>
                </li>
              ))}
              {compromissos.tarefas.map((t) => (
                <li key={t.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">{t.titulo}</p>
                    {t.customerId && (
                      <Link
                        to={`/app/cliente/${t.customerId}`}
                        className="text-xs text-bruto-ash hover:text-bruto-yellow"
                      >
                        {contextosNome(contextos, t.customerId)}
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-bruto-ash tabular shrink-0">
                    {formatarData(t.prazo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* 5. Modos de foco */}
      <section>
        <TituloSecao descricao="Lentes sobre a mesma carteira, não telas separadas.">
          Modos de foco
        </TituloSecao>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MODOS.map((m) => (
            <Link
              key={m.id}
              to={m.para}
              className="card p-4 hover:border-bruto-yellow transition-colors"
            >
              <p className="font-semibold text-sm">{m.titulo}</p>
              <p className="text-xs text-bruto-ash mt-1 leading-relaxed">{m.descricao}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Mapa da carteira */}
      <section>
        <TituloSecao descricao="Concentração de contas por cidade e quanto de cada praça exige ação.">
          Carteira por praça
        </TituloSecao>
        <Card className="p-4">
          <MapaCalorCidades
            cidades={cidades}
            aoSelecionar={(cidade) =>
              navegar(`/app/carteira?cidade=${encodeURIComponent(cidade)}`)
            }
          />
        </Card>
      </section>

      {/* 7. Debriefing — só depois das 16h */}
      {mostrarDebriefing && (
        <section>
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <Rotulo>Fim do expediente</Rotulo>
              <p className="font-semibold mt-0.5">Debriefing do dia</p>
              <p className="text-sm text-bruto-ash">
                Já vem preenchido com o que você registrou hoje. Meta: 60 segundos.
              </p>
            </div>
            <Link to="/app/debriefing" className="btn-primario shrink-0">
              Fazer debriefing
            </Link>
          </Card>
        </section>
      )}
    </div>
  );
}

function contextosNome(
  contextos: { customer: { id: string; nomeFantasia: string } }[],
  id: string,
): string {
  return contextos.find((c) => c.customer.id === id)?.customer.nomeFantasia ?? id;
}
