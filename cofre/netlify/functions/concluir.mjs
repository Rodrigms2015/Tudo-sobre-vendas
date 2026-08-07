// POST /api/concluir — fecha um envio, gravando o manifesto.
//
// Antes de gravar, confere que a quantidade de pedaços no armazenamento bate com a
// que o navegador diz ter enviado. Se um pedaço se perdeu no caminho, o envio é
// recusado e o lixo é apagado — melhor um erro claro do que um arquivo corrompido
// que só se descobre no download.

import { exigirSessao, json, erro } from '../../lib/sessao.mjs';
import {
  cofre,
  chaveManifesto,
  apagarArquivo,
  idValido,
  limparNome,
} from '../../lib/armazenamento.mjs';

export default async function handler(requisicao) {
  const barrado = exigirSessao(requisicao);
  if (barrado) return barrado;

  if (requisicao.method !== 'POST') return erro(405, 'Método não permitido.');

  let corpo;
  try {
    corpo = await requisicao.json();
  } catch {
    return erro(400, 'Corpo inválido.');
  }

  const { id, nome, tamanho, tipo, partes } = corpo ?? {};

  if (!idValido(id)) return erro(400, 'Identificador inválido.');
  if (!Number.isInteger(partes) || partes < 1) return erro(400, 'Contagem de pedaços inválida.');
  if (!Number.isFinite(tamanho) || tamanho < 0) return erro(400, 'Tamanho inválido.');

  const loja = cofre();
  const { blobs } = await loja.list({ prefix: `partes/${id}/` });

  if (blobs.length !== partes) {
    await apagarArquivo(id);
    return erro(409, `Envio incompleto: ${blobs.length} de ${partes} pedaços chegaram.`);
  }

  const manifesto = {
    id,
    nome: limparNome(nome),
    tamanho,
    tipo: typeof tipo === 'string' && tipo.length < 120 ? tipo : 'application/octet-stream',
    partes,
    enviadoEm: new Date().toISOString(),
  };

  await loja.setJSON(chaveManifesto(id), manifesto);
  return json({ ok: true, arquivo: manifesto });
}

export const config = { path: '/api/concluir' };
