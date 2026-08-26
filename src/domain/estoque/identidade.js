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
 * O QUE A COLUNA `Grupo` É — E O QUE ELA NÃO É
 *
 * O briefing pediu `duplicateKey = fabricante + código base`. O relatório
 * exportado **não traz coluna de fabricante** — ela existe só na tela do ERP.
 * As colunas são: interno, produto, original, grupo, descrição, curva,
 * localização, saldo.
 *
 * `Grupo` (6 dígitos, 180 valores distintos no arquivo real) **não é o
 * fabricante**. É código interno de produto do Opus — um agrupamento
 * mercadológico. A evidência é medida, não suposta:
 *
 *   1. Ele é o prefixo do próprio código interno em 51,5% das linhas
 *      (`1190000003` está no grupo `000119`), e nas linhas restantes o
 *      prefixo continua constante dentro do grupo (`7850…` → `004783`).
 *      Um código de fabricante não moraria dentro do código do produto.
 *   2. Os grupos reúnem famílias, não marcas: `000616` é junta (tampa de
 *      válvula, cabeçote, coletor), `004841` é injeção (injetor, bomba de
 *      alta, bico). 33 dos 180 grupos têm uma única descrição.
 *
 * Ele continua na chave, mas pelo motivo certo: é um **guarda de família**,
 * não um discriminador de marca. Sem ele, 6 códigos base colidiriam entre
 * peças de famílias diferentes — entre elas `79111`, que é bolsa pneumática
 * num grupo e junta de radiador em outro. O custo desse guarda foi medido no
 * arquivo real e é de uma única peça: 5.556 peças contra 5.545 sem ele,
 * 505 rupturas contra 504.
 *
 * Como o guarda separa família e não marca, ele erra num sentido conhecido:
 * a MESMA peça cadastrada em dois grupos vira duas peças. Em vez de fingir
 * que não existem — ou de juntar tudo e ressuscitar as colisões —, o motor
 * liga os grupos irmãos (`gruposIrmaos`). Nada é somado às escondidas.
 *
 * ────────────────────────────────────────────────────────────────────────
 * DESCRIÇÃO IGUAL NÃO É PROVA DE MESMA PEÇA
 *
 * A primeira versão desta ligação declarava `cobertoPorGrupoIrmao` quando o
 * código base e a descrição batiam, e tirava a peça da lista de compra. O
 * catálogo da loja desmentiu isso no primeiro cruzamento:
 *
 *   8PK1700  004831 = AGRO-GATES   "Correia micro V BA/"
 *            004874 = AGRO-DAYCO   "Correia micro V BA/"
 *
 * Duas marcas, mesma descrição — porque o relatório trunca a descrição em 19
 * caracteres e ela nunca carregou a marca. Suprimir a compra ali é deixar o
 * cliente que pede Dayco sem atendimento; é exatamente a distinção entre
 * variante fiscal e equivalente, que o resto do sistema já respeita.
 *
 * Agora a cobertura exige **mesma marca comprovada**. Sem marca conhecida dos
 * dois lados, o motor não conclui: marca `conferirGrupoIrmao` e a peça
 * continua na fila, com a dúvida escrita. Ausência é lacuna, nunca sinal
 * verde (R3).
 *
 * A marca é campo OPCIONAL, importado de fonte externa com código interno
 * rastreável. O motor NUNCA a inventa nem a deduz do código: quando não vem,
 * vale `''` e o componente simplesmente não conclui.
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

/** Descrição comparável: o relatório corta em 19 caracteres, então só
    normalizamos caixa e espaço — nada de fuzzy. */
const denominacaoComparavel = (texto) =>
  String(texto === null || texto === undefined ? '' : texto).trim().replace(/\s+/g, ' ').toUpperCase();

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
 * Normaliza o grupo de produto (a coluna `Grupo` do relatório — código
 * interno do Opus). Só corta espaço e caixa: nada de remover zeros, que aqui
 * são de formatação — `84` e `000084` são o mesmo grupo no ERP, então
 * normalizamos para a forma com zeros.
 *
 * @param {unknown} valor
 * @returns {string}
 */
export function normalizarGrupoProduto(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).trim().toUpperCase();
  if (!texto) return '';
  /* Só padroniza o comprimento quando é puramente numérico. */
  return /^\d+$/.test(texto) ? texto.padStart(6, '0') : texto;
}

/**
 * A chave de duplicidade cadastral. Conservadora de propósito: juntar duas
 * peças diferentes contamina toda métrica seguinte, enquanto deixar duas
 * separadas apenas perde uma consolidação — e essa perda fica visível em
 * `gruposIrmaos`.
 *
 * Devolve `null` quando falta qualquer uma das partes — sem identidade não
 * há grupo, e um grupo com chave vazia juntaria tudo o que está incompleto.
 *
 * @param {{grupoProduto?: unknown, codigoFabrica?: unknown}} registro
 * @returns {string|null}
 */
export function montarChaveDuplicidade(registro) {
  const grupo = normalizarGrupoProduto(registro && registro.grupoProduto);
  const base = normalizarCodigoFabrica(registro && registro.codigoFabrica);
  if (!grupo || !base) return null;
  if (ehPlaceholder(base)) return null;
  return grupo + '|' + base.toUpperCase();
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
 * Agrupa os registros pela chave de duplicidade. O(n): dois Maps, duas
 * passadas — nenhuma varredura aninhada.
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
  return vincularGruposIrmaos(grupos);
}

/**
 * Liga grupos que compartilham o código base mas caíram em grupos de produto
 * diferentes. Não junta nada — só torna a ligação visível, porque o outro
 * lado pode ser outra peça (o `79111` é bolsa pneumática de um lado e junta
 * de radiador do outro) ou outra marca (o `8PK1700` é Gates de um lado e
 * Dayco do outro).
 *
 * Três desfechos, e a diferença entre eles é o que o motor tem de prova:
 *
 *   cobertoPorGrupoIrmao  mesma descrição E mesma marca comprovada, com saldo
 *                         → é o mesmo item cadastrado duas vezes; sai da compra
 *   conferirGrupoIrmao    mesma descrição, marca desconhecida ou diferente
 *                         → pode ser duplicata, pode ser outra marca; fica na
 *                           fila com a dúvida escrita
 *   (nada)                descrição diferente → o código só coincide
 *
 * @param {Array<object>} grupos
 * @returns {Array<object>} os mesmos grupos, com os vínculos preenchidos
 */
function vincularGruposIrmaos(grupos) {
  const porBase = new Map();
  for (const g of grupos) {
    if (g.semIdentidade) continue;
    const b = g.codigoFabricaBase.toUpperCase();
    let lista = porBase.get(b);
    if (!lista) { lista = []; porBase.set(b, lista); }
    lista.push(g);
  }

  for (const g of grupos) {
    if (g.semIdentidade) continue;
    const irmaos = porBase.get(g.codigoFabricaBase.toUpperCase());
    if (!irmaos || irmaos.length < 2) continue;

    const minhaDenominacao = denominacaoComparavel(g.denominacao);
    let estoqueMesmaMarca = null;
    let estoqueSemProva = null;
    for (const outro of irmaos) {
      if (outro === g) continue;
      const mesma = denominacaoComparavel(outro.denominacao) === minhaDenominacao;
      /* `null` quando falta marca de um dos lados: não é "diferente", é
         "não sei" — e as duas coisas levam a decisões opostas. */
      const mesmaMarca = (!g.marca || !outro.marca) ? null : g.marca === outro.marca;
      g.gruposIrmaos.push({
        duplicateKey: outro.duplicateKey,
        grupoProdutoNormalizado: outro.grupoProdutoNormalizado,
        denominacao: outro.denominacao,
        marca: outro.marca,
        estoqueGrupo: outro.estoqueGrupo,
        mesmaDenominacao: mesma,
        mesmaMarca,
      });
      if (!mesma || outro.estoqueGrupo === null || outro.estoqueGrupo <= 0) continue;
      if (mesmaMarca === true) estoqueMesmaMarca = (estoqueMesmaMarca || 0) + outro.estoqueGrupo;
      else if (mesmaMarca === null) estoqueSemProva = (estoqueSemProva || 0) + outro.estoqueGrupo;
    }
    g.estoqueEmGrupoIrmao = estoqueMesmaMarca;
    g.estoqueEmGrupoIrmaoSemProva = estoqueSemProva;
    /* Só suprime a compra com marca comprovada dos dois lados. */
    g.cobertoPorGrupoIrmao = g.rupturaReal === true && estoqueMesmaMarca !== null && estoqueMesmaMarca > 0;
    /* Dúvida honesta: parece duplicata, mas não há marca que prove. */
    g.conferirGrupoIrmao = g.rupturaReal === true && !g.cobertoPorGrupoIrmao
      && estoqueSemProva !== null && estoqueSemProva > 0;
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
  const marcasDoGrupo = [...new Set(cadastros.map((c) => c.marca).filter(Boolean))];

  return {
    duplicateKey: chave,
    semIdentidade,
    grupoProdutoNormalizado: normalizarGrupoProduto(principal.grupoProduto),
    codigoFabricaBase: normalizarCodigoFabrica(principal.codigoFabrica),
    denominacao: principal.denominacao || '',
    /* A marca da peça NÃO sai do cadastro principal: `principal` é o de maior
       saldo, e o catálogo externo raramente cobre justo esse. Sai de qualquer
       cadastro do grupo que a tenha — basta um.

       Se dois cadastros do mesmo grupo discordarem, o motor não escolhe: fica
       vazia e a divergência é registrada. Discordância aqui significa que a
       chave juntou fabricantes diferentes, e isso precisa de olho humano, não
       de desempate automático. */
    marca: marcasDoGrupo.length === 1 ? marcasDoGrupo[0] : '',
    marcasDivergentes: marcasDoGrupo.length > 1 ? marcasDoGrupo : [],
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
    /* Preenchidos por `vincularGruposIrmaos`. */
    gruposIrmaos: [],
    estoqueEmGrupoIrmao: null,
    estoqueEmGrupoIrmaoSemProva: null,
    cobertoPorGrupoIrmao: false,
    conferirGrupoIrmao: false,
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
    grupoProdutoOriginal: bruto.grupo === null || bruto.grupo === undefined ? '' : String(bruto.grupo).trim(),
    grupoProduto: bruto.grupo,
    grupoProdutoNormalizado: normalizarGrupoProduto(bruto.grupo),
    codigoOriginal: bruto.original === null || bruto.original === undefined ? '' : String(bruto.original).trim(),
    denominacao: bruto.descricao === null || bruto.descricao === undefined ? '' : String(bruto.descricao).trim(),
    curva: bruto.curva === null || bruto.curva === undefined ? '' : String(bruto.curva).trim().toUpperCase(),
    localizacao: bruto.localizacao === null || bruto.localizacao === undefined ? '' : String(bruto.localizacao).trim(),
    /* Opcional: só existe quando um catálogo externo com código interno
       rastreável foi importado. Sem ele fica vazio — jamais inferido. */
    marca: bruto.marca === null || bruto.marca === undefined ? '' : String(bruto.marca).trim().toUpperCase(),
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
  const semGrupo = registros.filter((r) => !r.grupoProdutoNormalizado).length;
  const saldoIlegivel = registros.filter((r) => r.estoqueIndividual === null).length;
  const normalizados = registros.filter((r) => r.codigoFabricaBase !== r.codigoFabricaOriginal).length;

  /* Mesmo código base em grupos de produto diferentes. Duas leituras
     possíveis, e o motor não escolhe por você: descrição igual é a mesma
     peça cadastrada duas vezes; descrição diferente é o guarda de família
     fazendo o trabalho dele. */
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
      mesmaDenominacao: new Set(gs.map((g) => denominacaoComparavel(g.denominacao))).size === 1,
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
    gruposDeProdutoVazios: semGrupo,
    saldosIlegiveis: saldoIlegivel,
    codigosAlteradosPelaNormalizacao: normalizados,
    codigosSemAlteracao: registros.length - normalizados,
    gruposCriados: grupos.length,
    gruposComMaisDeUmCadastro: grupos.filter((g) => g.quantidadeCadastros > 1).length,
    gruposSemIdentidade: grupos.filter((g) => g.semIdentidade).length,
    maiorGrupo: maior ? { duplicateKey: maior.duplicateKey, cadastros: maior.quantidadeCadastros } : null,
    colisoesDeCodigoBase: colisoes,
    gruposComMarcaConhecida: grupos.filter((g) => g.marca).length,
    gruposComMarcasDivergentes: grupos.filter((g) => g.marcasDivergentes.length).length,
    provavelMesmoProdutoEmDoisGrupos: colisoes.filter((c) => c.mesmaDenominacao).length,
    colisoesEntreProdutosDiferentes: colisoes.filter((c) => !c.mesmaDenominacao).length,
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
    /* Ruptura no papel, prateleira cheia do outro lado. Sai da lista de
       compra e entra na lista de cadastro duplicado. */
    gruposCobertosPorGrupoIrmao: grupos.filter((g) => g.cobertoPorGrupoIrmao).length,
    /* Parecem duplicata mas não há marca que prove. Continuam na fila. */
    gruposAConferirComGrupoIrmao: grupos.filter((g) => g.conferirGrupoIrmao).length,
    unidadesEmEstoque: grupos.reduce((s, g) => s + (g.estoqueGrupo || 0), 0),
  };
}
