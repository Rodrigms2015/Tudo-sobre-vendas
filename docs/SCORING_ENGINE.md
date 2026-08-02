# SCORING_ENGINE.md — Motor de decisão do BRUTO OS

Especificação normativa do motor. Este documento e o código em `src/domain/engine/` devem
permanecer sincronizados; os testes em `src/domain/engine/*.test.ts` verificam os limiares
descritos aqui.

**O motor é determinístico.** Mesma entrada, mesma saída. Não há aleatoriedade, não há modelo
treinado, não há chamada de rede. Isso é uma escolha, não uma limitação: um motor auditável pode
ser discutido pelo vendedor e calibrado pelo gestor.

---

## 1. Cadência — a base de tudo

Quase todo o motor depende de uma única grandeza derivada: a **cadência do cliente**.

### 1.1 Cálculo

Dadas as datas de compra ordenadas `d₁ < d₂ < ... < dₙ` de um cliente (ou de um par
cliente+família), os intervalos são `Iₖ = dₖ₊₁ − dₖ`, com `n − 1` intervalos.

```
intervaloMediano = mediana(I)
desvio           = desvioPadraoAmostral(I)
cv               = desvio / intervaloMediano        // coeficiente de variação
```

Usamos **mediana**, não média: uma única compra atípica (obra, reforma de frota) distorce a média
e corrompe todo o motor. A mediana absorve.

### 1.2 Nível de evidência

Substitui o "grau de confiança" percentual do briefing original (ver `CRITICAL_REVIEW.md` §1.1).

| Nível | Condição |
|---|---|
| `SEM_BASE` | menos de 3 intervalos (isto é, menos de 4 compras) |
| `BASE_FRACA` | 3+ intervalos **e** `cv > 0.60` |
| `BASE_RAZOAVEL` | 4+ intervalos **e** `cv ≤ 0.60` |

Um cliente com 20 compras erráticas **nunca** passa de `BASE_FRACA`. Regularidade importa mais
que volume — um cliente irregular não tem janela previsível, por mais que compre.

**Regra dura:** com `SEM_BASE`, o sistema **não exibe janela de reposição** e **não pontua** os
componentes que dependem de cadência. Ele exibe a lacuna e a pergunta que cria a base.

### 1.3 Atraso relativo

```
atrasoRelativo = diasDesdeUltimaCompra / intervaloMediano
```

Esta é a substituição mais importante do briefing original: **dias absolutos não significam
nada** sem a cadência do cliente. 40 dias é normal para quem compra a cada 90 e catastrófico para
quem compra a cada 7.

### 1.4 Temperatura da conta

| Temperatura | Condição | Leitura comercial |
|---|---|---|
| `SEM_BASE` | evidência `SEM_BASE` | Não sabemos. Enriquecer cadastro. |
| `NO_CICLO` | `atrasoRelativo < 0.8` | Comprou recentemente. Não incomodar sem motivo. |
| `JANELA` | `0.8 ≤ atrasoRelativo < 1.2` | **Hora de ligar.** Maior valor comercial. |
| `ATRASADO` | `1.2 ≤ atrasoRelativo < 2.0` | Passou do ponto. Concorrente pode ter entrado. |
| `PERDA_PROVAVEL` | `atrasoRelativo ≥ 2.0` | Reativação, não reposição. Abordagem diferente. |

---

## 2. Score de oportunidade (0–100)

Mantém a estrutura de pesos do briefing (soma exatamente 100), com as correções de semântica
descritas no `CRITICAL_REVIEW.md` §1.2 e §1.3.

| Componente | Máx | Regra |
|---|---|---|
| `recorrencia` | 20 | Nº de compras nos últimos 365 dias, saturando em 12. `min(20, compras/12 × 20)`. Zero com `SEM_BASE`. |
| `tempoSemCompra` | 15 | Função da temperatura — ver §2.1. **Não** dias absolutos. |
| `orcamentoAberto` | 15 | Valor aberto (escala log, satura em R$ 50k) × fator de idade — ver §2.2. |
| `potencialFrota` | 15 | `min(15, veiculos/50 × 15)`. Zero se a frota não estiver cadastrada (vira lacuna). |
| `urgencia` | 10 | 10 se há veículo parado ativo; 6 se há interação urgente ≤ 3 dias; senão 0. |
| `aderenciaFamilia` | 10 | Penaliza concentração — ver §2.3. |
| `relacionamento` | 5 | Interações úteis nos últimos 90 dias, saturando em 6. |
| `margemPotencial` | 5 | Margem média histórica, normalizada 0–30%. Lacuna se ausente. |
| `compromissoVencido` | 5 | 5 se há promessa vencida; 3 se vence hoje; senão 0. |

Todos os pesos são **calibráveis** em `Configurações → Pesos do motor`, com reset para o padrão.
A soma dos pesos é normalizada para 100 caso o gestor a altere, para que o score continue
comparável.

### 2.1 Componente tempo sem compra

O pico está na **janela**, não no atraso máximo. O objetivo é ligar **antes** do concorrente, não
catalogar clientes já perdidos.

| Temperatura | Fração do peso |
|---|---|
| `NO_CICLO` | 0% |
| `JANELA` | **100%** |
| `ATRASADO` | 80% |
| `PERDA_PROVAVEL` | 45% |
| `SEM_BASE` | 0% + lacuna registrada |

`PERDA_PROVAVEL` pontua menos de propósito: é uma conversa mais longa, de menor probabilidade,
que não deve tomar o topo do dia de uma conta em janela. Ela aparece no modo **Carteira
Esquecida**, que é o lugar certo para ela.

### 2.2 Componente orçamento aberto

```
base  = min(1, log10(1 + valorAberto) / log10(1 + 50000))
idade = diasDesdeEmissao ≤ 2 ? 0.5      // ainda quente, não é risco
      : diasDesdeEmissao ≤ 7 ? 1.0      // janela ideal de follow-up
      : diasDesdeEmissao ≤ 15 ? 0.85
      : 0.6                              // esfriou, mas ainda vale tentar
pontos = 15 × base × idade
```

Escala logarítmica porque a diferença entre R$ 1k e R$ 10k importa muito mais que entre
R$ 40k e R$ 50k.

### 2.3 Componente aderência de família

Mede **oportunidade não explorada**, então pontua alto quem compra pouca variedade tendo
potencial. Seja `f` o número de famílias distintas compradas em 365 dias e `F` o total de
famílias do catálogo:

```
cobertura = f / F
pontos    = 10 × (1 − cobertura) × fatorPotencial
```

onde `fatorPotencial = min(1, veiculos / 20)`. Um cliente de 2 veículos que compra uma família só
não é oportunidade; um de 60 veículos que compra uma família só é a maior oportunidade da
carteira.

---

## 3. Tipo de ação — o eixo ortogonal ao score

Score sozinho é insuficiente (`CRITICAL_REVIEW.md` §1.2). Toda recomendação recebe um **tipo**,
e o tipo tem **precedência** sobre o score na ordenação do Cockpit.

| Tipo | Precedência | Gatilho |
|---|---|---|
| `URGENCIA` | 1 | Veículo parado ativo |
| `COMPROMISSO` | 2 | Promessa vencida ou vencendo hoje |
| `RECUPERACAO` | 3 | Orçamento aberto em risco |
| `REPOSICAO` | 4 | Temperatura `JANELA` ou `ATRASADO` |
| `REATIVACAO` | 5 | Temperatura `PERDA_PROVAVEL` |
| `EXPANSAO` | 6 | Aderência de família baixa com potencial alto |
| `CADASTRO` | 7 | Lacunas críticas em conta de alto potencial |

**Ordenação final:** `(precedênciaDoTipo ASC, score DESC)`.

Consequência desejada: um veículo parado com score 52 fica **acima** de uma expansão com score
88. Uma promessa vencida nunca é enterrada por uma oportunidade maior. Isso é o que um gerente
comercial experiente faria — e o motor agora faz.

---

## 4. Confiança da recomendação

Discreta e derivada de **completude de dados**, nunca de probabilidade.

| Confiança | Condição |
|---|---|
| `ALTA` | evidência `BASE_RAZOAVEL` **e** nenhuma lacuna crítica |
| `MEDIA` | evidência `BASE_FRACA` **ou** exatamente 1 lacuna crítica |
| `BAIXA` | evidência `SEM_BASE` **ou** 2+ lacunas críticas |

Lacunas críticas: frota não cadastrada, sem contato registrado, sem histórico de margem,
sem segmento definido.

Recomendações `BAIXA` **nunca** entram no Top 3 do Cockpit — vão para a fila secundária, com a
lacuna em destaque como convite ao enriquecimento.

---

## 5. Valor potencial

```
valorPotencial = ticketMedio × multiplicadorDoTipo
```

| Tipo | Multiplicador | Racional |
|---|---|---|
| `URGENCIA` | 1.4 | Urgência costuma levar itens correlatos |
| `RECUPERACAO` | — | Usa o valor real do orçamento aberto, não estimativa |
| `REPOSICAO` | 1.0 | Ticket médio do cliente |
| `REATIVACAO` | 0.6 | Primeiro pedido de volta costuma ser menor |
| `EXPANSAO` | 0.8 | Família nova entra em volume menor |
| `COMPROMISSO` / `CADASTRO` | 0.5 / 0 | Valor indireto; `CADASTRO` não promete receita |

Sempre exibido como **estimativa**, com o ticket médio e o número de compras que o originaram
visíveis no card. Nunca exibido como previsão de receita.

---

## 6. Motor ANDON

### 6.1 Tipos e severidade base

| Tipo | Severidade | Gatilho |
|---|---|---|
| `VEICULO_PARADO` | Crítico | Interação urgente aberta |
| `PROMESSA_VENCIDA` | Crítico | `dataPrometida < hoje` e não cumprida |
| `ORCAMENTO_PARADO` | Atenção → Crítico se ≥ 10 dias e ≥ R$ 10k | Orçamento aberto sem interação ≥ 5 dias |
| `CLIENTE_ESFRIANDO` | Atenção | `PERDA_PROVAVEL` com histórico forte (≥ 6 compras) |
| `PERDA_POR_ESTOQUE` | Atenção → Crítico se reincidente | Perda por estoque ≤ 30 dias |
| `MARGEM_BAIXA` | Atenção | Margem da venda abaixo do piso configurado |
| `CONTA_IMPORTANTE_SEM_CONTATO` | Atenção | Top 20% de potencial, sem interação ≥ 30 dias |
| `KIT_INCOMPLETO` | Informação | Venda de item de kit sem os correlatos em 30 dias |
| `DEMANDA_REPETIDA_SEM_ESTOQUE` | Atenção | Mesma família perdida por estoque ≥ 2× em 60 dias |
| `QUEDA_DE_COMPORTAMENTO` | Atenção | Volume 90d < 40% do volume dos 90d anteriores |
| `CADASTRO_CRITICO` | Informação | Alto potencial sem frota ou sem contato |

### 6.2 Controle de ruído (obrigatório)

Implementado em `andon.ts` e verificado por teste:

1. **Deduplicação por conta:** um cliente gera no máximo **um** alerta crítico. Os demais viram
   contexto dentro dele.
2. **Orçamento de severidade:** no máximo **3 críticos** simultâneos por vendedor. O quarto é
   rebaixado a atenção.
3. **Reconhecimento com motivo:** alerta `ACK` não retorna pela mesma causa dentro da janela de
   silêncio (padrão 7 dias).
4. **Sem ação, sem alerta:** alerta cuja `acaoSugerida` seria vazia não é criado.

### 6.3 Formato obrigatório

Todo alerta contém, sem exceção: `oQueAconteceu`, `porQueImporta`, `impactoEstimado`,
`acaoSugerida`, `responsavel`, `prazo`. Imposto pelo tipo `Alert`.

---

## 7. Radar de Reposição

```
janelaInicio = ultimaCompra + intervaloMediano × 0.85
janelaFim    = ultimaCompra + intervaloMediano × 1.15
```

Só é calculada quando a evidência é `BASE_FRACA` ou melhor. Com `BASE_RAZOAVEL` a janela usa o
fator ±0.15; com `BASE_FRACA`, alarga para ±0.30 — janela larga é honesta quando a base é fraca.

Exibe sempre: fatores usados, nível de evidência, **número de intervalos observados**, dados
ausentes e a próxima pergunta a fazer ao cliente.

Nunca exibe: probabilidade, data única, previsão de falha, ou a palavra "prever".

---

## 8. Grafo de oportunidade

Opera em `Sistema → Família → Família correlata`. **Nunca** desce a peça, código, marca ou
modelo de veículo (`CRITICAL_REVIEW.md` §1.4).

As arestas são **correlação comercial de cesta**, calculada sobre o histórico de vendas:

```
suporte(A→B) = pedidos que contêm A e B / pedidos que contêm A
```

Arestas do seed de demonstração são marcadas `DEMONSTRACAO`. Arestas calculadas do histórico
importado são marcadas `CONFIRMADO` com o número de pedidos que as sustentam.

Cada nó gera **perguntas para o vendedor fazer**, não itens para vender.

---

## 9. Simulador de Cenários

**Não é IA e o produto diz isso na tela.** É uma matriz de respostas com rubrica escrita.

Cada cenário tem 3–4 respostas possíveis. Cada resposta tem nota 0–3 em seis critérios: clareza,
investigação, valor, risco, fechamento, próxima ação. A rubrica é conteúdo de domínio escrito à
mão, não geração.

O feedback explica **por que** cada critério recebeu a nota, e mostra a melhor resposta com o
raciocínio. A arquitetura isola a avaliação atrás da interface `AvaliadorDeResposta`, para que uma
integração futura com modelo de linguagem seja substituição de implementação, não reescrita.

---

## 10. Contrato de explicabilidade

```ts
interface Explicavel {
  fatores: Fator[];       // { rotulo, peso, evidencia }
  penalidades: Fator[];
  lacunas: string[];
  proximaPergunta: string | null;
}
```

`Recommendation`, `Alert` e `RadarSignal` estendem `Explicavel`. **Não é possível criar uma saída
do motor sem explicação sem quebrar a compilação TypeScript.** A Seção 1.7 do PROMPT_MASTER
("sempre explique por que a recomendação foi exibida") vira garantia estrutural.

---

## 11. Aprendizado com aceitação e rejeição

Aceitar ou rejeitar registra um `RecommendationFeedback` com motivo. O motor usa isso de forma
**conservadora e explícita**:

- Rejeição com motivo `NAO_E_MEU_CLIENTE` ou `JA_RESOLVIDO` suprime a recomendação por 30 dias.
- Rejeição com motivo `MOMENTO_ERRADO` adia 7 dias.
- 3+ rejeições do mesmo tipo para o mesmo cliente reduzem a prioridade daquele tipo naquela conta
  em 20%, com o ajuste **visível** no card ("prioridade reduzida por 3 rejeições anteriores").

Não há aprendizado oculto. Nenhum ajuste acontece sem que o vendedor consiga ver que aconteceu e
por quê.

---

## 12. Testes que protegem esta especificação

| Teste | Garante |
|---|---|
| `cadence.test.ts` | Mediana, CV, níveis de evidência, limiares de temperatura |
| `scoring.test.ts` | Cada componente no máximo e no mínimo; soma ≤ 100; calibração |
| `recommendations.test.ts` | Precedência de tipo sobre score; `BAIXA` fora do Top 3; ≥ 20 no seed |
| `andon.test.ts` | Teto de 3 críticos; dedupe por conta; ≥ 10 alertas no seed; campos obrigatórios |
| `radar.test.ts` | Nenhuma janela com `SEM_BASE`; largura por nível de evidência |
| `explicabilidade.test.ts` | Nenhuma saída do motor sem fatores ou evidências |
