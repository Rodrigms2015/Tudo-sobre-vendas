/**
 * Exportação — CSV por entidade e JSON completo restaurável.
 *
 * Toda saída CSV passa por `sanitizeCsvCell` (em `paraCsv`), que neutraliza injeção
 * de fórmula. Ver docs/SECURITY.md §3.
 */

import type { Dataset } from '../domain/types';
import { paraCsv } from './csv';

export const VERSAO_EXPORTACAO = 1;

export interface BackupJson {
  produto: 'BRUTO OS';
  versao: number;
  exportadoEm: string;
  dados: Dataset;
}

export function montarBackup(dados: Dataset): BackupJson {
  return {
    produto: 'BRUTO OS',
    versao: VERSAO_EXPORTACAO,
    exportadoEm: new Date().toISOString(),
    dados,
  };
}

export function serializarBackup(dados: Dataset): string {
  return JSON.stringify(montarBackup(dados), null, 2);
}

export interface ResultadoRestauracao {
  ok: boolean;
  dados: Dataset | null;
  erro: string | null;
}

/** Restaura um backup validando estrutura antes de aceitar. */
export function lerBackup(texto: string): ResultadoRestauracao {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, dados: null, erro: 'O arquivo não é um JSON válido.' };
  }

  if (typeof bruto !== 'object' || bruto === null) {
    return { ok: false, dados: null, erro: 'Estrutura de backup não reconhecida.' };
  }
  const backup = bruto as Partial<BackupJson>;
  if (backup.produto !== 'BRUTO OS') {
    return { ok: false, dados: null, erro: 'Este backup não foi gerado pelo BRUTO OS.' };
  }
  if (typeof backup.versao !== 'number' || backup.versao > VERSAO_EXPORTACAO) {
    return {
      ok: false,
      dados: null,
      erro: `Backup na versão ${backup.versao}, incompatível com esta versão (${VERSAO_EXPORTACAO}).`,
    };
  }
  if (typeof backup.dados !== 'object' || backup.dados === null) {
    return { ok: false, dados: null, erro: 'O backup não contém dados.' };
  }
  if (!Array.isArray((backup.dados as Dataset).customers)) {
    return { ok: false, dados: null, erro: 'O backup não contém a lista de clientes.' };
  }

  return { ok: true, dados: backup.dados as Dataset, erro: null };
}

/** Nomes de entidade exportáveis em CSV, com rótulo para a UI. */
export const ENTIDADES_EXPORTAVEIS: { chave: keyof Dataset; rotulo: string }[] = [
  { chave: 'customers', rotulo: 'Clientes' },
  { chave: 'contacts', rotulo: 'Contatos' },
  { chave: 'fleets', rotulo: 'Frotas' },
  { chave: 'vehicles', rotulo: 'Veículos' },
  { chave: 'productFamilies', rotulo: 'Famílias' },
  { chave: 'products', rotulo: 'Produtos' },
  { chave: 'sales', rotulo: 'Vendas' },
  { chave: 'saleItems', rotulo: 'Itens de venda' },
  { chave: 'quotes', rotulo: 'Orçamentos' },
  { chave: 'quoteItems', rotulo: 'Itens de orçamento' },
  { chave: 'interactions', rotulo: 'Interações' },
  { chave: 'lostSales', rotulo: 'Vendas perdidas' },
  { chave: 'promessas', rotulo: 'Promessas' },
  { chave: 'tasks', rotulo: 'Tarefas' },
  { chave: 'debriefs', rotulo: 'Debriefings' },
  { chave: 'recommendationFeedback', rotulo: 'Feedback de recomendações' },
  { chave: 'auditEvents', rotulo: 'Trilha de auditoria' },
];

export function exportarEntidadeCsv(dados: Dataset, chave: keyof Dataset): string {
  const registros = dados[chave] as unknown[];
  return paraCsv(registros as Record<string, unknown>[]);
}

/** CSV de erros de importação, para correção no ERP. */
export function exportarErrosCsv(erros: { linha: number; campo: string; motivo: string }[]): string {
  return paraCsv(erros as unknown as Record<string, unknown>[], ['linha', 'campo', 'motivo']);
}
