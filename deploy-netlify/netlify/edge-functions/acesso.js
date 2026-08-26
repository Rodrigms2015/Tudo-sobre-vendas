/**
 * Porta de entrada da Central de Compras.
 *
 * Roda no servidor de borda da Netlify, antes de qualquer byte da página sair.
 * Sem sessão válida o HTML não é entregue — não adianta ver o código-fonte,
 * porque ele nunca chega ao navegador.
 *
 * A tela de entrada é uma página de verdade, com campos de usuário e senha.
 * (A caixinha cinza do navegador — autenticação básica — passa despercebida
 * em celular e em quem não conhece; por isso ela foi trocada.)
 *
 * O cadastro de quem entra fica em ../comum/sessao.mjs, compartilhado com a
 * função que guarda os dados.
 */

import { USUARIOS, COOKIE_SESSAO, COOKIE_NOME, HORAS_DE_SESSAO, criarSessao, lerSessao, resumo, iguais } from '../comum/sessao.mjs';

/* ── Tela de entrada ──────────────────────────────────────────────────────
   A página inteira é montada aqui: ela precisa ser servida antes de qualquer
   arquivo do site, inclusive antes do HTML da Central. */
function telaDeEntrada({ erro = '', usuario = '', saiu = false } = {}) {
  const escapar = (t) => String(t).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const aviso = erro
    ? '<p class="aviso" role="alert"><span aria-hidden="true">▲</span> ' + escapar(erro) + '</p>'
    : saiu
      ? '<p class="ok" role="status"><span aria-hidden="true">✓</span> Sessão encerrada. Entre de novo para continuar.</p>'
      : '';

  const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="light dark" />
<meta name="robots" content="noindex, nofollow" />
<title>Entrar — Central de Compras</title>
<style>
  :root {
    --marinho: #0B3B7D; --marinho-fundo: #082E63; --laranja: #EF7E32;
    --papel: #FFFFFF; --chao: #EEF1F6; --borda: #D7DEE9;
    --tinta: #0E1B2E; --tinta-2: #42536B; --tinta-3: #6B7B93; --critico: #C42B21;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --marinho: #6FA3E8; --marinho-fundo: #050D1A; --laranja: #F79B57;
      --papel: #141C29; --chao: #0A1220; --borda: #26324A;
      --tinta: #E6ECF5; --tinta-2: #9DAEC6; --tinta-3: #7A8CA6; --critico: #F0685C;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px; background: var(--chao); color: var(--tinta);
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .cartao {
    width: 100%; max-width: 380px; background: var(--papel);
    border: 1px solid var(--borda); border-radius: 12px; overflow: hidden;
    box-shadow: 0 8px 32px rgba(11, 59, 125, .16);
  }
  .topo { background: var(--marinho-fundo); padding: 24px 24px 20px; }
  .topo .selo {
    display: inline-block; font-size: 10.5px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--laranja);
  }
  .topo h1 { margin: 6px 0 2px; font-size: 19px; line-height: 1.25; color: #FFFFFF; }
  .topo p { margin: 0; font-size: 13px; color: #A3BAD5; }
  form { padding: 20px 24px 20px; display: grid; gap: 14px; }
  .campo { display: grid; gap: 6px; }
  label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--tinta-3);
  }
  input {
    height: 48px; padding: 0 12px; font-size: 16px; font-family: inherit;
    color: var(--tinta); background: var(--chao);
    border: 1px solid var(--borda); border-radius: 8px;
  }
  input:focus-visible { outline: 3px solid var(--laranja); outline-offset: 1px; }
  button {
    height: 48px; font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer;
    color: #FFFFFF; background: var(--marinho); border: 1px solid var(--marinho); border-radius: 8px;
  }
  button:hover { filter: brightness(1.08); }
  button:focus-visible { outline: 3px solid var(--laranja); outline-offset: 2px; }
  .aviso, .ok {
    margin: 0; padding: 10px 12px; font-size: 13px; line-height: 1.4;
    border-radius: 8px; border: 1px solid;
  }
  .aviso { color: var(--critico); border-color: var(--critico); background: rgba(196, 43, 33, .07); }
  .ok { color: var(--tinta-2); border-color: var(--borda); background: var(--chao); }
  .rodape { padding: 0 24px 22px; margin: 0; font-size: 12px; line-height: 1.45; color: var(--tinta-3); }
</style>
</head>
<body>
  <main class="cartao">
    <div class="topo">
      <span class="selo">Pacaembu Autopeças · Filial 03</span>
      <h1>Central de Compras</h1>
      <p>Estoque e demanda — Ribeirão Preto</p>
    </div>
    <form method="post" action="/entrar" autocomplete="on">
      ${aviso}
      <div class="campo">
        <label for="usuario">Usuário</label>
        <input id="usuario" name="usuario" type="text" value="${escapar(usuario)}"
               autocapitalize="none" autocorrect="off" spellcheck="false"
               autocomplete="username" required autofocus />
      </div>
      <div class="campo">
        <label for="senha">Senha</label>
        <input id="senha" name="senha" type="password" autocomplete="current-password" required />
      </div>
      <button type="submit">Entrar</button>
    </form>
    <p class="rodape">Acesso restrito à equipe. A sessão vale ${HORAS_DE_SESSAO} horas neste aparelho.</p>
  </main>
</body>
</html>
`;

  return new Response(pagina, {
    status: erro ? 401 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; " +
        "base-uri 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

function cookie(nome, valor, segundos, visivelAoScript = false) {
  return (
    nome + '=' + encodeURIComponent(valor) +
    '; Path=/; Max-Age=' + segundos + '; SameSite=Lax; Secure' +
    (visivelAoScript ? '' : '; HttpOnly')
  );
}

export default async (request, context) => {
  const url = new URL(request.url);

  if (url.pathname === '/sair') {
    const resposta = new Response(null, { status: 303, headers: { Location: '/' } });
    resposta.headers.append('Set-Cookie', cookie(COOKIE_SESSAO, '', 0));
    resposta.headers.append('Set-Cookie', cookie(COOKIE_NOME, '', 0, true));
    resposta.headers.append('Set-Cookie', 'cc_saiu=1; Path=/; Max-Age=30; SameSite=Lax; Secure');
    return resposta;
  }

  if (url.pathname === '/entrar') {
    if (request.method !== 'POST') return telaDeEntrada();

    let formulario;
    try {
      formulario = await request.formData();
    } catch {
      return telaDeEntrada({ erro: 'Não consegui ler o formulário. Tente de novo.' });
    }

    const digitado = String(formulario.get('usuario') || '').trim().toLowerCase();
    const senha = String(formulario.get('senha') || '');
    const cadastro = Object.prototype.hasOwnProperty.call(USUARIOS, digitado) ? USUARIOS[digitado] : null;

    /* O resumo é calculado mesmo quando o usuário não existe, para que a
       resposta demore o mesmo tanto nos dois casos. */
    const conferido = await resumo(senha);
    if (!cadastro || !iguais(conferido, cadastro.hash)) {
      return telaDeEntrada({ erro: 'Usuário ou senha não conferem.', usuario: digitado });
    }

    const segundos = HORAS_DE_SESSAO * 3600;
    const resposta = new Response(null, { status: 303, headers: { Location: '/' } });
    resposta.headers.append('Set-Cookie', cookie(COOKIE_SESSAO, await criarSessao(digitado), segundos));
    resposta.headers.append('Set-Cookie', cookie(COOKIE_NOME, cadastro.nome, segundos, true));
    return resposta;
  }

  if (!(await lerSessao(request.headers.get('cookie')))) {
    /* Pedido do próprio script da página: responde em JSON, para o aviso na
       tela dizer "sessão expirou" em vez de tentar interpretar HTML. */
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ erro: 'sessao-expirada' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    const saiu = (request.headers.get('cookie') || '').includes('cc_saiu=1');
    const resposta = telaDeEntrada({ saiu });
    if (saiu) resposta.headers.append('Set-Cookie', 'cc_saiu=; Path=/; Max-Age=0; SameSite=Lax; Secure');
    return resposta;
  }

  const resposta = await context.next();
  resposta.headers.set('Cache-Control', 'private, no-store');
  return resposta;
};

export const config = { path: '/*' };
