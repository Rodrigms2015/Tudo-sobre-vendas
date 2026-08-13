/**
 * Guarda compartilhada da Central de Compras.
 *
 * É o que permite as cinco pessoas trabalharem sobre a mesma base: quem sobe
 * os arquivos do ERP grava aqui, e quem abre a página em outro computador
 * recebe exatamente o mesmo conteúdo.
 *
 * O que trafega é o mesmo pacote que o botão "Exportar tudo" gera, compactado
 * no navegador antes de subir (uns 300 kB em vez de 3 MB). O servidor não
 * interpreta o conteúdo — ele só guarda os bytes, a versão e quem gravou.
 *
 *   GET  /api/dados              → situação da guarda, sem baixar o conteúdo
 *   GET  /api/dados?conteudo=1   → os bytes compactados
 *   GET  /api/dados?historico=1  → as versões guardadas, da mais nova para a mais velha
 *   PUT  /api/dados?versaoBase=N → grava, se ninguém tiver gravado antes
 *   PUT  /api/dados?forcar=1     → grava por cima (o usuário confirmou)
 *   PUT  /api/dados?restaurar=N  → traz a versão N de volta COMO VERSÃO NOVA
 *
 * A versão é um contador simples. O navegador manda a versão que ele tinha ao
 * carregar; se a guarda já estiver adiante, a resposta é 409 e a página avisa
 * quem alterou, em vez de apagar o trabalho da outra pessoa em silêncio.
 */

import { getStore } from '@netlify/blobs';
import { lerSessao, USUARIOS } from '../comum/sessao.mjs';

const CHAVE = 'pacote';
const LIMITE_BYTES = 5 * 1024 * 1024;
/* Quantas versões anteriores ficam guardadas. Dez cobre semanas de trabalho e
   mantém o armazenamento previsível. */
const VERSOES_GUARDADAS = 10;
const chaveHistorico = (v) => 'historico/' + String(v).padStart(6, '0');

const json = (corpo, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const guarda = () => getStore({ name: 'central-compras', consistency: 'strong' });

/** Situação atual, com valores neutros quando ainda não gravaram nada. */
async function situacao(loja) {
  const dados = await loja.getMetadata(CHAVE);
  const m = (dados && dados.metadata) || {};
  return {
    versao: Number(m.versao) || 0,
    atualizadoPor: m.atualizadoPor || null,
    atualizadoEm: m.atualizadoEm || null,
    bytes: Number(m.bytes) || 0,
  };
}

/** Copia a versão corrente para o histórico, com os metadados dela. */
async function arquivarAtual(loja, atual) {
  const bytes = await loja.get(CHAVE, { type: 'arrayBuffer' });
  if (!bytes) return;
  await loja.set(chaveHistorico(atual.versao), bytes, {
    metadata: {
      versao: atual.versao,
      atualizadoPor: atual.atualizadoPor,
      atualizadoEm: atual.atualizadoEm,
      bytes: atual.bytes,
    },
  });
}

/** Mantém só as últimas `VERSOES_GUARDADAS`. */
async function podarHistorico(loja, versaoAtual) {
  const limite = versaoAtual - VERSOES_GUARDADAS;
  if (limite <= 0) return;
  const { blobs } = await loja.list({ prefix: 'historico/' });
  await Promise.all(blobs
    .filter((b) => Number(b.key.split('/')[1]) <= limite)
    .map((b) => loja.delete(b.key)));
}

/** As versões guardadas, da mais nova para a mais velha. */
async function listarHistorico(loja) {
  const { blobs } = await loja.list({ prefix: 'historico/' });
  const itens = await Promise.all(blobs.map(async (b) => {
    const d = await loja.getMetadata(b.key);
    const m = (d && d.metadata) || {};
    return {
      versao: Number(m.versao) || Number(b.key.split('/')[1]) || 0,
      atualizadoPor: m.atualizadoPor || null,
      atualizadoEm: m.atualizadoEm || null,
      bytes: Number(m.bytes) || 0,
    };
  }));
  return itens.sort((a, b) => b.versao - a.versao);
}

export default async (request) => {
  const usuario = await lerSessao(request.headers.get('cookie'));
  if (!usuario) return json({ erro: 'sessao-expirada' }, 401);

  const loja = guarda();
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const atual = await situacao(loja);
    if (url.searchParams.get('historico') === '1') {
      return json({ atual, versoes: await listarHistorico(loja) });
    }
    /* Conteúdo de uma versão antiga, para conferir antes de restaurar. */
    const pedida = Number(url.searchParams.get('versao'));
    if (Number.isFinite(pedida) && pedida > 0 && pedida !== atual.versao) {
      const bytes = await loja.get(chaveHistorico(pedida), { type: 'arrayBuffer' });
      if (!bytes) return json({ erro: 'versao-nao-guardada', versao: pedida }, 404);
      return new Response(bytes, {
        headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Versao': String(pedida) },
      });
    }
    if (url.searchParams.get('conteudo') !== '1') return json(atual);
    if (atual.versao === 0) return json({ ...atual, erro: 'guarda-vazia' }, 404);

    const bytes = await loja.get(CHAVE, { type: 'arrayBuffer' });
    if (!bytes) return json({ ...atual, erro: 'guarda-vazia' }, 404);

    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Versao': String(atual.versao),
        'X-Atualizado-Em': atual.atualizadoEm || '',
      },
    });
  }

  if (request.method === 'PUT') {
    /* Restaurar NÃO apaga nada: a versão antiga volta como versão nova, então
       a própria restauração pode ser desfeita. Histórico que some quando se
       usa não é histórico. */
    const restaurar = Number(url.searchParams.get('restaurar'));
    if (Number.isFinite(restaurar) && restaurar > 0) {
      const atual = await situacao(loja);
      const bytes = await loja.get(chaveHistorico(restaurar), { type: 'arrayBuffer' });
      if (!bytes) return json({ erro: 'versao-nao-guardada', versao: restaurar }, 404);
      if (atual.versao > 0) await arquivarAtual(loja, atual);
      const metadata = {
        versao: atual.versao + 1,
        atualizadoPor: USUARIOS[usuario].nome,
        atualizadoEm: new Date().toISOString(),
        bytes: bytes.byteLength,
        restauradaDe: restaurar,
      };
      await loja.set(CHAVE, bytes, { metadata });
      await podarHistorico(loja, metadata.versao);
      return json(metadata);
    }

    const corpo = await request.arrayBuffer();
    if (!corpo || corpo.byteLength === 0) return json({ erro: 'corpo-vazio' }, 400);
    if (corpo.byteLength > LIMITE_BYTES) return json({ erro: 'corpo-grande', limite: LIMITE_BYTES }, 413);

    const atual = await situacao(loja);
    const forcar = url.searchParams.get('forcar') === '1';
    const versaoBase = Number(url.searchParams.get('versaoBase'));

    if (!forcar && Number.isFinite(versaoBase) && versaoBase !== atual.versao) {
      return json({ erro: 'conflito', ...atual }, 409);
    }

    /* Antes de sobrescrever, a versão que está saindo vai para o histórico.
       É o que permite voltar atrás: sem isto, uma publicação errada apaga a
       anterior e não há como desfazer. */
    if (atual.versao > 0) await arquivarAtual(loja, atual);

    const metadata = {
      versao: atual.versao + 1,
      atualizadoPor: USUARIOS[usuario].nome,
      atualizadoEm: new Date().toISOString(),
      bytes: corpo.byteLength,
    };
    await loja.set(CHAVE, corpo, { metadata });
    await podarHistorico(loja, metadata.versao);
    return json(metadata);
  }

  /* Zera a guarda. Não tem botão na página: é manutenção, feita à mão quando
     se quer recomeçar do zero. O que está no navegador de cada um continua. */
  if (request.method === 'DELETE') {
    await loja.delete(CHAVE);
    return json({ versao: 0, atualizadoPor: null, atualizadoEm: null, bytes: 0 });
  }

  return json({ erro: 'metodo-nao-suportado' }, 405);
};

export const config = { path: '/api/dados' };
