/** Tipos de `rede.js`. JS puro porque é injetado na página. */
export interface PracaMedida { unidades: number; dias: number }
export const DIAS_COBERTURA_PADRAO: number;
export function quantidadePelaRede(
  pracas: PracaMedida[] | null | undefined,
  diasCobertura: number,
  saldoAqui?: number | null,
): { qtd: number; porDiaPorPraca: number; pracasComVenda: number; unidades: number; base: string } | null;
export function ordenarPorGiro(
  a: { venda?: { unidades?: number; pracasComVenda?: number } },
  b: { venda?: { unidades?: number; pracasComVenda?: number } },
): number;
