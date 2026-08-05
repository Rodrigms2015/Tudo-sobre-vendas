# Publicação com login — central-compras-ribeirao-preto

A Central de Compras está no ar em
**https://central-compras-ribeirao-preto.netlify.app**, protegida por usuário e senha.

## Como a proteção funciona

`netlify/edge-functions/acesso.js` roda **no servidor de borda da Netlify, antes de qualquer
byte da página sair**. Sem as credenciais certas, o HTML nunca chega ao navegador — não
adianta abrir o código-fonte, porque não existe código-fonte para abrir.

Isso é diferente de uma senha escrita dentro da página, que qualquer pessoa contorna vendo o
fonte. Aqui a verificação acontece antes.

A comparação de senha é feita em tempo constante: uma senha quase certa demora exatamente o
mesmo que uma completamente errada, para que o tempo de resposta não vire pista.

## Trocar a senha

Edite `USUARIO` e `SENHA` em `netlify/edge-functions/acesso.js` e publique de novo:

```bash
npm run plataforma                       # regera a página a partir do fonte
cp public/compras.html deploy-netlify/index.html
cd deploy-netlify && netlify deploy --prod
```

## O que é publicado

| Arquivo | Para quê |
|---|---|
| `index.html` | a página inteira, gerada de `plataforma/corpo.html` |
| `netlify/edge-functions/acesso.js` | a porta de entrada com usuário e senha |
| `_headers` | CSP com hash do script, `noindex`, `no-store` |
| `netlify.toml` | publica a pasta como está, sem build |

`index.html` **não é versionado** aqui: ele é gerado. A cópia publicada sai sempre de
`public/compras.html`, que por sua vez sai de `plataforma/corpo.html`.

## Privacidade

Os dados continuam só no navegador de quem carrega os arquivos. O servidor entrega a página e
nada mais: não recebe, não guarda e não vê nenhum arquivo de estoque ou de venda. Os
cabeçalhos mandam não indexar e não armazenar em cache.
