# Central de Compras — Passo Fundo

Uma página só, sem servidor, que lê os relatórios do Opus e devolve quatro coisas: **o que
comprar**, **por que**, **o que os vendedores têm para oferecer hoje** e **quem comprava e
parou**.

A praça em uso é **Passo Fundo (37)**, em
**https://central-compras-passo-fundo.netlify.app**. O motor continua servindo qualquer
filial — a praça sai do relatório carregado, do endereço ou da aba Situação, nessa ordem (ver
§7a) — e isso é o que permite comparar Passo Fundo com as irmãs. Ribeirão Preto segue na
tabela de filiais **como praça irmã**, que é o papel dela na comparação da rede.

- Fonte: [`plataforma/corpo.html`](../plataforma/corpo.html) (fragmento)
- Publicada em: `public/compras.html` → `/compras.html` no site
- Gerada por: `npm run plataforma` (roda sozinha no `prebuild`)

---

## 1. Por que ela existe

O relatório de estoque entrega **9.387 itens, dos quais 4.742 com saldo zero**. Uma lista
de 4.742 linhas não vira pedido de compra: ninguém decide 4.742 vezes. A página existe
para transformar essa lista em algo que cabe numa semana de trabalho.

O corte acontece em quatro degraus, e cada degrau diz o que descartou:

| Degrau | Itens | O que saiu daqui |
|---|---:|---|
| Cadastro inteiro | 9.387 | — |
| Saldo zero | 4.742 | o que tem saldo |
| **Ruptura real** | **1.126** | 3.616 zerados cuja **variante fiscal ou equivalente ainda tem peça** |
| Prioridade ≥ 55 | 780 | o que não junta giro medido, essencialidade e linha comprometida |
| Prioridade ≥ 70 | 42 | o pedido da semana |

O degrau do meio é o que mais paga: **três quartos da "falta" não é falta.**

### Variante fiscal e equivalente não são a mesma coisa

Um item existe em vários cadastros porque o **tratamento fiscal muda** — ICMS, substituição,
origem. O sufixo `[2]`, `[3]`, `[5]` marca essas variantes. **Não é erro de cadastro**: é como
a empresa precisa comprar e faturar. São 4.050 cadastros assim no arquivo.

Daí saem duas relações, e confundi-las custa caro nos dois sentidos:

| Relação | Como se reconhece | O que significa |
|---|---|---|
| **Variante fiscal** | mesmo código base + mesma descrição (`4644TX-140C` e `4644TX-140C[5]`) | Mesma peça, mesmo fornecedor. Uma linha só na compra, somando saldo e venda. |
| **Equivalente** | mesmo `Cód. Original` + mesma descrição, códigos base diferentes (`AF4223` Fleetguard e `CF21540` Mann) | Atende o balcão, mas é **outra marca, outra compra, outro fornecedor**. Nunca entra na mesma linha de pedido. |

As duas cobrem o cliente, então as duas tiram o item da ruptura. Só a primeira vira uma linha
de compra somada.

### O segundo sufixo: `-N` de recadastro

O `[n]` não é o único. Quando um cadastro é refeito, o Opus acrescenta `-1`, `-2` ao código:
`WK11001X` vira `WK11001X-1`, `KC597D` vira `KC597D-1`. A tela do ERP "produtos com mesmo
código de fábrica" mostra os dois lado a lado, mesma descrição e mesmo fabricante — e às vezes
os dois sufixos empilhados, `H328WK-1[2]`.

Sem juntar, o saldo fica num cadastro e a compra é pedida no outro. No relatório de 06/08 isso
valia **220 rupturas inventadas**: `P559148` aparecia zerado enquanto `P559148-1[2]` tinha 55
unidades na prateleira. Ao juntar, os grupos com saldo zero caem de 1.031 para 811.

**A regra tem uma condição que não é preciosismo.** O `-N` só conta como sufixo quando o código
sem ele **existe no mesmo conjunto, com a mesma descrição**. `30.001.228-4` é código de
fabricante: cortado cegamente viraria `30.001.228`, que não existe em lugar nenhum. Já
`30.001.228-4-1` volta corretamente para `30.001.228-4`, que existe.

Na aba Rede a resolução olha a **rede inteira**, não cada relatório isolado. O motivo é
concreto: Ribeirão recadastrou o filtro MANN como `WK11001X-1[2]` e o relatório daqui já nem
traz mais o `WK11001X` original — a prova de que `-1` é sufixo está no relatório da irmã, que
ainda carrega o código antigo.

Agrupar só por `Cód. Original`, como a primeira versão fazia, perdia **700 itens** cujas
variantes fiscais não têm código original preenchido — eles apareciam como ruptura enquanto o
cadastro irmão tinha 46 unidades na prateleira. Corrigido isso, a ruptura real caiu de 1.778
para 1.126.

Juntar os dois conceitos seria o erro oposto: o pedido sairia misturando Fleetguard e Mann
na mesma linha.

### A coluna `Grupo` não é o fabricante

A chave de identidade do motor (`src/domain/estoque/identidade.js`) é
`Grupo + código de fábrica sem o sufixo [n]`. Vale registrar o que essa primeira metade é,
porque durante um tempo o código a chamou de "fornecedor" e isso estava errado.

`Grupo` é **código interno de produto do Opus** — um agrupamento mercadológico, não uma marca.
O relatório exportado não traz coluna de fabricante em lugar nenhum; ela existe só na tela do
ERP. Duas medições fecham a questão:

- O grupo é o prefixo do próprio código interno em **51,5% das linhas** (`1190000003` está no
  grupo `000119`), e nas demais o prefixo continua constante dentro do grupo (`7850…` →
  `004783`). Código de fabricante não moraria dentro do código do produto.
- Os 180 grupos reúnem famílias, não marcas: `000616` é junta (tampa de válvula, cabeçote,
  coletor), `004841` é injeção (injetor, bomba de alta, bico). 33 deles têm uma única descrição.

Ele continua na chave, mas pelo motivo certo: é um **guarda de família**. Sem ele, 6 códigos
base colidiriam entre peças diferentes — `79111` é bolsa pneumática num grupo e junta de
radiador em outro. O custo desse guarda foi medido: 5.556 peças contra 5.545 sem ele, 505
rupturas contra 504.

### Quando o guarda erra: grupos irmãos

Como o guarda separa família e não marca, ele erra num sentido conhecido — a **mesma peça
cadastrada em dois grupos** vira duas peças. São 5 códigos base em 5.545 no arquivo real.

O motor não junta por conta própria (juntar ressuscitaria as colisões acima) e também não
finge que o caso não existe. Ele liga os grupos que compartilham o código base
(`gruposIrmaos`) e classifica a ligação em três desfechos, pela prova disponível:

| Desfecho | Quando | Efeito |
|---|---|---|
| `cobertoPorGrupoIrmao` | mesma descrição **e mesma marca comprovada**, com saldo | sai da lista de compra |
| `conferirGrupoIrmao` | mesma descrição, **marca desconhecida** | continua na fila, com a dúvida escrita |
| — | descrição diferente, ou marca diferente | o código só coincide |

**A primeira versão desta regra estava errada e foi publicada.** Ela concluía duplicata só com
descrição igual. O catálogo da loja desmentiu no primeiro cruzamento: dos 8 códigos base que
caem em dois grupos e têm marca dos dois lados, **os 8 são marcas diferentes e nenhum é
duplicata** — `8PK1700` é AGRO-GATES contra AGRO-DAYCO, `9PK2140` é GATES contra CONTITECH,
`214` é BINS contra MBU. A descrição vem truncada em 19 caracteres e nunca carregou a marca.
Suprimir a compra ali deixa sem atendimento quem pede a outra marca.

Marca ausente não é sinal verde: `mesmaMarca` vale `null` quando falta o dado de um dos lados,
porque "não sei" e "diferente" levam a decisões opostas (R3).

O recorte **"Mesma peça cadastrada em dois grupos"**, na aba Produtos, é a lista para corrigir
no Opus.

---

## 1b. A fila de decisões — aba Hoje

O Painel responde *como está*. Essa é uma pergunta diferente de *o que eu faço agora*, e a
segunda é a que paga o salário de quem compra. A aba **Hoje** é a fila de decisões, em ordem
de prejuízo, e é a primeira tela que abre.

**Regra de construção: um bloco só existe se termina numa ação.** Bloco que só informa foi
para outra aba. E cada bloco carrega o número que justifica a urgência — não um rótulo de
urgência.

| Nível | Bloco | Entra quando | O número que justifica |
|---|---|---|---|
| Crítico | Comprar hoje | saldo zero **e** venda medida > 0 | unidades por dia que o balcão pede e não tem |
| Alta | Acaba antes do próximo pedido | cobertura ≤ 15 dias pela venda medida | quantas acabam em uma semana |
| Alta | Pedir transferência antes de comprar | zerado e vendendo aqui, com saldo numa irmã que classifica a peça como E ou F | unidades paradas lá |
| Atenção | Não recomprar | saldo > 0, **medido** no relatório, com zero saída | unidades em prateleira sem uma única saída |

### Cobertura em dias

`saldo do conjunto ÷ venda medida por dia`. **`null` quando não há venda medida** — e nesse
caso o item não entra em nenhum bloco de prazo. Estoque sem venda medida não tem prazo: tem
incerteza, que é outra coisa e não se resolve fingindo um número.

### A armadilha do bloco "não recomprar"

Item que não está no relatório de movimentação **não é item que não vendeu — é item que não
foi medido**. Com o relatório atual, que cobre 33% do cadastro, a leitura ingênua produzia
**2.129 "peças paradas" inventadas**. Por isso o bloco exige duas coisas: que o relatório
tenha medido aquele item (`resumo.demanda.has(interno)`) e que a cobertura geral passe de 50%.
Abaixo disso o bloco some da fila e uma lacuna explica o que fazer para trazê-lo de volta.

### Lacunas

O rodapé da fila lista o que a página **não** consegue afirmar e por quê: sem custo no
relatório não há valor em reais em lugar nenhum; sem movimentação não há prazo; sem o estoque
das irmãs não há transferência. Lacuna declarada vale mais que número inventado.

---

## 2. Como a prioridade é calculada

Nota de 0 a 100, soma de cinco componentes. **Todo componente que pontua registra o motivo
com o número que usou. Todo componente sem dado registra uma lacuna e não pontua** — dado
ausente nunca vira zero disfarçado (mesma regra do motor principal, `CLAUDE.md` §1 R3).

| Componente | Peso | O que mede | Fica em branco quando |
|---|---:|---|---|
| Giro | **45** | Curva ABC do cadastro, ou a venda medida quando há movimentação. A = peso inteiro, F = zero. | Item sem curva e sem venda medida. |
| Falta | **30** | Ruptura real vale tudo; zerado com similar disponível vale pouco; última peça vale 70%. | Saldo ilegível. |
| Venda por outra filial | **15** | Procura que existe aqui e foi atendida por outra praça. | Relatório sem a coluna de filial faturadora. |
| Essencialidade | **10** | Classe da peça. Filtro e correia pesam mais que virabrequim: a falta se sente todo dia. | Descrição fora das famílias conhecidas. |
| | **100** | | |

**Esta tabela não é digitada duas vezes.** Os pesos vivem em
`src/domain/compras/reposicao.js` (`PESOS_PRIORIDADE`), a soma 100 é validada por
`validarPesos()` na carga da página e por teste, e a tabela da aba Situação é **gerada** a
partir deles.

A versão anterior desta documentação listava dois componentes que já não existiam no motor —
`Linha` (14) e `Mercado` (10) — e a tela os imprimia como **"Linha undefined"** e
**"Mercado undefined"**, porque `PESOS.linha` e `PESOS.mercado` haviam sumido do código.
Derivar em vez de repetir é o que impede a divergência voltar.

Cada item mostra também a **confiança**: a parcela dos 100 pontos que teve dado para ser
aplicada. Um item com confiança 60% teve dois componentes em branco, e a tela diz quais.

### Classes de peça

A essencialidade não sai do preço, sai de quanto faz falta **estar na prateleira**:

| Classe | Peso | Exemplos |
|---|---:|---|
| Consumível | 1,00 | filtro, correia, óleo, lâmpada, palheta |
| Freio e ar | 0,92 | câmara, secador, válvula de 4 vias, compressor |
| Elétrica | 0,85 | sensor, interruptor, relé, alternador |
| Desgaste | 0,80 | retentor, rolamento, cruzeta, lona, junta |
| Injeção e bombas | 0,52 | bico, injetor, turbo, bomba d'água |
| Estrutural | 0,14 | virabrequim, comando, engrenagem, eixo |

---

## 3. Demanda medida — o relatório de movimentação

O Opus tem um segundo relatório, **Movimentação de Produto**, com uma linha por movimento:
data, tipo (`E` entrada / `S` saída), quantidade e documento. Ele entra pela mesma porta que o
estoque — o cabeçalho diz qual é qual — e muda a natureza de tudo o que a página faz.

Com 7 meses e 28.908 lançamentos da filial, a análise deixa de inferir e passa a medir:

| | |
|---|---:|
| Unidades vendidas no período | 84.192 |
| Peças diferentes com venda | 3.821 |
| **Itens sem uma única saída** | **6.281 (67% do cadastro)** |
| Itens com saldo e zero venda (capital morto) | 2.241 · 16.076 unidades |
| **Ruptura real com venda comprovada** | **542** |

### Volume e frequência são coisas diferentes

440 unidades em 32 pedidos é demanda recorrente: tem que ter na prateleira. 440 unidades em
1 pedido foi uma obra: não se estoca. Por isso o componente **Giro** combina os dois, com peso
maior para frequência (0,55 frequência + 0,45 volume), ambos escalados pelo percentil 95 da
carteira — o máximo achataria todo o resto por causa de um extremo.

### A armadilha da falta

Um item zerado que parou de vender há 122 dias **não perdeu procura: ficou sem peça**. Medir
a taxa sobre o período inteiro dilui a falta no divisor e manda comprar de menos — repetindo
a ruptura.

Quando o saldo é zero **e** a última venda tem 21 dias ou mais, a conta usa a taxa do período
em que a peça existiu na prateleira (`unidades ÷ dias até a última venda`), não a do período
inteiro. No arquivo real isso levou o disco de tacógrafo de 60 para 126 unidades sugeridas.
A linha marca `VENDA REAL ↑` e o detalhe explica a troca.

### Ruptura de verdade, não cadastro trocado

A lista **Zerado e vendendo** filtra por ruptura real, não por saldo zero. Um cadastro zerado
cujo irmão de mesmo código original tem 182 unidades em estoque não é urgência — é cadastro
substituído. Esse filtro sozinho tirou 72 falsos positivos da lista de urgência.

### Ordem das fontes para a quantidade

1. **Venda medida** na movimentação — a melhor base que existe.
2. **Diferença entre dois envios** de estoque — quando não há movimentação.
3. **Referência por classe × curva** — quando não há nem uma nem outra, e a tela diz isso.

---

## 3d. Os formatos que o Opus entrega

O sistema não exporta do jeito que a análise gostaria; a análise é que se adapta.

### Estoque sem cabeçalho

O mesmo relatório sai em variações: com ou sem a linha de títulos, com ou sem uma coluna de
localização (`1 01 006A`). Quando o cabeçalho não vem, as colunas são reconhecidas **pelo
próprio conteúdo** — cada campo tem uma assinatura que nenhum outro tem:

| Campo | Como se reconhece |
|---|---|
| Cód. interno | 100% dos valores com exatamente 10 dígitos |
| Grupo | 100% com exatamente 6 dígitos |
| Curva | 100% uma única letra de A a F |
| Descrição | texto com palavras, o mais longo da linha |
| Localização | começa com números separados por espaço — descartada |
| Saldo | inteiro curto, com muita repetição (os zeros) |
| Cód. produto | é o que traz o sufixo `[2]`, `[3]` das variantes fiscais |
| Cód. original | é o que traz `.` como marcador de campo vazio |

### Venda em PDF

O relatório de movimentação só sai em PDF. A página lê o PDF **sem biblioteca nenhuma**:
localiza os fluxos de conteúdo, descomprime com o `DecompressionStream` nativo do navegador,
interpreta os operadores de texto guardando onde cada trecho foi desenhado, e remonta as
linhas pela coordenada Y.

Medido contra um PDF de 47 páginas no formato do relatório: **2.400 de 2.400 lançamentos
lidos, em 0,6 s.** As 235 linhas descartadas são exatamente os cabeçalhos e rodapés das 47
páginas.

Dois erros custaram o resultado até chegar lá, e ambos são fáceis de repetir:

- A palavra `stream` também aparece dentro de `endstream`. Sem exigir um caractere não-letra
  antes, a busca casa no fim de um fluxo e engole todos os seguintes — 47 páginas viravam 1.
- O tamanho do fluxo tem de vir do `/Length` do dicionário. Ir até o `endstream` arrasta o
  fim de linha que separa os dois, e **um byte sobrando faz o descompressor recusar o fluxo
  inteiro**. Pior: a rejeição escapava como *unhandled rejection* e a promessa ficava
  pendurada, travando a página em vez de dar erro.

PDF digitalizado (foto de papel) não tem texto, e a leitura avisa isso em vez de devolver
vazio. `.txt` de captura de tela do terminal entra pelo mesmo caminho.

### Dois relatórios de venda, layouts diferentes

O Opus entrega a venda em mais de um formato, e eles não se parecem:

| Relatório | Como vem |
|---|---|
| **Movimentação Atual de Produto** | uma linha por movimento, com o código do produto na própria linha e coluna `TP` dizendo E ou S |
| **IAMMR2 — Relação de Consumo, analítica** | agrupado: o código vem num cabeçalho `Produto...: 0210525003` e vale para o bloco abaixo. Todo lançamento é saída, e **devolução aparece com quantidade negativa** |

A leitura tenta os dois e fica com o que reconhecer mais linhas — não há ambiguidade na
prática, cada relatório só casa com o próprio. O decimal também muda entre eles (`1,00` num,
`5.00` no outro) e os dois são aceitos.

### Ausência de medida não é venda zero

Um relatório filtrado cobre poucos produtos. O PDF real que chegou cobria **51 produtos de
9.383 — 0,5% do cadastro.**

Tratar "não aparece no relatório" como "não vendeu" inventaria capital morto que não existe e
derrubaria a nota de itens que vendem bem. Então, quando a cobertura fica abaixo de 50%:

- o componente **Giro** volta a valer pela curva ABC para os itens de fora, e o fator escrito
  no item diz: *"não está no relatório de venda carregado, que cobre 0,5% do cadastro. Sem
  medida, vale a curva A — não é venda zero, é venda não medida"*;
- as placas **Não vendeu nada** e **Capital morto** são substituídas por *Fora do relatório* e
  *Itens medidos*, que descrevem o que de fato se sabe;
- um aviso no topo diz a cobertura e como obter a foto inteira.

É a mesma regra de sempre, aplicada à cobertura em vez de ao campo: dado ausente não vira
zero disfarçado.

---

## 3b. Quantidade sugerida — e o que muda no segundo envio

**Com um envio só não existe consumo medido.** A sugestão é declaradamente uma referência
por classe × curva, e a tela diz isso na cara em vez de fingir precisão.

**A partir do segundo envio** do mesmo relatório, a queda de saldo item a item entre as duas
datas passa a ser o consumo medido. A conta vira:

```
saída medida ÷ dias do período × dias de cobertura desejada − saldo atual
```

A cobertura desejada é ajustável (30/45/60/90 dias) na aba **Evolução**. Itens com sugestão
medida ganham a marca `MEDIDO` na lista. Para um item cadastrado três vezes, a saída dos
três cadastros é somada antes da conta.

Isso é o que faz valer a pena subir o arquivo de novo todo mês: cada envio novo torna a
lista de compra mais próxima do consumo real da filial.

---

## 3c. Saber o que entrou e o que gravou

Uma ferramenta de decisão que deixa dúvida sobre o próprio estado não é usável: se a pessoa
não sabe se o arquivo entrou, ela não confia no número que está lendo. Três mecanismos
resolvem isso, e os três leem da **mesma função** (`situacaoDoSistema()`), então nunca
divergem entre si.

**1. Fichas no cabeçalho, sempre visíveis.** Estoque, Movimentação e Gravado, cada uma com
sinal (`✓`, `…`, `!`), o número do que entrou e um resumo ao passar o mouse. Clicar leva à aba
Situação. Não é preciso abrir nada para saber onde se está.

**2. Confirmação depois de cada carga.** Um aviso nomeia o que entrou com números conferíveis
— *"28.908 lançamentos de 05/01 a 31/07 (208 dias). Conferi a gravação: 28.908 linhas voltaram
do banco."* Ao reabrir a página, outro aviso lista o que foi recuperado.

**3. Gravação verificada, não presumida.** `gravarVerificado()` escreve, **lê de volta** e
compara a contagem. Só depois disso a tela diz "gravado". Se falhar, a ficha fica vermelha e o
aviso diz em texto claro que os dados valem apenas enquanto a aba estiver aberta — em vez de
falhar em silêncio, como antes.

A tela inicial virou **três passos numerados** com estado próprio (feito / é o próximo /
ainda não), e a aba `Dados` virou **Situação**, abrindo com três cartões: qual arquivo, de
quando, quantas linhas, e quando foi a última gravação conferida.

Os selos das abas ganharam legenda ao passar o mouse — um número sem rótulo (`336`, `516`) não
informa nada.

---

## 3e. Venda que saiu por outra filial

O relatório de consumo traz a coluna `Ff`: **qual filial faturou** cada venda. Quando não é a
própria, o pedido apareceu aqui e saiu por outra — quase sempre porque aqui não tinha a peça.

No arquivo real: **1.057 unidades, 9,7% de tudo que saiu, foram faturadas por outra filial**,
e **todas dentro de São Paulo** — São José do Rio Preto (639), Campinas, São Bernardo,
Guarulhos, São Paulo, Presidente Prudente.

A distinção que muda a decisão:

| Onde faturou | O que significa | Recomendação |
|---|---|---|
| Outra filial **de SP** | O cliente é daqui e a peça devia estar aqui. É venda perdida pela filial. | **Estocar aqui** |
| Filial **de outro estado** | Entra ICMS interestadual: pode ter sido decisão fiscal, não falta de estoque. | **Avaliar antes** — não assumir |

A tela lista peça a peça quanto saiu daqui, quanto saiu por outra, quais filiais faturaram e
o saldo atual, com a recomendação já classificada. O CSV traz tudo.

O catálogo de filiais (código → cidade e UF) está em `FILIAIS`, com as 28 filiais.

---

## 3f. Oportunidades: dois públicos, dois textos

O vendedor precisa saber **o que tem e quanto tem**, para mandar no grupo do WhatsApp e sair
vendendo. Curva ABC, giro e "capital parado" são conta de gestor: no texto dele viram ruído,
e roteiro pronto de abordagem atrapalha quem já sabe vender.

**Texto para os vendedores** — só peça, código e quantidade, em formato de WhatsApp:

```
*DISPONIVEL NO ESTOQUE - RIBEIRAO PRETO*
_Posicao de 05/08/2026_

*TRANSMISSÃO E RODAGEM*
• Junta cubo reduzida - 59983NA - *308 un*
• Retentor cubo roda - 01735BG - *269 un*

Pronta entrega. Chama que a gente separa.
```

**Relatório para o gestor** — o mesmo recorte com curva, marca, venda medida no período,
quantos itens do grupo não tiveram venda e o capital envolvido quando há custo.

Os grupos são escolhidos por caixa de seleção: marca-se só o que vai no texto, e o resumo diz
quantos itens e unidades a seleção cobre.

---

## 3g. Enviar para outra pessoa

Duas formas, na aba Situação:

**Página pronta (`.html`)** — a página se copia inteira, com os dados embutidos num
`<script type="application/json">` dentro do próprio arquivo. Quem recebe dá dois cliques e vê
tudo, sem carregar nada e sem internet. No arquivo real dá ~3 MB.

O pacote embutido **só é aplicado se o navegador de quem abre ainda não tiver dados** — assim
uma cópia recebida nunca sobrescreve o trabalho de quem já usa a página. Um aviso na abertura
diz que veio de arquivo recebido.

**Arquivo de dados (`.json`)** — só o conteúdo, para levar a outro computador ou guardar cópia
de segurança. Volta arrastando para a página.

O HTML é montado lendo o próprio DOM (`document.documentElement`), sem requisição de rede
nenhuma — a regra de não falar com servidor continua valendo até na hora de exportar.

---

## 3h. Rede — comparação com as filiais irmãs

O relatório de estoque é o mesmo em toda a rede, então o de qualquer praça entra pelo mesmo
leitor. O que muda é o destino: em vez de virar o estoque de casa, vira uma coluna de
comparação. A praça sai do **nome do arquivo** — `ESTOQUE PRES. PRUD 0608.xls` vira
Presidente Prudente, porque uma palavra do arquivo casa com uma palavra da cidade quando uma
é começo da outra. Empate ou nota baixa não vira palpite: a página pergunta.

Por filial guardamos só o que a comparação usa — código base, curva, saldo e descrição —, não
o relatório inteiro. Cinco praças cabem em ~200 kB, e é isso que sobe para a base da equipe.

### O que a curva significa aqui

**A curva é a classificação de venda da própria filial.** Uma peça curva A em Campinas é uma
peça que gira em Campinas. Quando a mesma peça é A em três praças e está zerada aqui, o fato
é esse — a leitura de *por que* ela não gira aqui é de quem negocia, não da página.

**Saldo é decisão de estoque, não venda.** A página nunca diz que a irmã "vendeu" alguma
coisa: diz quanto a irmã mantém em prateleira. A distinção importa porque só a curva carrega
informação de demanda; o saldo carrega informação de política de compra.

### Índice de paridade

O número que resume tudo. O universo de referência é o conjunto de peças **classificadas A ou
B em pelo menos duas praças irmãs** — duas, e não uma, porque uma praça sozinha pode ter uma
particularidade de cliente; duas já é padrão de estado. A paridade é a fração desse conjunto
que a filial tem com saldo.

Nos arquivos de 06/08/2026, com as quatro praças de SP carregadas:

| Filial | Peças com saldo | Paridade |
|---|---:|---:|
| Campinas | 1.211 | 81% |
| São José do Rio Preto | 1.209 | 81% |
| Presidente Prudente | 1.148 | 77% |
| **Ribeirão Preto** | **1.113** | **74%** |
| São Paulo | 1.036 | 69% |

Ribeirão não é a pior da comparação — e a página não finge que é. O que ela mostra é a
distância para o topo: 98 peças a menos que Campinas, dentro de um conjunto de 1.496 que
comprovadamente gira no estado.

### A lista que vira pedido

Peça que a rede mantém em prateleira e que aqui está **zerada ou sem registro no relatório**.
A ordenação é por força do argumento, e só por isso: em quantas praças a peça é bem
classificada (peso 3), em quantas ela tem saldo (peso 2), e o quanto ela é melhor lá do que
aqui. Nada de valor, nada de margem — o pedido é de abastecimento, não de compra.

Três recortes, porque a conversa muda conforme o interlocutor:

- **Só as que giram no estado** (padrão) — A ou B em duas ou mais praças. 305 peças.
- **Todas as que faltam aqui** — o quadro completo, 7.351 peças.
- **Só as que nem estão cadastradas aqui** — 157 delas são A ou B na rede.

O botão **Gerar pedido de abastecimento** monta o texto para a matriz: situação em cinco
linhas de número, depois a relação peça a peça com a curva e o saldo de cada praça. Sem
adjetivo — número, origem do número e o que se está pedindo.

---

## 4. Origem provável do código — o que ela é e o que ela não é

> **A origem é inferida pelo formato do código original, não por catálogo de aplicação.**
> Ela indica de qual montadora o código provavelmente veio. **Não afirma que a peça serve
> num veículo.** Aplicação só sai de catálogo do fabricante — é a regra R1 do `CLAUDE.md`,
> e vale aqui igual.

Só entram padrões de formato inequívocos. É melhor deixar 54% do cadastro como "não
identificada" do que chutar:

| Origem | Padrão | Itens neste arquivo | Confiança |
|---|---|---:|---|
| Mercedes-Benz | 10 dígitos (`A ### ### ## ##`) | 3.040 | alta |
| Volkswagen / MAN | dígito + letra + dígitos (`2Z0501615E`) | 854 | alta |
| Volvo | 8 dígitos iniciando 20, 21 ou 22 | 390 | alta |
| Iveco / FPT | 9 dígitos iniciando em 50 | 57 | média |
| MAN | `8X.XXXXX-XXXX` | 0 | alta |
| ZF | prefixo `0501` ou `1315` | 0 | média |
| — não identificada — | sem código, ou formato de fabricante de reposição | 5.046 | — |

O componente **Mercado** do score usa a participação dessa montadora nos emplacamentos de
caminhão do país, e a aba **Frota & Região** compara a participação de cada marca no
cadastro com a participação dela no mercado.

---

## 5. Marcas

### O catálogo completo, tirado do site

O `pabu.com.br` é a loja Magento da própria Pacaembu, e ela resolve o que o relatório do Opus
não traz. A URL de cada produto carrega o **mesmo código interno de 10 dígitos** do relatório
(`pabu.com.br/4504000212-filtro-ar-secundario.html`), e a página de categoria já traz, por
produto, `data-product-sku` + **Marca** + **Montadora**. É junção exata, sem heurística.

A coleta foi feita em duas fases, ambas sem falha:

| Fase | Requisições | Resultado |
|---|---:|---|
| Categorias de veículo | 1.109 páginas | 25.369 produtos, 16,8 min |
| Busca por código | 6.770 buscas | +2.606 produtos, 56,4 min |

A varredura por categoria veio íntegra — caminhão 19.743 de 19.743, ônibus 13.693 de 13.693,
sem cap de paginação. A segunda fase existiu porque **parte dos produtos não está classificada
em nenhuma categoria de veículo**; só a busca os alcança. Sobram 4.166 códigos do estoque que
realmente não existem na loja.

Resultado: **27.975 códigos com marca, 261 marcas** — contra as 61 do mapa manual. Em peças
consolidadas, **5.046 de 5.578 ficam com marca (90,5%)**.

Uma terceira passada abriu a página de cada uma das 5.220 peças do estoque e trouxe
**montadora** e **aplicação**. Esses dois campos são consulta: aparecem no card e na auditoria,
com a fonte declarada, e **nenhuma conta do motor olha para eles** — a regra R1 proíbe o
sistema concluir que uma peça serve num veículo.

### O que o login NÃO deu

O acesso de cliente foi usado e o resultado precisa ficar registrado, para ninguém repetir a
tentativa achando que vai dar em outra coisa:

| Campo | Resultado |
|---|---|
| Preço / custo | `99999999.99` em todos os itens — sentinela do Magento para "sem preço". Testado em produto, listagem e com o CD `03`. **Não existe para esta conta.** |
| `Cód. Original` | Preenche **zero** das 1.892 linhas vazias do relatório: os 967 que pareciam preenchidos eram `.`. Onde os dois têm o campo, são **100% idênticos** nos 4.150. |
| `Cód. Fabricante` | **99,7% igual** ao `Cód. Produto` do relatório. As 18 diferenças são artefato (`3756.0`) ou sufixo de um lado só. |

Tudo o que serve — marca, montadora, aplicação — aparece **deslogado**.

As concordâncias de 100% e 99,7% acima são o subproduto valioso: são prova externa de que a
junção pelo código interno de 10 dígitos está correta.

O arquivo entra pela mesma porta do estoque (`Cód. Interno;Marca;Montadora`) e **não é
versionado** — dado real não mora no repositório.

Duas coisas que ficaram de fora de propósito:

- **Grafias divergentes não são unificadas.** A loja escreve `CONTITECH` e `CONTITECH
  CORREIAS`, `O.M` e `OM`, `BOSCH DIESEL` e `BOSCH-DIESEL ELETRON` — 5 grupos em 261. A
  comparação é exata porque ela erra para o lado seguro: no máximo mantém uma peça na fila
  para conferência, nunca some com uma compra legítima.
- **Aplicação e montadora não viram afirmação técnica.** A página traz "Resumo de aplicações",
  mas nada na interface conclui que uma peça serve num veículo — é a regra R1 do `CLAUDE.md`.

### A ordem de precedência

A marca de cada item sai de três lugares, nesta ordem:

**1. O mapa que o usuário definiu** (aba Marcas). Ele conhece o fornecedor; a regra
automática só conhece o formato do código. Por isso o mapa manual sempre vence.

**2. Detecção automática.** Só entram esquemas de codificação do próprio fabricante,
confirmados pela descrição da peça:

| Marca | Padrão | Itens | Precisão medida |
|---|---|---:|---:|
| MANN | `W`, `WK`, `C`, `CF`, `CU`, `HU`, `PU` + número | 361 | 100% |
| MAHLE / Metal Leve | `OC`, `OX`, `LX`, `LA`, `KC`, `KX` + número | 136 | 100% |
| FLEETGUARD | `LF`, `FS`, `AF`, `FF`, `HF`, `WF` + número | 130 | 100% |
| HENGST | `E` + número | 64 | 100% |

A exigência de que a descrição seja de filtragem é o que leva a precisão a 100%. Sem ela,
`C…` casaria com "Camisa motor" e `E…` com "Coroa pinhão". Um prefixo que acerta 94% **não
entra**: 6% de marca errada dentro de um pedido de compra é pior que marca em branco.

**3. Nada.** O item mostra o botão *definir marca*, que leva direto à linha certa do mapa.

### A chave do mapa

O que o usuário mapeia não é item a item — seriam 9.387 decisões. É a **chave**, que agrupa
itens do mesmo fornecedor:

- Código começando com letra → a chave é o **prefixo** (`REX…`, `APV…`, `MBU…`).
- Código só com número → a chave é o **grupo**, porque o prefixo não diria nada.
- **Prefixo que mistura famílias** → a chave inclui a família. O prefixo `P` tem 313 filtros
  e 62 barras de direção: fornecedores diferentes. Sem essa quebra, mapear `P` inteiro
  marcaria filtro com a marca da barra de direção. Custa 516 chaves em vez de 211, e evita
  marca errada no pedido.

A distribuição é muito desigual, e a tabela vem ordenada por tamanho: **preencher as 10
maiores marca ~1.500 itens; as 30 maiores, ~3.100.** A lista nunca precisa ser preenchida
inteira, e a tela diz isso.

### Como trazer a marca, do melhor para o pior

**1. Coluna `Marca` no próprio relatório de estoque.** Cadastro do sistema é a verdade.

**2. Tabela de marcas importada.** Uma planilha com **duas colunas: um código e uma marca**.
Entra pela mesma porta dos outros arquivos — o cabeçalho identifica sozinho. O código pode
ser o interno, o do produto (com ou sem variante fiscal) ou o original; a busca tenta os
quatro e o primeiro que casar vence. De onde tirar: o **site é Magento**, e o painel dele
exporta a lista de produtos com o fabricante; o **Opus** tem o campo de marca no cadastro de
produtos. Serve qualquer planilha, até feita à mão — o botão *Baixar modelo* gera um CSV já
preenchido com os códigos que faltam.

**3. Mapa de prefixos e grupos**, preenchido à mão na aba Marcas — ou pelo modelo que a
própria página gera.

O botão *Baixar modelo* exporta **uma linha por prefixo ou grupo pendente**, não por item:
preencher 25 linhas marca milhares de itens, enquanto 25 linhas item a item marcariam 25. No
arquivo real, o modelo sai com 516 linhas, e as 20 primeiras cobrem 3.855 itens.

Cada linha traz a evidência para decidir — peças típicas e códigos de exemplo — e a última
coluna lista as 61 marcas válidas, para copiar em vez de digitar. A coluna `Chave` carrega o
identificador (`P:REX`, `G:004784`); ao voltar, a importação reconhece que aquilo é chave de
mapa e não código de produto, e marca o prefixo ou o grupo inteiro.

Linhas devolvidas em branco são ignoradas sem reclamar, e a confirmação diz quantas ficaram
de fora — preencher aos poucos e subir várias vezes funciona: cada carga soma à anterior.

**4. Detecção pelo padrão do código** — a única que adivinha, e por isso a última.

> **Sobre raspar o site:** `pabu.com.br/robots.txt` declara `Disallow: /` para todos os
> agentes. A exportação do painel Magento resolve o mesmo problema de forma completa,
> autoritativa e sem carga no site.

### Prefixo de fornecedor × prefixo de categoria

Nem todo prefixo é fornecedor. Boa parte é abreviação de categoria da própria casa: `BB` são
95% bronzinas, `AC` 81% amortecedores, `UB` 100% bombas d'água. Mapear esses para uma marca
só estaria errado — dentro deles a marca varia item a item.

A regra prática que a tela aplica: prefixo espalhado por **muitos tipos de peça** costuma ser
fornecedor (`REX` e `MBU` cobrem categorias variadas); prefixo concentrado em **um tipo só**
costuma ser categoria. Cada linha do mapa mostra essa pista, e a coluna *O que tem aqui
dentro* dá a evidência para a pessoa julgar.

### O que a marca destrava

- Coluna e filtro de marca na lista de compra.
- **Pedidos separados por fornecedor** — que é como a compra realmente acontece: um pedido
  por fornecedor, não uma lista única.
- Situação por marca: itens, ruptura e unidades a pedir de cada fornecedor.

---

## 5b. Quantidade: sugestão que você sobrepõe

Cada linha traz um campo editável com − e +. O número começa na sugestão do motor; assim que
você digita outro, ele passa a valer, fica marcado em laranja com o rótulo *você pediu* e a
sugestão original continua visível ao lado, para comparação. As quantidades ajustadas ficam
guardadas no navegador e sobrevivem a recarregar a página e a subir um novo estoque.

Somatórios, carrinho, solicitação de compra e CSV usam sempre a quantidade escolhida — nunca
a sugestão, quando existe escolha.

---

## 5c. Colunas opcionais: marca, custo e preço

O relatório mínimo tem sete colunas. Se o export do Opus puder trazer mais três, a
plataforma usa sem nenhuma configuração — basta a coluna existir, com qualquer um destes
nomes:

| Coluna | Nomes aceitos | O que destrava |
|---|---|---|
| Marca | `Marca`, `Fabricante`, `Fornecedor` | Marca exata em todo o cadastro. **Vence o mapa manual e a detecção por código** — cadastro do sistema é a verdade, inferência é remendo. |
| Custo | `Custo`, `Custo medio`, `Preco custo`, `Valor custo` | Capital parado em reais, valor do pedido, valor por fornecedor, custo no CSV. |
| Preço | `Preco`, `Preco venda`, `Valor venda` | Margem por item no CSV. |

Valores em reais aceitam `1.234,56` e `1234.56`. **Sem custo no arquivo, nenhuma tela mostra
valor em reais** — o campo some do layout em vez de exibir zero, pela mesma regra de que
ausência não vira zero disfarçado.

---

## 6. Dados públicos embutidos

Todo número externo carrega fonte e data na própria ficha. Nada é estimado sem dizer que é.

| Dado | Valor | Fonte |
|---|---|---|
| Caminhões em Ribeirão Preto | 12.423 (de 568.142 veículos) | Tribuna Ribeirão / Senatran, maio 2024 |
| Região metropolitana | 34 municípios, 1,68 mi hab. | Fundação Seade / IBGE |
| Frota circulante de caminhões | 2,28 mi · idade média 12 anos e 3 meses | Sindipeças/Abipeças, 2025/2026 |
| Emplacamentos, 1º sem. 2026 | 48.030 (−9,39%) | Fenabrave |
| Participação por marca | VW 28,1% · MB 27,3% · Volvo 18,0% · Scania 10,8% · Iveco 7,8% · DAF 5,9% | Fenabrave, 1º sem. 2026 |
| Autopeças em 2026 | R$ 284,1 bi (+3%) | Sindipeças |
| Agrishow 2026 | R$ 11,4 bi em intenção de negócios (−22%) | balanço da feira |

O número da região metropolitana é **estimativa** projetada por proporção de população, e a
ficha diz isso. A contagem exata está na base municipal do Senatran.

---

## 6b. A versão publicada com login

O mesmo fonte gera duas coisas diferentes:

| | Arquivo (`.html` aberto do disco, `public/compras.html`) | Publicada (`deploy-netlify/`) |
|---|---|---|
| Entrada | não tem | usuário e senha, cinco pessoas |
| Onde ficam os dados | IndexedDB de quem abriu | base única da equipe |
| Requisições de rede | **nenhuma** | só `/api/dados`, com sessão válida |
| `connect-src` na CSP | `'none'` | `'self'` |

A página decide sozinha em qual das duas está: fora de `http`/`https` — ou se o servidor não
responder — a base da equipe simplesmente não liga, e tudo continua funcionando local. É por
isso que o arquivo mandado por WhatsApp segue valendo sem internet.

**Entrada.** Formulário de verdade, servido por uma edge function antes de qualquer byte da
página sair. A caixinha cinza do navegador (autenticação básica) foi descartada: passa
despercebida em celular. As senhas não existem no código — só o resumo SHA-256 de cada uma.
O cookie de sessão é assinado com HMAC e vale 12 horas; a chave da assinatura vem dos
resumos, então trocar uma senha derruba todas as sessões.

**Base da equipe.** Guarda um pacote só — o mesmo do botão "Gerar página para enviar" —
comprimido em gzip no navegador antes de subir: ~300 kB no lugar de ~3 MB. Grava sozinho
depois de carregar um arquivo ou mudar uma quantidade, com 2,5 s de espera para não subir o
pacote inteiro a cada tecla.

**Concorrência.** Cada gravação incrementa uma versão. O navegador manda a versão que
conhecia; se outra pessoa gravou no meio, a base recusa com 409 e a página diz quem foi, em
vez de apagar o trabalho dela em silêncio. Ao abrir, se a base está numa versão mais nova do
que a última que aquele navegador recebeu, ele traz a da base — o que foi feito localmente já
subiu quando aconteceu.

Detalhes de operação, cadastro de usuários e como publicar de novo: `deploy-netlify/LEIA-ME.md`.

---

## 7. Privacidade e compartilhamento

- **No arquivo aberto do disco, nenhuma requisição de rede.** Sem `fetch`, sem `XHR`, sem
  `WebSocket`, sem CDN. O arquivo é lido no navegador e a análise roda ali.
- **Na versão publicada**, o único destino é `/api/dados`, no mesmo domínio e só com sessão
  válida. Nada vai para terceiros: sem rastreador, sem analytics, sem fonte externa.
- Os envios ficam em **IndexedDB no navegador de quem carregou** — e, na versão publicada,
  também na base da equipe, que é o ponto: os cinco abrem o mesmo conteúdo.
- A CSP usa **hash sha256 do script**, não `'unsafe-inline'`. O hash é recalculado e gravado
  em `public/_headers` e em `deploy-netlify/publicar/_headers` pelo `npm run plataforma`.
- Para mostrar a ferramenta a alguém sem ter arquivo em mãos, o botão **"Ver com dados de
  exemplo"** gera uma carteira fictícia determinística. Nenhum dado real.
- Para compartilhar resultado: **Copiar texto**, **Baixar CSV** ou **Imprimir / PDF**.

---

## 3l. Nem toda saída é venda

**Era o defeito mais grave da ferramenta.** A conta em `resumirDemanda` fazia
`if (m.tp !== 'S') continue` e somava tudo, e a tela escrevia, para todo código de saída,
*"Sim — conta como demanda"*. Numa rede que transfere mercadoria entre filiais, isso conta
transferência interna como venda e manda **comprar de novo o que só mudou de prateleira**.

Motor em [`src/domain/movimentos/tr.js`](../src/domain/movimentos/tr.js).

### Como as saídas se distribuem de verdade

Medido nos quatro relatórios reais, 81.427 linhas:

| TR | Linhas | Unidades | % das saídas | Documento |
|---|---:|---:|---:|---|
| `S·50` | 53.477 | 204.419 | **93,4%** | NF |
| `S·98` | 2.974 | 17.601 | 5,2% | NF |
| `S·54` | 600 | 9.858 | 1,0% | NF |
| `S·70` | 199 | 1.128 | 0,3% | NF |
| `S·RS` | 48 | 53 | 0,1% | **RI** |
| `S·92` `S·RW` `S·JS` | 19 | 25 | — | NF |

**Três códigos cobrem 99,6% das linhas.** Por isso a tela ordena por volume: classificar três
resolve quase tudo, e o resto fica visível como lacuna em vez de entrar escondido.

### A regra

TR de saída não classificado **não é venda**. Também não é venda zero — é venda *não
classificada*, que é outra coisa e aparece como lacuna. A página **não adivinha** pelo volume
nem pelo prefixo do documento: ela mostra essas evidências (volume, período, filiais, prefixo)
e quem classifica é quem conhece o ERP.

Enquanto nada estiver classificado, a venda medida fica vazia e a tela diz *"Nenhum código de
saída foi classificado ainda — isso não quer dizer que não houve venda"*. Toda tela que usa
venda medida carrega a cobertura: **"X% das saídas estão classificadas como venda"**.

---

## 3m. A pedrada: concentração da saída

*"Vendeu 100 unidades em 8 meses"* e *"vendeu 90 num dia e 10 no resto"* são a mesma média
mensal e decisões de compra opostas. A página contava documentos distintos, mas não media o
**tamanho do maior** — uma saída única de 90 em 100 aparecia como demanda recorrente.

Motor em [`src/domain/movimentos/concentracao.js`](../src/domain/movimentos/concentracao.js).

A ficha da peça passa a mostrar:

| | |
|---|---|
| **Concentração** | quanto por cento saiu no maior documento, qual é ele, e quanto sobra sem ele |
| **Média × mediana por mês** | onde as duas se afastam, um mês fora do padrão está puxando a média |

**Nada é descartado.** Concentração é fato, não veredito: o módulo mede, e excluir em silêncio
um pedido grande seria tão errado quanto contá-lo como rotina. Sem número de documento, a
página diz `N/D` — sem saber em quantos pedidos aquilo saiu, não há concentração a medir.

---

## 3n. Cada praça no período que ela mediu

A sugestão pela rede usava o período **mais longo** entre as praças. Se Cascavel mediu 232 dias
e outra mediu 30, a taxa da segunda caía por um período que ela nunca teve, e a peça sumia da
lista.

Agora a conta é praça a praça — `unidades ÷ dias daquela praça` — e a referência é a **média
dessas taxas**. A base escrita na tela diz qual dos dois casos é: *"em 232 dias"* quando todas
mediram o mesmo, *"cada uma no período que mediu"* quando não.

---

## 3o. O vocabulário da ausência

Cinco estados que a tela nunca mistura, porque levam a decisões opostas:

| | |
|---|---|
| `0` | valor conhecido e igual a zero |
| `—` | o arquivo não trouxe este dado |
| `N/D` | não deu para determinar com o que existe |
| `não carregado` | o relatório que traria isso não foi carregado |
| `não observado` | não houve registro no período carregado — **o que não prova que não existe** |

O caso que mais engana é o último: filial sem movimentação carregada aparecendo como
*"vendeu 0"*.

---

## 7a. A praça desta análise

A página nasceu com o código de uma filial escrito em vinte lugares. O resultado é
que ela **anunciava Ribeirão Preto enquanto exibia o estoque de Passo Fundo** — e, pior, o
estoque de Passo Fundo entrava como *filial irmã*, não como estoque de casa.

Agora `aqui()` é estado, não constante:

- **O primeiro estoque carregado define a praça.** Ninguém começa pelo estoque da filial
  vizinha. O botão *carregar estoque de outra filial* continua mandando — ele é escolha
  explícita, e a página não a sobrepõe.
- **Quem quiser troca na aba Situação.** Trocar não recarrega nem apaga nada: muda quem é
  "casa" na aba Rede e o nome que sai nos textos e nas planilhas.
- A escolha fica gravada e viaja no pacote.

Duas coisas **não** acompanham a praça, de propósito:

| O quê | Por quê |
|---|---|
| O nome do banco (`compras-ribeirao-preto`) | trocar o nome faz o navegador abrir um banco vazio e todo o trabalho guardado some da vista |
| O identificador do formato do pacote | mudá-lo faria a página recusar todo pacote já gerado |

Os dois identificam armazenamento e formato, não filial.

---

## 3i. Movimentação de outra praça — e o relatório que vem partido

O relatório de movimentação traz a coluna `FI`, e ela diz **de quem é a venda**. Até então
nada olhava para ela: subir o relatório de Londrina transformava a venda de Londrina em
demanda medida da praça de casa. A página passaria a comprar para Passo Fundo com o giro de
Londrina, e nada na tela denunciaria.

Agora todo movimento lido passa por uma porta só, `encaminharMovimentos`, que decide antes de
aplicar:

| A filial dona do recorte é… | O que acontece |
|---|---|
| a praça de casa | vira demanda medida, como antes |
| uma filial irmã | vira **venda medida daquela praça**, guardada à parte, e a tela diz que não entrou na demanda de casa |

A dona do recorte é a filial com mais lançamentos. Os de outras filiais dentro do mesmo
arquivo continuam sendo devolvidos à parte — venda que saiu por outra praça é sinal, não lixo.

### O que a venda das irmãs destrava

A comparação da rede respondia *"lá tem?"*. Com a venda medida ela responde **"lá gira?"** —
que é outra pergunta. A coluna **Vendeu lá** mostra as unidades que saíram nas praças que têm
a peça, e entra na força do argumento (em escala logarítmica, para que uma peça de volume
gigante não empurre todas as outras para baixo).

Praça sem relatório de movimentação carregado **fica de fora da conta**, e a coluna diz *não
medido* em vez de zero. Ausência de medida não é venda zero — a mesma regra de sempre.

### O relatório "compressed": tudo dentro de células de texto

Cinco arquivos reais chegaram num formato que a página não lia:

| Praça | Planilhas no arquivo | Lançamentos |
|---|---:|---:|
| Cascavel | 432 | 12.992 |
| Caxias do Sul | 530 | 17.896 |
| Porto Alegre | 880 | 29.008 |
| Londrina | 653 | 21.531 |
| Passo Fundo | 136 | 4.319 |

Duas coisas os tornavam ilegíveis, e as duas somem em silêncio:

1. **A leitura abria só a `sheet1`.** Estes arquivos espalham um relatório só por **centenas
   de planilhas** — 96% dos lançamentos sumiam sem erro nenhum.
2. **Nenhum dado está numa coluna.** O relatório inteiro vive dentro de células de texto, com
   três blocos lado a lado na mesma linha. A regra antiga de bloco de texto só olhava linha
   de uma célula só, e deixava passar todos.

### Quando o arquivo novo é MENOR que o anterior

Movimentação nova substitui a anterior. Dois relatórios de Passo Fundo do mesmo período,
01/01 a 20/08, chegaram com contagens diferentes:

| Arquivo | Lançamentos | Cobertura do cadastro |
|---|---:|---:|
| `MOVIMENTA__O_PRODUTO_PASSO_FUNDO_…` | 7.398 | 29% |
| `…_compressed_2` | 4.319 | 23% |

Faltam **3.214 lançamentos**, distribuídos por **todos os meses** — não é recorte de período,
é perda. A página não escolhe por conta própria qual vale: quando o arquivo novo tem menos
lançamentos cobrindo o mesmo período, ela **diz isso na cara**, com o nome do arquivo
anterior e quantos a menos vieram. Quem decide é quem carregou.

---

## 3j. Comprar pela venda das outras praças

A comparação de estoque respondia *"as outras praças têm esta peça?"*. Ter não é vender — uma
peça pode estar parada em cinco filiais. Com o relatório de movimentação de cada praça, a
pergunta vira **"lá gira?"**, e essa vira compra. Motor em
[`src/domain/compras/rede.js`](../src/domain/compras/rede.js).

### De onde sai a quantidade

A rede vendeu `unidades` em `dias`, espalhadas por `pracasComVenda` praças. A média diária
**de uma praça** é `unidades ÷ dias ÷ praças`. A sugestão é essa média × dias de cobertura,
menos o saldo local.

Isso **não é previsão**. É a pergunta *"se aqui vender como a média das praças que vendem,
quanto dura?"*. Duas coisas que a conta deliberadamente **não** faz:

| Não faz | Por quê |
|---|---|
| corrigir pelo tamanho da praça | seria preciso o faturamento de cada uma, e esse dado não está em nenhum relatório. Inventar o fator inventaria a quantidade |
| somar a venda de todas as praças | somar responde *"quanto a rede inteira vende"*, que não é o que se compra para uma filial |

Praça sem relatório de movimentação carregado fica **fora do divisor**. Ausência de medida não
é venda zero.

Empate no volume vai para quem gira em **mais praças**: venda espalhada é demanda de mercado,
venda concentrada pode ser um cliente só — que pode ter ido embora.

### Medido em 24/08/2026

Cruzando Cascavel, Caxias do Sul, Porto Alegre e Londrina (232 dias) contra o estoque de
Passo Fundo:

| | |
|---|---:|
| Peças que a rede vende e Passo Fundo não atende | 3.351 |
| — já cadastradas em Passo Fundo, zeradas | 242 |
| — não vieram no relatório de estoque | 3.109 |
| — que Passo Fundo **também já vendeu** | 356 |
| Unidades somadas na sugestão (cobertura de 45 dias) | 8.438 |

As dez primeiras, por giro na rede:

| Código | Descrição | Rede | Praças | Comprar |
|---|---|---:|---:|---:|
| 4120000033 | Disco p/ tacografo 7 dias | 2.723 | 4 | 133 |
| 2490211832 | Disco p/ tacografo | 2.430 | 3 | 158 |
| 4471000689 | Filtro blindado comb 10 furos | 1.949 | 3 | 127 |
| 0770707602 | Elemento filtro comb | 1.860 | 4 | 91 |
| 1700268756 | Porca roda c/colar oscil M22x3 | 1.198 | 3 | 78 |
| 4794000016 | Fluido freio DOT.4 500ml | 1.134 | 4 | 55 |
| 1700268612 | Porca roda c/colar oscil M22x3 | 1.127 | 3 | 73 |
| 1700266950 | Porca roda c/colar oscilante | 1.111 | 3 | 72 |
| 1930740134 | Lampada R5W 24V 5W | 1.060 | 3 | 69 |
| 0813010950 | Guia valvula escape/admissao | 1.028 | 4 | 50 |

**"Não veio no relatório de estoque" não quer dizer que a peça não exista no sistema** — o
relatório de Passo Fundo cobre 4.552 códigos, e o de movimentação alcança peças que não estão
nele. É por isso que a coluna diz isso e não *"não cadastrada"*.

---

## 3k. Pacote Técnico — marca, preço e aplicação

O quarto relatório do Opus (`PCARP12`), em PDF. É a **única fonte** de três campos que nenhum
outro relatório traz: **marca**, **preço** e **aplicação**, por código interno. Motor em
[`src/domain/dados/pacoteTecnico.js`](../src/domain/dados/pacoteTecnico.js).

Medido no `PC_TECNIC` de 04/08/26:

| | |
|---|---:|
| Pacotes | 61 |
| Componentes | 1.337 |
| Códigos internos distintos | 1.077 |
| Com marca / preço / aplicação | 1.077 / 1.077 / 1.073 |
| Marcas distintas | 21 |
| **Divergências de preço ou marca entre pacotes** | **0 em 1.337 linhas** |
| Códigos que estão no estoque de Passo Fundo | 156 |
| Itens do estoque que ganharam marca | 157 |

Zero divergência é o que permite montar **uma ficha por código** sem escolher entre versões.
Quando houver divergência, ela é **registrada e mostrada**, e o primeiro valor continua
valendo — escolher em silêncio entre dois preços é inventar um deles.

### Ele alimenta os caminhos que já existiam

Marca e aplicação entram pelas mesmas estruturas que a tabela de marcas da loja já alimentava
(`tabelaMarcas` e `fichaCatalogo`), porque a peça é a mesma e duas fontes paralelas para o
mesmo campo são duas versões da verdade. O **preço** ganhou estrutura própria, porque não
havia nenhuma.

### O que o preço é, e o que ele não é

É **preço de venda**, da filial que emitiu o relatório, na data dele — a ficha diz as três
coisas. Não é custo: não entra em margem, não entra em capital parado e não vira "valor do
estoque". A lacuna *"custo — nenhum relatório carregado traz a coluna"* continua aparecendo,
porque continua verdadeira.

### O que ele NÃO resolveu

A ideia óbvia — *"quais pacotes dá para fechar?"* — **não se sustenta nestes dados**, e vale
registrar para ninguém tentar de novo:

| | |
|---|---:|
| Pacotes completos em Passo Fundo | **0 de 61** |
| Melhor cobertura de um pacote | 25% (2 de 8 peças) |
| Pacotes a 3 peças ou menos de fechar | 0 |

São kits de retífica de motor e câmbio; uma revenda não estoca 30 peças de um câmbio inteiro.
A leitura fica pela **composição** — *"esta peça entra nestes serviços"* —, que é consulta ao
catálogo e verdadeira, e não pela completude, que não é.

### Aplicação continua sendo texto, não conclusão

A coluna `Aplicacao` é reproduzida como veio, com o mesmo aviso que já valia para a ficha da
loja: **o sistema não conclui a partir dela que a peça serve num veículo** (R1). Nenhum
componente da nota olha para esse campo.

---

## 7a-2. Carregar vários arquivos de uma vez

Dá para escolher ou arrastar **vários arquivos juntos** — os cinco estoques das filiais irmãs
numa tacada só. São lidos um de cada vez, em ordem, porque cada leitura mexe no mesmo estado
e gravar em paralelo no IndexedDB deixaria a base com metade de cada.

**Um arquivo ruim não derruba os outros.** No fim a tela diz o que entrou e o que ficou de
fora, com o motivo de cada um — antes, quem arrastava cinco estoques e errava um ficava sem
saber quais tinham entrado.

### Três defeitos que impediam o estoque irmão de carregar

Encontrados carregando os cinco estoques reais (Chapecó, Caxias, Cascavel, Itajaí, Londrina)
sobre Passo Fundo:

| Defeito | Causa | Correção |
|---|---|---|
| **Nenhum** estoque irmão carregava | `analisarRede` tinha uma local `const aqui = praças[0].pecas` que passou a sombrear a função `aqui()`; a linha logo acima, que usa `aqui()`, morria com *Cannot access 'aqui' before initialization* | a local virou `pecasDeCasa` |
| `CAXIAS` não era reconhecido | "Caxias do Sul" tem duas palavras contáveis e o arquivo traz uma: nota 0,5, abaixo do corte de 0,6 | a palavra que só existe numa cidade decide sozinha (abaixo) |
| O diálogo de escolha vinha marcado em *"é o estoque de casa mesmo"* | era o primeiro `<option>` | vem marcado o melhor palpite do nome do arquivo |

O terceiro é o mais perigoso dos três: *"é o estoque de casa mesmo"* é justamente a opção que
**substitui** o estoque de casa. Um clique distraído no botão de confirmar apagava a análise
inteira.

### A palavra que só existe numa cidade

`reconhecerFilial` vive em [`src/domain/estoque/filiais.js`](../src/domain/estoque/filiais.js),
com 12 testes. Saiu do HTML porque errar aqui **troca a filial da análise inteira** e nada na
tela denuncia — era a única regra dessa gravidade sem teste próprio.

Duas passagens, nesta ordem:

1. **Maioria das palavras da cidade.** Nota ≥ 0,6 decide; empate é dúvida.
2. **A palavra que só existe numa cidade.** Uma palavra de cinco letras ou mais que case com
   UMA cidade só decide sozinha. Cinco letras porque abaixo disso as palavras se repetem
   (`SAO`, `RIO`, `DO`); "uma cidade só" porque `PRETO` está em Ribeirão Preto **e** em São
   José do Rio Preto — e ali perguntar continua sendo o certo.

| Nome do arquivo | Praça | Por qual passagem |
|---|---|---|
| `ESTOQUE_CHAPECO_2408.xls` | Chapecó | maioria (1/1) |
| `ESTOQUE_CAXIAS_2406.xls` | Caxias do Sul | palavra exclusiva |
| `ESTOQUE PRES. PRUD 0608.xls` | Presidente Prudente | maioria, por abreviação |
| `ESTOQUE SÃO BERNADO.xls` | São Bernardo | maioria, perdoando o erro de digitação |
| `ESTOQUE RIO PRETO.xls` | **pergunta** | `PRETO` está em duas praças |
| `ESTOQUE 2408.xls` | **pergunta** | não diz cidade nenhuma |

---

## 7b. Clientes e metas — a carteira

O terceiro relatório do Opus não fala de peça nenhuma: fala de quem compra. Entra pela mesma
porta dos outros, é reconhecido pelo cabeçalho e vive **ao lado** do estoque — cada um
funciona sem o outro, e qualquer um pode chegar primeiro.

Motor em [`src/domain/clientes/carteira.js`](../src/domain/clientes/carteira.js), testado
pelo vitest e injetado na página pelo gerador. Fonte única da verdade.

### Como o relatório é reconhecido

Pela marca que só ele tem: **quatro colunas com o mesmo nome, `Faturamento`**. Nenhum outro
relatório do Opus repete nome de coluna. É mais confiável que o nome do arquivo, que qualquer
um renomeia.

### As quatro colunas não dizem de que mês são

O relatório não declara o período em lugar nenhum — não há título nem rodapé com data. Duas
coisas foram determinadas **por medição**, não por suposição:

| Pergunta | O que a medição mostrou |
|---|---|
| Qual é a ordem? | Do mais recente para o mais antigo. A ordem inversa produz **27 casos impossíveis** — cliente faturando depois da própria última compra. |
| A primeira coluna é o mês corrente ou o último fechado? | **Mês corrente.** Supor o último fechado zera a coluna do mês da última compra em **80 de 80** clientes conferidos. |

O mês de referência sai da **data de compra mais recente do próprio arquivo**, não do nome do
arquivo. Daí saem os rótulos das colunas (`agosto/26`, `julho/26`, …).

### A regra que protege a meta

O mês corrente é **parcial** — o arquivo de 21/08 tem 21 dias de agosto, não 31. Incluí-lo
numa média de quatro meses derruba a média em cerca de um terço de um mês, e **a meta sai
sistematicamente baixa**.

Por isso a média usa **só os meses fechados**. O mês corrente aparece do lado, marcado como
parcial, e nunca entra na conta. Medido no arquivo real de Passo Fundo:

| Grandeza | Valor |
|---|---:|
| Clientes na carteira | 1.142 |
| Com meta pela própria média | 95 |
| Sem base nos meses fechados | 1.047 |
| Meta somada (fator 1,00) | R$ 271.722,18 |
| Faturado em agosto (**parcial**) | R$ 216.425,48 |
| Compravam e pararam | 18 (R$ 16.050,34 de média mensal) |

**Sem base não vira meta zero.** Meta zero seria lida como "meta batida"; a linha diz *sem
base* e o motivo (`não faturou nada nos 3 meses fechados`).

O multiplicador da meta é escolha de quem gerencia — 1,00 repete a média, 1,10 pede 10% de
crescimento. A página não inventa crescimento sozinha, e o fator escolhido fica gravado junto
com a carteira.

### Situação: medida, nunca rótulo do ERP

| Situação | Corte | Por quê |
|---|---|---|
| Ativo | até 45 dias | um mês comercial mais folga |
| Esfriando | até 120 dias | um trimestre |
| Dormindo | até 365 dias | um ano |
| Sem comprar há mais de um ano | acima | outro tipo de trabalho |

A distância é contra **hoje**, não contra a data do arquivo: a data da última compra é
absoluta, e "há quantos dias" só é verdade se medido agora.

`Vl U.Com` e `Faturamento` têm **bases diferentes** — a diferença é constante em vários
clientes (17,50 em dois deles, 47,71 em outro), o que aponta imposto ou frete fora do
faturamento. Por isso um nunca é usado para conferir o outro.

Ano de dois dígitos vira 20YY **se isso não passar do ano que vem**; senão 19YY. Sem essa
regra, `07/10/99` viraria 2099 e "há quantos dias não compra" ficaria negativo — e o relatório
traz cliente que não compra desde os anos 90.

### O que a aba mostra

**Compravam e pararam** é a única lista que vira ligação hoje: tem meta (logo, faturou nos
meses fechados) e está fora do prazo de compra. É ela que conta no selo da aba.

---

## 8. Leitura do `.xls` e do `.xlsx`

O relatório sai em BIFF8 (Excel 97-2003), dentro de um contêiner OLE2. A página traz um
leitor próprio dos dois formatos — cerca de 200 linhas — em vez de embutir um megabyte de
biblioteca. Ele foi conferido célula a célula contra o `xlrd`: **9.388 linhas × 7 colunas
idênticas**.

Detalhes que importam:

- **`1.718` é mil setecentos e dezoito**, não 1,718. O separador de milhar brasileiro é
  tratado; um leitor ingênuo perde 1.717 unidades de disco de tacógrafo nesse único campo.
- Planilha protegida por senha e cabeçalho irreconhecível param com mensagem dizendo o que
  fazer, não com erro genérico.
- `.csv` e `.txt` também são aceitos, com detecção de `;` ou `,`.
- O cabeçalho é procurado nas 25 primeiras linhas e os nomes das colunas são tolerantes a
  variação (`Saldo`, `Estoque`, `Qtd`, `Quantidade` resolvem o mesmo campo).

### O `.xlsx`, lido direto

Antes a página mandava reexportar como "Excel 97-2003". Pedir para alguém mudar o jeito de
tirar o relatório é empurrar o custo do software para quem usa. Um `.xlsx` é um ZIP com XML
dentro, e o navegador já sabe as duas coisas (`DecompressionStream` + `DOMParser`) — nenhuma
dependência entrou no projeto. Motor em
[`src/domain/dados/xlsx.js`](../src/domain/dados/xlsx.js).

O relatório de movimentação em `.xlsx` **não é uma planilha**: é o relatório de texto do Opus
jogado dentro de um `.xlsx`. Cada campo ocupa uma faixa de colunas e o valor cai numa coluna
ou na vizinha, conforme o alinhamento. Três coisas quebravam em silêncio, medidas no arquivo
de Passo Fundo de 21/08:

| O que acontece | Quanto | O que dá errado se ignorar |
|---|---:|---|
| Linhas começam na coluna A em vez de B | 7.714 de 7.832 | ler por letra fixa põe `NF00023202` no lugar do tipo de movimento |
| Descrição na coluna 8 em vez da 9 | 2.521 | encaixar "na última coluna que cabe" cola a descrição no código do produto |
| Movimentos dentro de uma célula só, como bloco de texto | 8 | somem — e é por serem poucos que ninguém notaria |

Por isso cada célula vai para a referência de cabeçalho **mais próxima**, depois de corrigir o
deslocamento da linha; e o bloco de texto passa pelo leitor de relatório em texto, com a tela
dizendo quantos vieram assim.

Data em `.xlsx` é número. **Quem decide se aquele número é data é o formato da célula**, não o
valor — `0000000000` é código de produto, não data.

Resultado no arquivo real: **7.398 lançamentos de 05/01/2026 a 20/08/2026**, 7.390 da grade e
8 do bloco de texto.

---

## 9. Ao mexer nesta página

1. Edite **`plataforma/corpo.html`** — nunca `public/compras.html` nem
   `deploy-netlify/publicar/`, que são gerados.
2. Rode `npm run plataforma`. Isso regrava a página **e o hash da CSP** nos dois destinos:
   `public/_headers` e `deploy-netlify/publicar/_headers`.
3. Rode `npm run check`.
4. Se mudou peso, limiar ou regra de família, atualize a tabela correspondente aqui.
5. Se o que mudou vale para quem usa o link com senha, publique de novo — veja
   `deploy-netlify/LEIA-ME.md`.

O fragmento não traz `<!doctype>`, `<html>`, `<head>` nem `<body>`: o script de geração
embrulha tudo isso. É o que permite publicar o mesmo fonte como página hospedada e como
arquivo autocontido aberto direto do disco.
