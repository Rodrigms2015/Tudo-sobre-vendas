// Autenticação de dono único.
//
// Não há cadastro, não há e-mail, não há "esqueci minha senha". Existe uma senha,
// guardada como variável de ambiente do Netlify, e um cookie de sessão assinado.
// Qualquer rota que devolva ou aceite arquivo passa por `exigirSessao`.

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

const NOME_COOKIE = 'cofre_sessao';
const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/**
 * Lê a configuração obrigatória. Se faltar, o site não autentica ninguém —
 * é melhor falhar fechado e gritar no log do que abrir o cofre.
 */
export function lerConfiguracao() {
  const senha = process.env.SENHA_ACESSO;
  const segredo = process.env.SEGREDO_SESSAO;

  const faltando = [];
  if (!senha) faltando.push('SENHA_ACESSO');
  if (!segredo) faltando.push('SEGREDO_SESSAO');

  if (faltando.length > 0) {
    return { ok: false, faltando };
  }
  if (senha.length < 10) {
    return { ok: false, faltando: [], motivo: 'SENHA_ACESSO precisa de ao menos 10 caracteres.' };
  }
  return { ok: true, senha, segredo };
}

/** Compara duas strings em tempo constante, sem vazar o tamanho pela duração. */
export function conferirSenha(informada, correta) {
  // O HMAC normaliza o comprimento antes da comparação: sem isso,
  // `timingSafeEqual` lançaria erro (e revelaria o tamanho) para entradas
  // de tamanhos diferentes.
  const chave = randomBytes(32);
  const a = createHmac('sha256', chave).update(String(informada)).digest();
  const b = createHmac('sha256', chave).update(String(correta)).digest();
  return timingSafeEqual(a, b);
}

function assinar(carga, segredo) {
  return createHmac('sha256', segredo).update(carga).digest('base64url');
}

/** Cria um token `expiraEm.assinatura`. Não guarda nada no servidor. */
export function criarToken(segredo, agora = Date.now()) {
  const expiraEm = String(agora + DURACAO_SESSAO_MS);
  return `${expiraEm}.${assinar(expiraEm, segredo)}`;
}

/** Valida assinatura e validade. Qualquer defeito devolve `false`. */
export function tokenValido(token, segredo, agora = Date.now()) {
  if (typeof token !== 'string') return false;

  const separador = token.indexOf('.');
  if (separador <= 0) return false;

  const expiraEm = token.slice(0, separador);
  const assinatura = token.slice(separador + 1);
  if (!/^\d+$/.test(expiraEm)) return false;

  const esperada = assinar(expiraEm, segredo);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;

  return Number(expiraEm) > agora;
}

function lerCookie(requisicao, nome) {
  const cabecalho = requisicao.headers.get('cookie');
  if (!cabecalho) return null;

  for (const parte of cabecalho.split(';')) {
    const igual = parte.indexOf('=');
    if (igual <= 0) continue;
    if (parte.slice(0, igual).trim() === nome) {
      return decodeURIComponent(parte.slice(igual + 1).trim());
    }
  }
  return null;
}

export function cookieDeSessao(token) {
  const maxIdade = Math.floor(DURACAO_SESSAO_MS / 1000);
  return `${NOME_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxIdade}; HttpOnly; Secure; SameSite=Strict`;
}

export function cookieDeSaida() {
  return `${NOME_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * Porteiro das rotas privadas.
 *
 * Devolve `null` quando a sessão é válida, ou uma `Response` de erro pronta para
 * ser retornada pela função. Chame sempre antes de qualquer efeito colateral.
 */
export function exigirSessao(requisicao) {
  const config = lerConfiguracao();
  if (!config.ok) {
    return erro(503, 'Cofre não configurado. Defina SENHA_ACESSO e SEGREDO_SESSAO no Netlify.');
  }
  if (!tokenValido(lerCookie(requisicao, NOME_COOKIE), config.segredo)) {
    return erro(401, 'Sessão ausente ou expirada.');
  }
  return null;
}

/** Cabeçalhos aplicados a toda resposta de API. Nada aqui pode ser cacheado. */
export const CABECALHOS_BASE = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, no-cache, must-revalidate, private',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

export function json(corpo, status = 200, extras = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CABECALHOS_BASE, ...extras },
  });
}

export function erro(status, mensagem) {
  return json({ erro: mensagem }, status);
}
