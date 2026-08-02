/**
 * Estado da aplicação.
 *
 * Sem biblioteca de estado global: Context + useReducer resolve o caso deste produto
 * (um dataset carregado uma vez, mutações pontuais) sem adicionar dezenas de kB e uma
 * dependência de cadeia de suprimentos. Ver docs/SECURITY.md §8.
 *
 * Regra central: recomendações e alertas NÃO são estado. São derivados por `useMemo`
 * a partir do dataset e das configurações. Persistir score criaria estado obsoleto e
 * tornaria impossível recalibrar pesos e ver o efeito imediatamente.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type {
  Alert,
  AlertAck,
  DailyDebrief,
  Dataset,
  Interaction,
  LostSale,
  MotivoRejeicao,
  PapelUsuario,
  Promessa,
  Recommendation,
  RecommendationFeedback,
  Settings,
  Task,
} from '../domain/types';
import { datasetVazio, SETTINGS_PADRAO } from '../domain/types';
import {
  apagarBanco,
  carregarConfiguracoes,
  carregarDataset,
  limparDemonstracao,
  salvarConfiguracoes,
  salvarDataset,
} from '../data/db';
import { gerarDadosDemo } from '../domain/seed';
import { construirTodosContextos, type CustomerContext } from '../domain/engine/context';
import { gerarRecomendacoes, ordenarRecomendacoes } from '../domain/engine/recommendations';
import { chaveAlerta, gerarAlertas } from '../domain/engine/andon';
import { hoje } from '../domain/dates';

/** Desfecho registrado nesta sessão para uma recomendação. */
export interface ResolucaoRecomendacao {
  recomendacao: Recommendation;
  aceita: boolean;
  motivo: MotivoRejeicao | null;
}

type Acao =
  | { tipo: 'CARREGADO'; dados: Dataset; settings: Settings }
  | { tipo: 'DEFINIR_DADOS'; dados: Dataset }
  | { tipo: 'DEFINIR_SETTINGS'; settings: Settings }
  | { tipo: 'ERRO'; mensagem: string };

interface EstadoInterno {
  dados: Dataset;
  settings: Settings;
  carregando: boolean;
  erro: string | null;
}

const estadoInicial: EstadoInterno = {
  dados: datasetVazio(),
  settings: SETTINGS_PADRAO,
  carregando: true,
  erro: null,
};

function redutor(estado: EstadoInterno, acao: Acao): EstadoInterno {
  switch (acao.tipo) {
    case 'CARREGADO':
      return { dados: acao.dados, settings: acao.settings, carregando: false, erro: null };
    case 'DEFINIR_DADOS':
      return { ...estado, dados: acao.dados };
    case 'DEFINIR_SETTINGS':
      return { ...estado, settings: acao.settings };
    case 'ERRO':
      return { ...estado, carregando: false, erro: acao.mensagem };
  }
}

export interface EstadoApp {
  dados: Dataset;
  settings: Settings;
  carregando: boolean;
  erro: string | null;

  papel: PapelUsuario;
  definirPapel: (papel: PapelUsuario) => void;
  /** Null quando o papel é GESTOR: vê todas as carteiras. */
  sellerAtivoId: string | null;

  contextos: CustomerContext[];
  /**
   * Fila do motor MAIS as recomendações resolvidas nesta sessão. Sem isso, aceitar ou
   * rejeitar faria o card sumir silenciosamente — o motor recalcula na hora e a
   * recomendação deixa de existir. O vendedor precisa ver a confirmação do que fez.
   */
  recomendacoes: Recommendation[];
  /** Desfecho dado pelo vendedor nesta sessão, por id de recomendação. */
  resolucaoDe: (recomendacaoId: string) => ResolucaoRecomendacao | null;
  alertas: Alert[];
  contextoPorCliente: Map<string, CustomerContext>;
  /** Dados de demonstração ativos — controla o selo persistente. */
  temDadosDemo: boolean;
  temDados: boolean;

  carregarDemonstracao: () => Promise<void>;
  removerDemonstracao: () => Promise<void>;
  apagarTudo: () => Promise<void>;
  substituirDados: (dados: Dataset) => Promise<void>;
  atualizarSettings: (settings: Settings) => Promise<void>;

  registrarFeedback: (
    recomendacao: Recommendation,
    aceita: boolean,
    motivo: MotivoRejeicao | null,
    comentario: string,
  ) => Promise<void>;
  reconhecerAlerta: (alerta: Alert, motivo: string) => Promise<void>;
  registrarInteracao: (interacao: Omit<Interaction, 'id'>) => Promise<void>;
  registrarPerda: (perda: Omit<LostSale, 'id'>) => Promise<void>;
  criarPromessa: (promessa: Omit<Promessa, 'id' | 'criadaEm' | 'status'>) => Promise<void>;
  resolverPromessa: (id: string, cumprida: boolean) => Promise<void>;
  criarTarefa: (tarefa: Omit<Task, 'id' | 'criadaEm' | 'status'>) => Promise<void>;
  concluirTarefa: (id: string) => Promise<void>;
  salvarDebriefing: (debrief: Omit<DailyDebrief, 'id'>) => Promise<void>;
}

const ContextoApp = createContext<EstadoApp | null>(null);

function novoId(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function ProvedorApp({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(redutor, estadoInicial);
  const [papel, definirPapel] = useState<PapelUsuario>('VENDEDOR_INTERNO');
  const referencia = useMemo(() => hoje(), []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [dados, settings] = await Promise.all([carregarDataset(), carregarConfiguracoes()]);
        if (!cancelado) despachar({ tipo: 'CARREGADO', dados, settings });
      } catch (e) {
        if (!cancelado) {
          despachar({
            tipo: 'ERRO',
            mensagem:
              e instanceof Error
                ? `Não foi possível abrir o banco local: ${e.message}`
                : 'Não foi possível abrir o banco local.',
          });
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const sellerAtivoId = papel === 'GESTOR' ? null : estado.settings.sellerAtivoId;

  const contextos = useMemo(
    () => construirTodosContextos(estado.dados, sellerAtivoId, referencia),
    [estado.dados, sellerAtivoId, referencia],
  );

  const contextoPorCliente = useMemo(
    () => new Map(contextos.map((c) => [c.customer.id, c])),
    [contextos],
  );

  const recomendacoesDoMotor = useMemo(
    () =>
      gerarRecomendacoes(contextos, {
        familias: estado.dados.productFamilies,
        settings: estado.settings,
        feedback: estado.dados.recommendationFeedback,
        referencia,
      }),
    [contextos, estado.dados.productFamilies, estado.dados.recommendationFeedback, estado.settings, referencia],
  );

  // Resolvidas nesta sessão. Não persiste: é memória de tela, não de negócio —
  // o que persiste é o RecommendationFeedback.
  const [resolucoes, definirResolucoes] = useState<Map<string, ResolucaoRecomendacao>>(
    () => new Map(),
  );

  const recomendacoesExibidas = useMemo(() => {
    const atuais = new Set(recomendacoesDoMotor.map((r) => r.id));
    const removidas = [...resolucoes.values()]
      .filter((r) => !atuais.has(r.recomendacao.id))
      .map((r) => r.recomendacao);
    return removidas.length === 0
      ? recomendacoesDoMotor
      : ordenarRecomendacoes([...recomendacoesDoMotor, ...removidas]);
  }, [recomendacoesDoMotor, resolucoes]);

  const resolucaoDe = useCallback(
    (id: string) => resolucoes.get(id) ?? null,
    [resolucoes],
  );

  const alertas = useMemo(
    () =>
      gerarAlertas(contextos, {
        settings: estado.settings,
        familias: estado.dados.productFamilies,
        acks: estado.dados.alertAcks,
        referencia,
      }),
    [contextos, estado.settings, estado.dados.productFamilies, estado.dados.alertAcks, referencia],
  );

  const persistir = useCallback(async (dados: Dataset) => {
    despachar({ tipo: 'DEFINIR_DADOS', dados });
    await salvarDataset(dados);
  }, []);

  const carregarDemonstracao = useCallback(async () => {
    const demo = gerarDadosDemo(referencia);
    // Preserva dados importados, se existirem, acrescentando a demonstração.
    await persistir(demo);
  }, [persistir, referencia]);

  const removerDemonstracao = useCallback(async () => {
    const limpo = await limparDemonstracao(estado.dados);
    despachar({ tipo: 'DEFINIR_DADOS', dados: limpo });
  }, [estado.dados]);

  const apagarTudo = useCallback(async () => {
    await apagarBanco();
    despachar({ tipo: 'DEFINIR_DADOS', dados: datasetVazio() });
  }, []);

  const substituirDados = useCallback(
    async (dados: Dataset) => {
      await persistir(dados);
    },
    [persistir],
  );

  const atualizarSettings = useCallback(async (settings: Settings) => {
    despachar({ tipo: 'DEFINIR_SETTINGS', settings });
    await salvarConfiguracoes(settings);
  }, []);

  const registrarFeedback = useCallback<EstadoApp['registrarFeedback']>(
    async (recomendacao, aceita, motivo, comentario) => {
      const { customerId, tipo } = recomendacao;
      definirResolucoes((atual) => {
        const proximo = new Map(atual);
        proximo.set(recomendacao.id, { recomendacao, aceita, motivo });
        return proximo;
      });

      const registro: RecommendationFeedback = {
        id: novoId('fbk'),
        customerId,
        tipo,
        aceita,
        motivo,
        comentario,
        data: referencia,
      };
      const dados: Dataset = {
        ...estado.dados,
        recommendationFeedback: [...estado.dados.recommendationFeedback, registro],
        auditEvents: [
          ...estado.dados.auditEvents,
          {
            id: novoId('aud'),
            data: referencia,
            tipo: 'FEEDBACK',
            descricao: `Recomendação ${tipo} ${aceita ? 'aceita' : `rejeitada (${motivo ?? 'sem motivo'})`}`,
            entidade: 'Customer',
            entidadeId: customerId,
          },
        ],
      };
      // Aceitar gera tarefa: a recomendação vira execução, não some da tela.
      if (aceita) {
        dados.tasks = [
          ...dados.tasks,
          {
            id: novoId('tsk'),
            customerId,
            titulo: `Executar ação recomendada (${tipo.toLowerCase()})`,
            prazo: referencia,
            status: 'ABERTA',
            origemRecommendationId: recomendacao.id,
            criadaEm: referencia,
          },
        ];
      }
      await persistir(dados);
    },
    [estado.dados, persistir, referencia],
  );

  const reconhecerAlerta = useCallback<EstadoApp['reconhecerAlerta']>(
    async (alerta, motivo) => {
      const ack: AlertAck = {
        id: novoId('ack'),
        alertKey: chaveAlerta(alerta.customerId, alerta.tipo),
        customerId: alerta.customerId,
        motivo,
        data: referencia,
      };
      await persistir({ ...estado.dados, alertAcks: [...estado.dados.alertAcks, ack] });
    },
    [estado.dados, persistir, referencia],
  );

  const registrarInteracao = useCallback<EstadoApp['registrarInteracao']>(
    async (interacao) => {
      await persistir({
        ...estado.dados,
        interactions: [...estado.dados.interactions, { ...interacao, id: novoId('int') }],
      });
    },
    [estado.dados, persistir],
  );

  const registrarPerda = useCallback<EstadoApp['registrarPerda']>(
    async (perda) => {
      await persistir({
        ...estado.dados,
        lostSales: [...estado.dados.lostSales, { ...perda, id: novoId('prd') }],
      });
    },
    [estado.dados, persistir],
  );

  const criarPromessa = useCallback<EstadoApp['criarPromessa']>(
    async (promessa) => {
      await persistir({
        ...estado.dados,
        promessas: [
          ...estado.dados.promessas,
          { ...promessa, id: novoId('prm'), criadaEm: referencia, status: 'PENDENTE' },
        ],
      });
    },
    [estado.dados, persistir, referencia],
  );

  const resolverPromessa = useCallback<EstadoApp['resolverPromessa']>(
    async (id, cumprida) => {
      await persistir({
        ...estado.dados,
        promessas: estado.dados.promessas.map((p) =>
          p.id === id ? { ...p, status: cumprida ? 'CUMPRIDA' : 'QUEBRADA' } : p,
        ),
      });
    },
    [estado.dados, persistir],
  );

  const criarTarefa = useCallback<EstadoApp['criarTarefa']>(
    async (tarefa) => {
      await persistir({
        ...estado.dados,
        tasks: [
          ...estado.dados.tasks,
          { ...tarefa, id: novoId('tsk'), criadaEm: referencia, status: 'ABERTA' },
        ],
      });
    },
    [estado.dados, persistir, referencia],
  );

  const concluirTarefa = useCallback<EstadoApp['concluirTarefa']>(
    async (id) => {
      await persistir({
        ...estado.dados,
        tasks: estado.dados.tasks.map((t) => (t.id === id ? { ...t, status: 'CONCLUIDA' } : t)),
      });
    },
    [estado.dados, persistir],
  );

  const salvarDebriefing = useCallback<EstadoApp['salvarDebriefing']>(
    async (debrief) => {
      const semDoDia = estado.dados.debriefs.filter(
        (d) => !(d.data === debrief.data && d.sellerId === debrief.sellerId),
      );
      await persistir({
        ...estado.dados,
        debriefs: [...semDoDia, { ...debrief, id: novoId('dbf') }],
      });
    },
    [estado.dados, persistir],
  );

  const temDadosDemo = estado.dados.customers.some((c) => c.origem === 'DEMONSTRACAO');
  const temDados = estado.dados.customers.length > 0;

  const valor: EstadoApp = {
    dados: estado.dados,
    settings: estado.settings,
    carregando: estado.carregando,
    erro: estado.erro,
    papel,
    definirPapel,
    sellerAtivoId,
    contextos,
    recomendacoes: recomendacoesExibidas,
    resolucaoDe,
    alertas,
    contextoPorCliente,
    temDadosDemo,
    temDados,
    carregarDemonstracao,
    removerDemonstracao,
    apagarTudo,
    substituirDados,
    atualizarSettings,
    registrarFeedback,
    reconhecerAlerta,
    registrarInteracao,
    registrarPerda,
    criarPromessa,
    resolverPromessa,
    criarTarefa,
    concluirTarefa,
    salvarDebriefing,
  };

  return <ContextoApp.Provider value={valor}>{children}</ContextoApp.Provider>;
}

export function useApp(): EstadoApp {
  const contexto = useContext(ContextoApp);
  if (!contexto) {
    throw new Error('useApp precisa estar dentro de <ProvedorApp>.');
  }
  return contexto;
}
