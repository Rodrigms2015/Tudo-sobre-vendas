# CRITICAL_REVIEW.md — Crítica da proposta BRUTO OS

Documento escrito **antes** do código, conforme exigido pela Seção 1 do PROMPT_MASTER.
Objetivo: separar o que é forte, o que é frágil, o que é enfeite e o que é promessa vazia.

Este documento é intencionalmente duro. A proposta original é boa — melhor que a média dos
briefings de CRM que circulam no setor — mas contém pelo menos **seis armadilhas capazes de
matar a credibilidade do produto na primeira semana de uso real por um vendedor experiente**.

---

## 0. Veredito em uma frase

O conceito central está certo: **a camada de decisão, não o cadastro**.
O risco não é o conceito, é a **precisão falsa** — o produto promete inferências que os dados
disponíveis não sustentam. Corrigido isso, o BRUTO OS tem diferenciação real e defensável.

---

## 1. Riscos graves (bloqueiam a credibilidade)

### 1.1 O "Radar de Reposição" é o maior risco do produto

**O que a proposta pede:** janela provável de reposição com grau de confiança, considerando
frota, quilometragem, perfil rodoviário, idade média, sazonalidade, ciclo médio.

**O problema real:** nenhuma distribuidora de linha pesada tem esses dados no ERP. O que
existe de fato é: `cliente`, `data`, `item`, `quantidade`, `valor`. Quilometragem não existe.
Idade média da frota não existe. Perfil rodoviário, quando existe, está num campo de texto livre
preenchido em 2019 por alguém que saiu da empresa.

Se o produto exibir "janela provável: 12 a 19 de março — confiança 78%" a partir de três compras
históricas, ele está fazendo **astrologia com barra de progresso**. O vendedor sênior percebe isso
em dois dias e o produto morre — junto com a confiança em todos os outros módulos.

**Correção adotada (substitui a proposta original):**

- O módulo passa a se chamar internamente **"intervalo histórico de recompra"**, e só a
  superfície de UI mantém o nome comercial Radar de Reposição.
- A janela é calculada **exclusivamente** a partir dos intervalos observados entre compras da
  mesma família, para o mesmo cliente. Nada mais entra na conta.
- **Regra dura: com menos de 3 intervalos observados (isto é, menos de 4 compras da família),
  o sistema não exibe janela nenhuma.** Exibe "sem base histórica suficiente" e a pergunta que
  o vendedor deve fazer ao cliente para criar essa base.
- Substituí "grau de confiança" percentual por **nível de evidência discreto**
  (`SEM_BASE` / `BASE_FRACA` / `BASE_RAZOAVEL`), derivado de duas coisas verificáveis: o número
  de intervalos e o coeficiente de variação entre eles. Um percentual sugere um modelo
  probabilístico que não existe; um rótulo discreto é honesto.
- Um cliente com compras erráticas (CV alto) **nunca** recebe rótulo melhor que `BASE_FRACA`,
  mesmo com 20 compras. Regularidade importa mais que volume.

**Justificativa da substituição:** é melhor cobrir 30% da carteira com um sinal em que o vendedor
confia do que 100% da carteira com um sinal que ele aprende a ignorar. Cobertura parcial honesta
vence cobertura total fabricada.

### 1.2 O score 0–100 aditivo produz um número que não se pode discutir

**O que a proposta pede:** nove componentes somando 100 (recorrência 20, tempo sem compra 15,
orçamento aberto 15, potencial de frota 15, urgência 10, aderência de família 10,
relacionamento 5, margem 5, compromisso vencido 5).

**Os pesos fecham em 100 corretamente.** O problema não é aritmético, é semântico:

- Somar **urgência** (um evento de hoje) com **relacionamento** (um traço estável) produz uma
  grandeza sem unidade. Dois clientes com score 71 podem exigir ações opostas: um tem veículo
  parado agora, o outro é uma conta boa e morna.
- Um score único **esconde a razão**, que é exatamente o que a Seção 1.7 do prompt proíbe.

**Correção adotada:**

- O score é mantido, mas **rebaixado a critério de ordenação**, nunca apresentado como
  "qualidade da conta". Ele responde "o que olho primeiro", não "quanto essa conta vale".
- Toda exibição de score vem acompanhada dos **drivers dominantes** — os componentes que
  respondem pela maior parte da pontuação — e das **penalidades** e **lacunas de dados**.
- Introduzi um eixo ortogonal ao score: o **tipo de ação** (`URGENCIA`, `RECUPERACAO`,
  `REATIVACAO`, `EXPANSAO`, `COMPROMISSO`, `CADASTRO`). O Cockpit ordena por score *dentro* de
  cada tipo, e o topo do dia sempre respeita a precedência de tipo. Veículo parado nunca fica
  atrás de uma oportunidade de expansão com score maior.

### 1.3 "Tempo sem compra" em dias absolutos é o erro clássico do setor

Este é o ponto onde quase todo CRM de peças erra, e a proposta original repete o erro.

Um cliente que compra a cada 90 dias e está há 40 dias sem comprar **está normal**.
Um cliente que compra a cada 7 dias e está há 40 dias sem comprar **está perdido para um
concorrente**. Um limiar absoluto de "45 dias sem compra" trata os dois igual e produz uma lista
de "clientes esfriando" dominada por clientes que nunca foram quentes.

**Correção adotada (a melhoria mais importante deste documento):**

O componente passa a ser calculado sobre a **cadência própria do cliente**:

```
atraso_relativo = dias_desde_ultima_compra / intervalo_mediano_do_cliente
```

- `< 0.8` → dentro do ciclo, pontuação zero.
- `0.8 – 1.2` → janela de recompra, pontuação alta (é aqui que a ligação converte).
- `1.2 – 2.0` → atrasado, pontuação alta com alerta.
- `> 2.0` → provável perda de share; muda de tipo de ação para `REATIVACAO`, com abordagem
  diferente (não é "hora de repor", é "o que aconteceu").
- Clientes sem cadência estabelecida (< 3 intervalos) **não pontuam neste componente** e ganham
  uma lacuna de dados explícita, em vez de pontuação inventada.

Observação: o pico de pontuação na janela `0.8–1.2` e não no atraso máximo é deliberado.
O objetivo comercial é **ligar antes do concorrente**, não catalogar clientes já perdidos.

### 1.4 O Grafo de Oportunidade é o maior risco jurídico e comercial

`Veículo → Sistema → Componente → Peça → Item correlato` exibido numa tela é **lido como
catálogo**, por mais selos de "demonstração" que existam. Um vendedor sob pressão, com um cliente
no telefone, vai ler aquilo como aplicação técnica válida. Se a peça não servir, o custo é frete
de devolução, veículo parado mais tempo e a conta perdida — e a culpa recai no sistema.

A Seção 1.8 do prompt já proíbe inventar aplicações. Mas o módulo 6.6, como especificado, é
exatamente o veículo para essa invenção acontecer.

**Correção adotada — restrição estrutural, não apenas um aviso:**

- O grafo opera **apenas nos níveis `Sistema → Família → Família correlata`**. Ele nunca desce a
  número de peça, código, marca ou modelo específico de veículo.
- O que ele afirma é **correlação comercial de cesta** ("quem compra kit de embreagem costuma
  precisar de rolamento e atuador"), que é conhecimento de venda — não afirmação de aplicação
  técnica, que é conhecimento de catálogo.
- A entidade `VehicleApplication` existe no modelo de dados, mas o seed de demonstração a
  entrega **vazia, de propósito**. A tela mostra o estado vazio explicando que aplicação
  veículo-motor-sistema-peça só aparece após importação de catálogo validado. Essa recusa
  visível é uma **funcionalidade**, não uma pendência.
- Nenhum nó do grafo é clicável em direção a "consultar disponibilidade desta peça". O grafo
  gera **perguntas para o vendedor fazer**, não itens para o vendedor vender.

### 1.5 Fadiga de ANDON — o alerta que ninguém lê

Dez tipos de alerta × 30 clientes de demonstração já produzem dezenas de sinais. Numa carteira
real de 800 clientes, produz centenas por dia. Um painel Andon que acende inteiro é um painel
apagado. Isso destrói o módulo que mais diferencia o produto.

**Correção adotada:**

- **Orçamento de severidade:** no máximo 3 alertas críticos simultâneos por vendedor. O quarto
  candidato a crítico é rebaixado a atenção. Se tudo é crítico, nada é.
- **Deduplicação por conta:** um cliente gera no máximo um alerta crítico; os demais viram
  contexto dentro dele. O vendedor liga para o cliente, não para o alerta.
- **Alerta tem que morrer:** todo alerta é reconhecível (`ACK`) com motivo, e alertas
  reconhecidos não voltam pela mesma causa dentro da janela de silêncio.
- Alerta sem ação sugerida executável **não é criado**. Se o sistema não sabe o que pedir para
  o vendedor fazer, ele não tem o direito de interromper o vendedor.

### 1.6 A foto exigida não existia no repositório (resolvido)

A Seção 6.1 manda usar `public/rodrigo-soares.jpg`. O repositório estava **vazio** no
início deste trabalho — não havia foto alguma.

As regras do prompt são explícitas: não alterar o rosto, não gerar versão artificial.
**Gerar uma imagem de rosto seria a violação mais direta possível do briefing.** Isso não
foi feito. Enquanto o arquivo não existiu, o componente degradou para um monograma
tipográfico — sem rosto, sem silhueta, sem ilustração de pessoa.

**Situação atual:** a foto foi fornecida e está no repositório. O tratamento aplicado a ela
está registrado abaixo, item a item, para que qualquer pessoa possa auditar o que foi e o
que não foi feito com a imagem.

| Operação | Aplicada? | Detalhe |
|---|---|---|
| Conversão de container PNG → JPEG | **Sim** | O original tinha 2,78 MB em PNG, o que incharia o precache do PWA. JPEG qualidade 95, sem subamostragem de croma (`4:4:4`), progressivo. Resultado: 398 kB. |
| Redimensionamento | **Não** | 1086×1448 preservados, idênticos ao original. |
| Corte / recorte | **Não** | O contêiner usa 3:4, a razão nativa do arquivo, então `object-fit: cover` não descarta um único pixel. |
| Filtro, duotone, saturação, nitidez | **Não** | Nenhum. |
| Retoque ou geração de qualquer parte do rosto | **Não** | Nenhum. |
| Sobreposição de cor ou gradiente sobre o rosto | **Não** | Nenhuma. Apenas moldura de 1 px e raio de canto no contêiner. |

**Fidelidade medida:** erro médio de **0,91 em 255 por canal** (0,36%), atribuível
inteiramente ao re-encode JPEG em regiões de alta frequência (fios de cabelo, barba). O
nível de qualidade foi escolhido comparando 88, 92, 95 e 97 — 95 é o ponto em que o erro
para de cair de forma relevante e o arquivo ainda não dobra de tamanho.

**A degradação sem rosto foi mantida.** Ela agora só dispara se a imagem falhar ao
carregar, e o texto foi corrigido de "retrato não incluído no repositório" para "retrato
indisponível", que é o que a situação passou a significar. Quatro testes protegem o
arquivo: existência, razão 3:4, resolução mínima e teto de peso.

---

## 2. Recursos que são enfeite — removidos do MVP

Removi o que não muda a rotina do vendedor. Cada remoção tem justificativa.

| Recurso proposto | Decisão | Justificativa |
|---|---|---|
| Otimização de rotas (6.6 logística) | **Reduzido** | Sem geocodificação, "rota otimizada" é uma lista ordenada com nome bonito. Entregue como **agrupamento por cidade + ordenação por prioridade e janela de atendimento**, chamado pelo que é: *Plano de Visitas*. Sem mapa geográfico falso. |
| Mapa da carteira | **Substituído** | Um mapa do Brasil com pontos exige coordenadas reais. Entregue como **mapa de calor por cidade** (blocos proporcionais), explicitamente esquemático. Não desenha geografia que não temos. |
| Registro por voz | **Cortado** | A Web Speech API é inconsistente entre iOS e Android e falha justamente no ambiente do vendedor externo (ruído, dentro do veículo). Substituído por **captura rápida em uma tela com campos pré-preenchidos** — mais rápido na prática e 100% confiável offline. |
| Gamificação | **Cortado** | Já proibido pela Seção 3.7. Telemetria profissional, sem medalhas. |
| Previsão de falha | **Cortado** | Já proibido pela Seção 3.5. Reforçado aqui: nenhum texto do produto usa a palavra "prever". |
| "IA" como rótulo | **Cortado** | O motor é determinístico e auditável. Chamá-lo de IA seria mentira — e uma mentira desnecessária, porque um motor de regras explicável é *superior* aqui: o vendedor pode discordar dele com argumentos. |
| Autenticação / multiusuário | **Adiado (Fase 2)** | Sem backend não há autenticação real. Um login local seria teatro de segurança. |

---

## 3. Contradições internas do briefing

1. **Seção 3.5 vs. Seção 6.7:** a 3.5 proíbe prometer previsão; a 6.7 pede "confiança" numérica
   nas recomendações. Resolvido: confiança discreta e derivada de completude de dados,
   não de probabilidade estatística.
2. **Seção 6.6 vs. Seção 1.8:** o grafo pede componentes e peças; a 1.8 proíbe aplicações
   inventadas. Resolvido pela restrição estrutural em 1.4 (grafo para no nível de família).
3. **Seção 16 ("nenhum recurso 'em breve' no fluxo principal") vs. Seção 9 (fase Cloudflare
   futura).** Resolvido: nada marcado "em breve" aparece no fluxo principal. Integrações futuras
   vivem apenas no ROADMAP, não na interface.
4. **Seção 11 pede 20 recomendações no seed.** Recomendações não são dados semeados — são
   **derivadas** do estado da carteira pelo motor. Semeá-las produziria recomendações que não
   correspondem aos dados. Resolvido: o seed garante que a carteira gere **pelo menos** 20
   recomendações no motor, e um teste automatizado verifica esse piso. O mesmo vale para alertas.

---

## 4. Melhorias propostas que não estavam no briefing

### 4.1 Contrato de explicabilidade (o mais importante)

Toda saída do motor implementa uma interface única:

```ts
interface Explicavel {
  fatores: { rotulo: string; peso: number; evidencia: string }[];
  penalidades: { rotulo: string; peso: number; evidencia: string }[];
  lacunas: string[];
  proximaPergunta: string | null;
}
```

Isso é imposto pelo **tipo**, não pela disciplina do desenvolvedor. É impossível adicionar uma
recomendação sem explicação sem quebrar a compilação. A Seção 1.7 do prompt vira uma garantia
estrutural em vez de uma boa intenção.

### 4.2 Procedência de dado em nível de campo

Todo campo derivado carrega `CONFIRMADO | ESTIMADO | AUSENTE | DEMONSTRACAO`. A UI renderiza
procedência de forma consistente (cor + rótulo textual, nunca só cor — ver acessibilidade).
Isso atende à Seção 6.5 de forma sistêmica, não tela a tela.

### 4.3 A lacuna de dado vira ação

Dado ausente não é um espaço em branco: é uma **tarefa de enriquecimento com valor estimado**.
"Este cliente não tem perfil de frota — 4 contas assim valem R$ X em oportunidade não mapeada.
Pergunte: *quantos veículos e quais marcas?*" Isso transforma a maior fraqueza do produto
(dados ruins) no seu principal loop de melhoria.

### 4.4 Debriefing pré-preenchido, não formulário

Formulário de fim de dia é abandonado na segunda semana. O debriefing do BRUTO OS chega
**já preenchido** com as ações realmente registradas no dia; o vendedor confirma, corrige o que
estiver errado e escreve uma linha de aprendizado. Meta de tempo: **60 segundos**.

### 4.5 Métrica antifraude

"% de recomendações aceitas" é uma métrica capturável: um motor que só recomenda o fácil atinge
95%. Ela é sempre exibida ao lado de **promessas cumpridas** e **orçamentos recuperados**, que
são resultados. Aceitação sem resultado é ruído, e o painel de telemetria diz isso em texto.

---

## 5. O que pode ser construído agora vs. o que exige dados reais

| Camada | Situação |
|---|---|
| **Construído agora, funciona de verdade** | Cockpit, Radar da Carteira, Perfil 360, Next Best Action, ANDON, venda perdida, simulador, debriefing, diagnóstico guiado, importação/exportação CSV, PWA offline, telemetria. |
| **Exige dados reais do cliente** | Cadência confiável (precisa de ≥ 12 meses de histórico), potencial de frota (precisa de cadastro de frota), margem (precisa vir do ERP). O sistema funciona sem eles e **diz** que está sem eles. |
| **Exige integração futura** | Estoque em tempo real, aplicação técnica validada, preço/tabela, crédito, sincronização multiusuário. |
| **Seria promessa vazia — não construído** | Previsão de falha, roteirização geográfica real, avaliação de texto livre por IA, "score de propensão" estatístico. |

---

## 5.1 Falha de escopo encontrada em uso real: não havia cadastro manual

Descoberta quando o próprio idealizador tentou usar o produto e concluiu, corretamente,
que ele "não era funcional".

**O erro:** eu construí importação de CSV, exportação, validação linha a linha e relatório
de erros — e **nenhuma tela para cadastrar um cliente ou registrar uma compra**. A única
forma de colocar dados era importar planilha ou carregar a demonstração.

Para um vendedor querendo testar com cinco contas reais, isso é o mesmo que não funcionar.
Ninguém monta CSV no celular. O produto exibia 32 clientes fictícios e não oferecia porta
de entrada para os dados de quem estava olhando.

**Por que passou despercebido:** os 230 testes cobriam o motor com fixtures construídas em
código e a interface com o seed já carregado. Nenhum deles percorria o caminho de um
usuário que chega com o banco vazio e quer entrar com o próprio dado. Cobertura alta,
caminho crítico não exercitado.

**Correção:**

- Cadastro, edição e exclusão de cliente pela interface, com exclusão em cascata.
- Registro manual de compra por família — o dado que alimenta cadência, ticket,
  recorrência e janela.
- `SaleItem.productId` passou a ser anulável: o motor só usa `familyId`, e exigir um
  produto obrigaria a inventar um (violaria R3).
- O catálogo de 14 famílias passou a ser **carregado sempre**, não só com a demonstração.
  Ele é vocabulário do setor, não dado fictício — sem ele não há família para escolher.
- O estado vazio do Cockpit passou a oferecer **cadastrar cliente** como primeira opção,
  antes da demonstração e da importação, com as três etapas até o motor acordar.
- `cadastro.test.ts` percorre o fluxo inteiro sem CSV: abrir vazio, cadastrar, registrar
  quatro compras e verificar que a cadência aparece.

**Defeitos secundários encontrados no mesmo caminho:**

1. Dois botões com o rótulo "Registrar compra" na mesma tela — um abria o formulário, o
   outro salvava. O do cabeçalho virou "Nova compra".
2. O Cockpit exibia "Ações na fila: 1" e, logo abaixo, "nenhuma conta exige ação agora".
   Ações de confiança baixa são excluídas do Top 3, mas contadas na fila. Agora elas
   aparecem com a lacuna em destaque, em vez de sumir e contradizer o contador.

---

## 6. Riscos que permanecem (assumidos conscientemente)

1. **Qualidade da importação.** O maior ponto de falha na adoção é o CSV do ERP. Mitigado com
   validação linha a linha, relatório de erros exportável e importação parcial — mas continua
   sendo o passo mais frágil.
2. **Carteiras pequenas.** Um vendedor com 40 contas e histórico curto verá pouca coisa acender.
   Isso é correto e honesto, mas pode ser lido como "o sistema não faz nada". Mitigado com um
   estado vazio que explica o que falta para o sistema ter algo a dizer.
3. **Sazonalidade não modelada.** Reconhecidamente ausente. Exige 24+ meses de histórico para
   não virar ruído. Está no ROADMAP, não no MVP.
4. **IndexedDB pode ser limpo pelo navegador.** iOS Safari descarta dados de sites sem uso por
   7 dias. Mitigado com aviso na política de dados, exportação em um clique e lembrete de backup.

---

## 7. Conclusão

A proposta sobrevive à crítica, com quatro substituições centrais:

1. Cadência relativa substitui dias absolutos como base de todo o motor de temperatura.
2. Nível de evidência discreto substitui percentual de confiança.
3. O grafo para no nível de família; aplicação técnica é recusada por construção.
4. O score vira critério de ordenação com drivers visíveis, não nota de qualidade da conta.

Com isso, o BRUTO OS deixa de ser "um CRM com tema de caminhão" — o que a Seção 1.10 proíbe — e
passa a ser o que promete ser: **a camada de decisão entre a carteira e a próxima ligação.**
