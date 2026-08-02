# USER_JOURNEYS.md — Jornadas de uso

Cada jornada tem um **orçamento de tempo** e um **orçamento de cliques**. Eles são requisitos,
não aspirações: uma jornada que estoura o orçamento é um defeito de design.

---

## J1 — Abertura do dia (vendedor interno) · 90 s · 3 cliques

**Gatilho:** 8h05, café na mão.

1. Abre o app → **Cockpit**. Vê a faixa do dia: 12 ações, 3 críticas, meta 8.
2. Lê o ANDON crítico (máximo 3, dedupe por conta):
   - `VEICULO_PARADO` — Viação Serra Azul, ônibus parado, sistema de embreagem.
   - `PROMESSA_VENCIDA` — Transportes Kaeté, retorno prometido ontem.
   - `ORCAMENTO_PARADO` — Frota Rio Claro, R$ 18.400 parados há 11 dias.
3. Lê o Top 3, cada card com fatores e evidências visíveis.
4. Toca **Iniciar próxima ação** → abre o card 1 com SCAR pronto.

**Sucesso:** primeira ligação em menos de 90 segundos, sabendo o motivo.
**Falha:** vendedor rola a tela procurando o que fazer. → Cockpit falhou.

---

## J2 — Preparar e executar uma ligação · 40 s de preparo · 2 cliques

**Gatilho:** ação escolhida no Cockpit.

1. **Preparar ligação** gera:
   - **Objetivo:** confirmar necessidade de reposição de embreagem e checar itens correlatos.
   - **SCAR:**
     - *Situação:* 18 veículos, última compra de embreagem há 71 dias.
     - *Contexto:* cadência mediana 60 dias, base razoável (5 intervalos), ticket R$ 4.200.
     - *Análise:* dentro da janela alargada; compra apenas 2 de 14 famílias; frota compatível com
       freio e arrefecimento.
     - *Recomendação:* confirmar aplicação, oferecer kit completo, registrar próxima ação.
   - **Perguntas:** quantos veículos rodando hoje? Quilometragem média? Quem instala?
   - **Objeções prováveis:** preço, prazo, "já tenho fornecedor" — cada uma com resposta sugerida.
2. Liga. Registra o resultado em uma tela: útil? avançou? promessa? perda?
3. Se prometeu retorno, cria a promessa **na mesma tela** — sem navegar.

**Sucesso:** registro completo em menos de 20 segundos após desligar.
**Falha:** vendedor não registra. → Registro está longo demais.

---

## J3 — Veículo parado (urgência) · 60 s até resposta ao cliente

**Gatilho:** cliente liga com ônibus parado.

1. Cockpit → **Modo Veículo Parado**. Cronômetro operacional inicia (sem contagem regressiva
   agressiva — informa, não pressiona).
2. Captura em campos grandes: cliente, veículo, sistema, sintoma, urgência, localização.
3. O sistema **não afirma aplicação**. Mostra:
   - perguntas de validação técnica que o vendedor precisa fazer;
   - famílias correlatas do sistema (nível família, marcado como conhecimento comercial);
   - alerta explícito: *aplicação técnica exige consulta ao catálogo validado*.
4. Registra retorno prometido → vira `Promise` com prazo.
5. Gera SCAR para transferência interna (compras, técnico, gerente).

**Sucesso:** cliente recebe uma resposta com prazo em 60 segundos.
**Falha:** o sistema sugere uma peça específica. → Violação de P4. Bug crítico.

---

## J4 — Recuperar orçamento · 5 min para 4 orçamentos

1. Cockpit → **Modo Recuperar Orçamento**. Lista ordenada por valor × risco.
2. Cada linha: valor, dias parado, última interação, motivo provável, roteiro curto.
3. Ação inline por linha: `Ligar` · `Ajustar` · `Marcar perdido`.
4. "Marcar perdido" abre o registro de perda em **um passo**, com motivo pré-selecionado pelo
   sinal mais provável — o vendedor confirma ou corrige.

**Sucesso:** 4 orçamentos tratados em 5 minutos, todos com desfecho registrado.

---

## J5 — Diagnóstico guiado (evitar venda errada) · 12 etapas, 90 s

**Gatilho:** cliente pede uma peça sem dar contexto suficiente.

Etapas: tipo de cliente → veículo → marca → modelo → ano → motor → sistema → sintoma → urgência →
operação → peça solicitada → informações faltantes.

Cada etapa é pulável e o pulo **vira lacuna explícita** no resultado.

Saída — quatro blocos visualmente distintos:
- **Confirmado** (o que o cliente afirmou);
- **Estimado** (o que o sistema derivou, com o critério);
- **Ausente** (o que falta);
- **Hipótese + validação necessária** (o que consultar no catálogo antes de vender).

**Sucesso:** vendedor sai com uma lista de perguntas, não com um número de peça.
**Falha:** o sistema conclui uma peça. → Violação de P4.

---

## J6 — Registrar venda perdida · 20 s · 4 toques

**Gatilho:** o negócio caiu.

1. Botão de perda disponível no Perfil 360, no orçamento e no Cockpit.
2. Motivo em grade de 14 botões grandes (um toque).
3. Valor estimado pré-preenchido a partir do orçamento.
4. Recuperável? Sim/Não. Detalhe opcional.
5. Salvar.

**Por que 20 s importa:** perda registrada é o insumo de todo o módulo de inteligência. Um
formulário de 12 campos garante zero registro, e o módulo inteiro morre com ele.

---

## J7 — Plano de visitas (vendedor externo) · 3 min

1. **Carteira → Plano de Visitas**. Agrupamento por cidade, ordenado por prioridade e janela.
2. Cada parada: objetivo, histórico em 3 linhas, oportunidades, pendências.
3. Não há rota geográfica — e a tela **diz** que agrupa por cidade, sem prometer otimização
   (`CRITICAL_REVIEW.md` §2).
4. Registro offline em campo; sincroniza com o IndexedDB local ao voltar.

---

## J8 — Debriefing · 60 s

**Gatilho:** após as 16h, card aparece no Cockpit.

1. Chega **pré-preenchido** com as ações realmente registradas no dia.
2. O vendedor confirma, corrige o que estiver errado, e responde duas perguntas abertas:
   *o que travou?* e *qual aprendizado?*
3. Define a prioridade de amanhã (uma linha).
4. Exporta o resumo (texto ou JSON).

**Sucesso:** 60 segundos, sem digitar mais que duas frases.
**Falha:** formulário em branco. → O pré-preenchimento falhou; ninguém preencherá.

---

## J9 — Gestor revisando a equipe · 5 min

1. **Telemetria.** Não abre com faturamento: abre com **execução** — contatos úteis, promessas
   cumpridas, perdas classificadas, avanço de oportunidade.
2. **Perdas.** Ranking de motivos, tendência, valor, famílias afetadas, clientes reincidentes.
   Cada motivo aponta o gargalo: preço → comercial; estoque → compras; aplicação → treinamento.
3. **Calibração.** Ajusta os pesos do motor e vê o efeito na fila **imediatamente**, sem
   recarregar nem migrar dados.

---

## J10 — Importar carteira real · 4 min

1. **Dados → Importar.** Consentimento explícito antes de qualquer leitura.
2. Seleciona entidade e arquivo. Modelo de CSV disponível para download.
3. Prévia: linhas lidas, aceitas, rejeitadas, com o motivo por linha.
4. Confirma. Importação parcial — o que é válido entra.
5. CSV de erros exportável para correção no ERP.
6. O selo de demonstração some automaticamente quando dados reais entram.

---

## J11 — Primeira sessão (onboarding) · 30 s

1. Landing → **Entrar no Cockpit**.
2. Estado vazio com duas opções: `Carregar dados de demonstração` ou `Importar meus dados`.
3. Com a demonstração carregada, o Cockpit está populado e o selo aparece.
4. Nenhum tour, nenhum tutorial modal. O produto se explica pelos próprios cards.

---

## Anti-jornadas (que o produto recusa)

| Anti-jornada | Por quê |
|---|---|
| "Ver todos os clientes em ordem alfabética e ligar de cima para baixo" | É o problema que o produto existe para eliminar. Não há essa visão como padrão. |
| "Descobrir qual peça serve neste caminhão" | Aplicação técnica não é inferida. Só catálogo validado. |
| "Ver um gráfico bonito do mês" | Todo número leva a uma ação. Não há gráfico sem saída acionável. |
| "Receber um alerta para cada coisa que mudou" | Orçamento de severidade. Alerta sem ação não existe. |
