/**
 * Card ANDON.
 *
 * Os seis campos narrativos (o que aconteceu, por que importa, impacto, ação, responsável,
 * prazo) são obrigatórios pelo tipo `Alert`. Um alerta sem ação sugerida não pode ser
 * construído — o sistema não tem o direito de interromper o vendedor se não sabe o que
 * pedir a ele. Ver docs/SCORING_ENGINE.md §6.3.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Alert } from '../../domain/types';
import { ROTULO_TIPO_ALERTA } from '../../domain/types';
import { formatarData, formatarMoeda } from '../../domain/dates';
import { FaixaAndon, Rotulo, SeloSeveridade } from './primitives';
import { useApp } from '../../state/store';

export function CardAlerta({ alerta, compacto = false }: { alerta: Alert; compacto?: boolean }) {
  const { contextoPorCliente, reconhecerAlerta } = useApp();
  const [reconhecendo, setReconhecendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [feito, setFeito] = useState(false);

  const cliente = contextoPorCliente.get(alerta.customerId)?.customer;

  if (feito) {
    return (
      <FaixaAndon severidade="INFORMACAO">
        <p className="text-sm">
          Alerta reconhecido. Não retorna pela mesma causa nos próximos 7 dias.
        </p>
      </FaixaAndon>
    );
  }

  return (
    <FaixaAndon severidade={alerta.severidade}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SeloSeveridade valor={alerta.severidade} />
          <p className="text-[11px] uppercase tracking-wider text-bruto-ash mt-0.5">
            {ROTULO_TIPO_ALERTA[alerta.tipo]}
          </p>
        </div>
        {alerta.impactoEstimado > 0 && (
          <div className="text-right shrink-0">
            <div className="tabular font-bold">{formatarMoeda(alerta.impactoEstimado)}</div>
            <div className="text-[10px] text-bruto-ash uppercase tracking-wide">impacto est.</div>
          </div>
        )}
      </div>

      <p className="mt-2 text-[15px] leading-snug">{alerta.oQueAconteceu}</p>

      {!compacto && (
        <>
          <p className="mt-2 text-sm text-bruto-ash">{alerta.porQueImporta}</p>

          {alerta.contextoAdicional.length > 0 && (
            <div className="mt-3">
              <Rotulo>Também nesta conta</Rotulo>
              <ul className="mt-1 space-y-1">
                {alerta.contextoAdicional.map((c) => (
                  <li key={c} className="text-sm text-bruto-ash flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {alerta.lacunas.length > 0 && (
            <ul className="mt-3 space-y-1">
              {alerta.lacunas.map((l) => (
                <li key={l} className="text-sm text-bruto-ash flex gap-2">
                  <span aria-hidden="true" className="text-bruto-ash/60">
                    ○
                  </span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div
        className={`mt-3 rounded-lg bg-bruto-black/60 border border-bruto-steel ${compacto ? 'p-2.5' : 'p-3'}`}
      >
        <Rotulo>Ação sugerida</Rotulo>
        <p className="text-sm mt-1">{alerta.acaoSugerida}</p>
        {!compacto && alerta.proximaPergunta && (
          <p className="text-sm text-bruto-yellow mt-1.5">Pergunte: {alerta.proximaPergunta}</p>
        )}
        <p className="text-xs text-bruto-ash mt-2 tabular">
          Prazo: {formatarData(alerta.prazo)}
          {!compacto && ` · Responsável: ${alerta.responsavel}`}
        </p>
      </div>

      {!reconhecendo ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {cliente && (
            <Link
              to={`/app/cliente/${cliente.id}?preparar=1`}
              className="btn-primario flex-1 min-w-[150px] overflow-hidden"
            >
              <span className="truncate">Abrir {cliente.nomeFantasia}</span>
            </Link>
          )}
          <button className="btn-secundario" onClick={() => setReconhecendo(true)}>
            Reconhecer
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <label htmlFor={`ack-${alerta.id}`} className="rotulo block">
            Motivo do reconhecimento
          </label>
          <input
            id={`ack-${alerta.id}`}
            className="campo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: já falei com o cliente hoje"
          />
          <div className="flex gap-2">
            <button
              className="btn-secundario flex-1"
              disabled={motivo.trim().length === 0}
              onClick={async () => {
                await reconhecerAlerta(alerta, motivo.trim());
                setFeito(true);
              }}
            >
              Confirmar
            </button>
            <button className="btn-fantasma" onClick={() => setReconhecendo(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </FaixaAndon>
  );
}
