# PRODUCT_VISION.md — BRUTO OS

> O sistema operacional de vendas da linha pesada.
>
> Pare de ligar para todo mundo. Ligue para a conta certa, com a peça certa, no momento certo.

---

## 1. A pergunta que o produto responde

Toda tela do BRUTO OS existe para responder uma única pergunta:

> **Qual é a melhor ação que este vendedor deve executar agora, por qual motivo e com qual
> abordagem?**

Se uma tela não contribui para essa resposta, ela não entra no produto. Esse é o critério de
corte usado em todas as decisões de escopo registradas no `CRITICAL_REVIEW.md`.

---

## 2. O problema, dito sem eufemismo

O vendedor de distribuidora de linha pesada começa o dia com uma lista de clientes e nenhuma
priorização. Ele liga por ordem alfabética, por memória afetiva ou por quem gritou mais alto
ontem. Enquanto isso:

- um cliente que compra kit de embreagem a cada 60 dias está no dia 71 e ninguém percebeu;
- um orçamento de R$ 14 mil está parado há 9 dias sem uma única interação;
- uma promessa de retorno feita na terça venceu na quarta;
- uma venda foi perdida por falta de estoque e essa informação morreu num campo de observação;
- um cliente com 40 veículos compra apenas filtros, e ninguém nunca perguntou por freio.

Nada disso é falta de esforço. É **falta de camada de decisão**. O ERP registra o passado.
A planilha organiza o presente. Nenhum dos dois diz o que fazer nos próximos vinte minutos.

---

## 3. O que o BRUTO OS é

**A camada de decisão entre a carteira e a próxima ação comercial.**

Ele consome o que a distribuidora já tem — histórico de vendas, orçamentos, cadastro — e produz
três coisas que hoje não existem:

1. **Prioridade justificada.** Não uma lista, mas uma ordem com motivo auditável.
2. **Preparo de abordagem.** Não um script genérico, mas um resumo SCAR do cliente específico.
3. **Memória operacional.** A perda, a promessa e o aprendizado voltam para o sistema em vez de
   morrerem na cabeça do vendedor.

## 4. O que o BRUTO OS não é

- **Não é CRM.** Não disputa com o CRM o registro de cadastro. Consome e devolve.
- **Não é catálogo.** Não afirma aplicação técnica. Recusa-se a isso por construção.
- **Não é dashboard.** Todo número exibido tem um botão que leva a uma ação.
- **Não é treinamento passivo.** O conhecimento aparece no momento da ligação, não num curso.
- **Não é IA.** É um motor de regras determinístico, auditável e discutível — o que é uma
  vantagem, não uma limitação: o vendedor pode discordar dele com argumentos.

---

## 5. Princípios de produto

### P1 — Nenhuma recomendação sem raciocínio exposto
Imposto pelo tipo `Explicavel`. É impossível compilar uma recomendação sem fatores e evidências.

### P2 — Precisão honesta vence cobertura fabricada
Cobrir 30% da carteira com um sinal confiável é melhor que 100% com um sinal que se aprende a
ignorar. Quando não há base, o sistema diz "sem base" e informa qual pergunta cria essa base.

### P3 — Dado ausente é oportunidade, não espaço em branco
Toda lacuna vira tarefa de enriquecimento com valor estimado e pergunta pronta.

### P4 — Conhecimento comercial e aplicação técnica nunca se misturam
Correlação de cesta ("quem compra kit costuma precisar de rolamento") é conhecimento comercial.
Aplicação veículo-motor-peça é catálogo. A primeira o sistema afirma. A segunda ele recusa até
receber catálogo validado.

### P5 — Alerta que não morre é ruído
Orçamento de severidade, deduplicação por conta, reconhecimento obrigatório com motivo.

### P6 — O celular é o dispositivo principal
O vendedor externo usa o produto com uma mão, em pé, no pátio do cliente. O desktop é o caso
secundário.

### P7 — Cada card gera uma ação
Nenhum card informativo puro no fluxo principal. Se não há ação, não há card.

---

## 6. Diferenciação defensável

O que um concorrente não copia em um trimestre:

| Diferencial | Por que é difícil de copiar |
|---|---|
| **Cadência relativa por cliente** | Exige repensar o modelo de temperatura, não adicionar um campo. Todo CRM usa dias absolutos porque é o que a tabela entrega. |
| **Recusa estrutural de aplicação técnica** | É uma decisão de produto contra o instinto comercial de "mostrar mais". Concorrentes preferem parecer completos. |
| **Contrato de explicabilidade no tipo** | Exige que a arquitetura nasça assim. Retrofit é caríssimo. |
| **Perda como insumo, não como relatório** | Exige que o registro de perda seja rápido o bastante para acontecer. Um formulário de 12 campos nunca é preenchido. |
| **Vocabulário do setor** | Veículo parado, kit completo, aplicação, linha pesada. Não se traduz de um CRM genérico. |

---

## 7. Usuários e o que cada um obtém

### Vendedor interno
Abre o Cockpit e sabe em 10 segundos: as 3 contas do dia, o orçamento em risco, a promessa
vencendo. Clica em "Preparar ligação" e recebe SCAR, perguntas e objeções prováveis.

### Vendedor externo
Abre o Plano de Visitas agrupado por cidade, com objetivo definido por visita. Registra o
resultado em uma tela, offline, no pátio do cliente.

### Gestor
Vê onde a equipe perde (motivo, valor, família, reincidência), quais ações estão atrasadas e se
a equipe vende solução ou tira pedido. Calibra os pesos do motor sem tocar em código.

---

## 8. Métricas de sucesso

**Métrica norte:** *tempo até a primeira ação útil do dia* — abrir o app e executar a primeira
ação recomendada. Meta: **abaixo de 90 segundos**.

**Métricas de saúde do motor** (aceitação sempre pareada com resultado, ver `CRITICAL_REVIEW.md` §4.5):

| Métrica | Meta | Antifraude |
|---|---|---|
| Recomendações aceitas | 40–70% | Acima de 85% indica motor recomendando só o fácil |
| Promessas cumpridas | > 80% | Resultado real, não aceitação |
| Orçamentos recuperados | > 25% | Resultado real |
| Clientes reativados | crescente | — |
| Cadastros enriquecidos | > 5/semana | Alimenta a qualidade do motor |
| Perdas classificadas | > 90% | Se cair, o loop de aprendizado morre |

**Anti-métrica declarada:** volume de ligações. Não é medido como qualidade em lugar nenhum do
produto.

---

## 9. Escopo do MVP

**Dentro:** Landing, Cockpit, Radar da Carteira, Perfil 360, Diagnóstico Guiado, Grafo de
Oportunidade (nível família), Next Best Action, ANDON, Venda Perdida, Simulador de Cenários,
Debriefing, Centro de Conhecimento, Telemetria, Importação/Exportação, Configurações de peso,
PWA offline.

**Fora, com justificativa registrada:** rota geográfica, registro por voz, gamificação, previsão
de falha, autenticação, sincronização, integração de estoque/preço/catálogo.

---

## 10. Hipóteses a validar

| # | Hipótese | Como validar | Falseia se |
|---|---|---|---|
| H1 | O vendedor confia mais em prioridade explicada que na própria memória | Taxa de aceitação das 3 primeiras ações | Aceitação < 30% de forma sustentada |
| H2 | Cadência relativa acerta mais que dias absolutos | Comparar conversão das duas listas em A/B | Conversão igual ou pior |
| H3 | Registrar perda em < 20s faz o registro acontecer | % de perdas classificadas | Fica abaixo de 50% |
| H4 | Lacuna com valor estimado motiva enriquecimento | Cadastros enriquecidos/semana | Fica em zero |
| H5 | Debriefing pré-preenchido sobrevive à segunda semana | Uso na semana 3 vs. semana 1 | Queda > 60% |

---

## 11. Definição de pronto

O produto está pronto quando o vendedor, ao abrir o app pela primeira vez em um dia comum, diz:

> "Agora eu sei exatamente onde agir, o que perguntar, por que essa conta importa e qual é o
> próximo passo."

E quando o vendedor sênior — o cético, o que já viu cinco CRMs fracassarem — não consegue apontar
uma única tela onde o sistema afirma algo que não pode provar.
