/** Tipos de `folga.js`. JS puro porque é injetado na página. */

/** `unidades`/`dias` nulos significam movimentação daquela praça não carregada. */
export interface PracaMedida {
  nome?: string;
  ff?: string;
  saldo: number | null;
  unidades: number | null;
  dias: number | null;
}

/** `folga` nula = desconhecida (falta medir), nunca "não pode ceder". */
export interface Folga {
  folga: number | null;
  precisa: number | null;
  porDia: number | null;
  /** A conta inteira em português, com os números que entraram nela. */
  base: string;
  motivo: string | null;
}

export const RESERVA_MINIMA: number;
export function folgaAparente(praca: PracaMedida, diasCobertura: number): Folga;
export function dequemPedir(
  pracas: PracaMedida[], diasCobertura: number,
): {
  podem: Array<PracaMedida & Folga>;
  semMedida: Array<PracaMedida & Folga>;
  /** `null` quando nenhuma praça pôde ser medida — não é zero. */
  folgaTotal: number | null;
};
