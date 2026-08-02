# DATA_MODEL.md — Modelo de dados do BRUTO OS

Implementação canônica: `src/domain/types.ts`. Persistência: `src/data/db.ts` (IndexedDB).
Este documento descreve as entidades e, sobretudo, **as decisões de modelagem** por trás delas.

---

## 1. Princípios

1. **Procedência em nível de campo.** Todo valor derivado ou incerto carrega
   `Procedencia = CONFIRMADO | ESTIMADO | AUSENTE | DEMONSTRACAO`. A UI nunca exibe um número
   estimado com a mesma aparência de um confirmado.
2. **Ausência é explícita.** Campos desconhecidos são `null`, nunca `0` ou `""`. Zero é um valor
   comercial legítimo; ausência não é. Confundir os dois corrompe todo o motor.
3. **Nada é derivado no banco.** Score, temperatura, cadência, alertas e recomendações são
   **calculados em tempo de leitura** pelo motor. Persistir score cria estado obsoleto e torna
   impossível recalibrar pesos.
4. **IDs estáveis e legíveis.** `cli-001`, `orc-014`. Facilita depuração, suporte e leitura de CSV.
5. **Datas em ISO 8601** (`YYYY-MM-DD` ou completo), sempre string. Evita a armadilha de fuso do
   `Date` no JSON e mantém o export legível.

---

## 2. Entidades

Todas as 24 entidades exigidas pela Seção 12 do PROMPT_MASTER estão presentes.

### Identidade e organização

| Entidade | Papel | Campos-chave |
|---|---|---|
| `User` | Quem opera o app | `id`, `nome`, `papel: VENDEDOR_INTERNO \| VENDEDOR_EXTERNO \| GESTOR`, `sellerId` |
| `Seller` | Vendedor dono da carteira | `id`, `nome`, `regiao`, `metaMensal` |

> **Decisão:** `User` e `Seller` são separados porque um gestor **é** usuário sem **ser** dono de
> carteira, e precisa enxergar múltiplas carteiras. Fundi-los quebra a visão de equipe.

### Carteira

| Entidade | Papel | Campos-chave |
|---|---|---|
| `Customer` | Conta comercial | `id`, `nomeFantasia`, `cidade`, `uf`, `segmento`, `tipoCliente`, `sellerId`, `potencial`, `criadoEm`, `observacoes` |
| `Contact` | Pessoa na conta | `id`, `customerId`, `nome`, `cargo`, `canalPreferido`, `telefoneMascarado` |
| `Fleet` | Perfil de frota **estimado** | `id`, `customerId`, `totalVeiculos \| null`, `perfilOperacao: RODOVIARIO \| URBANO \| MISTO \| null`, `idadeMediaAnos \| null`, `procedencia` |
| `Vehicle` | Veículo conhecido da frota | `id`, `fleetId`, `marca`, `modelo`, `ano \| null`, `quantidade` |

> **Decisão:** `Fleet` é separado de `Customer` e inteiramente anulável porque **na prática ela
> quase nunca existe**. Modelar frota como campos obrigatórios do cliente força o preenchimento
> com lixo. Separada e anulável, a ausência vira uma lacuna acionável e mensurável.

### Catálogo

| Entidade | Papel | Campos-chave |
|---|---|---|
| `ProductFamily` | Família comercial | `id`, `nome`, `sistema`, `cicloMedioDias \| null` |
| `Product` | Item | `id`, `familyId`, `descricao`, `codigoInterno`, `marca` |
| `ProductRelation` | Correlação **comercial** entre famílias | `origemFamilyId`, `destinoFamilyId`, `tipo: KIT \| CORRELATO \| INSTALACAO`, `suporte`, `procedencia` |
| `VehicleApplication` | Aplicação veículo↔peça | `id`, `productId`, `marca`, `modelo`, `motor`, `anoInicio`, `anoFim`, `fonteCatalogo` |

> **Decisão crítica:** `VehicleApplication` existe no schema mas o seed de demonstração a entrega
> **vazia, de propósito** (`CRITICAL_REVIEW.md` §1.4). A tela mostra um estado vazio explicando
> que aplicação técnica só aparece após importação de catálogo validado. A recusa é a
> funcionalidade.
>
> `ProductRelation` liga **família a família**, nunca produto a produto. Relação entre produtos
> específicos seria indistinguível de aplicação técnica aos olhos do vendedor.

### Atividade comercial

| Entidade | Papel | Campos-chave |
|---|---|---|
| `Interaction` | Contato registrado | `id`, `customerId`, `tipo: LIGACAO \| VISITA \| WHATSAPP \| EMAIL`, `data`, `util: boolean`, `urgente`, `resumo` |
| `Quote` | Orçamento | `id`, `customerId`, `data`, `status: ABERTO \| GANHO \| PERDIDO \| EXPIRADO`, `valorTotal`, `validadeDias` |
| `QuoteItem` | Linha do orçamento | `id`, `quoteId`, `productId`, `quantidade`, `valorUnitario` |
| `Sale` | Venda faturada | `id`, `customerId`, `data`, `valorTotal`, `margemPercentual \| null`, `quoteId \| null` |
| `SaleItem` | Linha da venda | `id`, `saleId`, `productId`, `familyId`, `quantidade`, `valorTotal` |
| `LostSale` | Venda perdida | `id`, `customerId`, `data`, `motivo: MotivoPerda`, `valorEstimado`, `familyId \| null`, `recuperavel`, `detalhe` |

> **Decisão:** `Interaction.util` é booleano deliberado. Contato não é métrica; **contato útil**
> é. Um "liguei e não atenderam" registrado como contato inflaria a telemetria e destruiria a
> métrica de qualidade descrita no PRODUCT_VISION §8.
>
> `Sale.margemPercentual` é anulável porque muitos ERPs não expõem margem ao vendedor. Ausente,
> o componente de margem do score não pontua e registra lacuna — nunca assume um valor médio.

### Execução e disciplina

| Entidade | Papel | Campos-chave |
|---|---|---|
| `Promise` | Compromisso assumido com o cliente | `id`, `customerId`, `descricao`, `dataPrometida`, `status: PENDENTE \| CUMPRIDA \| QUEBRADA` |
| `Task` | Tarefa do vendedor | `id`, `customerId \| null`, `titulo`, `prazo`, `status`, `origemRecommendationId \| null` |
| `DailyDebrief` | Fechamento do dia | `id`, `data`, `sellerId`, `acoesExecutadas`, `avancos`, `travas`, `aprendizado`, `prioridadeAmanha` |

> **Decisão:** `Promise` é entidade de primeira classe, não um tipo de `Task`. Promessa quebrada é
> o dano reputacional mais caro do setor e merece seu próprio ciclo de vida, seu próprio alerta
> crítico e sua própria métrica.

### Motor (derivado, não persistido como verdade)

| Entidade | Papel |
|---|---|
| `Recommendation` | Próxima melhor ação. **Calculada**, nunca semeada. Estende `Explicavel`. |
| `Alert` | Sinal ANDON. **Calculado**. Estende `Explicavel`. |
| `RecommendationFeedback` | Aceite/rejeição com motivo. **Persistido** — é a memória do aprendizado. |
| `AlertAck` | Reconhecimento de alerta com motivo. **Persistido**. |

> **Decisão:** recomendações e alertas são recalculados a cada leitura. O que persiste é a
> **decisão humana** sobre eles. Isso permite recalibrar pesos e ver o efeito imediatamente, sem
> migração de dados.

### Conhecimento

| Entidade | Papel | Campos-chave |
|---|---|---|
| `Playbook` | Roteiro por tipo de cliente/situação | `id`, `titulo`, `contexto`, `passos[]`, `validado` |
| `KnowledgeArticle` | Nota, glossário, procedimento | `id`, `titulo`, `categoria`, `conteudo`, `validado`, `tags[]` |

> **Decisão:** `validado: boolean` é obrigatório e a UI **separa fisicamente** as duas listas.
> Conteúdo validado e conteúdo de demonstração nunca aparecem misturados (PROMPT_MASTER §6.11).

### Governança

| Entidade | Papel | Campos-chave |
|---|---|---|
| `ImportJob` | Registro de importação | `id`, `data`, `entidade`, `linhasLidas`, `linhasAceitas`, `erros[]`, `consentimento` |
| `AuditEvent` | Trilha local de ações | `id`, `data`, `tipo`, `descricao`, `entidade`, `entidadeId` |

---

## 3. Relacionamentos

```
User ──1:1── Seller
Seller ──1:N── Customer
Customer ──1:N── Contact
Customer ──1:1── Fleet ──1:N── Vehicle
Customer ──1:N── Interaction, Quote, Sale, LostSale, Promise, Task
Quote ──1:N── QuoteItem ──N:1── Product
Sale ──1:N── SaleItem ──N:1── Product
Quote ──0:1── Sale                    (orçamento convertido)
ProductFamily ──1:N── Product
ProductFamily ──N:N── ProductFamily   (via ProductRelation)
Product ──1:N── VehicleApplication    (vazio até catálogo validado)
Recommendation ──N:1── Customer
Recommendation ──1:N── RecommendationFeedback
Alert ──N:1── Customer
Alert ──1:N── AlertAck
Recommendation ──0:1── Task           (aceitar gera tarefa)
```

### Integridade referencial

Sem SGBD, a integridade é garantida em três camadas:

1. **Tipos TypeScript** em tempo de compilação.
2. **Validadores de importação** (`src/data/validators.ts`) rejeitam linhas com FK inexistente e
   reportam a linha exata.
3. **Teste de integridade do seed** (`seed.test.ts`) percorre todas as FKs e falha se alguma
   apontar para o vazio.

---

## 4. Persistência

IndexedDB, banco `bruto-os`, versão 1, um object store por entidade, com índices em
`customerId`, `sellerId`, `data` e `familyId` — as quatro chaves de consulta do motor.

**Por que IndexedDB e não `localStorage`:** o seed já passa de 400 registros; carteiras reais
passam de 50 mil. `localStorage` é síncrono (trava a UI) e limitado a ~5 MB. IndexedDB é
assíncrono e suporta centenas de MB.

**Por que `idb` (~1 kB) e não a API nativa crua:** a API nativa baseada em eventos produz código
propenso a erro em transações. `idb` é a menor camada possível sobre ela.

---

## 5. Importação e exportação

**Importação CSV** para `Customer`, `Contact`, `Fleet`, `Vehicle`, `Product`, `ProductFamily`,
`Sale`, `SaleItem`, `Quote`, `QuoteItem`, `LostSale`, `Interaction`.

Fluxo: consentimento explícito → leitura → validação linha a linha → prévia com contagem de
aceitos/rejeitados → confirmação → gravação transacional → `ImportJob` + `AuditEvent`.

Importação é **parcial por padrão**: linhas válidas entram, inválidas são reportadas em CSV de
erros exportável com número da linha e motivo. Rejeitar o arquivo inteiro por uma linha ruim é o
comportamento que faz o usuário desistir da importação.

**Exportação:** CSV por entidade e JSON completo (backup restaurável). O JSON inclui `versao` e
`exportadoEm` para permitir migração futura.

---

## 6. Dados de demonstração

Volumes do seed (PROMPT_MASTER §11), verificados por teste:

| Entidade | Mínimo exigido | Entregue |
|---|---|---|
| Clientes | 30 | 32 |
| Cidades | 10 | 12 |
| Segmentos | 5 | 6 |
| Produtos | 120 | 126 |
| Famílias | 12 | 14 |
| Vendas | 80 | 236 |
| Orçamentos | 25 | 25 |
| Interações | 35 | 58 |
| Perdas | 20 | 31 |
| Promessas | 15 | 19 |
| Alertas | 10 | 20 (derivados) |
| Recomendações | 20 | 22 (derivados) |

Complementos: 341 itens de venda, 42 contatos, 59 veículos, 6 playbooks, 10 artigos e
**zero** aplicações técnicas.

> A distribuição por cidade é **deliberadamente desigual** (São Paulo com 6 contas, Caruaru
> com 1). Espalhar 32 clientes igualmente por 12 praças produziria um mapa de calor em que
> toda célula tem o mesmo valor — um mapa que não informa nada. Verificado por teste.
>
> A atribuição de vendedor é **intercalada** com os arquétipos (1 em cada 4 contas vai para o
> vendedor externo). Atribuir por blocos de índice faria os arquétipos finais — cadastro
> incompleto, contas quietas — caírem todos no mesmo vendedor, e a carteira padrão da
> demonstração ficaria sem nenhuma lacuna para exercitar. Também verificado por teste.

Alertas e recomendações são **derivados**, não semeados (`CRITICAL_REVIEW.md` §3.4). O seed é
construído para que a carteira gere pelo menos esses volumes, e os testes verificam o piso.

O seed é **determinístico** — usa um PRNG com semente fixa. Mesma versão do código, mesmos dados,
sempre. Isso torna os testes estáveis e as demonstrações reproduzíveis.

**Todos os dados são sintéticos.** Nomes fictícios, telefones mascarados (`(11) 9····-1234`),
nenhum CNPJ, nenhum e-mail, nenhum preço interno. Ver `SECURITY.md`.
