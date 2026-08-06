/**
 * Cadastro de acesso e sessão — compartilhado pela porta de entrada
 * (netlify/edge-functions/acesso.js) e pela função de dados
 * (netlify/functions/dados.mjs).
 *
 * Só usa Web Crypto e TextEncoder, que existem tanto no runtime de borda
 * (Deno) quanto no de funções (Node 18+). Não importe nada daqui que dependa
 * de um dos dois.
 *
 * As senhas não ficam escritas aqui: o que está gravado é o resumo SHA-256 de
 * cada uma. Serve para conferir a senha digitada e não serve para descobrir a
 * senha original. Para trocar, veja LEIA-ME.md.
 */

export const USUARIOS = {
  rodrigo: { nome: 'Rodrigo', hash: '6bae002e293868157e469b5bb1d42ad52afeb19ccf35ccd3978034e197d8af00' },
  compras2: { nome: 'Compras 2', hash: '8e5e9dd7fed27a6541d7ec06ead9a1c88337b442873b7f794e873f980d7978d4' },
  compras3: { nome: 'Compras 3', hash: '949b81869e3303f3cbf3c5ad32c5b2a70d602c55a442bc0a1ce82a6957fe596b' },
  compras4: { nome: 'Compras 4', hash: '6c02b4bdbe32ff94db3214ac2e2b189b844400b06bae42c914c25a4a7127266f' },
  compras5: { nome: 'Compras 5', hash: '1ef8f436b6711bdbdc17c06264048b667c3ea6ad4cf274d8bf77f435e67948b9' },
};

export const COOKIE_SESSAO = 'cc_sessao';
export const COOKIE_NOME = 'cc_usuario';
export const HORAS_DE_SESSAO = 12;

/* ── Assinatura da sessão ─────────────────────────────────────────────────
   O cookie carrega quem entrou e até quando vale, assinado com HMAC. Sem a
   assinatura correta o cookie é recusado, então ninguém entra editando o
   próprio cookie no navegador.

   A chave da assinatura vem dos resumos das senhas. Consequência desejada:
   trocar qualquer senha invalida todas as sessões abertas. */
let chavePromessa = null;
function chave() {
  if (!chavePromessa) {
    const material = Object.values(USUARIOS).map((u) => u.hash).join('|');
    chavePromessa = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('sessao:' + material),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  }
  return chavePromessa;
}

const emHexa = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function assinar(texto) {
  return emHexa(await crypto.subtle.sign('HMAC', await chave(), new TextEncoder().encode(texto)));
}

export async function resumo(texto) {
  return emHexa(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
}

/* Comparação de tempo constante: evita que a diferença de milissegundos entre
   uma senha quase certa e uma errada vire pista para quem tentar. */
export function iguais(a, b) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

export async function criarSessao(usuario) {
  const corpo = usuario + '|' + (Date.now() + HORAS_DE_SESSAO * 3600 * 1000);
  return corpo + '|' + (await assinar(corpo));
}

/**
 * Devolve o identificador de quem está na sessão, ou `null`. Recebe o
 * cabeçalho `Cookie` cru — assim funciona igual nos dois runtimes.
 */
export async function lerSessao(cabecalhoCookie) {
  const casou = String(cabecalhoCookie || '').match(
    new RegExp('(?:^|;\\s*)' + COOKIE_SESSAO + '=([^;]*)'),
  );
  if (!casou) return null;

  let partes;
  try {
    partes = decodeURIComponent(casou[1]).split('|');
  } catch {
    return null;
  }
  if (partes.length !== 3) return null;

  const [usuario, expira, assinatura] = partes;
  if (!Object.prototype.hasOwnProperty.call(USUARIOS, usuario)) return null;
  if (!(Number(expira) > Date.now())) return null;
  if (!iguais(assinatura, await assinar(usuario + '|' + expira))) return null;

  return usuario;
}
