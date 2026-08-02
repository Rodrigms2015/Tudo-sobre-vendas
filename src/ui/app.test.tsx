/**
 * Testes de interface: fluxo completo desde o estado vazio até a execução de uma ação.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { resetarInstancia } from '../data/db';
import { AuthorPortrait } from './components/AuthorPortrait';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetarInstancia();
  window.history.pushState({}, '', '/');
});

async function irParaCockpitComDemo(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  const entrar = await screen.findAllByRole('link', { name: /entrar no cockpit/i });
  await user.click(entrar[0]);
  const carregar = await screen.findByRole('button', {
    name: /carregar dados de demonstração/i,
  });
  await user.click(carregar);
  await waitFor(
    () => expect(screen.queryByText(/nenhuma carteira carregada/i)).not.toBeInTheDocument(),
    { timeout: 15000 },
  );
}

describe('landing', () => {
  it('apresenta o produto e a tagline', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'BRUTO OS', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/ligue para a conta certa/i)).toBeInTheDocument();
  });

  it('credita a autoria de Rodrigo Soares', async () => {
    render(<App />);
    // Aparece no herói e na assinatura do rodapé.
    expect((await screen.findAllByText(/idealizado por rodrigo soares/i)).length).toBeGreaterThan(0);
  });

  it('explica por que não é mais um CRM', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /por que isso não é mais um crm/i }),
    ).toBeInTheDocument();
  });

  it('oferece link para pular ao conteúdo (acessibilidade)', async () => {
    render(<App />);
    expect(await screen.findByRole('link', { name: /pular para o conteúdo/i })).toBeInTheDocument();
  });
});

describe('estado vazio do cockpit', () => {
  it('não inventa dados: oferece demonstração ou importação', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click((await screen.findAllByRole('link', { name: /entrar no cockpit/i }))[0]);

    expect(await screen.findByText(/nenhuma carteira carregada/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /carregar dados de demonstração/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /importar meus dados/i })).toBeInTheDocument();
  });
});

describe('cockpit com dados de demonstração', () => {
  it('carrega a carteira e mostra o selo de demonstração', async () => {
    const user = userEvent.setup();
    await irParaCockpitComDemo(user);

    expect(
      screen.getByText(/nenhuma aplicação técnica deve ser usada comercialmente/i),
    ).toBeInTheDocument();
  }, 30000);

  it('mostra ANDON antes do Top 3 na ordem do documento', async () => {
    const user = userEvent.setup();
    await irParaCockpitComDemo(user);

    const andon = await screen.findByRole('heading', { name: /painel andon/i });
    const top3 = await screen.findByRole('heading', { name: /top 3 próximas ações/i });
    // ANDON precede o Top 3: uma anormalidade invalida o plano do dia.
    expect(andon.compareDocumentPosition(top3) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }, 30000);

  it('exibe o botão de iniciar a próxima ação', async () => {
    const user = userEvent.setup();
    await irParaCockpitComDemo(user);
    expect(
      await screen.findByRole('button', { name: /iniciar próxima ação/i }),
    ).toBeInTheDocument();
  }, 30000);

  it('todo card do Top 3 mostra o raciocínio sem exigir clique', async () => {
    const user = userEvent.setup();
    await irParaCockpitComDemo(user);

    await screen.findByRole('heading', { name: /top 3 próximas ações/i });
    // "Por que" é obrigatório e não colapsável no Top 3.
    const blocos = await screen.findAllByText('Por que');
    expect(blocos.length).toBeGreaterThan(0);
  }, 30000);
});

describe('execução de recomendação', () => {
  it('aceitar uma ação registra o feedback e confirma na tela', async () => {
    const user = userEvent.setup();
    await irParaCockpitComDemo(user);

    await screen.findByRole('heading', { name: /top 3 próximas ações/i });
    const executar = await screen.findAllByRole('button', { name: /^executar$/i });
    await user.click(executar[0]);

    expect(
      await screen.findByText(/ação aceita e adicionada às tarefas de hoje/i),
    ).toBeInTheDocument();
  }, 30000);

  it('rejeitar exige motivo e informa o efeito da escolha', async () => {
    const user = userEvent.setup();
    await irParaCockpitComDemo(user);

    await screen.findByRole('heading', { name: /top 3 próximas ações/i });
    const recusar = await screen.findAllByRole('button', { name: /não faz sentido/i });
    await user.click(recusar[0]);

    const seletor = await screen.findByLabelText(/por que não faz sentido/i);
    expect(seletor).toBeInTheDocument();
    // O efeito de cada motivo é explícito — nenhum aprendizado acontece escondido.
    // Dois motivos suprimem por 30 dias; o efeito de cada um fica explícito na opção.
    expect(within(seletor).getAllByText(/suprime por 30 dias/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /^registrar$/i }));
    expect(await screen.findByText(/recomendação dispensada/i)).toBeInTheDocument();
  }, 30000);
});

describe('navegação', () => {
  it('leva do cockpit ao painel ANDON completo', async () => {
    const user = userEvent.setup();
    await irParaCockpitComDemo(user);

    await user.click(await screen.findByRole('link', { name: /ver painel/i }));
    expect(
      await screen.findByText(/anormalidades, não atividade normal/i),
    ).toBeInTheDocument();
  }, 30000);

  it('a barra inferior de mobile expõe exatamente cinco destinos principais', async () => {
    const user = userEvent.setup();
    await irParaCockpitComDemo(user);

    const navs = screen.getAllByRole('navigation', { name: /navegação principal/i });
    const barraInferior = navs[navs.length - 1];
    const itens = within(barraInferior).getAllByRole('listitem');
    expect(itens).toHaveLength(5);
  }, 30000);
});

describe('AuthorPortrait', () => {
  it('usa object-fit cover e object-position ajustável', () => {
    render(<AuthorPortrait objectPosition="center 20%" />);
    const img = screen.getByRole('img', { name: /rodrigo soares/i }) as HTMLImageElement;
    expect(img.style.objectFit).toBe('cover');
    expect(img.style.objectPosition).toBe('center 20%');
    expect(img.getAttribute('src')).toBe('/rodrigo-soares.jpg');
  });

  it('degrada para monograma tipográfico quando a foto não existe — nunca um rosto gerado', () => {
    render(<AuthorPortrait />);
    const img = screen.getByRole('img', { name: /rodrigo soares/i });
    // Simula o erro de carregamento que ocorre quando o arquivo não está na pasta.
    fireEvent.error(img);
    expect(screen.getByText('RS')).toBeInTheDocument();
    expect(screen.getByText(/retrato não incluído no repositório/i)).toBeInTheDocument();
  });
});
