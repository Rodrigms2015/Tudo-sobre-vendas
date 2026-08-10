/**
 * Identidade da peça e consolidação de cadastros — a base de tudo.
 *
 * FONTE ÚNICA DA VERDADE. Este arquivo é testado por
 * `identidade.test.ts` e **injetado** em `plataforma/corpo.html` por
 * `scripts/gerar-plataforma.mjs`. Não existe segunda cópia destas regras em
 * lugar nenhum: se você duplicar, o próximo bug volta.
 *
 * É JavaScript puro, sem tipos e sem import, exatamente por causa dessa
 * injeção — a página é um arquivo só, sem build.
 *
 * ────────────────────────────────────────────────────────────────────────
 * O QUE O RELATÓRIO REALMENTE TEM
 *
 * O briefing pediu `duplicateKey = fabricante + código base`. O relatório
 * exportado **não traz coluna de fabricante** — ela existe só na tela do ERP.
 * As dez colunas são: interno, (vazia), produto, original, grupo, descrição,
 * curva, localização, saldo, (vazia).
 *
 * O que faz o papel do fabricante é o **grupo** (6 dígitos, 181 valores
 * distintos no arquivo real). A evidência é forense, não suposição:
 *
 *   1. Ele separa exatamente o caso do briefing:
 *        000084|8PK1420    → 2 cadastros, saldo 27
 *        000271|8PK1420HD  → 4 cadastros, saldo  2
 *   2. Dentro de um grupo `(grupo, códigoBase)`, os campos independentes
 *      concordam quase perfeitamente — Cód. Original diverge em 1,0%,
 *      localização em 0,1%, descrição em 0,1% dos 2.700 grupos com mais de
 *      um cadastro. Três campos que ninguém alinhou de propósito.
 *   3. Sem ele, 12 códigos base colidiriam entre peças diferentes — entre
 *      elas `79111`, que é bolsa pneumática num grupo e junta de radiador
 *      em outro.
 *   4. Não é derivado do código interno (só 37,8% coincidem), então carrega
 *      informação própria.
 *
 * Chamamos de `fornecedor` porque é o papel que ele exerce na chave. Se o
 * ERP passar a exportar o nome do fabricante, ele entra como campo extra e
 * a chave não muda de forma.
 */

/* Um sufixo de recadastro, e só ele: colchetes no FIM do código.
   `ABC[2]XYZ` não é sufixo. `A[1]B` não é sufixo. Uma única remoção. */
const SUFIXO_FINAL = /\[[^\]]*\]$/;

/* Marcadores de "não informado" que o ERP grava no lugar do código. Sem esta
   lista, `N/E` vira uma identidade válida e junta peças que não têm nada a
   ver: no arquivo real, `000992|N/E` reunia 15 cadastros — bucha de coluna,
   bomba d'água e parafuso no mesmo "produto". Placeholder não é identidade;
   quem não tem código fica sozinho e marcado.

   A lista é curta de propósito: só entram marcadores inequívocos. `X`, `0` e
   `SEM` ficaram de fora porque podem ser código legítimo, e classificar um
   código real como placeholder isola uma peça que deveria consolidar. */
const SEM_CODIGO = new Set(['', '.', '-', '--', '---', 'N/E', 'N/A', 'S/N']);

const ehPlaceholder = (texto) => SEM_CODIGO.has(String(texto).trim().toUpperCase());

/**
 * Remove EXCLUSIVAMENTE um sufixo `[n]` no fim do código de fábrica.
 *
 * Não corta `HD`. Não corta números. Não faz fuzzy, contains nem
 * startsWith. Devolve string sempre — zeros à esquerda são preservados
 * porque código de produto não é número.
 *
 * @param {unknown} codigo
 * @returns {string}
 */
export function normalizarCodigoFabrica(codigo) {
  if (codigo === null || codigo === undefined) return '';
  const texto = String(codigo).trim();
  if (!texto) return '';
  return texto.replace(SUFIXO_FINAL, '').trim();
}

/**
 * Normaliza o identificador de fornecedor (a coluna `grupo` do relatório).
 * Só corta espaço e caixa: nada de remover zeros, que aqui são
 * significativos — `000084` e `84` são o mesmo grupo no ERP, então
 * normalizamos para a forma com zeros.
 *
 * @param {unknown} valor
 * @returns {string}
 */
export function normalizarFornecedor(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).trim().toUpperCase();
  if (!texto) return '';
  /* Só padroniza o comprimento quando é puramente numérico. */
  return /^\d+$/.test(texto) ? texto.padStart(6, '0') : texto;
}

/**
 * A chave de duplicidade cadastral. Conservadora de propósito: juntar duas
 * peças diferentes contamina toda métrica seguinte, enquanto deixar duas
 * separadas apenas perde uma consolidação.
 *
 * Devolve `null` quando falta qualquer uma das partes — sem identidade não
 * há grupo, e um grupo com chave vazia juntaria tudo o que está incompleto.
 *
 * @param {{fornecedor?: unknown, codigoFabrica?: unknown}} registro
 * @returns {string|null}
 */
export function montarChaveDuplicidade(registro) {
  const fornecedor = normalizarFornecedor(registro && registro.fornecedor);
  const base = normalizarCodigoFabrica(registro && registro.codigoFabrica);
  if (!fornecedor || !base) return null;
  if (ehPlaceholder(base)) return null;
  return fornecedor + '|' + base.toUpperCase();
}

/**
 * Converte número no formato brasileiro do relatório.
 *
 * O ponto é separador de MILHAR: `1.718` é mil setecentos e dezoito. Um
 * `Number()` ingênuo lê 1,718 e perde 1.717 unidades num único campo — o
 * disco de tacógrafo do arquivo real.
 *
 * Devolve `null` para ausente ou ilegível. **Nunca zero**: zero é um saldo
 * comercial legítimo e confundir os dois corrompe todo o resto.
 *
 * @param {unknown} valor
 * @returns {number|null}
 */
export function paraNumeroBr(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (valor === null || valor === undefined) return null;

  let texto = String(valor).trim();
  if (!texto) return null;

  const negativo = /^\(.*\)$/.test(texto) || texto.startsWith('-');
  texto = texto.replace(/^[-(]|\)$/g, '').trim();
  if (!texto) return null;

  /* Só dígitos e separadores; qualquer outra coisa é campo não numérico. */
  if (!/^[\d.,]+$/.test(texto)) return null;

  const temVirgula = texto.includes(',');
  if (temVirgula) {
    /* Vírgula é decimal: os pontos que sobram são milhar. */
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (texto.includes('.')) {
    /* Sem vírgula, o ponto é milhar — mas só quando agrupa de três em três.
       `1.718` vira 1718; `1.7` não é grupo de milhar e fica como decimal. */
    const partes = texto.split('.');
    const milhar = partes.slice(1).every((p) => p.length === 3) && partes[0].length <= 3 && partes[0].length >= 1;
    texto = milhar ? partes.join('') : texto;
  }

  const n = Number(texto);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/**
 * Agrupa os registros pela chave de duplicidade. O(n): um Map, uma passada.
 *
 * Registro sem chave vira grupo de um — não é descartado (perder linha é
 * pior que não consolidar) e fica marcado com `semIdentidade`.
 *
 * @param {Array<object>} registros
 * @returns {Array<object>} grupos
 */
export function agruparCadastros(registros) {
  const porChave = new Map();
  const avulsos = [];

  for (const r of registros) {
    const chave = montarChaveDuplicidade(r);
    if (!chave) { avulsos.push(r); continue; }
    let g = porChave.get(chave);
    if (!g) { g = []; porChave.set(chave, g); }
    g.push(r);
  }

  const grupos = [];
  for (const [chave, cadastros] of porChave) grupos.push(montarGrupo(chave, cadastros, false));
  for (const r of avulsos) {
    grupos.push(montarGrupo('sem-identidade:' + (r.codigoInterno || r.codigoFabricaOriginal || ''), [r], true));
  }
  return grupos;
}

/**
 * Invariantes do grupo, e elas são o contrato do motor:
 *
 *   estoqueGrupo    = soma dos saldos lidos (null se nenhum foi lido)
 *   rupturaReal     = estoqueGrupo !== null && estoqueGrupo <= 0
 *   quantidadeCadastros = cadastros.length
 *
 * Nunca conte cadastro zerado como ruptura. Três linhas zeradas ao lado de
 * uma com saldo são um grupo com estoque, não três rupturas.
 */
function montarGrupo(chave, cadastros, semIdentidade) {
  const lidos = cadastros.map((c) => c.estoqueIndividual).filter((s) => s !== null && s !== undefined);
  const estoqueGrupo = lidos.length ? lidos.reduce((a, b) => a + b, 0) : null;
  const zerados = cadastros.filter((c) => c.estoqueIndividual === 0).length;
  const principal = cadastros.slice().sort((a, b) =>
    (b.estoqueIndividual ?? -1) - (a.estoqueIndividual ?? -1))[0];

  return {
    duplicateKey: chave,
    semIdentidade,
    fornecedorNormalizado: normalizarFornecedor(principal.fornecedor),
    codigoFabricaBase: normalizarCodigoFabrica(principal.codigoFabrica),
    denominacao: principal.denominacao || '',
    cadastros,
    quantidadeCadastros: cadastros.length,
    cadastrosZerados: zerados,
    codigosInternosDoGrupo: cadastros.map((c) => c.codigoInterno),
    codigosFabricaOriginaisDoGrupo: cadastros.map((c) => c.codigoFabricaOriginal),
    estoqueGrupo,
    /* Ruptura só existe quando o saldo foi lido. Saldo ilegível é lacuna,
       não zero — e lacuna não vira recomendação de compra. */
    rupturaReal: estoqueGrupo === null ? null : estoqueGrupo <= 0,
    /* O que a versão anterior chamava de ruptura e não era. */
    zeradoCobertoPorOutroCadastro: estoqueGrupo !== null && estoqueGrupo > 0 && zerados > 0,
  };
}

/**
 * Transforma uma linha crua do relatório na representação canônica. O
 * original nunca é destruído: fica ao lado do normalizado.
 *
 * @param {object} bruto
 * @returns {object}
 */
export function registroCanonico(bruto) {
  const codigoFabricaOriginal = bruto.produto === null || bruto.produto === undefined ? '' : String(bruto.produto).trim();
  return {
    registroOriginal: bruto,
    codigoInterno: bruto.interno === null || bruto.interno === undefined ? '' : String(bruto.interno).trim(),
    codigoFabricaOriginal,
    codigoFabricaBase: normalizarCodigoFabrica(codigoFabricaOriginal),
    codigoFabrica: codigoFabricaOriginal,
    fornecedorOriginal: bruto.grupo === null || bruto.grupo === undefined ? '' : String(bruto.grupo).trim(),
    fornecedor: bruto.grupo,
    fornecedorNormalizado: normalizarFornecedor(bruto.grupo),
    codigoOriginal: bruto.original === null || bruto.original === undefined ? '' : String(bruto.original).trim(),
    denominacao: bruto.descricao === null || bruto.descricao === undefined ? '' : String(bruto.descricao).trim(),
    curva: bruto.curva === null || bruto.curva === undefined ? '' : String(bruto.curva).trim().toUpperCase(),
    localizacao: bruto.localizacao === null || bruto.localizacao === undefined ? '' : String(bruto.localizacao).trim(),
    estoqueIndividual: paraNumeroBr(bruto.saldo),
  };
}

/**
 * Métricas de qualidade da importação. Não escondem nada: se houve colisão
 * suspeita, ela aparece.
 *
 * @param {Array<object>} registros
 * @param {Array<object>} grupos
 */
export function qualidadeDaImportacao(registros, grupos) {
  const semCodigo = registros.filter((r) => !r.codigoFabricaOriginal).length;
  const semFornecedor = registros.filter((r) => !r.fornecedorNormalizado).length;
  const saldoIlegivel = registros.filter((r) => r.estoqueIndividual === null).length;
  const normalizados = registros.filter((r) => r.codigoFabricaBase !== r.codigoFabricaOriginal).length;

  /* Mesmo código base em fornecedores diferentes: legítimo (marcas
     distintas), mas registrado para conferência humana. */
  const porBase = new Map();
  for (const g of grupos) {
    if (g.semIdentidade) continue;
    const b = g.codigoFabricaBase.toUpperCase();
    if (!porBase.has(b)) porBase.set(b, []);
    porBase.get(b).push(g);
  }
  const colisoes = [...porBase.entries()]
    .filter(([, gs]) => gs.length > 1)
    .map(([base, gs]) => ({
      codigoFabricaBase: base,
      grupos: gs.map((g) => ({
        duplicateKey: g.duplicateKey,
        denominacao: g.denominacao,
        estoqueGrupo: g.estoqueGrupo,
      })),
    }));

  const maior = grupos.reduce((m, g) => (g.quantidadeCadastros > (m ? m.quantidadeCadastros : 0) ? g : m), null);

  return {
    linhasLidas: registros.length,
    codigosVazios: semCodigo,
    fornecedoresVazios: semFornecedor,
    saldosIlegiveis: saldoIlegivel,
    codigosAlteradosPelaNormalizacao: normalizados,
    codigosSemAlteracao: registros.length - normalizados,
    gruposCriados: grupos.length,
    gruposComMaisDeUmCadastro: grupos.filter((g) => g.quantidadeCadastros > 1).length,
    gruposSemIdentidade: grupos.filter((g) => g.semIdentidade).length,
    maiorGrupo: maior ? { duplicateKey: maior.duplicateKey, cadastros: maior.quantidadeCadastros } : null,
    colisoesDeCodigoBase: colisoes,
  };
}

/** Resumo do estoque, com as grandezas separadas — nunca misturadas. */
export function resumirEstoque(registros, grupos) {
  const linhasZeradas = registros.filter((r) => r.estoqueIndividual === 0).length;
  const gruposComRuptura = grupos.filter((g) => g.rupturaReal === true);
  const cobertas = grupos.filter((g) => g.zeradoCobertoPorOutroCadastro);
  return {
    linhasCadastrais: registros.length,
    gruposConsolidados: grupos.length,
    cadastrosDuplicados: registros.length - grupos.length,
    linhasComSaldoZero: linhasZeradas,
    linhasZeradasCobertasPorOutroCadastro: cobertas.reduce((s, g) => s + g.cadastrosZerados, 0),
    gruposEmRupturaReal: gruposComRuptura.length,
    unidadesEmEstoque: grupos.reduce((s, g) => s + (g.estoqueGrupo || 0), 0),
  };
}
