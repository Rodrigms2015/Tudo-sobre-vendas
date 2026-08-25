/** Tipos de `rede.js`. JS puro porque é injetado na página. */
export interface VendaNaRede { unidades: number; dias: number; pracasComVenda: number }
export const DIAS_COBERTURA_PADRAO: number;
export function quantidadePelaRede(
  venda: VendaNaRede | null | undefined,
  diasCobertura: number,
  saldoAqui?: number | null,
): { qtd: number; porDiaPorPraca: number; base: string } | null;
export function ordenarPorGiro(a: { venda?: VendaNaRede }, b: { venda?: VendaNaRede }): number;
