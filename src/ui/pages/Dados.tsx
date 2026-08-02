/**
 * Dados: importação, exportação, calibração e privacidade.
 *
 * A importação exige CONSENTIMENTO EXPLÍCITO antes de qualquer leitura de arquivo, e é
 * PARCIAL por padrão: linhas válidas entram, inválidas viram CSV de erros exportável.
 * Rejeitar o arquivo inteiro por uma linha ruim é o comportamento que faz o usuário
 * desistir da importação. Ver docs/SECURITY.md §4.
 */

import { useMemo, useRef, useState } from 'react';
import { useApp } from '../../state/store';
import { Abas, Aviso, Card, EstadoVazio, Metrica, Rotulo, TituloSecao } from '../components/primitives';
import { baixarArquivo, deCsv, paraCsv } from '../../data/csv';
import {
  COLUNAS_MODELO,
  MAXIMO_LINHAS,
  ROTULO_ENTIDADE,
  contextoDe,
  validarArquivo,
  validarEntidade,
  type EntidadeImportavel,
} from '../../data/validators';
import {
  ENTIDADES_EXPORTAVEIS,
  exportarEntidadeCsv,
  exportarErrosCsv,
  lerBackup,
  serializarBackup,
} from '../../data/exporter';
import { contarRegistros } from '../../domain/seed';
import { PESOS_PADRAO, ROTULO_COMPONENTE, type ChaveComponente, type Dataset, type ImportError } from '../../domain/types';
import { normalizarPesos } from '../../domain/engine/scoring';
import { formatarData, hoje } from '../../domain/dates';

type Aba = 'VISAO' | 'IMPORTAR' | 'EXPORTAR' | 'CALIBRAR' | 'PRIVACIDADE';

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'VISAO', rotulo: 'Visão geral' },
  { valor: 'IMPORTAR', rotulo: 'Importar' },
  { valor: 'EXPORTAR', rotulo: 'Exportar' },
  { valor: 'CALIBRAR', rotulo: 'Calibrar motor' },
  { valor: 'PRIVACIDADE', rotulo: 'Privacidade' },
];

export function Dados() {
  const [aba, setAba] = useState<Aba>('VISAO');

  return (
    <div className="space-y-4">
      <TituloSecao descricao="Tudo fica neste dispositivo. Nada é enviado para servidor nenhum.">
        Dados e configuração
      </TituloSecao>

      <Abas abas={ABAS} ativa={aba} aoTrocar={setAba} />

      {aba === 'VISAO' && <VisaoGeral />}
      {aba === 'IMPORTAR' && <Importar />}
      {aba === 'EXPORTAR' && <Exportar />}
      {aba === 'CALIBRAR' && <Calibrar />}
      {aba === 'PRIVACIDADE' && <Privacidade />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function VisaoGeral() {
  const { dados, temDados, temDadosDemo, carregarDemonstracao, recomendacoes, alertas } = useApp();
  const [ocupado, setOcupado] = useState(false);
  const contagens = useMemo(() => contarRegistros(dados), [dados]);

  if (!temDados) {
    return (
      <EstadoVazio
        titulo="Nenhum dado carregado"
        descricao="Carregue a carteira de demonstração para ver o sistema operando, ou importe seus dados por CSV na aba Importar."
        acao={
          <button
            className="btn-primario"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              await carregarDemonstracao();
              setOcupado(false);
            }}
          >
            {ocupado ? 'Carregando…' : 'Carregar dados de demonstração'}
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {temDadosDemo && (
        <Aviso tom="atencao" titulo="Dados de demonstração ativos">
          Todos os registros são sintéticos, gerados por um algoritmo determinístico. Nenhum CNPJ,
          e-mail ou telefone completo existe no modelo de dados —{' '}
          <strong>esses campos foram removidos do schema de propósito</strong>. Aplicações técnicas:
          zero registros, por decisão de projeto.
        </Aviso>
      )}

      <Card className="p-4">
        <TituloSecao>Base local</TituloSecao>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metrica rotulo="Clientes" valor={String(contagens.clientes)} destaque />
          <Metrica rotulo="Vendas" valor={String(contagens.vendas)} />
          <Metrica rotulo="Orçamentos" valor={String(contagens.orcamentos)} />
          <Metrica rotulo="Perdas" valor={String(contagens.perdas)} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-bruto-steel">
          <Metrica rotulo="Produtos" valor={String(contagens.produtos)} />
          <Metrica rotulo="Famílias" valor={String(contagens.familias)} />
          <Metrica rotulo="Interações" valor={String(contagens.interacoes)} />
          <Metrica rotulo="Promessas" valor={String(contagens.promessas)} />
        </div>
      </Card>

      <Card className="p-4">
        <TituloSecao descricao="Recomendações e alertas não são armazenados: são recalculados a cada leitura. Isso permite recalibrar os pesos e ver o efeito imediatamente.">
          Derivados do motor
        </TituloSecao>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metrica rotulo="Recomendações" valor={String(recomendacoes.length)} />
          <Metrica rotulo="Alertas" valor={String(alertas.length)} />
          <Metrica
            rotulo="Aplicações técnicas"
            valor={String(contagens.aplicacoesTecnicas)}
            detalhe="catálogo não importado"
          />
          <Metrica rotulo="Artigos" valor={String(contagens.artigos)} />
        </div>
      </Card>

      {dados.importJobs.length > 0 && (
        <Card className="p-4">
          <TituloSecao>Importações realizadas</TituloSecao>
          <ul className="divide-y divide-bruto-steel">
            {[...dados.importJobs]
              .sort((a, b) => b.data.localeCompare(a.data))
              .slice(0, 8)
              .map((j) => (
                <li key={j.id} className="py-2 first:pt-0 flex justify-between gap-3 text-sm">
                  <span>
                    {ROTULO_ENTIDADE[j.entidade as EntidadeImportavel] ?? j.entidade}
                    <span className="text-bruto-ash">
                      {' '}
                      — {j.linhasAceitas} de {j.linhasLidas} linhas aceitas
                    </span>
                  </span>
                  <span className="text-xs text-bruto-ash tabular shrink-0">
                    {formatarData(j.data)}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <TituloSecao descricao="Trilha local das operações sobre a base.">Auditoria</TituloSecao>
        <ul className="divide-y divide-bruto-steel">
          {[...dados.auditEvents]
            .sort((a, b) => b.data.localeCompare(a.data))
            .slice(0, 10)
            .map((e) => (
              <li key={e.id} className="py-2 first:pt-0 flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="rotulo">{e.tipo}</span>{' '}
                  <span className="text-bruto-ash">{e.descricao}</span>
                </span>
                <span className="text-xs text-bruto-ash tabular shrink-0">
                  {formatarData(e.data)}
                </span>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Importar() {
  const { dados, substituirDados } = useApp();
  const referencia = useMemo(() => hoje(), []);
  const entradaRef = useRef<HTMLInputElement>(null);

  const [entidade, setEntidade] = useState<EntidadeImportavel>('customers');
  const [consentimento, setConsentimento] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [previa, setPrevia] = useState<{
    entidade: EntidadeImportavel;
    aceitos: unknown[];
    erros: ImportError[];
    linhasLidas: number;
  } | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function processarArquivo(arquivo: File) {
    setErroArquivo(null);
    setMensagem(null);
    setPrevia(null);

    const problema = validarArquivo(arquivo);
    if (problema) {
      setErroArquivo(problema);
      return;
    }

    const texto = await arquivo.text();
    const parse = deCsv(texto);

    if (parse.linhas.length > MAXIMO_LINHAS) {
      setErroArquivo(
        `Arquivo com ${parse.linhas.length} linhas excede o limite de ${MAXIMO_LINHAS}. Divida em arquivos menores.`,
      );
      return;
    }

    const ctx = contextoDe(dados);
    const { resultado } = validarEntidade(entidade, parse.linhas, ctx);

    const errosMalformados: ImportError[] = parse.linhasMalformadas.map((l) => ({
      linha: l.numero,
      campo: '(linha)',
      motivo: l.motivo,
    }));

    setPrevia({
      entidade,
      aceitos: resultado.aceitos as unknown[],
      erros: [...errosMalformados, ...resultado.erros].sort((a, b) => a.linha - b.linha),
      linhasLidas: parse.linhas.length + parse.linhasMalformadas.length,
    });
  }

  async function confirmar() {
    if (!previa) return;
    const chave = previa.entidade as keyof Dataset;
    const existentes = dados[chave] as unknown[];
    const idsNovos = new Set((previa.aceitos as { id: string }[]).map((r) => r.id));

    const novoDataset: Dataset = {
      ...dados,
      [chave]: [
        ...(existentes as { id: string }[]).filter((r) => !idsNovos.has(r.id)),
        ...previa.aceitos,
      ],
      importJobs: [
        ...dados.importJobs,
        {
          id: `imp-${Date.now().toString(36)}`,
          data: referencia,
          entidade: previa.entidade,
          linhasLidas: previa.linhasLidas,
          linhasAceitas: previa.aceitos.length,
          erros: previa.erros,
          consentimento: true,
        },
      ],
      auditEvents: [
        ...dados.auditEvents,
        {
          id: `aud-${Date.now().toString(36)}`,
          data: referencia,
          tipo: 'IMPORTACAO',
          descricao: `${previa.aceitos.length} registro(s) de ${ROTULO_ENTIDADE[previa.entidade]} importado(s), ${previa.erros.length} linha(s) rejeitada(s).`,
          entidade: previa.entidade,
          entidadeId: null,
        },
      ],
    } as Dataset;

    await substituirDados(novoDataset);
    setMensagem(
      `${previa.aceitos.length} registro(s) importado(s). ${previa.erros.length > 0 ? `${previa.erros.length} linha(s) rejeitada(s) — exporte o relatório de erros para corrigir no ERP.` : ''}`,
    );
    setPrevia(null);
    if (entradaRef.current) entradaRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      <Aviso titulo="Consentimento é obrigatório antes da leitura">
        O arquivo só é lido depois que você confirmar abaixo. Os dados ficam exclusivamente neste
        dispositivo, no armazenamento local do navegador. Você é responsável pela base de origem —
        minimize dados pessoais.
      </Aviso>

      <Card className="p-4 space-y-3">
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={consentimento}
            onChange={(e) => setConsentimento(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Confirmo que tenho autorização para usar estes dados, que eles ficarão apenas neste
            dispositivo, e que dados pessoais desnecessários foram removidos do arquivo.
          </span>
        </label>

        <div>
          <label htmlFor="entidade" className="rotulo block mb-1">
            O que você está importando
          </label>
          <select
            id="entidade"
            className="campo"
            value={entidade}
            onChange={(e) => {
              setEntidade(e.target.value as EntidadeImportavel);
              setPrevia(null);
            }}
          >
            {(Object.keys(COLUNAS_MODELO) as EntidadeImportavel[]).map((e) => (
              <option key={e} value={e}>
                {ROTULO_ENTIDADE[e]}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-bruto-steel p-3">
          <Rotulo>Colunas esperadas</Rotulo>
          <p className="text-xs text-bruto-ash mt-1 font-mono break-all">
            {COLUNAS_MODELO[entidade].join(', ')}
          </p>
          <button
            className="btn-secundario !min-h-[36px] text-xs mt-2"
            onClick={() =>
              baixarArquivo(
                `modelo-${entidade}.csv`,
                paraCsv([], COLUNAS_MODELO[entidade]),
              )
            }
          >
            Baixar modelo CSV
          </button>
        </div>

        <div>
          <label htmlFor="arquivo" className="rotulo block mb-1">
            Arquivo CSV (máximo 10 MB)
          </label>
          <input
            id="arquivo"
            ref={entradaRef}
            type="file"
            accept=".csv,text/csv"
            disabled={!consentimento}
            className="campo disabled:opacity-40"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) void processarArquivo(arquivo);
            }}
          />
          {!consentimento && (
            <p className="text-xs text-bruto-ash mt-1">
              Marque o consentimento acima para habilitar a seleção de arquivo.
            </p>
          )}
        </div>

        {erroArquivo && (
          <Aviso tom="perigo" titulo="Arquivo rejeitado">
            {erroArquivo}
          </Aviso>
        )}
        {mensagem && <p className="text-sm text-bruto-green">{mensagem}</p>}
      </Card>

      {previa && (
        <Card className="p-4">
          <TituloSecao descricao="Importação parcial: as linhas válidas entram, as inválidas são reportadas.">
            Prévia da importação
          </TituloSecao>

          <div className="grid grid-cols-3 gap-4">
            <Metrica rotulo="Linhas lidas" valor={String(previa.linhasLidas)} />
            <Metrica rotulo="Aceitas" valor={String(previa.aceitos.length)} destaque />
            <Metrica rotulo="Rejeitadas" valor={String(previa.erros.length)} />
          </div>

          {previa.erros.length > 0 && (
            <div className="mt-4 border-t border-bruto-steel pt-3">
              <Rotulo>Primeiras rejeições</Rotulo>
              <ul className="mt-1 space-y-1 max-h-52 overflow-y-auto">
                {previa.erros.slice(0, 20).map((e, i) => (
                  <li key={`${e.linha}-${e.campo}-${i}`} className="text-xs text-bruto-ash tabular">
                    Linha {e.linha} · {e.campo}: {e.motivo}
                  </li>
                ))}
              </ul>
              <button
                className="btn-secundario !min-h-[36px] text-xs mt-2"
                onClick={() =>
                  baixarArquivo(`erros-${previa.entidade}.csv`, exportarErrosCsv(previa.erros))
                }
              >
                Exportar relatório de erros
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              className="btn-primario flex-1"
              disabled={previa.aceitos.length === 0}
              onClick={confirmar}
            >
              Importar {previa.aceitos.length} registro(s)
            </button>
            <button className="btn-fantasma" onClick={() => setPrevia(null)}>
              Cancelar
            </button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <TituloSecao>Ordem recomendada de importação</TituloSecao>
        <ol className="text-sm text-bruto-ash space-y-1 list-decimal list-inside">
          <li>Clientes — todas as outras entidades dependem deles.</li>
          <li>Contatos e frotas.</li>
          <li>Vendas — é o que alimenta a cadência e o motor inteiro.</li>
          <li>Orçamentos e interações.</li>
          <li>Vendas perdidas.</li>
        </ol>
        <p className="text-xs text-bruto-ash mt-3">
          Registros com identificador já existente são substituídos. Linhas com chave estrangeira
          inexistente são rejeitadas com o número da linha.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Exportar() {
  const { dados, substituirDados, temDados } = useApp();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <TituloSecao descricao="Backup completo e restaurável, com versão e data de exportação.">
          Backup em JSON
        </TituloSecao>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primario"
            disabled={!temDados}
            onClick={() =>
              baixarArquivo(
                `bruto-os-backup-${hoje()}.json`,
                serializarBackup(dados),
                'application/json',
              )
            }
          >
            Exportar tudo
          </button>
          <label className="btn-secundario cursor-pointer">
            Restaurar backup
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (e) => {
                const arquivo = e.target.files?.[0];
                if (!arquivo) return;
                setErro(null);
                setMensagem(null);
                const resultado = lerBackup(await arquivo.text());
                if (!resultado.ok || !resultado.dados) {
                  setErro(resultado.erro);
                  return;
                }
                await substituirDados(resultado.dados);
                setMensagem(
                  `Backup restaurado: ${resultado.dados.customers.length} clientes. A base anterior foi substituída.`,
                );
              }}
            />
          </label>
        </div>
        {mensagem && <p className="text-sm text-bruto-green mt-3">{mensagem}</p>}
        {erro && (
          <div className="mt-3">
            <Aviso tom="perigo" titulo="Backup rejeitado">
              {erro}
            </Aviso>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <TituloSecao descricao="Uma entidade por arquivo, para análise externa.">
          Exportação em CSV
        </TituloSecao>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ENTIDADES_EXPORTAVEIS.map((e) => {
            const total = (dados[e.chave] as unknown[]).length;
            return (
              <button
                key={String(e.chave)}
                className="btn-secundario justify-between !px-3"
                disabled={total === 0}
                onClick={() =>
                  baixarArquivo(`bruto-os-${String(e.chave)}.csv`, exportarEntidadeCsv(dados, e.chave))
                }
              >
                <span>{e.rotulo}</span>
                <span className="tabular text-bruto-ash text-xs">{total}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-bruto-ash mt-3">
          Toda célula exportada é neutralizada contra injeção de fórmula: valores que começam com
          <span className="font-mono"> = + - @ </span> recebem um apóstrofo, para que o Excel os trate
          como texto.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Calibrar() {
  const { settings, atualizarSettings, recomendacoes } = useApp();
  const [pesos, setPesos] = useState(settings.pesos);
  const [piso, setPiso] = useState(settings.pisoMargemPercentual);
  const [meta, setMeta] = useState(settings.metaExecucaoDiaria);
  const [silencio, setSilencio] = useState(settings.janelaSilencioDias);
  const [salvo, setSalvo] = useState(false);

  const soma = Object.values(pesos).reduce((s, p) => s + p, 0);
  const normalizados = normalizarPesos(pesos);

  return (
    <div className="space-y-4">
      <Aviso titulo="O efeito é imediato">
        Os pesos não são gravados nas recomendações — elas são recalculadas a cada leitura. Ao
        salvar, a fila inteira muda na hora, sem migração de dados. A soma é normalizada para 100
        para que o score continue comparável.
      </Aviso>

      <Card className="p-4">
        <TituloSecao
          descricao={`Soma atual: ${soma.toFixed(0)} (normalizada para 100 no cálculo). Fila atual: ${recomendacoes.length} ações.`}
        >
          Pesos do score
        </TituloSecao>

        <ul className="space-y-3">
          {(Object.keys(pesos) as ChaveComponente[]).map((chave) => (
            <li key={chave}>
              <div className="flex justify-between text-sm mb-1">
                <label htmlFor={`peso-${chave}`}>{ROTULO_COMPONENTE[chave]}</label>
                <span className="tabular text-bruto-ash">
                  {pesos[chave]} → {normalizados[chave].toFixed(1)} efetivo
                </span>
              </div>
              <input
                id={`peso-${chave}`}
                type="range"
                min="0"
                max="30"
                step="1"
                value={pesos[chave]}
                onChange={(e) =>
                  setPesos((p) => ({ ...p, [chave]: Number(e.target.value) }))
                }
                className="w-full accent-[#F2B705]"
              />
            </li>
          ))}
        </ul>

        <button
          className="btn-fantasma !min-h-[36px] text-xs mt-3"
          onClick={() => setPesos(PESOS_PADRAO)}
        >
          Restaurar padrão
        </button>
      </Card>

      <Card className="p-4 space-y-3">
        <TituloSecao>Limiares operacionais</TituloSecao>

        <div>
          <label htmlFor="piso" className="rotulo block mb-1">
            Piso de margem para alerta ANDON (%)
          </label>
          <input
            id="piso"
            type="number"
            min="0"
            max="100"
            className="campo tabular"
            value={piso}
            onChange={(e) => setPiso(Number(e.target.value))}
          />
        </div>

        <div>
          <label htmlFor="meta" className="rotulo block mb-1">
            Meta de execução diária (ações)
          </label>
          <input
            id="meta"
            type="number"
            min="1"
            max="50"
            className="campo tabular"
            value={meta}
            onChange={(e) => setMeta(Number(e.target.value))}
          />
        </div>

        <div>
          <label htmlFor="silencio" className="rotulo block mb-1">
            Janela de silêncio de alerta reconhecido (dias)
          </label>
          <input
            id="silencio"
            type="number"
            min="1"
            max="90"
            className="campo tabular"
            value={silencio}
            onChange={(e) => setSilencio(Number(e.target.value))}
          />
        </div>
      </Card>

      {salvo && <p className="text-sm text-bruto-green">Configuração salva. A fila foi recalculada.</p>}

      <button
        className="btn-primario w-full"
        onClick={async () => {
          await atualizarSettings({
            ...settings,
            pesos,
            pisoMargemPercentual: piso,
            metaExecucaoDiaria: meta,
            janelaSilencioDias: silencio,
          });
          setSalvo(true);
        }}
      >
        Salvar configuração
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Privacidade() {
  const { removerDemonstracao, apagarTudo, temDadosDemo, temDados } = useApp();
  const [confirmacao, setConfirmacao] = useState('');
  const [mensagem, setMensagem] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <TituloSecao>Política de dados</TituloSecao>
        <div className="text-sm text-bruto-ash space-y-3 leading-relaxed">
          <p>
            <strong className="text-bruto-white">Onde ficam os dados.</strong> Exclusivamente no
            armazenamento local deste navegador (IndexedDB). Não há servidor, não há conta, não há
            sincronização. A política de segurança de conteúdo da aplicação bloqueia qualquer conexão
            para fora do próprio domínio — o navegador impede o envio, mesmo que uma dependência
            comprometida tentasse.
          </p>
          <p>
            <strong className="text-bruto-white">O que não existe no modelo.</strong> CNPJ e e-mail
            foram removidos do schema por decisão de projeto: um campo que não existe não vaza.
            Telefones dos dados de demonstração são sempre mascarados.
          </p>
          <p>
            <strong className="text-bruto-white">Criptografia em repouso.</strong> Os dados no
            IndexedDB <em>não são criptografados</em>. Qualquer criptografia feita no cliente teria a
            chave no próprio cliente — seria teatro de segurança. A proteção real é o bloqueio de
            tela e a criptografia de disco do dispositivo. Não importe dados reais em dispositivo
            compartilhado.
          </p>
          <p>
            <strong className="text-bruto-white">Risco de perda.</strong> O Safari no iOS pode
            descartar o armazenamento de sites sem uso por 7 dias. Exporte backup periodicamente na
            aba Exportar.
          </p>
          <p>
            <strong className="text-bruto-white">LGPD.</strong> A arquitetura foi construída
            compatível com boas práticas — minimização, finalidade, transparência, eliminação,
            portabilidade e trilha de auditoria local. Isto <em>não constitui</em> declaração de
            conformidade jurídica: conformidade depende do uso que a distribuidora fizer do produto e
            exige avaliação profissional.
          </p>
        </div>
      </Card>

      {mensagem && <p className="text-sm text-bruto-green">{mensagem}</p>}

      <Card className="p-4">
        <TituloSecao descricao="Remove apenas os registros marcados como demonstração. Dados importados são preservados.">
          Limpar dados de demonstração
        </TituloSecao>
        <button
          className="btn-secundario"
          disabled={!temDadosDemo}
          onClick={async () => {
            await removerDemonstracao();
            setMensagem('Registros de demonstração removidos. Dados importados foram preservados.');
          }}
        >
          {temDadosDemo ? 'Remover demonstração' : 'Nenhum dado de demonstração ativo'}
        </button>
      </Card>

      <Card className="p-4 border-bruto-red/40">
        <TituloSecao descricao="Destrói o banco local inteiro. Não há como desfazer — exporte um backup antes.">
          Apagar tudo
        </TituloSecao>
        <label htmlFor="confirmar-apagar" className="rotulo block mb-1">
          Digite APAGAR para habilitar
        </label>
        <input
          id="confirmar-apagar"
          className="campo"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          placeholder="APAGAR"
          autoComplete="off"
        />
        <button
          className="btn-perigo w-full mt-3"
          disabled={confirmacao !== 'APAGAR' || !temDados}
          onClick={async () => {
            await apagarTudo();
            setConfirmacao('');
            setMensagem('Banco local destruído. Nenhum dado permanece neste dispositivo.');
          }}
        >
          Apagar todos os dados deste dispositivo
        </button>
        <p className="text-xs text-bruto-ash mt-2">
          A confirmação é por digitação, não por clique: um clique acidental que destrói uma carteira
          importada é um incidente evitável.
        </p>
      </Card>
    </div>
  );
}
