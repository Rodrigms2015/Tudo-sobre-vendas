/**
 * Porta de entrada da Central de Compras.
 *
 * Roda no servidor de borda da Netlify, antes de qualquer byte da página
 * sair. Sem usuário e senha corretos, o HTML não é entregue — não adianta
 * ver o código-fonte, porque ele nunca chega ao navegador.
 *
 * Para trocar a senha: altere USUARIO/SENHA aqui e publique de novo.
 */

const USUARIO = 'rodrigo';
const SENHA = 'rp-82z9c6jk19';

const naoAutorizado = () =>
  new Response(
    'Acesso restrito — Central de Compras, filial Ribeirao Preto.',
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Central de Compras", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );

/* Comparação de tempo constante: evita que a diferença de milissegundos
   entre uma senha quase certa e uma errada vire pista para quem tentar. */
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

export default async (request, context) => {
  const cabecalho = request.headers.get('authorization') || '';
  if (!cabecalho.startsWith('Basic ')) return naoAutorizado();

  let credenciais = '';
  try {
    credenciais = atob(cabecalho.slice(6));
  } catch {
    return naoAutorizado();
  }

  const separador = credenciais.indexOf(':');
  if (separador < 0) return naoAutorizado();
  const usuario = credenciais.slice(0, separador);
  const senha = credenciais.slice(separador + 1);

  if (!iguais(usuario, USUARIO) || !iguais(senha, SENHA)) return naoAutorizado();

  const resposta = await context.next();
  resposta.headers.set('Cache-Control', 'private, no-store');
  return resposta;
};

export const config = { path: '/*' };
