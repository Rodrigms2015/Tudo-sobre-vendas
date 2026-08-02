/**
 * Utilitários de data. Todas as datas do BRUTO OS são strings ISO (`YYYY-MM-DD`).
 *
 * Motivo: `new Date('2026-03-10')` é interpretado como UTC, enquanto
 * `new Date('2026-03-10T00:00:00')` é interpretado como local. Essa inconsistência
 * produz erros de um dia que corrompem cálculos de cadência. Todas as conversões
 * passam por aqui, sempre em UTC, para eliminar a ambiguidade.
 */

const MS_POR_DIA = 86_400_000;

/** Converte `YYYY-MM-DD` em milissegundos UTC. Aceita também ISO completo. */
export function paraMs(iso: string): number {
  const somenteData = iso.slice(0, 10);
  const [ano, mes, dia] = somenteData.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

/** Converte milissegundos em `YYYY-MM-DD`. */
export function paraIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Diferença em dias inteiros entre duas datas ISO (`ate - de`). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((paraMs(ate) - paraMs(de)) / MS_POR_DIA);
}

export function somarDias(iso: string, dias: number): string {
  return paraIso(paraMs(iso) + dias * MS_POR_DIA);
}

/** Formata para exibição: `10/03/2026`. */
export function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Formata um intervalo de dias em linguagem natural. */
export function formatarDias(dias: number | null): string {
  if (dias === null) return '—';
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 0) return `em ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`;
  return `há ${dias} dias`;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function formatarNumero(valor: number, casas = 0): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}
