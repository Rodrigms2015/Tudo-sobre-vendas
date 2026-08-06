# Central de Compras — Filial 03, Ribeirão Preto

**Rodrigo Menezes C. Soares — Supervisor, Filial Ribeirão Preto**
Base: relatórios do Opus de 06/08/2026 (estoque das 5 filiais de SP) e de 05/01 a 31/07/2026 (movimentação).

---

## 1. O problema

O Opus entrega os dados, mas não entrega decisão. O relatório de estoque de Ribeirão Preto tem
**9.382 linhas**, das quais **4.770 estão com saldo zero**. Nenhuma pessoa decide compra
olhando 4.770 linhas — e enquanto não se decide, a falta continua.

Pior: "saldo zero" não é a mesma coisa que "falta". Boa parte dessas linhas é variante fiscal
do mesmo item, ou item que tem similar com saldo na prateleira ao lado, ou item que não vende
há um ano. Sem separar isso, qualquer pedido de compra é palpite.

Foi esse o problema que eu decidi resolver.

## 2. O que foi construído

Uma plataforma de análise que recebe os relatórios do Opus **exatamente como eles saem** —
estoque em Excel, movimentação em PDF — e devolve decisão de compra com o motivo escrito ao
lado de cada item.

Está no ar, com login individual, acessível de qualquer computador ou celular:
**https://central-compras-ribeirao-preto.netlify.app**

Cinco acessos ativos. Todo mundo abre a mesma base: quem sobe um relatório publica para os
outros na hora, e fica registrado quem alterou o quê.

**Sete telas:**

| Tela | O que responde |
|---|---|
| Painel | Qual o tamanho real do problema hoje |
| Comprar | O que comprar nesta semana, e por quê, item a item |
| Oportunidades | O que já está na prateleira e precisa girar — pauta pronta para os vendedores |
| Demanda | Quanto cada peça realmente saiu, medido, não estimado |
| **Rede** | **Como estamos em relação às filiais irmãs — e o que pedir de abastecimento** |
| Evolução | O que mudou de um envio para o outro |
| Situação | O que está carregado, o que gravou, e a qualidade do cadastro |

**Três decisões de projeto que sustentam o resto:**

1. **Nada é inventado.** Onde falta dado, a tela diz que falta e o item não pontua naquele
   critério. Não existe número preenchido por estimativa disfarçada de medição.
2. **Toda nota tem explicação.** Cada item mostra os fatores que formaram a prioridade dele,
   com a evidência concreta — "vendeu 216 un em 208 dias", não "score 84".
3. **O leitor de arquivo foi conferido célula a célula** contra uma ferramenta de referência
   independente: 9.388 linhas × 7 colunas idênticas. Detalhe que parece bobo e não é: o
   Opus escreve `1.718` para mil setecentos e dezoito. Um leitor comum entende 1,718 e perde
   1.717 unidades num único campo.

---

## 3. O que já apareceu nos dados

### 3.1 A lista de falta cai de 4.770 para 1.178

Separando variante fiscal de item distinto, e descontando quem tem similar com saldo:

| | Itens |
|---|---:|
| Linhas com saldo zero no relatório | 4.770 |
| **Ruptura real** — zerado e sem nenhum similar com saldo | **1.178** |
| Prioridade alta | 1.349 |
| **Nota 70 ou mais — comprar nesta semana** | **155** |

De 4.770 linhas para 155 decisões. É a diferença entre um relatório e uma pauta de trabalho.

### 3.2 Venda medida, não estimada

Movimentação de 05/01 a 31/07/2026 — **28.908 lançamentos, 208 dias**:

- **84.192 unidades** de saída, 3.821 peças diferentes, **405 unidades por dia**
- **566 itens estão zerados e tiveram venda comprovada no período** — é venda que está sendo
  perdida hoje, não risco futuro
- 26.383 unidades paradas em 344 itens de giro baixo

*Ressalva honesta:* esse relatório cobre **33% do cadastro** (3.099 de 9.382 itens). Para os
itens de fora, a plataforma **não conclui que não venderam** — continua avaliando pela curva
ABC e diz isso na tela. Rodando o mesmo relatório sem filtrar produto, a cobertura vai a 100%.
É o item 5.3 do pedido abaixo.

### 3.3 Venda nossa que outra filial faturou

No relatório analítico de julho, com a coluna de filial faturadora:

- **1.057 unidades — 9,7% de tudo que saiu — foram faturadas por outra filial**, em 37 peças
- **100% dentro do estado de São Paulo.** Nenhuma unidade saiu por filial de outro estado
- São José do Rio Preto foi quem mais faturou por nós

Venda dentro de SP faturada por outra praça é, em regra, peça que devia estar na nossa
prateleira: o cliente é nosso, o pedido apareceu aqui, e o giro foi para outro CNPJ.

*Escopo:* este recorte cobre 51 produtos de julho. Não dá para projetar 9,7% sobre o
faturamento inteiro — dá para dizer que, nas peças de maior movimento, quase uma em cada dez
unidades saiu por outra praça. Com o relatório completo, esse número passa a valer para a
filial toda.

### 3.4 Comparação com as filiais irmãs — a tela Rede

Carreguei o estoque das cinco praças de SP na mesma data (06/08/2026) e comparei.

**Índice de paridade** — do conjunto de **1.496 peças classificadas curva A ou B em duas ou
mais praças irmãs** (duas, e não uma: uma praça sozinha pode ter particularidade de cliente;
duas já é padrão de estado), quantas cada filial tem com saldo:

| Filial | Peças com saldo | Paridade |
|---|---:|---:|
| Campinas | 1.211 | 81% |
| São José do Rio Preto | 1.209 | 81% |
| Presidente Prudente | 1.148 | 77% |
| **Ribeirão Preto** | **1.113** | **74%** |
| São Paulo | 1.036 | 69% |

Ribeirão não é a pior da comparação, e não vou apresentar como se fosse. O que o número diz é
a distância para o topo: **98 peças a menos que Campinas**, dentro de um conjunto que
comprovadamente gira no estado.

**Onde está o buraco específico de Ribeirão** — ruptura por curva:

| Filial | A | B | C | **D** | E | F |
|---|---:|---:|---:|---:|---:|---:|
| **Ribeirão Preto** | 14% | 17% | 14% | **44%** | 20% | 12% |
| São José do Rio Preto | 14% | 13% | 16% | 24% | 21% | 14% |
| Campinas | 14% | 18% | 18% | 32% | 25% | 18% |
| Presidente Prudente | 14% | 17% | 18% | 50% | 26% | 20% |
| São Paulo | 17% | 21% | 22% | 61% | 12% | 11% |

Em A, B e C estamos em linha com a rede. **Curva D é onde ficamos para trás: 44% zerada,
contra 24% em São José do Rio Preto.**

**O que isso vira em pedido:**

- **305 peças** estão zeradas ou sem cadastro aqui **e** são curva A ou B em duas ou mais
  praças irmãs
- **95 delas têm saldo nas quatro praças ao mesmo tempo** — quando quatro filiais mantêm a
  mesma peça, não é particularidade de nenhuma
- As irmãs somam **165.862 unidades** dessas mesmas peças em prateleira
- **6.808 peças que as irmãs mantêm não aparecem no nosso relatório**; destas, **157 são
  curva A ou B na rede**. Isso não é compra — é cadastro

Exemplos, todos curva A nas quatro praças:

| Peça | Código | Aqui | Na rede |
|---|---|---|---:|
| Filtro secador ar | 4329010042 | sem cadastro | 615 un |
| Camisa motor STD | C9720STD | sem cadastro | 112 un |
| Elemento filtro ar | C18450/2 | curva E, zerado | 60 un |
| Elemento filtro ar | P958974 | curva D, zerado | 78 un |

**Duas coisas que a ferramenta deixa escritas, e que eu faço questão de repetir aqui:**

- **Curva é classificação de venda da própria filial.** Peça curva A em Campinas é peça que
  gira em Campinas. Por que ela não gira aqui é leitura de quem negocia — pode ser frota
  diferente, pode ser que nunca tivemos para vender. A ferramenta apresenta o fato, não a
  conclusão.
- **Saldo é decisão de estoque, não venda.** Em nenhum lugar eu afirmo que a irmã vendeu X.
  Afirmo quanto a irmã mantém em prateleira.

---

## 4. O que a ferramenta entrega pronto

- **Pedido de abastecimento** — texto formatado para a matriz e planilha, peça a peça, com a
  curva e o saldo de cada praça
- **Solicitação de compra** — separada por fornecedor, texto e planilha
- **Pauta para os vendedores** — lista objetiva para mandar no grupo, escolhendo o recorte
- **Planilha de venda faturada por outra filial**, com recomendação item a item
- **Arquivo único** com todos os dados dentro, para mandar a quem não tem acesso — abre com
  dois cliques e funciona sem internet

---

## 5. O que eu peço

**5.1 Abastecimento das 305 peças** que a rede mantém e nós não temos, priorizando as 95 que
as quatro praças mantêm simultaneamente. Lista e planilha em anexo.

**5.2 Cadastro das 157 peças** que são curva A ou B na rede e não existem no nosso cadastro.
Sem cadastro não há como comprar, não há como vender e não há como medir.

**5.3 Liberação para rodar o relatório IAMMR2 sem filtrar produto.** Hoje eu consigo extrair
um recorte, e o recorte limita a análise a 33% do cadastro. Com o relatório completo, os
mesmos cálculos passam a valer para a filial inteira — inclusive o percentual de venda que
está saindo por outra praça.

**5.4 Curva D como frente de trabalho do trimestre.** É onde estamos objetivamente atrás da
rede, e é a faixa onde a ruptura passa despercebida porque cada item isolado parece pouco.

**5.5 Avaliar estender para as outras filiais de SP.** A ferramenta lê o relatório de qualquer
praça sem nenhuma adaptação — as cinco já foram carregadas e comparadas. O mesmo painel
serviria para qualquer supervisor da rede a custo zero de implantação.

---

## 6. Como conferir

Tudo que está neste documento sai dos relatórios do próprio Opus, sem digitação manual em
nenhuma etapa. Qualquer número aqui pode ser reproduzido subindo os mesmos arquivos na
plataforma. Cada item na tela mostra os fatores que formaram a nota dele e a evidência de cada
fator.

Onde o dado não existe, está escrito que não existe.
