/** Tipos de `pacoteTecnico.js`. JS puro porque é injetado na página. */
export interface ItemDoPacote {
  interno: string; fab: string; original: string; descricao: string;
  marca: string; marcaCodigo: string; qtdNoPacote: number | null; un: string;
  aplicacao: string; preco: number | null;
}
export interface Pacote {
  codigo: string; descricao: string; cadastro: string; aplicacao: string; itens: ItemDoPacote[];
}
export interface FichaDoCodigo {
  interno: string; descricao: string; marca: string; marcaCodigo: string;
  original: string; fab: string; aplicacao: string; preco: number | null; pacotes: string[];
}
export function reguaDeColunas(linha: unknown): Array<[number, number]> | null;
export function precoDoRelatorio(texto: unknown): number | null;
export function separarMarca(texto: unknown): { codigo: string; nome: string };
export function ehPacoteTecnico(linhas: string[] | null | undefined): boolean;
export function cabecalhoDoRelatorio(linhas: string[] | null | undefined): {
  filial: string; nomeFilial: string; emitidoEm: string;
};
export function lerPacoteTecnico(linhas: string[] | null | undefined): {
  pacotes: Pacote[]; componentes: number; ignoradas: number;
  filial: string; nomeFilial: string; emitidoEm: string;
};
export function fichaPorCodigo(pacotes: Pacote[] | null | undefined): {
  ficha: Record<string, FichaDoCodigo>;
  divergencias: Array<{ interno: string; campo: string; a: unknown; b: unknown }>;
};
