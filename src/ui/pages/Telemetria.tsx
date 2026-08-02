/**
 * Telemetria Comercial.
 *
 * NÃO abre com faturamento. Abre com EXECUÇÃO, porque receita é resultado de execução e
 * não se corrige diretamente. Toda métrica traz uma leitura — número sem leitura é
 * decoração, e decoração é proibida (docs/PRODUCT_VISION.md P7).
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../state/store';
import { calcularTelemetria, formatarMetrica, type Metrica as MetricaTipo } from '../../domain/engine/telemetry';
import { Aviso, Card, EstadoVazio, Rotulo, TituloSecao } from '../components/primitives';
import { BarrasHorizontais } from '../charts';
import { hoje } from '../../domain/dates';

export function Telemetria() {
  const { dados, contextos, settings, temDados, papel } = useApp();
  const referencia = useMemo(() => hoje(), []);

  const telemetria = useMemo(
    () => calcularTelemetria(dados, contextos, settings.sellerAtivoId, referencia),
    [dados, contextos, settings.sellerAtivoId, referencia],
  );

  const temperaturas = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of contextos) {
      mapa.set(c.cadencia.temperatura, (mapa.get(c.cadencia.temperatura) ?? 0) + 1);
    }
    return [
      { rotulo: 'Na janela', valor: mapa.get('JANELA') ?? 0, destaque: true },
      { rotulo: 'No ciclo', valor: mapa.get('NO_CICLO') ?? 0 },
      { rotulo: 'Atrasado', valor: mapa.get('ATRASADO') ?? 0 },
      { rotulo: 'Perda provável', valor: mapa.get('PERDA_PROVAVEL') ?? 0 },
      { rotulo: 'Sem base', valor: mapa.get('SEM_BASE') ?? 0 },
    ];
  }, [contextos]);

  if (!temDados) {
    return (
      <EstadoVazio
        titulo="Nenhuma carteira carregada"
        descricao="A telemetria mede execução sobre dados reais ou de demonstração."
        acao={
          <Link to="/app/dados" className="btn-primario">
            Ir para Dados
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <TituloSecao
        descricao={
          papel === 'GESTOR'
            ? 'Visão de todas as carteiras. Execução primeiro; receita é consequência.'
            : 'Sua execução nos últimos 90 dias. Volume de ligações não é medido em lugar nenhum.'
        }
      >
        Telemetria comercial
      </TituloSecao>

      <Aviso titulo="Como ler este painel">
        Aceitação de recomendações é uma métrica capturável: um motor que só sugere o óbvio atinge
        95%. Por isso ela aparece sempre ao lado de <strong>promessas cumpridas</strong> e{' '}
        <strong>conversão de orçamento</strong>, que são resultados. Aceitação sem resultado é ruído.
      </Aviso>

      <SecaoMetricas
        titulo="Execução"
        descricao="O que você fez. É aqui que se corrige o resultado."
        metricas={telemetria.execucao}
      />

      <SecaoMetricas
        titulo="Qualidade"
        descricao="Como você fez. Mede se a equipe vende solução ou tira pedido."
        metricas={telemetria.qualidade}
      />

      <SecaoMetricas
        titulo="Resultado"
        descricao="O que saiu disso. Consequência da execução, não alavanca direta."
        metricas={telemetria.resultado}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <TituloSecao descricao="Distribuição da carteira por momento de recompra, medido contra a cadência de cada cliente.">
            Situação da carteira
          </TituloSecao>
          <BarrasHorizontais
            dados={temperaturas}
            descricao="Contas por temperatura"
          />
          <p className="text-xs text-bruto-ash mt-3">
            Contas &ldquo;sem base&rdquo; não são um problema do vendedor: elas precisam de mais
            histórico para que o motor tenha algo a dizer. Cada uma vale uma pergunta de cadastro.
          </p>
        </Card>

        <Card className="p-4">
          <TituloSecao descricao="Onde a carteira está perdendo, por valor.">
            Perdas por motivo
          </TituloSecao>
          {telemetria.perdasPorMotivo.length === 0 ? (
            <p className="text-sm text-bruto-ash">
              Nenhuma perda registrada no período. Verifique se o registro está acontecendo —
              perda não registrada é aprendizado perdido.
            </p>
          ) : (
            <>
              <BarrasHorizontais
                dados={telemetria.perdasPorMotivo.map((m) => ({
                  rotulo: `${m.rotulo} (${m.gargalo})`,
                  valor: m.valor,
                }))}
                formato="moeda"
                descricao="Valor perdido por motivo"
              />
              <Link
                to="/app/perdas"
                className="btn-secundario w-full mt-4 !min-h-[40px] text-xs"
              >
                Abrir inteligência de perdas
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function SecaoMetricas({
  titulo,
  descricao,
  metricas,
}: {
  titulo: string;
  descricao: string;
  metricas: MetricaTipo[];
}) {
  return (
    <section>
      <TituloSecao descricao={descricao}>{titulo}</TituloSecao>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metricas.map((m) => (
          <Card key={m.chave} className="p-4">
            <Rotulo>{m.rotulo}</Rotulo>
            <p className="tabular text-3xl font-bold leading-none mt-1">{formatarMetrica(m)}</p>
            <p className="text-xs text-bruto-ash mt-2 leading-relaxed">{m.leitura}</p>
            {m.aviso && (
              <p className="text-xs text-bruto-amber mt-2 leading-relaxed border-t border-bruto-steel pt-2">
                {m.aviso}
              </p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
