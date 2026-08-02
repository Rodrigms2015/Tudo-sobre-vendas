/**
 * Simulador de Cenários.
 *
 * ISTO NÃO É INTELIGÊNCIA ARTIFICIAL, e o produto diz isso na tela.
 *
 * É uma matriz de respostas com rubrica escrita à mão por conhecimento de domínio.
 * Cada resposta tem nota 0–3 em seis critérios, e cada nota tem justificativa.
 * Chamar isso de IA seria mentira — e desnecessária, porque uma rubrica explícita é
 * discutível pelo vendedor, o que um modelo opaco não é.
 *
 * A interface `AvaliadorDeResposta` isola a avaliação para que uma integração futura
 * com modelo de linguagem seja substituição de implementação, não reescrita.
 * Ver docs/ROADMAP.md Fase 5.
 */

export type CriterioAvaliacao =
  | 'clareza'
  | 'investigacao'
  | 'valor'
  | 'risco'
  | 'fechamento'
  | 'proximaAcao';

export const ROTULO_CRITERIO: Record<CriterioAvaliacao, string> = {
  clareza: 'Clareza',
  investigacao: 'Investigação',
  valor: 'Valor',
  risco: 'Risco',
  fechamento: 'Fechamento',
  proximaAcao: 'Próxima ação',
};

export const DESCRICAO_CRITERIO: Record<CriterioAvaliacao, string> = {
  clareza: 'A resposta é direta e o cliente entende sem reler.',
  investigacao: 'A resposta busca informação antes de concluir.',
  valor: 'A resposta trata de valor para a operação, não só de preço.',
  risco: 'A resposta evita compromisso que não pode ser cumprido.',
  fechamento: 'A resposta move o negócio para um desfecho.',
  proximaAcao: 'A resposta deixa combinado o que acontece a seguir.',
};

export type Notas = Record<CriterioAvaliacao, number>;

export interface OpcaoResposta {
  id: string;
  texto: string;
  notas: Notas;
  /** Por que cada nota foi dada. Rubrica escrita, não gerada. */
  justificativa: string;
}

export interface Cenario {
  id: string;
  titulo: string;
  situacao: string;
  falaDoCliente: string;
  contexto: string;
  opcoes: OpcaoResposta[];
  /** O princípio que o cenário ensina. */
  licao: string;
}

/** Nota máxima por critério. */
export const NOTA_MAXIMA = 3;

export const CENARIOS: Cenario[] = [
  {
    id: 'cen-01',
    titulo: 'Preço acima do concorrente',
    situacao: 'Cliente comparou seu orçamento com outro fornecedor.',
    falaDoCliente: '"Seu preço está 18% acima. O outro fornecedor já me mandou fechado."',
    contexto: 'Frotista com 30 veículos, compra há 4 anos, ticket médio R$ 4.100.',
    licao:
      'Diferença de preço em linha pesada quase sempre esconde diferença de marca, prazo ou frete. Investigar antes de conceder é a única forma de não transformar o desconto no novo preço de referência.',
    opcoes: [
      {
        id: 'a',
        texto: 'Consigo cobrir esse preço. Fecho por 18% a menos agora mesmo.',
        notas: { clareza: 3, investigacao: 0, valor: 0, risco: 0, fechamento: 2, proximaAcao: 1 },
        justificativa:
          'Clareza alta e fechamento rápido, mas a investigação é zero: você não sabe se é o mesmo produto. Risco zero porque o desconto vira o novo preço de referência desta conta — a próxima cotação começa 18% abaixo. Valor zero: a conversa ficou inteiramente sobre número.',
      },
      {
        id: 'b',
        texto:
          'Me manda o comparativo item a item? Quero conferir marca, prazo e se o frete está incluído antes de falar de preço.',
        notas: { clareza: 3, investigacao: 3, valor: 2, risco: 3, fechamento: 2, proximaAcao: 3 },
        justificativa:
          'Melhor resposta. Investigação máxima sem recusar a negociação. Risco máximo porque nenhum compromisso foi assumido antes de saber o que está sendo comparado. Próxima ação clara: o cliente vai enviar algo. Fechamento não é máximo porque a decisão fica adiada — custo aceitável.',
      },
      {
        id: 'c',
        texto: 'Nosso produto tem qualidade superior. Não dá para comparar.',
        notas: { clareza: 1, investigacao: 0, valor: 1, risco: 1, fechamento: 0, proximaAcao: 0 },
        justificativa:
          'Afirmação genérica que todo fornecedor faz — clareza baixa porque não diz nada concreto. Investigação zero. Fechamento zero: a conversa termina sem desfecho e sem próximo passo. O cliente ouve isso como evasiva.',
      },
      {
        id: 'd',
        texto:
          'Qual foi a última vez que uma peça voltou por aplicação errada? Quanto custou o veículo parado?',
        notas: { clareza: 2, investigacao: 3, valor: 3, risco: 2, fechamento: 1, proximaAcao: 1 },
        justificativa:
          'Valor máximo: traz o custo real da operação para a mesa, que é onde o preço perde peso. Investigação máxima. Clareza média porque muda o assunto abruptamente e pode soar evasivo se o cliente estiver com pressa. Fechamento baixo: não encaminha desfecho.',
      },
    ],
  },
  {
    id: 'cen-02',
    titulo: 'Cliente pede apenas uma peça',
    situacao: 'Cliente pediu somente a pastilha de freio.',
    falaDoCliente: '"Só preciso do jogo de pastilha. Nada mais."',
    contexto: 'Viação urbana, 22 ônibus, comprou disco pela última vez há 14 meses.',
    licao:
      'Venda completa é diagnóstico, não empurro. A diferença está na pergunta: "leva também" é empurro; "já foi medido?" é diagnóstico — e a resposta pode ser não.',
    opcoes: [
      {
        id: 'a',
        texto: 'Beleza, só a pastilha então. Vou fechar.',
        notas: { clareza: 3, investigacao: 0, valor: 0, risco: 2, fechamento: 3, proximaAcao: 1 },
        justificativa:
          'Isso é tirar pedido. Fechamento máximo e risco baixo, mas investigação e valor zerados. Se o disco estiver fora de medida, o veículo volta ao pátio em 30 dias e a culpa vai recair no fornecedor da pastilha.',
      },
      {
        id: 'b',
        texto: 'Leva o disco também, sai mais em conta no conjunto.',
        notas: { clareza: 2, investigacao: 0, valor: 1, risco: 0, fechamento: 2, proximaAcao: 1 },
        justificativa:
          'Isso é venda casada. Investigação zero — você não sabe se o disco precisa ser trocado. Risco zero: se o disco estiver bom, o cliente percebe o empurro e passa a desconfiar de toda recomendação futura.',
      },
      {
        id: 'c',
        texto:
          'Fecho a pastilha. Só uma coisa: o disco já foi medido? A última compra de disco de vocês foi há 14 meses e a oficina já vai estar com a roda fora.',
        notas: { clareza: 3, investigacao: 3, valor: 3, risco: 3, fechamento: 3, proximaAcao: 2 },
        justificativa:
          'Melhor resposta em todos os critérios de substância. Fecha o que o cliente pediu (não trava o pedido), investiga com um dado concreto do histórico, e justifica pela operação dele — a roda já vai estar fora. Se a resposta for "já medi, está bom", o trabalho está feito do mesmo jeito.',
      },
      {
        id: 'd',
        texto: 'Você não quer aproveitar e ver o resto do sistema de freio?',
        notas: { clareza: 1, investigacao: 1, valor: 1, risco: 2, fechamento: 1, proximaAcao: 1 },
        justificativa:
          'Pergunta vaga demais para produzir resposta útil. "O resto do sistema" não é uma pergunta que o comprador consiga responder no telefone. Sem o dado do histórico, soa como tentativa de aumentar o pedido.',
      },
    ],
  },
  {
    id: 'cen-03',
    titulo: 'Veículo parado e sem certeza de aplicação',
    situacao: 'Cliente com ônibus parado quer confirmação imediata de uma peça.',
    falaDoCliente: '"O ônibus está parado desde ontem. Me confirma que essa peça serve e eu fecho agora."',
    contexto: 'Modelo e ano informados, mas o motor não foi confirmado. Catálogo não consultado.',
    licao:
      'Pressão de urgência é exatamente quando o erro de aplicação acontece. Um "acho que serve" custa frete de devolução, mais horas de veículo parado e, com frequência, a conta.',
    opcoes: [
      {
        id: 'a',
        texto: 'Serve sim, pode fechar. Esse modelo usa essa peça.',
        notas: { clareza: 3, investigacao: 0, valor: 0, risco: 0, fechamento: 3, proximaAcao: 1 },
        justificativa:
          'A pior resposta possível. Risco zero: você afirmou aplicação sem consultar catálogo e sem confirmar o motor. Se errar, o veículo fica parado mais um dia, você paga o frete de volta e perde a conta — em uma situação em que o cliente estava disposto a fechar.',
      },
      {
        id: 'b',
        texto:
          'Preciso do motor para confirmar no catálogo. Me passa que eu confirmo em 10 minutos e já reservo a peça.',
        notas: { clareza: 3, investigacao: 3, valor: 2, risco: 3, fechamento: 3, proximaAcao: 3 },
        justificativa:
          'Melhor resposta. Não afirma o que não sabe, dá um prazo curto e concreto, e mantém o negócio vivo com a reserva. Fechamento máximo porque o cliente entende que vai ter resposta hoje — e reservar mostra compromisso sem assumir risco técnico.',
      },
      {
        id: 'c',
        texto: 'Não posso confirmar sem o catálogo. Me liga quando tiver o número do motor.',
        notas: { clareza: 2, investigacao: 1, valor: 0, risco: 3, fechamento: 0, proximaAcao: 0 },
        justificativa:
          'Tecnicamente correto e comercialmente ruim. Risco máximo — você não afirmou nada errado — mas transfere todo o trabalho para um cliente com veículo parado. Fechamento e próxima ação zerados: quem liga de volta é o concorrente.',
      },
      {
        id: 'd',
        texto: 'Mando a peça e, se não servir, você devolve sem custo.',
        notas: { clareza: 3, investigacao: 0, valor: 1, risco: 0, fechamento: 3, proximaAcao: 2 },
        justificativa:
          'Parece atencioso e é caro. Risco zero: o cliente perde mais um dia com o veículo parado se não servir, e o custo emocional dele é maior que o do frete. Investigação zero — bastava uma pergunta para evitar tudo isso.',
      },
    ],
  },
  {
    id: 'cen-04',
    titulo: 'Cliente não quer informar a frota',
    situacao: 'Você tenta mapear a frota e o comprador resiste.',
    falaDoCliente: '"Por que você quer saber quantos veículos eu tenho? Isso é informação minha."',
    contexto: 'Conta nova, duas compras registradas, sem perfil de frota.',
    licao:
      'A pergunta sobre frota precisa ter benefício explícito para o cliente. Sem isso, ela soa como levantamento comercial — e é exatamente o que é, se você não explicar o retorno.',
    opcoes: [
      {
        id: 'a',
        texto: 'É só para o nosso cadastro, é padrão da empresa.',
        notas: { clareza: 2, investigacao: 0, valor: 0, risco: 1, fechamento: 0, proximaAcao: 0 },
        justificativa:
          'Confirma exatamente a suspeita do cliente: a informação é para você, não para ele. Valor zero. A resistência aumenta e a pergunta fica queimada para sempre.',
      },
      {
        id: 'b',
        texto:
          'Pergunto para conseguir separar o que costuma dar problema na sua operação e te avisar antes de faltar. Se preferir, me diz só marca e faixa de ano.',
        notas: { clareza: 3, investigacao: 3, valor: 3, risco: 3, fechamento: 2, proximaAcao: 3 },
        justificativa:
          'Melhor resposta. Dá o benefício concreto para o cliente e oferece uma versão reduzida da pergunta — que costuma ser aceita e já resolve boa parte da lacuna. Investigação e valor máximos sem pressionar.',
      },
      {
        id: 'c',
        texto: 'Tudo bem, deixa para lá.',
        notas: { clareza: 2, investigacao: 0, valor: 0, risco: 3, fechamento: 0, proximaAcao: 0 },
        justificativa:
          'Preserva a relação e abandona a informação. Risco máximo porque não gera atrito, mas a conta fica permanentemente sem dimensionamento — e sem isso o sistema não consegue priorizá-la.',
      },
      {
        id: 'd',
        texto: 'Sem essa informação eu não consigo te atender direito.',
        notas: { clareza: 2, investigacao: 0, valor: 0, risco: 0, fechamento: 0, proximaAcao: 0 },
        justificativa:
          'Transforma uma pergunta em condição. Risco zero: soa como chantagem em uma conta nova, que é onde a confiança ainda não existe. É a forma mais rápida de perder o segundo pedido.',
      },
    ],
  },
  {
    id: 'cen-05',
    titulo: 'Cliente já tem fornecedor',
    situacao: 'Prospecção em conta atendida por um concorrente estabelecido.',
    falaDoCliente: '"Trabalho com o mesmo fornecedor há 8 anos. Está tudo certo."',
    contexto: 'Frota de 45 veículos. Nunca comprou de nós.',
    licao:
      'Não se toma uma conta inteira de um fornecedor de 8 anos. Toma-se um sistema que ele atende mal.',
    opcoes: [
      {
        id: 'a',
        texto: 'Me dá uma chance de cotar, garanto que consigo um preço melhor.',
        notas: { clareza: 2, investigacao: 0, valor: 0, risco: 1, fechamento: 1, proximaAcao: 1 },
        justificativa:
          'Entra pelo único caminho onde a relação de 8 anos não pode ser vencida com preço isolado. Investigação zero. Mesmo ganhando uma cotação, você vira cotação eterna.',
      },
      {
        id: 'b',
        texto:
          'Ótimo, relação longa é bom sinal. Me diz uma coisa: qual sistema mais te dá dor de cabeça hoje, mesmo com ele?',
        notas: { clareza: 3, investigacao: 3, valor: 3, risco: 3, fechamento: 2, proximaAcao: 3 },
        justificativa:
          'Melhor resposta. Valida o fornecedor atual (não gera defesa) e procura a brecha real. Nenhum fornecedor atende todos os sistemas igualmente bem em 8 anos. A pergunta abre uma porta específica em vez de disputar a conta inteira.',
      },
      {
        id: 'c',
        texto: 'Eles têm fama de atrasar entrega. Já teve problema?',
        notas: { clareza: 2, investigacao: 2, valor: 0, risco: 0, fechamento: 1, proximaAcao: 1 },
        justificativa:
          'Investiga, mas desqualificando o concorrente — o que em uma relação de 8 anos ataca indiretamente a decisão do próprio cliente. Risco zero: ele defende o fornecedor e a conversa acaba.',
      },
      {
        id: 'd',
        texto: 'Entendo. Posso te procurar daqui a uns meses?',
        notas: { clareza: 2, investigacao: 0, valor: 0, risco: 2, fechamento: 0, proximaAcao: 1 },
        justificativa:
          'Encerra sem descobrir nada. Você vai voltar daqui a meses exatamente com a mesma informação que tem hoje — nenhuma.',
      },
    ],
  },
  {
    id: 'cen-06',
    titulo: 'Cliente sem tempo',
    situacao: 'Você liga e o comprador está no meio de outra coisa.',
    falaDoCliente: '"Estou sem tempo agora, me liga outro dia."',
    contexto: 'Cliente com orçamento de R$ 12 mil parado há 9 dias.',
    licao:
      '"Me liga outro dia" sem data combinada é um não educado. A resposta certa converte em compromisso específico em menos de 15 segundos.',
    opcoes: [
      {
        id: 'a',
        texto: 'Sem problema, ligo semana que vem.',
        notas: { clareza: 2, investigacao: 0, valor: 0, risco: 2, fechamento: 0, proximaAcao: 0 },
        justificativa:
          'Aceita o adiamento sem data combinada. O orçamento continua parado e você repetirá esta ligação. Próxima ação zero: "semana que vem" não é um compromisso.',
      },
      {
        id: 'b',
        texto:
          'Trinta segundos: o orçamento de R$ 12 mil vence em 6 dias. Quer que eu segure o preço ou prefere que eu ligue amanhã às 9h?',
        notas: { clareza: 3, investigacao: 2, valor: 2, risco: 3, fechamento: 3, proximaAcao: 3 },
        justificativa:
          'Melhor resposta. Respeita o tempo dele, entrega a informação crítica em uma frase e oferece duas saídas concretas — ambas com desfecho. Próxima ação e fechamento máximos.',
      },
      {
        id: 'c',
        texto: 'É rapidinho, só queria falar do orçamento.',
        notas: { clareza: 1, investigacao: 0, valor: 0, risco: 1, fechamento: 1, proximaAcao: 0 },
        justificativa:
          'Ignora o que o cliente acabou de dizer, sem entregar informação nova. "Rapidinho" sem conteúdo é a frase que treina o comprador a não atender.',
      },
      {
        id: 'd',
        texto: 'Te mando por WhatsApp então, me responde quando puder.',
        notas: { clareza: 2, investigacao: 0, valor: 1, risco: 2, fechamento: 1, proximaAcao: 1 },
        justificativa:
          'Respeitoso e passivo. "Quando puder" devolve o controle e o orçamento continua parado. Serve como plano B, não como resposta principal.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Avaliação
// ---------------------------------------------------------------------------

export interface ResultadoAvaliacao {
  notas: Notas;
  total: number;
  maximo: number;
  justificativa: string;
  melhorOpcao: OpcaoResposta;
  ehMelhorEscolha: boolean;
  /** Critérios em que a escolha ficou pelo menos 2 pontos abaixo da melhor opção. */
  criteriosFracos: CriterioAvaliacao[];
}

/**
 * Isola a avaliação para permitir substituição futura por modelo de linguagem
 * sem reescrever o simulador. Ver docs/ROADMAP.md Fase 5.
 */
export interface AvaliadorDeResposta {
  avaliar(cenario: Cenario, opcaoId: string): ResultadoAvaliacao;
}

export function somarNotas(notas: Notas): number {
  return Object.values(notas).reduce((s, n) => s + n, 0);
}

export function melhorOpcao(cenario: Cenario): OpcaoResposta {
  return [...cenario.opcoes].sort((a, b) => somarNotas(b.notas) - somarNotas(a.notas))[0];
}

/** Avaliador do MVP: consulta a rubrica escrita. Determinístico e auditável. */
export const avaliadorPorRubrica: AvaliadorDeResposta = {
  avaliar(cenario, opcaoId) {
    const opcao = cenario.opcoes.find((o) => o.id === opcaoId);
    if (!opcao) throw new Error(`Opção ${opcaoId} não existe no cenário ${cenario.id}`);

    const melhor = melhorOpcao(cenario);
    const criterios = Object.keys(opcao.notas) as CriterioAvaliacao[];
    const criteriosFracos = criterios.filter((c) => melhor.notas[c] - opcao.notas[c] >= 2);

    return {
      notas: opcao.notas,
      total: somarNotas(opcao.notas),
      maximo: criterios.length * NOTA_MAXIMA,
      justificativa: opcao.justificativa,
      melhorOpcao: melhor,
      ehMelhorEscolha: opcao.id === melhor.id,
      criteriosFracos,
    };
  },
};
