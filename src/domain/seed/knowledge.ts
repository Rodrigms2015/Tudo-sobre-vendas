/**
 * Centro de Conhecimento — conteúdo comercial.
 *
 * REGRA INEGOCIÁVEL: `validado` separa conteúdo comercial verificável de conteúdo
 * ilustrativo. A UI renderiza as duas listas SEPARADAS, nunca misturadas.
 *
 * Todo conteúdo aqui é COMERCIAL (como abordar, o que perguntar, como tratar objeção).
 * Nenhum artigo afirma aplicação técnica de peça — isso exige catálogo validado.
 * Ver docs/CRITICAL_REVIEW.md §1.4.
 */

import type { KnowledgeArticle, Playbook } from '../types';

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'pbk-001',
    titulo: 'Frotista rodoviário — primeira reativação',
    contexto:
      'Cliente com histórico forte que parou de comprar há mais que o dobro do ciclo habitual.',
    passos: [
      'Não abrir com oferta. Abrir perguntando o que mudou na operação.',
      'Confirmar se a frota mudou de tamanho, de rota ou de responsável pela compra.',
      'Perguntar quem está atendendo hoje e em qual sistema, sem confrontar o concorrente.',
      'Identificar um sistema onde o concorrente atende mal — prazo, aplicação ou disponibilidade.',
      'Propor um pedido pequeno de reentrada nesse sistema, não a conta inteira.',
      'Registrar promessa com prazo curto e cumprir. A reentrada se ganha na entrega, não no preço.',
    ],
    validado: true,
    tags: ['reativação', 'frotista', 'rodoviário'],
  },
  {
    id: 'pbk-002',
    titulo: 'Veículo parado — atendimento de urgência',
    contexto: 'Cliente liga com veículo imobilizado. A janela de decisão é de minutos.',
    passos: [
      'Registrar cliente, veículo, sistema e sintoma antes de qualquer consulta de preço.',
      'Perguntar onde o veículo está parado e desde quando — isso define o custo real do cliente.',
      'Confirmar quem vai fazer a instalação e se a oficina já abriu o conjunto.',
      'Validar a aplicação no catálogo antes de confirmar qualquer item. Nunca deduzir por semelhança.',
      'Dar um prazo real, mesmo que ruim. Prazo otimista quebrado custa a conta.',
      'Registrar promessa de retorno com horário e cumprir mesmo sem solução.',
      'Perguntar sobre os itens do mesmo sistema — a oficina já vai estar com o conjunto aberto.',
    ],
    validado: true,
    tags: ['urgência', 'veículo parado'],
  },
  {
    id: 'pbk-003',
    titulo: 'Orçamento parado há mais de 5 dias',
    contexto: 'Proposta enviada sem desfecho e sem interação posterior.',
    passos: [
      'Não ligar perguntando "chegou o orçamento?". Isso entrega o controle da conversa.',
      'Ligar com uma informação nova: prazo confirmado, disponibilidade ou alternativa.',
      'Perguntar diretamente o que faltou: preço, prazo, marca ou aplicação.',
      'Se for preço, pedir o comparativo item a item antes de conceder desconto.',
      'Se for prazo, oferecer entrega parcial do que está disponível.',
      'Fechar a conversa com desfecho: ganho, perdido ou nova data. Orçamento sem desfecho é perda silenciosa.',
    ],
    validado: true,
    tags: ['orçamento', 'recuperação'],
  },
  {
    id: 'pbk-004',
    titulo: 'Conta grande comprando poucas famílias',
    contexto: 'Frota relevante concentrada em duas ou três famílias de produto.',
    passos: [
      'Mapear a frota antes de ofertar: quantidade, marcas, idade média e perfil de rota.',
      'Perguntar quem atende hoje os sistemas que não compramos, sem desqualificar ninguém.',
      'Escolher UM sistema para entrar. Tentar todos ao mesmo tempo não entra em nenhum.',
      'Usar o histórico de manutenção do cliente como pauta, não o nosso catálogo.',
      'Propor um teste em parte da frota, com acompanhamento combinado.',
      'Registrar o resultado do teste. Sem medição, não há segunda compra.',
    ],
    validado: true,
    tags: ['expansão', 'frota', 'share'],
  },
  {
    id: 'pbk-005',
    titulo: 'Cliente que só pede preço',
    contexto: 'Comprador que trata a relação exclusivamente como cotação.',
    passos: [
      'Aceitar cotar. Recusar-se a cotar transfere a conta para o concorrente.',
      'Junto com o preço, entregar uma informação que ele não tem: prazo real ou disponibilidade.',
      'Perguntar qual foi a última vez que uma peça voltou por aplicação errada.',
      'Medir o custo do veículo parado com ele, em números da operação dele.',
      'Não brigar por centavos em item de giro. Brigar por presença no item crítico.',
    ],
    validado: true,
    tags: ['objeção', 'preço'],
  },
  {
    id: 'pbk-006',
    titulo: 'Registro de perda em 20 segundos',
    contexto: 'O negócio caiu. O registro precisa acontecer antes da próxima ligação.',
    passos: [
      'Registrar na hora, não no fim do dia. Perda não registrada não vira aprendizado.',
      'Escolher o motivo REAL, não o mais confortável. "Preço" costuma esconder prazo ou aplicação.',
      'Informar o valor estimado mesmo aproximado — o ranking depende dele.',
      'Marcar se é recuperável. Perda recuperável entra na fila de retomada.',
      'Perda por estoque precisa chegar em compras. É a única que o comercial não resolve sozinho.',
    ],
    validado: true,
    tags: ['perda', 'processo'],
  },
];

export const ARTIGOS: KnowledgeArticle[] = [
  {
    id: 'kna-001',
    titulo: 'O que é cadência e por que dias absolutos enganam',
    categoria: 'BOA_PRATICA',
    conteudo:
      'Cadência é o intervalo mediano entre as compras de um cliente. O BRUTO OS mede atraso ' +
      'contra a cadência do próprio cliente, não contra um número fixo de dias.\n\n' +
      'Um cliente que compra a cada 90 dias e está há 40 dias sem comprar está NORMAL. ' +
      'Um cliente que compra a cada 7 dias e está há 40 dias sem comprar provavelmente já foi ' +
      'perdido para um concorrente.\n\n' +
      'Um limiar absoluto de "45 dias sem compra" trata os dois igual — e é por isso que listas ' +
      'de "clientes esfriando" de CRMs genéricos são inúteis: elas ficam dominadas por clientes ' +
      'que nunca foram quentes.\n\n' +
      'Usamos mediana e não média porque uma única compra atípica (reforma de frota, obra) ' +
      'distorce a média e corrompe a leitura da conta.',
    validado: true,
    tags: ['cadência', 'método', 'motor'],
  },
  {
    id: 'kna-002',
    titulo: 'Por que o sistema recusa afirmar aplicação técnica',
    categoria: 'PROCEDIMENTO',
    conteudo:
      'O BRUTO OS nunca afirma que uma peça serve em um veículo. Ele organiza conhecimento ' +
      'COMERCIAL: quais famílias costumam ser compradas juntas, o que perguntar e quando ligar.\n\n' +
      'Aplicação veículo–motor–sistema–peça é conhecimento de CATÁLOGO e exige fonte validada e ' +
      'rastreável. Enviar a peça errada para um veículo parado custa frete de devolução, mais ' +
      'horas de veículo imobilizado e, frequentemente, a conta.\n\n' +
      'Quando o catálogo validado for importado, as aplicações passam a aparecer com a fonte ' +
      'identificada. Até lá, a tela de aplicações mostra vazio — e isso é a funcionalidade ' +
      'funcionando, não uma pendência.',
    validado: true,
    tags: ['aplicação', 'segurança', 'catálogo'],
  },
  {
    id: 'kna-003',
    titulo: 'Venda completa não é venda casada',
    categoria: 'BOA_PRATICA',
    conteudo:
      'Venda casada é empurrar item que o cliente não precisa. Venda completa é impedir que a ' +
      'oficina abra o conjunto duas vezes.\n\n' +
      'A diferença está na pergunta. "Leva também o rolamento" é empurro. "Na troca do kit, o ' +
      'rolamento e o atuador vão ser trocados junto?" é diagnóstico — e a resposta pode ser não.\n\n' +
      'O BRUTO OS gera PERGUNTAS a partir da correlação histórica de cesta, nunca uma lista de ' +
      'itens a acrescentar no pedido. Se o cliente disser que já tem, o trabalho está feito: ' +
      'ninguém volta ao pátio por causa de um item esquecido.',
    validado: true,
    tags: ['venda completa', 'kit', 'objeção'],
  },
  {
    id: 'kna-004',
    titulo: 'Glossário operacional da linha pesada',
    categoria: 'GLOSSARIO',
    conteudo:
      'VEÍCULO PARADO — veículo imobilizado gerando custo por hora ao cliente. Maior urgência comercial.\n\n' +
      'APLICAÇÃO — relação entre peça e veículo (marca, modelo, ano, motor). Exige catálogo validado.\n\n' +
      'KIT COMPLETO — conjunto de itens do mesmo sistema trocados na mesma intervenção.\n\n' +
      'REPOSIÇÃO — compra recorrente por desgaste, distinta de compra por falha.\n\n' +
      'CADÊNCIA — intervalo mediano entre compras de um cliente.\n\n' +
      'JANELA DE RECOMPRA — período em que o cliente historicamente recompra. Não é previsão de falha.\n\n' +
      'TIRA-PEDIDO — vendedor que apenas registra o que o cliente pediu, sem diagnóstico.\n\n' +
      'SHARE DE CARTEIRA — fração da necessidade do cliente atendida por nós.\n\n' +
      'CURVA DE COMPRA — política de estoque por giro do item. Perda por estoque é falha de curva.',
    validado: true,
    tags: ['glossário', 'vocabulário'],
  },
  {
    id: 'kna-005',
    titulo: 'Perguntas de diagnóstico antes de cotar',
    categoria: 'DIAGNOSTICO',
    conteudo:
      'Antes de cotar qualquer item, seis respostas precisam existir:\n\n' +
      '1. Qual veículo — marca, modelo e ano.\n' +
      '2. Qual sistema e qual sintoma, com as palavras do cliente.\n' +
      '3. O veículo está parado? Onde e desde quando?\n' +
      '4. Quem faz a instalação: oficina própria ou terceirizada?\n' +
      '5. O conjunto já foi aberto? O que já foi medido?\n' +
      '6. É reposição programada ou falha inesperada?\n\n' +
      'Sem a 1 e a 2, qualquer cotação é chute. Sem a 3, a urgência é desconhecida. Sem a 5, ' +
      'a chance de uma segunda parada do veículo é alta.\n\n' +
      'Faltando informação, a saída correta é registrar a lacuna e pedir o dado — não estimar.',
    validado: true,
    tags: ['diagnóstico', 'perguntas'],
  },
  {
    id: 'kna-006',
    titulo: 'Objeção de preço: o que ela costuma esconder',
    categoria: 'OBJECAO',
    conteudo:
      'Em linha pesada, "está caro" raramente é sobre o número. Costuma ser:\n\n' +
      '— Comparação com marca diferente (não é o mesmo produto).\n' +
      '— Comparação sem o frete embutido.\n' +
      '— Comparação com prazo maior que o cliente não vai aceitar depois.\n' +
      '— Desconfiança de aplicação, gerada por um erro anterior.\n' +
      '— Necessidade de justificar internamente uma compra já decidida.\n\n' +
      'Antes de conceder desconto, peça o comparativo item a item. Em metade dos casos, a ' +
      'diferença aparece sozinha — e o desconto deixa de ser necessário.\n\n' +
      'Desconto concedido sem investigação vira o novo preço de referência da conta.',
    validado: true,
    tags: ['objeção', 'preço', 'margem'],
  },
  {
    id: 'kna-007',
    titulo: 'Como ler o painel ANDON',
    categoria: 'PROCEDIMENTO',
    conteudo:
      'O ANDON acende para anormalidade, não para atividade normal.\n\n' +
      'CRÍTICO (vermelho): exige ação hoje. Limitado a três simultâneos por vendedor de propósito ' +
      '— se tudo fosse crítico, nada seria.\n\n' +
      'ATENÇÃO (âmbar): exige ação na semana.\n\n' +
      'INFORMAÇÃO (azul): contexto para a próxima conversa.\n\n' +
      'Cada conta gera no máximo um alerta. Os demais sinais daquela conta aparecem como ' +
      'contexto dentro dele, porque você liga para o cliente, não para o alerta.\n\n' +
      'Reconhecer um alerta silencia aquela causa por sete dias. Reconheça com o motivo real: ' +
      'esse registro é o que permite corrigir o motor.',
    validado: true,
    tags: ['andon', 'alertas', 'processo'],
  },
  {
    id: 'kna-008',
    titulo: 'Script de abertura para conta adormecida',
    categoria: 'SCRIPT',
    conteudo:
      'ABERTURA:\n' +
      '"Fulano, aqui é [nome] da [distribuidora]. Vi que a gente não conversa desde [mês]. ' +
      'Não estou ligando para oferecer nada — queria entender o que mudou aí na operação."\n\n' +
      'INVESTIGAÇÃO:\n' +
      '"A frota continua do mesmo tamanho?"\n' +
      '"Mudou alguma rota ou tipo de operação?"\n' +
      '"Quem está cuidando das compras de peças hoje?"\n\n' +
      'TRANSIÇÃO:\n' +
      '"Entendi. E hoje, qual sistema mais dá trabalho para vocês?"\n\n' +
      'FECHAMENTO:\n' +
      '"Deixa eu fazer uma coisa: vou levantar [item específico citado] e te retorno até ' +
      '[dia e hora]. Pode ser?"\n\n' +
      'Só prometa retorno com data e hora que você vai cumprir. A reentrada se ganha na entrega.',
    validado: true,
    tags: ['script', 'reativação'],
  },
  {
    id: 'kna-009',
    titulo: 'Sistemas e famílias — mapa comercial',
    categoria: 'SISTEMA',
    conteudo:
      'Este mapa é COMERCIAL: descreve o que costuma ser comprado junto, com base no histórico ' +
      'de pedidos. Não é afirmação de aplicação técnica.\n\n' +
      'EMBREAGEM — kit, rolamento, atuador, cilindro. Intervenção longa: a oficina abre uma vez.\n\n' +
      'FREIO — pastilha/lona, disco/tambor, sensores, cuíca. Item de maior giro da linha pesada.\n\n' +
      'ARREFECIMENTO — bomba, válvula termostática, mangueiras, correias. Falha aqui para o veículo rápido.\n\n' +
      'SUSPENSÃO — amortecedor, buchas, suportes. Buchas quase sempre acompanham o amortecedor.\n\n' +
      'INJEÇÃO — bico, filtro de combustível. Bico entupido costuma ter origem no filtro vencido.\n\n' +
      'FILTRAÇÃO — ar, óleo, combustível, cabine. Maior recorrência, menor ticket, melhor previsibilidade.',
    validado: true,
    tags: ['sistemas', 'famílias', 'mapa'],
  },
  {
    id: 'kna-010',
    titulo: 'Exemplo ilustrativo de nota técnica (não validada)',
    categoria: 'FAMILIA',
    conteudo:
      'Este artigo existe para demonstrar como conteúdo NÃO VALIDADO é exibido no BRUTO OS: ' +
      'em uma lista separada, com marcação explícita, jamais misturado ao conteúdo validado.\n\n' +
      'Notas técnicas de fabricante, boletins de campo e orientações de aplicação só entram no ' +
      'Centro de Conhecimento como validadas depois de conferidas contra a fonte oficial e com ' +
      'a origem registrada.\n\n' +
      'Enquanto isso não acontece, o conteúdo fica aqui — visível, mas nunca apresentado como ' +
      'verdade operacional.',
    validado: false,
    tags: ['demonstração', 'não validado'],
  },
];
