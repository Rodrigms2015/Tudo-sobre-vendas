import { Link } from 'react-router-dom';
import { AuthorPortrait } from '../components/AuthorPortrait';
import { useApp } from '../../state/store';

const DIFERENCIAIS = [
  {
    titulo: 'Prioriza pela cadência do cliente, não por dias no calendário',
    texto:
      'Quarenta dias sem comprar é normal para quem compra a cada noventa e catastrófico para quem compra a cada sete. O BRUTO OS mede o atraso contra o ciclo do próprio cliente. É por isso que a lista de "clientes esfriando" de um CRM comum é inútil.',
  },
  {
    titulo: 'Toda recomendação mostra o raciocínio',
    texto:
      'Fatores, evidências, penalidades e o que o sistema não sabe. Nenhum card aparece sem os dados que o sustentam. Você pode discordar do sistema com argumentos — e ele registra quando você discorda.',
  },
  {
    titulo: 'Recusa afirmar aplicação técnica',
    texto:
      'O sistema organiza conhecimento comercial: o que perguntar, quando ligar, o que costuma ser comprado junto. Aplicação veículo-motor-peça exige catálogo validado. Enquanto não houver, a tela mostra vazio — e essa recusa é a funcionalidade.',
  },
  {
    titulo: 'O alerta morre',
    texto:
      'No máximo três alertas críticos por vez, um por conta, todos reconhecíveis com motivo. Um painel que acende inteiro é um painel apagado.',
  },
  {
    titulo: 'A perda vira insumo',
    texto:
      'Registro de venda perdida em vinte segundos, com motivo, valor e se é recuperável. Um formulário de doze campos garante zero registro — e sem registro não existe aprendizado.',
  },
  {
    titulo: 'Funciona sem internet e sem servidor',
    texto:
      'Todos os dados ficam no seu dispositivo. Nenhuma chave, nenhuma API paga, nenhum envio para fora. Instalável como aplicativo no celular.',
  },
];

export function Landing() {
  const { temDados } = useApp();

  return (
    <div className="min-h-full bg-bruto-black">
      <a href="#conteudo" className="link-pular">
        Pular para o conteúdo
      </a>

      <header className="border-b border-bruto-steel">
        <div className="max-w-shell mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 512 512" className="w-7 h-7 shrink-0" aria-hidden="true">
              <rect width="512" height="512" fill="#0A0A0B" />
              <g fill="#F2B705">
                <polygon points="136,140 376,248 376,304 136,196" />
                <polygon points="136,216 376,324 376,380 136,272" />
              </g>
            </svg>
            <span className="font-bold tracking-tight">BRUTO OS</span>
          </div>
          <Link to="/app/cockpit" className="btn-primario !min-h-[40px] !px-4 text-[13px]">
            Entrar no Cockpit
          </Link>
        </div>
      </header>

      <main id="conteudo">
        {/* Herói */}
        <section className="max-w-shell mx-auto px-5 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-center">
            <div>
              <p className="rotulo mb-4">Sistema operacional de vendas da linha pesada</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
                BRUTO OS
              </h1>
              <p className="mt-5 text-xl sm:text-2xl text-bruto-white/90 font-medium leading-snug max-w-2xl">
                Pare de ligar para todo mundo. Ligue para a conta certa, com a peça certa, no
                momento certo.
              </p>
              <p className="mt-6 text-bruto-ash leading-relaxed max-w-2xl">
                O vendedor de peças de caminhão e ônibus não sofre de falta de dados. Sofre de falta
                de decisão. O ERP registra o passado, a planilha organiza o presente, e nenhum dos
                dois diz o que fazer nos próximos vinte minutos.
              </p>
              <p className="mt-4 text-bruto-ash leading-relaxed max-w-2xl">
                O BRUTO OS é a camada de decisão entre a carteira e a próxima ação comercial. Ele
                responde uma pergunta só, em toda tela:{' '}
                <strong className="text-bruto-white font-semibold">
                  qual é a melhor ação agora, por qual motivo, e com qual abordagem.
                </strong>
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/app/cockpit" className="btn-primario">
                  Entrar no Cockpit
                </Link>
                <Link to="/app/dados" className="btn-secundario">
                  {temDados ? 'Gerenciar dados' : 'Carregar demonstração'}
                </Link>
              </div>

              <p className="mt-5 text-xs text-bruto-ash">
                Funciona offline · Instalável no celular · Nenhum dado sai do dispositivo
              </p>
            </div>

            <div className="lg:justify-self-end w-full max-w-[300px] mx-auto lg:mx-0">
              <AuthorPortrait />
              <div className="mt-3">
                <p className="font-semibold">Idealizado por Rodrigo Soares</p>
                <p className="text-sm text-bruto-ash mt-0.5">
                  Concepção e direção de produto, a partir da rotina real de quem vende linha pesada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Manifesto */}
        <section className="border-y border-bruto-steel bg-bruto-carbon">
          <div className="max-w-shell mx-auto px-5 py-12 md:py-16">
            <div className="max-w-3xl">
              <p className="rotulo">Manifesto</p>
              <blockquote className="mt-4 text-xl sm:text-2xl font-medium leading-snug">
                Um sistema que promete o que não pode provar não é ambicioso. É inútil na segunda
                semana.
              </blockquote>
              <p className="mt-5 text-bruto-ash leading-relaxed">
                O BRUTO OS prefere cobrir trinta por cento da carteira com um sinal em que o vendedor
                confia a cem por cento com um sinal que ele aprende a ignorar. Quando não há base
                histórica, ele diz que não há — e informa qual pergunta cria essa base. Quando não
                sabe se a peça serve, ele não chuta: ele mostra o que perguntar.
              </p>
              <p className="mt-4 text-bruto-ash leading-relaxed">
                Não há inteligência artificial aqui. O motor é determinístico, auditável e
                calibrável. Isso é uma vantagem: um vendedor experiente pode discordar dele com
                argumentos, e o sistema registra quando isso acontece.
              </p>
            </div>
          </div>
        </section>

        {/* Painel */}
        <section className="max-w-shell mx-auto px-5 py-12 md:py-16">
          <p className="rotulo">Demonstração do painel</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">
            O que o Cockpit responde em dez segundos
          </h2>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="rotulo">Painel ANDON</div>
              <p className="mt-2 text-sm text-bruto-ash">
                Anormalidades que exigem ação hoje. Máximo de três críticos, um por conta.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="w-1 self-stretch bg-bruto-red rounded-full" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-bruto-red">
                      Crítico
                    </p>
                    <p className="text-sm">Ônibus parado com falha no sistema de embreagem</p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-1 self-stretch bg-bruto-amber rounded-full" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-bruto-amber">
                      Atenção
                    </p>
                    <p className="text-sm">Orçamento de R$ 18.400 parado há 11 dias</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="rotulo">Próxima ação</div>
              <p className="mt-2 text-sm text-bruto-ash">
                Com o raciocínio exposto. Nunca um número solto.
              </p>
              <div className="mt-4">
                <p className="font-semibold text-sm">Ligar para a conta — está na janela</p>
                <ul className="mt-2 space-y-1 text-xs text-bruto-ash">
                  <li>+ Compra a cada 60 dias; última há 58</li>
                  <li>+ 18 veículos, operação rodoviária</li>
                  <li>+ 5 compras nos últimos 12 meses</li>
                  <li>○ Margem não disponível no histórico</li>
                </ul>
              </div>
            </div>

            <div className="card p-5">
              <div className="rotulo">Resumo SCAR</div>
              <p className="mt-2 text-sm text-bruto-ash">
                Situação, Contexto, Análise e Recomendação, prontos para a ligação.
              </p>
              <div className="mt-4 space-y-1.5 text-xs">
                <p>
                  <span className="text-bruto-yellow font-semibold">S</span>{' '}
                  <span className="text-bruto-ash">Urgência aberta, veículo imobilizado</span>
                </p>
                <p>
                  <span className="text-bruto-yellow font-semibold">C</span>{' '}
                  <span className="text-bruto-ash">18 veículos, compra irregular</span>
                </p>
                <p>
                  <span className="text-bruto-yellow font-semibold">A</span>{' '}
                  <span className="text-bruto-ash">Alto risco, chance de kit completo</span>
                </p>
                <p>
                  <span className="text-bruto-yellow font-semibold">R</span>{' '}
                  <span className="text-bruto-ash">Validar aplicação, registrar próxima ação</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Por que não é mais um CRM */}
        <section className="border-t border-bruto-steel bg-bruto-carbon">
          <div className="max-w-shell mx-auto px-5 py-12 md:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Por que isso não é mais um CRM
            </h2>
            <p className="mt-3 text-bruto-ash max-w-3xl">
              Um CRM organiza cadastro. O BRUTO OS organiza decisão. As seis diferenças que importam:
            </p>

            <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DIFERENCIAIS.map((d) => (
                <div key={d.titulo} className="card p-5">
                  <h3 className="font-semibold leading-snug">{d.titulo}</h3>
                  <p className="mt-2 text-sm text-bruto-ash leading-relaxed">{d.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-shell mx-auto px-5 py-12 md:py-16">
          <div className="card-elevado p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Comece pela carteira de demonstração
              </h2>
              <p className="mt-2 text-sm text-bruto-ash max-w-xl">
                32 clientes sintéticos, com histórico, orçamentos, perdas e promessas. Todos os dados
                são fictícios e estão marcados como tal. Depois, importe a sua carteira por CSV.
              </p>
            </div>
            <Link to="/app/cockpit" className="btn-primario shrink-0">
              Entrar no Cockpit
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-bruto-steel">
        <div className="max-w-shell mx-auto px-5 py-8 text-sm text-bruto-ash">
          <p className="font-semibold text-bruto-white">BRUTO OS</p>
          <p className="mt-1">O sistema operacional de vendas da linha pesada.</p>
          <p className="mt-4 text-xs">
            Ambiente demonstrativo. Todos os dados exibidos são sintéticos. Nenhuma aplicação técnica
            apresentada deve ser usada comercialmente sem consulta a catálogo validado.
          </p>
          <p className="mt-2 text-xs">Idealizado por Rodrigo Soares.</p>
        </div>
      </footer>
    </div>
  );
}
