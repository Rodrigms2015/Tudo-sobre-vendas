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

/**
 * Analisa `_headers` no formato do Netlify / Cloudflare Pages: uma linha de padrão de
 * rota na coluna zero, seguida de linhas indentadas `Nome: valor`.
 */
function lerHeaders(texto: string): Map<string, Record<string, string>> {
  const regras = new Map<string, Record<string, string>>();
  let atual: string | null = null;
  for (const linha of texto.split('\n')) {
    if (linha.trim() === '' || linha.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(linha)) {
      atual = linha.trim();
      if (!regras.has(atual)) regras.set(atual, {});
      continue;
    }
    if (!atual) throw new Error(`Cabeçalho indentado sem regra de rota: "${linha}"`);
    const sep = linha.indexOf(':');
    if (sep === -1) throw new Error(`Linha sem "nome: valor": "${linha}"`);
    regras.get(atual)![linha.slice(0, sep).trim()] = linha.slice(sep + 1).trim();
  }
  return regras;
}

describe('cabeçalhos de segurança configurados', () => {
  const bruto = readFileSync(join(RAIZ, 'public/_headers'), 'utf-8');
  const regras = lerHeaders(bruto);

  // O bug que motivou este bloco: a primeira regra era "/ *" (com espaço) em vez de "/*".
  // O arquivo continha todos os cabeçalhos, o teste antigo procurava o texto e passava,
  // e NENHUM cabeçalho era aplicado em produção. Agora o padrão de rota é validado.
  it('todo padrão de rota é válido: começa com "/" e não contém espaço', () => {
    for (const rota of regras.keys()) {
      expect(rota, `padrão de rota inválido: ${JSON.stringify(rota)}`).toMatch(/^\/\S*$/);
    }
  });

  it('existe uma regra que casa com todas as rotas', () => {
    expect([...regras.keys()]).toContain('/*');
  });

  const global = () => regras.get('/*') ?? {};

  it('define uma Content-Security-Policy na regra global', () => {
    expect(global()['Content-Security-Policy']).toBeDefined();
  });

  it("restringe connect-src a 'self' — o navegador impede envio para fora", () => {
    expect(global()['Content-Security-Policy']).toContain("connect-src 'self'");
  });

  it('bloqueia enquadramento e sniffing de tipo', () => {
    expect(global()['X-Frame-Options']).toBe('DENY');
    expect(global()['X-Content-Type-Options']).toBe('nosniff');
    expect(global()['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  it('proíbe object-src, o vetor clássico de plugin', () => {
    expect(global()['Content-Security-Policy']).toContain("object-src 'none'");
  });

  it('desabilita permissões de dispositivo que o produto não usa', () => {
    const permissoes = global()['Permissions-Policy'] ?? '';
    expect(permissoes).toContain('geolocation=()');
    expect(permissoes).toContain('camera=()');
    expect(permissoes).toContain('microphone=()');
  });

  it('não vaza referenciador', () => {
    expect(global()['Referrer-Policy']).toBe('no-referrer');
  });

  it('marca os ativos versionados como imutáveis e o index como no-cache', () => {
    expect(regras.get('/assets/*')?.['Cache-Control']).toContain('immutable');
    expect(regras.get('/index.html')?.['Cache-Control']).toBe('no-cache');
    expect(regras.get('/sw.js')?.['Cache-Control']).toBe('no-cache');
  });
});

describe('fallback de SPA', () => {
  it('_redirects envia toda rota não encontrada para o index com status 200', () => {
    const redirects = readFileSync(join(RAIZ, 'public/_redirects'), 'utf-8');
    const regra = redirects
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '' && !l.startsWith('#'))
      .map((l) => l.split(/\s+/));
    expect(regra).toContainEqual(['/*', '/index.html', '200']);
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
