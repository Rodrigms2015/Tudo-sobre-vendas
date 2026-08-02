/**
 * Gráficos em SVG próprio.
 *
 * Decisão registrada em docs/DESIGN_SYSTEM.md §4: o produto precisa de exatamente quatro
 * formas. Uma biblioteca de gráficos custaria 40–120 kB comprimidos para entregar 300
 * recursos que não usaremos, e traria um tema próprio que brigaria com o design system.
 *
 * Todos são acessíveis por construção: `role="img"` com `aria-label` descritivo, mais
 * uma tabela textual equivalente quando os dados são densos.
 */

import { formatarMoeda, formatarNumero } from '../../domain/dates';

export interface PontoBarra {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}

/** Barras horizontais — usado em ranking de motivos de perda. */
export function BarrasHorizontais({
  dados,
  formato = 'numero',
  descricao,
}: {
  dados: PontoBarra[];
  formato?: 'numero' | 'moeda';
  descricao: string;
}) {
  const maximo = Math.max(1, ...dados.map((d) => d.valor));
  const formatar = (v: number) => (formato === 'moeda' ? formatarMoeda(v) : formatarNumero(v));

  return (
    <div role="img" aria-label={`${descricao}. ${dados.map((d) => `${d.rotulo}: ${formatar(d.valor)}`).join('. ')}`}>
      <ul className="space-y-2">
        {dados.map((d) => (
          <li key={d.rotulo}>
            <div className="flex justify-between text-sm mb-1 gap-2">
              <span className="truncate">{d.rotulo}</span>
              <span className="tabular text-bruto-ash shrink-0">{formatar(d.valor)}</span>
            </div>
            <div className="h-2 rounded-full bg-bruto-steel overflow-hidden">
              <div
                className={`h-full rounded-full ${d.destaque ? 'bg-bruto-yellow' : 'bg-bruto-blue'}`}
                style={{ width: `${Math.max(2, (d.valor / maximo) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha esparsa — tendência ao longo de poucos períodos. */
export function LinhaTendencia({
  dados,
  descricao,
  altura = 80,
}: {
  dados: { periodo: string; valor: number }[];
  descricao: string;
  altura?: number;
}) {
  if (dados.length === 0) return null;
  const largura = 320;
  const maximo = Math.max(1, ...dados.map((d) => d.valor));
  const passo = dados.length > 1 ? largura / (dados.length - 1) : largura;

  const pontos = dados.map((d, i) => {
    const x = i * passo;
    const y = altura - (d.valor / maximo) * (altura - 12) - 6;
    return { x, y, ...d };
  });

  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div>
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="w-full"
        style={{ height: altura }}
        role="img"
        aria-label={`${descricao}. ${dados.map((d) => `${d.periodo}: ${formatarMoeda(d.valor)}`).join('. ')}`}
        preserveAspectRatio="none"
      >
        <path d={caminho} fill="none" stroke="#F2B705" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {pontos.map((p) => (
          <circle key={p.periodo} cx={p.x} cy={p.y} r="3" fill="#F2B705" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-bruto-ash mt-1">
        {dados.map((d) => (
          <span key={d.periodo}>{d.periodo}</span>
        ))}
      </div>
    </div>
  );
}

/** Barra segmentada — decomposição do score em seus nove componentes. */
export function BarraSegmentada({
  segmentos,
  descricao,
}: {
  segmentos: { rotulo: string; valor: number; cor: string }[];
  descricao: string;
}) {
  const total = segmentos.reduce((s, seg) => s + seg.valor, 0);
  if (total <= 0) {
    return <div className="h-3 rounded-full bg-bruto-steel" aria-label={`${descricao}: zero`} role="img" />;
  }

  return (
    <div
      className="h-3 rounded-full overflow-hidden flex bg-bruto-steel"
      role="img"
      aria-label={`${descricao}. ${segmentos
        .filter((s) => s.valor > 0)
        .map((s) => `${s.rotulo}: ${s.valor.toFixed(0)} pontos`)
        .join('. ')}`}
    >
      {segmentos
        .filter((s) => s.valor > 0)
        .map((s) => (
          <div
            key={s.rotulo}
            className={s.cor}
            style={{ width: `${(s.valor / 100) * 100}%` }}
            title={`${s.rotulo}: ${s.valor.toFixed(0)} pontos`}
          />
        ))}
    </div>
  );
}

/**
 * Mapa de calor da carteira por cidade.
 *
 * Deliberadamente ESQUEMÁTICO, não geográfico: sem geocodificação, desenhar um mapa do
 * Brasil com pontos seria inventar posições. Blocos proporcionais dizem a verdade
 * (concentração por cidade) sem fingir precisão espacial.
 * Ver docs/CRITICAL_REVIEW.md §2.
 */
export function MapaCalorCidades({
  cidades,
  aoSelecionar,
}: {
  cidades: { cidade: string; uf: string; clientes: number; emAcao: number }[];
  aoSelecionar?: (cidade: string) => void;
}) {
  if (cidades.length === 0) return null;
  const maximo = Math.max(...cidades.map((c) => c.clientes));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {cidades.map((c) => {
          const intensidade = c.clientes / maximo;
          const proporcaoAcao = c.clientes > 0 ? c.emAcao / c.clientes : 0;
          const Elemento = aoSelecionar ? 'button' : 'div';
          return (
            <Elemento
              key={`${c.cidade}-${c.uf}`}
              onClick={aoSelecionar ? () => aoSelecionar(c.cidade) : undefined}
              className={`rounded-lg border border-bruto-steel p-2.5 text-left ${
                aoSelecionar ? 'hover:border-bruto-yellow transition-colors' : ''
              }`}
              style={{
                backgroundColor: `rgba(242, 183, 5, ${(0.04 + intensidade * 0.16).toFixed(3)})`,
              }}
            >
              <div className="text-xs font-semibold truncate">
                {c.cidade}/{c.uf}
              </div>
              <div className="tabular text-lg font-bold leading-tight">{c.clientes}</div>
              <div className="text-[10px] text-bruto-ash">
                {c.emAcao} exigem ação ({Math.round(proporcaoAcao * 100)}%)
              </div>
            </Elemento>
          );
        })}
      </div>
      <p className="text-[11px] text-bruto-ash mt-2">
        Mapa esquemático por cidade. Não representa posição geográfica — o BRUTO OS não usa
        geocodificação.
      </p>
    </div>
  );
}
