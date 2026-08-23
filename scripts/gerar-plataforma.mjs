/**
 * Gera a versão autocontida da Central de Compras a partir de plataforma/corpo.html.
 *
 * O corpo é mantido como fragmento (sem doctype, html, head ou body) porque é
 * assim que ele é publicado como página hospedada. Este script embrulha o mesmo
 * fragmento num documento completo para que o arquivo funcione aberto direto do
 * disco e para que o deploy do site sirva /compras.html.
 *
 *   node scripts/gerar-plataforma.mjs
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'plataforma', 'corpo.html');
const destino = join(raiz, 'public', 'compras.html');

let corpo = await readFile(origem, 'utf8');

/*
 * Injeta o motor de identidade. Ele mora em src/domain/estoque/identidade.js
 * porque lá ele é testado pelo vitest; a página é um arquivo só, sem build,
 * então o módulo entra inline. Existe UMA fonte da verdade — se alguém editar
 * a cópia inline, o próximo `npm run plataforma` sobrescreve.
 */
const MODULOS = [
  { arquivo: ['src', 'domain', 'estoque', 'identidade.js'], abre: '/* INICIO MOTOR IDENTIDADE */', fecha: '/* FIM MOTOR IDENTIDADE */', nome: 'identidade' },
  { arquivo: ['src', 'domain', 'compras', 'reposicao.js'], abre: '/* INICIO MOTOR REPOSICAO */', fecha: '/* FIM MOTOR REPOSICAO */', nome: 'reposicao' },
  { arquivo: ['src', 'domain', 'dados', 'leitura.js'], abre: '/* INICIO MOTOR LEITURA */', fecha: '/* FIM MOTOR LEITURA */', nome: 'leitura' },
  { arquivo: ['src', 'domain', 'dados', 'xlsx.js'], abre: '/* INICIO MOTOR XLSX */', fecha: '/* FIM MOTOR XLSX */', nome: 'xlsx' },
  { arquivo: ['src', 'domain', 'clientes', 'carteira.js'], abre: '/* INICIO MOTOR CARTEIRA */', fecha: '/* FIM MOTOR CARTEIRA */', nome: 'carteira' },
];

for (const m of MODULOS) {
  const fonte = await readFile(join(raiz, ...m.arquivo), 'utf8');
  if (!corpo.includes(m.abre) || !corpo.includes(m.fecha)) {
    throw new Error(`plataforma/corpo.html precisa dos marcadores do motor ${m.nome}.`);
  }
  /* `export` sai (a página não tem módulos) e o bloco `export { ... }` do fim
     também, senão vira erro de sintaxe dentro do script embutido. */
  const inline = fonte
    .replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export /gm, '');
  corpo =
    corpo.slice(0, corpo.indexOf(m.abre) + m.abre.length) +
    '\n' + inline + '\n' +
    corpo.slice(corpo.indexOf(m.fecha));
  console.log(`motor ${m.nome} injetado — ${(inline.length / 1024).toFixed(0)} kB`);
}

const casouTitulo = corpo.match(/<title>([\s\S]*?)<\/title>/i);
if (!casouTitulo) throw new Error('plataforma/corpo.html precisa declarar um <title>.');
const titulo = casouTitulo[1].trim();
const semTitulo = corpo.replace(/<title>[\s\S]*?<\/title>\s*/i, '');

const documento = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="light dark" />
<meta name="robots" content="noindex, nofollow" />
<meta name="description" content="Analise de estoque, lista de compra priorizada, oportunidades de venda e carteira de clientes. A filial e a do relatorio carregado. Os dados ficam no navegador de quem carrega o arquivo." />
<title>${titulo}</title>
</head>
<body>
${semTitulo.trim()}
</body>
</html>
`;

await writeFile(destino, documento, 'utf8');
console.log(`public/compras.html gerado — ${(documento.length / 1024).toFixed(0)} kB`);

/*
 * A CSP do site é `script-src 'self'`, que bloqueia script embutido. A página
 * precisa ser um arquivo só (ela roda também aberta direto do disco), então em
 * vez de afrouxar a política para 'unsafe-inline' publicamos o hash sha256 do
 * script — continua proibido executar qualquer outro código embutido.
 */
const scripts = [...documento.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
if (scripts.length !== 1) throw new Error(`Esperava exatamente um <script> embutido, encontrei ${scripts.length}.`);
const hash = "'sha256-" + createHash('sha256').update(scripts[0], 'utf8').digest('base64') + "'";

const caminhoHeaders = join(raiz, 'public', '_headers');
const headers = await readFile(caminhoHeaders, 'utf8');
const ABRE = '# INICIO BLOCO GERADO — scripts/gerar-plataforma.mjs';
const FECHA = '# FIM BLOCO GERADO';
const bloco = [
  ABRE,
  '# Nao edite a mao: rode `npm run plataforma` depois de mexer em plataforma/corpo.html.',
  '/compras.html',
  `  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src ${hash}; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'`,
  '  Cache-Control: no-cache',
  FECHA,
].join('\n');

const jaTem = headers.includes(ABRE);
const atualizado = jaTem
  ? headers.replace(new RegExp(`${ABRE}[\\s\\S]*?${FECHA}`), bloco)
  : `${headers.trimEnd()}\n\n${bloco}\n`;
await writeFile(caminhoHeaders, atualizado, 'utf8');
console.log(`public/_headers atualizado — script-src ${hash}`);

/*
 * Cópia publicada com login (deploy-netlify/). Duas diferenças em relação à
 * cópia de cima: `connect-src 'self'`, porque lá a página conversa com
 * /api/dados para manter a base da equipe, e `form-action 'self'`, por causa
 * do formulário da tela de entrada. O hash do script é o mesmo — a página é a
 * mesma —, então sai daqui para não haver duas fontes da verdade.
 */
const publicar = join(raiz, 'deploy-netlify', 'publicar');
await mkdir(publicar, { recursive: true });
await writeFile(join(publicar, 'index.html'), documento, 'utf8');
await writeFile(
  join(publicar, '_headers'),
  [
    '# Gerado por scripts/gerar-plataforma.mjs. Nao edite a mao.',
    '/*',
    `  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src ${hash}; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: no-referrer',
    '  X-Frame-Options: DENY',
    '  X-Robots-Tag: noindex, nofollow',
    '  Cache-Control: private, no-store',
    '',
  ].join('\n'),
  'utf8',
);
console.log('deploy-netlify/publicar/ atualizado — index.html + _headers');
