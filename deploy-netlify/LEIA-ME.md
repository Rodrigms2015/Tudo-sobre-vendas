# Publicação com login — central-compras-ribeirao-preto

A Central de Compras está no ar em
**https://central-compras-ribeirao-preto.netlify.app**, com tela de entrada e base
compartilhada entre cinco pessoas.

## Como a proteção funciona

`netlify/edge-functions/acesso.js` roda **no servidor de borda da Netlify, antes de qualquer
byte da página sair**. Sem sessão válida o HTML nunca chega ao navegador — não adianta abrir
o código-fonte, porque não existe código-fonte para abrir.

Isso é diferente de uma senha escrita dentro da página, que qualquer pessoa contorna vendo o
fonte. Aqui a verificação acontece antes.

A entrada é um **formulário de verdade**, não a caixinha cinza do navegador. A caixinha
(autenticação básica) passa despercebida em celular e em quem não conhece — foi o motivo de
ela ter sido trocada.

Detalhes que valem citar:

- As senhas **não estão escritas em lugar nenhum do código**. O que fica gravado em
  `netlify/comum/sessao.mjs` é o resumo SHA-256 de cada uma: serve para conferir a senha
  digitada e não serve para descobrir a senha original.
- A comparação é feita em tempo constante — uma senha quase certa demora exatamente o mesmo
  que uma completamente errada, para que o tempo de resposta não vire pista.
- O cookie de sessão é assinado (HMAC-SHA256) e vale 12 horas. Editar o cookie no navegador
  não abre nada: sem a assinatura correta ele é recusado.
- A chave da assinatura vem dos resumos das senhas. Trocar qualquer senha derruba todas as
  sessões abertas, de propósito.

## Quem tem acesso

| Usuário | Quem é |
|---|---|
| `rodrigo` | Rodrigo |
| `compras2` | a definir |
| `compras3` | a definir |
| `compras4` | a definir |
| `compras5` | a definir |

As senhas foram entregues à parte. Cada pessoa entra com a sua — é assim que a base sabe
quem gravou por último.

### Trocar uma senha

1. Gere o resumo da senha nova:

   ```bash
   node -e "console.log(require('crypto').createHash('sha256').update('SENHA-NOVA').digest('hex'))"
   ```

2. Cole no lugar do `hash` daquele usuário em `netlify/comum/sessao.mjs`.
3. Publique de novo (abaixo).

### Trocar o nome que aparece na tela

É o campo `nome` do mesmo arquivo. Ele é o que a página mostra em "quem está usando" e o que
fica registrado na base como autor da última gravação. Trocar o nome não mexe na senha.

### Acrescentar ou tirar alguém

Acrescente ou remova uma linha em `USUARIOS`, no mesmo arquivo, e publique.

## A base da equipe

`netlify/functions/dados.mjs` guarda **um pacote só**, o mesmo que o botão
"Gerar página para enviar" produz, compactado no navegador antes de subir (uns 300 kB em vez
de 3 MB).

- Quem carrega o estoque ou a movimentação **publica sozinho**, sem apertar nada.
- Quem abre o link em outro computador **recebe aquilo**, sem precisar do arquivo.
- Mudar uma quantidade na aba Comprar também sobe.
- Cada gravação incrementa uma versão. Se duas pessoas mexem ao mesmo tempo, a segunda
  recebe 409 e a página avisa quem gravou antes — em vez de apagar o trabalho da outra em
  silêncio.

Manutenção: `DELETE /api/dados` zera a base (não tem botão na página, é de propósito). O que
está gravado no navegador de cada pessoa continua lá.

## Publicar de novo

```bash
npm run plataforma                       # regera publicar/index.html e publicar/_headers
cd deploy-netlify && netlify deploy --prod
```

## O que é publicado

| Arquivo | Para quê |
|---|---|
| `publicar/index.html` | a página inteira, gerada de `plataforma/corpo.html` |
| `publicar/_headers` | CSP com hash do script, `noindex`, `no-store` |
| `netlify/edge-functions/acesso.js` | a tela de entrada e a porta |
| `netlify/functions/dados.mjs` | a base compartilhada |
| `netlify/comum/sessao.mjs` | cadastro de acesso, usado pelos dois |
| `netlify.toml` | publica `publicar/` como está, sem build |

Só `publicar/` vira arquivo servido. O resto da pasta fica fora do site.

`publicar/` **não é versionado**: é gerado. A cópia publicada sai sempre de
`plataforma/corpo.html`.

## Privacidade

Os dados de estoque e venda saem do navegador **apenas** para a base desta equipe, e apenas
com sessão válida. Nada é enviado a terceiros, não há rastreador, não há analytics. Os
cabeçalhos mandam não indexar e não guardar em cache.

O arquivo HTML gerado pelo botão "Gerar página para enviar" continua funcionando **sem
internet**: aberto do disco, ele não fala com servidor nenhum.
