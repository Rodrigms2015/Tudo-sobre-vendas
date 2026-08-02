/**
 * Persistência local em IndexedDB.
 *
 * Por que IndexedDB e não localStorage: o seed já passa de 500 registros e carteiras reais
 * passam de 50 mil. localStorage é síncrono (trava a UI) e limitado a ~5 MB.
 *
 * Por que `idb` (~1 kB) e não a API nativa crua: a API baseada em eventos produz código
 * de transação propenso a erro. `idb` é a menor camada possível sobre ela.
 *
 * Nada aqui envia dados para lugar nenhum. Ver docs/SECURITY.md.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Dataset, Settings } from '../domain/types';
import { SETTINGS_PADRAO, datasetVazio } from '../domain/types';

export const NOME_BANCO = 'bruto-os';
export const VERSAO_BANCO = 1;

/** Um object store por entidade. As chaves são as mesmas do tipo `Dataset`. */
export const STORES = [
  'users',
  'sellers',
  'customers',
  'contacts',
  'fleets',
  'vehicles',
  'productFamilies',
  'products',
  'productRelations',
  'vehicleApplications',
  'interactions',
  'quotes',
  'quoteItems',
  'sales',
  'saleItems',
  'lostSales',
  'promessas',
  'tasks',
  'debriefs',
  'playbooks',
  'knowledgeArticles',
  'recommendationFeedback',
  'alertAcks',
  'importJobs',
  'auditEvents',
] as const;

export type NomeStore = (typeof STORES)[number];

const STORE_CONFIG = 'config';

/** Índices por store. `customerId`, `sellerId`, `data` e `familyId` são as chaves do motor. */
const INDICES: Partial<Record<NomeStore, string[]>> = {
  customers: ['sellerId'],
  contacts: ['customerId'],
  fleets: ['customerId'],
  vehicles: ['fleetId'],
  products: ['familyId'],
  interactions: ['customerId', 'data'],
  quotes: ['customerId', 'data'],
  quoteItems: ['quoteId'],
  sales: ['customerId', 'data'],
  saleItems: ['saleId', 'familyId'],
  lostSales: ['customerId', 'data'],
  promessas: ['customerId'],
  tasks: ['customerId'],
  recommendationFeedback: ['customerId'],
  alertAcks: ['customerId'],
};

let instancia: Promise<IDBPDatabase> | null = null;

export function abrirBanco(): Promise<IDBPDatabase> {
  if (!instancia) {
    instancia = openDB(NOME_BANCO, VERSAO_BANCO, {
      upgrade(db) {
        for (const store of STORES) {
          if (db.objectStoreNames.contains(store)) continue;
          const os = db.createObjectStore(store, { keyPath: 'id' });
          for (const indice of INDICES[store] ?? []) {
            os.createIndex(indice, indice);
          }
        }
        if (!db.objectStoreNames.contains(STORE_CONFIG)) {
          db.createObjectStore(STORE_CONFIG, { keyPath: 'id' });
        }
      },
    });
  }
  return instancia;
}

/** Usado pelos testes para isolar o estado entre casos. */
export function resetarInstancia(): void {
  instancia = null;
}

export async function carregarDataset(): Promise<Dataset> {
  const db = await abrirBanco();
  const dados = datasetVazio();
  const tx = db.transaction(STORES as unknown as string[], 'readonly');
  await Promise.all(
    STORES.map(async (store) => {
      const registros = await tx.objectStore(store).getAll();
      // A chave do store é idêntica à chave do Dataset por construção.
      (dados as unknown as Record<string, unknown[]>)[store] = registros;
    }),
  );
  await tx.done;
  return dados;
}

export async function salvarDataset(dados: Dataset): Promise<void> {
  const db = await abrirBanco();
  const tx = db.transaction(STORES as unknown as string[], 'readwrite');
  await Promise.all(
    STORES.map(async (store) => {
      const os = tx.objectStore(store);
      await os.clear();
      const registros = (dados as unknown as Record<string, unknown[]>)[store] ?? [];
      for (const registro of registros) {
        await os.put(registro);
      }
    }),
  );
  await tx.done;
}

/** Acrescenta registros sem apagar os existentes. Usado pela importação parcial. */
export async function acrescentarRegistros(
  store: NomeStore,
  registros: unknown[],
): Promise<void> {
  if (registros.length === 0) return;
  const db = await abrirBanco();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const registro of registros) {
    await os.put(registro);
  }
  await tx.done;
}

export async function carregarConfiguracoes(): Promise<Settings> {
  const db = await abrirBanco();
  const salvo = (await db.get(STORE_CONFIG, 'settings')) as Settings | undefined;
  // Mescla com o padrão para que novas chaves de configuração não quebrem bases antigas.
  return salvo ? { ...SETTINGS_PADRAO, ...salvo } : SETTINGS_PADRAO;
}

export async function salvarConfiguracoes(settings: Settings): Promise<void> {
  const db = await abrirBanco();
  await db.put(STORE_CONFIG, settings);
}

/** Remove apenas os registros marcados como demonstração, preservando dados importados. */
export async function limparDemonstracao(dados: Dataset): Promise<Dataset> {
  const idsDemo = new Set(
    dados.customers.filter((c) => c.origem === 'DEMONSTRACAO').map((c) => c.id),
  );

  const filtrarPorCliente = <T extends { customerId: string }>(itens: T[]) =>
    itens.filter((i) => !idsDemo.has(i.customerId));

  const clientesRestantes = dados.customers.filter((c) => c.origem !== 'DEMONSTRACAO');
  const frotasRemovidas = new Set(
    dados.fleets.filter((f) => idsDemo.has(f.customerId)).map((f) => f.id),
  );
  const vendasRemovidas = new Set(
    dados.sales.filter((s) => idsDemo.has(s.customerId)).map((s) => s.id),
  );
  const orcamentosRemovidos = new Set(
    dados.quotes.filter((q) => idsDemo.has(q.customerId)).map((q) => q.id),
  );

  const limpo: Dataset = {
    ...dados,
    customers: clientesRestantes,
    contacts: filtrarPorCliente(dados.contacts),
    fleets: filtrarPorCliente(dados.fleets),
    vehicles: dados.vehicles.filter((v) => !frotasRemovidas.has(v.fleetId)),
    interactions: filtrarPorCliente(dados.interactions),
    quotes: filtrarPorCliente(dados.quotes),
    quoteItems: dados.quoteItems.filter((i) => !orcamentosRemovidos.has(i.quoteId)),
    sales: filtrarPorCliente(dados.sales),
    saleItems: dados.saleItems.filter((i) => !vendasRemovidas.has(i.saleId)),
    lostSales: filtrarPorCliente(dados.lostSales),
    promessas: filtrarPorCliente(dados.promessas),
    tasks: dados.tasks.filter((t) => t.customerId === null || !idsDemo.has(t.customerId)),
    recommendationFeedback: filtrarPorCliente(dados.recommendationFeedback),
    alertAcks: filtrarPorCliente(dados.alertAcks),
  };

  await salvarDataset(limpo);
  return limpo;
}

/** Destrói o banco inteiro. Irreversível — a UI exige digitação de confirmação. */
export async function apagarBanco(): Promise<void> {
  const db = await abrirBanco();
  db.close();
  instancia = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(NOME_BANCO);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
