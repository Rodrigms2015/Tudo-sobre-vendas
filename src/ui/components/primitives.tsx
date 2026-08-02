/**
 * Primitivas do design system.
 *
 * Regra de acessibilidade obrigatória: COR NUNCA É O ÚNICO PORTADOR DE SIGNIFICADO.
 * Todo indicador de status carrega rótulo textual e, quando aplicável, forma.
 * O vendedor usa o app sob sol direto, onde a distinção de cor colapsa.
 * Ver docs/DESIGN_SYSTEM.md §1.
 */

import type { ReactNode } from 'react';
import type {
  Confianca,
  NivelEvidencia,
  Procedencia,
  SeveridadeAlerta,
  Temperatura,
  TipoAcao,
} from '../../domain/types';
import { ROTULO_TIPO_ACAO } from '../../domain/types';
import { ROTULO_EVIDENCIA, ROTULO_TEMPERATURA } from '../../domain/engine/cadence';

export function Card({
  children,
  className = '',
  elevado = false,
}: {
  children: ReactNode;
  className?: string;
  elevado?: boolean;
}) {
  return <div className={`${elevado ? 'card-elevado' : 'card'} ${className}`}>{children}</div>;
}

export function TituloSecao({
  children,
  acao,
  descricao,
}: {
  children: ReactNode;
  acao?: ReactNode;
  descricao?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold leading-tight">{children}</h2>
        {descricao && <p className="text-sm text-bruto-ash mt-0.5">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}

export function Rotulo({ children }: { children: ReactNode }) {
  return <span className="rotulo">{children}</span>;
}

// ---------------------------------------------------------------------------
// Procedência
// ---------------------------------------------------------------------------

const ESTILO_PROCEDENCIA: Record<Procedencia, { classe: string; icone: string; rotulo: string }> = {
  CONFIRMADO: { classe: 'text-bruto-green border-bruto-green/40', icone: '●', rotulo: 'confirmado' },
  ESTIMADO: { classe: 'text-bruto-blue border-bruto-blue/40', icone: '◆', rotulo: 'estimado' },
  AUSENTE: { classe: 'text-bruto-ash border-bruto-ash/40 border-dashed', icone: '○', rotulo: 'ausente' },
  DEMONSTRACAO: {
    classe: 'text-bruto-yellow border-bruto-yellow/40',
    icone: '▨',
    rotulo: 'demonstração',
  },
};

export function SeloProcedencia({ valor }: { valor: Procedencia }) {
  const estilo = ESTILO_PROCEDENCIA[valor];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${estilo.classe}`}
    >
      <span aria-hidden="true">{estilo.icone}</span>
      {estilo.rotulo}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Temperatura e evidência
// ---------------------------------------------------------------------------

const ESTILO_TEMPERATURA: Record<Temperatura, string> = {
  SEM_BASE: 'text-bruto-ash bg-bruto-ash/10 border-bruto-ash/30',
  NO_CICLO: 'text-bruto-green bg-bruto-green/10 border-bruto-green/30',
  JANELA: 'text-bruto-yellow bg-bruto-yellow/10 border-bruto-yellow/40',
  ATRASADO: 'text-bruto-amber bg-bruto-amber/10 border-bruto-amber/40',
  PERDA_PROVAVEL: 'text-bruto-red bg-bruto-red/10 border-bruto-red/40',
};

export function SeloTemperatura({ valor }: { valor: Temperatura }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${ESTILO_TEMPERATURA[valor]}`}
    >
      {ROTULO_TEMPERATURA[valor]}
    </span>
  );
}

export function SeloEvidencia({ valor }: { valor: NivelEvidencia }) {
  const classe =
    valor === 'BASE_RAZOAVEL'
      ? 'text-bruto-green border-bruto-green/40'
      : valor === 'BASE_FRACA'
        ? 'text-bruto-blue border-bruto-blue/40'
        : 'text-bruto-ash border-bruto-ash/40 border-dashed';
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${classe}`}
    >
      {ROTULO_EVIDENCIA[valor]}
    </span>
  );
}

const ESTILO_CONFIANCA: Record<Confianca, string> = {
  ALTA: 'text-bruto-green border-bruto-green/40',
  MEDIA: 'text-bruto-blue border-bruto-blue/40',
  BAIXA: 'text-bruto-ash border-bruto-ash/40 border-dashed',
};

export function SeloConfianca({ valor }: { valor: Confianca }) {
  return (
    <span
      title="Confiança derivada da completude dos dados, não de probabilidade estatística."
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${ESTILO_CONFIANCA[valor]}`}
    >
      confiança {valor.toLowerCase()}
    </span>
  );
}

const ESTILO_TIPO_ACAO: Record<TipoAcao, string> = {
  URGENCIA: 'bg-bruto-red text-white',
  COMPROMISSO: 'bg-bruto-amber text-bruto-black',
  RECUPERACAO: 'bg-bruto-yellow text-bruto-black',
  REPOSICAO: 'bg-bruto-blue text-white',
  REATIVACAO: 'bg-bruto-steel text-bruto-white',
  EXPANSAO: 'bg-bruto-green text-white',
  CADASTRO: 'bg-bruto-graphite text-bruto-ash border border-bruto-steel',
};

export function SeloTipoAcao({ valor }: { valor: TipoAcao }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${ESTILO_TIPO_ACAO[valor]}`}
    >
      {ROTULO_TIPO_ACAO[valor]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ANDON
// ---------------------------------------------------------------------------

const ESTILO_SEVERIDADE: Record<SeveridadeAlerta, { faixa: string; texto: string; rotulo: string }> = {
  CRITICO: { faixa: 'bg-bruto-red', texto: 'text-bruto-red', rotulo: 'Crítico' },
  ATENCAO: { faixa: 'bg-bruto-amber', texto: 'text-bruto-amber', rotulo: 'Atenção' },
  INFORMACAO: { faixa: 'bg-bruto-blue', texto: 'text-bruto-blue', rotulo: 'Informação' },
};

export function FaixaAndon({
  severidade,
  children,
}: {
  severidade: SeveridadeAlerta;
  children: ReactNode;
}) {
  const estilo = ESTILO_SEVERIDADE[severidade];
  return (
    <div className="card overflow-hidden flex">
      <div className={`w-1 shrink-0 ${estilo.faixa}`} aria-hidden="true" />
      <div className="flex-1 min-w-0 p-4">{children}</div>
    </div>
  );
}

export function SeloSeveridade({ valor }: { valor: SeveridadeAlerta }) {
  const estilo = ESTILO_SEVERIDADE[valor];
  return (
    <span className={`text-[11px] font-bold uppercase tracking-wider ${estilo.texto}`}>
      {estilo.rotulo}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Métricas e estados
// ---------------------------------------------------------------------------

export function Metrica({
  rotulo,
  valor,
  detalhe,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <div>
      <div className="rotulo">{rotulo}</div>
      <div
        className={`tabular font-bold leading-tight ${destaque ? 'text-3xl text-bruto-yellow' : 'text-2xl'}`}
      >
        {valor}
      </div>
      {detalhe && <div className="text-xs text-bruto-ash mt-0.5">{detalhe}</div>}
    </div>
  );
}

/**
 * Estado vazio. Sempre diz o que falta e oferece a ação.
 * Estado vazio decorativo é proibido — ver docs/INFORMATION_ARCHITECTURE.md §8.
 */
export function EstadoVazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="card p-6 text-center">
      <p className="font-semibold">{titulo}</p>
      <p className="text-sm text-bruto-ash mt-1 max-w-prose mx-auto">{descricao}</p>
      {acao && <div className="mt-4 flex justify-center gap-2 flex-wrap">{acao}</div>}
    </div>
  );
}

export function Aviso({
  tom = 'info',
  titulo,
  children,
}: {
  tom?: 'info' | 'atencao' | 'perigo';
  titulo: string;
  children?: ReactNode;
}) {
  const classe =
    tom === 'perigo'
      ? 'border-bruto-red/50 bg-bruto-red/5'
      : tom === 'atencao'
        ? 'border-bruto-amber/50 bg-bruto-amber/5'
        : 'border-bruto-blue/50 bg-bruto-blue/5';
  return (
    <div className={`rounded-lg border p-3 text-sm ${classe}`} role="note">
      <p className="font-semibold">{titulo}</p>
      {children && <div className="text-bruto-ash mt-1">{children}</div>}
    </div>
  );
}

export function ListaLacunas({ lacunas }: { lacunas: string[] }) {
  if (lacunas.length === 0) return null;
  return (
    <div>
      <Rotulo>Falta saber</Rotulo>
      <ul className="mt-1 space-y-1">
        {lacunas.map((l) => (
          <li key={l} className="text-sm text-bruto-ash flex gap-2">
            <span aria-hidden="true" className="text-bruto-ash/60">
              ○
            </span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Abas<T extends string>({
  abas,
  ativa,
  aoTrocar,
}: {
  abas: { valor: T; rotulo: string }[];
  ativa: T;
  aoTrocar: (valor: T) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-bruto-steel" role="tablist">
      {abas.map((aba) => (
        <button
          key={aba.valor}
          role="tab"
          aria-selected={ativa === aba.valor}
          onClick={() => aoTrocar(aba.valor)}
          className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
            ativa === aba.valor
              ? 'border-bruto-yellow text-bruto-white'
              : 'border-transparent text-bruto-ash hover:text-bruto-white'
          }`}
        >
          {aba.rotulo}
        </button>
      ))}
    </div>
  );
}
