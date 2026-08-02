/**
 * Gera os ícones PNG do PWA sem dependência externa.
 *
 * Um encoder PNG completo caberia numa dependência, mas para desenhar duas formas
 * geométricas em cores sólidas o custo não se justifica — e mantém a superfície de
 * cadeia de suprimentos mínima (docs/SECURITY.md §8).
 *
 * Uso: node scripts/gerar-icones.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PRETO = [10, 10, 11, 255];
const AMARELO = [242, 183, 5, 255];

function crc32(buf) {
  let c;
  const tabela = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = tabela[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dados) {
  const comprimento = Buffer.alloc(4);
  comprimento.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([comprimento, corpo, crc]);
}

function png(largura, altura, pixels) {
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // profundidade de bits
  ihdr[9] = 6; // RGBA
  const linhas = [];
  for (let y = 0; y < altura; y++) {
    linhas.push(Buffer.from([0])); // filtro "none"
    linhas.push(pixels.subarray(y * largura * 4, (y + 1) * largura * 4));
  }
  const idat = deflateSync(Buffer.concat(linhas), { level: 9 });
  return Buffer.concat([assinatura, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * Marca do BRUTO OS: bloco preto com uma barra angular amarela — referência a
 * sinalização industrial, sem caminhão genérico (docs/DESIGN_SYSTEM.md §8).
 */
function desenhar(tamanho, margemSegura) {
  const pixels = Buffer.alloc(tamanho * tamanho * 4);
  const escala = tamanho / 512;
  const m = margemSegura * tamanho;

  const barraX0 = m + 96 * escala;
  const barraX1 = tamanho - m - 96 * escala;
  const alturaBarra = 56 * escala;
  const espaco = 40 * escala;
  const centro = tamanho / 2;
  const inclinacao = 0.45;

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const i = (y * tamanho + x) * 4;
      let cor = PRETO;

      const deslocamento = (x - centro) * inclinacao;
      const dentroX = x >= barraX0 && x <= barraX1;
      const yTopo = centro - espaco - alturaBarra / 2 + deslocamento;
      const yBase = centro + espaco - alturaBarra / 2 + deslocamento;

      if (dentroX && ((y >= yTopo && y <= yTopo + alturaBarra) || (y >= yBase && y <= yBase + alturaBarra))) {
        cor = AMARELO;
      }

      pixels[i] = cor[0];
      pixels[i + 1] = cor[1];
      pixels[i + 2] = cor[2];
      pixels[i + 3] = cor[3];
    }
  }
  return pixels;
}

mkdirSync(resolve(RAIZ, 'public'), { recursive: true });

const alvos = [
  { arquivo: 'icon-192.png', tamanho: 192, margem: 0.08 },
  { arquivo: 'icon-512.png', tamanho: 512, margem: 0.08 },
  // Maskable precisa de margem maior: o sistema operacional recorta as bordas.
  { arquivo: 'icon-maskable-512.png', tamanho: 512, margem: 0.2 },
];

for (const alvo of alvos) {
  const dados = png(alvo.tamanho, alvo.tamanho, desenhar(alvo.tamanho, alvo.margem));
  writeFileSync(resolve(RAIZ, 'public', alvo.arquivo), dados);
  console.log(`gerado public/${alvo.arquivo} (${alvo.tamanho}x${alvo.tamanho})`);
}
