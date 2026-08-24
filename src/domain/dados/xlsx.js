/**
 * Leitor de .xlsx, sem biblioteca.
 *
 * FONTE ÚNICA DA VERDADE: testado pelo vitest E injetado na página. JS puro.
 *
 * Existe porque o relatório de movimentação de Passo Fundo sai em .xlsx, e a
 * página mandava o usuário reexportar como .xls — pedir para a pessoa mudar o
 * jeito de tirar o relatório é empurrar o custo do software para quem usa.
 *
 * Um .xlsx é um ZIP com XML dentro. O navegador já sabe as duas coisas:
 * `DecompressionStream('deflate-raw')` descompacta, `DOMParser` lê o XML.
 * Nenhuma dependência entra no projeto por causa disto.
 *
 * ────────────────────────────────────────────────────────────────────────
 * O DESLIZE DE COLUNA
 *
 * Este relatório não é uma planilha: é um relatório de texto do Opus jogado
 * dentro de um .xlsx. Cada campo ocupa uma FAIXA de colunas, e o valor cai
 * numa coluna ou na vizinha conforme o alinhamento do campo. Medido no
 * arquivo de 21/08: 7.714 linhas começam na coluna A e 58 na coluna B, e a
 * descrição aparece ora na coluna 8, ora na 9.
 *
 * Ler por letra fixa embaralha tudo — o tipo de movimento cai na coluna do
 * documento e "S" vira "NF00014902". Por isso a leitura devolve as células
 * com o índice REAL da coluna, e `alinharNaGrade` encaixa cada uma no campo
 * de cabeçalho MAIS PRÓXIMO, depois de corrigir o deslocamento da linha.
 *
 * ────────────────────────────────────────────────────────────────────────
 * A DATA
 *
 * Data em .xlsx é número: 46027 é 05/01/2026. Quem decide se aquele número é
 * data é o formato da célula (`styles.xml`), não o valor. A leitura devolve a
 * data já como `dd/mm/aaaa` — o mesmo texto que a pessoa vê no Excel — para
 * que o resto da página continue lendo data de um jeito só.
 */

/** `'AI'` → 34. Base zero. */
export function indiceDaColuna(ref) {
  const letras = String(ref || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  if (!letras) return -1;
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Descompacta um membro do ZIP. Só `stored` e `deflate`, que é o que o Excel usa. */
async function inflarMembro(bytes, metodo) {
  if (metodo === 0) return bytes;
  if (metodo !== 8) throw new Error('Compressão não suportada no .xlsx: método ' + metodo);
  const fluxo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

/**
 * Abre o ZIP pelo diretório central, que é o único lugar onde o tamanho
 * comprimido é confiável — o cabeçalho local pode vir com zero quando o
 * arquivo foi escrito em streaming.
 *
 * @param {ArrayBuffer} buffer
 * @returns {Promise<Map<string, Uint8Array>>}
 */
export async function abrirZip(buffer) {
  const b = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  /* Fim do diretório central: assinatura 0x06054b50, procurada de trás. */
  let fim = -1;
  for (let i = b.length - 22; i >= 0 && i > b.length - 66000; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new Error('Não parece um .xlsx: não achei o índice do arquivo.');

  const quantos = dv.getUint16(fim + 10, true);
  let p = dv.getUint32(fim + 16, true);
  const saida = new Map();
  for (let i = 0; i < quantos; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const metodo = dv.getUint16(p + 10, true);
    const tamComp = dv.getUint32(p + 20, true);
    const tamNome = dv.getUint16(p + 28, true);
    const tamExtra = dv.getUint16(p + 30, true);
    const tamCom = dv.getUint16(p + 32, true);
    const inicioLocal = dv.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(b.subarray(p + 46, p + 46 + tamNome));
    /* No cabeçalho local o nome e o extra têm tamanhos próprios. */
    const nomeLocal = dv.getUint16(inicioLocal + 26, true);
    const extraLocal = dv.getUint16(inicioLocal + 28, true);
    const dados = inicioLocal + 30 + nomeLocal + extraLocal;
    saida.set(nome, await inflarMembro(b.subarray(dados, dados + tamComp), metodo));
    p += 46 + tamNome + tamExtra + tamCom;
  }
  return saida;
}

/* Nome longo de propósito: este módulo é injetado numa página que já tem
   variáveis chamadas `texto`, e o escopo é o mesmo. */
const textoUtf8 = (bytes) => new TextDecoder('utf-8').decode(bytes);

/**
 * Um código de formato é de data quando tem `d`, `m` ou `y` fora de literal.
 * Os ids embutidos 14–22 e 45–47 são data/hora por definição do formato OOXML
 * e não aparecem em `styles.xml`.
 *
 * @param {string|null} codigo formato declarado, ou `null` se for embutido
 * @param {number} id
 */
export function formatoEhData(codigo, id) {
  if (codigo == null) return (id >= 14 && id <= 22) || (id >= 45 && id <= 47);
  /* Tira o que está entre colchetes (cor, condição) e entre aspas (literal):
     "Dia" não faz de um formato de texto um formato de data. */
  const limpo = String(codigo).replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, '');
  return /[dy]/i.test(limpo);
}

/** Índices de estilo que são data, lidos de `xl/styles.xml`. */
function estilosDeData(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const codigos = new Map();
  for (const nf of doc.getElementsByTagName('numFmt')) {
    codigos.set(Number(nf.getAttribute('numFmtId')), nf.getAttribute('formatCode'));
  }
  const cellXfs = doc.getElementsByTagName('cellXfs')[0];
  const saida = new Set();
  if (!cellXfs) return saida;
  const xfs = cellXfs.getElementsByTagName('xf');
  for (let i = 0; i < xfs.length; i++) {
    const id = Number(xfs[i].getAttribute('numFmtId') || 0);
    if (formatoEhData(codigos.has(id) ? codigos.get(id) : null, id)) saida.add(i);
  }
  return saida;
}

/**
 * Data serial do Excel para ISO. A origem é 30/12/1899 por causa do bug de
 * 1900 que a Microsoft manteve por compatibilidade.
 *
 * @param {unknown} serial
 * @returns {string|null} `aaaa-mm-dd`
 */
export function dataDoSerial(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** `46027` → `'05/01/2026'`, que é o que a pessoa vê na tela do Excel. */
export function dataSerialBr(serial) {
  const iso = dataDoSerial(serial);
  if (!iso) return null;
  return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
}

/** Nomes das planilhas em ordem NUMÉRICA: sheet1, sheet2, … sheet10. */
export function planilhasDoZip(arquivos) {
  const nomes = [];
  for (const nome of arquivos.keys()) {
    const m = /^xl\/worksheets\/sheet(\d+)\.xml$/.exec(nome);
    if (m) nomes.push({ nome, n: Number(m[1]) });
  }
  /* Em ordem de texto, `sheet10` vem antes de `sheet2` e o relatório sai fora
     de ordem. Com centenas de planilhas isso embaralha meses inteiros. */
  return nomes.sort((a, b) => a.n - b.n).map((x) => x.nome);
}

/**
 * Lê TODAS as planilhas, em ordem, e devolve as linhas de todas emendadas —
 * cada uma como `[{coluna, valor}]` com o índice REAL da coluna.
 *
 * Ler só a `sheet1` bastou até aparecer o relatório "compressed" do Opus, que
 * espalha um relatório só por **centenas de planilhas** (medido: de 136 a 880
 * num arquivo). Com uma planilha só, 96% dos lançamentos sumiam sem erro
 * nenhum — o pior tipo de perda, a silenciosa.
 *
 * @param {ArrayBuffer} buffer
 * @returns {Promise<Array<Array<{coluna: number, valor: string}>>>}
 */
export async function lerXlsx(buffer) {
  const arquivos = await abrirZip(buffer);
  const planilhas = planilhasDoZip(arquivos);
  if (!planilhas.length) throw new Error('O .xlsx não tem planilha legível (xl/worksheets/sheet1.xml).');

  /* Textos compartilhados: o Excel guarda cada string uma vez só. */
  const compartilhadas = [];
  const sst = arquivos.get('xl/sharedStrings.xml');
  if (sst) {
    const doc = new DOMParser().parseFromString(textoUtf8(sst), 'application/xml');
    for (const si of doc.getElementsByTagName('si')) {
      let junto = '';
      for (const t of si.getElementsByTagName('t')) junto += t.textContent || '';
      compartilhadas.push(junto);
    }
  }
  const estilos = arquivos.has('xl/styles.xml')
    ? estilosDeData(textoUtf8(arquivos.get('xl/styles.xml')))
    : new Set();

  const linhas = [];
  for (const nomePlanilha of planilhas) {
    const doc = new DOMParser().parseFromString(textoUtf8(arquivos.get(nomePlanilha)), 'application/xml');
    for (const linha of doc.getElementsByTagName('row')) {
      const celulas = [];
      for (const c of linha.getElementsByTagName('c')) {
        const tipo = c.getAttribute('t');
        let v = '';
        if (tipo === 'inlineStr') {
          for (const t of c.getElementsByTagName('t')) v += t.textContent || '';
        } else {
          const no = c.getElementsByTagName('v')[0];
          v = no ? (no.textContent || '') : '';
          if (tipo === 's' && v !== '') v = compartilhadas[Number(v)] || '';
        }
        /* Apara só as pontas: a quebra de linha do MEIO é o que separa os
           registros dentro de uma célula de texto, e não pode se perder. */
        v = String(v).replace(/^\s+|\s+$/g, '');
        /* Só número em célula formatada como data vira data. Texto que por
           acaso está numa coluna de data continua texto. */
        if (v && !tipo && estilos.has(Number(c.getAttribute('s') || 0))) {
          v = dataSerialBr(v) || v;
        }
        if (v) celulas.push({ coluna: indiceDaColuna(c.getAttribute('r')), valor: v });
      }
      if (celulas.length) linhas.push(celulas);
    }
  }
  return linhas;
}

/**
 * Encaixa as células de uma linha nas colunas de referência, corrigindo o
 * deslize.
 *
 * Duas regras, nesta ordem:
 *
 * 1. **Deslocamento da linha**: a diferença entre a primeira coluna preenchida
 *    da linha e a primeira do cabeçalho. É o que impede o tipo de movimento
 *    cair na coluna do documento.
 * 2. **Referência mais próxima**: cada célula vai para o campo cuja coluna
 *    (já deslocada) está mais perto. É o que segura o campo que oscila entre
 *    duas colunas conforme o alinhamento — a descrição deste relatório cai na
 *    coluna 8 em 2.521 linhas e na 9 em 5.193.
 *
 * Duas células no mesmo campo são juntadas com espaço, que é o caso da
 * descrição que o gerador quebrou em pedaços.
 *
 * @param {Array<{coluna: number, valor: string}>} celulas
 * @param {number[]} referencias colunas do cabeçalho, em ordem
 * @param {number} [primeira] primeira coluna do cabeçalho; por padrão a
 *   primeira referência. Existe para quem pede só alguns campos e mesmo assim
 *   precisa do deslocamento certo.
 * @returns {string[]} um valor por referência, `''` onde não veio nada
 */
export function alinharNaGrade(celulas, referencias, primeira) {
  const cs = celulas || [];
  const refs = referencias || [];
  const saida = refs.map(() => '');
  if (!cs.length || !refs.length) return saida;
  const desloc = cs[0].coluna - (primeira === undefined ? refs[0] : primeira);
  for (const c of cs) {
    let melhor = 0;
    let perto = Infinity;
    for (let j = 0; j < refs.length; j++) {
      const d = Math.abs(refs[j] + desloc - c.coluna);
      if (d < perto) { perto = d; melhor = j; }
    }
    saida[melhor] = saida[melhor] ? saida[melhor] + ' ' + c.valor : c.valor;
  }
  return saida;
}

/**
 * Mesma regra de `alinharNaGrade`, com os campos nomeados. Usada por quem já
 * sabe em que coluna cada campo mora.
 *
 * @param {Array<{coluna: number, valor: string}>} celulas
 * @param {Record<string, number>} colunas nome do campo → índice no cabeçalho
 * @param {number} primeiraDoCabecalho
 * @returns {Record<string, string>}
 */
export function alinharPorCabecalho(celulas, colunas, primeiraDoCabecalho) {
  if (!celulas || !celulas.length) return {};
  const campos = Object.keys(colunas);
  const valores = alinharNaGrade(celulas, campos.map((c) => colunas[c]), primeiraDoCabecalho);
  const saida = {};
  campos.forEach((campo, i) => { saida[campo] = valores[i]; });
  return saida;
}

/**
 * Acha a linha de cabeçalho: entre as primeiras, a que tem mais células de
 * texto (rótulo é palavra, dado é número ou código).
 *
 * O relatório começa com faixa de título e moldura; o cabeçalho de verdade é a
 * primeira linha larga só de palavras. Empate fica com a de cima.
 *
 * @param {Array<Array<{coluna: number, valor: string}>>} linhas
 * @param {number} [ate] quantas linhas do começo olhar
 * @returns {number} índice, ou -1 se nenhuma linha tem três rótulos
 */
export function escolherCabecalho(linhas, ate = 25) {
  /* Bloco de texto não é rótulo de coluna: no relatório "compressed" a célula
     tem cinquenta linhas de dados dentro e ganharia de qualquer cabeçalho de
     verdade. */
  const ehRotulo = (v) => /[A-Za-zÀ-ÿ]/.test(v) && !/^[\d.,\-/]+$/.test(v) && !v.includes('\n');
  let melhor = -1;
  let quantos = 2;
  for (let i = 0; i < Math.min(linhas.length, ate); i++) {
    const n = linhas[i].filter((c) => ehRotulo(c.valor)).length;
    if (n > quantos) { quantos = n; melhor = i; }
  }
  return melhor;
}

/**
 * Transforma o .xlsx numa grade retangular, do jeito que o resto da página lê
 * planilha: uma linha de cabeçalho e as demais alinhadas a ela.
 *
 * Devolve também `textoSolto`: o conteúdo das células que trazem um BLOCO DE
 * TEXTO — várias linhas de relatório dentro de uma célula — em vez de campos
 * espalhados em colunas. Elas não cabem numa grade; quem chama passa esse
 * texto ao leitor de relatório em texto, senão some movimento sem ninguém
 * perceber.
 *
 * Quanto isso vale, medido: no relatório normal de 21/08 são 8 lançamentos
 * escondidos assim, de 7.398. No relatório "compressed" do Opus é **o arquivo
 * inteiro** — 85.746 lançamentos em cinco arquivos, todos dentro de células
 * de texto, nenhum numa coluna. Por isso a regra vale por CÉLULA e não por
 * linha: nesses arquivos a mesma linha traz três blocos de texto lado a lado,
 * e a regra antiga, que só olhava linha de uma célula só, deixava passar
 * todos.
 *
 * @param {Array<Array<{coluna: number, valor: string}>>} linhas
 * @returns {{grade: string[][], cabecalho: number, textoSolto: string[]}}
 */
export function montarGrade(linhas) {
  const textoSolto = [];
  /* Primeiro separa o texto do que é grade. Tem de vir antes de escolher o
     cabeçalho: com os blocos no meio, não há cabeçalho que se ache. */
  const soGrade = [];
  for (const l of linhas || []) {
    const daGrade = [];
    for (const c of l) {
      if (c.valor.includes('\n')) {
        for (const t of c.valor.split('\n')) if (t.trim()) textoSolto.push(t);
      } else daGrade.push(c);
    }
    if (daGrade.length) soGrade.push(daGrade);
  }

  const cabecalho = escolherCabecalho(soGrade);
  if (cabecalho < 0) {
    return { grade: soGrade.map((l) => l.map((c) => c.valor)), cabecalho: -1, textoSolto };
  }
  const refs = soGrade[cabecalho].map((c) => c.coluna);
  const grade = soGrade.map((l, i) => (i === cabecalho ? l.map((c) => c.valor) : alinharNaGrade(l, refs)));
  return { grade, cabecalho, textoSolto };
}
