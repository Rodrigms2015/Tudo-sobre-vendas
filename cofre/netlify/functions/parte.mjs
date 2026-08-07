// POST /api/parte?id=X&n=0 — grava um pedaço do arquivo (corpo = bytes crus).
//
// O manifesto só é escrito depois, por /api/concluir. Enquanto isso o arquivo não
// aparece na listagem: um envio interrompido não deixa entrada meio pronta.

import { exigirSessao, json, erro } from '../../lib/sessao.mjs';
import { cofre, chavePedaco, idValido, TAMANHO_PEDACO } from '../../lib/armazenamento.mjs';

const MAX_PEDACOS = 4000; // ~16 GB com pedaços de 4 MB

export default async function handler(requisicao) {
  const barrado = exigirSessao(requisicao);
  if (barrado) return barrado;

  if (requisicao.method !== 'POST') return erro(405, 'Método não permitido.');

  const parametros = new URL(requisicao.url).searchParams;
  const id = parametros.get('id');
  const n = Number(parametros.get('n'));

  if (!idValido(id)) return erro(400, 'Identificador inválido.');
  if (!Number.isInteger(n) || n < 0 || n >= MAX_PEDACOS) return erro(400, 'Índice inválido.');

  const bytes = new Uint8Array(await requisicao.arrayBuffer());
  if (bytes.byteLength === 0) return erro(400, 'Pedaço vazio.');
  if (bytes.byteLength > TAMANHO_PEDACO) return erro(413, 'Pedaço grande demais.');

  await cofre().set(chavePedaco(id, n), bytes);
  return json({ ok: true, n, bytes: bytes.byteLength });
}

export const config = { path: '/api/parte' };
