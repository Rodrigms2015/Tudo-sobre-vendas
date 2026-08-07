// POST   /api/sessao  → entra (corpo: { senha })
// DELETE /api/sessao  → sai
// GET    /api/sessao  → diz se a sessão atual vale

import {
  lerConfiguracao,
  conferirSenha,
  criarToken,
  cookieDeSessao,
  cookieDeSaida,
  exigirSessao,
  json,
  erro,
} from '../../lib/sessao.mjs';
import { controle } from '../../lib/armazenamento.mjs';

// Freio contra tentativa em série. Não é defesa contra um adversário distribuído —
// é o que impede que uma senha fraca caia em uma tarde.
const MAX_TENTATIVAS = 8;
const JANELA_MS = 15 * 60 * 1000;

function identificar(requisicao) {
  const ip =
    requisicao.headers.get('x-nf-client-connection-ip') ||
    (requisicao.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'desconhecido';
  // Chave opaca: o IP em claro não precisa ficar guardado.
  return `tentativas/${Buffer.from(ip).toString('base64url').slice(0, 40)}`;
}

async function lerTentativas(chave, agora) {
  const registro = await controle().get(chave, { type: 'json' }).catch(() => null);
  if (!registro || typeof registro.ate !== 'number' || registro.ate < agora) {
    return { contagem: 0, ate: agora + JANELA_MS };
  }
  return registro;
}

export default async function handler(requisicao) {
  const metodo = requisicao.method;

  if (metodo === 'GET') {
    return exigirSessao(requisicao) ? json({ autenticado: false }) : json({ autenticado: true });
  }

  if (metodo === 'DELETE') {
    return json({ ok: true }, 200, { 'set-cookie': cookieDeSaida() });
  }

  if (metodo !== 'POST') {
    return erro(405, 'Método não permitido.');
  }

  const config = lerConfiguracao();
  if (!config.ok) {
    const detalhe = config.motivo ?? `Faltam as variáveis: ${config.faltando.join(', ')}.`;
    return erro(503, `Cofre não configurado. ${detalhe}`);
  }

  const agora = Date.now();
  const chave = identificar(requisicao);
  const tentativas = await lerTentativas(chave, agora);

  if (tentativas.contagem >= MAX_TENTATIVAS) {
    const minutos = Math.max(1, Math.ceil((tentativas.ate - agora) / 60000));
    return erro(429, `Tentativas demais. Tente de novo em ${minutos} min.`);
  }

  let corpo;
  try {
    corpo = await requisicao.json();
  } catch {
    return erro(400, 'Corpo inválido.');
  }

  if (!conferirSenha(corpo?.senha ?? '', config.senha)) {
    await controle().setJSON(chave, { contagem: tentativas.contagem + 1, ate: tentativas.ate });
    const restantes = MAX_TENTATIVAS - tentativas.contagem - 1;
    return erro(
      401,
      restantes > 0 ? `Senha incorreta. ${restantes} tentativa(s) restante(s).` : 'Senha incorreta.',
    );
  }

  await controle().delete(chave);
  return json({ ok: true }, 200, { 'set-cookie': cookieDeSessao(criarToken(config.segredo)) });
}

export const config = { path: '/api/sessao' };
