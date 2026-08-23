/**
 * Carteira de clientes e metas — filial 37, Passo Fundo.
 *
 * FONTE ÚNICA DA VERDADE, no mesmo esquema dos outros motores: testado pelo
 * vitest E injetado na página pelo gerador. JavaScript puro, sem import.
 *
 * ────────────────────────────────────────────────────────────────────────
 * O QUE O RELATÓRIO DE CLIENTES TRAZ — E O QUE ELE NÃO DIZ
 *
 * Quinze colunas: `Cliente Nome` (código e nome grudados), Tipo, Fi, Prom.,
 * Repr, Frot., Potencial, **quatro colunas chamadas todas de "Faturamento"**,
 * Dt U.Com, Vl U.Com, Ram, Vend.
 *
 * As quatro colunas de faturamento NÃO dizem de que mês são. O período foi
 * determinado por medição, não por suposição:
 *
 *   1. A ordem é do mais recente para o mais antigo. Supor o contrário produz
 *      27 casos impossíveis — cliente faturando depois da própria última
 *      compra.
 *   2. A primeira coluna é o MÊS CORRENTE, não o último fechado. Supor o
 *      último fechado zera a coluna do mês da última compra em 80 de 80
 *      clientes conferidos.
 *
 * `Vl U.Com` e `Faturamento` têm BASES DIFERENTES: a diferença é constante em
 * vários clientes (17,50 em dois deles, 47,71 em outro), o que aponta imposto
 * ou frete fora do faturamento. Por isso um nunca é usado para conferir o
 * outro, e nenhum dos dois é convertido no outro.
 *
 * ────────────────────────────────────────────────────────────────────────
 * A REGRA QUE PROTEGE A META
 *
 * O mês corrente é PARCIAL — o arquivo de 21/08 tem 21 dias de agosto, não 31.
 * Incluí-lo numa média de quatro meses derruba a média em cerca de um terço de
 * um mês, e a meta sai sistematicamente baixa.
 *
 * Por isso **a média usa só os meses FECHADOS**. O mês corrente aparece do
 * lado, marcado como parcial, e nunca entra na conta.
 */

/** Meses fechados que a média usa. As colunas são 4; a primeira é a corrente. */
const MESES_FECHADOS = 3;

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/**
 * Ano de dois dígitos para ano cheio.
 *
 * O relatório traz cliente que não compra desde os anos 90. Mapear tudo para
 * 20xx transforma `09/09/05` em 2005 (certo) mas `07/10/99` em 2099 — cliente
 * do futuro, e a conta de "há quantos dias não compra" vira negativa.
 *
 * Regra: 20YY se isso não passar do ano que vem; senão 19YY.
 *
 * @param {number} dd dois dígitos
 * @param {number} anoAtual
 * @returns {number}
 */
function anoDeDoisDigitos(dd, anoAtual) {
  const cheio = 2000 + Number(dd);
  return cheio <= Number(anoAtual) + 1 ? cheio : 1900 + Number(dd);
}

/**
 * Valor em real brasileiro. `null` para ausente ou ilegível — **nunca zero**.
 * Aqui zero é faturamento real (cliente que não comprou no mês), e confundir
 * os dois com "não sei" estraga toda média.
 *
 * @param {unknown} texto
 * @returns {number|null}
 */
function paraReal(texto) {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : null;
  const t = String(texto === null || texto === undefined ? '' : texto).trim();
  if (!t || /^-+$/.test(t) || /^_+$/.test(t)) return null;
  if (!/^-?[\d.,]+$/.test(t)) return null;
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Separa código e nome, que vêm grudados na primeira coluna:
 * `'800677 ALCEU FOPPA & CIA LTDA        '`.
 *
 * @param {unknown} texto
 * @returns {{codigo: string, nome: string}|null}
 */
function separarCodigoNome(texto) {
  const t = String(texto === null || texto === undefined ? '' : texto).trim();
  const m = t.match(/^(\d{4,6})\s+(.+)$/);
  if (!m) return null;
  return { codigo: m[1], nome: m[2].trim() };
}

/**
 * Uma linha do relatório vira cliente. Devolve `null` para cabeçalho,
 * separador e qualquer linha sem código — nunca um cliente pela metade.
 *
 * @param {Array<unknown>} celulas
 * @param {number} anoAtual
 * @returns {object|null}
 */
function lerLinhaCliente(celulas, anoAtual) {
  const c = celulas || [];
  const id = separarCodigoNome(c[0]);
  if (!id) return null;

  const data = String(c[11] === null || c[11] === undefined ? '' : c[11]).trim();
  const md = data.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  let ultimaCompra = null;
  if (md) {
    const ano = anoDeDoisDigitos(md[3], anoAtual);
    const mes = Number(md[2]);
    const dia = Number(md[1]);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      const d = new Date(Date.UTC(ano, mes - 1, dia));
      if (d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia) {
        ultimaCompra = d.toISOString().slice(0, 10);
      }
    }
  }

  const texto = (v) => String(v === null || v === undefined ? '' : v).trim();
  return {
    codigo: id.codigo,
    nome: id.nome,
    tipo: texto(c[1]).toUpperCase(),
    filial: texto(c[2]),
    promotor: texto(c[3]),
    representante: texto(c[4]),
    frota: paraReal(c[5]),
    potencial: paraReal(c[6]),
    /* Índice 0 é o mês CORRENTE (parcial); 1, 2 e 3 são os fechados. */
    faturamento: [paraReal(c[7]), paraReal(c[8]), paraReal(c[9]), paraReal(c[10])],
    ultimaCompra,
    valorUltimaCompra: paraReal(c[12]),
    ramo: texto(c[13]),
    vendedor: texto(c[14]),
  };
}

/**
 * Média dos meses FECHADOS. O mês corrente fica de fora por ser parcial.
 *
 * Devolve `null` quando nenhum mês fechado pôde ser lido — sem base não há
 * média, e média inventada vira meta inventada.
 *
 * @param {Array<number|null>} faturamento
 * @returns {{media: number, mesesUsados: number}|null}
 */
function mediaDosFechados(faturamento) {
  const f = faturamento || [];
  const fechados = [];
  for (let i = 1; i <= MESES_FECHADOS; i++) {
    if (f[i] !== null && f[i] !== undefined) fechados.push(f[i]);
  }
  if (!fechados.length) return null;
  const soma = fechados.reduce((a, b) => a + b, 0);
  return { media: soma / fechados.length, mesesUsados: fechados.length };
}

/**
 * A meta do cliente.
 *
 * Base: a média dos meses fechados, multiplicada por um fator que quem
 * gerencia escolhe. Sem média não há meta — devolve `null` com o motivo, em
 * vez de zero, porque zero seria lido como "meta batida".
 *
 * @param {{faturamento: Array<number|null>}} cliente
 * @param {number} multiplicador
 * @returns {{meta: number, base: number, mesesUsados: number}|{meta: null, motivo: string}}
 */
function metaDoCliente(cliente, multiplicador = 1) {
  const m = mediaDosFechados(cliente && cliente.faturamento);
  if (!m) return { meta: null, motivo: 'sem faturamento lido nos meses fechados' };
  if (m.media <= 0) {
    return { meta: null, motivo: 'não faturou nada nos ' + m.mesesUsados + ' meses fechados' };
  }
  const fator = Number(multiplicador);
  if (!Number.isFinite(fator) || fator <= 0) return { meta: null, motivo: 'multiplicador inválido' };
  return { meta: m.media * fator, base: m.media, mesesUsados: m.mesesUsados };
}

/**
 * Situação do cliente, pelo que foi medido — nunca por rótulo do ERP.
 *
 * `dias` é a distância até a última compra. Os cortes são de calendário
 * comercial (um mês, um trimestre, um ano), e cada um tem nome próprio para
 * que a tela nunca dependa só de cor.
 *
 * @param {{ultimaCompra: string|null, faturamento: Array<number|null>}} cliente
 * @param {string} hojeIso
 * @returns {{situacao: string, rotulo: string, dias: number|null}}
 */
function situacaoDoCliente(cliente, hojeIso) {
  const f = (cliente && cliente.faturamento) || [];
  const comprouNoPeriodo = f.some((v) => v !== null && v !== undefined && v > 0);
  if (!cliente || !cliente.ultimaCompra) {
    return {
      situacao: comprouNoPeriodo ? 'ATIVO' : 'SEM_DATA',
      rotulo: comprouNoPeriodo ? 'ativo' : 'sem data de compra',
      dias: null,
    };
  }
  const dias = Math.round(
    (Date.parse(hojeIso + 'T00:00:00Z') - Date.parse(cliente.ultimaCompra + 'T00:00:00Z')) / 86400000,
  );
  if (dias < 0) return { situacao: 'SEM_DATA', rotulo: 'data à frente do arquivo', dias };
  if (dias <= 45) return { situacao: 'ATIVO', rotulo: 'ativo', dias };
  if (dias <= 120) return { situacao: 'ESFRIANDO', rotulo: 'esfriando', dias };
  if (dias <= 365) return { situacao: 'DORMINDO', rotulo: 'dormindo', dias };
  return { situacao: 'PERDIDO', rotulo: 'sem comprar há mais de um ano', dias };
}

/**
 * Mês de referência do arquivo, tirado do PRÓPRIO conteúdo.
 *
 * O relatório não declara o período em lugar nenhum — não há título nem
 * rodapé com data. O nome do arquivo traz, mas depender do nome quebra no dia
 * em que alguém renomear. A data de compra mais recente do arquivo cai dentro
 * do mês corrente, e é dela que o mês sai.
 *
 * @param {Array<object>} clientes
 * @returns {{ano: number, mes: number}|null}
 */
function mesDeReferencia(clientes) {
  let melhor = null;
  for (const c of clientes || []) {
    if (!c || !c.ultimaCompra) continue;
    if (!melhor || c.ultimaCompra > melhor) melhor = c.ultimaCompra;
  }
  if (!melhor) return null;
  return { ano: Number(melhor.slice(0, 4)), mes: Number(melhor.slice(5, 7)) };
}

/**
 * Rótulo de cada uma das quatro colunas, a partir do mês de referência.
 * A primeira vem marcada como parcial.
 *
 * @param {{ano: number, mes: number}|null} ref
 * @returns {Array<{rotulo: string, parcial: boolean}>}
 */
function rotulosDasColunas(ref) {
  if (!ref) {
    return [
      { rotulo: 'mês corrente', parcial: true },
      { rotulo: 'mês anterior', parcial: false },
      { rotulo: '2 meses atrás', parcial: false },
      { rotulo: '3 meses atrás', parcial: false },
    ];
  }
  const saida = [];
  for (let i = 0; i < 4; i++) {
    let m = ref.mes - i;
    let a = ref.ano;
    while (m <= 0) { m += 12; a -= 1; }
    saida.push({ rotulo: NOMES_MES[m - 1] + '/' + String(a).slice(2), parcial: i === 0 });
  }
  return saida;
}

/**
 * Reconhece o relatório de clientes pela marca que só ele tem: QUATRO colunas
 * com o MESMO nome, "Faturamento". Nenhum outro relatório do Opus repete nome
 * de coluna, e é por isso que a repetição serve de assinatura — mais confiável
 * que o nome do arquivo, que qualquer um renomeia.
 *
 * @param {string[][]} linhas
 * @returns {number} índice da linha de cabeçalho, ou -1
 */
function ehRelatorioDeClientes(linhas) {
  const ls = linhas || [];
  for (let i = 0; i < Math.min(ls.length, 25); i++) {
    const cs = (ls[i] || []).map((c) => String(c === null || c === undefined ? '' : c).trim().toLowerCase());
    const faturamentos = cs.filter((c) => c.startsWith('faturamento')).length;
    const temCliente = cs.some((c) => c.startsWith('cliente'));
    const temUltima = cs.some((c) => c.replace(/[\s.]/g, '') === 'dtucom');
    if (faturamentos >= 2 && temCliente && temUltima) return i;
  }
  return -1;
}

/**
 * Lê a carteira inteira. Devolve também quantas linhas ficaram de fora, para
 * a tela poder dizer — linha descartada em silêncio é cliente que some.
 *
 * @param {string[][]} linhas
 * @param {number} iCab
 * @param {number} anoAtual
 * @returns {{clientes: object[], ignoradas: number}}
 */
function lerCarteira(linhas, iCab, anoAtual) {
  const ls = linhas || [];
  const clientes = [];
  let ignoradas = 0;
  for (let i = iCab + 1; i < ls.length; i++) {
    const c = lerLinhaCliente(ls[i], anoAtual);
    if (c) clientes.push(c); else ignoradas++;
  }
  return { clientes, ignoradas };
}

/** Resumo da carteira, com as grandezas separadas — nunca misturadas. */
function resumirCarteira(clientes, multiplicador = 1) {
  const lista = clientes || [];
  let comMeta = 0, somaMeta = 0, somaMedia = 0, semBase = 0, somaParcial = 0;
  for (const c of lista) {
    const m = metaDoCliente(c, multiplicador);
    if (m.meta === null) { semBase++; continue; }
    comMeta++;
    somaMeta += m.meta;
    somaMedia += m.base;
    const parcial = c.faturamento && c.faturamento[0];
    if (parcial !== null && parcial !== undefined) somaParcial += parcial;
  }
  return {
    clientes: lista.length,
    comMeta,
    semBase,
    somaMeta,
    somaMedia,
    /* Faturamento do mês corrente, que é PARCIAL. Nunca comparado com a meta
       cheia sem dizer que o mês ainda não acabou. */
    faturadoNoMesParcial: somaParcial,
  };
}

export {
  MESES_FECHADOS,
  anoDeDoisDigitos,
  paraReal,
  separarCodigoNome,
  lerLinhaCliente,
  mediaDosFechados,
  metaDoCliente,
  situacaoDoCliente,
  mesDeReferencia,
  rotulosDasColunas,
  ehRelatorioDeClientes,
  lerCarteira,
  resumirCarteira,
};
