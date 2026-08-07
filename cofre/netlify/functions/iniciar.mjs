// POST /api/iniciar — abre um envio e devolve o identificador.
//
// O id vem do servidor, não do navegador. Assim ninguém consegue escolher um id já
// existente e sobrescrever os pedaços de um arquivo guardado.

import { exigirSessao, json, erro } from '../../lib/sessao.mjs';
import { cofre, chaveManifesto, gerarId, TAMANHO_PEDACO } from '../../lib/armazenamento.mjs';

export default async function handler(requisicao) {
  const barrado = exigirSessao(requisicao);
  if (barrado) return barrado;

  if (requisicao.method !== 'POST') return erro(405, 'Método não permitido.');

  const loja = cofre();

  // Colisão é improvável (tempo + aleatório), mas conferir custa uma leitura.
  let id = gerarId();
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    const existe = await loja.getMetadata(chaveManifesto(id)).catch(() => null);
    if (!existe) break;
    id = gerarId();
  }

  return json({ id, tamanhoPedaco: TAMANHO_PEDACO });
}

export const config = { path: '/api/iniciar' };
