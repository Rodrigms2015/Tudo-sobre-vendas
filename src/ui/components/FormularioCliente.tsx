/**
 * Cadastro e edição manual de cliente, e registro manual de venda.
 *
 * Por que isto existe: até esta versão, a ÚNICA forma de colocar dados no BRUTO OS era
 * importar CSV ou carregar a demonstração. Um vendedor que quisesse testar com cinco
 * contas reais não tinha por onde começar — o produto parecia não funcionar, e com razão.
 *
 * Princípio dos formulários: **só o nome é obrigatório.** Todo o resto é opcional e o que
 * ficar em branco vira lacuna explícita no motor, não um valor inventado (regra R3).
 */

import { useState } from 'react';
import {
  ROTULO_PERFIL_OPERACAO,
  ROTULO_SEGMENTO,
  ROTULO_TIPO_CLIENTE,
  type Customer,
  type Fleet,
  type PerfilOperacao,
  type ProductFamily,
  type Segmento,
  type TipoCliente,
} from '../../domain/types';
import { Aviso, Card, Rotulo, TituloSecao } from './primitives';
import { hoje } from '../../domain/dates';

export interface DadosFormularioCliente {
  cliente: Omit<Customer, 'id' | 'criadoEm' | 'origem'>;
  frota: Omit<Fleet, 'id' | 'customerId'>;
}

function numeroOuNulo(valor: string): number | null {
  const limpo = valor.trim();
  if (limpo === '') return null;
  const n = Number(limpo.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function FormularioCliente({
  sellerId,
  inicial,
  frotaInicial,
  aoSalvar,
  aoCancelar,
  rotuloAcao = 'Cadastrar cliente',
}: {
  sellerId: string;
  inicial?: Customer;
  frotaInicial?: Fleet | null;
  aoSalvar: (dados: DadosFormularioCliente) => Promise<void>;
  aoCancelar: () => void;
  rotuloAcao?: string;
}) {
  const [nomeFantasia, setNome] = useState(inicial?.nomeFantasia ?? '');
  const [cidade, setCidade] = useState(inicial?.cidade ?? '');
  const [uf, setUf] = useState(inicial?.uf ?? '');
  const [tipoCliente, setTipo] = useState<TipoCliente>(inicial?.tipoCliente ?? 'TRANSPORTADORA');
  const [segmento, setSegmento] = useState<Segmento>(inicial?.segmento ?? 'CARGA_RODOVIARIA');
  const [potencial, setPotencial] = useState(
    inicial?.potencial !== null && inicial?.potencial !== undefined ? String(inicial.potencial) : '',
  );
  const [observacoes, setObs] = useState(inicial?.observacoes ?? '');

  const [totalVeiculos, setVeiculos] = useState(
    frotaInicial?.totalVeiculos !== null && frotaInicial?.totalVeiculos !== undefined
      ? String(frotaInicial.totalVeiculos)
      : '',
  );
  const [perfilOperacao, setPerfil] = useState<PerfilOperacao | ''>(
    frotaInicial?.perfilOperacao ?? '',
  );
  const [idadeMedia, setIdade] = useState(
    frotaInicial?.idadeMediaAnos !== null && frotaInicial?.idadeMediaAnos !== undefined
      ? String(frotaInicial.idadeMediaAnos)
      : '',
  );

  const [salvando, setSalvando] = useState(false);
  const podeSalvar = nomeFantasia.trim().length >= 2 && !salvando;
  const veiculos = numeroOuNulo(totalVeiculos);

  async function salvar() {
    setSalvando(true);
    try {
      await aoSalvar({
        cliente: {
          nomeFantasia: nomeFantasia.trim(),
          cidade: cidade.trim(),
          uf: uf.trim().toUpperCase().slice(0, 2),
          segmento,
          tipoCliente,
          sellerId,
          potencial: numeroOuNulo(potencial),
          observacoes: observacoes.trim(),
        },
        frota: {
          totalVeiculos: veiculos,
          perfilOperacao: perfilOperacao === '' ? null : perfilOperacao,
          idadeMediaAnos: numeroOuNulo(idadeMedia),
          // Digitado pelo próprio vendedor: confirmado, não estimado.
          procedencia: veiculos === null ? 'AUSENTE' : 'CONFIRMADO',
        },
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card elevado className="p-4 space-y-4">
      <TituloSecao descricao="Só o nome é obrigatório. O que ficar em branco vira lacuna no motor, não um valor inventado.">
        {inicial ? 'Editar cliente' : 'Novo cliente'}
      </TituloSecao>

      <div>
        <label htmlFor="fc-nome" className="rotulo block mb-1">
          Nome do cliente *
        </label>
        <input
          id="fc-nome"
          className="campo"
          value={nomeFantasia}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Transportes Serra Azul"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="fc-cidade" className="rotulo block mb-1">
            Cidade
          </label>
          <input
            id="fc-cidade"
            className="campo"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="fc-uf" className="rotulo block mb-1">
            UF
          </label>
          <input
            id="fc-uf"
            className="campo uppercase"
            maxLength={2}
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="fc-tipo" className="rotulo block mb-1">
            Tipo de cliente
          </label>
          <select
            id="fc-tipo"
            className="campo"
            value={tipoCliente}
            onChange={(e) => setTipo(e.target.value as TipoCliente)}
          >
            {(Object.keys(ROTULO_TIPO_CLIENTE) as TipoCliente[]).map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_CLIENTE[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fc-segmento" className="rotulo block mb-1">
            Segmento
          </label>
          <select
            id="fc-segmento"
            className="campo"
            value={segmento}
            onChange={(e) => setSegmento(e.target.value as Segmento)}
          >
            {(Object.keys(ROTULO_SEGMENTO) as Segmento[]).map((s) => (
              <option key={s} value={s}>
                {ROTULO_SEGMENTO[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-bruto-steel pt-4">
        <Rotulo>Frota</Rotulo>
        <p className="text-xs text-bruto-ash mt-1 mb-3">
          É o dado de maior impacto: sem ele o sistema não consegue dimensionar a conta nem
          sugerir expansão. Pode deixar em branco e preencher depois da primeira ligação.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="fc-veiculos" className="rotulo block mb-1">
              Nº de veículos
            </label>
            <input
              id="fc-veiculos"
              type="number"
              min="0"
              inputMode="numeric"
              className="campo tabular"
              value={totalVeiculos}
              onChange={(e) => setVeiculos(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="fc-perfil" className="rotulo block mb-1">
              Operação
            </label>
            <select
              id="fc-perfil"
              className="campo"
              value={perfilOperacao}
              onChange={(e) => setPerfil(e.target.value as PerfilOperacao | '')}
            >
              <option value="">Não sei</option>
              {(Object.keys(ROTULO_PERFIL_OPERACAO) as PerfilOperacao[]).map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PERFIL_OPERACAO[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fc-idade" className="rotulo block mb-1">
              Idade média (anos)
            </label>
            <input
              id="fc-idade"
              type="number"
              min="0"
              inputMode="numeric"
              className="campo tabular"
              value={idadeMedia}
              onChange={(e) => setIdade(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="fc-potencial" className="rotulo block mb-1">
            Potencial (1 a 5)
          </label>
          <select
            id="fc-potencial"
            className="campo"
            value={potencial}
            onChange={(e) => setPotencial(e.target.value)}
          >
            <option value="">Não avaliado</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fc-obs" className="rotulo block mb-1">
            Observações
          </label>
          <input
            id="fc-obs"
            className="campo"
            value={observacoes}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: compra centralizada na matriz"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primario flex-1 min-w-[160px]" disabled={!podeSalvar} onClick={salvar}>
          {salvando ? 'Salvando…' : rotuloAcao}
        </button>
        <button className="btn-fantasma" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </button>
      </div>

      {nomeFantasia.trim().length > 0 && nomeFantasia.trim().length < 2 && (
        <p className="text-xs text-bruto-amber">O nome precisa ter pelo menos 2 caracteres.</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------

/**
 * Registro manual de compra. É o dado que alimenta TODO o motor: cadência, temperatura,
 * ticket, recorrência e janela de reposição saem daqui.
 */
export function FormularioVenda({
  familias,
  aoSalvar,
  aoCancelar,
  comprasExistentes,
}: {
  familias: ProductFamily[];
  aoSalvar: (venda: {
    data: string;
    valorTotal: number;
    margemPercentual: number | null;
    familyIds: string[];
  }) => Promise<void>;
  aoCancelar: () => void;
  comprasExistentes: number;
}) {
  const [data, setData] = useState(hoje());
  const [valor, setValor] = useState('');
  const [margem, setMargem] = useState('');
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const valorNumero = numeroOuNulo(valor);
  const podeSalvar =
    valorNumero !== null && valorNumero > 0 && selecionadas.length > 0 && !salvando;

  const faltam = Math.max(0, 4 - (comprasExistentes + 1));

  return (
    <Card elevado className="p-4 space-y-4">
      <TituloSecao descricao="A compra é o dado que alimenta o motor inteiro: cadência, ticket, recorrência e janela de reposição saem daqui.">
        Registrar compra
      </TituloSecao>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="fv-data" className="rotulo block mb-1">
            Data da compra *
          </label>
          <input
            id="fv-data"
            type="date"
            className="campo"
            value={data}
            max={hoje()}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="fv-valor" className="rotulo block mb-1">
            Valor total (R$) *
          </label>
          <input
            id="fv-valor"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="campo tabular"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div>
          <label htmlFor="fv-margem" className="rotulo block mb-1">
            Margem (%)
          </label>
          <input
            id="fv-margem"
            type="number"
            step="0.1"
            inputMode="decimal"
            className="campo tabular"
            value={margem}
            onChange={(e) => setMargem(e.target.value)}
            placeholder="opcional"
          />
        </div>
      </div>

      <div>
        <Rotulo>Famílias compradas *</Rotulo>
        <p className="text-xs text-bruto-ash mt-1 mb-2">
          Marque uma ou mais. Não é preciso informar o código da peça — o motor trabalha por
          família.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
          {familias.map((f) => {
            const ativa = selecionadas.includes(f.id);
            return (
              <button
                key={f.id}
                aria-pressed={ativa}
                onClick={() =>
                  setSelecionadas((atual) =>
                    atual.includes(f.id) ? atual.filter((x) => x !== f.id) : [...atual, f.id],
                  )
                }
                className={`rounded-lg min-h-[48px] px-2 text-xs font-semibold text-left ${
                  ativa
                    ? 'bg-bruto-yellow text-bruto-black'
                    : 'border border-bruto-steel text-bruto-ash'
                }`}
              >
                {f.nome}
              </button>
            );
          })}
        </div>
      </div>

      {faltam > 0 && (
        <Aviso titulo={`Faltam ${faltam} compra(s) para o motor calcular a cadência`}>
          O BRUTO OS só exibe janela de reposição com 4 compras registradas. Com menos que isso,
          ele diz &ldquo;sem base&rdquo; em vez de inventar uma previsão. Registre o histórico
          que você já tem — as compras antigas contam.
        </Aviso>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          className="btn-primario flex-1 min-w-[160px]"
          disabled={!podeSalvar}
          onClick={async () => {
            setSalvando(true);
            try {
              await aoSalvar({
                data,
                valorTotal: valorNumero as number,
                margemPercentual: numeroOuNulo(margem),
                familyIds: selecionadas,
              });
              setValor('');
              setMargem('');
              setSelecionadas([]);
            } finally {
              setSalvando(false);
            }
          }}
        >
          {salvando ? 'Salvando…' : 'Registrar compra'}
        </button>
        <button className="btn-fantasma" onClick={aoCancelar} disabled={salvando}>
          Fechar
        </button>
      </div>
    </Card>
  );
}
