// O que estes testes protegem: as regras que decidem quem entra no cofre.
// Se um deles ficar verde depois de você afrouxar a autenticação, o teste está errado.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  conferirSenha,
  criarToken,
  tokenValido,
  cookieDeSessao,
  cookieDeSaida,
  lerConfiguracao,
} from '../lib/sessao.mjs';

const SEGREDO = 'segredo-de-teste-bem-comprido-para-hmac';

test('a senha certa passa e a errada não', () => {
  assert.equal(conferirSenha('abracadabra-123', 'abracadabra-123'), true);
  assert.equal(conferirSenha('abracadabra-124', 'abracadabra-123'), false);
});

test('senha de tamanho diferente é recusada sem estourar erro', () => {
  // Comparação ingênua com `timingSafeEqual` lançaria aqui — e o tamanho vazaria.
  assert.equal(conferirSenha('curta', 'uma-senha-bem-mais-longa'), false);
  assert.equal(conferirSenha('', 'uma-senha-bem-mais-longa'), false);
});

test('um token recém-criado vale', () => {
  assert.equal(tokenValido(criarToken(SEGREDO), SEGREDO), true);
});

test('token assinado com outro segredo não vale', () => {
  const token = criarToken(SEGREDO);
  assert.equal(tokenValido(token, 'outro-segredo-qualquer'), false);
});

test('token com validade adulterada não vale', () => {
  const token = criarToken(SEGREDO);
  const assinatura = token.slice(token.indexOf('.'));
  const esticado = `${Date.now() + 10 ** 12}${assinatura}`;

  assert.equal(tokenValido(esticado, SEGREDO), false);
});

test('token vencido não vale', () => {
  const token = criarToken(SEGREDO, Date.now() - 400 * 24 * 60 * 60 * 1000);
  assert.equal(tokenValido(token, SEGREDO), false);
});

test('lixo no lugar do token não vale', () => {
  for (const entrada of [null, undefined, '', '.', 'abc', 'abc.def', 42, {}]) {
    assert.equal(tokenValido(entrada, SEGREDO), false, `aceitou ${JSON.stringify(entrada)}`);
  }
});

test('o cookie de sessão não é legível por script nem viaja em site de terceiro', () => {
  const cookie = cookieDeSessao(criarToken(SEGREDO));

  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
});

test('sair zera o cookie na hora', () => {
  assert.match(cookieDeSaida(), /Max-Age=0/);
});

test('sem variáveis de ambiente, o cofre se recusa a autenticar', () => {
  const antes = { senha: process.env.SENHA_ACESSO, segredo: process.env.SEGREDO_SESSAO };
  delete process.env.SENHA_ACESSO;
  delete process.env.SEGREDO_SESSAO;

  const config = lerConfiguracao();
  assert.equal(config.ok, false);
  assert.deepEqual(config.faltando, ['SENHA_ACESSO', 'SEGREDO_SESSAO']);

  if (antes.senha) process.env.SENHA_ACESSO = antes.senha;
  if (antes.segredo) process.env.SEGREDO_SESSAO = antes.segredo;
});

test('senha curta demais é recusada na configuração, não no login', () => {
  const antes = { senha: process.env.SENHA_ACESSO, segredo: process.env.SEGREDO_SESSAO };
  process.env.SENHA_ACESSO = '123456';
  process.env.SEGREDO_SESSAO = SEGREDO;

  assert.equal(lerConfiguracao().ok, false);

  if (antes.senha) process.env.SENHA_ACESSO = antes.senha;
  else delete process.env.SENHA_ACESSO;
  if (antes.segredo) process.env.SEGREDO_SESSAO = antes.segredo;
  else delete process.env.SEGREDO_SESSAO;
});
