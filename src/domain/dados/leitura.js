/**
 * Leitura de arquivo: CSV e números do jeito brasileiro.
 *
 * FONTE ÚNICA DA VERDADE, no mesmo esquema dos outros motores: testado pelo
 * vitest E injetado em `plataforma/corpo.html` pelo gerador. JavaScript puro,
 * sem import.
 *
 * Este é o primeiro degrau de tudo: se a leitura erra, nenhuma regra adiante
 * conserta. Por isso ele saiu do HTML — dentro de um arquivo de 7.000 linhas
 * essas funções não tinham teste próprio, e são justamente as que mais
 * silenciosamente estragam número.
 */

/**
 * Lê CSV escolhendo o separador pela PRIMEIRA linha: `;` quando ela tem mais
 * ponto-e-vírgula que vírgula, senão `,`. O Excel brasileiro exporta com `;`
 * porque a vírgula já é o separador decimal.
 *
 * Respeita aspas e aspas duplicadas (`""` dentro de campo entre aspas), que é
 * como uma descrição com `7"` chega até aqui inteira.
 *
 * @param {string} texto
 * @returns {string[][]}
 */
export function lerCsv(texto) {
  const conteudo = String(texto ?? '');
  const primeira = conteudo.split('\n')[0] || '';
  const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ';' : ',';
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (aspas) {
      if (c === '"') { if (conteudo[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

/**
 * Inteiro no formato brasileiro. Ponto é milhar, vírgula é decimal.
 *
 * Devolve `null` para vazio ou ilegível — **nunca zero**. Zero é quantidade
 * legítima; confundir os dois inventa estoque e inventa venda.
 *
 * @param {unknown} v
 * @returns {number|null}
 */
export function paraInteiro(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null;
  const s = String(v ?? '').trim().replace(/\./g, '').replace(',', '.');
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Texto sem acento, para comparar sem depender de como foi digitado. */
export function semAcento(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Chave de comparação: sem acento, minúscula, só letras e números. */
export function chave(s) {
  return semAcento(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Data brasileira (`dd/mm/aaaa` ou `dd-mm-aa`) em ISO.
 *
 * O ano de dois dígitos vira 20xx: o relatório do Opus é de operação corrente,
 * não de arquivo histórico. Devolve `null` para o que não for data — inclusive
 * `31/02`, que tem formato certo e dia inexistente.
 *
 * @param {unknown} texto
 * @returns {string|null} `aaaa-mm-dd`
 */
export function dataBrParaIso(texto) {
  const t = String(texto ?? '').trim();
  const m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  let ano = Number(m[3]);
  if (m[3].length === 2) ano += 2000;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  /* Rejeita data que o Date "conserta" sozinho: 31/02 viraria 03/03. */
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return d.toISOString().slice(0, 10);
}
