// Cofre — interface.
//
// Todo texto vindo do servidor entra no DOM por `textContent`. Nada de
// `innerHTML`: nome de arquivo é dado, não marcação.

const $ = (id) => document.getElementById(id);

const telaEntrada = $('tela-entrada');
const telaCofre = $('tela-cofre');
const formaEntrada = $('forma-entrada');
const campoSenha = $('senha');
const botaoEntrar = $('botao-entrar');
const avisoEntrada = $('aviso-entrada');
const areaSolta = $('area-solta');
const entradaArquivo = $('entrada-arquivo');
const listaEnvios = $('lista-envios');
const listaArquivos = $('lista-arquivos');
const resumo = $('resumo');
const grito = $('grito');

let tamanhoPedaco = 4 * 1024 * 1024; // o servidor confirma o valor real ao iniciar

// ---------------------------------------------------------------- utilidades

function formatarTamanho(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i += 1;
  }
  return `${valor.toFixed(valor < 10 && i > 0 ? 1 : 0)} ${unidades[i]}`;
}

function formatarData(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function iconeDe(tipo, nome) {
  const t = tipo || '';
  if (t.startsWith('image/')) return '🖼️';
  if (t.startsWith('video/')) return '🎬';
  if (t.startsWith('audio/')) return '🎵';
  if (t === 'application/pdf') return '📕';
  if (/\.(zip|rar|7z|tar|gz)$/i.test(nome)) return '🗜️';
  if (/\.(xlsx?|csv|ods)$/i.test(nome)) return '📊';
  if (/\.(docx?|odt|rtf)$/i.test(nome)) return '📝';
  return '📄';
}

let apagarGrito;
function falar(mensagem, tom = '') {
  clearTimeout(apagarGrito);
  grito.textContent = mensagem;
  grito.className = `grito ${tom}`.trim();
  grito.hidden = false;
  apagarGrito = setTimeout(() => {
    grito.hidden = true;
  }, 4200);
}

/** Envelope único das chamadas de API: sessão perdida sempre volta para a entrada. */
async function api(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, { credentials: 'same-origin', ...opcoes });

  if (resposta.status === 401) {
    mostrarEntrada();
    throw new Error('Sessão expirada. Entre de novo.');
  }
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    throw new Error(corpo.erro || `Falha na requisição (${resposta.status}).`);
  }
  return resposta.json();
}

// ---------------------------------------------------------------- navegação

function mostrarEntrada() {
  telaCofre.hidden = true;
  telaEntrada.hidden = false;
  campoSenha.value = '';
  campoSenha.focus();
}

function mostrarCofre() {
  telaEntrada.hidden = true;
  telaCofre.hidden = false;
  atualizarLista();
}

// ---------------------------------------------------------------- sessão

formaEntrada.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  avisoEntrada.textContent = '';
  botaoEntrar.disabled = true;
  botaoEntrar.textContent = 'Entrando…';

  try {
    const resposta = await fetch('/api/sessao', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ senha: campoSenha.value }),
    });
    const corpo = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      avisoEntrada.textContent = corpo.erro || 'Não foi possível entrar.';
      campoSenha.select();
      return;
    }
    mostrarCofre();
  } catch {
    avisoEntrada.textContent = 'Sem conexão com o servidor.';
  } finally {
    botaoEntrar.disabled = false;
    botaoEntrar.textContent = 'Entrar';
  }
});

$('botao-sair').addEventListener('click', async () => {
  await fetch('/api/sessao', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
  mostrarEntrada();
});

// ---------------------------------------------------------------- listagem

function cartaoVazio() {
  const div = document.createElement('div');
  div.className = 'vazio';
  div.textContent = 'Nada guardado ainda. Envie um arquivo acima para vê-lo aqui.';
  return div;
}

function cartaoArquivo(arquivo) {
  const linha = document.createElement('div');
  linha.className = 'arquivo';

  const icone = document.createElement('span');
  icone.className = 'arquivo-icone';
  icone.textContent = iconeDe(arquivo.tipo, arquivo.nome);
  icone.setAttribute('aria-hidden', 'true');

  const corpo = document.createElement('div');
  corpo.className = 'arquivo-corpo';

  const nome = document.createElement('a');
  nome.className = 'arquivo-nome';
  nome.href = `/api/baixar?id=${encodeURIComponent(arquivo.id)}`;
  nome.textContent = arquivo.nome;

  const meta = document.createElement('span');
  meta.className = 'arquivo-meta';
  meta.textContent = `${formatarTamanho(arquivo.tamanho)} · ${formatarData(arquivo.enviadoEm)}`;

  corpo.append(nome, meta);

  const acoes = document.createElement('div');
  acoes.className = 'arquivo-acoes';

  const baixar = document.createElement('a');
  baixar.className = 'botao discreto';
  baixar.href = nome.href;
  baixar.textContent = 'Baixar';

  const remover = document.createElement('button');
  remover.className = 'botao discreto risco';
  remover.type = 'button';
  remover.textContent = 'Apagar';
  remover.addEventListener('click', async () => {
    if (!confirm(`Apagar "${arquivo.nome}" para sempre?`)) return;
    remover.disabled = true;
    try {
      await api(`/api/arquivos?id=${encodeURIComponent(arquivo.id)}`, { method: 'DELETE' });
      falar('Arquivo apagado.');
      atualizarLista();
    } catch (e) {
      falar(e.message, 'ruim');
      remover.disabled = false;
    }
  });

  acoes.append(baixar, remover);
  linha.append(icone, corpo, acoes);
  return linha;
}

async function atualizarLista() {
  try {
    const { arquivos, totalBytes, tamanhoPedaco: pedaco } = await api('/api/arquivos');
    if (pedaco) tamanhoPedaco = pedaco;

    listaArquivos.replaceChildren();
    if (arquivos.length === 0) {
      listaArquivos.append(cartaoVazio());
    } else {
      for (const arquivo of arquivos) listaArquivos.append(cartaoArquivo(arquivo));
    }

    resumo.textContent =
      arquivos.length === 0
        ? ''
        : `${arquivos.length} arquivo${arquivos.length > 1 ? 's' : ''} · ${formatarTamanho(totalBytes)}`;
  } catch (e) {
    falar(e.message, 'ruim');
  }
}

$('botao-atualizar').addEventListener('click', atualizarLista);

// ---------------------------------------------------------------- envio

function painelDeEnvio(nome) {
  const caixa = document.createElement('div');
  caixa.className = 'envio';

  const linha = document.createElement('div');
  linha.className = 'envio-linha';

  const titulo = document.createElement('span');
  titulo.className = 'envio-nome';
  titulo.textContent = nome;

  const estado = document.createElement('span');
  estado.className = 'envio-estado';
  estado.textContent = 'na fila';

  linha.append(titulo, estado);

  const barra = document.createElement('div');
  barra.className = 'barra';
  const preenchimento = document.createElement('i');
  barra.append(preenchimento);

  caixa.append(linha, barra);
  listaEnvios.append(caixa);

  return {
    progresso(enviados, total) {
      preenchimento.style.width = `${total ? Math.round((enviados / total) * 100) : 0}%`;
      estado.textContent = `${formatarTamanho(enviados)} de ${formatarTamanho(total)}`;
    },
    concluido() {
      preenchimento.style.width = '100%';
      estado.textContent = 'pronto';
      setTimeout(() => caixa.remove(), 1500);
    },
    falhou(motivo) {
      caixa.classList.add('falhou');
      estado.textContent = motivo;
      setTimeout(() => caixa.remove(), 8000);
    },
  };
}

/** Envia um pedaço, com nova tentativa: rede doméstica falha, e falhar tudo por isso é rude. */
async function enviarPedaco(id, indice, fatia) {
  let ultimoErro;
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    try {
      const resposta = await fetch(`/api/parte?id=${encodeURIComponent(id)}&n=${indice}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/octet-stream' },
        body: fatia,
      });
      if (resposta.status === 401) {
        mostrarEntrada();
        throw new Error('Sessão expirada.');
      }
      if (resposta.ok) return;

      const corpo = await resposta.json().catch(() => ({}));
      ultimoErro = new Error(corpo.erro || `Pedaço ${indice + 1} recusado.`);
    } catch (e) {
      ultimoErro = e;
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** tentativa));
  }
  throw ultimoErro ?? new Error('Falha ao enviar pedaço.');
}

async function enviarArquivo(arquivo) {
  const painel = painelDeEnvio(arquivo.name);

  if (arquivo.size === 0) {
    painel.falhou('arquivo vazio — nada a guardar');
    return;
  }

  let id = null;
  try {
    const inicio = await api('/api/iniciar', { method: 'POST' });
    id = inicio.id;
    if (inicio.tamanhoPedaco) tamanhoPedaco = inicio.tamanhoPedaco;

    const total = Math.ceil(arquivo.size / tamanhoPedaco);
    painel.progresso(0, arquivo.size);

    for (let i = 0; i < total; i += 1) {
      const inicioBytes = i * tamanhoPedaco;
      const fim = Math.min(inicioBytes + tamanhoPedaco, arquivo.size);
      await enviarPedaco(id, i, arquivo.slice(inicioBytes, fim));
      painel.progresso(fim, arquivo.size);
    }

    await api('/api/concluir', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id,
        nome: arquivo.name,
        tamanho: arquivo.size,
        tipo: arquivo.type || 'application/octet-stream',
        partes: total,
      }),
    });

    painel.concluido();
  } catch (e) {
    painel.falhou(e.message);
    // Sem manifesto, os pedaços soltos só ocupam espaço. Limpa.
    if (id) {
      await fetch(`/api/arquivos?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      }).catch(() => {});
    }
  }
}

/** Um arquivo por vez: a barra fica honesta e a banda não é dividida. */
let fila = Promise.resolve();

function enfileirar(arquivos) {
  for (const arquivo of arquivos) {
    fila = fila.then(() => enviarArquivo(arquivo));
  }
  fila = fila.then(atualizarLista);
}

// ---------------------------------------------------------------- arrastar e soltar

areaSolta.addEventListener('click', () => entradaArquivo.click());
areaSolta.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter' || evento.key === ' ') {
    evento.preventDefault();
    entradaArquivo.click();
  }
});

entradaArquivo.addEventListener('change', () => {
  enfileirar([...entradaArquivo.files]);
  entradaArquivo.value = '';
});

for (const evento of ['dragenter', 'dragover']) {
  areaSolta.addEventListener(evento, (e) => {
    e.preventDefault();
    areaSolta.classList.add('ativa');
  });
}

for (const evento of ['dragleave', 'drop']) {
  areaSolta.addEventListener(evento, (e) => {
    e.preventDefault();
    areaSolta.classList.remove('ativa');
  });
}

areaSolta.addEventListener('drop', (evento) => {
  const arquivos = [...(evento.dataTransfer?.files ?? [])];
  if (arquivos.length > 0) enfileirar(arquivos);
});

// Soltar fora da área não deve fazer o navegador abrir o arquivo.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// ---------------------------------------------------------------- início

(async function comecar() {
  try {
    const { autenticado } = await api('/api/sessao');
    if (autenticado) mostrarCofre();
    else mostrarEntrada();
  } catch {
    mostrarEntrada();
  }
})();
