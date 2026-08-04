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
| **Ruptura real** | **1.778** | 2.964 zerados cujo **similar de mesmo código original ainda tem peça** |
| Prioridade ≥ 55 | 2.638 | o que não junta giro, essencialidade e linha comprometida |
| Prioridade ≥ 70 | 598 | o pedido da semana |

O degrau do meio é o que mais paga. **Quase dois terços da "falta" não é falta**: é o mesmo
item cadastrado duas, três, cinco vezes (sufixos `[2]`, `[3]`, `[5]` no código de produto),
com o saldo parado em um dos cadastros e zero nos outros. São 4.050 cadastros repetidos no
arquivo. Na aba **Comprar** eles são juntados numa linha só, com a quantidade somando o
conjunto — senão o pedido sai com a mesma lâmpada três vezes.

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

## 3. Quantidade sugerida — e o que muda no segundo envio

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
