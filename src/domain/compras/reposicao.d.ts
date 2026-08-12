/** Tipos de `reposicao.js`. O motor é JS puro porque é injetado na página. */
export interface PesosPrioridade extends Record<string, number> {
  giro: number; ruptura: number; desvio: number; essencialidade: number;
}
export interface ParcelaDeFonte { itens: number; unidades: number }
export interface SeparacaoPorFonte {
  medida: ParcelaDeFonte; estimada: ParcelaDeFonte; total: ParcelaDeFonte;
}
export interface RessalvaDeRuptura { aviso: string; ajustaQuantidade: boolean }

export const PESOS_PRIORIDADE: PesosPrioridade;
export const ROTULO_PESO: Record<string, string>;
export const FONTE: { MEDIDA: 'medida'; ESTIMADA: 'estimada' };
export const ROTULO_FONTE: Record<string, string>;
export function validarPesos(pesos?: Record<string, number>): number;
export function porDiaMedido(unidades: unknown, dias: unknown): number | null;
export function quantidadeParaCobrir(e: { porDia: number | null; diasCobertura: number; saldo: number | null }): number | null;
export function separarPorFonte(itens: Array<{ fonte?: string; medida?: boolean; quantidade?: number | null }>): SeparacaoPorFonte;
export function ressalvaDeRuptura(e: { saldo: number | null; diasSemVender: number | null; temHistoricoDeEstoque?: boolean }): RessalvaDeRuptura | null;
