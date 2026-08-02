/**
 * Shell do aplicativo.
 *
 * Mobile: barra inferior com 5 destinos — o limite do polegar. O sexto item de uma barra
 * inferior nunca é tocado, então tudo o mais vive em "Mais".
 * Desktop: barra lateral com os 11 destinos agrupados.
 * Ver docs/INFORMATION_ARCHITECTURE.md §2.
 */

import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../state/store';
import type { PapelUsuario } from '../../domain/types';

interface Destino {
  para: string;
  rotulo: string;
  grupo: 'Operação' | 'Inteligência' | 'Sistema';
  icone: string;
  principal?: boolean;
}

const DESTINOS: Destino[] = [
  { para: '/app/cockpit', rotulo: 'Cockpit', grupo: 'Operação', icone: '▣', principal: true },
  { para: '/app/carteira', rotulo: 'Carteira', grupo: 'Operação', icone: '▤', principal: true },
  { para: '/app/acoes', rotulo: 'Ações', grupo: 'Operação', icone: '▶', principal: true },
  { para: '/app/andon', rotulo: 'ANDON', grupo: 'Operação', icone: '⬤', principal: true },
  { para: '/app/diagnostico', rotulo: 'Diagnóstico', grupo: 'Operação', icone: '◈' },
  { para: '/app/perdas', rotulo: 'Perdas', grupo: 'Inteligência', icone: '◺' },
  { para: '/app/telemetria', rotulo: 'Telemetria', grupo: 'Inteligência', icone: '◱' },
  { para: '/app/simulador', rotulo: 'Simulador', grupo: 'Inteligência', icone: '◑' },
  { para: '/app/conhecimento', rotulo: 'Conhecimento', grupo: 'Inteligência', icone: '▦' },
  { para: '/app/debriefing', rotulo: 'Debriefing', grupo: 'Sistema', icone: '◨' },
  { para: '/app/dados', rotulo: 'Dados', grupo: 'Sistema', icone: '◧' },
];

const PRINCIPAIS = DESTINOS.filter((d) => d.principal);
const SECUNDARIOS = DESTINOS.filter((d) => !d.principal);

const PAPEIS: { valor: PapelUsuario; rotulo: string }[] = [
  { valor: 'VENDEDOR_INTERNO', rotulo: 'Vendedor interno' },
  { valor: 'VENDEDOR_EXTERNO', rotulo: 'Vendedor externo' },
  { valor: 'GESTOR', rotulo: 'Gestor' },
];

function classeNav(ativo: boolean): string {
  return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    ativo ? 'bg-bruto-yellow text-bruto-black' : 'text-bruto-ash hover:text-bruto-white hover:bg-bruto-graphite'
  }`;
}

export function Shell() {
  const { temDadosDemo, alertas, papel, definirPapel } = useApp();
  const [maisAberto, setMaisAberto] = useState(false);
  const local = useLocation();
  const criticos = alertas.filter((a) => a.severidade === 'CRITICO').length;

  const grupos = ['Operação', 'Inteligência', 'Sistema'] as const;

  return (
    <div className="min-h-full flex flex-col">
      <a href="#principal" className="link-pular">
        Pular para o conteúdo
      </a>

      {/* Selo de demonstração — persistente enquanto houver dados de demonstração. */}
      {temDadosDemo && (
        <div className="bg-bruto-yellow text-bruto-black px-4 py-1.5 text-[11px] sm:text-xs font-semibold text-center leading-tight">
          Dados demonstrativos — nenhuma aplicação técnica deve ser usada comercialmente.
        </div>
      )}

      <div className="flex-1 flex">
        {/* Barra lateral (tablet e desktop) */}
        <aside className="hidden md:flex md:w-[220px] lg:w-[240px] shrink-0 flex-col border-r border-bruto-steel">
          <div className="p-4">
            <Link to="/" className="flex items-center gap-2.5">
              <svg viewBox="0 0 512 512" className="w-6 h-6 shrink-0" aria-hidden="true">
                <rect width="512" height="512" fill="#0A0A0B" />
                <g fill="#F2B705">
                  <polygon points="136,140 376,248 376,304 136,196" />
                  <polygon points="136,216 376,324 376,380 136,272" />
                </g>
              </svg>
              <span className="font-bold tracking-tight text-sm">BRUTO OS</span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-4" aria-label="Navegação principal">
            {grupos.map((grupo) => (
              <div key={grupo}>
                <p className="rotulo px-3 mb-1">{grupo}</p>
                <ul className="space-y-0.5">
                  {DESTINOS.filter((d) => d.grupo === grupo).map((d) => (
                    <li key={d.para}>
                      <NavLink to={d.para} className={({ isActive }) => classeNav(isActive)}>
                        <span aria-hidden="true" className="text-xs opacity-70">
                          {d.icone}
                        </span>
                        <span className="flex-1">{d.rotulo}</span>
                        {d.para === '/app/andon' && criticos > 0 && (
                          <span className="tabular text-[10px] font-bold bg-bruto-red text-white rounded-full px-1.5 py-0.5">
                            {criticos}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-bruto-steel">
            <label htmlFor="papel" className="rotulo block mb-1">
              Papel
            </label>
            <select
              id="papel"
              value={papel}
              onChange={(e) => definirPapel(e.target.value as PapelUsuario)}
              className="campo !py-2 text-xs"
            >
              {PAPEIS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-bruto-ash mt-1.5 leading-snug">
              {papel === 'GESTOR'
                ? 'Vendo todas as carteiras.'
                : 'Vendo apenas a carteira do vendedor ativo.'}
            </p>
          </div>
        </aside>

        {/* Conteúdo */}
        <main
          id="principal"
          className="flex-1 min-w-0 pb-[calc(72px+env(safe-area-inset-bottom,0px))] md:pb-0"
        >
          <div className="max-w-shell mx-auto px-4 sm:px-5 py-4 sm:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Barra inferior (mobile) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bruto-graphite border-t border-bruto-steel pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Navegação principal"
      >
        <ul className="grid grid-cols-5">
          {PRINCIPAIS.map((d) => (
            <li key={d.para}>
              <NavLink
                to={d.para}
                onClick={() => setMaisAberto(false)}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center gap-0.5 min-h-[64px] text-[10px] font-semibold ${
                    isActive && !maisAberto ? 'text-bruto-yellow' : 'text-bruto-ash'
                  }`
                }
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {d.icone}
                </span>
                {d.rotulo}
                {d.para === '/app/andon' && criticos > 0 && (
                  <span className="absolute top-2.5 right-1/4 tabular text-[9px] font-bold bg-bruto-red text-white rounded-full px-1">
                    {criticos}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={() => setMaisAberto((v) => !v)}
              aria-expanded={maisAberto}
              className={`w-full flex flex-col items-center justify-center gap-0.5 min-h-[64px] text-[10px] font-semibold ${
                maisAberto ? 'text-bruto-yellow' : 'text-bruto-ash'
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                ⋯
              </span>
              Mais
            </button>
          </li>
        </ul>

        {maisAberto && (
          <div className="absolute bottom-full inset-x-0 bg-bruto-graphite border-t border-bruto-steel p-3">
            <ul className="grid grid-cols-2 gap-1.5">
              {SECUNDARIOS.map((d) => (
                <li key={d.para}>
                  <NavLink
                    to={d.para}
                    onClick={() => setMaisAberto(false)}
                    className={({ isActive }) =>
                      `${classeNav(isActive)} min-h-[48px] ${local.pathname === d.para ? '' : ''}`
                    }
                  >
                    <span aria-hidden="true" className="text-xs opacity-70">
                      {d.icone}
                    </span>
                    {d.rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-bruto-steel">
              <label htmlFor="papel-mobile" className="rotulo block mb-1">
                Papel
              </label>
              <select
                id="papel-mobile"
                value={papel}
                onChange={(e) => definirPapel(e.target.value as PapelUsuario)}
                className="campo !py-2.5 text-sm"
              >
                {PAPEIS.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
