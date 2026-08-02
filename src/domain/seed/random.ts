/**
 * PRNG determinístico (mulberry32).
 *
 * O seed do BRUTO OS precisa ser reproduzível: mesma versão do código e mesma data de
 * referência produzem exatamente os mesmos dados. Isso torna os testes estáveis e as
 * demonstrações previsíveis. `Math.random()` tornaria ambos impossíveis.
 */
export class Aleatorio {
  private estado: number;

  constructor(semente: number) {
    this.estado = semente >>> 0;
  }

  /** Float em [0, 1). */
  proximo(): number {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [min, max], inclusivo. */
  inteiro(min: number, max: number): number {
    return Math.floor(this.proximo() * (max - min + 1)) + min;
  }

  /** Float em [min, max). */
  decimal(min: number, max: number): number {
    return this.proximo() * (max - min) + min;
  }

  escolher<T>(itens: readonly T[]): T {
    return itens[this.inteiro(0, itens.length - 1)];
  }

  /** Escolhe `n` itens distintos, preservando determinismo. */
  escolherVarios<T>(itens: readonly T[], n: number): T[] {
    const copia = [...itens];
    const saida: T[] = [];
    const total = Math.min(n, copia.length);
    for (let i = 0; i < total; i++) {
      const idx = this.inteiro(0, copia.length - 1);
      saida.push(copia[idx]);
      copia.splice(idx, 1);
    }
    return saida;
  }

  chance(probabilidade: number): boolean {
    return this.proximo() < probabilidade;
  }
}
