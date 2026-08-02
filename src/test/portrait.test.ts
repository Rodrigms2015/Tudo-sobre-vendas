/**
 * A foto de autoria é um requisito explícito do briefing (PROMPT_MASTER §6.1) e o único
 * ativo do projeto que não pode ser regenerado. Estes testes protegem três coisas:
 * que o arquivo exista, que a razão continue casando com o contêiner do componente
 * (para que `object-fit: cover` não recorte o rosto), e que ninguém o troque por um
 * arquivo desproporcional ou pesado demais para o precache do PWA.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(__dirname, '../..');
const FOTO = join(RAIZ, 'public/rodrigo-soares.jpg');

/** Lê largura e altura direto do marcador SOF do JPEG, sem dependência de imagem. */
function dimensoesJpeg(caminho: string): { largura: number; altura: number } {
  const b = readFileSync(caminho);
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error('Não é um JPEG.');
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marcador = b[i + 1];
    // SOF0..SOF15, exceto DHT (c4), JPG (c8) e DAC (cc).
    if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
      return { altura: b.readUInt16BE(i + 5), largura: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error('Marcador SOF não encontrado.');
}

describe('foto de autoria', () => {
  it('existe em public/rodrigo-soares.jpg', () => {
    expect(existsSync(FOTO)).toBe(true);
  });

  it('é um JPEG válido em 3:4, a mesma razão do contêiner do componente', () => {
    // Razão idêntica significa recorte ZERO: a foto aparece exatamente como entregue.
    const { largura, altura } = dimensoesJpeg(FOTO);
    expect(largura / altura).toBeCloseTo(3 / 4, 3);
  });

  it('tem resolução suficiente para telas de alta densidade', () => {
    const { largura } = dimensoesJpeg(FOTO);
    expect(largura).toBeGreaterThanOrEqual(800);
  });

  it('não é pesada a ponto de inchar o precache do PWA', () => {
    const kb = readFileSync(FOTO).length / 1024;
    expect(kb).toBeLessThan(700);
  });
});
