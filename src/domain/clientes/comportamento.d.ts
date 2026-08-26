/** Tipos de `comportamento.js`. JS puro porque é injetado na página. */

/**
 * O mínimo que estas funções leem do cliente.
 *
 * Não é `Partial<Cliente>` de propósito: `ultimaCompra` pode ser `null` (o
 * relatório não trouxe data), mas nunca `undefined` — ausência aqui tem um
 * único valor, e é `null`.
 */
export interface ClienteLido {
  faturamento: Array<number | null>;
  ultimaCompra: string | null;
  [extra: string]: unknown;
}

export type CategoriaCliente =
  | 'SEM_BASE' | 'SEM_COMPRA_REGISTRADA' | 'REGULAR_E_SUMIU' | 'ESTA_CAINDO' | 'COMPRA_ESPORADICA' | 'INATIVO' | 'ATIVO';

/** `evidencia` e `lacuna` nunca vêm as duas nulas. */
export interface Comportamento {
  categoria: CategoriaCliente;
  rotulo: string;
  acao: string;
  evidencia: string | null;
  lacuna: string | null;
}

export interface Ligacao extends Comportamento {
  cliente: ClienteLido;
  dias: number | null;
  /** Mediana dos meses fechados; `null` quando nenhum foi lido — nunca 0. */
  mediana: number | null;
}

export const MESES_FECHADOS_COMP: number;
export const REGUA_DIAS: number[];
export const CATEGORIAS_CLIENTE: CategoriaCliente[];
export const PRECEDENCIA_CLIENTE: Record<CategoriaCliente, number>;
export const ROTULO_CATEGORIA_CLIENTE: Record<CategoriaCliente, string>;
export const ACAO_CATEGORIA_CLIENTE: Record<CategoriaCliente, string>;

export function medianaDeValores(valores: number[]): number | null;
export function fechadosDoCliente(cliente: ClienteLido): Array<number | null>;
export function medianaDosFechados(
  cliente: ClienteLido,
): { mediana: number; mesesUsados: number } | null;
export function categoriaDoCliente(
  cliente: ClienteLido, dias: number | null, corte: number,
): Comportamento;
export function listaDeLigacoes(
  clientes: ClienteLido[], hojeIso: string, corte: number,
  calcularDias: (cliente: ClienteLido, hojeIso: string) => number | null,
): Ligacao[];
export function contarCategorias(
  clientes: ClienteLido[], hojeIso: string, corte: number,
  calcularDias: (cliente: ClienteLido, hojeIso: string) => number | null,
): Record<CategoriaCliente, number>;
