/**
 * Modelo de dados canônico do BRUTO OS.
 * Documentação e decisões de modelagem: docs/DATA_MODEL.md
 *
 * Duas regras estruturais governam este arquivo:
 *
 * 1. Ausência é `null`, nunca 0 nem "". Zero é um valor comercial legítimo; ausência não é.
 * 2. Toda saída do motor estende `Explicavel`. Não é possível criar uma recomendação ou um
 *    alerta sem raciocínio exposto sem quebrar a compilação (PROMPT_MASTER §1.7).
 */

// ---------------------------------------------------------------------------
// Procedência e explicabilidade
// ---------------------------------------------------------------------------

/** De onde vem um valor. A UI nunca exibe estimado com a aparência de confirmado. */
export type Procedencia = 'CONFIRMADO' | 'ESTIMADO' | 'AUSENTE' | 'DEMONSTRACAO';

/** Um fator que contribuiu para uma decisão do motor, com a evidência que o sustenta. */
export interface Fator {
  rotulo: string;
  /** Pontos que este fator adicionou (positivo) ou removeu (negativo). */
  peso: number;
  /** O dado concreto que sustenta o fator. Nunca genérico. */
  evidencia: string;
}

/**
 * Contrato de explicabilidade. Toda saída do motor implementa isto.
 * Ver docs/CRITICAL_REVIEW.md §4.1.
 */
export interface Explicavel {
  fatores: Fator[];
  penalidades: Fator[];
  /** O que o sistema não sabe e que afeta esta conclusão. */
  lacunas: string[];
  /** A pergunta que o vendedor deve fazer para fechar a maior lacuna. */
  proximaPergunta: string | null;
}

// ---------------------------------------------------------------------------
// Identidade
// ---------------------------------------------------------------------------

export type PapelUsuario = 'VENDEDOR_INTERNO' | 'VENDEDOR_EXTERNO' | 'GESTOR';

export interface User {
  id: string;
  nome: string;
  papel: PapelUsuario;
  sellerId: string | null;
}

export interface Seller {
  id: string;
  nome: string;
  regiao: string;
  metaMensal: number;
}

// ---------------------------------------------------------------------------
// Carteira
// ---------------------------------------------------------------------------

export type TipoCliente =
  | 'FROTISTA'
  | 'TRANSPORTADORA'
  | 'OFICINA'
  | 'REVENDA'
  | 'VIACAO'
  | 'COOPERATIVA';

export type Segmento =
  | 'CARGA_RODOVIARIA'
  | 'PASSAGEIROS_URBANO'
  | 'PASSAGEIROS_RODOVIARIO'
  | 'CONSTRUCAO'
  | 'AGRONEGOCIO'
  | 'DISTRIBUICAO_URBANA';

export type PerfilOperacao = 'RODOVIARIO' | 'URBANO' | 'MISTO';

/**
 * Rótulos de exibição. Derivar o texto do identificador do enum
 * (`.replace('_',' ').toLowerCase()`) produz "viacao", "construcao",
 * "passageiros urbano" — inaceitável num produto que se apoia no vocabulário do setor.
 */
export const ROTULO_TIPO_CLIENTE: Record<TipoCliente, string> = {
  FROTISTA: 'Frotista',
  TRANSPORTADORA: 'Transportadora',
  OFICINA: 'Oficina',
  REVENDA: 'Revenda',
  VIACAO: 'Viação',
  COOPERATIVA: 'Cooperativa',
};

export const ROTULO_SEGMENTO: Record<Segmento, string> = {
  CARGA_RODOVIARIA: 'Carga rodoviária',
  PASSAGEIROS_URBANO: 'Passageiros urbano',
  PASSAGEIROS_RODOVIARIO: 'Passageiros rodoviário',
  CONSTRUCAO: 'Construção',
  AGRONEGOCIO: 'Agronegócio',
  DISTRIBUICAO_URBANA: 'Distribuição urbana',
};

export const ROTULO_PERFIL_OPERACAO: Record<PerfilOperacao, string> = {
  RODOVIARIO: 'Rodoviário',
  URBANO: 'Urbano',
  MISTO: 'Misto',
};

export type OrigemRegistro = 'DEMONSTRACAO' | 'IMPORTADO' | 'MANUAL';

export interface Customer {
  id: string;
  nomeFantasia: string;
  cidade: string;
  uf: string;
  segmento: Segmento;
  tipoCliente: TipoCliente;
  sellerId: string;
  /** Potencial declarado pelo comercial, 1 a 5. Null quando nunca avaliado. */
  potencial: number | null;
  criadoEm: string;
  observacoes: string;
  origem: OrigemRegistro;
}

export type CanalPreferido = 'TELEFONE' | 'WHATSAPP' | 'EMAIL' | 'PRESENCIAL';

export interface Contact {
  id: string;
  customerId: string;
  nome: string;
  cargo: string;
  canalPreferido: CanalPreferido;
  /** Sempre mascarado. Ver docs/SECURITY.md §2. */
  telefoneMascarado: string;
}

/**
 * Perfil de frota. Inteiramente anulável de propósito: na prática quase nunca existe.
 * A ausência vira lacuna acionável em vez de campo preenchido com lixo.
 */
export interface Fleet {
  id: string;
  customerId: string;
  totalVeiculos: number | null;
  perfilOperacao: PerfilOperacao | null;
  idadeMediaAnos: number | null;
  procedencia: Procedencia;
}

export interface Vehicle {
  id: string;
  fleetId: string;
  marca: string;
  modelo: string;
  ano: number | null;
  quantidade: number;
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export type SistemaVeicular =
  | 'EMBREAGEM'
  | 'FREIO'
  | 'ARREFECIMENTO'
  | 'SUSPENSAO'
  | 'INJECAO'
  | 'TRANSMISSAO'
  | 'ELETRICO'
  | 'MOTOR'
  | 'DIRECAO'
  | 'FILTRACAO';

export interface ProductFamily {
  id: string;
  nome: string;
  sistema: SistemaVeicular;
  /** Ciclo médio informado pelo comercial, em dias. Null quando desconhecido. */
  cicloMedioDias: number | null;
}

export interface Product {
  id: string;
  familyId: string;
  descricao: string;
  codigoInterno: string;
  marca: string;
}

export type TipoRelacao = 'KIT' | 'CORRELATO' | 'INSTALACAO';

/**
 * Correlação COMERCIAL entre famílias. Nunca entre produtos específicos —
 * relação produto-a-produto seria indistinguível de aplicação técnica.
 * Ver docs/CRITICAL_REVIEW.md §1.4.
 */
export interface ProductRelation {
  id: string;
  origemFamilyId: string;
  destinoFamilyId: string;
  tipo: TipoRelacao;
  /** Fração de pedidos com a origem que também contêm o destino. */
  suporte: number;
  procedencia: Procedencia;
  /** Pergunta que o vendedor deve fazer ao explorar esta relação. */
  perguntaSugerida: string;
}

/**
 * Aplicação técnica veículo↔peça.
 * O seed de demonstração entrega esta entidade VAZIA de propósito.
 * Só é populada por importação de catálogo validado. Ver docs/SECURITY.md §6.
 */
export interface VehicleApplication {
  id: string;
  productId: string;
  marca: string;
  modelo: string;
  motor: string | null;
  anoInicio: number;
  anoFim: number | null;
  /** Fonte rastreável obrigatória. Sem fonte, o registro não existe. */
  fonteCatalogo: string;
}

// ---------------------------------------------------------------------------
// Atividade comercial
// ---------------------------------------------------------------------------

export type TipoInteracao = 'LIGACAO' | 'VISITA' | 'WHATSAPP' | 'EMAIL';

export interface Interaction {
  id: string;
  customerId: string;
  tipo: TipoInteracao;
  data: string;
  /** Contato não é métrica; contato ÚTIL é. Ver docs/DATA_MODEL.md §2. */
  util: boolean;
  urgente: boolean;
  resumo: string;
}

export type StatusOrcamento = 'ABERTO' | 'GANHO' | 'PERDIDO' | 'EXPIRADO';

export interface Quote {
  id: string;
  customerId: string;
  data: string;
  status: StatusOrcamento;
  valorTotal: number;
  validadeDias: number;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  quantidade: number;
  valorUnitario: number;
}

export interface Sale {
  id: string;
  customerId: string;
  data: string;
  valorTotal: number;
  /** Null quando o ERP não expõe margem ao vendedor. Nunca assumir uma média. */
  margemPercentual: number | null;
  quoteId: string | null;
}

export interface SaleItem {
  id: string;
  saleId: string;
  /**
   * Null quando a venda foi registrada manualmente pela família, sem item específico.
   * O motor usa apenas `familyId` — cadência, cesta e expansão são todas por família.
   * Exigir um produto obrigaria a inventar um: pior que assumir a ausência.
   */
  productId: string | null;
  familyId: string;
  quantidade: number;
  valorTotal: number;
}

export type MotivoPerda =
  | 'PRECO'
  | 'PRAZO'
  | 'ESTOQUE'
  | 'FRETE'
  | 'MARCA'
  | 'APLICACAO'
  | 'CONCORRENCIA'
  | 'CREDITO'
  | 'ATRASO'
  | 'ERRO_INTERNO'
  | 'CLIENTE_DESISTIU'
  | 'NAO_RETORNOU'
  | 'INFORMACAO_INSUFICIENTE'
  | 'OUTRO';

export const MOTIVOS_PERDA: { valor: MotivoPerda; rotulo: string; gargalo: string }[] = [
  { valor: 'PRECO', rotulo: 'Preço', gargalo: 'Comercial' },
  { valor: 'PRAZO', rotulo: 'Prazo de entrega', gargalo: 'Logística' },
  { valor: 'ESTOQUE', rotulo: 'Falta de estoque', gargalo: 'Compras' },
  { valor: 'FRETE', rotulo: 'Frete', gargalo: 'Logística' },
  { valor: 'MARCA', rotulo: 'Marca não aceita', gargalo: 'Portfólio' },
  { valor: 'APLICACAO', rotulo: 'Erro de aplicação', gargalo: 'Treinamento' },
  { valor: 'CONCORRENCIA', rotulo: 'Concorrência', gargalo: 'Comercial' },
  { valor: 'CREDITO', rotulo: 'Crédito', gargalo: 'Financeiro' },
  { valor: 'ATRASO', rotulo: 'Atraso no retorno', gargalo: 'Execução' },
  { valor: 'ERRO_INTERNO', rotulo: 'Erro interno', gargalo: 'Processo' },
  { valor: 'CLIENTE_DESISTIU', rotulo: 'Cliente desistiu', gargalo: 'Comercial' },
  { valor: 'NAO_RETORNOU', rotulo: 'Cliente não retornou', gargalo: 'Execução' },
  { valor: 'INFORMACAO_INSUFICIENTE', rotulo: 'Informação insuficiente', gargalo: 'Diagnóstico' },
  { valor: 'OUTRO', rotulo: 'Outro', gargalo: 'Indefinido' },
];

export interface LostSale {
  id: string;
  customerId: string;
  data: string;
  motivo: MotivoPerda;
  valorEstimado: number;
  familyId: string | null;
  recuperavel: boolean;
  detalhe: string;
}

// ---------------------------------------------------------------------------
// Execução e disciplina
// ---------------------------------------------------------------------------

export type StatusPromessa = 'PENDENTE' | 'CUMPRIDA' | 'QUEBRADA';

/**
 * Entidade de primeira classe, não um tipo de Task. Promessa quebrada é o dano
 * reputacional mais caro do setor. Ver docs/DATA_MODEL.md §2.
 */
export interface Promessa {
  id: string;
  customerId: string;
  descricao: string;
  dataPrometida: string;
  criadaEm: string;
  status: StatusPromessa;
}

export type StatusTarefa = 'ABERTA' | 'CONCLUIDA' | 'CANCELADA';

export interface Task {
  id: string;
  customerId: string | null;
  titulo: string;
  prazo: string;
  status: StatusTarefa;
  origemRecommendationId: string | null;
  criadaEm: string;
}

export interface DailyDebrief {
  id: string;
  data: string;
  sellerId: string;
  acoesExecutadas: number;
  contatosUteis: number;
  avancos: string;
  travas: string;
  aprendizado: string;
  prioridadeAmanha: string;
  promessasCriadas: number;
  perdasRegistradas: number;
}

// ---------------------------------------------------------------------------
// Motor — derivado, nunca semeado
// ---------------------------------------------------------------------------

/** Nível de evidência substitui percentual de confiança. Ver docs/SCORING_ENGINE.md §1.2. */
export type NivelEvidencia = 'SEM_BASE' | 'BASE_FRACA' | 'BASE_RAZOAVEL';

/** Temperatura derivada da cadência PRÓPRIA do cliente, não de dias absolutos. */
export type Temperatura = 'SEM_BASE' | 'NO_CICLO' | 'JANELA' | 'ATRASADO' | 'PERDA_PROVAVEL';

export type TipoAcao =
  | 'URGENCIA'
  | 'COMPROMISSO'
  | 'RECUPERACAO'
  | 'REPOSICAO'
  | 'REATIVACAO'
  | 'EXPANSAO'
  | 'CADASTRO';

/** Precedência do tipo sobre o score. Ver docs/SCORING_ENGINE.md §3. */
export const PRECEDENCIA_TIPO: Record<TipoAcao, number> = {
  URGENCIA: 1,
  COMPROMISSO: 2,
  RECUPERACAO: 3,
  REPOSICAO: 4,
  REATIVACAO: 5,
  EXPANSAO: 6,
  CADASTRO: 7,
};

export const ROTULO_TIPO_ACAO: Record<TipoAcao, string> = {
  URGENCIA: 'Urgência',
  COMPROMISSO: 'Compromisso',
  RECUPERACAO: 'Recuperação',
  REPOSICAO: 'Reposição',
  REATIVACAO: 'Reativação',
  EXPANSAO: 'Expansão',
  CADASTRO: 'Cadastro',
};

export type Confianca = 'ALTA' | 'MEDIA' | 'BAIXA';

/** Os nove componentes do score. Ver docs/SCORING_ENGINE.md §2. */
export interface ComponentesScore {
  recorrencia: number;
  tempoSemCompra: number;
  orcamentoAberto: number;
  potencialFrota: number;
  urgencia: number;
  aderenciaFamilia: number;
  relacionamento: number;
  margemPotencial: number;
  compromissoVencido: number;
}

export type ChaveComponente = keyof ComponentesScore;

/** Pesos calibráveis pelo gestor. Somam 100 no padrão. */
export type PesosScore = Record<ChaveComponente, number>;

export const PESOS_PADRAO: PesosScore = {
  recorrencia: 20,
  tempoSemCompra: 15,
  orcamentoAberto: 15,
  potencialFrota: 15,
  urgencia: 10,
  aderenciaFamilia: 10,
  relacionamento: 5,
  margemPotencial: 5,
  compromissoVencido: 5,
};

export const ROTULO_COMPONENTE: Record<ChaveComponente, string> = {
  recorrencia: 'Recorrência',
  tempoSemCompra: 'Momento de recompra',
  orcamentoAberto: 'Orçamento aberto',
  potencialFrota: 'Potencial de frota',
  urgencia: 'Urgência',
  aderenciaFamilia: 'Famílias não exploradas',
  relacionamento: 'Relacionamento',
  margemPotencial: 'Margem potencial',
  compromissoVencido: 'Compromisso vencido',
};

/** Perfil de cadência de um cliente. Base de quase todo o motor. */
export interface Cadencia {
  intervalos: number[];
  intervaloMedianoDias: number | null;
  coeficienteVariacao: number | null;
  evidencia: NivelEvidencia;
  ultimaCompra: string | null;
  diasDesdeUltimaCompra: number | null;
  atrasoRelativo: number | null;
  temperatura: Temperatura;
}

export interface Recommendation extends Explicavel {
  id: string;
  customerId: string;
  tipo: TipoAcao;
  /** Frase imperativa em uma linha. */
  acao: string;
  score: number;
  componentes: ComponentesScore;
  confianca: Confianca;
  valorPotencial: number;
  prazo: string;
  /** Drivers dominantes — o score nunca aparece sozinho. */
  driversDominantes: string[];
}

export type SeveridadeAlerta = 'CRITICO' | 'ATENCAO' | 'INFORMACAO';

export type TipoAlerta =
  | 'VEICULO_PARADO'
  | 'PROMESSA_VENCIDA'
  | 'ORCAMENTO_PARADO'
  | 'CLIENTE_ESFRIANDO'
  | 'PERDA_POR_ESTOQUE'
  | 'MARGEM_BAIXA'
  | 'CONTA_IMPORTANTE_SEM_CONTATO'
  | 'KIT_INCOMPLETO'
  | 'DEMANDA_REPETIDA_SEM_ESTOQUE'
  | 'QUEDA_DE_COMPORTAMENTO'
  | 'CADASTRO_CRITICO';

export const ROTULO_TIPO_ALERTA: Record<TipoAlerta, string> = {
  VEICULO_PARADO: 'Veículo parado',
  PROMESSA_VENCIDA: 'Promessa vencida',
  ORCAMENTO_PARADO: 'Orçamento parado',
  CLIENTE_ESFRIANDO: 'Cliente esfriando',
  PERDA_POR_ESTOQUE: 'Perda por estoque',
  MARGEM_BAIXA: 'Margem abaixo do piso',
  CONTA_IMPORTANTE_SEM_CONTATO: 'Conta importante sem contato',
  KIT_INCOMPLETO: 'Kit incompleto',
  DEMANDA_REPETIDA_SEM_ESTOQUE: 'Demanda repetida sem estoque',
  QUEDA_DE_COMPORTAMENTO: 'Queda de comportamento',
  CADASTRO_CRITICO: 'Cadastro crítico',
};

/**
 * Alerta ANDON. Os seis campos narrativos são obrigatórios pelo tipo:
 * alerta sem ação sugerida não pode ser construído.
 */
export interface Alert extends Explicavel {
  id: string;
  customerId: string;
  tipo: TipoAlerta;
  severidade: SeveridadeAlerta;
  oQueAconteceu: string;
  porQueImporta: string;
  impactoEstimado: number;
  acaoSugerida: string;
  responsavel: string;
  prazo: string;
  criadoEm: string;
  /** Alertas absorvidos por deduplicação de conta. Ver docs/SCORING_ENGINE.md §6.2. */
  contextoAdicional: string[];
}

export interface RadarSignal extends Explicavel {
  customerId: string;
  familyId: string | null;
  janelaInicio: string | null;
  janelaFim: string | null;
  evidencia: NivelEvidencia;
  intervalosObservados: number;
  intervaloMedianoDias: number | null;
}

export type MotivoRejeicao =
  | 'NAO_E_MEU_CLIENTE'
  | 'JA_RESOLVIDO'
  | 'MOMENTO_ERRADO'
  | 'INFORMACAO_ERRADA'
  | 'OUTRO';

export const MOTIVOS_REJEICAO: { valor: MotivoRejeicao; rotulo: string; efeito: string }[] = [
  { valor: 'NAO_E_MEU_CLIENTE', rotulo: 'Não é meu cliente', efeito: 'Suprime por 30 dias' },
  { valor: 'JA_RESOLVIDO', rotulo: 'Já resolvi isso', efeito: 'Suprime por 30 dias' },
  { valor: 'MOMENTO_ERRADO', rotulo: 'Momento errado', efeito: 'Adia por 7 dias' },
  { valor: 'INFORMACAO_ERRADA', rotulo: 'Informação errada', efeito: 'Registra para revisão' },
  { valor: 'OUTRO', rotulo: 'Outro motivo', efeito: 'Registra para revisão' },
];

export interface RecommendationFeedback {
  id: string;
  customerId: string;
  tipo: TipoAcao;
  aceita: boolean;
  motivo: MotivoRejeicao | null;
  comentario: string;
  data: string;
}

export interface AlertAck {
  id: string;
  alertKey: string;
  customerId: string;
  motivo: string;
  data: string;
}

// ---------------------------------------------------------------------------
// Conhecimento
// ---------------------------------------------------------------------------

export interface Playbook {
  id: string;
  titulo: string;
  contexto: string;
  passos: string[];
  /** Conteúdo validado e conteúdo de demonstração nunca aparecem misturados na UI. */
  validado: boolean;
  tags: string[];
}

export type CategoriaConhecimento =
  | 'FAMILIA'
  | 'SISTEMA'
  | 'DIAGNOSTICO'
  | 'OBJECAO'
  | 'SCRIPT'
  | 'BOA_PRATICA'
  | 'GLOSSARIO'
  | 'PROCEDIMENTO';

export interface KnowledgeArticle {
  id: string;
  titulo: string;
  categoria: CategoriaConhecimento;
  conteudo: string;
  validado: boolean;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Governança
// ---------------------------------------------------------------------------

export interface ImportError {
  linha: number;
  campo: string;
  motivo: string;
}

export interface ImportJob {
  id: string;
  data: string;
  entidade: string;
  linhasLidas: number;
  linhasAceitas: number;
  erros: ImportError[];
  consentimento: boolean;
}

export type TipoAuditoria =
  | 'IMPORTACAO'
  | 'EXPORTACAO'
  | 'LIMPEZA'
  | 'SEED'
  | 'CALIBRACAO'
  | 'FEEDBACK';

export interface AuditEvent {
  id: string;
  data: string;
  tipo: TipoAuditoria;
  descricao: string;
  entidade: string | null;
  entidadeId: string | null;
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

export interface Settings {
  id: 'settings';
  pesos: PesosScore;
  /** Piso de margem que dispara alerta ANDON, em pontos percentuais. */
  pisoMargemPercentual: number;
  metaExecucaoDiaria: number;
  /** Dias em que um alerta reconhecido não retorna pela mesma causa. */
  janelaSilencioDias: number;
  sellerAtivoId: string;
  /** Enquadramento da foto de autoria. Ver docs/DESIGN_SYSTEM.md §7. */
  objectPositionRetrato: string;
}

export const SETTINGS_PADRAO: Settings = {
  id: 'settings',
  pesos: PESOS_PADRAO,
  pisoMargemPercentual: 12,
  metaExecucaoDiaria: 8,
  janelaSilencioDias: 7,
  sellerAtivoId: 'vnd-001',
  objectPositionRetrato: 'center 30%',
};

/** Snapshot completo da base. Usado por seed, export e restauração. */
export interface Dataset {
  users: User[];
  sellers: Seller[];
  customers: Customer[];
  contacts: Contact[];
  fleets: Fleet[];
  vehicles: Vehicle[];
  productFamilies: ProductFamily[];
  products: Product[];
  productRelations: ProductRelation[];
  vehicleApplications: VehicleApplication[];
  interactions: Interaction[];
  quotes: Quote[];
  quoteItems: QuoteItem[];
  sales: Sale[];
  saleItems: SaleItem[];
  lostSales: LostSale[];
  promessas: Promessa[];
  tasks: Task[];
  debriefs: DailyDebrief[];
  playbooks: Playbook[];
  knowledgeArticles: KnowledgeArticle[];
  recommendationFeedback: RecommendationFeedback[];
  alertAcks: AlertAck[];
  importJobs: ImportJob[];
  auditEvents: AuditEvent[];
}

export function datasetVazio(): Dataset {
  return {
    users: [],
    sellers: [],
    customers: [],
    contacts: [],
    fleets: [],
    vehicles: [],
    productFamilies: [],
    products: [],
    productRelations: [],
    vehicleApplications: [],
    interactions: [],
    quotes: [],
    quoteItems: [],
    sales: [],
    saleItems: [],
    lostSales: [],
    promessas: [],
    tasks: [],
    debriefs: [],
    playbooks: [],
    knowledgeArticles: [],
    recommendationFeedback: [],
    alertAcks: [],
    importJobs: [],
    auditEvents: [],
  };
}
