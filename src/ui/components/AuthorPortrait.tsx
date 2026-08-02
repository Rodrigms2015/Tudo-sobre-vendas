/**
 * Foto de autoria.
 *
 * Regras da Seção 6.1 do PROMPT_MASTER, aplicadas literalmente:
 * — a foto vem de `public/rodrigo-soares.jpg` e NÃO é alterada;
 * — nenhum filtro, duotone ou saturação sobre o rosto;
 * — `object-fit: cover` com `object-position` ajustável;
 * — proporção preservada por contêiner de razão fixa.
 *
 * DEGRADAÇÃO SEM ROSTO: quando o arquivo não existe, o componente exibe um monograma
 * tipográfico no mesmo enquadramento. Nunca uma silhueta, ilustração ou rosto gerado —
 * gerar uma imagem de rosto seria a violação mais direta possível do briefing.
 * Ver docs/CRITICAL_REVIEW.md §1.6.
 *
 * No instante em que o arquivo real for colocado na pasta `public/`, ele passa a ser
 * exibido automaticamente. Nenhuma alteração de código é necessária.
 */

import { useState } from 'react';

export interface AuthorPortraitProps {
  /** Enquadramento vertical. 'center 30%' favorece retratos verticais com rosto no terço superior. */
  objectPosition?: string;
  className?: string;
  /** Proporção do contêiner. 4/5 é o enquadramento de retrato. */
  proporcao?: string;
}

export function AuthorPortrait({
  objectPosition = 'center 30%',
  className = '',
  proporcao = '4 / 5',
}: AuthorPortraitProps) {
  const [falhou, setFalhou] = useState(false);

  return (
    <figure className={`relative overflow-hidden rounded-2xl border border-bruto-steel ${className}`}>
      <div style={{ aspectRatio: proporcao }} className="w-full bg-bruto-graphite">
        {falhou ? (
          <div
            className="h-full w-full flex flex-col items-center justify-center gap-2 select-none"
            role="img"
            aria-label="Retrato de Rodrigo Soares não disponível. Monograma exibido no lugar."
          >
            <span className="text-5xl font-bold tracking-tight text-bruto-yellow" aria-hidden="true">
              RS
            </span>
            <span className="text-[10px] uppercase tracking-widest text-bruto-ash text-center px-4">
              Retrato não incluído no repositório
            </span>
          </div>
        ) : (
          <img
            src="/rodrigo-soares.jpg"
            alt="Rodrigo Soares, idealizador do BRUTO OS"
            className="h-full w-full"
            style={{ objectFit: 'cover', objectPosition }}
            loading="lazy"
            decoding="async"
            onError={() => setFalhou(true)}
          />
        )}
      </div>
    </figure>
  );
}
