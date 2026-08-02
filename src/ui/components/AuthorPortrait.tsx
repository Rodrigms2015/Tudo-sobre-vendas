/**
 * Foto de autoria.
 *
 * Regras da Seção 6.1 do PROMPT_MASTER, aplicadas literalmente:
 * — a foto vem de `public/rodrigo-soares.jpg` e NÃO é alterada;
 * — nenhum filtro, duotone, saturação ou sobreposição sobre o rosto;
 * — `object-fit: cover` com `object-position` ajustável;
 * — proporção preservada por contêiner de razão fixa.
 *
 * O arquivo original tem 1086×1448, ou seja **3:4 exato**. O contêiner usa a mesma razão
 * por padrão, de modo que `cover` não recorta um único pixel — a foto aparece inteira,
 * como foi entregue. Só passe `proporcao` diferente se quiser deliberadamente enquadrar.
 *
 * DEGRADAÇÃO SEM ROSTO: se a imagem não carregar, o componente exibe um monograma
 * tipográfico no mesmo enquadramento. Nunca uma silhueta, ilustração ou rosto gerado —
 * gerar uma imagem de rosto seria a violação mais direta possível do briefing.
 * Ver docs/CRITICAL_REVIEW.md §1.6.
 */

import { useState } from 'react';

export interface AuthorPortraitProps {
  /**
   * Enquadramento quando a razão do contêiner difere da razão da foto.
   * Sem efeito no padrão 3/4, porque não há sobra para deslocar.
   */
  objectPosition?: string;
  className?: string;
  /** Razão do contêiner. O padrão 3/4 é a razão nativa do arquivo — recorte zero. */
  proporcao?: string;
}

export function AuthorPortrait({
  objectPosition = 'center 30%',
  className = '',
  proporcao = '3 / 4',
}: AuthorPortraitProps) {
  const [falhou, setFalhou] = useState(false);

  return (
    <figure className={`relative overflow-hidden rounded-2xl border border-bruto-steel ${className}`}>
      <div style={{ aspectRatio: proporcao }} className="w-full bg-bruto-graphite">
        {falhou ? (
          <div
            className="h-full w-full flex flex-col items-center justify-center gap-2 select-none"
            role="img"
            aria-label="Retrato de Rodrigo Soares indisponível. Monograma exibido no lugar."
          >
            <span className="text-5xl font-bold tracking-tight text-bruto-yellow" aria-hidden="true">
              RS
            </span>
            <span className="text-[10px] uppercase tracking-widest text-bruto-ash text-center px-4">
              Retrato indisponível
            </span>
          </div>
        ) : (
          <img
            src="/rodrigo-soares.jpg"
            alt="Rodrigo Soares, idealizador do BRUTO OS"
            width={1086}
            height={1448}
            className="h-full w-full"
            style={{ objectFit: 'cover', objectPosition }}
            decoding="async"
            onError={() => setFalhou(true)}
          />
        )}
      </div>
    </figure>
  );
}
