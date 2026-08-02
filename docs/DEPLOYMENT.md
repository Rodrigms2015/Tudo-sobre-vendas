# DEPLOYMENT.md — Build e publicação

O BRUTO OS é uma aplicação **estática**: HTML, CSS, JS e um service worker. Não há
servidor, banco, variável de ambiente ou segredo. Isso torna o deploy trivial e o
rollback instantâneo.

---

## 1. Requisitos

| Item | Versão |
|---|---|
| Node.js | 20 ou superior (testado em 22) |
| npm | 10 ou superior |

**Nenhuma variável de ambiente é necessária.** Se você encontrar um `.env` neste projeto,
algo está errado — a aplicação não lê variável de ambiente em tempo de execução.

---

## 2. Comandos locais

```bash
# instalar dependências
npm ci

# desenvolvimento com recarga automática (http://localhost:5173)
npm run dev

# verificação completa: lint + testes + build. Use isto antes de publicar.
npm run check

# apenas testes
npm test

# apenas build de produção (saída em dist/)
npm run build

# servir o build de produção localmente (http://localhost:4173)
npm run preview
```

**`npm run check` é o portão de qualidade.** Ele roda `eslint --max-warnings 0`, os 246
testes e o build com verificação de tipos. Se ele passar, o deploy é seguro.

---

## 3. Saída do build

```
dist/
├── index.html
├── manifest.webmanifest
├── sw.js                    ← service worker (offline)
├── workbox-*.js
├── registerSW.js
├── _headers                 ← cabeçalhos de segurança (Cloudflare Pages / Netlify)
├── _redirects               ← fallback de SPA
├── favicon.svg
├── rodrigo-soares.jpg       ← retrato de autoria, servido sem processamento
├── icon-192.png, icon-512.png, icon-maskable-512.png
├── robots.txt
└── assets/
    ├── index-*.css          ~25 kB  (5 kB comprimido)
    ├── index-*.js           ~247 kB (74 kB comprimido)
    └── vendor-*.js          ~165 kB (54 kB comprimido)
```

Total transferido no primeiro carregamento: **~133 kB comprimido**. Carregamentos
seguintes vêm do service worker, inclusive offline.

---

## 4. Deploy no Cloudflare Pages — via painel (recomendado)

1. Faça push do repositório para o GitHub.
2. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** →
   **Connect to Git**.
3. Selecione o repositório.
4. Configure exatamente:

| Campo | Valor |
|---|---|
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(vazio)* |
| Node version | `20` (via variável `NODE_VERSION`, se necessário) |

5. **Environment variables:** nenhuma. Deixe vazio.
6. **Save and Deploy.**

A partir daí, cada push na branch de produção dispara um novo deploy; pushes em outras
branches geram *preview deployments* com URL própria.

### Definir a versão do Node (se o build falhar)

Settings → Environment variables → Production **e** Preview:

```
NODE_VERSION = 20
```

---

## 5. Deploy no Cloudflare Pages — via linha de comando

```bash
# uma vez, na máquina
npm install -g wrangler
wrangler login

# a cada publicação
npm run check
npx wrangler pages deploy dist --project-name=bruto-os --branch=main
```

Para criar o projeto pela primeira vez sem conectar ao Git:

```bash
npx wrangler pages project create bruto-os --production-branch=main
npx wrangler pages deploy dist --project-name=bruto-os
```

---

## 6. Cabeçalhos e rotas

Ambos são arquivos estáticos em `public/`, copiados para `dist/` no build. O Cloudflare
Pages (e o Netlify) os lê automaticamente.

- **`public/_headers`** — CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
  e cache imutável para `assets/`. Conteúdo e justificativa em `SECURITY.md` §7.
- **`public/_redirects`** — `/* /index.html 200`, para que rotas como `/app/cockpit`
  funcionem em recarga direta (a aplicação é uma SPA).

**Verificação após o deploy:**

```bash
curl -sI https://SEU-DOMINIO/ | grep -i -E "content-security-policy|x-frame-options|referrer-policy"
```

Se os cabeçalhos não aparecerem, `_headers` não chegou em `dist/`. Confirme com
`ls dist/_headers`.

---

## 7. Domínio próprio (opcional)

1. Pages → seu projeto → **Custom domains** → **Set up a custom domain**.
2. Informe o domínio (ex.: `brutoos.com.br`).
3. Se o domínio já está na Cloudflare, o registro DNS é criado automaticamente.
   Caso contrário, aponte um `CNAME` para `<projeto>.pages.dev`.
4. O certificado TLS é emitido automaticamente em poucos minutos.

---

## 8. Rollback

**Pelo painel (imediato, sem rebuild):**
Pages → projeto → **Deployments** → localize o deploy anterior →
**⋯** → **Rollback to this deployment**.

O tráfego volta ao build anterior em segundos. Como não há banco nem migração, o rollback
é completo — não existe estado de servidor para reverter.

**Por Git:**

```bash
git revert <sha-do-commit-ruim>
git push origin main
```

**Sobre os dados do usuário no rollback:** o IndexedDB do vendedor **não é afetado** por
deploy nem por rollback. Se uma versão futura mudar `VERSAO_BANCO` em `src/data/db.ts`,
o rollback para uma versão anterior encontrará um banco mais novo — o navegador rejeita
abrir um banco com versão inferior. Por isso: **antes de subir a versão do banco, publique
uma versão que apenas leia o schema novo**, e mantenha essa versão disponível por um ciclo.

---

## 9. Instalação como aplicativo (PWA)

**Android / Chrome:** menu → *Instalar aplicativo*.
**iOS / Safari:** Compartilhar → *Adicionar à Tela de Início*.
**Desktop / Chrome ou Edge:** ícone de instalação na barra de endereço.

Depois de instalado, o app abre em janela própria, sem barra do navegador, e funciona
offline. A atualização é automática (`registerType: 'autoUpdate'`): o service worker baixa
a nova versão em segundo plano e ela entra em vigor no próximo carregamento.

---

## 10. A foto de autoria

O arquivo está no repositório: `public/rodrigo-soares.jpg`, 1086×1448 (**3:4 exato**),
398 kB. É servido como está — o build **não processa a imagem de forma alguma**.

**Para substituí-la:**

```bash
cp /caminho/para/a/nova-foto.jpg public/rodrigo-soares.jpg
npm run build
```

- Se a nova imagem **não** for 3:4, ajuste a prop `proporcao` do `AuthorPortrait` para a
  razão nativa dela. Caso contrário `object-fit: cover` vai recortar o rosto.
- Para enquadrar deliberadamente sem editar o arquivo, use `objectPosition` (ou
  `objectPositionRetrato` em `SETTINGS_PADRAO`). Com contêiner e imagem na mesma razão,
  essa propriedade não tem efeito — não há sobra para deslocar.
- Evite PNG para fotografia: o original desta imagem tinha 2,78 MB em PNG contra 398 kB em
  JPEG qualidade 95. A foto entra no precache do service worker, então o peso importa.
- Quatro testes em `src/test/portrait.test.ts` protegem existência, razão, resolução
  mínima e teto de peso. Eles falham se o arquivo sumir ou vier desproporcional.

---

## 11. Checklist de publicação

- [ ] `npm run check` verde (lint + 246 testes + build)
- [ ] `npm audit --omit=dev` revisado contra `SECURITY.md` §8.1 (advisory conhecido e não alcançável)
- [ ] `ls dist/_headers dist/_redirects dist/sw.js` — os três existem
- [ ] `npm run preview` e navegar por Cockpit, Carteira, Cliente 360 e Dados
- [ ] Testar em 390 px de largura (DevTools) — barra inferior com 5 destinos
- [ ] Selo de demonstração visível com o seed carregado
- [ ] Modo avião: recarregar a página e confirmar que o app abre
- [ ] Após o deploy: conferir os cabeçalhos com o `curl` da §6

---

## 12. Fase 2 — backend opcional (ainda não implementado)

Descrito em `ROADMAP.md` Fase 2. Quando existir, a aplicação **continuará funcionando
integralmente sem ele** — isso é requisito de arquitetura, não meta.

Esboço do que seria necessário:

```bash
npx wrangler d1 create bruto-os-db
npx wrangler d1 execute bruto-os-db --file=./schema.sql
npx wrangler deploy            # Worker de sincronização
```

O `_headers` precisaria de `connect-src 'self' https://api.SEU-DOMINIO` na CSP. Enquanto
a Fase 2 não existir, manter `connect-src 'self'` é a garantia mais forte de privacidade
do produto: **o navegador impede o envio de dados para qualquer host externo.**
