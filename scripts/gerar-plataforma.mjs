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

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'plataforma', 'corpo.html');
const destino = join(raiz, 'public', 'compras.html');

const corpo = await readFile(origem, 'utf8');

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
<meta name="description" content="Analise de estoque, lista de compra priorizada e oportunidades de venda da filial Ribeirao Preto. Os dados ficam no navegador de quem carrega o arquivo." />
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
