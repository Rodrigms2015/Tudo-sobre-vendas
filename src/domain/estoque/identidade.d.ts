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
  /** Opcional, de catálogo externo com código interno rastreável. `''` = desconhecida. */
  marca: string;
  /** `null` quando o saldo não pôde ser lido. Nunca zero por omissão. */
  estoqueIndividual: number | null;
}

/** Um grupo de produto vizinho que compartilha o mesmo código de fábrica. */
export interface GrupoIrmao {
  duplicateKey: string;
  grupoProdutoNormalizado: string;
  denominacao: string;
  marca: string;
  estoqueGrupo: number | null;
  /** Descrição idêntica — indício, não prova: ela vem truncada em 19 caracteres. */
  mesmaDenominacao: boolean;
  /** `null` quando falta marca de um dos lados: "não sei" não é "diferente". */
  mesmaMarca: boolean | null;
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
  marca: string;
  cadastros: RegistroCanonico[];
  quantidadeCadastros: number;
  cadastrosZerados: number;
  codigosInternosDoGrupo: string[];
  codigosFabricaOriginaisDoGrupo: string[];
  estoqueGrupo: number | null;
  rupturaReal: boolean | null;
  zeradoCobertoPorOutroCadastro: boolean;
  gruposIrmaos: GrupoIrmao[];
  /** Saldo em irmãos de mesma descrição E mesma marca comprovada. */
  estoqueEmGrupoIrmao: number | null;
  /** Saldo em irmãos de mesma descrição cuja marca não pôde ser comparada. */
  estoqueEmGrupoIrmaoSemProva: number | null;
  /** Duplicata comprovada pela marca: sai da lista de compra. */
  cobertoPorGrupoIrmao: boolean;
  /** Parece duplicata, mas sem marca que prove. Continua na fila, com a dúvida. */
  conferirGrupoIrmao: boolean;
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
  gruposAConferirComGrupoIrmao: number;
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
