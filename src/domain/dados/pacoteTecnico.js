/**
 * Pacote Técnico do Opus (`PCARP12`).
 *
 * FONTE ÚNICA DA VERDADE: testado pelo vitest E injetado na página. JS puro.
 *
 * ────────────────────────────────────────────────────────────────────────
 * O QUE ESTE RELATÓRIO TRAZ QUE NENHUM OUTRO TRAZ
 *
 * O relatório de estoque não tem **marca**, não tem **preço** e não tem
 * **aplicação**. O de movimentação também não. O Pacote Técnico tem os três,
 * por código interno — é a única fonte desses campos em todo o material que
 * entra na página.
 *
 * Medido no PC_TECNIC de 04/08/26: 61 pacotes, 1.337 componentes, **1.077
 * códigos internos distintos**, 21 marcas, nenhum item sem preço. O mesmo
 * código aparece em vários pacotes e **nunca com preço ou marca diferentes** —
 * 0 divergências em 1.337 linhas —, o que é o que permite montar uma ficha por
 * código sem escolher entre versões.
 *
 * ────────────────────────────────────────────────────────────────────────
 * O QUE ELE **NÃO** SERVE PARA FAZER
 *
 * Não serve para dizer que uma peça serve num veículo (R1). A coluna
 * `Aplicacao` é **texto do catálogo**, exibido como consulta rastreável e
 * nunca como conclusão do sistema — a mesma regra que vale para a ficha de
 * catálogo da loja.
 *
 * O preço é **de venda**, do relatório da filial que o emitiu, na data dele.
 * Não é custo. Não entra em margem, não entra em capital parado e não vira
 * "valor do estoque": para isso seria preciso o custo, que não está aqui.
 *
 * ────────────────────────────────────────────────────────────────────────
 * COMO ELE É LIDO
 *
 * Largura fixa, 220 colunas. As posições NÃO são adivinhadas: saem da própria
 * régua de tracinhos que o relatório imprime acima dos dados. Um relatório que
 * mude de largura passa a ser lido pela régua nova sem tocar no código.
 */

/**
 * Uma linha só de tracinhos e espaços, com pelo menos cinco grupos.
 *
 * Cinco e não oito porque o relatório imprime DUAS réguas: a do pacote, com
 * sete colunas, e a do componente, com dez. Exigir oito descartava a do
 * pacote — e sem ela nenhum componente tem a que pacote pertencer.
 */
function reguaDeColunas(linha) {
  const t = String(linha || '');
  if (!t.trim() || /[^\s-]/.test(t)) return null;
  const grupos = [];
  const re = /-+/g;
  let m;
  while ((m = re.exec(t)) !== null) grupos.push([m.index, m.index + m[0].length]);
  return grupos.length >= 5 ? grupos : null;
}

const CAMPOS = ['fab', 'original', 'interno', 'descricao', 'marca', 'qtd', 'un', 'as', 'aplicacao', 'preco'];

/** Preço brasileiro do relatório: `1.822,34`. `null` para o que não for preço. */
function precoDoRelatorio(texto) {
  const t = String(texto === null || texto === undefined ? '' : texto).trim();
  if (!/^[\d.]+,\d{2}$/.test(t)) return null;
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * A marca vem como `820   Euroricambi`: código do fornecedor e nome colados.
 * O nome é o que a tela mostra; o código fica à parte porque é ele que casa
 * com o cadastro do Opus.
 */
function separarMarca(texto) {
  const t = String(texto === null || texto === undefined ? '' : texto).trim();
  const m = t.match(/^([A-Z0-9]{3})\s{2,}(.+)$/);
  if (!m) return { codigo: '', nome: t };
  return { codigo: m[1], nome: m[2].trim() };
}

/**
 * Reconhece o relatório pelo cabeçalho que só ele tem.
 *
 * @param {string[]} linhas
 * @returns {boolean}
 */
function ehPacoteTecnico(linhas) {
  const ate = Math.min((linhas || []).length, 60);
  for (let i = 0; i < ate; i++) {
    const l = String(linhas[i] || '');
    if (/Consulta Pacote Tecnico/i.test(l)) return true;
    if (/Pac\.Tecnic/i.test(l) && /Ciclo/i.test(l)) return true;
  }
  return false;
}

/**
 * Cabeçalho do relatório: de qual filial e de quando.
 *
 * Importa porque o PREÇO é o daquela filial naquela data. Mostrar a data em
 * que o arquivo foi carregado no lugar da data em que ele foi emitido faz o
 * número parecer mais novo do que é.
 *
 * @param {string[]} linhas
 * @returns {{filial: string, nomeFilial: string, emitidoEm: string}}
 */
function cabecalhoDoRelatorio(linhas) {
  let filial = '';
  let nomeFilial = '';
  let emitidoEm = '';
  const ate = Math.min((linhas || []).length, 60);
  for (let i = 0; i < ate; i++) {
    const l = String(linhas[i] || '');
    const f = l.match(/\|\s*(\d{2})\s*-\s*([A-Za-zÀ-ÿ .]+?)\s{2,}/);
    if (f && !filial) { filial = f[1]; nomeFilial = f[2].trim(); }
    const d = l.match(/Consulta Pacote Tecnico\s+(\d{2}\/\d{2}\/\d{2})/i);
    if (d && !emitidoEm) emitidoEm = d[1];
    if (filial && emitidoEm) break;
  }
  return { filial, nomeFilial, emitidoEm };
}

/**
 * Lê os pacotes e seus componentes.
 *
 * @param {string[]} linhas texto do PDF, uma linha por linha impressa
 * @returns {{pacotes: Array, componentes: number, ignoradas: number,
 *   filial: string, nomeFilial: string, emitidoEm: string}}
 */
function lerPacoteTecnico(linhas) {
  const ls = linhas || [];
  let colunas = null;
  let colunasPacote = null;
  const pacotes = [];
  let atual = null;
  let ignoradas = 0;

  const fatiar = (l, cols, nomes) => {
    const saida = {};
    cols.forEach(([a, b], i) => { if (nomes[i]) saida[nomes[i]] = l.slice(a, b).trim(); });
    return saida;
  };

  for (const bruta of ls) {
    const l = String(bruta === null || bruta === undefined ? '' : bruta);
    if (!l.trim()) continue;
    const t = l.trim();
    /* Moldura, faixa de título e cabeçalhos repetidos a cada página. */
    if (t.startsWith('+') || t.startsWith('|')) continue;
    if (/COMPONENTES/.test(t)) continue;

    const regua = reguaDeColunas(l);
    if (regua) {
      /* Duas réguas diferentes: a do pacote (7 grupos) e a do componente (10).
         A do componente é a que tem mais grupos. */
      if (regua.length >= 10) colunas = regua;
      else if (!colunasPacote) colunasPacote = regua;
      continue;
    }
    if (/^Pac\.Tecnic/i.test(t) || /^Cod fabricante/i.test(t)) continue;

    /* Componente: o código interno de dez dígitos na coluna dele. */
    if (colunas && l.length >= colunas[2][1]) {
      const codigo = l.slice(colunas[2][0], colunas[2][1]).trim();
      if (/^\d{10}$/.test(codigo)) {
        if (!atual) { ignoradas++; continue; }
        const c = fatiar(l, colunas, CAMPOS);
        const marca = separarMarca(c.marca);
        atual.itens.push({
          interno: codigo,
          fab: c.fab,
          original: c.original === '.' ? '' : c.original,
          descricao: c.descricao,
          marca: marca.nome,
          marcaCodigo: marca.codigo,
          /* Quantidade da peça DENTRO do pacote, não de compra. */
          qtdNoPacote: /^\d+$/.test(c.qtd) ? Number(c.qtd) : null,
          un: c.un,
          aplicacao: c.aplicacao,
          preco: precoDoRelatorio(c.preco),
        });
        continue;
      }
    }

    /* Cabeçalho de pacote: código, descrição e cinco datas. */
    if (colunasPacote && l.length >= colunasPacote[2][1]) {
      const p = fatiar(l, colunasPacote, ['codigo', 'descricao', 'cadastro']);
      if (p.codigo && /^\d{2}\/\d{2}\/\d{2}$/.test(p.cadastro)) {
        atual = { codigo: p.codigo, descricao: p.descricao, cadastro: p.cadastro, aplicacao: '', itens: [] };
        pacotes.push(atual);
        continue;
      }
    }

    /* Linha solta logo abaixo do pacote: a aplicação dele, que às vezes
       ocupa duas linhas. Emenda em vez de descartar. */
    if (atual && !atual.itens.length) {
      atual.aplicacao = atual.aplicacao ? atual.aplicacao + ' ' + t : t;
      continue;
    }
    ignoradas++;
  }

  return Object.assign({
    pacotes,
    componentes: pacotes.reduce((s, p) => s + p.itens.length, 0),
    ignoradas,
  }, cabecalhoDoRelatorio(ls));
}

/**
 * Uma ficha por código interno: marca, preço e aplicação.
 *
 * O mesmo código aparece em vários pacotes. Quando os dados batem — e no
 * arquivo real batem em 1.337 de 1.337 —, a ficha é uma só. Quando NÃO batem,
 * a divergência é registrada em vez de escondida: escolher em silêncio entre
 * dois preços é inventar um deles.
 *
 * @param {Array} pacotes
 * @returns {{ficha: Object, divergencias: Array}}
 */
function fichaPorCodigo(pacotes) {
  const ficha = {};
  const divergencias = [];
  for (const p of pacotes || []) {
    for (const i of p.itens || []) {
      const atual = ficha[i.interno];
      if (!atual) {
        ficha[i.interno] = {
          interno: i.interno,
          descricao: i.descricao,
          marca: i.marca,
          marcaCodigo: i.marcaCodigo,
          original: i.original,
          fab: i.fab,
          aplicacao: i.aplicacao,
          preco: i.preco,
          pacotes: [p.codigo],
        };
        continue;
      }
      if (!atual.pacotes.includes(p.codigo)) atual.pacotes.push(p.codigo);
      if (atual.preco !== null && i.preco !== null && Math.abs(atual.preco - i.preco) > 0.005) {
        divergencias.push({ interno: i.interno, campo: 'preco', a: atual.preco, b: i.preco });
      }
      if (atual.marca && i.marca && atual.marca !== i.marca) {
        divergencias.push({ interno: i.interno, campo: 'marca', a: atual.marca, b: i.marca });
      }
      if (atual.preco === null && i.preco !== null) atual.preco = i.preco;
      if (!atual.marca && i.marca) { atual.marca = i.marca; atual.marcaCodigo = i.marcaCodigo; }
      if (!atual.aplicacao && i.aplicacao) atual.aplicacao = i.aplicacao;
    }
  }
  return { ficha, divergencias };
}

export {
  cabecalhoDoRelatorio,
  reguaDeColunas,
  precoDoRelatorio,
  separarMarca,
  ehPacoteTecnico,
  lerPacoteTecnico,
  fichaPorCodigo,
};
