// GET    /api/arquivos       → lista o que está guardado
// DELETE /api/arquivos?id=X  → apaga manifesto e pedaços

import { exigirSessao, json, erro } from '../../lib/sessao.mjs';
import { listarArquivos, apagarArquivo, idValido, TAMANHO_PEDACO } from '../../lib/armazenamento.mjs';

export default async function handler(requisicao) {
  const barrado = exigirSessao(requisicao);
  if (barrado) return barrado;

  if (requisicao.method === 'GET') {
    const arquivos = await listarArquivos();
    return json({
      arquivos,
      tamanhoPedaco: TAMANHO_PEDACO,
      totalBytes: arquivos.reduce((soma, a) => soma + (a.tamanho || 0), 0),
    });
  }

  if (requisicao.method === 'DELETE') {
    const id = new URL(requisicao.url).searchParams.get('id');
    if (!idValido(id)) return erro(400, 'Identificador inválido.');

    await apagarArquivo(id);
    return json({ ok: true });
  }

  return erro(405, 'Método não permitido.');
}

export const config = { path: '/api/arquivos' };
