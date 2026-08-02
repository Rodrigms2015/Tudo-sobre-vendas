/**
 * SCAR — Situação, Contexto, Análise, Recomendação.
 *
 * Formato único de resumo em todo o produto (adaptado do SBAR da área da saúde).
 * Dois formatos concorrentes fariam o vendedor precisar decidir qual usar em cada
 * tela — custo cognitivo sem retorno.
 *
 * Todo texto aqui é montado a partir de FATOS do motor. Nada é gerado livremente:
 * se um número aparece no SCAR, ele veio de um registro.
 */

import type { ProductFamily, Recommendation } from '../types';
import { MOTIVOS_PERDA } from '../types';
import type { CustomerContext } from './context';
import { ROTULO_TEMPERATURA } from './cadence';
import { radarPorFamilia, situacaoJanela } from './radar';
import { formatarData, formatarDias, formatarMoeda, hoje } from '../dates';

export interface ResumoScar {
  situacao: string;
  contexto: string;
  analise: string;
  recomendacao: string;
}

export interface PreparoLigacao {
  objetivo: string;
  scar: ResumoScar;
  perguntas: string[];
  oportunidades: string[];
  objecoesProvaveis: { objecao: string; resposta: string }[];
  historicoEssencial: string[];
  proximaAcaoEsperada: string;
  lacunas: string[];
}

function redigirSituacao(ctx: CustomerContext, rec: Recommendation | null): string {
  const nome = ctx.customer.nomeFantasia;
  if (ctx.temUrgenciaAtiva) {
    const urgente = [...ctx.interacoes]
      .filter((i) => i.urgente)
      .sort((a, b) => b.data.localeCompare(a.data))[0];
    return `${nome} está com urgência aberta: ${urgente?.resumo ?? 'situação de veículo parado'}.`;
  }
  if (ctx.promessasVencidas.length > 0) {
    const p = ctx.promessasVencidas[0];
    return `Promessa pendente com ${nome} desde ${formatarData(p.dataPrometida)}: ${p.descricao}.`;
  }
  if (ctx.valorOrcamentoAberto > 0) {
    return `${nome} tem ${formatarMoeda(ctx.valorOrcamentoAberto)} em orçamento aberto sem desfecho.`;
  }
  if (rec) {
    return `${rec.acao}.`;
  }
  return `${nome} — conta sem sinal ativo no momento.`;
}

function redigirContexto(ctx: CustomerContext): string {
  const partes: string[] = [];
  const veiculos = ctx.frota?.totalVeiculos;
  partes.push(
    veiculos !== null && veiculos !== undefined
      ? `${veiculos} veículos${ctx.frota?.perfilOperacao ? `, operação ${ctx.frota.perfilOperacao.toLowerCase()}` : ''}`
      : 'frota não cadastrada',
  );
  partes.push(`${ctx.customer.cidade}/${ctx.customer.uf}`);

  if (ctx.cadencia.evidencia === 'SEM_BASE') {
    partes.push(`${ctx.vendas.length} compra(s) no histórico — sem cadência estabelecida`);
  } else {
    partes.push(
      `compra a cada ${Math.round(ctx.cadencia.intervaloMedianoDias ?? 0)} dias, última ${formatarDias(ctx.cadencia.diasDesdeUltimaCompra)}`,
    );
  }

  if (ctx.ticketMedio > 0) partes.push(`ticket médio ${formatarMoeda(ctx.ticketMedio)}`);
  if (ctx.perdas.length > 0) partes.push(`${ctx.perdas.length} perda(s) registrada(s)`);

  return partes.join('; ') + '.';
}

function redigirAnalise(ctx: CustomerContext, familias: ProductFamily[]): string {
  const partes: string[] = [];
  partes.push(`Temperatura: ${ROTULO_TEMPERATURA[ctx.cadencia.temperatura].toLowerCase()}`);

  const naoCompradas = familias.filter((f) => !ctx.familiasCompradas.has(f.id));
  if (naoCompradas.length > 0 && (ctx.frota?.totalVeiculos ?? 0) >= 10) {
    partes.push(
      `compra ${ctx.familiasCompradas.size} de ${familias.length} famílias — há espaço em ${naoCompradas
        .slice(0, 3)
        .map((f) => f.nome.toLowerCase())
        .join(', ')}`,
    );
  }

  if (ctx.perdas.length > 0) {
    const motivo = ctx.perdas[ctx.perdas.length - 1].motivo;
    const rotulo = MOTIVOS_PERDA.find((m) => m.valor === motivo)?.rotulo ?? motivo;
    partes.push(`última perda por ${rotulo.toLowerCase()}`);
  }

  if (ctx.lacunasCriticas.length > 0) {
    partes.push(`${ctx.lacunasCriticas.length} lacuna(s) de cadastro afetam a leitura da conta`);
  }

  return partes.join('; ') + '.';
}

function redigirRecomendacao(rec: Recommendation | null): string {
  if (!rec) {
    return 'Confirmar situação da frota, registrar próxima ação e atualizar cadastro.';
  }
  const passos = [rec.acao];
  if (rec.proximaPergunta) passos.push(`Perguntar: ${rec.proximaPergunta}`);
  passos.push('Registrar o desfecho e a próxima ação antes de encerrar.');
  return passos.join(' ');
}

export function gerarScar(
  ctx: CustomerContext,
  rec: Recommendation | null,
  familias: ProductFamily[],
): ResumoScar {
  return {
    situacao: redigirSituacao(ctx, rec),
    contexto: redigirContexto(ctx),
    analise: redigirAnalise(ctx, familias),
    recomendacao: redigirRecomendacao(rec),
  };
}

/** Objeções prováveis derivadas do histórico REAL de perdas da conta. */
function objecoesProvaveis(ctx: CustomerContext): { objecao: string; resposta: string }[] {
  const contagem = new Map<string, number>();
  for (const p of ctx.perdas) contagem.set(p.motivo, (contagem.get(p.motivo) ?? 0) + 1);

  const catalogo: Record<string, { objecao: string; resposta: string }> = {
    PRECO: {
      objecao: '"Está caro / o concorrente está mais barato."',
      resposta:
        'Pedir o comparativo item a item antes de discutir desconto. Diferença de preço em linha pesada quase sempre esconde diferença de marca, garantia ou prazo.',
    },
    PRAZO: {
      objecao: '"Vocês demoram para entregar."',
      resposta:
        'Dar prazo real e confirmado, nunca otimista. Um prazo cumprido vale mais que um prazo curto quebrado.',
    },
    ESTOQUE: {
      objecao: '"Vocês nunca têm o que preciso."',
      resposta:
        'Reconhecer as ocorrências específicas, mostrar que foram registradas para compras e oferecer alternativa equivalente.',
    },
    MARCA: {
      objecao: '"Não trabalho com essa marca."',
      resposta:
        'Perguntar qual experiência gerou a restrição. Se for aplicação errada no passado, o problema não era a marca.',
    },
    CONCORRENCIA: {
      objecao: '"Já tenho fornecedor."',
      resposta:
        'Não disputar a conta inteira. Perguntar qual sistema o fornecedor atual atende pior e entrar por ali.',
    },
    CREDITO: {
      objecao: '"Meu limite está travado."',
      resposta:
        'Tratar antes de orçar. Orçamento que não fatura consome o mesmo tempo de um que fatura.',
    },
  };

  const doHistorico = [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([motivo]) => catalogo[motivo])
    .filter((x): x is { objecao: string; resposta: string } => x !== undefined);

  if (doHistorico.length > 0) return doHistorico.slice(0, 3);

  // Sem histórico de perda, as objeções mais frequentes do setor.
  return [catalogo.PRECO, catalogo.CONCORRENCIA];
}

export function prepararLigacao(
  ctx: CustomerContext,
  rec: Recommendation | null,
  familias: ProductFamily[],
  referencia = hoje(),
): PreparoLigacao {
  const scar = gerarScar(ctx, rec, familias);

  const perguntas: string[] = [];
  if (rec?.proximaPergunta) perguntas.push(rec.proximaPergunta);
  if (!ctx.frota || ctx.frota.totalVeiculos === null) {
    perguntas.push('Quantos veículos vocês têm rodando hoje, e de quais marcas?');
  }
  if (ctx.contatos.length === 0) {
    perguntas.push('Quem é o responsável pela compra de peças hoje?');
  }
  if (ctx.frota && ctx.frota.perfilOperacao === null) {
    perguntas.push('A operação de vocês é mais rodoviária, urbana ou mista?');
  }
  perguntas.push('Tem algum veículo parado ou perto de parar nesta semana?');
  perguntas.push('Quem faz a manutenção: oficina própria ou terceirizada?');

  const oportunidades: string[] = [];
  const sinais = radarPorFamilia(ctx, familias, referencia);
  const porId = new Map(familias.map((f) => [f.id, f]));
  for (const sinal of sinais.slice(0, 4)) {
    const situacao = situacaoJanela(sinal, referencia);
    const nome = sinal.familyId ? (porId.get(sinal.familyId)?.nome ?? 'Família') : 'Conta';
    if (situacao === 'ABERTA') {
      oportunidades.push(
        `${nome}: janela de reposição aberta (${formatarData(sinal.janelaInicio)} a ${formatarData(sinal.janelaFim)}), baseada em ${sinal.intervalosObservados} intervalos.`,
      );
    } else if (situacao === 'VENCIDA') {
      oportunidades.push(
        `${nome}: janela passou em ${formatarData(sinal.janelaFim)} sem compra — verificar se comprou fora.`,
      );
    }
  }
  const naoCompradas = familias.filter((f) => !ctx.familiasCompradas.has(f.id));
  if (naoCompradas.length > 0 && (ctx.frota?.totalVeiculos ?? 0) >= 15) {
    oportunidades.push(
      `Nunca comprou ${naoCompradas
        .slice(0, 3)
        .map((f) => f.nome.toLowerCase())
        .join(', ')} — perguntar quem atende hoje.`,
    );
  }
  if (oportunidades.length === 0) {
    oportunidades.push(
      'Sem janela de reposição aberta. O objetivo desta conversa é enriquecer o cadastro e mapear a frota.',
    );
  }

  const historicoEssencial: string[] = [];
  const ultimas = [...ctx.vendas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3);
  for (const v of ultimas) {
    historicoEssencial.push(`${formatarData(v.data)} — compra de ${formatarMoeda(v.valorTotal)}`);
  }
  const ultimaInteracao = [...ctx.interacoes].sort((a, b) => b.data.localeCompare(a.data))[0];
  if (ultimaInteracao) {
    historicoEssencial.push(
      `${formatarData(ultimaInteracao.data)} — ${ultimaInteracao.tipo.toLowerCase()}: ${ultimaInteracao.resumo}`,
    );
  }
  for (const p of ctx.perdas.slice(-2)) {
    const rotulo = MOTIVOS_PERDA.find((m) => m.valor === p.motivo)?.rotulo ?? p.motivo;
    historicoEssencial.push(
      `${formatarData(p.data)} — perda de ${formatarMoeda(p.valorEstimado)} por ${rotulo.toLowerCase()}`,
    );
  }
  if (historicoEssencial.length === 0) {
    historicoEssencial.push('Sem histórico registrado nesta conta.');
  }

  const objetivo = rec
    ? rec.acao
    : `Entender a situação atual de ${ctx.customer.nomeFantasia} e registrar próxima ação.`;

  const proximaAcaoEsperada = rec
    ? `Registrar desfecho até ${formatarData(rec.prazo)} e criar a próxima ação ou promessa.`
    : 'Registrar desfecho e definir a próxima ação antes de encerrar a ligação.';

  return {
    objetivo,
    scar,
    perguntas: [...new Set(perguntas)].slice(0, 6),
    oportunidades,
    objecoesProvaveis: objecoesProvaveis(ctx),
    historicoEssencial,
    proximaAcaoEsperada,
    lacunas: ctx.lacunasCriticas,
  };
}

/** Versão em texto puro, para colar em WhatsApp ou transferência interna. */
export function scarComoTexto(preparo: PreparoLigacao, nomeCliente: string): string {
  const linhas = [
    `SCAR — ${nomeCliente}`,
    '',
    `SITUAÇÃO: ${preparo.scar.situacao}`,
    `CONTEXTO: ${preparo.scar.contexto}`,
    `ANÁLISE: ${preparo.scar.analise}`,
    `RECOMENDAÇÃO: ${preparo.scar.recomendacao}`,
    '',
    'PERGUNTAS:',
    ...preparo.perguntas.map((p) => `- ${p}`),
    '',
    'OPORTUNIDADES:',
    ...preparo.oportunidades.map((o) => `- ${o}`),
  ];
  if (preparo.lacunas.length > 0) {
    linhas.push('', 'FALTA SABER:', ...preparo.lacunas.map((l) => `- ${l}`));
  }
  linhas.push(
    '',
    'Gerado pelo BRUTO OS a partir do histórico registrado. Aplicação técnica exige consulta ao catálogo validado.',
  );
  return linhas.join('\n');
}
