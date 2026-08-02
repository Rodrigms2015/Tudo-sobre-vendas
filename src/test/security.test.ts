/**
 * Verificações de segurança que devem falhar o build se violadas.
 * Correspondem ao checklist de release em docs/SECURITY.md §10.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(__dirname, '../..');
const SRC = join(RAIZ, 'src');

function arquivosDe(dir: string, extensoes: string[]): string[] {
  const saida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      saida.push(...arquivosDe(caminho, extensoes));
    } else if (extensoes.some((e) => entrada.endsWith(e))) {
      saida.push(caminho);
    }
  }
  return saida;
}

// Este próprio arquivo cita os padrões proibidos para poder procurá-los; ele se exclui.
const fontes = arquivosDe(SRC, ['.ts', '.tsx']).filter((f) => !f.endsWith('security.test.ts'));
const conteudos = fontes.map((f) => ({ arquivo: f, texto: readFileSync(f, 'utf-8') }));

describe('proibições estruturais no código-fonte', () => {
  it('nenhum uso de dangerouslySetInnerHTML', () => {
    // Dados importados de CSV nunca são renderizados como HTML.
    const violacoes = conteudos
      .filter((c) => c.texto.includes('dangerouslySetInnerHTML'))
      .map((c) => c.arquivo);
    expect(violacoes).toEqual([]);
  });

  it('nenhum uso de eval ou construção dinâmica de função', () => {
    const violacoes = conteudos
      .filter(
        (c) =>
          /\beval\s*\(/.test(c.texto) ||
          /new\s+Function\s*\(/.test(c.texto),
      )
      .map((c) => c.arquivo);
    expect(violacoes).toEqual([]);
  });

  it('nenhuma chamada de rede: sem fetch, XMLHttpRequest ou WebSocket', () => {
    // O MVP não tem backend. Qualquer rede seria uma regressão de arquitetura.
    const violacoes = conteudos
      .filter(
        (c) =>
          /\bfetch\s*\(/.test(c.texto) ||
          /XMLHttpRequest/.test(c.texto) ||
          /new\s+WebSocket/.test(c.texto),
      )
      .map((c) => c.arquivo);
    expect(violacoes).toEqual([]);
  });

  it('nenhum padrão de credencial no código-fonte', () => {
    const padroes = [
      /sk-[A-Za-z0-9]{20,}/,
      /api[_-]?key\s*[:=]\s*['"][A-Za-z0-9]{16,}/i,
      /secret\s*[:=]\s*['"][A-Za-z0-9]{16,}/i,
      /Bearer\s+[A-Za-z0-9._-]{20,}/,
      /AKIA[0-9A-Z]{16}/,
    ];
    const violacoes: string[] = [];
    for (const c of conteudos) {
      for (const p of padroes) {
        if (p.test(c.texto)) violacoes.push(`${c.arquivo} (${p})`);
      }
    }
    expect(violacoes).toEqual([]);
  });

  it('nenhum entrypoint RSC do React Router é importado', () => {
    // O advisory alto conhecido em react-router exige o modo RSC. Ver docs/SECURITY.md §8.1.
    // Este teste falha se alguém introduzir RSC e tornar o advisory alcançável.
    const violacoes = conteudos
      .filter((c) => /from ['"]react-router\/(rsc|server)/.test(c.texto))
      .map((c) => c.arquivo);
    expect(violacoes).toEqual([]);
  });

  it('nenhum arquivo .env versionado', () => {
    const naRaiz = readdirSync(RAIZ);
    expect(naRaiz.filter((f) => f.startsWith('.env') && f !== '.env.example')).toEqual([]);
  });
});

describe('cabeçalhos de segurança configurados', () => {
  const headers = readFileSync(join(RAIZ, 'public/_headers'), 'utf-8');

  it('define uma Content-Security-Policy', () => {
    expect(headers).toContain('Content-Security-Policy');
  });

  it("restringe connect-src a 'self' — o navegador impede envio para fora", () => {
    expect(headers).toContain("connect-src 'self'");
  });

  it('bloqueia enquadramento e sniffing de tipo', () => {
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain("frame-ancestors 'none'");
  });

  it("proíbe object-src, o vetor clássico de plugin", () => {
    expect(headers).toContain("object-src 'none'");
  });

  it('desabilita permissões de dispositivo que o produto não usa', () => {
    expect(headers).toContain('geolocation=()');
    expect(headers).toContain('camera=()');
    expect(headers).toContain('microphone=()');
  });
});

describe('vocabulário proibido na interface', () => {
  // Ver docs/INFORMATION_ARCHITECTURE.md §9. Termos que quebram a credibilidade
  // do produto com um vendedor de linha pesada, ou que prometem o que não temos.
  const paginas = conteudos.filter((c) => c.arquivo.includes('/ui/'));

  it('nenhuma tela promete "prever"', () => {
    const violacoes = paginas
      .filter((c) => /\bprever\b|\bprevisão de falha\b/i.test(c.texto))
      // Permitido apenas em negação explícita ("não é previsão de falha").
      .filter((c) => !/não .{0,30}(prever|previsão)/i.test(c.texto))
      .map((c) => c.arquivo);
    expect(violacoes).toEqual([]);
  });

  it('nenhuma tela usa "lead", "funil" ou "pipeline"', () => {
    const violacoes = paginas
      .filter((c) => /\blead\b|\bfunil\b|\bpipeline\b/i.test(c.texto))
      .map((c) => c.arquivo);
    expect(violacoes).toEqual([]);
  });

  it('nenhuma tela marca recurso como "em breve"', () => {
    // PROMPT_MASTER §16: nada "em breve" no fluxo principal.
    const violacoes = paginas
      .filter((c) => /em breve/i.test(c.texto))
      .map((c) => c.arquivo);
    expect(violacoes).toEqual([]);
  });
});
