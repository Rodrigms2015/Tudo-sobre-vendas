# DESIGN_SYSTEM.md — Sistema de design do BRUTO OS

Implementação: `tailwind.config.js` (tokens) e `src/index.css` (camada base e componentes).

**Direção:** central de comando industrial. Preto, grafite, amarelo industrial, branco de
contraste. Premium e maduro — sem jogo, sem neon, sem template de IA.

---

## 1. Cores

### Superfícies
| Token | Hex | Uso |
|---|---|---|
| `bruto-black` | `#0A0A0B` | Fundo da aplicação |
| `bruto-carbon` | `#121316` | Superfície de card |
| `bruto-graphite` | `#1C1E23` | Superfície elevada, cabeçalhos |
| `bruto-steel` | `#2A2D34` | Bordas e divisores |
| `bruto-ash` | `#8A9099` | Texto secundário |
| `bruto-white` | `#F5F6F7` | Texto primário |

### Acento e status
| Token | Hex | Significado — **um só** |
|---|---|---|
| `bruto-yellow` | `#F2B705` | Ação, foco, prioridade. **Nunca decoração.** |
| `bruto-amber` | `#D98C00` | Estado de atenção |
| `bruto-red` | `#D64545` | Crítico, perda, promessa quebrada |
| `bruto-green` | `#3E9E6A` | Confirmado, cumprido, ganho |
| `bruto-blue` | `#4A7FB5` | Informação, estimativa |

> **Regra de escassez:** o amarelo é o recurso mais caro do sistema. Se tudo é amarelo, nada é
> prioritário. Meta: **no máximo 3 elementos amarelos por tela**, e o botão principal é um deles.

### Contraste (WCAG AA verificado)
`bruto-white` sobre `bruto-black` = 17.4:1 · `bruto-ash` sobre `bruto-carbon` = 6.1:1 ·
`bruto-yellow` sobre `bruto-black` = 11.2:1 · `bruto-black` sobre `bruto-yellow` = 11.2:1.
Todos acima de 4.5:1.

### Cor nunca é o único portador de significado
Toda cor de status vem acompanhada de **rótulo textual** e, quando aplicável, de forma
(quadrado/losango/círculo). Requisito de acessibilidade WCAG 1.4.1 — e requisito prático, porque
o vendedor usa o app sob sol direto, onde a distinção de cor colapsa.

---

## 2. Tipografia

Pilha do sistema (zero requisição de rede, zero deslocamento de layout, funciona offline):

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

Números tabulares (`font-variant-numeric: tabular-nums`) em toda métrica, para que colunas de
valores alinhem.

| Papel | Tamanho | Peso |
|---|---|---|
| Métrica de destaque | 32–40 px | 700 |
| Título de tela | 22–28 px | 700 |
| Título de card | 16–18 px | 600 |
| Corpo | 15 px | 400 |
| Rótulo/meta | 12–13 px | 500, `tracking-wide`, caixa alta |

Mínimo absoluto: **12 px**. Abaixo disso não se lê no pátio de um cliente.

---

## 3. Espaçamento e grade

Escala base 4 px. Espaçamentos usados: 4, 8, 12, 16, 24, 32, 48.

| Largura | Layout |
|---|---|
| 390 / 430 px | 1 coluna, gutter 16 px, barra inferior 64 px |
| 768 px | 2 colunas, barra lateral recolhida |
| 1366 px | 3 colunas, barra lateral expandida (240 px) |
| 1920 px | 3 colunas, conteúdo com `max-width: 1600px` centralizado |

> Conteúdo não estica indefinidamente. Linha de texto acima de 90 caracteres é ilegível.

---

## 4. Componentes

### Card
Fundo `bruto-carbon`, borda `bruto-steel`, raio 12 px, sem sombra (sombra em fundo preto é ruído).
Elevação por **borda mais clara**, não por sombra.

### Botões
| Variante | Aparência | Uso |
|---|---|---|
| Primário | Fundo amarelo, texto preto | A ação da tela. **Um por tela.** |
| Secundário | Borda `steel`, texto branco | Ações de apoio |
| Fantasma | Só texto | Ações terciárias |
| Perigo | Borda vermelha, texto vermelho | Limpar dados, marcar perdido |

Altura mínima **44 px**; **48 px** em mobile. Alvo de toque nunca menor que 44×44 px (WCAG 2.5.5).

### Selo de procedência
Componente obrigatório para todo dado derivado:

| Procedência | Aparência |
|---|---|
| `CONFIRMADO` | Verde, ícone `●`, texto "confirmado" |
| `ESTIMADO` | Azul, ícone `◆`, texto "estimado" |
| `AUSENTE` | Cinza tracejado, ícone `○`, texto "ausente" |
| `DEMONSTRACAO` | Amarelo listrado, ícone `▨`, texto "demonstração" |

### Nível ANDON
Retângulo com faixa lateral de 4 px + rótulo textual, imitando torre de sinalização industrial.
`CRITICO` (vermelho) · `ATENCAO` (âmbar) · `INFORMACAO` (azul).

### Barra de score
Barra segmentada em nove blocos, um por componente, cada um com sua proporção. Passar o cursor ou
tocar revela o componente e sua pontuação. O score **nunca** aparece como número solto sem os
drivers ao lado.

### Gráficos
**Decisão: SVG próprio, sem biblioteca.** O produto precisa de exatamente quatro formas — barra,
linha esparsa, barra empilhada e mapa de calor por blocos. Uma biblioteca de gráficos custa
40–120 kB comprimidos para entregar 300 recursos que não usaremos, e força um tema próprio que
brigaria com este sistema. Os quatro componentes em `src/ui/charts/` somam menos de 6 kB, são
acessíveis por construção (`role="img"` + `aria-label` descritivo) e respeitam os tokens.

### Tabelas
**Decisão: implementação própria.** Ordenação, filtro e paginação em ~120 linhas. Em mobile, cada
linha vira card — comportamento que nenhuma biblioteca de tabela entrega bem sem configuração
extensa. Cabeçalho fixo, coluna de identificação fixa em desktop.

---

## 5. Movimento

Transições de 120–180 ms, apenas em `opacity` e `transform`. Nada pisca, nada pulsa, nada
"chama atenção" continuamente — um alerta que pisca é um alerta que será desligado.

`prefers-reduced-motion: reduce` desliga todas as transições. Respeitado globalmente no CSS base.

---

## 6. Acessibilidade — mínimo obrigatório

- Todo controle interativo é elemento nativo (`button`, `a`, `input`) ou tem `role` + teclado.
- Foco visível: contorno amarelo de 2 px com deslocamento de 2 px. **Nunca** `outline: none`.
- Navegação completa por teclado; ordem de tabulação segue a ordem visual.
- `aria-live="polite"` em contadores e resultados de filtro.
- Link "pular para o conteúdo" na primeira posição de tabulação.
- Rótulos de formulário sempre visíveis — `placeholder` não é rótulo.
- Contraste AA em todo texto, verificado na tabela da §1.

---

## 7. A foto de autoria

Regras da Seção 6.1 do PROMPT_MASTER, implementadas em `src/ui/components/AuthorPortrait.tsx`.

**Arquivo:** `public/rodrigo-soares.jpg` — 1086×1448, **3:4 exato**, 398 kB.

- **Nunca alterada.** Sem filtro, duotone, saturação, nitidez, retoque ou sobreposição de
  cor sobre o rosto. O único tratamento foi a conversão de container PNG → JPEG (qualidade
  95, croma 4:4:4), necessária porque o PNG original tinha 2,78 MB e a imagem entra no
  precache do PWA. Auditoria completa em `CRITICAL_REVIEW.md` §1.6.
- **Recorte zero.** O contêiner usa a razão nativa da foto (3:4), então `object-fit: cover`
  não descarta um único pixel. Essa é a leitura correta de "preservar proporções": não
  basta não distorcer, é preciso não cortar.
- **`object-position` ajustável** via prop, para o caso de a razão do contêiner passar a
  divergir da razão da imagem. No padrão atual não há efeito — não existe sobra para
  deslocar.
- **`width` e `height` declarados** no elemento, para que o navegador reserve o espaço e não
  haja deslocamento de layout durante o carregamento.
- **Sem `loading="lazy"`.** A foto está acima da dobra no herói da landing; adiar seu
  carregamento pioraria a percepção de velocidade em vez de melhorar.
- **Tratamento visual limitado a** moldura de 1 px e raio de canto no contêiner. Nada toca
  os pixels da imagem.
- **Degradação sem rosto:** se a imagem falhar ao carregar, exibe um monograma tipográfico
  ("RS") no mesmo enquadramento. Nunca uma silhueta, ilustração ou rosto gerado
  (`CRITICAL_REVIEW.md` §1.6).
- **Posicionamento:** assinatura de autoria e liderança, em escala contida (máximo 300 px de
  largura) — não é banner de propaganda.

**Ao trocar a foto:** se a nova imagem não for 3:4, ajuste a prop `proporcao` para a razão
nativa dela, senão o `cover` volta a recortar. `src/test/portrait.test.ts` falha se o
arquivo sumir, mudar de razão, ficar abaixo de 800 px de largura ou passar de 700 kB.

---

## 8. Antipadrões proibidos

| Proibido | Motivo |
|---|---|
| Gradiente roxo/azul | Assinatura visual de template de IA |
| Efeito de vidro fosco | Reduz contraste, custa desempenho |
| Ícone de caminhão como decoração | O usuário trabalha com caminhões; não precisa de lembrete |
| Neon, brilho, sombra colorida | Estética de jogo |
| Emoji na interface do produto | Não é linguagem de central operacional |
| Número grande sem contexto nem ação | Painel decorativo (viola P7) |
| Barra de progresso animada em métrica estática | Sugere cálculo que não está acontecendo |
| Ilustração vetorial genérica em estado vazio | Estado vazio é ação, não decoração |
| Modal para confirmação trivial | Custo de clique sem retorno |
