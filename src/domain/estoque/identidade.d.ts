/**
 * Tipos de `identidade.js`.
 *
 * O motor é JavaScript puro porque é injetado na página autocontida, que não
 * tem build. Os tipos moram aqui para que o TypeScript e os testes cobrem o
 * contrato mesmo assim.
 */

/** Uma linha do relatório, com o original preservado ao lado do normalizado. */
export interface RegistroCanonico {
  registroOriginal: Record<string, unknown>;
  codigoInterno: string;
  codigoFabricaOriginal: string;
  codigoFabricaBase: string;
  codigoFabrica: string;
  fornecedorOriginal: string;
  fornecedor: unknown;
  fornecedorNormalizado: string;
  codigoOriginal: string;
  denominacao: string;
  curva: string;
  localizacao: string;
  /** `null` quando o saldo não pôde ser lido. Nunca zero por omissão. */
  estoqueIndividual: number | null;
}

/**
 * A peça consolidada. Invariantes:
 *   estoqueGrupo = soma dos saldos lidos (null se nenhum foi lido)
 *   rupturaReal  = estoqueGrupo !== null && estoqueGrupo <= 0
 */
export interface GrupoCadastral {
  duplicateKey: string;
  semIdentidade: boolean;
  fornecedorNormalizado: string;
  codigoFabricaBase: string;
  denominacao: string;
  cadastros: RegistroCanonico[];
  quantidadeCadastros: number;
  cadastrosZerados: number;
  codigosInternosDoGrupo: string[];
  codigosFabricaOriginaisDoGrupo: string[];
  estoqueGrupo: number | null;
  rupturaReal: boolean | null;
  zeradoCobertoPorOutroCadastro: boolean;
}

export interface ColisaoDeCodigo {
  codigoFabricaBase: string;
  grupos: Array<{ duplicateKey: string; denominacao: string; estoqueGrupo: number | null }>;
}

export interface QualidadeDaImportacao {
  linhasLidas: number;
  codigosVazios: number;
  fornecedoresVazios: number;
  saldosIlegiveis: number;
  codigosAlteradosPelaNormalizacao: number;
  codigosSemAlteracao: number;
  gruposCriados: number;
  gruposComMaisDeUmCadastro: number;
  gruposSemIdentidade: number;
  maiorGrupo: { duplicateKey: string; cadastros: number } | null;
  colisoesDeCodigoBase: ColisaoDeCodigo[];
}

export interface ResumoEstoque {
  linhasCadastrais: number;
  gruposConsolidados: number;
  cadastrosDuplicados: number;
  linhasComSaldoZero: number;
  linhasZeradasCobertasPorOutroCadastro: number;
  gruposEmRupturaReal: number;
  unidadesEmEstoque: number;
}

export function normalizarCodigoFabrica(codigo: unknown): string;
export function normalizarFornecedor(valor: unknown): string;
export function montarChaveDuplicidade(registro: { fornecedor?: unknown; codigoFabrica?: unknown }): string | null;
export function paraNumeroBr(valor: unknown): number | null;
export function registroCanonico(bruto: Record<string, unknown>): RegistroCanonico;
export function agruparCadastros(registros: RegistroCanonico[]): GrupoCadastral[];
export function qualidadeDaImportacao(registros: RegistroCanonico[], grupos: GrupoCadastral[]): QualidadeDaImportacao;
export function resumirEstoque(registros: RegistroCanonico[], grupos: GrupoCadastral[]): ResumoEstoque;
