/**
 * Grafo de oportunidade — nível SISTEMA → FAMÍLIA → FAMÍLIA CORRELATA.
 *
 * Restrição estrutural, não apenas um aviso na tela: este módulo é incapaz de
 * descer a produto, código de peça, marca ou modelo de veículo. Os tipos não
 * permitem. Ver docs/CRITICAL_REVIEW.md §1.4.
 *
 * O que ele afirma é CORRELAÇÃO COMERCIAL DE CESTA ("quem compra kit de embreagem
 * costuma precisar de rolamento"), que é conhecimento de venda. O que ele NÃO afirma
 * é aplicação técnica, que é conhecimento de catálogo e exige fonte validada.
 *
 * Cada nó gera PERGUNTAS para o vendedor fazer, não itens para o vendedor vender.
 */

import type {
  Dataset,
  ProductFamily,
  ProductRelation,
  Procedencia,
  SistemaVeicular,
} from '../types';

export interface NoGrafo {
  familyId: string;
  nome: string;
  sistema: SistemaVeicular;
  /** Se o cliente já compra esta família. */
  jaCompra: boolean;
}

export interface ArestaGrafo {
  origemFamilyId: string;
  destinoFamilyId: string;
  tipo: ProductRelation['tipo'];
  suporte: number;
  procedencia: Procedencia;
  perguntaSugerida: string;
  /** Nº de pedidos que sustentam a aresta quando calculada do histórico. */
  pedidosObservados: number | null;
}

export interface GrafoOportunidade {
  sistema: SistemaVeicular;
  nos: NoGrafo[];
  arestas: ArestaGrafo[];
}

export const ROTULO_SISTEMA: Record<SistemaVeicular, string> = {
  EMBREAGEM: 'Embreagem',
  FREIO: 'Freio',
  ARREFECIMENTO: 'Arrefecimento',
  SUSPENSAO: 'Suspensão',
  INJECAO: 'Injeção',
  TRANSMISSAO: 'Transmissão',
  ELETRICO: 'Elétrico',
  MOTOR: 'Motor',
  DIRECAO: 'Direção',
  FILTRACAO: 'Filtração',
};

export const ROTULO_TIPO_RELACAO: Record<ProductRelation['tipo'], string> = {
  KIT: 'Compõe kit',
  CORRELATO: 'Costuma acompanhar',
  INSTALACAO: 'Item de instalação',
};

/**
 * Calcula correlação de cesta a partir do histórico real de vendas.
 *
 * suporte(A→B) = pedidos que contêm A e B / pedidos que contêm A
 *
 * Arestas calculadas assim são CONFIRMADO, com o número de pedidos visível.
 * Arestas que vêm do seed são DEMONSTRACAO e ficam marcadas como tal.
 */
export function calcularCorrelacaoDeCesta(
  dados: Dataset,
  minimoPedidos = 3,
  minimoSuporte = 0.2,
): ArestaGrafo[] {
  const familiasPorVenda = new Map<string, Set<string>>();
  for (const item of dados.saleItems) {
    const atual = familiasPorVenda.get(item.saleId);
    if (atual) atual.add(item.familyId);
    else familiasPorVenda.set(item.saleId, new Set([item.familyId]));
  }

  const contagemA = new Map<string, number>();
  const contagemAB = new Map<string, number>();

  for (const familias of familiasPorVenda.values()) {
    const lista = [...familias];
    for (const a of lista) {
      contagemA.set(a, (contagemA.get(a) ?? 0) + 1);
      for (const b of lista) {
        if (a === b) continue;
        const chave = `${a}|${b}`;
        contagemAB.set(chave, (contagemAB.get(chave) ?? 0) + 1);
      }
    }
  }

  const nomePorFamilia = new Map(dados.productFamilies.map((f) => [f.id, f.nome]));
  const arestas: ArestaGrafo[] = [];

  for (const [chave, juntos] of contagemAB) {
    const [origem, destino] = chave.split('|');
    const total = contagemA.get(origem) ?? 0;
    if (total < minimoPedidos) continue;
    const suporte = juntos / total;
    if (suporte < minimoSuporte) continue;

    arestas.push({
      origemFamilyId: origem,
      destinoFamilyId: destino,
      tipo: 'CORRELATO',
      suporte,
      procedencia: 'CONFIRMADO',
      perguntaSugerida: `Em ${Math.round(suporte * 100)}% dos pedidos com ${nomePorFamilia.get(origem) ?? 'esta família'}, ${nomePorFamilia.get(destino) ?? 'a outra'} também entrou. Já verificou?`,
      pedidosObservados: juntos,
    });
  }

  return arestas.sort((a, b) => b.suporte - a.suporte);
}

/**
 * Monta o grafo de um sistema. Mescla as relações declaradas (demonstração ou
 * catálogo comercial) com as correlações calculadas do histórico, dando
 * precedência às calculadas — dado observado vence dado declarado.
 */
export function montarGrafo(
  sistema: SistemaVeicular,
  familias: ProductFamily[],
  relacoes: ProductRelation[],
  correlacoesCalculadas: ArestaGrafo[],
  familiasCompradas: Set<string>,
): GrafoOportunidade {
  const doSistema = familias.filter((f) => f.sistema === sistema);
  const ids = new Set(doSistema.map((f) => f.id));

  const declaradas: ArestaGrafo[] = relacoes
    .filter((r) => ids.has(r.origemFamilyId))
    .map((r) => ({
      origemFamilyId: r.origemFamilyId,
      destinoFamilyId: r.destinoFamilyId,
      tipo: r.tipo,
      suporte: r.suporte,
      procedencia: r.procedencia,
      perguntaSugerida: r.perguntaSugerida,
      pedidosObservados: null,
    }));

  const calculadas = correlacoesCalculadas.filter((a) => ids.has(a.origemFamilyId));
  const chavesCalculadas = new Set(calculadas.map((a) => `${a.origemFamilyId}|${a.destinoFamilyId}`));

  const arestas = [
    ...calculadas,
    ...declaradas.filter(
      (a) => !chavesCalculadas.has(`${a.origemFamilyId}|${a.destinoFamilyId}`),
    ),
  ];

  // Nós: as famílias do sistema mais os destinos alcançados pelas arestas.
  const idsAlcancados = new Set<string>([...ids, ...arestas.map((a) => a.destinoFamilyId)]);
  const nos: NoGrafo[] = familias
    .filter((f) => idsAlcancados.has(f.id))
    .map((f) => ({
      familyId: f.id,
      nome: f.nome,
      sistema: f.sistema,
      jaCompra: familiasCompradas.has(f.id),
    }));

  return { sistema, nos, arestas };
}

/**
 * Perguntas de venda completa para uma família. NÃO retorna peças —
 * retorna o que o vendedor deve perguntar antes de fechar.
 */
export function perguntasDeVendaCompleta(
  familyId: string,
  familias: ProductFamily[],
  arestas: ArestaGrafo[],
  familiasCompradas: Set<string>,
): { familia: ProductFamily; pergunta: string; suporte: number; procedencia: Procedencia }[] {
  const porId = new Map(familias.map((f) => [f.id, f]));
  return arestas
    .filter((a) => a.origemFamilyId === familyId && !familiasCompradas.has(a.destinoFamilyId))
    .map((a) => {
      const familia = porId.get(a.destinoFamilyId);
      if (!familia) return null;
      return {
        familia,
        pergunta: a.perguntaSugerida,
        suporte: a.suporte,
        procedencia: a.procedencia,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.suporte - a.suporte);
}
