/** Tipos de `xlsx.js`. JS puro porque é injetado na página. */
export interface CelulaXlsx { coluna: number; valor: string }

export function indiceDaColuna(ref: unknown): number;
export function abrirZip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>>;
export function formatoEhData(codigo: string | null, id: number): boolean;
export function dataDoSerial(serial: unknown): string | null;
export function dataSerialBr(serial: unknown): string | null;
export function planilhasDoZip(arquivos: Map<string, Uint8Array>): string[];
export function lerXlsx(buffer: ArrayBuffer): Promise<CelulaXlsx[][]>;
export function alinharNaGrade(
  celulas: CelulaXlsx[] | null | undefined,
  referencias: number[] | null | undefined,
  primeira?: number,
): string[];
export function alinharPorCabecalho(
  celulas: CelulaXlsx[] | null | undefined,
  colunas: Record<string, number>,
  primeiraDoCabecalho: number,
): Record<string, string>;
export function escolherCabecalho(linhas: CelulaXlsx[][], ate?: number): number;
export function montarGrade(linhas: CelulaXlsx[][]): {
  grade: string[][];
  cabecalho: number;
  textoSolto: string[];
};
