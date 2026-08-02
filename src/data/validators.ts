/**
 * Validação de importação.
 *
 * Princípio central: IMPORTAÇÃO PARCIAL. Linhas válidas entram; inválidas são reportadas
 * com número de linha e motivo legível, exportáveis em CSV para correção no ERP.
 *
 * Rejeitar o arquivo inteiro por causa de uma linha ruim é o comportamento que faz o
 * usuário desistir da importação — e sem importação o produto não serve para nada.
 *
 * Ver docs/SECURITY.md §4.
 */

import type {
  Contact,
  Customer,
  Dataset,
  Fleet,
  ImportError,
  Interaction,
  LostSale,
  MotivoPerda,
  Quote,
  Sale,
  Segmento,
  TipoCliente,
} from '../domain/types';
import { MOTIVOS_PERDA } from '../domain/types';
import type { LinhaCsv } from './csv';

export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;
export const MAXIMO_LINHAS = 50_000;
export const MAXIMO_CARACTERES_CAMPO = 500;
export const MAXIMO_CARACTERES_OBSERVACAO = 2_000;

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_ID = /^[A-Za-z0-9._-]{1,40}$/;

const SEGMENTOS_VALIDOS: Segmento[] = [
  'CARGA_RODOVIARIA',
  'PASSAGEIROS_URBANO',
  'PASSAGEIROS_RODOVIARIO',
  'CONSTRUCAO',
  'AGRONEGOCIO',
  'DISTRIBUICAO_URBANA',
];

const TIPOS_VALIDOS: TipoCliente[] = [
  'FROTISTA',
  'TRANSPORTADORA',
  'OFICINA',
  'REVENDA',
  'VIACAO',
  'COOPERATIVA',
];

/**
 * Remove caracteres de controle e trunca. Não altera o significado do dado.
 *
 * A neutralização de fórmula acontece na EXPORTAÇÃO (`sanitizeCsvCell`), não aqui:
 * um campo de observação que legitimamente comece com "-" deve ser preservado na base.
 */
export function sanearTexto(valor: string, maximo = MAXIMO_CARACTERES_CAMPO): string {
  // eslint-disable-next-line no-control-regex
  return valor.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maximo);
}

function numeroOuNulo(valor: string): number | null {
  if (valor === '') return null;
  const n = Number(valor.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export interface ResultadoValidacao<T> {
  aceitos: T[];
  erros: ImportError[];
}

export type EntidadeImportavel =
  | 'customers'
  | 'contacts'
  | 'fleets'
  | 'sales'
  | 'quotes'
  | 'interactions'
  | 'lostSales';

export const COLUNAS_MODELO: Record<EntidadeImportavel, string[]> = {
  customers: [
    'id',
    'nomeFantasia',
    'cidade',
    'uf',
    'segmento',
    'tipoCliente',
    'sellerId',
    'potencial',
    'observacoes',
  ],
  contacts: ['id', 'customerId', 'nome', 'cargo', 'canalPreferido', 'telefoneMascarado'],
  fleets: ['id', 'customerId', 'totalVeiculos', 'perfilOperacao', 'idadeMediaAnos'],
  sales: ['id', 'customerId', 'data', 'valorTotal', 'margemPercentual'],
  quotes: ['id', 'customerId', 'data', 'status', 'valorTotal', 'validadeDias'],
  interactions: ['id', 'customerId', 'tipo', 'data', 'util', 'urgente', 'resumo'],
  lostSales: ['id', 'customerId', 'data', 'motivo', 'valorEstimado', 'familyId', 'recuperavel', 'detalhe'],
};

export const ROTULO_ENTIDADE: Record<EntidadeImportavel, string> = {
  customers: 'Clientes',
  contacts: 'Contatos',
  fleets: 'Frotas',
  sales: 'Vendas',
  quotes: 'Orçamentos',
  interactions: 'Interações',
  lostSales: 'Vendas perdidas',
};

interface ContextoValidacao {
  idsClientes: Set<string>;
  idsFamilias: Set<string>;
  idsVendedores: Set<string>;
}

export function contextoDe(dados: Dataset): ContextoValidacao {
  return {
    idsClientes: new Set(dados.customers.map((c) => c.id)),
    idsFamilias: new Set(dados.productFamilies.map((f) => f.id)),
    idsVendedores: new Set(dados.sellers.map((s) => s.id)),
  };
}

/** Validador genérico: aplica a função por linha e acumula erros com número de linha. */
function validarLinhas<T>(
  linhas: LinhaCsv[],
  validar: (valores: Record<string, string>) => T | ImportError[],
): ResultadoValidacao<T> {
  const aceitos: T[] = [];
  const erros: ImportError[] = [];

  for (const linha of linhas) {
    const resultado = validar(linha.valores);
    if (Array.isArray(resultado)) {
      for (const erro of resultado) erros.push({ ...erro, linha: linha.numero });
    } else {
      aceitos.push(resultado);
    }
  }

  return { aceitos, erros };
}

export function validarClientes(
  linhas: LinhaCsv[],
  ctx: ContextoValidacao,
): ResultadoValidacao<Customer> {
  return validarLinhas<Customer>(linhas, (v) => {
    const erros: ImportError[] = [];
    const id = sanearTexto(v.id ?? '', 40);
    if (!RE_ID.test(id)) {
      erros.push({ linha: 0, campo: 'id', motivo: 'Identificador ausente ou com caracteres inválidos.' });
    }
    const nomeFantasia = sanearTexto(v.nomeFantasia ?? '');
    if (nomeFantasia.length === 0) {
      erros.push({ linha: 0, campo: 'nomeFantasia', motivo: 'Nome fantasia é obrigatório.' });
    }
    const uf = sanearTexto(v.uf ?? '', 2).toUpperCase();
    if (uf.length !== 2) {
      erros.push({ linha: 0, campo: 'uf', motivo: 'UF deve ter exatamente 2 letras.' });
    }
    const segmento = sanearTexto(v.segmento ?? '', 40).toUpperCase() as Segmento;
    if (!SEGMENTOS_VALIDOS.includes(segmento)) {
      erros.push({
        linha: 0,
        campo: 'segmento',
        motivo: `Segmento inválido. Aceitos: ${SEGMENTOS_VALIDOS.join(', ')}.`,
      });
    }
    const tipoCliente = sanearTexto(v.tipoCliente ?? '', 40).toUpperCase() as TipoCliente;
    if (!TIPOS_VALIDOS.includes(tipoCliente)) {
      erros.push({
        linha: 0,
        campo: 'tipoCliente',
        motivo: `Tipo inválido. Aceitos: ${TIPOS_VALIDOS.join(', ')}.`,
      });
    }
    const sellerId = sanearTexto(v.sellerId ?? '', 40);
    if (sellerId.length > 0 && ctx.idsVendedores.size > 0 && !ctx.idsVendedores.has(sellerId)) {
      erros.push({ linha: 0, campo: 'sellerId', motivo: `Vendedor "${sellerId}" não existe na base.` });
    }
    const potencial = numeroOuNulo(v.potencial ?? '');
    if (potencial !== null && (potencial < 1 || potencial > 5)) {
      erros.push({ linha: 0, campo: 'potencial', motivo: 'Potencial deve estar entre 1 e 5.' });
    }

    if (erros.length > 0) return erros;

    return {
      id,
      nomeFantasia,
      cidade: sanearTexto(v.cidade ?? ''),
      uf,
      segmento,
      tipoCliente,
      sellerId,
      potencial,
      criadoEm: new Date().toISOString().slice(0, 10),
      observacoes: sanearTexto(v.observacoes ?? '', MAXIMO_CARACTERES_OBSERVACAO),
      origem: 'IMPORTADO' as const,
    };
  });
}

export function validarContatos(
  linhas: LinhaCsv[],
  ctx: ContextoValidacao,
): ResultadoValidacao<Contact> {
  return validarLinhas<Contact>(linhas, (v) => {
    const erros: ImportError[] = [];
    const id = sanearTexto(v.id ?? '', 40);
    if (!RE_ID.test(id)) erros.push({ linha: 0, campo: 'id', motivo: 'Identificador inválido.' });
    const customerId = sanearTexto(v.customerId ?? '', 40);
    if (!ctx.idsClientes.has(customerId)) {
      erros.push({ linha: 0, campo: 'customerId', motivo: `Cliente "${customerId}" não existe na base.` });
    }
    const nome = sanearTexto(v.nome ?? '');
    if (nome.length === 0) erros.push({ linha: 0, campo: 'nome', motivo: 'Nome é obrigatório.' });
    if (erros.length > 0) return erros;

    const canal = sanearTexto(v.canalPreferido ?? 'TELEFONE', 20).toUpperCase();
    return {
      id,
      customerId,
      nome,
      cargo: sanearTexto(v.cargo ?? ''),
      canalPreferido: (['TELEFONE', 'WHATSAPP', 'EMAIL', 'PRESENCIAL'].includes(canal)
        ? canal
        : 'TELEFONE') as Contact['canalPreferido'],
      telefoneMascarado: sanearTexto(v.telefoneMascarado ?? '', 30),
    };
  });
}

export function validarFrotas(linhas: LinhaCsv[], ctx: ContextoValidacao): ResultadoValidacao<Fleet> {
  return validarLinhas<Fleet>(linhas, (v) => {
    const erros: ImportError[] = [];
    const id = sanearTexto(v.id ?? '', 40);
    if (!RE_ID.test(id)) erros.push({ linha: 0, campo: 'id', motivo: 'Identificador inválido.' });
    const customerId = sanearTexto(v.customerId ?? '', 40);
    if (!ctx.idsClientes.has(customerId)) {
      erros.push({ linha: 0, campo: 'customerId', motivo: `Cliente "${customerId}" não existe na base.` });
    }
    const totalVeiculos = numeroOuNulo(v.totalVeiculos ?? '');
    if (totalVeiculos !== null && (totalVeiculos < 0 || totalVeiculos > 100_000)) {
      erros.push({ linha: 0, campo: 'totalVeiculos', motivo: 'Total de veículos fora de faixa plausível.' });
    }
    if (erros.length > 0) return erros;

    const perfil = sanearTexto(v.perfilOperacao ?? '', 20).toUpperCase();
    return {
      id,
      customerId,
      totalVeiculos,
      perfilOperacao: (['RODOVIARIO', 'URBANO', 'MISTO'].includes(perfil)
        ? perfil
        : null) as Fleet['perfilOperacao'],
      idadeMediaAnos: numeroOuNulo(v.idadeMediaAnos ?? ''),
      // Dado importado do ERP é confirmado; a ausência continua sendo ausência.
      procedencia: totalVeiculos === null ? 'AUSENTE' : 'CONFIRMADO',
    };
  });
}

export function validarVendas(linhas: LinhaCsv[], ctx: ContextoValidacao): ResultadoValidacao<Sale> {
  return validarLinhas<Sale>(linhas, (v) => {
    const erros: ImportError[] = [];
    const id = sanearTexto(v.id ?? '', 40);
    if (!RE_ID.test(id)) erros.push({ linha: 0, campo: 'id', motivo: 'Identificador inválido.' });
    const customerId = sanearTexto(v.customerId ?? '', 40);
    if (!ctx.idsClientes.has(customerId)) {
      erros.push({ linha: 0, campo: 'customerId', motivo: `Cliente "${customerId}" não existe na base.` });
    }
    const data = sanearTexto(v.data ?? '', 10);
    if (!RE_DATA.test(data)) {
      erros.push({ linha: 0, campo: 'data', motivo: 'Data deve estar no formato AAAA-MM-DD.' });
    }
    const valorTotal = numeroOuNulo(v.valorTotal ?? '');
    if (valorTotal === null || valorTotal < 0) {
      erros.push({ linha: 0, campo: 'valorTotal', motivo: 'Valor total ausente ou negativo.' });
    }
    const margem = numeroOuNulo(v.margemPercentual ?? '');
    if (margem !== null && (margem < -100 || margem > 100)) {
      erros.push({ linha: 0, campo: 'margemPercentual', motivo: 'Margem fora da faixa -100 a 100.' });
    }
    if (erros.length > 0) return erros;

    return {
      id,
      customerId,
      data,
      valorTotal: valorTotal as number,
      margemPercentual: margem,
      quoteId: null,
    };
  });
}

export function validarOrcamentos(
  linhas: LinhaCsv[],
  ctx: ContextoValidacao,
): ResultadoValidacao<Quote> {
  return validarLinhas<Quote>(linhas, (v) => {
    const erros: ImportError[] = [];
    const id = sanearTexto(v.id ?? '', 40);
    if (!RE_ID.test(id)) erros.push({ linha: 0, campo: 'id', motivo: 'Identificador inválido.' });
    const customerId = sanearTexto(v.customerId ?? '', 40);
    if (!ctx.idsClientes.has(customerId)) {
      erros.push({ linha: 0, campo: 'customerId', motivo: `Cliente "${customerId}" não existe na base.` });
    }
    const data = sanearTexto(v.data ?? '', 10);
    if (!RE_DATA.test(data)) {
      erros.push({ linha: 0, campo: 'data', motivo: 'Data deve estar no formato AAAA-MM-DD.' });
    }
    const status = sanearTexto(v.status ?? '', 20).toUpperCase();
    if (!['ABERTO', 'GANHO', 'PERDIDO', 'EXPIRADO'].includes(status)) {
      erros.push({
        linha: 0,
        campo: 'status',
        motivo: 'Status deve ser ABERTO, GANHO, PERDIDO ou EXPIRADO.',
      });
    }
    const valorTotal = numeroOuNulo(v.valorTotal ?? '');
    if (valorTotal === null || valorTotal < 0) {
      erros.push({ linha: 0, campo: 'valorTotal', motivo: 'Valor total ausente ou negativo.' });
    }
    if (erros.length > 0) return erros;

    return {
      id,
      customerId,
      data,
      status: status as Quote['status'],
      valorTotal: valorTotal as number,
      validadeDias: numeroOuNulo(v.validadeDias ?? '') ?? 15,
    };
  });
}

export function validarInteracoes(
  linhas: LinhaCsv[],
  ctx: ContextoValidacao,
): ResultadoValidacao<Interaction> {
  return validarLinhas<Interaction>(linhas, (v) => {
    const erros: ImportError[] = [];
    const id = sanearTexto(v.id ?? '', 40);
    if (!RE_ID.test(id)) erros.push({ linha: 0, campo: 'id', motivo: 'Identificador inválido.' });
    const customerId = sanearTexto(v.customerId ?? '', 40);
    if (!ctx.idsClientes.has(customerId)) {
      erros.push({ linha: 0, campo: 'customerId', motivo: `Cliente "${customerId}" não existe na base.` });
    }
    const data = sanearTexto(v.data ?? '', 10);
    if (!RE_DATA.test(data)) {
      erros.push({ linha: 0, campo: 'data', motivo: 'Data deve estar no formato AAAA-MM-DD.' });
    }
    const tipo = sanearTexto(v.tipo ?? '', 20).toUpperCase();
    if (!['LIGACAO', 'VISITA', 'WHATSAPP', 'EMAIL'].includes(tipo)) {
      erros.push({ linha: 0, campo: 'tipo', motivo: 'Tipo deve ser LIGACAO, VISITA, WHATSAPP ou EMAIL.' });
    }
    if (erros.length > 0) return erros;

    const verdadeiro = (s: string) => ['1', 'true', 'sim', 'verdadeiro'].includes(s.toLowerCase());
    return {
      id,
      customerId,
      tipo: tipo as Interaction['tipo'],
      data,
      util: verdadeiro(v.util ?? ''),
      urgente: verdadeiro(v.urgente ?? ''),
      resumo: sanearTexto(v.resumo ?? '', MAXIMO_CARACTERES_OBSERVACAO),
    };
  });
}

export function validarPerdas(linhas: LinhaCsv[], ctx: ContextoValidacao): ResultadoValidacao<LostSale> {
  const motivosValidos = new Set(MOTIVOS_PERDA.map((m) => m.valor));
  return validarLinhas<LostSale>(linhas, (v) => {
    const erros: ImportError[] = [];
    const id = sanearTexto(v.id ?? '', 40);
    if (!RE_ID.test(id)) erros.push({ linha: 0, campo: 'id', motivo: 'Identificador inválido.' });
    const customerId = sanearTexto(v.customerId ?? '', 40);
    if (!ctx.idsClientes.has(customerId)) {
      erros.push({ linha: 0, campo: 'customerId', motivo: `Cliente "${customerId}" não existe na base.` });
    }
    const data = sanearTexto(v.data ?? '', 10);
    if (!RE_DATA.test(data)) {
      erros.push({ linha: 0, campo: 'data', motivo: 'Data deve estar no formato AAAA-MM-DD.' });
    }
    const motivo = sanearTexto(v.motivo ?? '', 40).toUpperCase() as MotivoPerda;
    if (!motivosValidos.has(motivo)) {
      erros.push({
        linha: 0,
        campo: 'motivo',
        motivo: `Motivo inválido. Aceitos: ${[...motivosValidos].join(', ')}.`,
      });
    }
    const valorEstimado = numeroOuNulo(v.valorEstimado ?? '');
    if (valorEstimado === null || valorEstimado < 0) {
      erros.push({ linha: 0, campo: 'valorEstimado', motivo: 'Valor estimado ausente ou negativo.' });
    }
    const familyId = sanearTexto(v.familyId ?? '', 40);
    if (familyId.length > 0 && !ctx.idsFamilias.has(familyId)) {
      erros.push({ linha: 0, campo: 'familyId', motivo: `Família "${familyId}" não existe na base.` });
    }
    if (erros.length > 0) return erros;

    const verdadeiro = (s: string) => ['1', 'true', 'sim', 'verdadeiro'].includes(s.toLowerCase());
    return {
      id,
      customerId,
      data,
      motivo,
      valorEstimado: valorEstimado as number,
      familyId: familyId.length > 0 ? familyId : null,
      recuperavel: verdadeiro(v.recuperavel ?? ''),
      detalhe: sanearTexto(v.detalhe ?? '', MAXIMO_CARACTERES_OBSERVACAO),
    };
  });
}

export type ResultadoImportacao =
  | { entidade: 'customers'; resultado: ResultadoValidacao<Customer> }
  | { entidade: 'contacts'; resultado: ResultadoValidacao<Contact> }
  | { entidade: 'fleets'; resultado: ResultadoValidacao<Fleet> }
  | { entidade: 'sales'; resultado: ResultadoValidacao<Sale> }
  | { entidade: 'quotes'; resultado: ResultadoValidacao<Quote> }
  | { entidade: 'interactions'; resultado: ResultadoValidacao<Interaction> }
  | { entidade: 'lostSales'; resultado: ResultadoValidacao<LostSale> };

export function validarEntidade(
  entidade: EntidadeImportavel,
  linhas: LinhaCsv[],
  ctx: ContextoValidacao,
): ResultadoImportacao {
  switch (entidade) {
    case 'customers':
      return { entidade, resultado: validarClientes(linhas, ctx) };
    case 'contacts':
      return { entidade, resultado: validarContatos(linhas, ctx) };
    case 'fleets':
      return { entidade, resultado: validarFrotas(linhas, ctx) };
    case 'sales':
      return { entidade, resultado: validarVendas(linhas, ctx) };
    case 'quotes':
      return { entidade, resultado: validarOrcamentos(linhas, ctx) };
    case 'interactions':
      return { entidade, resultado: validarInteracoes(linhas, ctx) };
    case 'lostSales':
      return { entidade, resultado: validarPerdas(linhas, ctx) };
  }
}

export function validarArquivo(arquivo: File): string | null {
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return `Arquivo com ${(arquivo.size / 1024 / 1024).toFixed(1)} MB excede o limite de 10 MB.`;
  }
  const nome = arquivo.name.toLowerCase();
  if (!nome.endsWith('.csv')) {
    return 'Apenas arquivos .csv são aceitos.';
  }
  return null;
}
