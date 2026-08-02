/**
 * Diagnóstico Guiado (12 etapas) + Modo Veículo Parado + Modo Venda Completa.
 *
 * O sistema NUNCA conclui uma peça. A saída separa fisicamente:
 * confirmado / estimado / ausente / hipótese com validação necessária.
 * Ver docs/USER_JOURNEYS.md J5 e docs/CRITICAL_REVIEW.md §1.4.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../state/store';
import { Aviso, Card, EstadoVazio, Rotulo, TituloSecao } from '../components/primitives';
import { ROTULO_SISTEMA, calcularCorrelacaoDeCesta, montarGrafo } from '../../domain/engine/graph';
import {
  ROTULO_PERFIL_OPERACAO,
  ROTULO_TIPO_CLIENTE,
  type SistemaVeicular,
  type TipoCliente,
} from '../../domain/types';
import { hoje, somarDias } from '../../domain/dates';

interface Etapa {
  chave: keyof RespostasDiagnostico;
  rotulo: string;
  pergunta: string;
  tipo: 'texto' | 'numero' | 'opcoes';
  opcoes?: { valor: string; rotulo: string }[];
  /** Etapa cuja ausência impede qualquer conclusão. */
  critica: boolean;
}

interface RespostasDiagnostico {
  tipoCliente: string;
  veiculo: string;
  marca: string;
  modelo: string;
  ano: string;
  motor: string;
  sistema: string;
  sintoma: string;
  urgencia: string;
  operacao: string;
  pecaSolicitada: string;
  instalador: string;
}

const VAZIO: RespostasDiagnostico = {
  tipoCliente: '',
  veiculo: '',
  marca: '',
  modelo: '',
  ano: '',
  motor: '',
  sistema: '',
  sintoma: '',
  urgencia: '',
  operacao: '',
  pecaSolicitada: '',
  instalador: '',
};

const TIPOS_CLIENTE: TipoCliente[] = [
  'FROTISTA',
  'TRANSPORTADORA',
  'OFICINA',
  'REVENDA',
  'VIACAO',
  'COOPERATIVA',
];

const SISTEMAS: SistemaVeicular[] = [
  'EMBREAGEM',
  'FREIO',
  'ARREFECIMENTO',
  'SUSPENSAO',
  'INJECAO',
  'TRANSMISSAO',
  'ELETRICO',
  'MOTOR',
  'DIRECAO',
  'FILTRACAO',
];

const ETAPAS: Etapa[] = [
  {
    chave: 'tipoCliente',
    rotulo: 'Tipo de cliente',
    pergunta: 'Que tipo de operação é essa?',
    tipo: 'opcoes',
    opcoes: TIPOS_CLIENTE.map((t) => ({ valor: t, rotulo: ROTULO_TIPO_CLIENTE[t] })),
    critica: false,
  },
  {
    chave: 'veiculo',
    rotulo: 'Veículo',
    pergunta: 'É caminhão, ônibus ou implemento?',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'CAMINHAO', rotulo: 'Caminhão' },
      { valor: 'ONIBUS', rotulo: 'Ônibus' },
      { valor: 'IMPLEMENTO', rotulo: 'Implemento' },
    ],
    critica: true,
  },
  { chave: 'marca', rotulo: 'Marca', pergunta: 'Qual a marca do veículo?', tipo: 'texto', critica: true },
  { chave: 'modelo', rotulo: 'Modelo', pergunta: 'Qual o modelo?', tipo: 'texto', critica: true },
  { chave: 'ano', rotulo: 'Ano', pergunta: 'Qual o ano do veículo?', tipo: 'numero', critica: true },
  {
    chave: 'motor',
    rotulo: 'Motor',
    pergunta: 'Qual o motor? (quando aplicável ao sistema)',
    tipo: 'texto',
    critica: true,
  },
  {
    chave: 'sistema',
    rotulo: 'Sistema',
    pergunta: 'Qual sistema está envolvido?',
    tipo: 'opcoes',
    opcoes: SISTEMAS.map((s) => ({ valor: s, rotulo: ROTULO_SISTEMA[s] })),
    critica: true,
  },
  {
    chave: 'sintoma',
    rotulo: 'Sintoma',
    pergunta: 'Qual o sintoma, nas palavras do cliente?',
    tipo: 'texto',
    critica: true,
  },
  {
    chave: 'urgencia',
    rotulo: 'Urgência',
    pergunta: 'O veículo está parado?',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'PARADO', rotulo: 'Parado agora' },
      { valor: 'PARA_NESTA_SEMANA', rotulo: 'Vai parar nesta semana' },
      { valor: 'PROGRAMADO', rotulo: 'Manutenção programada' },
    ],
    critica: false,
  },
  {
    chave: 'operacao',
    rotulo: 'Operação',
    pergunta: 'Que tipo de operação o veículo faz?',
    tipo: 'opcoes',
    opcoes: (Object.keys(ROTULO_PERFIL_OPERACAO) as (keyof typeof ROTULO_PERFIL_OPERACAO)[]).map(
      (v) => ({ valor: v, rotulo: ROTULO_PERFIL_OPERACAO[v] }),
    ),
    critica: false,
  },
  {
    chave: 'pecaSolicitada',
    rotulo: 'Peça solicitada',
    pergunta: 'O que o cliente pediu, com as palavras dele?',
    tipo: 'texto',
    critica: false,
  },
  {
    chave: 'instalador',
    rotulo: 'Instalação',
    pergunta: 'Quem faz a instalação, e o conjunto já foi aberto?',
    tipo: 'texto',
    critica: false,
  },
];

/** Exibe a resposta com o rótulo legível quando a etapa é de opções. */
function rotularResposta(etapa: Etapa, valor: string): string {
  if (etapa.tipo !== 'opcoes') return valor;
  return etapa.opcoes?.find((o) => o.valor === valor)?.rotulo ?? valor;
}

export function Diagnostico() {
  const [params] = useSearchParams();
  const modo = params.get('modo');
  const { contextos, dados, criarPromessa, registrarInteracao, temDados } = useApp();

  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<RespostasDiagnostico>(VAZIO);
  const [clienteId, setClienteId] = useState('');
  const [inicio] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  const [salvo, setSalvo] = useState(false);
  const referencia = useMemo(() => hoje(), []);

  const veiculoParado = modo === 'veiculo-parado';

  useEffect(() => {
    if (!veiculoParado) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [veiculoParado]);

  const correlacoes = useMemo(() => calcularCorrelacaoDeCesta(dados), [dados]);

  const confirmados = ETAPAS.filter((e) => respostas[e.chave].trim().length > 0);
  const ausentes = ETAPAS.filter((e) => respostas[e.chave].trim().length === 0);
  const criticasAusentes = ausentes.filter((e) => e.critica);

  const grafo = useMemo(() => {
    if (!respostas.sistema) return null;
    return montarGrafo(
      respostas.sistema as SistemaVeicular,
      dados.productFamilies,
      dados.productRelations,
      correlacoes,
      new Set<string>(),
    );
  }, [respostas.sistema, dados.productFamilies, dados.productRelations, correlacoes]);

  const nomePorFamilia = new Map(dados.productFamilies.map((f) => [f.id, f.nome]));
  const decorrido = Math.floor((agora - inicio) / 1000);

  if (!temDados && modo !== 'venda-completa') {
    return (
      <EstadoVazio
        titulo="Nenhuma carteira carregada"
        descricao="O diagnóstico funciona sem carteira, mas vincular a um cliente permite registrar o contexto."
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
      <div>
        {modo && (
          <Link to="/app/cockpit" className="text-xs text-bruto-ash hover:text-bruto-yellow">
            ← Cockpit
          </Link>
        )}
        <TituloSecao
          descricao={
            veiculoParado
              ? 'Captura rápida para urgência. O cronômetro informa, não pressiona.'
              : 'Doze etapas para evitar venda errada. Toda etapa pode ser pulada — e o pulo vira lacuna explícita.'
          }
        >
          {veiculoParado ? 'Modo: Veículo parado' : 'Diagnóstico guiado'}
        </TituloSecao>
      </div>

      {veiculoParado && (
        <Card className="p-4 flex items-center justify-between gap-4">
          <div>
            <Rotulo>Tempo de atendimento</Rotulo>
            <p className="tabular text-3xl font-bold leading-none mt-1">
              {String(Math.floor(decorrido / 60)).padStart(2, '0')}:
              {String(decorrido % 60).padStart(2, '0')}
            </p>
          </div>
          <p className="text-xs text-bruto-ash max-w-[220px] text-right">
            Referência do tempo que o cliente está esperando. Não há meta nem contagem regressiva.
          </p>
        </Card>
      )}

      <Aviso tom="atencao" titulo="O que este diagnóstico faz e o que não faz">
        Ele organiza as perguntas certas e separa o que foi confirmado do que falta.{' '}
        <strong>Ele não conclui um número de peça.</strong> Aplicação veículo–motor–sistema–peça
        exige consulta ao catálogo validado, sempre.
      </Aviso>

      {contextos.length > 0 && (
        <Card className="p-3">
          <label htmlFor="cliente" className="rotulo block mb-1">
            Cliente (opcional — permite registrar o contexto)
          </label>
          <select
            id="cliente"
            className="campo"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Não vincular a um cliente</option>
            {contextos.map((c) => (
              <option key={c.customer.id} value={c.customer.id}>
                {c.customer.nomeFantasia}
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* Etapas */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="rotulo">
            Etapa {passo + 1} de {ETAPAS.length} — {ETAPAS[passo].rotulo}
          </p>
          <span className="tabular text-xs text-bruto-ash">
            {confirmados.length} respondidas · {ausentes.length} em aberto
          </span>
        </div>

        <div className="h-1 rounded-full bg-bruto-steel overflow-hidden mb-4">
          <div
            className="h-full bg-bruto-yellow"
            style={{ width: `${((passo + 1) / ETAPAS.length) * 100}%` }}
          />
        </div>

        <p className="text-lg font-medium">{ETAPAS[passo].pergunta}</p>

        <div className="mt-3">
          {ETAPAS[passo].tipo === 'opcoes' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {ETAPAS[passo].opcoes?.map((o) => (
                <button
                  key={o.valor}
                  onClick={() =>
                    setRespostas((r) => ({ ...r, [ETAPAS[passo].chave]: o.valor }))
                  }
                  aria-pressed={respostas[ETAPAS[passo].chave] === o.valor}
                  className={`rounded-lg min-h-[48px] px-2 text-sm font-semibold ${
                    respostas[ETAPAS[passo].chave] === o.valor
                      ? 'bg-bruto-yellow text-bruto-black'
                      : 'border border-bruto-steel text-bruto-ash'
                  }`}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>
          ) : (
            <>
              <label htmlFor="resposta" className="sr-only">
                {ETAPAS[passo].pergunta}
              </label>
              <input
                id="resposta"
                type={ETAPAS[passo].tipo === 'numero' ? 'number' : 'text'}
                className="campo"
                value={respostas[ETAPAS[passo].chave]}
                onChange={(e) =>
                  setRespostas((r) => ({ ...r, [ETAPAS[passo].chave]: e.target.value }))
                }
                placeholder="Deixe em branco se o cliente não souber"
              />
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="btn-secundario"
            disabled={passo === 0}
            onClick={() => setPasso((p) => Math.max(0, p - 1))}
          >
            Voltar
          </button>
          <button
            className="btn-primario flex-1"
            onClick={() => setPasso((p) => Math.min(ETAPAS.length - 1, p + 1))}
            disabled={passo === ETAPAS.length - 1}
          >
            {passo === ETAPAS.length - 1 ? 'Última etapa' : 'Próxima'}
          </button>
          {respostas[ETAPAS[passo].chave].length === 0 && passo < ETAPAS.length - 1 && (
            <button className="btn-fantasma" onClick={() => setPasso((p) => p + 1)}>
              Pular
            </button>
          )}
        </div>
      </Card>

      {/* Saída em quatro blocos separados */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="p-4">
          <Rotulo>Confirmado pelo cliente</Rotulo>
          {confirmados.length === 0 ? (
            <p className="text-sm text-bruto-ash mt-1">Nada confirmado ainda.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {confirmados.map((e) => (
                <li key={e.chave} className="text-sm">
                  <span className="text-bruto-green" aria-hidden="true">
                    ●{' '}
                  </span>
                  <span className="text-bruto-ash">{e.rotulo}:</span>{' '}
                  <span>{rotularResposta(e, respostas[e.chave])}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <Rotulo>Ausente</Rotulo>
          {ausentes.length === 0 ? (
            <p className="text-sm text-bruto-ash mt-1">Nenhuma lacuna. Diagnóstico completo.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {ausentes.map((e) => (
                <li key={e.chave} className="text-sm">
                  <span className={e.critica ? 'text-bruto-red' : 'text-bruto-ash'} aria-hidden="true">
                    ○{' '}
                  </span>
                  <span className={e.critica ? '' : 'text-bruto-ash'}>{e.rotulo}</span>
                  {e.critica && <span className="text-bruto-red text-xs"> (crítico)</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <Rotulo>Estimado pelo sistema</Rotulo>
          <ul className="mt-1 space-y-1 text-sm">
            {respostas.urgencia === 'PARADO' && (
              <li>
                <span className="text-bruto-blue" aria-hidden="true">
                  ◆{' '}
                </span>
                Urgência máxima — o cliente tem custo por hora. Critério: veículo declarado parado.
              </li>
            )}
            {respostas.sistema && (
              <li>
                <span className="text-bruto-blue" aria-hidden="true">
                  ◆{' '}
                </span>
                Sistema {ROTULO_SISTEMA[respostas.sistema as SistemaVeicular]} costuma envolver mais
                de uma família. Critério: correlação histórica de cesta.
              </li>
            )}
            {clienteId && (
              <li>
                <span className="text-bruto-blue" aria-hidden="true">
                  ◆{' '}
                </span>
                Contexto da conta disponível no Perfil 360.
              </li>
            )}
            {!respostas.urgencia && !respostas.sistema && !clienteId && (
              <li className="text-bruto-ash">Nada estimado ainda.</li>
            )}
          </ul>
        </Card>

        <Card className="p-4 border-bruto-amber/40">
          <Rotulo>Hipótese e validação necessária</Rotulo>
          {criticasAusentes.length > 0 ? (
            <>
              <p className="text-sm mt-1">
                <strong className="text-bruto-amber">
                  Não é possível validar aplicação sem estes dados:
                </strong>{' '}
                {criticasAusentes.map((e) => e.rotulo.toLowerCase()).join(', ')}.
              </p>
              <p className="text-sm text-bruto-ash mt-2">
                Peça essas informações antes de cotar. Cotar sem elas é chute — e chute em veículo
                parado custa frete de devolução e a conta.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm mt-1">
                Todos os dados críticos foram coletados. <strong>Próximo passo obrigatório:</strong>{' '}
                consultar o catálogo validado para confirmar a aplicação em {respostas.marca}{' '}
                {respostas.modelo} {respostas.ano}, motor {respostas.motor || 'não informado'}.
              </p>
              <p className="text-sm text-bruto-ash mt-2">
                O BRUTO OS não confirma aplicação. Ele confirma que você tem o que precisa para
                consultar.
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Venda completa a partir do sistema */}
      {grafo && grafo.arestas.length > 0 && (
        <Card className="p-4">
          <TituloSecao descricao="Perguntas para verificar se falta item do mesmo sistema. Não é venda casada — é evitar que a oficina abra o conjunto duas vezes.">
            Venda completa — {ROTULO_SISTEMA[respostas.sistema as SistemaVeicular]}
          </TituloSecao>
          <ul className="space-y-2">
            {grafo.arestas.slice(0, 5).map((a) => (
              <li
                key={`${a.origemFamilyId}-${a.destinoFamilyId}`}
                className="rounded-lg border border-bruto-steel p-3"
              >
                <p className="text-xs text-bruto-ash">
                  {nomePorFamilia.get(a.origemFamilyId)} → {nomePorFamilia.get(a.destinoFamilyId)} ·
                  suporte {Math.round(a.suporte * 100)}%
                  {a.procedencia === 'DEMONSTRACAO' && ' (ilustrativo)'}
                </p>
                <p className="text-sm text-bruto-yellow mt-1">{a.perguntaSugerida}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Registro */}
      {clienteId && (
        <Card className="p-4">
          <TituloSecao descricao="O contexto do diagnóstico vira interação registrada na conta.">
            Registrar e prometer retorno
          </TituloSecao>
          {salvo ? (
            <p className="text-sm text-bruto-green">
              Diagnóstico registrado na conta, com promessa de retorno para hoje.
            </p>
          ) : (
            <button
              className="btn-primario w-full"
              disabled={confirmados.length === 0}
              onClick={async () => {
                const resumo = confirmados
                  .map((e) => `${e.rotulo}: ${respostas[e.chave]}`)
                  .join('; ');
                await registrarInteracao({
                  customerId: clienteId,
                  tipo: 'LIGACAO',
                  data: referencia,
                  util: true,
                  urgente: respostas.urgencia === 'PARADO',
                  resumo: `Diagnóstico — ${resumo}`.slice(0, 500),
                });
                await criarPromessa({
                  customerId: clienteId,
                  descricao: veiculoParado
                    ? 'Retornar com disponibilidade e prazo para o veículo parado'
                    : 'Retornar com validação de aplicação e proposta',
                  dataPrometida: veiculoParado ? referencia : somarDias(referencia, 1),
                });
                setSalvo(true);
              }}
            >
              Registrar diagnóstico e criar promessa de retorno
            </button>
          )}
        </Card>
      )}

      <button
        className="btn-fantasma w-full"
        onClick={() => {
          setRespostas(VAZIO);
          setPasso(0);
          setSalvo(false);
        }}
      >
        Começar novo diagnóstico
      </button>
    </div>
  );
}
