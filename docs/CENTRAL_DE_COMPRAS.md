# Central de Compras — Filial Ribeirão Preto

Uma página só, sem servidor, que lê o relatório de estoque da filial e devolve três
coisas: **o que comprar**, **por que**, e **o que os vendedores têm para oferecer hoje**.

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

Agrupar só por `Cód. Original`, como a primeira versão fazia, perdia **700 itens** cujas
variantes fiscais não têm código original preenchido — eles apareciam como ruptura enquanto o
cadastro irmão tinha 46 unidades na prateleira. Corrigido isso, a ruptura real caiu de 1.778
para 1.126.

Juntar os dois conceitos seria o erro oposto: o pedido sairia misturando Fleetguard e Mann
na mesma linha.

---

## 2. Como a prioridade é calculada

Nota de 0 a 100, soma de cinco componentes. **Todo componente que pontua registra o motivo
com o número que usou. Todo componente sem dado registra uma lacuna e não pontua** — dado
ausente nunca vira zero disfarçado (mesma regra do motor principal, `CLAUDE.md` §1 R3).

| Componente | Peso | O que mede | Fica em branco quando |
|---|---:|---|---|
| Giro | 30 | Curva ABC do próprio cadastro. A = peso inteiro, F = zero. | Item sem curva. |
| Falta | 26 | Ruptura real vale tudo; zerado com similar disponível vale pouco; última peça vale 70%. | Saldo ilegível. |
| Essencial | 20 | Classe da peça. Filtro e correia pesam mais que virabrequim: a falta se sente todo dia. | Descrição fora das famílias conhecidas. |
| Linha | 14 | Quanto do grupo inteiro está zerado. Começa a pontuar em 30%, satura em 80%. | Grupo com menos de 8 itens. |
| Mercado | 10 | Participação da montadora de origem nos emplacamentos de caminhão. | Código sem padrão reconhecível. |

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

O catálogo de 61 marcas vem do site da própria Pacaembu (pabu.com.br). A marca de cada item
sai de três lugares, nesta ordem:

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

## 7. Privacidade e compartilhamento

- **Nenhuma requisição de rede.** Sem `fetch`, sem `XHR`, sem `WebSocket`, sem CDN. O
  arquivo é lido no navegador e a análise roda ali. Verificado sob a CSP de produção.
- Os envios ficam em **IndexedDB no navegador de quem carregou**. Trocar de aparelho começa
  do zero. Quem abre o link vê a tela vazia com o convite para carregar um arquivo — os
  dados de ninguém aparecem para ninguém.
- A CSP de `/compras.html` usa **hash sha256 do script**, não `'unsafe-inline'`. O hash é
  recalculado e gravado em `public/_headers` pelo `npm run plataforma`.
- Para mostrar a ferramenta a alguém sem ter arquivo em mãos, o botão **"Ver com dados de
  exemplo"** gera uma carteira fictícia determinística. Nenhum dado real.
- Para compartilhar resultado: **Copiar texto**, **Baixar CSV** ou **Imprimir / PDF**.

---

## 8. Leitura do `.xls`

O relatório sai em BIFF8 (Excel 97-2003), dentro de um contêiner OLE2. A página traz um
leitor próprio dos dois formatos — cerca de 200 linhas — em vez de embutir um megabyte de
biblioteca. Ele foi conferido célula a célula contra o `xlrd`: **9.388 linhas × 7 colunas
idênticas**.

Detalhes que importam:

- **`1.718` é mil setecentos e dezoito**, não 1,718. O separador de milhar brasileiro é
  tratado; um leitor ingênuo perde 1.717 unidades de disco de tacógrafo nesse único campo.
- Planilha protegida por senha, `.xlsx` (que é ZIP, não OLE2) e cabeçalho irreconhecível
  param com mensagem dizendo o que fazer, não com erro genérico.
- `.csv` e `.txt` também são aceitos, com detecção de `;` ou `,`.
- O cabeçalho é procurado nas 25 primeiras linhas e os nomes das colunas são tolerantes a
  variação (`Saldo`, `Estoque`, `Qtd`, `Quantidade` resolvem o mesmo campo).

---

## 9. Ao mexer nesta página

1. Edite **`plataforma/corpo.html`** — nunca `public/compras.html`, que é gerado.
2. Rode `npm run plataforma`. Isso regrava a página **e o hash da CSP** em `public/_headers`.
3. Rode `npm run check`.
4. Se mudou peso, limiar ou regra de família, atualize a tabela correspondente aqui.

O fragmento não traz `<!doctype>`, `<html>`, `<head>` nem `<body>`: o script de geração
embrulha tudo isso. É o que permite publicar o mesmo fonte como página hospedada e como
arquivo autocontido aberto direto do disco.
