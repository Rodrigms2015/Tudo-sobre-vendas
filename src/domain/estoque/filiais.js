/**
 * Filiais da rede e reconhecimento da praça pelo nome do arquivo.
 *
 * FONTE ÚNICA DA VERDADE, no mesmo esquema dos outros motores: testado pelo
 * vitest E injetado em `plataforma/corpo.html` pelo gerador. JS puro.
 *
 * Saiu do HTML porque errar aqui **troca a filial da análise inteira** — o
 * estoque de outra praça entra como se fosse o de casa, ou o de casa entra
 * como se fosse de outra — e nada na tela denuncia. Era a única regra dessa
 * gravidade sem teste próprio.
 */

const FILIAIS = {
  '03': ['Ribeirão Preto', 'SP'], '04': ['São José do Rio Preto', 'SP'],
  '05': ['Contagem', 'MG'], '06': ['Uberlândia', 'MG'], '07': ['Curitiba', 'PR'],
  '08': ['Recife', 'PE'], '09': ['Porto Alegre', 'RS'], '10': ['Rio de Janeiro', 'RJ'],
  '11': ['Brasília', 'DF'], '12': ['Salvador', 'BA'], '13': ['Londrina', 'PR'],
  '14': ['Campinas', 'SP'], '15': ['Belém', 'PA'], '16': ['Viana', 'ES'],
  '17': ['Campo Grande', 'MS'], '18': ['Cuiabá', 'MT'], '19': ['Itajaí', 'SC'],
  '20': ['São Paulo', 'SP'], '21': ['Goiânia', 'GO'], '22': ['Guarulhos', 'SP'],
  '23': ['Fortaleza', 'CE'], '24': ['São Bernardo', 'SP'], '25': ['Presidente Prudente', 'SP'],
  '27': ['Chapecó', 'SC'], '28': ['Caxias do Sul', 'RS'], '29': ['Cascavel', 'PR'],
  '30': ['Maringá', 'PR'], '31': ['Pouso Alegre', 'MG'], '37': ['Passo Fundo', 'RS'],
};

const dosDigitos = (v) => String(v === null || v === undefined ? '' : v).trim().padStart(2, '0');
const nomeFilial = (ff) => {
  const f = FILIAIS[dosDigitos(ff)];
  return f ? f[0] : 'filial ' + dosDigitos(ff);
};
const ufDaFilial = (ff) => (FILIAIS[dosDigitos(ff)] || [null, null])[1];

/** Palavras com três letras ou mais, sem acento, em caixa alta. Número sai. */
const palavrasDe = (t) =>
  String(t === null || t === undefined ? '' : t)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(' ')
    .filter((p) => p.length >= 3 && !/^\d+$/.test(p));

/** Palavras que aparecem em nome de relatório e não ajudam a identificar praça. */
const RUIDO_NOME = new Set(['ESTOQUE', 'RELATORIO', 'POSICAO', 'FILIAL', 'GERAL', 'ATUAL', 'XLS', 'DOS', 'DAS']);

/**
 * Distância de edição, limitada: quantas letras é preciso trocar, tirar ou pôr
 * para uma palavra virar a outra. Existe por causa de um caso real —
 * `ESTOQUE SÃO BERNADO` sem o segundo R. Um erro de digitação no nome do
 * arquivo não pode decidir de qual filial é o estoque.
 */
function distancia(a, b, teto) {
  if (Math.abs(a.length - b.length) > teto) return teto + 1;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let melhor = i;
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (atual[j] < melhor) melhor = atual[j];
    }
    if (melhor > teto) return teto + 1;
    ant = atual;
  }
  return ant[b.length];
}

/** Uma palavra do arquivo casa com uma da cidade. */
const casaPalavra = (a, b) =>
  a === b || a.startsWith(b) || b.startsWith(a) ||
  (Math.min(a.length, b.length) >= 6 && distancia(a, b, 2) <= 2);

/**
 * Descobre a praça pelo nome do arquivo — `ESTOQUE PRES. PRUD 0608.xls` vira
 * Presidente Prudente. Devolve `null` quando não dá para ter certeza; quem
 * chama pergunta, e perguntar é melhor que errar a filial inteira.
 *
 * Duas passagens, nesta ordem:
 *
 * 1. **Maioria das palavras da cidade.** Nota ≥ 0,6 decide. Empate é dúvida.
 * 2. **A palavra que só existe numa cidade.** `ESTOQUE_CAXIAS_2406.xls` casa
 *    só metade de "Caxias do Sul" — nota 0,5 — e ficava sem reconhecimento,
 *    embora CAXIAS não seja ambíguo em filial nenhuma da rede. Uma palavra de
 *    cinco letras ou mais que case com UMA cidade só decide sozinha. Cinco
 *    letras porque abaixo disso as palavras se repetem (SAO, RIO, DO); "uma
 *    cidade só" porque PRETO está em Ribeirão Preto e em São José do Rio
 *    Preto, e nesse caso perguntar continua sendo o certo.
 *
 * @param {unknown} nomeArquivo
 * @param {boolean} [frouxo] devolve o melhor palpite mesmo sem certeza. Serve
 *   para o diálogo de escolha marcar uma opção — sugerir, não decidir.
 * @returns {string|null} código de dois dígitos da filial
 */
function reconhecerFilial(nomeArquivo, frouxo) {
  const alvo = palavrasDe(nomeArquivo).filter((p) => !RUIDO_NOME.has(p));
  if (!alvo.length) return null;

  const notas = Object.entries(FILIAIS).map(([ff, [cidade]]) => {
    const termos = palavrasDe(cidade);
    const acertos = termos.filter((t) => alvo.some((a) => casaPalavra(a, t))).length;
    return { ff, acertos, nota: termos.length ? acertos / termos.length : 0 };
  }).filter((x) => x.acertos > 0).sort((a, b) => b.nota - a.nota || b.acertos - a.acertos);

  if (notas.length && notas[0].nota >= 0.6) {
    if (notas[1] && notas[1].nota === notas[0].nota && notas[1].acertos === notas[0].acertos) return null;
    return notas[0].ff;
  }

  const soUma = new Map();
  for (const palavra of alvo) {
    if (palavra.length < 5) continue;
    const cidades = Object.entries(FILIAIS)
      .filter(([, [cidade]]) => palavrasDe(cidade).some((t) => casaPalavra(palavra, t)))
      .map(([ff]) => ff);
    if (cidades.length === 1) soUma.set(cidades[0], palavra);
  }
  if (soUma.size === 1) return [...soUma.keys()][0];
  if (frouxo && notas.length) return notas[0].ff;
  return null;
}

export {
  FILIAIS,
  dosDigitos,
  nomeFilial,
  ufDaFilial,
  palavrasDe,
  RUIDO_NOME,
  distancia,
  casaPalavra,
  reconhecerFilial,
};
