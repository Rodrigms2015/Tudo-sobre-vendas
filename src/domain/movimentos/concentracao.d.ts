/** Tipos de `concentracao.js`. JS puro porque é injetado na página. */
export interface SaidaMedida { documento?: string; qtd?: number; data?: string }
export interface Concentracao {
  total: number; lancamentos: number; documentos: number;
  maiorDocumento: { documento: string; unidades: number } | null;
  fracaoNoMaior: number | null; concentrada: boolean | null; limiar: number;
  mesesAtivos: number; mediaMensal: number | null; medianaMensal: number | null;
  totalSemMaior: number;
}
export const LIMIAR_CONCENTRACAO: number;
export function mediana(valores: Array<number | null | undefined>): number | null;
export function medirConcentracao(saidas: SaidaMedida[] | null | undefined, limiar?: number): Concentracao | null;
export function semMaiorDocumento<T extends SaidaMedida>(saidas: T[] | null | undefined): T[];
