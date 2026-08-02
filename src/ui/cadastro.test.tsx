/**
 * O fluxo que estava faltando: usar o produto SEM CSV e SEM demonstração.
 *
 * Até esta versão, a única entrada de dados era importação de CSV. Um vendedor que
 * quisesse testar com as próprias contas não tinha por onde começar — e concluía,
 * com razão, que o produto não funcionava. Estes testes cobrem o caminho inteiro:
 * abrir vazio, cadastrar, registrar compras e ver o motor acordar.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { resetarInstancia } from '../data/db';
import { somarDias, hoje } from '../domain/dates';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetarInstancia();
  window.history.pushState({}, '', '/app/carteira');
});

async function abrirCarteiraVazia(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await screen.findByText(/nenhuma conta na carteira/i, undefined, { timeout: 10000 });
  await user.click(screen.getByRole('button', { name: /cadastrar cliente/i }));
  await screen.findByRole('heading', { name: /novo cliente/i });
}

async function cadastrar(
  user: ReturnType<typeof userEvent.setup>,
  nome: string,
  veiculos?: string,
) {
  await user.type(screen.getByLabelText(/nome do cliente/i), nome);
  if (veiculos) await user.type(screen.getByLabelText(/nº de veículos/i), veiculos);
  await user.click(screen.getByRole('button', { name: /^cadastrar cliente$/i }));
  await screen.findByRole('heading', { name: nome }, { timeout: 10000 });
}

describe('cadastro manual, sem CSV e sem demonstração', () => {
  it('a carteira vazia oferece cadastrar cliente, não só importar', async () => {
    render(<App />);
    await screen.findByText(/nenhuma conta na carteira/i, undefined, { timeout: 10000 });
    expect(screen.getByRole('button', { name: /cadastrar cliente/i })).toBeInTheDocument();
  }, 30000);

  it('exige apenas o nome — o resto vira lacuna, não valor inventado', async () => {
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);

    const salvar = screen.getByRole('button', { name: /^cadastrar cliente$/i });
    expect(salvar).toBeDisabled();

    await user.type(screen.getByLabelText(/nome do cliente/i), 'Transportes Teste');
    expect(salvar).toBeEnabled();
  }, 30000);

  it('cadastra e abre o cliente recém-criado', async () => {
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);
    await cadastrar(user, 'Viação Pedra Alta', '30');

    expect(screen.getByRole('heading', { name: 'Viação Pedra Alta' })).toBeInTheDocument();
    // A frota digitada pelo vendedor é CONFIRMADA, não estimada.
    await user.click(screen.getByRole('tab', { name: /frota/i }));
    expect(await screen.findByText(/^confirmado$/i)).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  }, 30000);

  it('sem frota informada, a conta nasce com a lacuna explícita', async () => {
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);
    await cadastrar(user, 'Oficina Sem Frota');

    await user.click(screen.getByRole('tab', { name: /frota/i }));
    expect(await screen.findByText(/frota não cadastrada/i)).toBeInTheDocument();
    expect(
      screen.getByText(/quantos veículos vocês têm rodando hoje/i),
    ).toBeInTheDocument();
  }, 30000);
});

describe('registro de compra alimenta o motor', () => {
  it('as famílias existem mesmo sem carregar a demonstração', async () => {
    // O catálogo é vocabulário do setor, não dado fictício. Sem ele não há o que registrar.
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);
    await cadastrar(user, 'Frota Alfa', '20');

    await user.click(screen.getByRole('button', { name: /nova compra/i }));
    expect(await screen.findByRole('button', { name: /kit de embreagem/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pastilha e lona de freio/i })).toBeInTheDocument();
  }, 30000);

  it('avisa quantas compras faltam para haver cadência, em vez de inventar previsão', async () => {
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);
    await cadastrar(user, 'Frota Beta', '20');

    await user.click(screen.getByRole('button', { name: /nova compra/i }));
    expect(await screen.findByText(/faltam 3 compra/i)).toBeInTheDocument();
  }, 30000);

  it('registra a compra e ela aparece no histórico da conta', async () => {
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);
    await cadastrar(user, 'Frota Gama', '25');

    await user.click(screen.getByRole('button', { name: /nova compra/i }));
    await user.type(screen.getByLabelText(/valor total/i), '4200');
    await user.click(screen.getByRole('button', { name: /kit de embreagem/i }));
    await user.click(screen.getByRole('button', { name: /^registrar compra$/i }));

    await user.click(screen.getByRole('tab', { name: /histórico/i }));
    await screen.findByRole('heading', { name: /^compras$/i });
    expect(screen.getAllByText(/4\.200/).length).toBeGreaterThan(0);
  }, 40000);
});

describe('quatro compras acordam o motor', () => {
  it('com 4 compras regulares a conta ganha cadência e entra na fila de ações', async () => {
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);
    await cadastrar(user, 'Frota Delta', '40');

    // Quatro compras a cada 60 dias, a última dentro da janela de recompra.
    const datas = [
      somarDias(hoje(), -237),
      somarDias(hoje(), -178),
      somarDias(hoje(), -118),
      somarDias(hoje(), -57),
    ];

    await user.click(screen.getByRole('button', { name: /nova compra/i }));
    for (const data of datas) {
      const campoData = screen.getByLabelText(/data da compra/i);
      await user.clear(campoData);
      await user.type(campoData, data);
      await user.type(screen.getByLabelText(/valor total/i), '5000');
      await user.click(screen.getByRole('button', { name: /kit de embreagem/i }));
      await user.click(screen.getByRole('button', { name: /^registrar compra$/i }));
      await waitFor(() =>
        expect(screen.getByLabelText(/valor total/i)).toHaveValue(null),
      );
    }

    // O aviso de "faltam compras" some quando a base fica suficiente.
    await waitFor(() => expect(screen.queryByText(/faltam \d+ compra/i)).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^fechar compra$/i }));
    await user.click(screen.getByRole('tab', { name: /situação/i }));

    // Agora existe cadência: o motor deixa de dizer "sem base".
    expect(
      (await screen.findAllByText(/janela de recompra|atrasado|no ciclo/i)).length,
    ).toBeGreaterThan(0);
    // A frase só existe quando há cadência calculada — antes disso é "sem base".
    expect(screen.getAllByText(/compra a cada \d+ dias/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/sem base histórica suficiente/i)).not.toBeInTheDocument();
  }, 60000);
});

describe('coerência do Cockpit', () => {
  it('a fila e o Top 3 nunca se contradizem', async () => {
    // O contador dizia "1 ação na fila" e o Top 3 dizia "nenhuma conta exige ação",
    // porque ações de confiança baixa são excluídas do topo. Agora elas aparecem
    // com a lacuna em destaque, em vez de sumir.
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);
    await cadastrar(user, 'Conta Com Lacuna', '30');

    await user.click(screen.getByRole('button', { name: /nova compra/i }));
    await user.type(screen.getByLabelText(/valor total/i), '3000');
    await user.click(screen.getByRole('button', { name: /kit de embreagem/i }));
    await user.click(screen.getByRole('button', { name: /^registrar compra$/i }));

    window.history.pushState({}, '', '/app/cockpit');
    await user.click(screen.getAllByRole('link', { name: /^cockpit$/i })[0]);

    const fila = await screen.findByText(/ações na fila/i, undefined, { timeout: 10000 });
    const bloco = fila.parentElement as HTMLElement;
    const quantidade = Number(bloco.querySelector('.tabular')?.textContent ?? '0');

    if (quantidade > 0) {
      expect(screen.queryByText(/nenhuma conta exige ação agora/i)).not.toBeInTheDocument();
    }
  }, 40000);
});

describe('edição e exclusão', () => {
  it('edita o nome do cliente', async () => {
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);
    await cadastrar(user, 'Nome Errado');

    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    const campo = await screen.findByLabelText(/nome do cliente/i);
    await user.clear(campo);
    await user.type(campo, 'Nome Corrigido');
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    expect(await screen.findByRole('heading', { name: 'Nome Corrigido' })).toBeInTheDocument();
  }, 30000);

  it('exclusão exige confirmação e informa o que será apagado junto', async () => {
    const user = userEvent.setup();
    await abrirCarteiraVazia(user);
    await cadastrar(user, 'Conta Descartável');

    await user.click(screen.getByRole('tab', { name: /execução/i }));
    await user.click(screen.getByRole('button', { name: /excluir este cliente/i }));

    // O texto é montado com <strong> no meio, então a busca é por função.
    const confirmacoes = await screen.findAllByText((_, el) =>
      (el?.textContent ?? '').includes('Excluir Conta Descartável e 0 compra(s)'),
    );
    expect(confirmacoes.length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /sim, excluir tudo/i }));

    // Volta para a carteira, agora vazia de novo.
    expect(
      await screen.findByText(/nenhuma conta na carteira/i, undefined, { timeout: 10000 }),
    ).toBeInTheDocument();
  }, 30000);
});
