/**
 * Inteligência de Venda Perdida.
 *
 * O módulo transforma "não vendi" em insumo de decisão. Cada motivo aponta o GARGALO
 * responsável — preço vai para o comercial, estoque vai para compras, aplicação vai
 * para treinamento. Um relatório que só conta perdas não muda nada.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../state/store';
import { Card, EstadoVazio, Metrica, Rotulo, TituloSecao } from '../components/primitives';
import { BarrasHorizontais, LinhaTendencia } from '../charts';
import { calcularTelemetria } from '../../domain/engine/telemetry';
import { MOTIVOS_PERDA, type MotivoPerda } from '../../domain/types';
import { diasEntre, formatarData, formatarMoeda, hoje } from '../../domain/dates';

const JANELA_DIAS = 180;

export function Perdas() {
  const { dados, contextos, settings, temDados, contextoPorCliente } = useApp();
  const referencia = useMemo(() => hoje(), []);
  const [motivoSelecionado, setMotivoSelecionado] = useState<MotivoPerda | ''>('');

  const idsClientes = useMemo(() => new Set(contextos.map((c) => c.customer.id)), [contextos]);

  const perdas = useMemo(
    () =>
      dados.lostSales.filter(
        (p) => idsClientes.has(p.customerId) && diasEntre(p.data, referencia) <= JANELA_DIAS,
      ),
    [dados.lostSales, idsClientes, referencia],
  );

  const telemetria = useMemo(
    () => calcularTelemetria(dados, contextos, settings.sellerAtivoId, referencia),
    [dados, contextos, settings.sellerAtivoId, referencia],
  );

  const valorTotal = perdas.reduce((s, p) => s + p.valorEstimado, 0);
  const recuperaveis = perdas.filter((p) => p.recuperavel);
  const valorRecuperavel = recuperaveis.reduce((s, p) => s + p.valorEstimado, 0);

  const porMotivo = useMemo(() => {
    const mapa = new Map<MotivoPerda, { contagem: number; valor: number }>();
    for (const p of perdas) {
      const atual = mapa.get(p.motivo) ?? { contagem: 0, valor: 0 };
      mapa.set(p.motivo, { contagem: atual.contagem + 1, valor: atual.valor + p.valorEstimado });
    }
    return MOTIVOS_PERDA.map((m) => ({
      motivo: m.valor,
      rotulo: m.rotulo,
      gargalo: m.gargalo,
      contagem: mapa.get(m.valor)?.contagem ?? 0,
      valorPerdido: mapa.get(m.valor)?.valor ?? 0,
    }))
      .filter((m) => m.contagem > 0)
      .sort((a, b) => b.valorPerdido - a.valorPerdido);
  }, [perdas]);

  const porFamilia = useMemo(() => {
    const nomes = new Map(dados.productFamilies.map((f) => [f.id, f.nome]));
    const mapa = new Map<string, number>();
    for (const p of perdas) {
      if (!p.familyId) continue;
      mapa.set(p.familyId, (mapa.get(p.familyId) ?? 0) + p.valorEstimado);
    }
    return [...mapa.entries()]
      .map(([id, valor]) => ({ rotulo: nomes.get(id) ?? id, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [perdas, dados.productFamilies]);

  const reincidentes = useMemo(() => {
    const mapa = new Map<string, { contagem: number; valor: number }>();
    for (const p of perdas) {
      const atual = mapa.get(p.customerId) ?? { contagem: 0, valor: 0 };
      mapa.set(p.customerId, {
        contagem: atual.contagem + 1,
        valor: atual.valor + p.valorEstimado,
      });
    }
    return [...mapa.entries()]
      .filter(([, v]) => v.contagem >= 2)
      .map(([id, v]) => ({
        id,
        nome: contextoPorCliente.get(id)?.customer.nomeFantasia ?? id,
        ...v,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [perdas, contextoPorCliente]);

  const filtradas = motivoSelecionado
    ? perdas.filter((p) => p.motivo === motivoSelecionado)
    : perdas;

  if (!temDados) {
    return (
      <EstadoVazio
        titulo="Nenhuma carteira carregada"
        descricao="Carregue a demonstração ou importe sua base."
        acao={
          <Link to="/app/dados" className="btn-primario">
            Ir para Dados
          </Link>
        }
      />
    );
  }

  if (perdas.length === 0) {
    return (
      <div className="space-y-4">
        <TituloSecao>Inteligência de venda perdida</TituloSecao>
        <EstadoVazio
          titulo="Nenhuma perda registrada nos últimos 180 dias"
          descricao="Isso é bom — ou o registro não está acontecendo. Perda não registrada é aprendizado perdido: sem ela, o sistema não consegue apontar onde está o gargalo."
          acao={
            <Link to="/app/carteira" className="btn-secundario">
              Registrar perda em um cliente
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TituloSecao descricao='O módulo transforma "não vendi" em decisão. Cada motivo aponta o gargalo responsável.'>
        Inteligência de venda perdida
      </TituloSecao>

      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metrica rotulo="Perdas (180d)" valor={String(perdas.length)} destaque />
          <Metrica rotulo="Valor perdido" valor={formatarMoeda(valorTotal)} />
          <Metrica
            rotulo="Recuperável"
            valor={formatarMoeda(valorRecuperavel)}
            detalhe={`${recuperaveis.length} oportunidades`}
          />
          <Metrica
            rotulo="Classificadas"
            valor={`${Math.round((perdas.filter((p) => p.motivo !== 'OUTRO').length / perdas.length) * 100)}%`}
            detalhe="motivo definido"
          />
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <TituloSecao descricao="Ordenado por valor, não por contagem: uma perda de R$ 40 mil vale mais que dez de R$ 500.">
            Ranking de motivos
          </TituloSecao>
          <BarrasHorizontais
            dados={porMotivo.map((m) => ({
              rotulo: m.rotulo,
              valor: m.valorPerdido,
              destaque: m.motivo === porMotivo[0]?.motivo,
            }))}
            formato="moeda"
            descricao="Valor perdido por motivo"
          />

          <div className="mt-4 border-t border-bruto-steel pt-3">
            <Rotulo>Para onde cada motivo aponta</Rotulo>
            <ul className="mt-1.5 space-y-1">
              {porMotivo.slice(0, 5).map((m) => (
                <li key={m.motivo} className="text-sm flex justify-between gap-3">
                  <button
                    onClick={() =>
                      setMotivoSelecionado((v) => (v === m.motivo ? '' : m.motivo))
                    }
                    className={`text-left hover:text-bruto-yellow ${motivoSelecionado === m.motivo ? 'text-bruto-yellow' : ''}`}
                  >
                    {m.rotulo} <span className="text-bruto-ash">({m.contagem})</span>
                  </button>
                  <span className="text-bruto-ash shrink-0">{m.gargalo}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="p-4">
          <TituloSecao descricao="Últimos seis períodos de 30 dias.">Tendência do valor perdido</TituloSecao>
          <LinhaTendencia dados={telemetria.tendenciaPerdas} descricao="Valor perdido por período" />

          {porFamilia.length > 0 && (
            <div className="mt-5 border-t border-bruto-steel pt-3">
              <Rotulo>Famílias mais afetadas</Rotulo>
              <div className="mt-2">
                <BarrasHorizontais
                  dados={porFamilia}
                  formato="moeda"
                  descricao="Valor perdido por família"
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      {reincidentes.length > 0 && (
        <Card className="p-4">
          <TituloSecao descricao="Contas com duas ou mais perdas no período. Perda reincidente é problema estrutural, não azar.">
            Clientes reincidentes
          </TituloSecao>
          <ul className="divide-y divide-bruto-steel">
            {reincidentes.map((r) => (
              <li key={r.id} className="py-2.5 first:pt-0 flex justify-between gap-3">
                <Link
                  to={`/app/cliente/${r.id}`}
                  className="text-sm font-medium hover:text-bruto-yellow truncate"
                >
                  {r.nome}
                </Link>
                <span className="text-sm text-bruto-ash tabular shrink-0">
                  {r.contagem} perdas · {formatarMoeda(r.valor)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <TituloSecao
          descricao={
            motivoSelecionado
              ? `Filtrado por ${MOTIVOS_PERDA.find((m) => m.valor === motivoSelecionado)?.rotulo}.`
              : 'Todas as perdas do período. Marcadas como recuperáveis entram na fila de retomada.'
          }
          acao={
            motivoSelecionado ? (
              <button
                className="btn-fantasma !min-h-[36px] text-xs"
                onClick={() => setMotivoSelecionado('')}
              >
                Limpar filtro
              </button>
            ) : undefined
          }
        >
          Perdas registradas ({filtradas.length})
        </TituloSecao>

        <ul className="divide-y divide-bruto-steel">
          {[...filtradas]
            .sort((a, b) => b.data.localeCompare(a.data))
            .slice(0, 20)
            .map((p) => (
              <li key={p.id} className="py-3 first:pt-0">
                <div className="flex justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Link
                      to={`/app/cliente/${p.customerId}`}
                      className="text-sm font-medium hover:text-bruto-yellow"
                    >
                      {contextoPorCliente.get(p.customerId)?.customer.nomeFantasia ?? p.customerId}
                    </Link>
                    <p className="text-xs text-bruto-ash">
                      {MOTIVOS_PERDA.find((m) => m.valor === p.motivo)?.rotulo} ·{' '}
                      {p.recuperavel ? 'recuperável' : 'não recuperável'} · {formatarData(p.data)}
                    </p>
                    {p.detalhe && <p className="text-xs text-bruto-ash mt-1">{p.detalhe}</p>}
                  </div>
                  <span className="tabular font-semibold shrink-0">
                    {formatarMoeda(p.valorEstimado)}
                  </span>
                </div>
              </li>
            ))}
        </ul>
      </Card>

      {valorRecuperavel > 0 && (
        <Card className="p-4">
          <TituloSecao>Recomendação de ação</TituloSecao>
          <p className="text-sm">
            {formatarMoeda(valorRecuperavel)} em perdas estão marcadas como recuperáveis.
            {porMotivo[0] && (
              <>
                {' '}
                O maior gargalo do período é <strong>{porMotivo[0].rotulo.toLowerCase()}</strong>,
                que responde por {formatarMoeda(porMotivo[0].valorPerdido)} e pertence à área de{' '}
                <strong>{porMotivo[0].gargalo}</strong>.
              </>
            )}
          </p>
          <p className="text-sm text-bruto-ash mt-2">
            {porMotivo[0]?.motivo === 'ESTOQUE'
              ? 'Perda por estoque não se resolve no comercial. Leve o histórico de demanda para a reunião de compras.'
              : porMotivo[0]?.motivo === 'PRECO'
                ? 'Antes de revisar política de preço, verifique quantas dessas perdas tiveram comparativo item a item pedido. "Preço" costuma esconder prazo ou marca.'
                : porMotivo[0]?.motivo === 'APLICACAO'
                  ? 'Perda por aplicação é falha de diagnóstico. Reforce o uso do Diagnóstico Guiado antes de cotar.'
                  : 'Trate primeiro os clientes reincidentes: eles concentram o valor e o problema é estrutural.'}
          </p>
        </Card>
      )}
    </div>
  );
}
