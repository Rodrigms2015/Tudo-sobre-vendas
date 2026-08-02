/**
 * Radar da Carteira — visualizações e filtros.
 *
 * Tabela própria (sem biblioteca): em mobile cada linha vira card, comportamento que
 * nenhuma biblioteca de tabela entrega bem sem configuração extensa.
 * Ver docs/DESIGN_SYSTEM.md §4.
 */

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../state/store';
import type { CustomerContext } from '../../domain/engine/context';
import {
  ROTULO_SEGMENTO,
  ROTULO_TIPO_CLIENTE,
  type Segmento,
  type Temperatura,
  type TipoCliente,
} from '../../domain/types';
import { calcularScore } from '../../domain/engine/scoring';
import { Card, EstadoVazio, SeloTemperatura, TituloSecao } from '../components/primitives';
import { ROTULO_TEMPERATURA } from '../../domain/engine/cadence';
import { formatarDias, formatarMoeda, hoje } from '../../domain/dates';

type Visualizacao =
  | 'TODOS'
  | 'QUENTES'
  | 'RISCO'
  | 'ADORMECIDOS'
  | 'ORCAMENTO'
  | 'POTENCIAL'
  | 'SEM_FROTA'
  | 'RECORRENCIA'
  | 'UMA_FAMILIA';

const VISUALIZACOES: { valor: Visualizacao; rotulo: string; descricao: string }[] = [
  { valor: 'TODOS', rotulo: 'Todos', descricao: 'Toda a carteira do vendedor ativo.' },
  {
    valor: 'QUENTES',
    rotulo: 'Na janela',
    descricao: 'Contas dentro da janela histórica de recompra. É agora que a ligação converte.',
  },
  {
    valor: 'RISCO',
    rotulo: 'Em risco',
    descricao: 'Passaram do ciclo habitual. Um concorrente pode ter entrado.',
  },
  {
    valor: 'ADORMECIDOS',
    rotulo: 'Adormecidos',
    descricao: 'Mais que o dobro do ciclo sem comprar. Conversa de reativação.',
  },
  {
    valor: 'ORCAMENTO',
    rotulo: 'Com orçamento aberto',
    descricao: 'Proposta emitida sem desfecho.',
  },
  {
    valor: 'POTENCIAL',
    rotulo: 'Potencial não explorado',
    descricao: 'Frota grande comprando poucas famílias.',
  },
  {
    valor: 'SEM_FROTA',
    rotulo: 'Sem perfil de frota',
    descricao: 'O sistema não consegue dimensionar estas contas.',
  },
  {
    valor: 'RECORRENCIA',
    rotulo: 'Recorrência provável',
    descricao: 'Cadência estabelecida com base razoável.',
  },
  {
    valor: 'UMA_FAMILIA',
    rotulo: 'Compram uma família só',
    descricao: 'Concentração total em uma linha de produto.',
  },
];

type Ordenacao = 'SCORE' | 'NOME' | 'ULTIMA_COMPRA' | 'FATURAMENTO';

export function Carteira() {
  const { contextos, dados, settings, temDados } = useApp();
  const [params, setParams] = useSearchParams();
  const referencia = useMemo(() => hoje(), []);

  const modo = params.get('modo');
  const cidadeParam = params.get('cidade') ?? '';

  const [visualizacao, setVisualizacao] = useState<Visualizacao>(
    modo === 'carteira-esquecida' ? 'ADORMECIDOS' : 'TODOS',
  );
  const [busca, setBusca] = useState('');
  const [cidade, setCidade] = useState(cidadeParam);
  const [uf, setUf] = useState('');
  const [segmento, setSegmento] = useState<Segmento | ''>('');
  const [tipoCliente, setTipoCliente] = useState<TipoCliente | ''>('');
  const [temperatura, setTemperatura] = useState<Temperatura | ''>('');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('SCORE');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const scores = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const ctx of contextos) {
      mapa.set(
        ctx.customer.id,
        calcularScore(ctx, settings.pesos, dados.productFamilies, referencia).score,
      );
    }
    return mapa;
  }, [contextos, settings.pesos, dados.productFamilies, referencia]);

  const cidades = useMemo(
    () => [...new Set(contextos.map((c) => c.customer.cidade))].sort(),
    [contextos],
  );
  const ufs = useMemo(() => [...new Set(contextos.map((c) => c.customer.uf))].sort(), [contextos]);

  const filtrados = useMemo(() => {
    const totalFamilias = dados.productFamilies.length;

    const passaVisualizacao = (ctx: CustomerContext): boolean => {
      switch (visualizacao) {
        case 'TODOS':
          return true;
        case 'QUENTES':
          return ctx.cadencia.temperatura === 'JANELA';
        case 'RISCO':
          return ctx.cadencia.temperatura === 'ATRASADO';
        case 'ADORMECIDOS':
          return ctx.cadencia.temperatura === 'PERDA_PROVAVEL';
        case 'ORCAMENTO':
          return ctx.valorOrcamentoAberto > 0;
        case 'POTENCIAL':
          return (
            (ctx.frota?.totalVeiculos ?? 0) >= 15 &&
            ctx.familiasCompradas.size <= Math.max(3, totalFamilias * 0.25)
          );
        case 'SEM_FROTA':
          return ctx.frota === null || ctx.frota.totalVeiculos === null;
        case 'RECORRENCIA':
          return ctx.cadencia.evidencia === 'BASE_RAZOAVEL';
        case 'UMA_FAMILIA':
          return ctx.familiasCompradas.size === 1;
      }
    };

    const termo = busca.trim().toLowerCase();

    const lista = contextos.filter((ctx) => {
      if (!passaVisualizacao(ctx)) return false;
      if (termo && !ctx.customer.nomeFantasia.toLowerCase().includes(termo)) return false;
      if (cidade && ctx.customer.cidade !== cidade) return false;
      if (uf && ctx.customer.uf !== uf) return false;
      if (segmento && ctx.customer.segmento !== segmento) return false;
      if (tipoCliente && ctx.customer.tipoCliente !== tipoCliente) return false;
      if (temperatura && ctx.cadencia.temperatura !== temperatura) return false;
      return true;
    });

    return lista.sort((a, b) => {
      switch (ordenacao) {
        case 'NOME':
          return a.customer.nomeFantasia.localeCompare(b.customer.nomeFantasia);
        case 'ULTIMA_COMPRA':
          return (a.cadencia.diasDesdeUltimaCompra ?? 1e9) - (b.cadencia.diasDesdeUltimaCompra ?? 1e9);
        case 'FATURAMENTO':
          return b.faturamentoUltimos365 - a.faturamentoUltimos365;
        case 'SCORE':
        default:
          return (scores.get(b.customer.id) ?? 0) - (scores.get(a.customer.id) ?? 0);
      }
    });
  }, [
    contextos,
    visualizacao,
    busca,
    cidade,
    uf,
    segmento,
    tipoCliente,
    temperatura,
    ordenacao,
    scores,
    dados.productFamilies.length,
  ]);

  const descricaoVisualizacao = VISUALIZACOES.find((v) => v.valor === visualizacao)?.descricao ?? '';

  if (!temDados) {
    return (
      <EstadoVazio
        titulo="Nenhuma carteira carregada"
        descricao="Carregue a demonstração ou importe sua base para ver o radar da carteira."
        acao={
          <Link to="/app/dados" className="btn-primario">
            Ir para Dados
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <TituloSecao descricao="Sua carteira vista por situação comercial, não por ordem alfabética.">
        Radar da Carteira
      </TituloSecao>

      {/* Visualizações */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {VISUALIZACOES.map((v) => {
          const ativo = visualizacao === v.valor;
          return (
            <button
              key={v.valor}
              onClick={() => setVisualizacao(v.valor)}
              aria-pressed={ativo}
              className={`shrink-0 rounded-lg px-3 min-h-[40px] text-xs font-semibold transition-colors ${
                ativo
                  ? 'bg-bruto-yellow text-bruto-black'
                  : 'border border-bruto-steel text-bruto-ash hover:text-bruto-white'
              }`}
            >
              {v.rotulo}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-bruto-ash -mt-3">{descricaoVisualizacao}</p>

      {/* Busca e filtros */}
      <Card className="p-3 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="busca" className="sr-only">
              Buscar cliente
            </label>
            <input
              id="busca"
              className="campo"
              placeholder="Buscar por nome do cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <button
            className="btn-secundario shrink-0"
            onClick={() => setFiltrosAbertos((v) => !v)}
            aria-expanded={filtrosAbertos}
          >
            Filtros
          </button>
        </div>

        {filtrosAbertos && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <Filtro rotulo="Cidade" valor={cidade} aoMudar={setCidade} opcoes={cidades} />
            <Filtro rotulo="UF" valor={uf} aoMudar={setUf} opcoes={ufs} />
            <Filtro
              rotulo="Segmento"
              valor={segmento}
              aoMudar={(v) => setSegmento(v as Segmento | '')}
              opcoes={Object.keys(ROTULO_SEGMENTO)}
              rotulos={ROTULO_SEGMENTO}
            />
            <Filtro
              rotulo="Tipo"
              valor={tipoCliente}
              aoMudar={(v) => setTipoCliente(v as TipoCliente | '')}
              opcoes={Object.keys(ROTULO_TIPO_CLIENTE)}
              rotulos={ROTULO_TIPO_CLIENTE}
            />
            <Filtro
              rotulo="Temperatura"
              valor={temperatura}
              aoMudar={(v) => setTemperatura(v as Temperatura | '')}
              opcoes={['SEM_BASE', 'NO_CICLO', 'JANELA', 'ATRASADO', 'PERDA_PROVAVEL']}
              rotulos={ROTULO_TEMPERATURA}
            />
            <div>
              <label htmlFor="ordenacao" className="rotulo block mb-1">
                Ordenar por
              </label>
              <select
                id="ordenacao"
                className="campo"
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
              >
                <option value="SCORE">Prioridade</option>
                <option value="NOME">Nome</option>
                <option value="ULTIMA_COMPRA">Última compra</option>
                <option value="FATURAMENTO">Faturamento 12 meses</option>
              </select>
            </div>
            <div className="col-span-full">
              <button
                className="btn-fantasma !min-h-[36px] text-xs"
                onClick={() => {
                  setCidade('');
                  setUf('');
                  setSegmento('');
                  setTipoCliente('');
                  setTemperatura('');
                  setBusca('');
                  setParams({});
                }}
              >
                Limpar filtros
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-bruto-ash tabular" aria-live="polite">
          {filtrados.length} de {contextos.length} contas
        </p>
      </Card>

      {/* Resultados */}
      {filtrados.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma conta nesta visualização"
          descricao="Isso pode ser um bom resultado — significa que a carteira não tem contas nessa situação. Ajuste o filtro ou volte para Todos."
          acao={
            <button className="btn-secundario" onClick={() => setVisualizacao('TODOS')}>
              Ver todos
            </button>
          }
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-2 lg:hidden">
            {filtrados.map((ctx) => (
              <li key={ctx.customer.id}>
                <LinhaCartao ctx={ctx} score={scores.get(ctx.customer.id) ?? 0} />
              </li>
            ))}
          </ul>

          {/* Desktop: tabela */}
          <div className="hidden lg:block card overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Carteira filtrada, {filtrados.length} contas, ordenadas por {ordenacao}
              </caption>
              <thead>
                <tr className="text-left border-b border-bruto-steel">
                  <th scope="col" className="rotulo p-3">
                    Cliente
                  </th>
                  <th scope="col" className="rotulo p-3">
                    Praça
                  </th>
                  <th scope="col" className="rotulo p-3">
                    Situação
                  </th>
                  <th scope="col" className="rotulo p-3 text-right">
                    Última compra
                  </th>
                  <th scope="col" className="rotulo p-3 text-right">
                    12 meses
                  </th>
                  <th scope="col" className="rotulo p-3 text-right">
                    Orç. aberto
                  </th>
                  <th scope="col" className="rotulo p-3 text-right">
                    Prioridade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bruto-steel">
                {filtrados.map((ctx) => (
                  <tr key={ctx.customer.id} className="hover:bg-bruto-graphite/60">
                    <td className="p-3">
                      <Link
                        to={`/app/cliente/${ctx.customer.id}`}
                        className="font-medium hover:text-bruto-yellow"
                      >
                        {ctx.customer.nomeFantasia}
                      </Link>
                      <div className="text-xs text-bruto-ash">
                        {ctx.frota?.totalVeiculos !== null && ctx.frota?.totalVeiculos !== undefined
                          ? `${ctx.frota.totalVeiculos} veículos`
                          : 'frota não cadastrada'}
                      </div>
                    </td>
                    <td className="p-3 text-bruto-ash">
                      {ctx.customer.cidade}/{ctx.customer.uf}
                    </td>
                    <td className="p-3">
                      <SeloTemperatura valor={ctx.cadencia.temperatura} />
                    </td>
                    <td className="p-3 text-right tabular text-bruto-ash">
                      {formatarDias(ctx.cadencia.diasDesdeUltimaCompra)}
                    </td>
                    <td className="p-3 text-right tabular">
                      {formatarMoeda(ctx.faturamentoUltimos365)}
                    </td>
                    <td className="p-3 text-right tabular">
                      {ctx.valorOrcamentoAberto > 0 ? formatarMoeda(ctx.valorOrcamentoAberto) : '—'}
                    </td>
                    <td className="p-3 text-right tabular font-bold">
                      {scores.get(ctx.customer.id) ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Filtro({
  rotulo,
  valor,
  aoMudar,
  opcoes,
  rotulos,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: string[];
  /** Rótulos legíveis por valor. Sem isso o enum vira "viacao" e "construcao". */
  rotulos?: Record<string, string>;
}) {
  const id = `filtro-${rotulo.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="rotulo block mb-1">
        {rotulo}
      </label>
      <select id={id} className="campo" value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">Todos</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {rotulos?.[o] ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}

function LinhaCartao({ ctx, score }: { ctx: CustomerContext; score: number }) {
  return (
    <Link to={`/app/cliente/${ctx.customer.id}`} className="card p-3 block">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{ctx.customer.nomeFantasia}</p>
          <p className="text-xs text-bruto-ash">
            {ctx.customer.cidade}/{ctx.customer.uf} ·{' '}
            {ctx.frota?.totalVeiculos !== null && ctx.frota?.totalVeiculos !== undefined
              ? `${ctx.frota.totalVeiculos} veículos`
              : 'frota não cadastrada'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="tabular text-xl font-bold leading-none">{score}</div>
          <div className="text-[10px] text-bruto-ash uppercase">prioridade</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <SeloTemperatura valor={ctx.cadencia.temperatura} />
        <span className="text-xs text-bruto-ash tabular">
          {formatarDias(ctx.cadencia.diasDesdeUltimaCompra)}
          {ctx.valorOrcamentoAberto > 0 && ` · ${formatarMoeda(ctx.valorOrcamentoAberto)} em aberto`}
        </span>
      </div>
    </Link>
  );
}
