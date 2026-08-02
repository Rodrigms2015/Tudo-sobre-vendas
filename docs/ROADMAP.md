# ROADMAP.md — BRUTO OS

Nada deste roadmap aparece na interface como "em breve" (PROMPT_MASTER §16). O produto entregue
está completo no seu escopo; o que está aqui é evolução, não pendência.

---

## Fase 0 — MVP (entregue)

Aplicação cliente completa, offline, instalável, sem backend.

| Módulo | Estado |
|---|---|
| Landing institucional | Completo |
| Cockpit do Dia | Completo |
| Radar da Carteira + filtros | Completo |
| Perfil 360 + Preparar ligação (SCAR) | Completo |
| Diagnóstico Guiado (12 etapas) | Completo |
| Grafo de Oportunidade (nível família) | Completo |
| Next Best Action + aceite/rejeição | Completo |
| Painel ANDON com controle de ruído | Completo |
| Inteligência de Venda Perdida | Completo |
| Simulador de Cenários | Completo |
| Debriefing pré-preenchido | Completo |
| Centro de Conhecimento | Completo |
| Telemetria Comercial | Completo |
| Modos de foco (4) | Completo |
| Importação/exportação CSV e JSON | Completo |
| Calibração de pesos | Completo |
| PWA offline | Completo |

**Fora do MVP, com justificativa registrada no `CRITICAL_REVIEW.md` §2:** roteirização
geográfica, registro por voz, gamificação, previsão de falha, autenticação, sincronização.

---

## Fase 1 — Validação em campo (4–6 semanas)

Objetivo: descobrir se as hipóteses H1–H5 do `PRODUCT_VISION.md` §10 se sustentam. **Sem escrever
funcionalidade nova.**

| Entrega | Por quê |
|---|---|
| Piloto com 3 vendedores reais e carteira real importada | Nenhuma decisão de roadmap antes disto |
| Instrumentação local das métricas do §8 | Medir tempo até primeira ação, aceitação, resultado |
| Ajuste dos limiares de cadência com dados reais | `0.8/1.2/2.0` é uma hipótese, não uma verdade |
| Modelos de CSV por ERP (Sankhya, Protheus, Winthor) | O maior atrito de adoção é o formato do arquivo |

**Critério para avançar:** aceitação de recomendações entre 40% e 70% **e** perdas classificadas
acima de 50%. Fora disso, o problema é o motor — corrigir antes de construir mais.

---

## Fase 2 — Backend opcional (6–8 semanas)

A aplicação **continua funcionando integralmente sem esta camada**. Isso é requisito, não meta.

| Entrega | Detalhe |
|---|---|
| Cloudflare Workers + D1 | API de sincronização |
| Autenticação | Sessão por e-mail/senha ou SSO da distribuidora |
| Sincronização multiusuário | Última escrita vence por campo, com registro de conflito |
| Permissões por papel | Vendedor vê sua carteira; gestor vê a equipe |
| Auditoria no servidor | `AuditEvent` replicado |
| Visão de equipe para o gestor | Comparação entre carteiras |

**Regra de arquitetura:** o IndexedDB continua sendo a fonte de verdade local. O servidor é
espelho, não mestre. Se o Worker cair, o vendedor não para.

---

## Fase 3 — Catálogo validado (depende de terceiro)

A funcionalidade de maior valor e a que **não depende de nós**.

| Entrega | Pré-requisito |
|---|---|
| Importação de catálogo de aplicações | Base validada do fabricante ou do TecDoc |
| `VehicleApplication` populada | Idem |
| Grafo descendo a nível de peça | Somente com catálogo validado |
| Verificação de aplicação no diagnóstico | Idem |
| Procedência por fonte de catálogo | Rastreabilidade da afirmação |

**Regra inegociável:** nenhuma aplicação técnica é exibida sem fonte de catálogo rastreável. Se a
Fase 3 não acontecer, o produto permanece correto — apenas mais limitado. Ele **nunca** preenche
essa lacuna com estimativa.

---

## Fase 4 — Integração com ERP (8–12 semanas)

| Entrega | Impacto |
|---|---|
| Estoque em tempo real | Elimina a maior causa de venda perdida |
| Preço e tabela | Simulação de proposta com margem real |
| Situação de crédito | Evita orçamento que não fatura |
| Importação incremental automática | Fim da importação manual |

---

## Fase 5 — Camada de linguagem (opcional, condicionada)

Só acontece se a Fase 1 mostrar que o Simulador de Cenários é usado de verdade.

| Entrega | Guarda-corpo |
|---|---|
| Avaliação de resposta livre no simulador | Interface `AvaliadorDeResposta` já isola a implementação |
| Redação de SCAR em linguagem natural | Fatos vêm do motor determinístico; o modelo apenas redige |
| Resumo de interações | Idem |

**Restrições permanentes:** o modelo **nunca** determina prioridade, score, ou aplicação técnica.
Ele redige o que o motor determinou. Toda saída de modelo é rotulada como gerada. Nenhum dado de
cliente sai do dispositivo sem consentimento explícito e por operação.

---

## Nunca faremos

Declarado para que não seja pedido de novo:

| Item | Motivo |
|---|---|
| Previsão de falha mecânica | Não temos telemetria de veículo. Seria mentira. |
| Score de propensão "por IA" sem explicação | Viola o princípio P1. |
| Gamificação com medalhas e rankings | Vendedor sênior desliga o produto. |
| Aplicação técnica inferida por similaridade | O risco físico e comercial é real. |
| Discagem automática / robô de ligação | O produto existe para melhorar a ligação, não para automatizar o volume. |
| Venda de dados agregados da carteira | Quebra de confiança irrecuperável. |
