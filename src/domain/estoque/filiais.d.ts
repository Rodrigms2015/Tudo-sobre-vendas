/** Tipos de `filiais.js`. JS puro porque é injetado na página. */
export const FILIAIS: Record<string, [string, string]>;
export const RUIDO_NOME: Set<string>;
export function dosDigitos(v: unknown): string;
export function nomeFilial(ff: unknown): string;
export function ufDaFilial(ff: unknown): string | null;
export function palavrasDe(t: unknown): string[];
export function distancia(a: string, b: string, teto: number): number;
export function casaPalavra(a: string, b: string): boolean;
export function reconhecerFilial(nomeArquivo: unknown, frouxo?: boolean): string | null;
