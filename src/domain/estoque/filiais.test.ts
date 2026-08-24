/**
 * Reconhecimento da praça pelo nome do arquivo.
 *
 * Errar aqui troca a filial da análise inteira — o estoque de outra praça
 * entra como se fosse o de casa — e nada na tela denuncia. Os nomes destes
 * testes são os dos arquivos reais que o pessoal manda.
 */

import { describe, expect, it } from 'vitest';
import { FILIAIS, distancia, nomeFilial, palavrasDe, reconhecerFilial, ufDaFilial } from './filiais.js';

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
