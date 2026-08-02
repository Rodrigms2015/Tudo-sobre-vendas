/**
 * Gerador de dados sintéticos de demonstração.
 *
 * Determinístico: mesma versão do código e mesma data de referência produzem
 * exatamente os mesmos dados.
 *
 * A carteira é construída por ARQUÉTIPOS, não aleatoriamente. Cada arquétipo existe
 * para exercitar um caminho específico do motor (urgência, compromisso, recuperação,
 * reposição, reativação, expansão, cadastro, conta quieta). Uma carteira gerada ao
 * acaso não garantiria que o Cockpit tivesse o que mostrar.
 *
 * Todos os dados são fictícios. Nenhum CNPJ, e-mail ou telefone completo existe no
 * modelo. Ver docs/SECURITY.md §2.
 */

import type {
  Contact,
  Customer,
  Dataset,
  Fleet,
  Interaction,
  LostSale,
  MotivoPerda,
  Quote,
  QuoteItem,
  Sale,
  SaleItem,
  Segmento,
  Task,
  TipoCliente,
  Vehicle,
} from '../types';
import { datasetVazio } from '../types';
import { hoje, somarDias } from '../dates';
import { Aleatorio } from './random';
import { FAMILIAS, gerarCatalogo } from './catalog';
import { PLAYBOOKS, ARTIGOS } from './knowledge';

const SEMENTE = 20260215;

/**
 * Cidades com PESO desigual. Uma carteira real concentra contas em poucas praças;
 * distribuir 32 clientes igualmente por 12 cidades produziria um mapa de calor em que
 * toda célula tem o mesmo valor — isto é, um mapa que não informa nada.
 */
const CIDADES: { cidade: string; uf: string; peso: number }[] = [
  { cidade: 'São Paulo', uf: 'SP', peso: 6 },
  { cidade: 'Campinas', uf: 'SP', peso: 5 },
  { cidade: 'Curitiba', uf: 'PR', peso: 4 },
  { cidade: 'Belo Horizonte', uf: 'MG', peso: 3 },
  { cidade: 'Porto Alegre', uf: 'RS', peso: 3 },
  { cidade: 'Ribeirão Preto', uf: 'SP', peso: 2 },
  { cidade: 'Londrina', uf: 'PR', peso: 2 },
  { cidade: 'Uberlândia', uf: 'MG', peso: 2 },
  { cidade: 'Caxias do Sul', uf: 'RS', peso: 2 },
  { cidade: 'Goiânia', uf: 'GO', peso: 1 },
  { cidade: 'Feira de Santana', uf: 'BA', peso: 1 },
  { cidade: 'Caruaru', uf: 'PE', peso: 1 },
];

/** Expande os pesos em uma lista de 32 posições, na ordem de atribuição. */
const PRACAS = CIDADES.flatMap((c) => Array<(typeof CIDADES)[number]>(c.peso).fill(c));

const SEGMENTOS: Segmento[] = [
  'CARGA_RODOVIARIA',
  'PASSAGEIROS_URBANO',
  'PASSAGEIROS_RODOVIARIO',
  'CONSTRUCAO',
  'AGRONEGOCIO',
  'DISTRIBUICAO_URBANA',
];

const TIPOS_CLIENTE: TipoCliente[] = [
  'FROTISTA',
  'TRANSPORTADORA',
  'OFICINA',
  'REVENDA',
  'VIACAO',
  'COOPERATIVA',
];

/** Léxico fictício. Nenhum destes nomes corresponde a empresa real conhecida. */
const PREFIXOS = [
  'Transportes',
  'Viação',
  'Rodoviário',
  'Frota',
  'Expresso',
  'Logística',
  'Auto Peças',
  'Retífica',
  'Cooperativa',
  'Terraplenagem',
];
const NUCLEOS = [
  'Serra Azul',
  'Kaeté',
  'Horizonte',
  'Pedra Branca',
  'Vale Verde',
  'Rio Claro',
  'Boa Vista',
  'Três Marias',
  'Campo Largo',
  'Ponta Norte',
  'Ipê Amarelo',
  'Cruzeiro do Sul',
  'Guaporé',
  'Morro Alto',
  'Santa Clara',
  'Ferrabraz',
];
const SUFIXOS = ['Ltda', 'Transportes', 'Logística', '', '', 'e Filhos'];

const CARGOS = [
  'Comprador',
  'Gerente de manutenção',
  'Encarregado de frota',
  'Chefe de oficina',
  'Diretor operacional',
];
const NOMES = [
  'Adriano Vasques',
  'Beatriz Continho',
  'Carlos Petrella',
  'Denise Aragão',
  'Everton Malaquias',
  'Fabiana Ristow',
  'Gilmar Toledo',
  'Helena Braz',
  'Ivan Portela',
  'Juliana Modesto',
  'Kleber Antunes',
  'Larissa Vidigal',
];

const MARCAS_VEICULO = ['Scania', 'Volvo', 'Mercedes-Benz', 'Iveco', 'DAF', 'Volkswagen', 'MAN'];
const MODELOS_VEICULO = ['R 450', 'FH 460', 'Actros 2546', 'S-Way 480', 'XF 480', 'Constellation 24.280', 'TGX 29.480'];

type Arquetipo =
  | 'URGENCIA'
  | 'COMPROMISSO'
  | 'RECUPERACAO'
  | 'REPOSICAO'
  | 'REATIVACAO'
  | 'EXPANSAO'
  | 'CADASTRO'
  | 'QUIETO';

/** Distribuição deliberada dos arquétipos. Soma 32 clientes. */
const DISTRIBUICAO: Arquetipo[] = [
  ...Array<Arquetipo>(2).fill('URGENCIA'),
  ...Array<Arquetipo>(3).fill('COMPROMISSO'),
  ...Array<Arquetipo>(5).fill('RECUPERACAO'),
  ...Array<Arquetipo>(8).fill('REPOSICAO'),
  ...Array<Arquetipo>(4).fill('REATIVACAO'),
  ...Array<Arquetipo>(4).fill('EXPANSAO'),
  ...Array<Arquetipo>(3).fill('CADASTRO'),
  ...Array<Arquetipo>(3).fill('QUIETO'),
];

const RESUMOS_INTERACAO = [
  'Confirmou necessidade de reposição para a próxima semana',
  'Pediu prazo de entrega para a rota do interior',
  'Comparou preço com fornecedor atual',
  'Solicitou visita técnica na oficina própria',
  'Avisou que a frota entrou em revisão programada',
  'Perguntou sobre disponibilidade para retirada imediata',
  'Reclamou de atraso na última entrega',
  'Informou troca do responsável pela compra',
];

const RESUMOS_URGENTES = [
  'Ônibus parado no pátio com falha no sistema de embreagem',
  'Caminhão parado na rodovia, suspeita no sistema de freio',
  'Veículo parado em cliente com superaquecimento',
];

const DESCRICOES_PROMESSA = [
  'Retornar com prazo de entrega confirmado',
  'Enviar proposta revisada do kit completo',
  'Confirmar disponibilidade com o setor de compras',
  'Levar amostra na próxima visita',
  'Dar posição sobre a troca em garantia',
];

const MOTIVOS_COMUNS: MotivoPerda[] = [
  'PRECO',
  'ESTOQUE',
  'PRAZO',
  'CONCORRENCIA',
  'FRETE',
  'MARCA',
  'NAO_RETORNOU',
  'CREDITO',
  'APLICACAO',
];

interface PlanoCliente {
  arquetipo: Arquetipo;
  intervaloMediano: number;
  numeroCompras: number;
  /** Dias desde a última compra, expresso como múltiplo do intervalo mediano. */
  atrasoRelativo: number;
  familias: string[];
  totalVeiculos: number | null;
}

function planejar(arquetipo: Arquetipo, rng: Aleatorio): PlanoCliente {
  const todasFamilias = FAMILIAS.map((f) => f.id);
  switch (arquetipo) {
    case 'URGENCIA':
      return {
        arquetipo,
        intervaloMediano: rng.inteiro(45, 75),
        numeroCompras: rng.inteiro(5, 8),
        atrasoRelativo: rng.decimal(0.5, 1.1),
        familias: rng.escolherVarios(todasFamilias, rng.inteiro(4, 6)),
        totalVeiculos: rng.inteiro(12, 40),
      };
    case 'COMPROMISSO':
      return {
        arquetipo,
        intervaloMediano: rng.inteiro(40, 70),
        numeroCompras: rng.inteiro(5, 9),
        atrasoRelativo: rng.decimal(0.4, 0.9),
        familias: rng.escolherVarios(todasFamilias, rng.inteiro(3, 6)),
        totalVeiculos: rng.inteiro(8, 35),
      };
    case 'RECUPERACAO':
      return {
        arquetipo,
        intervaloMediano: rng.inteiro(50, 90),
        numeroCompras: rng.inteiro(4, 8),
        atrasoRelativo: rng.decimal(0.3, 0.7),
        familias: rng.escolherVarios(todasFamilias, rng.inteiro(3, 5)),
        totalVeiculos: rng.inteiro(10, 45),
      };
    case 'REPOSICAO':
      return {
        arquetipo,
        intervaloMediano: rng.inteiro(35, 80),
        numeroCompras: rng.inteiro(6, 10),
        // 0.85–1.45 cobre JANELA (0.8–1.2) e ATRASADO (1.2–2.0).
        atrasoRelativo: rng.decimal(0.85, 1.45),
        familias: rng.escolherVarios(todasFamilias, rng.inteiro(3, 7)),
        totalVeiculos: rng.inteiro(10, 60),
      };
    case 'REATIVACAO':
      return {
        arquetipo,
        intervaloMediano: rng.inteiro(30, 60),
        numeroCompras: rng.inteiro(7, 11),
        atrasoRelativo: rng.decimal(2.3, 3.4),
        familias: rng.escolherVarios(todasFamilias, rng.inteiro(3, 6)),
        totalVeiculos: rng.inteiro(15, 50),
      };
    case 'EXPANSAO':
      return {
        arquetipo,
        intervaloMediano: rng.inteiro(40, 70),
        numeroCompras: rng.inteiro(6, 10),
        atrasoRelativo: rng.decimal(0.2, 0.7),
        // Frota grande comprando pouquíssimas famílias: a maior oportunidade da carteira.
        familias: rng.escolherVarios(todasFamilias, rng.inteiro(2, 3)),
        totalVeiculos: rng.inteiro(35, 90),
      };
    case 'CADASTRO':
      return {
        arquetipo,
        intervaloMediano: rng.inteiro(60, 110),
        numeroCompras: rng.inteiro(3, 5),
        atrasoRelativo: rng.decimal(0.2, 0.7),
        familias: rng.escolherVarios(todasFamilias, rng.inteiro(2, 4)),
        totalVeiculos: null, // lacuna deliberada
      };
    case 'QUIETO':
      return {
        arquetipo,
        intervaloMediano: rng.inteiro(50, 90),
        numeroCompras: rng.inteiro(5, 8),
        atrasoRelativo: rng.decimal(0.1, 0.5),
        familias: rng.escolherVarios(todasFamilias, rng.inteiro(5, 8)),
        totalVeiculos: rng.inteiro(4, 12),
      };
  }
}

export function gerarDadosDemo(referencia = hoje()): Dataset {
  const rng = new Aleatorio(SEMENTE);
  const dados = datasetVazio();

  // --- Vendedores e usuários ---------------------------------------------
  dados.sellers = [
    { id: 'vnd-001', nome: 'Vendedor Demonstração', regiao: 'Sudeste', metaMensal: 180_000 },
    { id: 'vnd-002', nome: 'Vendedor Externo Demonstração', regiao: 'Sul', metaMensal: 140_000 },
  ];
  dados.users = [
    { id: 'usr-001', nome: 'Vendedor Interno', papel: 'VENDEDOR_INTERNO', sellerId: 'vnd-001' },
    { id: 'usr-002', nome: 'Vendedor Externo', papel: 'VENDEDOR_EXTERNO', sellerId: 'vnd-002' },
    { id: 'usr-003', nome: 'Gestor Comercial', papel: 'GESTOR', sellerId: null },
  ];

  // --- Catálogo -----------------------------------------------------------
  const catalogo = gerarCatalogo(rng);
  dados.productFamilies = catalogo.familias;
  dados.products = catalogo.produtos;
  dados.productRelations = catalogo.relacoes;
  // Deliberadamente vazio. Ver o cabeçalho de seed/catalog.ts.
  dados.vehicleApplications = [];

  dados.playbooks = PLAYBOOKS;
  dados.knowledgeArticles = ARTIGOS;

  const produtosPorFamilia = new Map<string, string[]>();
  for (const p of catalogo.produtos) {
    const lista = produtosPorFamilia.get(p.familyId);
    if (lista) lista.push(p.id);
    else produtosPorFamilia.set(p.familyId, [p.id]);
  }

  // Nomes precisam ser únicos: duas contas com o mesmo nome na carteira parecem
  // um defeito de dados para quem usa, e tornam a busca ambígua.
  const nomesUsados = new Set<string>();
  const nomeUnico = (): string => {
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      const sufixo = rng.escolher(SUFIXOS);
      const candidato = `${rng.escolher(PREFIXOS)} ${rng.escolher(NUCLEOS)}${sufixo ? ` ${sufixo}` : ''}`;
      if (!nomesUsados.has(candidato)) {
        nomesUsados.add(candidato);
        return candidato;
      }
    }
    // Fallback determinístico, nunca alcançado com o léxico atual.
    const reserva = `${rng.escolher(PREFIXOS)} ${rng.escolher(NUCLEOS)} ${nomesUsados.size + 1}`;
    nomesUsados.add(reserva);
    return reserva;
  };

  let contadorVenda = 1;
  let contadorItem = 1;
  let contadorOrc = 1;
  let contadorOrcItem = 1;
  let contadorInter = 1;
  let contadorPerda = 1;
  let contadorPromessa = 1;
  let contadorTarefa = 1;
  let contadorContato = 1;
  let contadorVeiculo = 1;

  DISTRIBUICAO.forEach((arquetipo, indice) => {
    const id = `cli-${String(indice + 1).padStart(3, '0')}`;
    const plano = planejar(arquetipo, rng);
    const local = PRACAS[indice % PRACAS.length];
    // 1 em cada 4 contas vai para o vendedor externo, INTERCALADO com os arquétipos.
    // Atribuir por blocos de índice faria os arquétipos finais (cadastro incompleto,
    // contas quietas) caírem todos no mesmo vendedor, e a carteira do vendedor interno
    // ficaria sem nenhuma lacuna de cadastro para exercitar.
    const sellerId = indice % 4 === 3 ? 'vnd-002' : 'vnd-001';

    const customer: Customer = {
      id,
      nomeFantasia: nomeUnico(),
      cidade: local.cidade,
      uf: local.uf,
      segmento: SEGMENTOS[indice % SEGMENTOS.length],
      tipoCliente: TIPOS_CLIENTE[indice % TIPOS_CLIENTE.length],
      sellerId,
      potencial: arquetipo === 'CADASTRO' ? null : rng.inteiro(2, 5),
      criadoEm: somarDias(referencia, -rng.inteiro(400, 1400)),
      observacoes:
        arquetipo === 'EXPANSAO'
          ? 'Frota grande. Compra concentrada em poucas famílias.'
          : arquetipo === 'REATIVACAO'
            ? 'Comprava com regularidade e parou. Verificar entrada de concorrente.'
            : '',
      origem: 'DEMONSTRACAO',
    };
    dados.customers.push(customer);

    // --- Contatos (arquétipo CADASTRO fica sem, de propósito) -------------
    if (arquetipo !== 'CADASTRO') {
      const quantos = rng.inteiro(1, 2);
      for (let i = 0; i < quantos; i++) {
        const contato: Contact = {
          id: `ctt-${String(contadorContato++).padStart(3, '0')}`,
          customerId: id,
          nome: rng.escolher(NOMES),
          cargo: rng.escolher(CARGOS),
          canalPreferido: rng.escolher(['TELEFONE', 'WHATSAPP', 'EMAIL', 'PRESENCIAL'] as const),
          // Sempre mascarado. Ver docs/SECURITY.md §2.
          telefoneMascarado: `(${rng.inteiro(11, 85)}) 9····-${String(rng.inteiro(1000, 9999))}`,
        };
        dados.contacts.push(contato);
      }
    }

    // --- Frota -------------------------------------------------------------
    const frota: Fleet = {
      id: `frt-${String(indice + 1).padStart(3, '0')}`,
      customerId: id,
      totalVeiculos: plano.totalVeiculos,
      perfilOperacao:
        plano.totalVeiculos === null
          ? null
          : rng.escolher(['RODOVIARIO', 'URBANO', 'MISTO'] as const),
      idadeMediaAnos: plano.totalVeiculos === null ? null : rng.inteiro(3, 14),
      procedencia: plano.totalVeiculos === null ? 'AUSENTE' : 'ESTIMADO',
    };
    dados.fleets.push(frota);

    if (plano.totalVeiculos !== null) {
      const modelos = rng.inteiro(1, 3);
      let restantes = plano.totalVeiculos;
      for (let i = 0; i < modelos && restantes > 0; i++) {
        const qtd = i === modelos - 1 ? restantes : rng.inteiro(1, Math.max(1, restantes - 1));
        const marcaIdx = rng.inteiro(0, MARCAS_VEICULO.length - 1);
        const veiculo: Vehicle = {
          id: `vei-${String(contadorVeiculo++).padStart(3, '0')}`,
          fleetId: frota.id,
          marca: MARCAS_VEICULO[marcaIdx],
          modelo: MODELOS_VEICULO[marcaIdx],
          ano: rng.chance(0.75) ? rng.inteiro(2012, 2024) : null,
          quantidade: qtd,
        };
        dados.vehicles.push(veiculo);
        restantes -= qtd;
      }
    }

    // --- Histórico de compras ---------------------------------------------
    const diasDesdeUltima = Math.round(plano.intervaloMediano * plano.atrasoRelativo);
    const dataUltima = somarDias(referencia, -diasDesdeUltima);
    const datasCompra: string[] = [];
    let cursor = dataUltima;
    datasCompra.push(cursor);
    for (let i = 1; i < plano.numeroCompras; i++) {
      // Jitter de ±18% mantém o coeficiente de variação baixo o bastante para BASE_RAZOAVEL.
      const intervalo = Math.max(
        7,
        Math.round(plano.intervaloMediano * rng.decimal(0.82, 1.18)),
      );
      cursor = somarDias(cursor, -intervalo);
      datasCompra.push(cursor);
    }
    datasCompra.reverse();

    for (const data of datasCompra) {
      const vendaId = `vnd-s-${String(contadorVenda++).padStart(4, '0')}`;
      const familiasNaVenda = rng.escolherVarios(
        plano.familias,
        rng.chance(0.45) ? Math.min(2, plano.familias.length) : 1,
      );
      let total = 0;
      const itens: SaleItem[] = [];
      for (const familyId of familiasNaVenda) {
        const produtos = produtosPorFamilia.get(familyId) ?? [];
        if (produtos.length === 0) continue;
        const produtoId = rng.escolher(produtos);
        const quantidade = rng.inteiro(1, 6);
        const valor = Math.round((catalogo.precos.get(produtoId) ?? 200) * quantidade);
        total += valor;
        itens.push({
          id: `itm-${String(contadorItem++).padStart(4, '0')}`,
          saleId: vendaId,
          productId: produtoId,
          familyId,
          quantidade,
          valorTotal: valor,
        });
      }
      if (itens.length === 0) continue;

      const sale: Sale = {
        id: vendaId,
        customerId: id,
        data,
        valorTotal: total,
        // 20% das vendas sem margem: reproduz ERPs que não expõem margem ao vendedor.
        margemPercentual: rng.chance(0.8) ? Math.round(rng.decimal(7, 27) * 10) / 10 : null,
        quoteId: null,
      };
      dados.sales.push(sale);
      dados.saleItems.push(...itens);
    }

    // --- Orçamentos --------------------------------------------------------
    const criarOrcamento = (status: Quote['status'], diasAtras: number) => {
      const orcId = `orc-${String(contadorOrc++).padStart(3, '0')}`;
      const familyId = rng.escolher(plano.familias);
      const produtos = produtosPorFamilia.get(familyId) ?? [];
      const produtoId = produtos.length > 0 ? rng.escolher(produtos) : catalogo.produtos[0].id;
      const quantidade = rng.inteiro(2, 10);
      const unitario = catalogo.precos.get(produtoId) ?? 300;
      const total = unitario * quantidade;
      dados.quotes.push({
        id: orcId,
        customerId: id,
        data: somarDias(referencia, -diasAtras),
        status,
        valorTotal: total,
        validadeDias: 15,
      });
      const item: QuoteItem = {
        id: `orci-${String(contadorOrcItem++).padStart(3, '0')}`,
        quoteId: orcId,
        productId: produtoId,
        quantidade,
        valorUnitario: unitario,
      };
      dados.quoteItems.push(item);
    };

    if (arquetipo === 'RECUPERACAO') {
      // Parado há 6–18 dias: dispara ORCAMENTO_PARADO e o tipo RECUPERACAO.
      criarOrcamento('ABERTO', rng.inteiro(6, 18));
      if (rng.chance(0.4)) criarOrcamento('GANHO', rng.inteiro(40, 120));
    } else if (rng.chance(0.55)) {
      criarOrcamento(rng.chance(0.5) ? 'GANHO' : 'PERDIDO', rng.inteiro(25, 200));
    }

    // --- Interações --------------------------------------------------------
    const numeroInteracoes =
      arquetipo === 'QUIETO' || arquetipo === 'CADASTRO' ? rng.inteiro(0, 1) : rng.inteiro(1, 3);
    for (let i = 0; i < numeroInteracoes; i++) {
      const interacao: Interaction = {
        id: `int-${String(contadorInter++).padStart(3, '0')}`,
        customerId: id,
        tipo: rng.escolher(['LIGACAO', 'VISITA', 'WHATSAPP', 'EMAIL'] as const),
        data: somarDias(referencia, -rng.inteiro(8, 95)),
        util: rng.chance(0.62),
        urgente: false,
        resumo: rng.escolher(RESUMOS_INTERACAO),
      };
      dados.interactions.push(interacao);
    }

    if (arquetipo === 'URGENCIA') {
      dados.interactions.push({
        id: `int-${String(contadorInter++).padStart(3, '0')}`,
        customerId: id,
        tipo: 'LIGACAO',
        data: somarDias(referencia, -rng.inteiro(0, 2)),
        util: true,
        urgente: true,
        resumo: rng.escolher(RESUMOS_URGENTES),
      });
    }

    // --- Promessas ---------------------------------------------------------
    if (arquetipo === 'COMPROMISSO') {
      const atraso = rng.inteiro(1, 6);
      dados.promessas.push({
        id: `prm-${String(contadorPromessa++).padStart(3, '0')}`,
        customerId: id,
        descricao: rng.escolher(DESCRICOES_PROMESSA),
        dataPrometida: somarDias(referencia, -atraso),
        criadaEm: somarDias(referencia, -atraso - rng.inteiro(2, 8)),
        status: 'PENDENTE',
      });
    }
    // Promessas históricas resolvidas, para a métrica de cumprimento.
    if (rng.chance(0.45)) {
      const criada = somarDias(referencia, -rng.inteiro(20, 85));
      dados.promessas.push({
        id: `prm-${String(contadorPromessa++).padStart(3, '0')}`,
        customerId: id,
        descricao: rng.escolher(DESCRICOES_PROMESSA),
        dataPrometida: somarDias(criada, rng.inteiro(1, 5)),
        criadaEm: criada,
        status: rng.chance(0.78) ? 'CUMPRIDA' : 'QUEBRADA',
      });
    }

    // --- Perdas -------------------------------------------------------------
    const numeroPerdas =
      arquetipo === 'REATIVACAO' ? rng.inteiro(1, 3) : rng.chance(0.45) ? rng.inteiro(1, 2) : 0;
    for (let i = 0; i < numeroPerdas; i++) {
      const motivo = rng.escolher(MOTIVOS_COMUNS);
      const familyId = rng.escolher(plano.familias);
      const perda: LostSale = {
        id: `prd-${String(contadorPerda++).padStart(3, '0')}`,
        customerId: id,
        data: somarDias(referencia, -rng.inteiro(3, 170)),
        motivo,
        valorEstimado: rng.inteiro(800, 22_000),
        familyId,
        recuperavel: motivo !== 'CREDITO' && motivo !== 'MARCA',
        detalhe:
          motivo === 'ESTOQUE'
            ? 'Item sem saldo no momento da consulta. Cliente não aceitou aguardar.'
            : motivo === 'PRECO'
              ? 'Concorrente apresentou preço menor na mesma marca.'
              : '',
      };
      dados.lostSales.push(perda);
    }

    // --- Tarefas ------------------------------------------------------------
    if (rng.chance(0.3)) {
      const tarefa: Task = {
        id: `tsk-${String(contadorTarefa++).padStart(3, '0')}`,
        customerId: id,
        titulo: 'Confirmar dados de frota e responsável de compras',
        prazo: somarDias(referencia, rng.inteiro(-3, 10)),
        status: 'ABERTA',
        origemRecommendationId: null,
        criadaEm: somarDias(referencia, -rng.inteiro(1, 20)),
      };
      dados.tasks.push(tarefa);
    }
  });

  // --- Garantia de volume de perdas por estoque para o ANDON ---------------
  // Dois clientes com reincidência da MESMA família, para exercitar
  // DEMANDA_REPETIDA_SEM_ESTOQUE de forma determinística.
  for (const clienteId of ['cli-004', 'cli-011']) {
    const cliente = dados.customers.find((c) => c.id === clienteId);
    if (!cliente) continue;
    for (let i = 0; i < 2; i++) {
      dados.lostSales.push({
        id: `prd-${String(contadorPerda++).padStart(3, '0')}`,
        customerId: clienteId,
        data: somarDias(referencia, -rng.inteiro(5, 45)),
        motivo: 'ESTOQUE',
        valorEstimado: rng.inteiro(3_000, 16_000),
        familyId: 'fam-03',
        recuperavel: true,
        detalhe: 'Demanda repetida sem saldo. Registrar para a curva de compras.',
      });
    }
  }

  dados.auditEvents.push({
    id: 'aud-seed-001',
    data: referencia,
    tipo: 'SEED',
    descricao: `Dados de demonstração carregados: ${dados.customers.length} clientes, ${dados.sales.length} vendas. Todos os registros são sintéticos.`,
    entidade: null,
    entidadeId: null,
  });

  return dados;
}

/** Contagens usadas pelos testes de volume e pela tela de dados. */
export function contarRegistros(dados: Dataset): Record<string, number> {
  return {
    clientes: dados.customers.length,
    cidades: new Set(dados.customers.map((c) => `${c.cidade}/${c.uf}`)).size,
    segmentos: new Set(dados.customers.map((c) => c.segmento)).size,
    familias: dados.productFamilies.length,
    produtos: dados.products.length,
    vendas: dados.sales.length,
    itensDeVenda: dados.saleItems.length,
    orcamentos: dados.quotes.length,
    interacoes: dados.interactions.length,
    perdas: dados.lostSales.length,
    promessas: dados.promessas.length,
    tarefas: dados.tasks.length,
    contatos: dados.contacts.length,
    veiculos: dados.vehicles.length,
    aplicacoesTecnicas: dados.vehicleApplications.length,
    playbooks: dados.playbooks.length,
    artigos: dados.knowledgeArticles.length,
  };
}
