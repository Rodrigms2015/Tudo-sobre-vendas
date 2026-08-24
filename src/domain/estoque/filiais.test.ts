/**
 * Reconhecimento da praça pelo nome do arquivo.
 *
 * Errar aqui troca a filial da análise inteira — o estoque de outra praça
 * entra como se fosse o de casa — e nada na tela denuncia. Os nomes destes
 * testes são os dos arquivos reais que o pessoal manda.
 */

import { describe, expect, it } from 'vitest';
import {
  FILIAIS, distancia, nomeFilial, palavrasDe, reconhecerFilial,
  separarMovimentosPorFilial, ufDaFilial,
} from './filiais.js';

const cidade = (ff: string | null) => (ff && FILIAIS[ff] ? FILIAIS[ff][0] : null);

describe('reconhece a praça pelo nome do arquivo', () => {
  it('acerta quando o nome traz a cidade inteira', () => {
    expect(cidade(reconhecerFilial('ESTOQUE_CHAPECO_2408.xls'))).toBe('Chapecó');
    expect(cidade(reconhecerFilial('ESTOQUE_CASCAVEL_2406.xls'))).toBe('Cascavel');
    expect(cidade(reconhecerFilial('ESTOQUE_ITAJAI_2408.xls'))).toBe('Itajaí');
    expect(cidade(reconhecerFilial('ESTOQUE_LONDRINA_2408.xls'))).toBe('Londrina');
    expect(cidade(reconhecerFilial('ESTOQUE_PASSO_FUNDO_21082026.xls'))).toBe('Passo Fundo');
  });

  it('acerta Caxias, que só casa metade do nome da cidade', () => {
    /* "Caxias do Sul" tem duas palavras contáveis e o arquivo traz uma:
       nota 0,5, abaixo do corte de 0,6. Antes disto a página abria o diálogo
       de escolha para um nome que não é ambíguo em filial nenhuma — e num
       lote de cinco arquivos o diálogo travava os quatro seguintes. */
    expect(cidade(reconhecerFilial('ESTOQUE_CAXIAS_2406.xls'))).toBe('Caxias do Sul');
  });

  it('aceita a abreviação que o pessoal digita', () => {
    expect(cidade(reconhecerFilial('ESTOQUE PRES. PRUD 0608.xls'))).toBe('Presidente Prudente');
  });

  it('perdoa erro de digitação de até duas letras', () => {
    /* Caso real: SÃO BERNADO, sem o segundo R. */
    expect(cidade(reconhecerFilial('ESTOQUE SÃO BERNADO.xls'))).toBe('São Bernardo');
  });
});

describe('o endereço da página também diz a praça', () => {
  /* A MESMA página serve as duas centrais. O endereço é o padrão até o
     primeiro arquivo chegar — senão a central de Passo Fundo abre anunciando
     Ribeirão Preto. Ver PRACA_DO_ENDERECO em plataforma/corpo.html. */
  const doEndereco = (h: string) => reconhecerFilial(h.replace(/\./g, ' '));

  it('reconhece a central de cada praça pelo endereço', () => {
    expect(cidade(doEndereco('central-compras-passo-fundo.netlify.app'))).toBe('Passo Fundo');
    expect(cidade(doEndereco('central-compras-ribeirao-preto.netlify.app'))).toBe('Ribeirão Preto');
  });

  it('endereço que não nomeia praça não decide nada', () => {
    /* Cai no padrão histórico de quem chama, e não num palpite. */
    expect(doEndereco('bruto-os.netlify.app')).toBeNull();
    expect(doEndereco('localhost')).toBeNull();
    expect(doEndereco('')).toBeNull();
  });
});

describe('quando há dúvida, não chuta', () => {
  it('recusa a palavra que está em duas cidades', () => {
    /* PRETO está em Ribeirão Preto e em São José do Rio Preto. */
    expect(reconhecerFilial('ESTOQUE PRETO.xls')).toBeNull();
    expect(reconhecerFilial('ESTOQUE RIO PRETO.xls')).toBeNull();
  });

  it('recusa nome que não diz cidade nenhuma', () => {
    expect(reconhecerFilial('ESTOQUE 2408.xls')).toBeNull();
    expect(reconhecerFilial('relatorio geral.xls')).toBeNull();
    expect(reconhecerFilial('')).toBeNull();
    expect(reconhecerFilial(null)).toBeNull();
  });

  it('a palavra curta não decide sozinha', () => {
    /* SAO e RIO aparecem em várias praças; três letras não bastam. */
    expect(reconhecerFilial('ESTOQUE SAO.xls')).toBeNull();
    expect(reconhecerFilial('ESTOQUE RIO.xls')).toBeNull();
  });

  it('mas o palpite frouxo sugere, para o diálogo já vir marcado', () => {
    /* Sugerir não é decidir: quem pergunta continua perguntando, só que com
       a opção provável em cima em vez de "é o estoque de casa mesmo" — que é
       a opção que SUBSTITUI o estoque de casa. */
    expect(cidade(reconhecerFilial('ESTOQUE RIO PRETO.xls', true))).not.toBeNull();
    expect(reconhecerFilial('ESTOQUE 2408.xls', true)).toBeNull();
  });
});

describe('a tabela de filiais e seus nomes', () => {
  it('devolve nome e UF de quem existe', () => {
    expect(nomeFilial('37')).toBe('Passo Fundo');
    expect(ufDaFilial('37')).toBe('RS');
    expect(nomeFilial('3')).toBe('Ribeirão Preto');
  });

  it('não inventa nome para código desconhecido', () => {
    expect(nomeFilial('99')).toBe('filial 99');
    expect(ufDaFilial('99')).toBeNull();
  });
});

describe('as peças da comparação', () => {
  it('separa palavras de três letras ou mais, sem acento e sem número', () => {
    expect(palavrasDe('ESTOQUE_SÃO JOSÉ do Rio Preto_2408')).toEqual(
      ['ESTOQUE', 'SAO', 'JOSE', 'RIO', 'PRETO'],
    );
  });

  it('a distância para de contar quando passa do teto', () => {
    expect(distancia('BERNADO', 'BERNARDO', 2)).toBe(1);
    expect(distancia('LONDRINA', 'CASCAVEL', 2)).toBeGreaterThan(2);
  });
});

describe('de quem é a venda do relatório de movimentação', () => {
  const mov = (filial: string, produto = '0040002815') => ({ filial, produto });

  it('a filial com mais lançamentos é a dona do recorte', () => {
    /* Medido nos arquivos reais: cada relatório vem de uma praça só —
       Cascavel 12.992 lançamentos com FI 29, Londrina 21.531 com FI 13. */
    const r = separarMovimentosPorFilial([mov('13'), mov('13'), mov('09')]);
    expect(r.principal).toBe('13');
    expect(r.filiais).toEqual([{ ff: '13', lancamentos: 2 }, { ff: '09', lancamentos: 1 }]);
  });

  it('guarda as outras filiais em vez de descartá-las', () => {
    /* Venda que saiu por outra praça é sinal, não lixo. */
    const r = separarMovimentosPorFilial([mov('37'), mov('13')]);
    expect(r.porFilial.get('13')).toHaveLength(1);
  });

  it('completa o código de um dígito só', () => {
    expect(separarMovimentosPorFilial([mov('9')]).principal).toBe('09');
  });

  it('lançamento sem filial não vira filial 00', () => {
    /* `00` é um código que poderia existir. Inventar código é pior que
       assumir a ausência. */
    const r = separarMovimentosPorFilial([mov(''), mov('')]);
    expect(r.principal).toBeNull();
    expect(r.porFilial.get('')).toHaveLength(2);
  });

  it('lista vazia não inventa dona', () => {
    expect(separarMovimentosPorFilial([]).principal).toBeNull();
    expect(separarMovimentosPorFilial(null).principal).toBeNull();
  });
});
