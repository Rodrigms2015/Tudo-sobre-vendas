# Cofre

Site privado de arquivos. Você envia de um computador e baixa em outro. Só você entra.

Não é um projeto do BRUTO OS — é uma aplicação separada que mora na pasta `cofre/`
deste repositório e sobe como um site próprio no Netlify.

---

## Como funciona

- **Uma senha, um dono.** Não existe cadastro nem convite. Quem sabe a senha entra;
  mais ninguém. A senha vive em uma variável de ambiente do Netlify, nunca no código.
- **Arquivo de qualquer tamanho.** O navegador corta o arquivo em pedaços de 4 MB e
  envia um por um. O download remonta em fluxo. Isso contorna o limite de ~6 MB por
  requisição das funções do Netlify sem exigir um servidor seu.
- **Nada é público.** Toda rota exige sessão. O site pede para não ser indexado e
  nenhum arquivo tem link aberto — o download passa pela mesma checagem de sessão.

---

## Instalação

### 1. Crie o site no Netlify

No painel do Netlify: **Add new site → Import an existing project**, escolha este
repositório e configure:

| Campo | Valor |
| --- | --- |
| Branch to deploy | `claude/private-file-sharing-site-8cnmhc` (ou `main`, depois do merge) |
| **Base directory** | **`cofre`** |
| Build command | *(deixe em branco — o `netlify.toml` já resolve)* |
| Publish directory | `cofre/public` |

O **base directory** é o passo que não pode ser esquecido: sem ele o Netlify tenta
publicar o BRUTO OS, que é outro projeto na raiz do repositório.

> Crie um **site novo**. Não reaproveite o site do BRUTO OS: apontar aquele site para
> cá substituiria a aplicação que já está publicada.

### 2. Defina as duas variáveis de ambiente

Em **Site configuration → Environment variables**:

| Variável | O que é |
| --- | --- |
| `SENHA_ACESSO` | A senha que você vai digitar para entrar. Mínimo de 10 caracteres. |
| `SEGREDO_SESSAO` | Texto aleatório longo que assina o cookie de sessão. Você nunca digita. |

Para gerar o segredo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Enquanto essas duas variáveis não existirem, o site responde `503` e não deixa
ninguém entrar — inclusive você. É de propósito: sem configuração, o cofre fica
fechado, não aberto.

### 3. Publique

Um deploy depois das variáveis definidas e o site está de pé. Abra a URL, digite a
senha, arraste um arquivo.

Para trocar a senha depois, basta mudar `SENHA_ACESSO` e publicar de novo. Se você
também trocar `SEGREDO_SESSAO`, todas as sessões abertas caem na hora — é assim que
se expulsa um computador que você não tem mais.

---

## Uso

- **Enviar**: arraste para a área pontilhada, ou clique nela. Vários arquivos de uma
  vez funcionam; eles sobem em fila, um por vez, com barra de progresso.
- **Baixar**: clique no nome do arquivo ou no botão *Baixar*.
- **Apagar**: botão *Apagar*, com confirmação. Não há lixeira — o que sai, sai.
- **Sair**: encerra a sessão daquele computador.

A sessão dura 30 dias. Em um computador que não é seu, clique em **Sair** ao terminar.

---

## Rodando na sua máquina

```bash
cd cofre
npm install
SENHA_ACESSO='uma-senha-de-teste' SEGREDO_SESSAO='qualquer-coisa-longa' npx netlify dev
```

O `netlify dev` emula as funções e o armazenamento localmente. Os arquivos ficam em
`.netlify/` e não têm relação com o que está publicado.

Se o CLI reclamar que não achou as funções, é porque ele resolveu a raiz do projeto
como a raiz do repositório (onde vive o BRUTO OS). Aponte na mão:

```bash
npx netlify dev --functions netlify/functions --dir public
```

### Testes

```bash
npm test
```

Cobrem o que decide quem entra (assinatura e validade do cookie, comparação de senha
em tempo constante) e o que preserva os bytes (ordem dos pedaços, recusa de pedaço
faltante, higienização de nome e identificador).

---

## Estrutura

```
cofre/
  netlify.toml            Configuração de publicação, cabeçalhos e CSP
  lib/
    sessao.mjs            Senha, token, cookie, porteiro das rotas
    armazenamento.mjs     Pedaços, manifestos, remontagem em fluxo
  netlify/functions/
    sessao.mjs            POST entra · DELETE sai · GET confere
    iniciar.mjs           Abre um envio e devolve o id
    parte.mjs             Grava um pedaço
    concluir.mjs          Confere a contagem e grava o manifesto
    arquivos.mjs          GET lista · DELETE apaga
    baixar.mjs            Remonta e entrega
  public/
    index.html            As duas telas
    estilo.css            Estilo único, sem framework
    app.js                Fatiamento, fila de envio, listagem
  test/                   Testes das regras acima
```

---

## Decisões que valem explicação

**Por que pedaços de 4 MB.** O limite de corpo de uma função do Netlify fica em torno
de 6 MB. Fatiar em 4 MB deixa folga e faz o tamanho do arquivo parar de importar. O
download busca um pedaço de cada vez, então a memória usada não cresce com o arquivo.

**Por que o manifesto é escrito por último.** Enquanto os pedaços sobem, não existe
entrada nenhuma na listagem. Se o envio cair na metade, não sobra um arquivo pela
metade fingindo estar inteiro — sobram pedaços órfãos, que o navegador manda apagar.
Antes de gravar o manifesto, o servidor confere se a quantidade de pedaços guardados
bate com a anunciada; se não bate, recusa e limpa.

**Por que o id vem do servidor.** Se o navegador escolhesse o id, alguém poderia
escolher o de um arquivo já guardado e sobrescrever os pedaços dele.

**Por que quase nada abre na aba.** Um `.html` enviado ao cofre e aberto em `inline`
rodaria script na origem do site e poderia usar a sua sessão para apagar tudo. Só
imagem, vídeo, áudio, PDF e texto puro abrem direto; o resto desce como anexo, e mesmo
o que abre vai com `Content-Security-Policy: sandbox`.

**Por que ausência de configuração fecha o cofre.** Um site que responde `503` é um
aborrecimento. Um site que aceita qualquer senha porque a variável não foi definida é
um vazamento. O código escolhe o aborrecimento.

---

## Limites honestos

- **Um dono só.** Não há usuários, permissões nem compartilhamento com terceiros. Se
  você precisar mandar um arquivo para outra pessoa, este não é o lugar.
- **Sem criptografia de ponta a ponta.** Os arquivos ficam no Netlify Blobs em claro.
  A operadora da nuvem consegue lê-los, como em qualquer serviço desse tipo. Para
  material que não pode nem isso, cifre antes de enviar.
- **Sem versões.** Reenviar um arquivo com o mesmo nome cria uma segunda entrada; não
  substitui a primeira.
- **O armazenamento tem cota.** O Netlify Blobs no plano gratuito é generoso para uso
  pessoal, mas não é infinito. A listagem mostra o total ocupado.
