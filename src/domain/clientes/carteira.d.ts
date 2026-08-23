/** Tipos de `carteira.js`. JS puro porque é injetado na página. */
export interface Cliente {
  codigo: string; nome: string; tipo: string; filial: string;
  promotor: string; representante: string;
  frota: number | null; potencial: number | null;
  /** Índice 0 é o mês CORRENTE (parcial); 1..3 são os fechados. */
  faturamento: Array<number | null>;
  ultimaCompra: string | null; valorUltimaCompra: number | null;
  ramo: string; vendedor: string;
}
export interface MediaFechados { media: number; mesesUsados: number }
export interface Meta { meta: number; base: number; mesesUsados: number }
export interface SemMeta { meta: null; motivo: string }
export interface Situacao { situacao: string; rotulo: string; dias: number | null }
export interface RotuloColuna { rotulo: string; parcial: boolean }
export interface ResumoCarteira {
  clientes: number; comMeta: number; semBase: number;
  somaMeta: number; somaMedia: number; faturadoNoMesParcial: number;
}
export const MESES_FECHADOS: number;
export function anoDeDoisDigitos(dd: unknown, anoAtual: unknown): number;
export function paraReal(texto: unknown): number | null;
export function separarCodigoNome(texto: unknown): { codigo: string; nome: string } | null;
export function lerLinhaCliente(celulas: unknown[], anoAtual: number): Cliente | null;
export function mediaDosFechados(faturamento: Array<number | null>): MediaFechados | null;
export function metaDoCliente(cliente: { faturamento: Array<number | null> }, multiplicador?: number): Meta | SemMeta;
export function situacaoDoCliente(cliente: { ultimaCompra: string | null; faturamento: Array<number | null> }, hojeIso: string): Situacao;
export function mesDeReferencia(clientes: Array<{ ultimaCompra?: string | null }>): { ano: number; mes: number } | null;
export function rotulosDasColunas(ref: { ano: number; mes: number } | null): RotuloColuna[];
export function resumirCarteira(clientes: Array<{ faturamento: Array<number | null> }>, multiplicador?: number): ResumoCarteira;
