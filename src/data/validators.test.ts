import { describe, expect, it } from 'vitest';
import { deCsv } from './csv';
import {
  contextoDe,
  sanearTexto,
  validarClientes,
  validarEntidade,
  validarPerdas,
  validarVendas,
} from './validators';
import { dataset, cliente } from '../test/fixtures';

const ctx = contextoDe(dataset({ customers: [cliente()] }));

function linhasDe(csv: string) {
  return deCsv(csv).linhas;
}

describe('sanearTexto', () => {
  it('remove caracteres de controle', () => {
    expect(sanearTexto('a\u0000b\u001Fc')).toBe('a b c');
  });

  it('trunca no limite informado', () => {
    expect(sanearTexto('a'.repeat(600)).length).toBe(500);
    expect(sanearTexto('a'.repeat(600), 10).length).toBe(10);
  });

  it('preserva acentuação e pontuação legítima do setor', () => {
    expect(sanearTexto('Viação Serra Azul — frota 24/7')).toBe('Viação Serra Azul — frota 24/7');
  });
});

describe('importação parcial', () => {
  it('aceita as linhas válidas e rejeita apenas as inválidas', () => {
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      'cli-a,Alfa,Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,3,',
      'cli-b,,Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,3,',
      'cli-c,Gama,Curitiba,PR,CARGA_RODOVIARIA,FROTISTA,vnd-001,4,',
    ].join('\n');

    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.aceitos).toHaveLength(2);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0].campo).toBe('nomeFantasia');
  });

  it('reporta o número da linha real do arquivo, contando o cabeçalho', () => {
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      'cli-a,Alfa,Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,3,',
      'cli-b,Beta,Campinas,,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,3,',
    ].join('\n');

    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0].campo).toBe('uf');
    expect(r.erros[0].linha).toBe(3);
  });
});

describe('validação de clientes', () => {
  it('rejeita segmento fora da lista', () => {
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      'cli-a,Alfa,Campinas,SP,SEGMENTO_INVENTADO,TRANSPORTADORA,vnd-001,3,',
    ].join('\n');
    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.aceitos).toHaveLength(0);
    expect(r.erros[0].campo).toBe('segmento');
  });

  it('rejeita vendedor inexistente na base', () => {
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      'cli-a,Alfa,Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-999,3,',
    ].join('\n');
    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.erros[0].campo).toBe('sellerId');
  });

  it('rejeita potencial fora da faixa 1 a 5', () => {
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      'cli-a,Alfa,Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,9,',
    ].join('\n');
    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.erros[0].campo).toBe('potencial');
  });

  it('marca os importados com origem IMPORTADO, distinguindo-os da demonstração', () => {
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      'cli-a,Alfa,Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,3,',
    ].join('\n');
    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.aceitos[0].origem).toBe('IMPORTADO');
  });

  it('aceita potencial vazio como ausência, não como zero', () => {
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      'cli-a,Alfa,Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,,',
    ].join('\n');
    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.aceitos[0].potencial).toBeNull();
  });
});

describe('validação de vendas', () => {
  it('rejeita chave estrangeira inexistente', () => {
    const csv = ['id,customerId,data,valorTotal,margemPercentual', 'v1,cli-inexistente,2026-01-01,1000,15'].join('\n');
    const r = validarVendas(linhasDe(csv), ctx);
    expect(r.erros[0].campo).toBe('customerId');
  });

  it('rejeita data fora do formato ISO', () => {
    const csv = ['id,customerId,data,valorTotal,margemPercentual', 'v1,cli-t01,01/01/2026,1000,15'].join('\n');
    const r = validarVendas(linhasDe(csv), ctx);
    expect(r.erros.some((e) => e.campo === 'data')).toBe(true);
  });

  it('rejeita valor negativo', () => {
    const csv = ['id,customerId,data,valorTotal,margemPercentual', 'v1,cli-t01,2026-01-01,-500,15'].join('\n');
    const r = validarVendas(linhasDe(csv), ctx);
    expect(r.erros.some((e) => e.campo === 'valorTotal')).toBe(true);
  });

  it('aceita margem vazia como null — nunca assume uma média', () => {
    const csv = ['id,customerId,data,valorTotal,margemPercentual', 'v1,cli-t01,2026-01-01,1000,'].join('\n');
    const r = validarVendas(linhasDe(csv), ctx);
    expect(r.aceitos[0].margemPercentual).toBeNull();
  });

  it('aceita vírgula decimal, comum em exportação brasileira', () => {
    const csv = ['id,customerId,data,valorTotal,margemPercentual', 'v1,cli-t01,2026-01-01,1000,"18,5"'].join('\n');
    const r = validarVendas(linhasDe(csv), ctx);
    expect(r.aceitos[0].margemPercentual).toBe(18.5);
  });
});

describe('validação de perdas', () => {
  it('rejeita motivo fora da taxonomia', () => {
    const csv = [
      'id,customerId,data,motivo,valorEstimado,familyId,recuperavel,detalhe',
      'p1,cli-t01,2026-01-01,MOTIVO_QUALQUER,1000,,sim,',
    ].join('\n');
    const r = validarPerdas(linhasDe(csv), ctx);
    expect(r.erros[0].campo).toBe('motivo');
  });

  it('rejeita família inexistente', () => {
    const csv = [
      'id,customerId,data,motivo,valorEstimado,familyId,recuperavel,detalhe',
      'p1,cli-t01,2026-01-01,ESTOQUE,1000,fam-999,sim,',
    ].join('\n');
    const r = validarPerdas(linhasDe(csv), ctx);
    expect(r.erros[0].campo).toBe('familyId');
  });

  it('interpreta booleano em português', () => {
    const csv = [
      'id,customerId,data,motivo,valorEstimado,familyId,recuperavel,detalhe',
      'p1,cli-t01,2026-01-01,ESTOQUE,1000,fam-03,sim,',
      'p2,cli-t01,2026-01-02,PRECO,900,fam-03,nao,',
    ].join('\n');
    const r = validarPerdas(linhasDe(csv), ctx);
    expect(r.aceitos[0].recuperavel).toBe(true);
    expect(r.aceitos[1].recuperavel).toBe(false);
  });
});

describe('robustez contra arquivo hostil', () => {
  it('não quebra com CSV totalmente vazio', () => {
    const r = validarClientes(linhasDe(''), ctx);
    expect(r.aceitos).toHaveLength(0);
    expect(r.erros).toHaveLength(0);
  });

  it('não quebra com colunas completamente diferentes do esperado', () => {
    const csv = 'coluna_estranha,outra\nvalor,outro\n';
    expect(() => validarClientes(linhasDe(csv), ctx)).not.toThrow();
    expect(validarClientes(linhasDe(csv), ctx).aceitos).toHaveLength(0);
  });

  it('trunca campo absurdamente longo em vez de aceitar', () => {
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      `cli-a,${'A'.repeat(5000)},Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,3,`,
    ].join('\n');
    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.aceitos[0].nomeFantasia.length).toBe(500);
  });

  it('rejeita identificador com caracteres de caminho', () => {
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      '../../etc/passwd,Alfa,Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,3,',
    ].join('\n');
    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.aceitos).toHaveLength(0);
    expect(r.erros[0].campo).toBe('id');
  });

  it('preserva conteúdo de fórmula na base, neutralizando só na exportação', () => {
    // A base guarda o que o ERP mandou; a neutralização acontece em sanitizeCsvCell.
    const csv = [
      'id,nomeFantasia,cidade,uf,segmento,tipoCliente,sellerId,potencial,observacoes',
      'cli-a,Alfa,Campinas,SP,CARGA_RODOVIARIA,TRANSPORTADORA,vnd-001,3,=SOMA(A1)',
    ].join('\n');
    const r = validarClientes(linhasDe(csv), ctx);
    expect(r.aceitos[0].observacoes).toBe('=SOMA(A1)');
  });
});

describe('validarEntidade', () => {
  it('roteia para o validador correto de cada entidade', () => {
    const csv = ['id,customerId,data,valorTotal,margemPercentual', 'v1,cli-t01,2026-01-01,1000,15'].join('\n');
    const r = validarEntidade('sales', linhasDe(csv), ctx);
    expect(r.entidade).toBe('sales');
    expect(r.resultado.aceitos).toHaveLength(1);
  });
});
