// O que estes testes protegem: a integridade dos bytes que entram e saem, e a
// recusa de identificadores e nomes que não deveriam chegar ao armazenamento.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  idValido,
  gerarId,
  limparNome,
  chavePedaco,
  chaveManifesto,
  fluxoDePedacos,
} from '../lib/armazenamento.mjs';

function fluxoDeTexto(texto) {
  const bytes = new TextEncoder().encode(texto);
  return new ReadableStream({
    start(c) {
      // Emite em duas partes de propósito: o leitor precisa aguentar
      // um pedaço que chega picado.
      c.enqueue(bytes.slice(0, Math.ceil(bytes.length / 2)));
      c.enqueue(bytes.slice(Math.ceil(bytes.length / 2)));
      c.close();
    },
  });
}

async function lerTudo(fluxo) {
  const partes = [];
  for await (const bloco of fluxo) partes.push(bloco);
  return new TextDecoder().decode(Buffer.concat(partes.map(Buffer.from)));
}

test('o id que geramos é aceito pelo validador', () => {
  for (let i = 0; i < 200; i += 1) {
    assert.equal(idValido(gerarId()), true);
  }
});

test('id com travessia de caminho é recusado', () => {
  for (const id of ['../segredo', 'a/b', '..', 'arquivos/x', 'ABC12345', '', 'curto', null]) {
    assert.equal(idValido(id), false, `aceitou ${JSON.stringify(id)}`);
  }
});

test('nome de arquivo perde o caminho e fica só o nome', () => {
  assert.equal(limparNome('/etc/passwd'), 'passwd');
  assert.equal(limparNome('C:\\Users\\eu\\nota.txt'), 'nota.txt');
  assert.equal(limparNome('../../../boot.ini'), 'boot.ini');
});

test('nome com aspas ou controle não quebra o cabeçalho de download', () => {
  const sujo = 'rel"atorio\r\nX-Injetado: 1.pdf';
  const limpo = limparNome(sujo);

  assert.ok(!limpo.includes('"'));
  assert.ok(!limpo.includes('\r'));
  assert.ok(!limpo.includes('\n'));
});

test('nome vazio vira um nome utilizável', () => {
  assert.equal(limparNome(''), 'arquivo');
  assert.equal(limparNome(null), 'arquivo');
  assert.equal(limparNome('///'), 'arquivo');
});

test('nome absurdamente longo é cortado', () => {
  assert.ok(limparNome('a'.repeat(5000)).length <= 200);
});

test('acento é preservado no nome', () => {
  assert.equal(limparNome('Relatório de Vendas — junho.xlsx'), 'Relatório de Vendas — junho.xlsx');
});

test('as chaves dos pedaços ordenam alfabeticamente na mesma ordem dos números', () => {
  const chaves = [0, 1, 2, 9, 10, 11, 100, 999].map((n) => chavePedaco('abc12345', n));
  assert.deepEqual([...chaves].sort(), chaves);
  assert.equal(chaveManifesto('abc12345'), 'arquivos/abc12345');
});

test('os pedaços voltam do download na ordem em que foram gravados', async () => {
  const pedacos = ['Bom ', 'dia, ', 'cofre!'];
  const fluxo = fluxoDePedacos((n) => fluxoDeTexto(pedacos[n]), pedacos.length);

  assert.equal(await lerTudo(fluxo), 'Bom dia, cofre!');
});

test('arquivo de um pedaço só sai inteiro', async () => {
  const fluxo = fluxoDePedacos(() => fluxoDeTexto('sozinho'), 1);
  assert.equal(await lerTudo(fluxo), 'sozinho');
});

test('pedaço faltando derruba o download em vez de entregar arquivo truncado', async () => {
  const fluxo = fluxoDePedacos((n) => (n === 1 ? null : fluxoDeTexto('ok')), 3);

  await assert.rejects(() => lerTudo(fluxo), /Pedaço 1 não existe/);
});
