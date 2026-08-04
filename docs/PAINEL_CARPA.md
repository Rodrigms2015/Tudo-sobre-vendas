# PAINEL CARPA — Acesso × Compra

Ferramenta avulsa, fora da aplicação BRUTO OS: um **único arquivo HTML**
(`public/carpa.html`) que lê os relatórios da praça, cruza as fontes e monta a fila
de decisão de bloqueio da plataforma.

Não é parte do motor. Não compartilha código com `src/`. Existe separado de
propósito, porque a razão de ser dele é poder ser anexado a um e-mail e aberto
com dois cliques por quem não tem nada instalado.

---

## 1. A pergunta que ele responde

> Quais clientes acessam a plataforma **e compram**, e quais entram só para tirar
> preço e fechar em outro lugar?

O segundo grupo consome infraestrutura, expõe tabela de preço e não gera pedido.
O painel separa os dois e produz uma fila de decisão — sem decidir sozinho.

## 2. O que ele come

| Arquivo | Origem | O que entra |
|---|---|---|
| `PCN5I5` / `PCN5I6` — Mapa de Atend. Sala × eCom | OPUSCase, **PDF cru** | acessos do mês, faturamento sala, faturamento e-commerce, média 3 meses |
| `Clientes_Carpa_AAAAMM.xlsx` | plataforma | cadastros, acessos 30 dias, CNPJ, último acesso, status |
| `C_<praça>.xlsx` | carteira | vendedor dono, média 4 meses, última compra |
| `pacote-carpa-AAAAMM.json` | o próprio painel | estado inteiro, com decisões e observações |
| `Carteira_<vendedor>.xlsx` | volta do vendedor | colunas **Decisão** e **Observação** preenchidas |

O tipo de cada arquivo é reconhecido pelo conteúdo, não pelo nome. A junção é pelo
**código do cliente Pacaembu**, normalizado sem zeros à esquerda.

### Por que o PDF é lido direto

O relatório é gerado em Courier, uma linha inteira por operador `Tj`, com o
espaçamento das colunas preservado. O painel infla os streams com
`DecompressionStream`, lê a **régua de tracinhos** do cabeçalho e fatia as colunas
por posição. Ou seja: as colunas vêm do próprio relatório, não de constantes no
código — se o layout mudar de largura, o leitor acompanha.

O `.xlsx` é lido pelo mesmo caminho: ZIP aberto na mão, XML pelo `DOMParser`.
Nenhuma biblioteca, nenhuma rede.

## 3. Duas plataformas, duas decisões

Este é o ponto que não pode ser confundido:

| | **Catálogo Carpa** | **E-commerce** |
|---|---|---|
| O que é | catálogo de peças: código e informação técnica | pabu.com.br, o nosso site |
| Dá para comprar? | **não** | **sim** |
| Mostra preço? | não | sim |
| De onde vem o acesso | `Acessos Últimos 30 Dias`, na planilha de cadastros | `Total Acessos`, no Mapa Sala × eCom |
| Por que cortar alguém | consulta muito e **não compra em lugar nenhum** — usa a nossa engenharia de catálogo e fecha com outro | entra, vê preço e nunca fecha — usa o site como tabela de preço |

Cada cliente recebe **dois vereditos independentes**, cada um com a sua evidência e
a sua decisão gravada. Dá para cortar o site e manter o catálogo, ou o contrário.
Misturar os dois faz bloquear a coisa errada.

### Vereditos do e-commerce

| Veredito | Condição | Ação |
|---|---|---|
| **Só pega preço no site** | bateu a régua de acessos ao site, zero no site, zero na sala, zero histórico | cortar o site |
| **Vê preço, já comprou, parou** | idem, mas com média 3 meses, 90 dias, ou outro código do mesmo CNPJ comprando | vendedor liga **antes** do corte |
| **Vê preço no site, fecha na sala** | bateu a régua, zero no site, mas faturou na sala | não cortar — puxar o pedido para o site |
| **Consulta muito, compra pouco** | compra pelo site, mas rende menos que a régua por acesso | entender o que consulta e não fecha |
| **Compra pelo site** | fatura no site com retorno acima da régua | nada a fazer |
| **Entra de vez em quando** | acessos abaixo da régua | nada a decidir |
| **Não entra no site** | zero acesso ao site no mês | oportunidade de vendedor |
| **Fora do relatório do mês** | não apareceu no Sala × eCom | conferir filial e cadastro |

### Vereditos do catálogo Carpa

| Veredito | Condição | Ação |
|---|---|---|
| **Usa o catálogo e não compra nada** | acessos acima da régua e zero compra em qualquer canal, no mês e no histórico | cortar o Carpa |
| **Consulta o catálogo e compra** | usa o catálogo e compra da gente por algum caminho | uso legítimo |
| **Consulta pouco** | acessos abaixo da régua, sem compra | nada a decidir |
| **Tem catálogo e não entra** | login existe, zero acesso em 30 dias | mostrar o catálogo, ou recolher o login |
| **Sem acesso ao catálogo** | nenhum login na planilha de cadastros | se compra, dar acesso costuma aumentar o giro |

Quatro réguas ajustáveis na tela recalculam as duas filas ao vivo: acessos mínimos
ao site, retorno mínimo por acesso ao site, acessos mínimos ao catálogo e o
salvo-conduto de quem já comprou.

## 4. Regras que ele não quebra

São as mesmas do motor principal (`CLAUDE.md` §1), aplicadas aqui:

- **Ausência é `null`, nunca `0`.** Dado que falta vira lacuna declarada e “—” na
  tela. Zero vendido é um fato; dado ausente não é.
- **Nenhum veredito sem evidência.** Todo caso lista seus fatores. Sem fator, tem
  lacuna — nunca os dois vazios.
- **As duas plataformas nunca se misturam.** Carpa não vende; o e-commerce vende.
  Os acessos ao site são do mês (relatório) e os acessos ao catálogo são de 30 dias
  (Carpa): períodos e plataformas diferentes, nunca somados.
- **O mesmo CNPJ é olhado junto.** Antes de sugerir corte, confere se outro código
  da mesma raiz compra pelo canal — evita bloquear cadastro duplicado.
- **Quem compra na sala não é bloqueado.** Consultar e fechar com o vendedor é
  ação comercial, não motivo de corte.
- **A decisão é humana.** O painel ordena e explica; bloquear/manter/observar é
  marcação do gestor, e é só isso que fica gravado.
- **Nenhuma chamada de rede.** Sem `fetch`, sem `XMLHttpRequest`, sem CDN. Servido
  pela URL, `public/_headers` aplica `connect-src 'none'` a esta rota — o
  navegador passa a impor a promessa.

## 5. O ciclo do mês

1. Solta cada arquivo no seu quadro nomeado, na aba **Importar**.
2. Decide a fila em **Bloqueio**, com observação escrita.
3. **Exportar → um arquivo por vendedor**, sobe no Google Sheets, compartilha.
4. O vendedor preenche as quatro colunas de decisão e observação: duas do site,
   duas do catálogo.
5. Baixa do Sheets e solta de volta no painel: as marcações voltam para dentro.
6. **Exportar → Gerar HTML completo** para mandar ao outro gestor: o painel se
   reescreve com os dados embutidos, num arquivo só que abre sozinho.
7. Mês seguinte: o novo PDF entra como nova competência e a aba **Histórico**
   passa a mostrar quem entrou no canal, quem saiu e quem começou a só consultar.

## 6. Ao mexer nele

O arquivo é montado por concatenação de partes, mas vive versionado inteiro em
`public/carpa.html` — edite o arquivo final. Depois de qualquer mudança:

- Abra com os relatórios de verdade e confira se a contagem de linhas do PDF bate
  com o rodapé do relatório.
- Exporte um `.xlsx` e abra fora do navegador. O escritor de ZIP é próprio; se
  quebrar, quebra silenciosamente.
- Exporte o **HTML completo** e abra num perfil limpo de navegador. É o caminho
  que o outro gestor vai usar, e é o único que não passa por `localStorage`.
- `npm run check` não cobre este arquivo (os testes varrem `src/`). A conferência
  é manual, e por isso as três acima não são opcionais.
