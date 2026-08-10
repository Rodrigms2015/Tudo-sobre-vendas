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
  /** Coluna `Grupo` do relatório: código interno de produto do Opus. Não é marca. */
  grupoProdutoOriginal: string;
  grupoProduto: unknown;
  grupoProdutoNormalizado: string;
  codigoOriginal: string;
  denominacao: string;
  curva: string;
  localizacao: string;
  /** `null` quando o saldo não pôde ser lido. Nunca zero por omissão. */
  estoqueIndividual: number | null;
}

/** Um grupo de produto vizinho que compartilha o mesmo código de fábrica. */
export interface GrupoIrmao {
  duplicateKey: string;
  grupoProdutoNormalizado: string;
  denominacao: string;
  estoqueGrupo: number | null;
  /** Descrição idêntica: forte indício de ser a mesma peça cadastrada duas vezes. */
  mesmaDenominacao: boolean;
}

/**
 * A peça consolidada. Invariantes:
 *   estoqueGrupo = soma dos saldos lidos (null se nenhum foi lido)
 *   rupturaReal  = estoqueGrupo !== null && estoqueGrupo <= 0
 */
export interface GrupoCadastral {
  duplicateKey: string;
  semIdentidade: boolean;
  grupoProdutoNormalizado: string;
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
  gruposIrmaos: GrupoIrmao[];
  /** Soma do saldo dos irmãos com a mesma descrição. `null` se não há nenhum. */
  estoqueEmGrupoIrmao: number | null;
  /** Ruptura no papel com saldo do outro lado: não é compra, é cadastro duplicado. */
  cobertoPorGrupoIrmao: boolean;
}

export interface ColisaoDeCodigo {
  codigoFabricaBase: string;
  mesmaDenominacao: boolean;
  grupos: Array<{ duplicateKey: string; denominacao: string; estoqueGrupo: number | null }>;
}

export interface QualidadeDaImportacao {
  linhasLidas: number;
  codigosVazios: number;
  gruposDeProdutoVazios: number;
  saldosIlegiveis: number;
  codigosAlteradosPelaNormalizacao: number;
  codigosSemAlteracao: number;
  gruposCriados: number;
  gruposComMaisDeUmCadastro: number;
  gruposSemIdentidade: number;
  maiorGrupo: { duplicateKey: string; cadastros: number } | null;
  colisoesDeCodigoBase: ColisaoDeCodigo[];
  provavelMesmoProdutoEmDoisGrupos: number;
  colisoesEntreProdutosDiferentes: number;
}

export interface ResumoEstoque {
  linhasCadastrais: number;
  gruposConsolidados: number;
  cadastrosDuplicados: number;
  linhasComSaldoZero: number;
  linhasZeradasCobertasPorOutroCadastro: number;
  gruposEmRupturaReal: number;
  gruposCobertosPorGrupoIrmao: number;
  unidadesEmEstoque: number;
}

export function normalizarCodigoFabrica(codigo: unknown): string;
export function normalizarGrupoProduto(valor: unknown): string;
export function montarChaveDuplicidade(registro: { grupoProduto?: unknown; codigoFabrica?: unknown }): string | null;
export function paraNumeroBr(valor: unknown): number | null;
export function registroCanonico(bruto: Record<string, unknown>): RegistroCanonico;
export function agruparCadastros(registros: RegistroCanonico[]): GrupoCadastral[];
export function qualidadeDaImportacao(registros: RegistroCanonico[], grupos: GrupoCadastral[]): QualidadeDaImportacao;
export function resumirEstoque(registros: RegistroCanonico[], grupos: GrupoCadastral[]): ResumoEstoque;
