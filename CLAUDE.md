# CLAUDE.md — Convenções do BRUTO OS

Instruções para qualquer pessoa (ou agente) que continue este trabalho.
Leia [`docs/CRITICAL_REVIEW.md`](docs/CRITICAL_REVIEW.md) antes de mudar qualquer coisa no
motor: quase toda decisão não óbvia deste código está justificada lá.

---

## 1. Regras inegociáveis

Estas não são preferências de estilo. Quebrá-las descaracteriza o produto.

### R1 — Nunca afirmar aplicação técnica
Nenhuma tela pode concluir que uma peça serve em um veículo. O grafo para no nível de
**família**. `VehicleApplication` só é populada por importação de catálogo validado com
fonte rastreável. Se você se pegar escrevendo código que liga produto a marca/modelo de
veículo, pare. Ver `SECURITY.md` §6.

### R2 — Nenhuma saída do motor sem explicação
`Recommendation` e `Alert` estendem `Explicavel`. Não relaxe esse tipo. Se um card não tem
fator, ele precisa ter lacuna — nunca os dois vazios.

### R3 — Ausência é `null`, nunca `0` nem `""`
Zero é um valor comercial legítimo. Confundir os dois corrompe o motor inteiro. Quando um
dado falta, o componente correspondente **não pontua** e registra uma lacuna.

### R4 — Tempo é medido contra a cadência do cliente
Nunca introduza um limiar em dias absolutos ("45 dias sem comprar"). Sempre
`atrasoRelativo = dias / intervaloMediano`. Ver `SCORING_ENGINE.md` §1.

### R5 — Sem base, sem janela
Menos de 3 intervalos observados → `SEM_BASE` → **nenhuma janela de reposição é exibida**.
Não afrouxe esse limiar para "aumentar cobertura".

### R6 — Recomendações e alertas são derivados, nunca persistidos
O que persiste é a decisão humana (`RecommendationFeedback`, `AlertAck`). Persistir score
cria estado obsoleto e impede recalibrar pesos.

### R7 — Nenhuma chamada de rede
O MVP não tem backend. `fetch`, `XMLHttpRequest` e `WebSocket` são proibidos e verificados
por teste (`src/test/security.test.ts`).

### R8 — Vocabulário do setor
Proibidos na interface: *IA*, *inteligente*, *prever*, *machine learning*, *lead*, *funil*,
*pipeline*, *engajamento*, *em breve*. Os três últimos são verificados por teste.

---

## 2. Onde as coisas ficam

```
src/domain/     Lógica pura. Sem React, sem DOM, sem IndexedDB.
                Se precisa de `window`, não pertence aqui.
src/data/       Persistência, CSV, validação, exportação.
src/state/      Um único Context. Sem biblioteca de estado.
src/ui/         Componentes. Nenhuma regra de negócio.
docs/           Documentos estratégicos. Mantenha-os sincronizados com o código.
```

**A camada `domain` não importa nada de `ui` nem de `data`.** Essa direção de dependência é
o que mantém o motor testável sem DOM e sem banco.

---

## 3. Idioma

**Todo o código é em português**: nomes de função, variáveis, tipos, comentários, testes.
Isso é deliberado — o domínio é brasileiro e o vocabulário do setor não se traduz bem.
Exceções: identificadores de entidade (`Customer`, `Sale`, `Quote`) e a API do React.

Não misture. `calcularScore`, não `calculateScore`.

---

## 4. Testes

```bash
npm run check   # lint + testes + build. É o portão. Rode antes de commitar.
```

**Todo teste tem um nome que descreve a regra de negócio**, não a implementação:

```ts
// bom
it('trata 40 dias como NORMAL para quem compra a cada 90', ...)
// ruim
it('calcularCadencia retorna NO_CICLO', ...)
```

Ao mudar um limiar do motor, o teste correspondente **deve** falhar. Se não falhar, o teste
não estava protegendo nada — conserte o teste, não só o código.

`src/test/fixtures.ts` tem fábricas com sobrescrita parcial. Use-as; não construa entidades
à mão nos testes.

---

## 5. Convenções de UI

- **Cor nunca é o único portador de significado.** Todo status tem rótulo textual.
- **Alvo de toque mínimo 44 px**, 48 px em mobile.
- **`outline: none` é proibido.** O foco visível é requisito.
- **Um botão primário (amarelo) por tela.** O amarelo é o recurso mais caro do sistema.
- **Nenhum estado vazio decorativo.** Todo estado vazio diz o que falta e oferece a ação.
- **Nenhum card informativo puro** no fluxo principal. Se não gera ação, não existe.
- `dangerouslySetInnerHTML` é bloqueado pelo ESLint e por teste.

---

## 6. Ao adicionar um componente ao score

1. Adicione a chave em `ComponentesScore` e o peso em `PESOS_PADRAO` (**a soma deve dar 100**).
2. Adicione o rótulo em `ROTULO_COMPONENTE` e a cor em `CORES_COMPONENTE` (`CardAcao.tsx`).
3. Calcule em `scoring.ts`, **sempre** empurrando um `Fator` com evidência concreta — ou uma
   lacuna, se o dado faltar.
4. Documente a regra em `SCORING_ENGINE.md` §2.
5. Escreva o teste do mínimo **e** do máximo em `scoring.test.ts`.

## 7. Ao adicionar um tipo de alerta

1. Adicione em `TipoAlerta` e em `ROTULO_TIPO_ALERTA` (`types.ts`).
2. Adicione a **precedência** em `PRECEDENCIA_ALERTA` (`andon.ts`) — sem isso o
   `Record` não compila.
3. Detecte em `detectarCandidatos`, preenchendo os seis campos narrativos.
4. **Se você não sabe qual ação pedir ao vendedor, não crie o alerta.**
5. Documente em `SCORING_ENGINE.md` §6.1 e teste em `andon.test.ts`.

---

## 8. Dados de demonstração

`src/domain/seed/` é **determinístico**: mesma data de referência, mesmos dados. Nunca use
`Math.random()` ali — use a classe `Aleatorio`.

A carteira é construída por **arquétipos** para exercitar cada caminho do motor. Ao mudar a
distribuição, rode `seed.test.ts`: ele verifica volumes mínimos, integridade referencial,
cobertura de tipos de ação, desigualdade entre praças e ausência de dados sensíveis.

---

## 9. Ao mudar o schema do IndexedDB

1. Incremente `VERSAO_BANCO` em `src/data/db.ts`.
2. Trate a migração no callback `upgrade`.
3. **Antes de publicar**, leia `DEPLOYMENT.md` §8 sobre rollback: o navegador recusa abrir
   um banco cuja versão em disco é maior que a solicitada.
4. `carregarConfiguracoes` já mescla com `SETTINGS_PADRAO`, então adicionar uma chave de
   configuração **não** exige migração.

---

## 10. Antes de commitar

- [ ] `npm run check` verde
- [ ] Documento correspondente em `docs/` atualizado, se a regra mudou
- [ ] Nenhum dado real em lugar nenhum
- [ ] Nenhum texto novo com vocabulário proibido (§1 R8)
- [ ] Se mexeu no motor: o teste correspondente falharia sem a sua mudança?
