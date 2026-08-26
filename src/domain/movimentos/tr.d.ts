/** Tipos de `tr.js`. JS puro porque é injetado na página. */
export interface MovimentoTr { tp?: string; tr?: string; qtd?: number; documento?: string; filial?: string; data?: string }
export interface ResumoTr {
  chave: string; tp: string; tr: string; linhas: number; unidades: number;
  documentos: number; filiais: string[]; prefixoMaisComum: string;
  primeira: string | null; ultima: string | null;
}
export interface Contagem { linhas: number; unidades: number }
export const CLASSES: string[];
export const ROTULO_CLASSE: Record<string, string>;
export function chaveTr(tp: unknown, tr: unknown): string;
export function classeDe(mov: MovimentoTr, mapa: Record<string, string>): string;
export function ehVenda(mov: MovimentoTr, mapa: Record<string, string>): boolean;
export function resumirTrs(movimentos: MovimentoTr[] | null | undefined): ResumoTr[];
export function coberturaDeVenda(movimentos: MovimentoTr[] | null | undefined, mapa: Record<string, string>): {
  saidas: Contagem; venda: Contagem; porClasse: Record<string, Contagem>;
  pctLinhas: number | null; pctUnidades: number | null; semClassificacao: boolean;
};
export function saidasNaoClassificadas(movimentos: MovimentoTr[] | null | undefined, mapa: Record<string, string>): ResumoTr[];
