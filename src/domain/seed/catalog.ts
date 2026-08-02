/**
 * Catálogo de demonstração: famílias, produtos e relações comerciais entre famílias.
 *
 * IMPORTANTE — o que este arquivo NÃO contém:
 *
 * Nenhum registro de `VehicleApplication`. Aplicação veículo–motor–sistema–peça só existe
 * a partir de importação de catálogo validado, com fonte rastreável. A ausência aqui é
 * deliberada e é verificada por teste. Ver docs/CRITICAL_REVIEW.md §1.4 e docs/SECURITY.md §6.
 *
 * As `ProductRelation` abaixo ligam FAMÍLIA a FAMÍLIA e afirmam apenas correlação
 * comercial de cesta — conhecimento de venda, não de catálogo. Todas marcadas DEMONSTRACAO.
 */

import type { Product, ProductFamily, ProductRelation } from '../types';
import { Aleatorio } from './random';

export const FAMILIAS: ProductFamily[] = [
  { id: 'fam-01', nome: 'Kit de Embreagem', sistema: 'EMBREAGEM', cicloMedioDias: 300 },
  { id: 'fam-02', nome: 'Rolamento e Atuador', sistema: 'EMBREAGEM', cicloMedioDias: 300 },
  { id: 'fam-03', nome: 'Pastilha e Lona de Freio', sistema: 'FREIO', cicloMedioDias: 120 },
  { id: 'fam-04', nome: 'Disco e Tambor', sistema: 'FREIO', cicloMedioDias: 240 },
  { id: 'fam-05', nome: 'Sensores e Acessórios de Freio', sistema: 'FREIO', cicloMedioDias: 180 },
  { id: 'fam-06', nome: "Bomba d'Água", sistema: 'ARREFECIMENTO', cicloMedioDias: 360 },
  { id: 'fam-07', nome: 'Válvula Termostática', sistema: 'ARREFECIMENTO', cicloMedioDias: 360 },
  { id: 'fam-08', nome: 'Mangueiras e Correias', sistema: 'ARREFECIMENTO', cicloMedioDias: 180 },
  { id: 'fam-09', nome: 'Amortecedor', sistema: 'SUSPENSAO', cicloMedioDias: 300 },
  { id: 'fam-10', nome: 'Buchas e Suportes', sistema: 'SUSPENSAO', cicloMedioDias: 240 },
  { id: 'fam-11', nome: 'Bico Injetor', sistema: 'INJECAO', cicloMedioDias: 400 },
  { id: 'fam-12', nome: 'Filtro de Combustível', sistema: 'FILTRACAO', cicloMedioDias: 90 },
  { id: 'fam-13', nome: 'Filtro de Ar e Óleo', sistema: 'FILTRACAO', cicloMedioDias: 60 },
  { id: 'fam-14', nome: 'Componentes Elétricos', sistema: 'ELETRICO', cicloMedioDias: 200 },
];

/**
 * Relações comerciais entre famílias. `perguntaSugerida` é o que o vendedor deve
 * PERGUNTAR — nunca o que ele deve vender.
 */
export const RELACOES: ProductRelation[] = [
  {
    id: 'rel-01',
    origemFamilyId: 'fam-01',
    destinoFamilyId: 'fam-02',
    tipo: 'KIT',
    suporte: 0.72,
    procedencia: 'DEMONSTRACAO',
    perguntaSugerida: 'Na troca do kit, o rolamento e o atuador vão ser trocados junto?',
  },
  {
    id: 'rel-02',
    origemFamilyId: 'fam-03',
    destinoFamilyId: 'fam-04',
    tipo: 'CORRELATO',
    suporte: 0.48,
    procedencia: 'DEMONSTRACAO',
    perguntaSugerida: 'O disco ou tambor já foi medido? Muita gente troca a pastilha e volta em 30 dias.',
  },
  {
    id: 'rel-03',
    origemFamilyId: 'fam-03',
    destinoFamilyId: 'fam-05',
    tipo: 'INSTALACAO',
    suporte: 0.31,
    procedencia: 'DEMONSTRACAO',
    perguntaSugerida: 'O sensor de desgaste vai ser reaproveitado ou trocado?',
  },
  {
    id: 'rel-04',
    origemFamilyId: 'fam-06',
    destinoFamilyId: 'fam-07',
    tipo: 'CORRELATO',
    suporte: 0.44,
    procedencia: 'DEMONSTRACAO',
    perguntaSugerida: 'Vão abrir o sistema de arrefecimento. A válvula termostática entra junto?',
  },
  {
    id: 'rel-05',
    origemFamilyId: 'fam-06',
    destinoFamilyId: 'fam-08',
    tipo: 'INSTALACAO',
    suporte: 0.39,
    procedencia: 'DEMONSTRACAO',
    perguntaSugerida: 'Mangueiras e correia estão em que estado? O sistema já vai estar aberto.',
  },
  {
    id: 'rel-06',
    origemFamilyId: 'fam-09',
    destinoFamilyId: 'fam-10',
    tipo: 'INSTALACAO',
    suporte: 0.55,
    procedencia: 'DEMONSTRACAO',
    perguntaSugerida: 'Buchas e suportes vão ser trocados com o amortecedor?',
  },
  {
    id: 'rel-07',
    origemFamilyId: 'fam-11',
    destinoFamilyId: 'fam-12',
    tipo: 'CORRELATO',
    suporte: 0.61,
    procedencia: 'DEMONSTRACAO',
    perguntaSugerida: 'Bico entupido costuma ser filtro vencido. Quando foi a última troca do filtro?',
  },
  {
    id: 'rel-08',
    origemFamilyId: 'fam-04',
    destinoFamilyId: 'fam-03',
    tipo: 'CORRELATO',
    suporte: 0.66,
    procedencia: 'DEMONSTRACAO',
    perguntaSugerida: 'Trocando disco ou tambor, a pastilha ou lona nova já está separada?',
  },
];

const MARCAS = ['Bruto Line', 'Ferrostark', 'Vulcan Parts', 'Tramontano', 'Kaeté Componentes'];

const DESCRITORES: Record<string, string[]> = {
  'fam-01': ['Kit embreagem 350mm', 'Kit embreagem 362mm', 'Kit embreagem 395mm', 'Kit embreagem 430mm'],
  'fam-02': ['Rolamento de embreagem', 'Atuador hidráulico', 'Cilindro mestre', 'Garfo de acionamento'],
  'fam-03': ['Jogo de pastilhas dianteiras', 'Jogo de lonas traseiras', 'Pastilha reforçada', 'Lona rebitada'],
  'fam-04': ['Disco ventilado', 'Tambor de freio', 'Disco sólido', 'Tambor reforçado'],
  'fam-05': ['Sensor de desgaste', 'Kit de molas', 'Regulador automático', 'Cuíca de freio'],
  'fam-06': ["Bomba d'água completa", "Bomba d'água com polia", 'Reparo de bomba', 'Polia tensora'],
  'fam-07': ['Válvula termostática 82°', 'Válvula termostática 87°', 'Carcaça de termostato', 'Sensor de temperatura'],
  'fam-08': ['Mangueira superior', 'Mangueira inferior', 'Correia poli-V', 'Correia dentada'],
  'fam-09': ['Amortecedor dianteiro', 'Amortecedor traseiro', 'Amortecedor de cabine', 'Amortecedor a gás'],
  'fam-10': ['Bucha de mola', 'Suporte de eixo', 'Bucha de barra estabilizadora', 'Coxim de motor'],
  'fam-11': ['Bico injetor eletrônico', 'Bico injetor mecânico', 'Reparo de bico', 'Porta-injetor'],
  'fam-12': ['Filtro separador', 'Filtro de combustível linha', 'Elemento filtrante', 'Cabeçote de filtro'],
  'fam-13': ['Filtro de ar primário', 'Filtro de ar secundário', 'Filtro de óleo', 'Filtro de cabine'],
  'fam-14': ['Alternador', 'Motor de partida', 'Chicote de comando', 'Relé de potência'],
};

const FAIXA_PRECO: Record<string, [number, number]> = {
  'fam-01': [1800, 3600],
  'fam-02': [280, 950],
  'fam-03': [220, 780],
  'fam-04': [380, 1400],
  'fam-05': [90, 520],
  'fam-06': [340, 980],
  'fam-07': [70, 260],
  'fam-08': [60, 340],
  'fam-09': [280, 720],
  'fam-10': [45, 290],
  'fam-11': [420, 1600],
  'fam-12': [55, 210],
  'fam-13': [40, 180],
  'fam-14': [380, 1900],
};

export interface CatalogoDemo {
  familias: ProductFamily[];
  produtos: Product[];
  relacoes: ProductRelation[];
  precos: Map<string, number>;
}

/** Gera 126 produtos (9 por família), determinístico. */
export function gerarCatalogo(rng: Aleatorio): CatalogoDemo {
  const produtos: Product[] = [];
  const precos = new Map<string, number>();
  let contador = 1;

  for (const familia of FAMILIAS) {
    const descritores = DESCRITORES[familia.id];
    const [min, max] = FAIXA_PRECO[familia.id];
    for (let i = 0; i < 9; i++) {
      const id = `prd-${String(contador).padStart(3, '0')}`;
      const descritor = descritores[i % descritores.length];
      const marca = MARCAS[i % MARCAS.length];
      produtos.push({
        id,
        familyId: familia.id,
        descricao: `${descritor} — linha ${i < 3 ? 'pesada' : i < 6 ? 'extrapesada' : 'urbana'}`,
        codigoInterno: `${familia.id.replace('fam-', 'F')}-${String(i + 1).padStart(3, '0')}`,
        marca,
      });
      precos.set(id, Math.round(rng.decimal(min, max)));
      contador++;
    }
  }

  return { familias: FAMILIAS, produtos, relacoes: RELACOES, precos };
}

/**
 * Catálogo de referência do setor: as 14 famílias e os sistemas a que pertencem.
 *
 * Isto NÃO é dado de demonstração — é vocabulário de domínio da linha pesada. Sem ele,
 * um usuário que nunca carregou a demonstração não conseguiria registrar uma venda,
 * porque não haveria família nenhuma para escolher. Por isso é garantido no primeiro
 * carregamento, independentemente de o usuário querer a carteira fictícia.
 *
 * Os produtos NÃO entram aqui: nome e código de peça são catálogo da distribuidora,
 * não do setor. Quem quiser produtos importa os seus.
 */
export function catalogoDeReferencia(): {
  familias: ProductFamily[];
  relacoes: ProductRelation[];
} {
  return { familias: FAMILIAS, relacoes: RELACOES };
}
