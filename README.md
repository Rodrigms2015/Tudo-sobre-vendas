# BRUTO OS

### O sistema operacional de vendas da linha pesada

> Pare de ligar para todo mundo. Ligue para a conta certa, com a peça certa, no momento certo.

Camada de decisão entre a carteira do vendedor de peças de caminhão e ônibus e a próxima
ação comercial. Funciona **offline**, **sem backend**, **sem API paga** e **sem nenhum dado
saindo do dispositivo**.

Idealizado por **Rodrigo Soares**.

---

## O que ele faz

Toda tela responde uma pergunta só:

> **Qual é a melhor ação que este vendedor deve executar agora, por qual motivo e com qual
> abordagem?**

| Módulo | O que entrega |
|---|---|
| **Cockpit do Dia** | Prioridade do dia em 10 segundos: ANDON crítico, Top 3 ações, compromissos |
| **Radar da Carteira** | 9 visualizações por situação comercial, não por ordem alfabética |
| **Perfil 360** | Situação, histórico, frota, oportunidade, execução + **Preparar ligação** (SCAR) |
| **Diagnóstico Guiado** | 12 etapas que produzem **perguntas**, nunca um número de peça |
| **Next Best Action** | Fila com raciocínio exposto, aceite e rejeição com motivo |
| **ANDON Comercial** | Anormalidades com teto de 3 críticos e um alerta por conta |
| **Venda Perdida** | Registro em 20 segundos; ranking de motivos apontando o gargalo |
| **Simulador de Cenários** | 6 cenários com rubrica escrita — **não é IA, e a tela diz isso** |
| **Debriefing** | Pré-preenchido com o dia real. Meta: 60 segundos |
| **Telemetria** | Execução antes de receita, com métricas antifraude |
| **Centro de Conhecimento** | Playbooks e artigos, validado e não validado **separados** |
| **Dados** | Importação/exportação CSV, backup JSON, calibração do motor, privacidade |

---

## As quatro decisões que definem o produto

Documentadas e justificadas em [`docs/CRITICAL_REVIEW.md`](docs/CRITICAL_REVIEW.md).

### 1. Cadência relativa substitui dias absolutos

40 dias sem comprar é **normal** para quem compra a cada 90 e **catastrófico** para quem
compra a cada 7. O BRUTO OS mede o atraso contra o ciclo do próprio cliente:

```
atrasoRelativo = diasDesdeUltimaCompra / intervaloMedianoDoCliente
```

É por isso que a lista de "clientes esfriando" de um CRM comum é inútil: ela fica dominada
por clientes que nunca foram quentes.

### 2. Nível de evidência substitui percentual de confiança

Com menos de 4 compras, **nenhuma janela de reposição é exibida**. Em vez de um "78% de
confiança" inventado, o sistema mostra `SEM_BASE` / `BASE_FRACA` / `BASE_RAZOAVEL`, derivado
do número de intervalos observados e da regularidade entre eles. Cliente irregular nunca
passa de `BASE_FRACA`, por mais que compre.

### 3. Aplicação técnica é recusada por construção

O grafo de oportunidade opera em `Sistema → Família → Família correlata` e **é incapaz** de
descer a peça, marca ou modelo — os tipos não permitem. A entidade `VehicleApplication`
chega **vazia** na demonstração, com um estado vazio explicando o porquê.

Isso não é uma pendência: é a funcionalidade. Enviar a peça errada para um veículo parado
custa frete de devolução, mais horas de veículo imobilizado e, com frequência, a conta.

### 4. Explicabilidade é imposta pelo tipo, não pela disciplina

```ts
interface Explicavel {
  fatores: Fator[];        // { rotulo, peso, evidencia }
  penalidades: Fator[];
  lacunas: string[];
  proximaPergunta: string | null;
}
```

`Recommendation` e `Alert` estendem `Explicavel`. **É impossível compilar uma recomendação
sem raciocínio exposto.**

---

## Começando

```bash
npm ci
npm run dev          # http://localhost:5173
```

Abra a aplicação → **Entrar no Cockpit** → **Carregar dados de demonstração**.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento com recarga automática |
| `npm run check` | **Portão de qualidade:** lint + 230 testes + build |
| `npm test` | Testes |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build de produção |
| `npm run lint` | ESLint com zero tolerância a aviso |
| `npm run format` | Prettier |

---

## A foto de autoria

`public/rodrigo-soares.jpg` — 1086×1448, **3:4 exato**, 398 kB.

O contêiner do componente usa a mesma razão 3:4, então `object-fit: cover` **não recorta um
único pixel**: a foto aparece exatamente como foi entregue. O único tratamento aplicado foi
a conversão de PNG (2,78 MB) para JPEG qualidade 95 sem subamostragem de croma — necessária
para não inchar o precache do PWA. Sem redimensionar, sem cortar, sem filtro, sem retoque,
sem sobreposição. Erro médio medido: **0,36%**, todo ele do re-encode em fios de cabelo e
barba. A auditoria completa, operação por operação, está em
[`docs/CRITICAL_REVIEW.md`](docs/CRITICAL_REVIEW.md) §1.6.

Se a imagem falhar ao carregar, o componente exibe um **monograma tipográfico** no mesmo
enquadramento — nunca uma silhueta, ilustração ou rosto gerado. Quatro testes protegem o
arquivo: existência, razão, resolução mínima e teto de peso.

Para trocar a foto, basta substituir o arquivo. Se a nova imagem não for 3:4, ajuste a prop
`proporcao` do `AuthorPortrait` para a razão nativa dela — caso contrário `cover` vai
recortar. Detalhes em [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) §7.

---

## Dados

**Tudo fica no dispositivo.** IndexedDB, sem servidor, sem conta, sem sincronização. A CSP
com `connect-src 'self'` faz o **navegador impedir** o envio para qualquer host externo —
mesmo que uma dependência comprometida tentasse.

O modelo de dados **não tem campo de CNPJ nem de e-mail**, por decisão de segurança: um
campo que não existe não vaza. Telefones da demonstração são sempre mascarados.

### Demonstração

32 clientes sintéticos, 236 vendas, 25 orçamentos, 31 perdas, 19 promessas, 126 produtos em
14 famílias — todos gerados por um PRNG com semente fixa, portanto **reproduzíveis**. A
carteira é construída por **arquétipos** (urgência, compromisso, recuperação, reposição,
reativação, expansão, cadastro incompleto, conta quieta) para que cada caminho do motor
tenha o que exercitar.

Aplicações técnicas: **zero registros**, por decisão de projeto.

### Importação

`Dados → Importar`. Consentimento explícito antes da leitura, validação linha a linha,
**importação parcial** (o que é válido entra) e CSV de erros exportável com número da linha
e motivo. Modelos de CSV para download na própria tela.

### Exportação

Backup JSON completo e restaurável, ou CSV por entidade. Toda célula exportada é
neutralizada contra **injeção de fórmula** — `=`, `+`, `-`, `@` recebem um apóstrofo para
que o Excel os trate como texto.

---

## Arquitetura

```
src/
├── domain/              Lógica de negócio pura. Sem React, sem DOM.
│   ├── types.ts         24 entidades + contrato de explicabilidade
│   ├── dates.ts         Datas ISO em UTC (evita erro de fuso de um dia)
│   ├── engine/          cadence · scoring · recommendations · andon
│   │                    radar · graph · scar · telemetry · context
│   ├── seed/            Gerador determinístico + catálogo + conhecimento
│   └── content/         Cenários do simulador (rubrica escrita à mão)
├── data/                db (IndexedDB) · csv · validators · exporter
├── state/               Context + useReducer
└── ui/                  layout · components · charts · pages
```

**Dependências de produção: quatro.** `react`, `react-dom`, `react-router-dom`, `idb`.

Sem biblioteca de gráficos (SVG próprio, ~6 kB para as 4 formas necessárias), sem biblioteca
de tabelas (em mobile cada linha vira card), sem biblioteca de estado, de datas ou de UI.
Cada uma custaria dezenas de kB e ampliaria a superfície de cadeia de suprimentos de um app
que não tem backend. Racional em [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) §4 e
[`docs/SECURITY.md`](docs/SECURITY.md) §8.

**Recomendações e alertas não são armazenados.** São recalculados a cada leitura, o que
permite recalibrar os pesos do motor em `Dados → Calibrar` e ver o efeito na fila
imediatamente, sem migração. O que persiste é a **decisão humana** sobre eles.

---

## Testes

**230 testes** cobrindo motor, dados, segurança e interface:

| Arquivo | O que protege |
|---|---|
| `cadence.test.ts` | Mediana, evidência, limiares — e que 40 dias significa coisas opostas em cadências diferentes |
| `scoring.test.ts` | Cada componente no mínimo e no máximo; soma ≤ 100; calibração |
| `recommendations.test.ts` | Precedência de tipo sobre score; `BAIXA` fora do Top 3; aprendizado visível |
| `andon.test.ts` | Teto de 3 críticos; um alerta por conta; janela de silêncio; veículo parado acima de perda maior |
| `radar.test.ts` | Nenhuma janela sem base; largura por evidência; frota **não** influencia a janela |
| `graph.test.ts` | O grafo é **incapaz** de descer a produto, marca ou modelo |
| `seed.test.ts` | Volumes, integridade referencial, determinismo, zero aplicações técnicas, zero CNPJ |
| `csv.test.ts` | Injeção de fórmula, aspas, CRLF, BOM, ponto e vírgula, round-trip |
| `validators.test.ts` | Importação parcial, chave estrangeira, arquivo hostil, truncamento |
| `persistence.test.ts` | IndexedDB, limpeza seletiva, backup e restauração |
| `security.test.ts` | Sem `dangerouslySetInnerHTML`, sem `eval`, **sem chamada de rede**, sem segredo, vocabulário proibido |
| `scenarios.test.ts` | Rubrica completa, melhor resposta única, conteúdo de domínio |
| `app.test.tsx` | Fluxo completo: estado vazio → demonstração → executar/rejeitar ação |
| `portrait.test.ts` | Foto de autoria: existência, razão 3:4, resolução e teto de peso |

---

## Documentação

Escrita **antes** do código, conforme o briefing:

| Documento | Conteúdo |
|---|---|
| [`CRITICAL_REVIEW.md`](docs/CRITICAL_REVIEW.md) | **Comece por aqui.** Crítica dura da proposta, riscos, cortes e substituições |
| [`PRODUCT_VISION.md`](docs/PRODUCT_VISION.md) | Visão, princípios, diferenciação, métricas, hipóteses |
| [`USER_JOURNEYS.md`](docs/USER_JOURNEYS.md) | 11 jornadas com orçamento de tempo e de cliques + anti-jornadas |
| [`INFORMATION_ARCHITECTURE.md`](docs/INFORMATION_ARCHITECTURE.md) | Navegação, hierarquia, estados vazios, vocabulário |
| [`DATA_MODEL.md`](docs/DATA_MODEL.md) | 24 entidades, relacionamentos e decisões de modelagem |
| [`SCORING_ENGINE.md`](docs/SCORING_ENGINE.md) | Especificação normativa do motor |
| [`DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Cores, tipografia, componentes, acessibilidade, antipadrões |
| [`SECURITY.md`](docs/SECURITY.md) | Modelo de ameaça, CSP, LGPD, checklist |
| [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Comandos exatos, Cloudflare Pages, domínio, rollback |
| [`ROADMAP.md`](docs/ROADMAP.md) | Fases 1 a 5 e o que **nunca** será feito |
| [`CLAUDE.md`](CLAUDE.md) | Convenções para quem for continuar o trabalho |

---

## O que este produto se recusa a fazer

| Recusa | Motivo |
|---|---|
| Prever falha mecânica | Não há telemetria de veículo. Seria mentira. |
| Afirmar aplicação técnica sem catálogo | O risco físico e comercial é real |
| Chamar o motor de "inteligência artificial" | Ele é determinístico. Chamar de IA seria mentira — e desnecessária |
| Exibir janela de reposição com base fraca | Astrologia com barra de progresso |
| Gamificação com medalhas e rankings | Vendedor sênior desliga o produto |
| Marcar qualquer coisa como "em breve" na interface | Verificado por teste automatizado |

---

## Licença

Projeto proprietário. Todos os dados de demonstração são sintéticos.

> **Dados demonstrativos — nenhuma aplicação técnica deve ser usada comercialmente.**
