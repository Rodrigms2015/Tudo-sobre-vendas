// GET /api/baixar?id=X[&ver=1] — devolve o arquivo remontado.
//
// A resposta é um fluxo: os pedaços são buscados sob demanda enquanto o navegador
// consome. Com `ver=1` o arquivo abre na aba (imagem, PDF); sem, vai como download.

import { exigirSessao, erro } from '../../lib/sessao.mjs';
import { cofre, chaveManifesto, fluxoDoArquivo, idValido } from '../../lib/armazenamento.mjs';

/**
 * Só estes tipos podem abrir na aba. Um HTML enviado ao cofre e aberto em
 * `inline` rodaria script na origem do site — com sessão ativa, ele poderia
 * apagar tudo pela própria API. Fora da lista, o arquivo desce como anexo.
 */
const VISUALIZAVEIS = /^(image\/(png|jpeg|gif|webp|avif)|video\/|audio\/|application\/pdf|text\/plain)/;

function podeAbrirNaAba(tipo) {
  return VISUALIZAVEIS.test(String(tipo || ''));
}

/** `Content-Disposition` com nome ASCII de reserva e a versão UTF-8 (RFC 5987). */
function nomeNoCabecalho(nome, comoAnexo) {
  const reserva = nome.replace(/[^\x20-\x7e]/g, '_');
  const disposicao = comoAnexo ? 'attachment' : 'inline';
  return `${disposicao}; filename="${reserva}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

export default async function handler(requisicao) {
  const barrado = exigirSessao(requisicao);
  if (barrado) return barrado;

  if (requisicao.method !== 'GET') return erro(405, 'Método não permitido.');

  const parametros = new URL(requisicao.url).searchParams;
  const id = parametros.get('id');
  if (!idValido(id)) return erro(400, 'Identificador inválido.');

  const manifesto = await cofre().get(chaveManifesto(id), { type: 'json' }).catch(() => null);
  if (!manifesto) return erro(404, 'Arquivo não encontrado.');

  const naAba = parametros.get('ver') === '1' && podeAbrirNaAba(manifesto.tipo);

  return new Response(fluxoDoArquivo(id, manifesto.partes), {
    status: 200,
    headers: {
      'content-type': manifesto.tipo || 'application/octet-stream',
      'content-length': String(manifesto.tamanho),
      'content-disposition': nomeNoCabecalho(manifesto.nome, !naAba),
      'cache-control': 'no-store, private',
      'x-content-type-options': 'nosniff',
      // Cinto e suspensório: mesmo em `inline`, nada de script nem plugin.
      'content-security-policy': "default-src 'none'; sandbox",
    },
  });
}

export const config = { path: '/api/baixar' };
