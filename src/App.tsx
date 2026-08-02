import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProvedorApp } from './state/store';
import { Shell } from './ui/layout/Shell';
import { Landing } from './ui/pages/Landing';
import { Cockpit } from './ui/pages/Cockpit';
import { Carteira } from './ui/pages/Carteira';
import { Cliente360 } from './ui/pages/Cliente360';
import { Acoes } from './ui/pages/Acoes';
import { Andon } from './ui/pages/Andon';
import { Diagnostico } from './ui/pages/Diagnostico';
import { Perdas } from './ui/pages/Perdas';
import { Simulador } from './ui/pages/Simulador';
import { Conhecimento } from './ui/pages/Conhecimento';
import { Telemetria } from './ui/pages/Telemetria';
import { Debriefing } from './ui/pages/Debriefing';
import { Dados } from './ui/pages/Dados';

export function App() {
  return (
    <ProvedorApp>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<Navigate to="/app/cockpit" replace />} />
            <Route path="cockpit" element={<Cockpit />} />
            <Route path="carteira" element={<Carteira />} />
            <Route path="cliente/:id" element={<Cliente360 />} />
            <Route path="acoes" element={<Acoes />} />
            <Route path="andon" element={<Andon />} />
            <Route path="diagnostico" element={<Diagnostico />} />
            <Route path="perdas" element={<Perdas />} />
            <Route path="simulador" element={<Simulador />} />
            <Route path="conhecimento" element={<Conhecimento />} />
            <Route path="telemetria" element={<Telemetria />} />
            <Route path="debriefing" element={<Debriefing />} />
            <Route path="dados" element={<Dados />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProvedorApp>
  );
}
