// Camada de armazenamento sobre o Netlify Blobs.
//
// Um arquivo é guardado em duas coisas:
//   `arquivos/{id}`     → manifesto JSON (nome, tamanho, tipo, nº de pedaços)
//   `partes/{id}/{n}`   → os bytes, em pedaços
//
// O fatiamento existe porque uma função do Netlify aceita no máximo ~6 MB por
// requisição. Enviando em pedaços de 4 MB o tamanho do arquivo deixa de importar,
// e o download remonta os pedaços em fluxo — sem carregar tudo na memória.

import { getStore } from '@netlify/blobs';

export const TAMANHO_PEDACO = 4 * 1024 * 1024;

/**
 * Consistência forte: sem isso, um arquivo recém-enviado poderia não aparecer na
 * listagem seguinte, e o usuário acharia que o envio falhou.
 */
export function cofre() {
  return getStore({ name: 'cofre', consistency: 'strong' });
}

export function controle() {
  return getStore({ name: 'cofre-controle', consistency: 'strong' });
}

/** Ids são gerados por nós; recusamos qualquer coisa fora do formato ao ler. */
export function idValido(id) {
  return typeof id === 'string' && /^[a-z0-9]{8,40}$/.test(id);
}

export function gerarId() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toLowerCase();
}

/**
 * Nome de arquivo seguro para gravar no manifesto e devolver no
 * `Content-Disposition`. Tira caminho, caractere de controle e aspas.
 */
export function limparNome(bruto) {
  const semCaminho = String(bruto ?? '').split(/[/\\]/).pop() ?? '';
  const limpo = semCaminho.replace(/[\u0000-\u001f\u007f"\\]/g, '').trim();
  return limpo.slice(0, 200) || 'arquivo';
}

export const chaveManifesto = (id) => `arquivos/${id}`;
export const chavePedaco = (id, n) => `partes/${id}/${String(n).padStart(6, '0')}`;

/** Lista os manifestos, do mais recente para o mais antigo. */
export async function listarArquivos() {
  const loja = cofre();
  const { blobs } = await loja.list({ prefix: 'arquivos/' });

  const manifestos = await Promise.all(
    blobs.map((b) => loja.get(b.key, { type: 'json' }).catch(() => null)),
  );

  return manifestos
    .filter((m) => m && m.id && m.nome)
    .sort((a, b) => String(b.enviadoEm).localeCompare(String(a.enviadoEm)));
}

/** Apaga manifesto e todos os pedaços. Usado tanto ao remover quanto ao abortar. */
export async function apagarArquivo(id) {
  const loja = cofre();
  const { blobs } = await loja.list({ prefix: `partes/${id}/` });

  await Promise.all(blobs.map((b) => loja.delete(b.key)));
  await loja.delete(chaveManifesto(id));
}

/**
 * Junta pedaços em um único fluxo de leitura, buscando um de cada vez.
 *
 * Recebe o buscador por parâmetro para poder ser testado sem armazenamento real.
 * Só um pedaço fica na memória por vez, então baixar um arquivo grande não
 * derruba a função por falta de memória.
 */
export function fluxoDePedacos(buscarPedaco, totalPedacos) {
  let indice = 0;
  let leitor = null;

  return new ReadableStream({
    async pull(controlador) {
      for (;;) {
        if (!leitor) {
          if (indice >= totalPedacos) {
            controlador.close();
            return;
          }
          const pedaco = await buscarPedaco(indice);
          if (!pedaco) {
            controlador.error(new Error(`Pedaço ${indice} não existe.`));
            return;
          }
          indice += 1;
          leitor = pedaco.getReader();
        }

        const { done, value } = await leitor.read();
        if (done) {
          leitor = null;
          continue; // passa para o próximo pedaço
        }
        controlador.enqueue(value);
        return;
      }
    },
    async cancel(motivo) {
      if (leitor) await leitor.cancel(motivo);
    },
  });
}

/** O fluxo de um arquivo guardado, pronto para virar corpo de resposta. */
export function fluxoDoArquivo(id, totalPedacos) {
  const loja = cofre();
  return fluxoDePedacos(
    (n) => loja.get(chavePedaco(id, n), { type: 'stream' }),
    totalPedacos,
  );
}
