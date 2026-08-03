(function () {
  'use strict';

  // =========================================================================
  // Constantes fiscais
  // =========================================================================

  var UFS = [
    ['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],
    ['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],
    ['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],
    ['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],
    ['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],
    ['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],
    ['SE','Sergipe'],['TO','Tocantins']
  ];

  // A partir desta data autopeças deixam a ST em São Paulo (Portaria SRE 34/2026).
  var FIM_ST_AUTOPECAS = '2026-10-01';

  // Protocolo ICMS 41/2008 — autopeças. Só quem é signatário junto com SP retém
  // a ST na nota; vindo dos demais, quem recolhe é o comprador paulista, na
  // entrada, pelo artigo 426-A do RICMS-SP. A lista tem rotatividade: Goiás
  // denunciou o protocolo em 2017 e o Rio Grande do Sul saiu em 01/11/2024.
  // Por isso 'confirmar' é um estado legítimo — melhor pedir conferência do
  // que afirmar errado.
  var PROTOCOLO_ST = {
    AL: 'sim', AP: 'sim', AM: 'sim', BA: 'sim', DF: 'sim', ES: 'sim',
    MA: 'sim', MG: 'sim', MT: 'sim', PA: 'sim', PI: 'sim', PR: 'sim',
    RJ: 'sim', SC: 'sim', SP: 'sim',
    GO: 'saiu', RS: 'saiu',
    AC: 'confirmar', CE: 'confirmar', MS: 'confirmar', PB: 'confirmar',
    PE: 'confirmar', RN: 'confirmar', RO: 'confirmar', RR: 'confirmar',
    SE: 'confirmar', TO: 'confirmar'
  };

  var NCM_COMUNS = [
    ['8708.30.90', 'Freios e servo-freios, outras partes'],
    ['8708.30.11', 'Guarnições de freios montadas'],
    ['8708.80.00', 'Amortecedores de suspensão'],
    ['8708.50.99', 'Eixos e suas partes'],
    ['8708.93.00', 'Embreagens e suas partes'],
    ['8708.99.90', 'Outras partes e acessórios de veículos'],
    ['8409.99.99', 'Partes de motores diesel'],
    ['8421.23.00', 'Filtros de óleo e de combustível'],
    ['8421.31.00', 'Filtros de ar de admissão'],
    ['8511.40.00', 'Motores de arranque'],
    ['8511.50.10', 'Alternadores'],
    ['8507.10.00', 'Baterias de chumbo para arranque'],
    ['4011.20.90', 'Pneus novos para ônibus e caminhões'],
    ['8482.10.10', 'Rolamentos de esferas'],
    ['8483.40.10', 'Caixas de transmissão e redutores']
  ];

  // =========================================================================
  // Classificação por CNAE — sugestão, nunca afirmação
  // =========================================================================

  // Casos específicos da linha pesada, verificados antes da divisão.
  var CNAE_ESPECIFICOS = [
    ['1071', 'CF_CONTRIBUINTE', 'alta', 'Usina de açúcar. Compra peça para manutenção do próprio parque.'],
    ['1072', 'CF_CONTRIBUINTE', 'alta', 'Refino de açúcar. Consumidor final com inscrição estadual.'],
    ['1931', 'CF_CONTRIBUINTE', 'alta', 'Usina de álcool. Consumidor final com inscrição estadual.'],
    ['0113', 'CF_CONTRIBUINTE', 'alta', 'Cultivo de cana-de-açúcar. Produtor rural costuma ter inscrição estadual.'],
    ['4930', 'CF_CONTRIBUINTE', 'alta', 'Transporte rodoviário de carga. Frota própria, peça para uso e consumo.'],
    ['4921', 'CF_CONTRIBUINTE', 'alta', 'Transporte de passageiros. Frota própria.'],
    ['4922', 'CF_CONTRIBUINTE', 'alta', 'Transporte de passageiros. Frota própria.'],
    ['4923', 'CF_CONTRIBUINTE', 'media', 'Táxi e transporte sob demanda. Confirme a inscrição estadual.'],
    ['4924', 'CF_CONTRIBUINTE', 'alta', 'Transporte escolar. Frota própria.'],
    ['4929', 'CF_CONTRIBUINTE', 'alta', 'Transporte terrestre de passageiros. Frota própria.'],
    ['4530', 'REVENDA', 'alta', 'Comércio de peças e acessórios para veículos. É revenda.'],
    ['4520', 'CF_CONTRIBUINTE', 'media', 'Manutenção e reparação de veículos. Se a oficina revende peça, marque revenda.'],
    ['4511', 'REVENDA', 'media', 'Comércio de veículos. Confirme se a peça é para revenda ou para a oficina.'],
    ['4541', 'REVENDA', 'alta', 'Comércio de peças para motocicletas. É revenda.'],
    ['4543', 'CF_CONTRIBUINTE', 'media', 'Manutenção de motocicletas.'],
    ['4211', 'CF_NAO_CONTRIBUINTE', 'alta', 'Construção de rodovias. Construtora não é contribuinte de ICMS em SP.'],
    ['4212', 'CF_NAO_CONTRIBUINTE', 'alta', 'Construção de obras de arte. Construtora não é contribuinte de ICMS.'],
    ['4213', 'CF_NAO_CONTRIBUINTE', 'alta', 'Obras de urbanização. Construtora não é contribuinte de ICMS.'],
    ['4291', 'CF_NAO_CONTRIBUINTE', 'alta', 'Obras portuárias e de barragens. Construtora não é contribuinte de ICMS.'],
    ['7711', 'CF_NAO_CONTRIBUINTE', 'alta', 'Locação de automóveis. Locadora não é contribuinte de ICMS.'],
    ['7719', 'CF_NAO_CONTRIBUINTE', 'alta', 'Locação de meios de transporte. Não é contribuinte de ICMS.'],
    ['7732', 'CF_NAO_CONTRIBUINTE', 'alta', 'Locação de máquinas para construção. Não é contribuinte de ICMS.'],
    ['0810', 'CF_CONTRIBUINTE', 'alta', 'Extração de pedra e areia. Frota e equipamento próprios.'],
    ['0710', 'CF_CONTRIBUINTE', 'alta', 'Extração de minério de ferro. Frota e equipamento próprios.'],
    ['3811', 'CF_NAO_CONTRIBUINTE', 'media', 'Coleta de resíduos. Costuma ser prestador de serviço sem inscrição estadual.'],
    ['3821', 'CF_NAO_CONTRIBUINTE', 'media', 'Tratamento de resíduos. Confirme a inscrição estadual.']
  ];

  function classificarCnae(cnae) {
    if (!cnae && cnae !== 0) return null;
    var s = String(cnae).replace(/\D/g, '');
    while (s.length < 7) s = '0' + s;
    var quatro = s.slice(0, 4);
    var i;
    for (i = 0; i < CNAE_ESPECIFICOS.length; i++) {
      if (CNAE_ESPECIFICOS[i][0] === quatro) {
        return { perfil: CNAE_ESPECIFICOS[i][1], confianca: CNAE_ESPECIFICOS[i][2], motivo: CNAE_ESPECIFICOS[i][3] };
      }
    }
    var div = parseInt(s.slice(0, 2), 10);
    if (div >= 46 && div <= 47) return { perfil: 'REVENDA', confianca: 'media', motivo: 'Comércio atacadista ou varejista. Provavelmente compra para revender.' };
    if (div >= 1 && div <= 3)   return { perfil: 'CF_CONTRIBUINTE', confianca: 'media', motivo: 'Agropecuária. Produtor rural costuma ter inscrição estadual.' };
    if (div >= 5 && div <= 9)   return { perfil: 'CF_CONTRIBUINTE', confianca: 'media', motivo: 'Indústria extrativa. Tem inscrição estadual e frota própria.' };
    if (div >= 10 && div <= 33) return { perfil: 'CF_CONTRIBUINTE', confianca: 'media', motivo: 'Indústria de transformação. Tem inscrição estadual; peça entra como uso e consumo.' };
    if (div === 35)             return { perfil: 'CF_CONTRIBUINTE', confianca: 'baixa', motivo: 'Energia elétrica. Confirme a inscrição estadual.' };
    if (div >= 41 && div <= 43) return { perfil: 'CF_NAO_CONTRIBUINTE', confianca: 'alta', motivo: 'Construção civil. Não é contribuinte de ICMS em SP.' };
    if (div === 45)             return { perfil: 'CF_CONTRIBUINTE', confianca: 'baixa', motivo: 'Comércio e reparação de veículos. Confirme se é revenda.' };
    if (div >= 49 && div <= 51) return { perfil: 'CF_CONTRIBUINTE', confianca: 'media', motivo: 'Transporte. Prestador de transporte interestadual é contribuinte de ICMS.' };
    if (div === 61)             return { perfil: 'CF_CONTRIBUINTE', confianca: 'baixa', motivo: 'Telecomunicações. É contribuinte de ICMS sobre comunicação.' };
    if (div === 84)             return { perfil: 'CF_NAO_CONTRIBUINTE', confianca: 'alta', motivo: 'Administração pública. Não é contribuinte de ICMS.' };
    return { perfil: 'CF_NAO_CONTRIBUINTE', confianca: 'baixa', motivo: 'Atividade de serviço. Provavelmente sem inscrição estadual — confirme antes de faturar.' };
  }

  // =========================================================================
  // Motor de cálculo
  // =========================================================================

  function calcular(e) {
    var r = { entradas: e, fatores: [], avisos: [] };

    // Uma alíquota de 100% zeraria o divisor (1 - interna) e faria a conta
    // explodir em infinito. Nenhuma alíquota real chega perto disso.
    var interna = Math.min(Math.max(e.aliquotaInterna, 0), 0.9);
    r.internaLimitada = interna !== e.aliquotaInterna;

    var operacaoInterna = e.uf === 'SP';
    var ai = operacaoInterna ? interna : (e.importada ? 0.04 : 0.12);
    r.aliquotaOrigem = ai;
    r.operacaoInterna = operacaoInterna;

    if (r.internaLimitada) {
      r.avisos.push({
        tipo: 'aviso',
        texto: 'A alíquota interna foi limitada a 90% para a conta não estourar. Em São Paulo a alíquota geral é 18%.'
      });
    }

    var liquido = Math.max(0, e.valor - e.desconto);
    var ipi = liquido * e.ipiPercentual;
    var freteNaNota = e.freteCif ? e.frete : 0;
    var acessorias = freteNaNota + e.seguro + e.outras;

    // O IPI só fica fora da base do ICMS quando a operação é entre contribuintes
    // e a mercadoria vai para industrialização ou comercialização (LC 87/96, art. 13).
    var ipiNaBase = e.perfil !== 'REVENDA';
    var bc = liquido + acessorias + (ipiNaBase ? ipi : 0);

    r.liquido = liquido;
    r.ipi = ipi;
    r.freteNaNota = freteNaNota;
    r.acessorias = acessorias;
    r.baseIcms = bc;
    r.ipiNaBase = ipiNaBase;

    // ICMS próprio. O optante pelo Simples não destaca, mas o valor teórico
    // continua sendo o que se deduz no cálculo da ST.
    r.icmsProprioTeorico = bc * ai;
    r.icmsProprio = e.simples ? 0 : r.icmsProprioTeorico;

    // --- Substituição tributária -----------------------------------------
    var stVigente = e.data < FIM_ST_AUTOPECAS;
    r.stVigente = stVigente;
    r.icmsSt = 0;
    r.baseSt = 0;
    r.ivaAjustado = 0;
    r.stAplica = false;

    if (e.perfil === 'REVENDA' && e.temST && e.retemST && stVigente && !operacaoInterna) {
      r.stAplica = true;
      // Convênio ICMS 35/2011: remetente do Simples usa a MVA original, sem ajuste.
      r.ivaAjustado = e.simples
        ? e.iva
        : ((1 + e.iva) * (1 - ai) / (1 - interna)) - 1;
      // O frete compõe a base da ST mesmo quando é FOB, porque a ST alcança
      // toda a cadeia até o consumidor.
      r.baseSt = (liquido + e.frete + e.seguro + e.outras + ipi) * (1 + r.ivaAjustado);
      r.icmsSt = Math.max(0, r.baseSt * interna - r.icmsProprioTeorico);
    } else if (e.perfil === 'REVENDA' && e.temST && !stVigente) {
      r.avisos.push({
        tipo: 'ok',
        texto: 'Nesta data autopeças já saíram da substituição tributária em São Paulo. Não há ICMS-ST a reter: o cliente passa a apurar o ICMS normalmente na revenda dele.'
      });
    } else if (e.perfil === 'REVENDA' && e.temST && !e.retemST && stVigente && !operacaoInterna) {
      // Sem protocolo, o remetente não retém: quem paga é o comprador paulista,
      // na entrada da mercadoria (art. 426-A do RICMS-SP).
      r.antecipacao426A = true;
      r.avisos.push({
        tipo: 'aviso',
        texto: 'O estado de origem não tem protocolo de ST com São Paulo. Você não retém nada na nota — mas o seu cliente vai pagar a antecipação do artigo 426-A na entrada da mercadoria. Avise antes de fechar, porque para o bolso dele o custo é praticamente o mesmo.'
      });
    }

    // --- DIFAL ------------------------------------------------------------
    r.difal = 0;
    r.difalTipo = null;
    r.difalResponsavel = null;
    r.difalNaNota = false;

    if (!operacaoInterna && e.perfil === 'CF_CONTRIBUINTE') {
      if (e.baseDupla) {
        var bcDestC = (bc - r.icmsProprioTeorico) / (1 - interna);
        r.difal = bcDestC * interna - r.icmsProprioTeorico;
        r.difalTipo = 'base dupla';
        r.baseDifal = bcDestC;
      } else {
        r.difal = bc * (interna - ai);
        r.difalTipo = 'base única';
        r.baseDifal = bc;
      }
      // Diferencial de alíquotas nunca é negativo: se a alíquota interna de SP
      // for menor ou igual à interestadual, simplesmente não há o que recolher.
      if (r.difal <= 0) {
        r.difal = 0;
        r.difalTipo = null;
        r.difalResponsavel = null;
        r.avisos.push({
          tipo: 'ok',
          texto: 'A alíquota interna de São Paulo não é maior que a interestadual nesta operação, então não há diferencial a recolher. Confira se a alíquota interna que você informou é mesmo a do produto.'
        });
      } else if (e.temST && e.retemST && stVigente) {
        // Protocolo ICMS 41/2008: mercadoria em ST destinada a uso e consumo de
        // contribuinte tem o diferencial retido pelo remetente, dentro da nota.
        r.difalResponsavel = 'remetente';
        r.difalNaNota = true;
        r.avisos.push({
          tipo: 'aviso',
          texto: 'A peça está na substituição tributária e o cliente é contribuinte comprando para uso e consumo. Pelo Protocolo ICMS 41/2008 quem retém o diferencial é você, na própria nota, no lugar do ICMS-ST comum. Confirme se o seu estado é signatário do protocolo com SP.'
        });
      } else {
        r.difalResponsavel = 'cliente';
      }
    }

    if (!operacaoInterna && e.perfil === 'CF_NAO_CONTRIBUINTE') {
      if (e.simples) {
        r.difal = 0;
        r.difalTipo = 'não exigido';
        r.difalResponsavel = null;
        r.avisos.push({
          tipo: 'ok',
          texto: 'Quem vende é do Simples Nacional. O STF, na ADI 5464, afastou a cobrança do DIFAL da Emenda 87 do remetente optante. Não há DIFAL nesta operação.'
        });
      } else {
        // Base dupla da LC 190/2022: o ICMS de destino é calculado por dentro.
        var icmsOrigem = bc * ai;
        var bcDest = (bc - icmsOrigem) / (1 - interna);
        r.baseDifal = bcDest;
        r.difal = bcDest * interna - icmsOrigem;
        if (r.difal <= 0) {
          r.difal = 0;
          r.difalTipo = null;
          r.difalResponsavel = null;
          r.avisos.push({
            tipo: 'ok',
            texto: 'A alíquota interna de São Paulo não é maior que a interestadual nesta operação, então não há diferencial a recolher. Confira se a alíquota interna que você informou é mesmo a do produto.'
          });
        } else {
          r.difalTipo = 'base dupla';
          r.difalResponsavel = 'remetente';
        }
      }
    }

    if (operacaoInterna) {
      r.avisos.push({
        tipo: 'info',
        texto: 'Origem e destino em São Paulo. Não há alíquota interestadual nem DIFAL: aplica-se a alíquota interna direto. A página também não calcula ST aqui, porque na venda entre empresas paulistas a peça normalmente já veio com o imposto retido lá atrás. Se quem emite a nota é o fabricante ou o importador, aí sim há ST a reter.'
      });
    }

    // --- Totais -----------------------------------------------------------
    r.totalNota = liquido + freteNaNota + e.seguro + e.outras + ipi + r.icmsSt
                + (r.difalNaNota ? r.difal : 0);

    // O que o cliente desembolsa no total, dentro e fora da nota.
    r.custoCliente = r.totalNota
                   + (r.difalResponsavel === 'cliente' ? r.difal : 0);

    // Custo do remetente: o DIFAL de não contribuinte sai do bolso de quem vende.
    r.custoRemetente = (e.perfil === 'CF_NAO_CONTRIBUINTE' && r.difalResponsavel === 'remetente') ? r.difal : 0;

    // Preço que devolve a margem quando o DIFAL é seu.
    r.precoRecomposto = null;
    if (r.custoRemetente > 0) {
      var k = (1 - ai) * interna / (1 - interna) - ai;
      if (k < 1) r.precoRecomposto = e.valor / (1 - k);
      r.fatorRecomposicao = k;
    }

    r.impostoTotal = (e.simples ? 0 : r.icmsProprio) + r.icmsSt + r.difal;
    r.cargaSobreProduto = liquido > 0 ? r.impostoTotal / liquido : 0;

    return r;
  }

  // =========================================================================
  // Utilidades
  // =========================================================================

  var $ = function (id) { return document.getElementById(id); };

  function moeda(v) {
    return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function pct(v, casas) {
    return (v * 100).toLocaleString('pt-BR', {
      minimumFractionDigits: casas === undefined ? 2 : casas,
      maximumFractionDigits: casas === undefined ? 2 : casas
    }) + '%';
  }
  function num(id) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? 0 : v;
  }
  function el(tag, texto, classe) {
    var n = document.createElement(tag);
    if (texto !== undefined && texto !== null) n.textContent = texto;
    if (classe) n.className = classe;
    return n;
  }
  function limpar(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function apenasDigitos(s) { return (s || '').replace(/\D/g, ''); }

  function formatarCnpj(s) {
    var d = apenasDigitos(s).slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return d.slice(0, 2) + '.' + d.slice(2);
    if (d.length <= 8) return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5);
    if (d.length <= 12) return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8);
    return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8, 12) + '-' + d.slice(12);
  }

  function cnpjValido(s) {
    var c = apenasDigitos(s);
    if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
    var calc = function (base) {
      var soma = 0, peso = base.length - 7, i;
      for (i = 0; i < base.length; i++) {
        soma += parseInt(base.charAt(i), 10) * peso;
        peso = peso - 1 < 2 ? 9 : peso - 1;
      }
      var resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    return calc(c.slice(0, 12)) === parseInt(c.charAt(12), 10) &&
           calc(c.slice(0, 13)) === parseInt(c.charAt(13), 10);
  }

  // =========================================================================
  // Estado da página
  // =========================================================================

  var perfilSugerido = null;
  var perfilTocadoPeloUsuario = false;
  var retemTocado = false;
  var ultimoResultado = null;
  var dadosCnpj = null;

  function lerEntradas() {
    var presetIva = $('ivaPreset').value;
    if (presetIva !== 'custom') $('iva').value = presetIva;
    return {
      perfil: document.querySelector('input[name="perfil"]:checked').value,
      valor: num('valor'),
      desconto: num('desconto'),
      ipiPercentual: num('ipi') / 100,
      frete: num('frete'),
      seguro: num('seguro'),
      outras: num('outras'),
      freteCif: $('freteCif').checked,
      uf: $('uf').value,
      data: $('data').value || new Date().toISOString().slice(0, 10),
      aliquotaInterna: num('interna') / 100,
      iva: num('iva') / 100,
      temST: $('temST').checked,
      retemST: $('retemST').checked,
      importada: $('importada').checked,
      simples: $('simples').checked,
      baseDupla: $('baseDupla').checked
    };
  }

  // =========================================================================
  // Renderização
  // =========================================================================

  function linha(tbody, rotulo, valor, sub, destaque) {
    var tr = el('tr');
    if (destaque) tr.className = 'destaque';
    var td1 = el('td', rotulo);
    if (sub) td1.appendChild(el('span', sub, 'sub'));
    var td2 = el('td', valor, 'v');
    tr.appendChild(td1); tr.appendChild(td2);
    tbody.appendChild(tr);
    return tr;
  }

  // O estado de origem quase nunca muda o número, porque a alíquota para São
  // Paulo é 12% vindo de qualquer lugar. Sem dizer isso na tela, o campo parece
  // quebrado. Esta função existe para o vendedor ver o que o estado decide.
  function renderizarNotaUf(e, r) {
    var caixa = $('notaUf');
    limpar(caixa);
    var nomeUf = e.uf;
    var i;
    for (i = 0; i < UFS.length; i++) if (UFS[i][0] === e.uf) nomeUf = UFS[i][1];

    if (r.operacaoInterna) {
      caixa.appendChild(el('div',
        'São Paulo para São Paulo: operação interna, alíquota de ' + pct(r.aliquotaOrigem) +
        '. Não há alíquota interestadual nem diferencial.', 'nota'));
      return;
    }

    var cabeca = el('div', null, 'nota');
    cabeca.appendChild(el('span',
      nomeUf + ' → São Paulo: alíquota interestadual de ' + pct(r.aliquotaOrigem) + '. ' +
      (e.importada
        ? 'São 4% porque a mercadoria é importada com conteúdo de importação acima de 40%.'
        : 'É a mesma alíquota de qualquer estado para São Paulo — por isso trocar o estado não muda o valor do imposto. Só muda se a origem for São Paulo.')));
    caixa.appendChild(cabeca);

    var protocolo = PROTOCOLO_ST[e.uf] || 'confirmar';
    var texto, classe;
    if (protocolo === 'sim') {
      texto = nomeUf + ' é signatário do Protocolo ICMS 41/2008 com São Paulo: em venda para revenda, quem retém a ST na nota é você.';
      classe = 'nota ok';
    } else if (protocolo === 'saiu') {
      texto = 'Atenção: ' + nomeUf + ' saiu do Protocolo ICMS 41/2008 (Goiás denunciou em 2017, o Rio Grande do Sul saiu em 01/11/2024). Você não retém ST na nota — o seu cliente paga a antecipação do artigo 426-A na entrada.';
      classe = 'nota aviso';
    } else {
      texto = 'Não tenho confirmação de que ' + nomeUf + ' seja signatário do Protocolo ICMS 41/2008 com São Paulo. Confirme com o fiscal e ajuste a caixa abaixo — ela decide se a ST sai na sua nota ou se o cliente paga na entrada.';
      classe = 'nota aviso';
    }
    caixa.appendChild(el('div', texto, classe));

    // O Espírito Santo é porta de entrada de importação. Sair de lá com peça
    // importada muda a alíquota de 12% para 4%, e isso engorda a ST em vez de
    // baratear a nota — o crédito a abater fica menor.
    if (e.uf === 'ES' && !e.importada) {
      caixa.appendChild(el('div',
        'Saindo do Espírito Santo, confira na nota do fornecedor se a peça é importada. Com conteúdo de importação acima de 40% a alíquota cai para 4% — e aí a ST sobe, porque o crédito a abater é menor. Marque a caixa de importada abaixo para ver a diferença.',
        'nota'));
    }
  }

  function renderizar() {
    var e = lerEntradas();
    var r = calcular(e);
    ultimoResultado = r;
    renderizarNotaUf(e, r);

    var tbody = $('tabelaDetalhe').querySelector('tbody');
    limpar(tbody);

    linha(tbody, 'Produtos', moeda(r.liquido),
      e.desconto > 0 ? 'Já com ' + moeda(e.desconto) + ' de desconto' : null);

    if (r.ipi > 0) {
      linha(tbody, 'IPI', moeda(r.ipi),
        r.ipiNaBase ? 'Entra na base do ICMS: destino é consumo final' : 'Fora da base do ICMS: destino é revenda');
    }
    if (r.freteNaNota > 0) linha(tbody, 'Frete', moeda(r.freteNaNota), 'CIF, dentro da base');
    if (!e.freteCif && e.frete > 0) linha(tbody, 'Frete (FOB)', moeda(e.frete), 'Fora da nota; ainda assim compõe a base da ST');
    if (e.seguro > 0) linha(tbody, 'Seguro', moeda(e.seguro), null);
    if (e.outras > 0) linha(tbody, 'Outras despesas', moeda(e.outras), null);

    var rotuloOrigem = r.operacaoInterna
      ? 'ICMS ' + pct(r.aliquotaOrigem) + ' (interno)'
      : 'ICMS próprio ' + pct(r.aliquotaOrigem);
    linha(tbody, rotuloOrigem, e.simples ? 'não destacado' : moeda(r.icmsProprio),
      e.simples
        ? 'Simples Nacional não destaca. Valor teórico de ' + moeda(r.icmsProprioTeorico) + ' é o que se abate na ST.'
        : 'Base de ' + moeda(r.baseIcms) + '. Está dentro do preço, não soma na nota.');

    if (r.stAplica) {
      linha(tbody, 'Base da ST', moeda(r.baseSt),
        'IVA-ST ' + (e.simples ? 'original' : 'ajustado') + ' de ' + pct(r.ivaAjustado));
      linha(tbody, 'ICMS-ST', moeda(r.icmsSt), 'Somado à nota e recolhido por você', true);
    }

    if (r.difal > 0) {
      var ondeDifal = r.difalResponsavel === 'cliente' ? 'pago pelo cliente, fora da nota'
                    : r.difalNaNota ? 'retido por você, dentro da nota'
                    : 'recolhido por você, por fora';
      linha(tbody, 'DIFAL para SP', moeda(r.difal),
        'Base ' + (r.difalTipo === 'base dupla' ? 'dupla' : 'única') +
        ' de ' + moeda(r.baseDifal || 0) + ' · ' + ondeDifal, true);
    }

    linha(tbody, 'Total da nota fiscal', moeda(r.totalNota), null, true);

    // --- placar -----------------------------------------------------------
    var rot = 'Total da nota fiscal';
    var val = r.totalNota;
    var sub = '';
    if (e.perfil === 'CF_CONTRIBUINTE' && r.difalResponsavel === 'cliente' && r.difal > 0) {
      rot = 'Custo total para o cliente';
      val = r.custoCliente;
      sub = 'Nota de ' + moeda(r.totalNota) + ' mais ' + moeda(r.difal) + ' de DIFAL que o cliente recolhe em SP.';
    } else if (r.custoRemetente > 0) {
      rot = 'Total da nota fiscal';
      val = r.totalNota;
      sub = 'O cliente paga isso. Você ainda recolhe ' + moeda(r.custoRemetente) + ' de DIFAL por fora.';
    } else if (r.difalNaNota && r.difal > 0) {
      sub = 'Inclui ' + moeda(r.difal) + ' de diferencial retido por você na nota. O cliente não recolhe nada depois.';
    } else if (r.stAplica) {
      sub = 'Inclui ' + moeda(r.icmsSt) + ' de ICMS-ST. Para o cliente, o ICMS da cadeia acabou aqui.';
    } else {
      sub = 'Carga de ICMS na operação: ' + pct(r.cargaSobreProduto) + ' sobre o valor dos produtos.';
    }
    $('rotuloPlacar').textContent = rot;
    $('valorPlacar').textContent = moeda(val);
    $('subPlacar').textContent = sub;

    // --- quem recolhe -----------------------------------------------------
    var quem = $('quemRecolhe');
    limpar(quem);
    function item(cor, texto) {
      var d = el('div', null, 'quem-item');
      var b = el('span', null, 'bola'); b.style.background = cor;
      d.appendChild(b); d.appendChild(el('span', texto));
      quem.appendChild(d);
    }
    var cssOk = getComputedStyle(document.documentElement).getPropertyValue('--ok').trim();
    var cssAl = getComputedStyle(document.documentElement).getPropertyValue('--alerta').trim();
    var cssIn = getComputedStyle(document.documentElement).getPropertyValue('--info').trim();

    if (!e.simples && r.icmsProprio > 0) {
      item(cssIn, 'Você recolhe ' + moeda(r.icmsProprio) + ' de ICMS próprio ao seu estado. Já está embutido no preço.');
    } else if (e.simples) {
      item(cssIn, 'Você recolhe o ICMS dentro da guia única do Simples Nacional, pela faixa de faturamento.');
    }
    if (r.stAplica) {
      item(cssAl, 'Você retém e recolhe ' + moeda(r.icmsSt) + ' de ICMS-ST para São Paulo, somado à nota. Use GNRE se não tiver inscrição de substituto em SP.');
    }
    if (r.difal > 0 && r.difalResponsavel === 'cliente') {
      item(cssAl, 'O cliente recolhe ' + moeda(r.difal) + ' de DIFAL a São Paulo. Avise antes de fechar: é custo dele além da nota.');
    }
    if (r.difal > 0 && r.difalResponsavel === 'remetente' && r.difalNaNota) {
      item(cssAl, 'Você retém ' + moeda(r.difal) + ' de diferencial na própria nota e recolhe para São Paulo. O cliente paga junto com a mercadoria.');
    }
    if (r.difal > 0 && r.difalResponsavel === 'remetente' && !r.difalNaNota) {
      item(cssAl, 'Você recolhe ' + moeda(r.difal) + ' de DIFAL para São Paulo, por GNRE. O cliente não vê esse valor na nota — sai da sua margem.');
    }
    if (r.difal === 0 && e.perfil === 'CF_NAO_CONTRIBUINTE' && e.simples) {
      item(cssOk, 'Nenhum DIFAL nesta operação, por ser remetente do Simples Nacional.');
    }
    if (r.antecipacao426A) {
      item(cssAl, 'Você não retém ST. O cliente paga a antecipação do artigo 426-A na entrada da mercadoria em São Paulo — some isso ao preço quando ele comparar com um fornecedor paulista.');
    } else if (!r.stAplica && e.perfil === 'REVENDA' && !r.operacaoInterna) {
      item(cssOk, 'Sem ICMS-ST. O cliente credita o ICMS próprio e apura o imposto na revenda dele.');
    }

    // avisos
    for (var i = 0; i < r.avisos.length; i++) {
      var n = el('div', r.avisos[i].texto, 'nota ' + (r.avisos[i].tipo === 'ok' ? 'ok' : r.avisos[i].tipo === 'aviso' ? 'aviso' : ''));
      quem.appendChild(n);
    }

    // --- efeito no preço --------------------------------------------------
    var margem = $('corpoMargem');
    limpar(margem);
    if (r.custoRemetente > 0 && r.precoRecomposto && e.valor > 0) {
      margem.appendChild(el('p',
        'O DIFAL de ' + moeda(r.custoRemetente) + ' sai da sua margem, não da nota. Para chegar líquido no mesmo valor de hoje, o preço dos produtos precisa ir de ' +
        moeda(e.valor) + ' para ' + moeda(r.precoRecomposto) + ' — ' + pct(r.precoRecomposto / e.valor - 1) + ' a mais.'));
      var aviso = el('div', 'Cuidado com o desconto nesse tipo de cliente: cada real de desconto custa mais do que um real de margem.', 'nota aviso');
      margem.appendChild(aviso);
    } else if (r.stAplica) {
      margem.appendChild(el('p',
        'O ICMS-ST de ' + moeda(r.icmsSt) + ' é somado à nota e pago pelo cliente, mas ele não credita esse valor. É o número que o comprador compara com o do concorrente — vale citar separado no orçamento.'));
      if (e.data < FIM_ST_AUTOPECAS) {
        var simulado = calcular(Object.assign({}, e, { data: FIM_ST_AUTOPECAS }));
        margem.appendChild(el('p',
          'Se a mesma venda for faturada em 01/10/2026 ou depois, a nota cai para ' + moeda(simulado.totalNota) +
          ' — ' + moeda(r.totalNota - simulado.totalNota) + ' a menos, porque autopeças saem da ST.'));
      }
    } else if (e.perfil === 'CF_CONTRIBUINTE' && r.difal > 0 && r.difalNaNota) {
      margem.appendChild(el('p',
        'O diferencial de ' + moeda(r.difal) + ' já está na nota, então o seu preço final aparece inteiro para o comprador. Contra um fornecedor de São Paulo, é ' +
        moeda(r.totalNota) + ' contra o preço dele mais 18% de ICMS embutido — mostre a conta fechada.'));
    } else if (e.perfil === 'CF_CONTRIBUINTE' && r.difal > 0) {
      margem.appendChild(el('p',
        'O cliente paga ' + moeda(r.difal) + ' de DIFAL além da nota, por conta dele. No comparativo com um fornecedor de São Paulo, some esse valor ao seu preço: é ele que o comprador enxerga no fim.'));
    } else {
      margem.appendChild(el('p', 'Nesta configuração não há imposto por fora da nota. O preço que você passa é o custo do cliente.'));
    }

    // --- explicação -------------------------------------------------------
    var exp = $('explicacao');
    limpar(exp);
    var lista = el('ul');
    function bullet(t) { lista.appendChild(el('li', t)); }

    if (r.operacaoInterna) {
      bullet('Origem SP para destino SP: operação interna, alíquota de ' + pct(r.aliquotaOrigem) + '.');
    } else {
      bullet('Alíquota interestadual de ' + pct(r.aliquotaOrigem) + (e.importada
        ? ' porque a mercadoria é importada com conteúdo de importação acima de 40% (Resolução do Senado 13/2012).'
        : ' — é a alíquota de qualquer estado para São Paulo.'));
    }
    bullet('Alíquota interna de São Paulo: ' + pct(e.aliquotaInterna) + '.');
    bullet(r.ipiNaBase
      ? 'O IPI entra na base do ICMS porque a peça vai para uso, consumo ou imobilizado.'
      : 'O IPI fica fora da base do ICMS porque a operação é entre contribuintes e a peça vai para revenda.');
    if (r.stAplica) {
      bullet(e.simples
        ? 'Remetente do Simples usa o IVA-ST original de ' + pct(e.iva) + ', sem ajuste (Convênio ICMS 35/2011).'
        : 'IVA-ST ajustado: [(1 + ' + pct(e.iva) + ') × (1 − ' + pct(r.aliquotaOrigem) + ') ÷ (1 − ' + pct(e.aliquotaInterna) + ')] − 1 = ' + pct(r.ivaAjustado) + '.');
      bullet('ICMS-ST = base de ' + moeda(r.baseSt) + ' × ' + pct(e.aliquotaInterna) + ' − ICMS próprio de ' + moeda(r.icmsProprioTeorico) + ' = ' + moeda(r.icmsSt) + '.');
    }
    if (r.difal > 0 && r.difalTipo === 'base dupla') {
      bullet('DIFAL por base dupla: tira-se o ICMS de origem do valor, recompõe-se a base pela alíquota interna e cobra-se a diferença. É o que manda a Lei Complementar 190/2022.');
    }
    if (r.difal > 0 && r.difalTipo === 'base única') {
      bullet('DIFAL por base única: ' + moeda(r.baseIcms) + ' × (' + pct(e.aliquotaInterna) + ' − ' + pct(r.aliquotaOrigem) + ') = ' + moeda(r.difal) + '. É o critério do artigo 117 do RICMS-SP para contribuinte.');
    }
    if (!r.stVigente) {
      bullet('Data em 01/10/2026 ou depois: autopeças já saíram da substituição tributária em São Paulo (Portaria SRE 34/2026).');
    }
    exp.appendChild(lista);
  }

  // =========================================================================
  // Consulta de CNPJ
  // =========================================================================

  function mostrarFichaErro(texto, cnpjLimpo) {
    var ficha = $('fichaCnpj');
    ficha.className = 'ficha';
    limpar(ficha);
    ficha.appendChild(el('div', texto, 'ficha-nome'));
    var p = el('div', null, 'linha-botoes');
    var a = el('a', 'Abrir na Receita Federal', 'btn btn-mini');
    a.href = 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp';
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    p.appendChild(a);
    if (cnpjLimpo) {
      var b = el('a', 'Ver dados públicos', 'btn btn-mini');
      b.href = 'https://brasilapi.com.br/api/cnpj/v1/' + cnpjLimpo;
      b.target = '_blank'; b.rel = 'noopener noreferrer';
      p.appendChild(b);
    }
    ficha.appendChild(p);
    ficha.appendChild(el('div', 'Preencha o estado de origem e o perfil do cliente na mão — a conta funciona igual.', 'dica'));
  }

  function renderizarFicha(d) {
    var ficha = $('fichaCnpj');
    ficha.className = 'ficha';
    limpar(ficha);

    ficha.appendChild(el('div', d.razao_social || 'Sem razão social', 'ficha-nome'));

    var pil = el('div', null, 'pilulas');
    var ativa = (d.descricao_situacao_cadastral || '').toUpperCase() === 'ATIVA';
    pil.appendChild(el('span', d.descricao_situacao_cadastral || 'situação desconhecida', 'pilula ' + (ativa ? 'ok' : 'erro')));
    pil.appendChild(el('span', d.uf || '--', 'pilula info'));
    if (d.opcao_pelo_simples === true) pil.appendChild(el('span', 'Simples Nacional', 'pilula aviso'));
    if (d.opcao_pelo_mei === true) pil.appendChild(el('span', 'MEI', 'pilula aviso'));
    if (d.descricao_identificador_matriz_filial) pil.appendChild(el('span', d.descricao_identificador_matriz_filial, 'pilula'));
    ficha.appendChild(pil);

    var linhas = el('div', null, 'ficha-linhas');
    function info(rotulo, valor) {
      if (!valor) return;
      var d2 = el('div', rotulo + ': ');
      d2.appendChild(el('b', valor));
      linhas.appendChild(d2);
    }
    info('Município', (d.municipio || '') + (d.uf ? ' / ' + d.uf : ''));
    info('Atividade', d.cnae_fiscal_descricao);
    info('Nome fantasia', d.nome_fantasia);
    var endereco = [d.logradouro, d.numero, d.bairro].filter(Boolean).join(', ');
    info('Endereço', endereco);
    ficha.appendChild(linhas);

    // Sugestão de perfil — sempre rotulada como sugestão.
    var c = classificarCnae(d.cnae_fiscal);
    if (c) {
      perfilSugerido = c.perfil;
      var classe = c.confianca === 'alta' ? 'nota ok' : c.confianca === 'media' ? 'nota' : 'nota aviso';
      var texto = 'Sugestão pela atividade: ' + rotuloPerfil(c.perfil) + '. ' + c.motivo +
                  ' Confirme com a inscrição estadual do cliente antes de faturar.';
      ficha.appendChild(el('div', texto, classe));
      if (!perfilTocadoPeloUsuario) {
        var radio = document.querySelector('input[name="perfil"][value="' + c.perfil + '"]');
        if (radio) { radio.checked = true; }
      }
    }

    if (d.uf) {
      if (d.uf === 'SP') {
        ficha.appendChild(el('div', 'Este CNPJ é de São Paulo — o campo de origem continua sendo o SEU estado, o de quem emite a nota.', 'nota'));
      } else {
        ficha.appendChild(el('div', 'Atenção: o cliente está em ' + d.uf + ', não em São Paulo. Esta calculadora foi feita para destino SP; a conta de DIFAL para outro destino usa a alíquota interna de lá.', 'nota aviso'));
      }
    }
    if (d.opcao_pelo_simples === true) {
      ficha.appendChild(el('div', 'Cliente é do Simples Nacional. Isso não muda a ST nem o DIFAL desta operação — o que muda é o regime de quem vende, no passo 3.', 'nota'));
    }
    if (!ativa) {
      ficha.appendChild(el('div', 'Cadastro não está ativo na Receita. Confira antes de faturar.', 'nota erro'));
    }
  }

  function rotuloPerfil(p) {
    if (p === 'REVENDA') return 'revenda';
    if (p === 'CF_CONTRIBUINTE') return 'consumidor final com inscrição estadual';
    return 'consumidor final sem inscrição estadual';
  }

  function consultarCnpj() {
    var bruto = $('cnpj').value;
    var limpo = apenasDigitos(bruto);
    var ficha = $('fichaCnpj');
    ficha.classList.remove('oculto');

    if (!cnpjValido(limpo)) {
      ficha.className = 'ficha';
      limpar(ficha);
      ficha.appendChild(el('div', 'CNPJ incompleto ou com dígito verificador errado.', 'ficha-nome'));
      ficha.appendChild(el('div', 'Confira os 14 números. Você também pode seguir sem consultar: preencha o estado de origem e o perfil do cliente na mão.', 'dica'));
      return;
    }

    ficha.className = 'ficha';
    limpar(ficha);
    ficha.appendChild(el('div', 'Consultando ' + formatarCnpj(limpo) + '…', 'ficha-nome'));

    var btn = $('btnCnpj');
    btn.disabled = true;

    fetch('https://brasilapi.com.br/api/cnpj/v1/' + limpo)
      .then(function (resp) {
        if (resp.status === 404) throw new Error('nao-encontrado');
        if (!resp.ok) throw new Error('falha');
        return resp.json();
      })
      .then(function (d) {
        dadosCnpj = d;
        renderizarFicha(d);
        renderizar();
      })
      .catch(function (err) {
        if (err && err.message === 'nao-encontrado') {
          mostrarFichaErro('CNPJ não encontrado na base pública da Receita.', limpo);
        } else {
          mostrarFichaErro('Não deu para consultar agora. Pode ser a rede ou o bloqueio de conexões externas desta página.', limpo);
        }
      })
      .then(function () { btn.disabled = false; });
  }

  // =========================================================================
  // Busca de NCM
  // =========================================================================

  function mostrarNcmComuns(motivo) {
    var saida = $('saidaNcm');
    limpar(saida);
    if (motivo) saida.appendChild(el('div', motivo, 'nota aviso'));
    saida.appendChild(el('div', 'NCM mais usados na linha pesada:', 'dica'));
    var box = el('div', null, 'resultados-ncm');
    NCM_COMUNS.forEach(function (n) {
      var b = el('button');
      b.type = 'button';
      b.appendChild(el('code', n[0]));
      b.appendChild(el('span', n[1]));
      b.addEventListener('click', function () { $('ncm').value = n[0]; limpar(saida); });
      box.appendChild(b);
    });
    saida.appendChild(box);
  }

  function buscarNcm() {
    var termo = ($('descricao').value || '').trim();
    var saida = $('saidaNcm');
    if (termo.length < 3) {
      mostrarNcmComuns('Escreva ao menos três letras na descrição para buscar. Enquanto isso:');
      return;
    }
    limpar(saida);
    saida.appendChild(el('div', 'Buscando “' + termo + '”…', 'dica'));

    fetch('https://brasilapi.com.br/api/ncm/v1?search=' + encodeURIComponent(termo))
      .then(function (resp) {
        if (!resp.ok) throw new Error('falha');
        return resp.json();
      })
      .then(function (lista) {
        limpar(saida);
        if (!lista || !lista.length) {
          mostrarNcmComuns('Nada encontrado para “' + termo + '”. Tente outra palavra. Enquanto isso:');
          return;
        }
        saida.appendChild(el('div', lista.length + ' resultado(s). Clique para usar:', 'dica'));
        var box = el('div', null, 'resultados-ncm');
        lista.slice(0, 40).forEach(function (n) {
          var b = el('button');
          b.type = 'button';
          b.appendChild(el('code', n.codigo));
          b.appendChild(el('span', n.descricao));
          b.addEventListener('click', function () { $('ncm').value = n.codigo; limpar(saida); });
          box.appendChild(b);
        });
        saida.appendChild(box);
      })
      .catch(function () {
        mostrarNcmComuns('A busca de NCM não respondeu. Pode ser a rede ou o bloqueio de conexões externas desta página. Enquanto isso:');
      });
  }

  function atualizarLinks() {
    var codigo = ($('codigo').value || '').trim();
    var desc = ($('descricao').value || '').trim();
    var termo = codigo || desc;
    var cat = $('linkCatalogo');
    var goog = $('linkGoogle');
    if (termo) {
      cat.href = 'https://pabu.com.br/catalogsearch/result/?q=' + encodeURIComponent(termo);
      goog.href = 'https://www.google.com/search?q=' + encodeURIComponent('NCM ' + termo + ' autopeça');
      cat.removeAttribute('aria-disabled');
      goog.removeAttribute('aria-disabled');
    } else {
      cat.href = 'https://pabu.com.br/catalogsearch/result/?q=';
      goog.href = 'https://www.google.com/search?q=NCM+autope%C3%A7a';
    }
  }

  // =========================================================================
  // Resumo copiável
  // =========================================================================

  function montarResumo() {
    var r = ultimoResultado;
    if (!r) return '';
    var e = r.entradas;
    var l = [];
    l.push('CÁLCULO DE ICMS — DESTINO SÃO PAULO');
    if (dadosCnpj && dadosCnpj.razao_social) l.push('Cliente: ' + dadosCnpj.razao_social);
    if ($('codigo').value) l.push('Peça: ' + $('codigo').value + ($('descricao').value ? ' — ' + $('descricao').value : ''));
    if ($('ncm').value) l.push('NCM: ' + $('ncm').value);
    l.push('Origem: ' + e.uf + '   Data: ' + e.data.split('-').reverse().join('/'));
    l.push('Operação: ' + rotuloPerfil(e.perfil));
    l.push('');
    l.push('Produtos: ' + moeda(r.liquido));
    if (r.ipi > 0) l.push('IPI: ' + moeda(r.ipi));
    if (r.freteNaNota > 0) l.push('Frete: ' + moeda(r.freteNaNota));
    if (e.seguro > 0) l.push('Seguro: ' + moeda(e.seguro));
    if (e.outras > 0) l.push('Outras despesas: ' + moeda(e.outras));
    l.push('ICMS próprio (' + pct(r.aliquotaOrigem) + '): ' + (e.simples ? 'não destacado' : moeda(r.icmsProprio)));
    if (r.stAplica) l.push('ICMS-ST (IVA ' + pct(r.ivaAjustado) + '): ' + moeda(r.icmsSt));
    if (r.difal > 0) {
      var ondeD = r.difalResponsavel === 'cliente' ? 'recolhido pelo cliente, fora da nota'
                : r.difalNaNota ? 'retido na nota pelo remetente'
                : 'recolhido pelo remetente, fora da nota';
      l.push('DIFAL (' + r.difalTipo + ', ' + ondeD + '): ' + moeda(r.difal));
    }
    l.push('');
    l.push('TOTAL DA NOTA: ' + moeda(r.totalNota));
    if (r.custoCliente !== r.totalNota) l.push('CUSTO TOTAL PARA O CLIENTE: ' + moeda(r.custoCliente));
    if (r.custoRemetente > 0) l.push('DIFAL por conta do remetente: ' + moeda(r.custoRemetente));
    l.push('');
    l.push('Cálculo de apoio para orçamento. Confirme NCM, CEST e regime com a contabilidade.');
    return l.join('\n');
  }

  function copiarResumo() {
    var texto = montarResumo();
    var btn = $('btnCopiar');
    var original = 'Copiar resumo';

    function ok() { btn.textContent = 'Copiado'; setTimeout(function () { btn.textContent = original; }, 1800); }
    function falhou() { btn.textContent = 'Não deu para copiar'; setTimeout(function () { btn.textContent = original; }, 2200); }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(ok, falhou);
    } else {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var copiou = false;
      try { copiou = document.execCommand('copy'); } finally { document.body.removeChild(ta); }
      if (copiou) { ok(); } else { falhou(); }
    }
  }

  // =========================================================================
  // Ligação
  // =========================================================================

  function iniciar() {
    // Estados
    var sel = $('uf');
    UFS.forEach(function (u) {
      var o = document.createElement('option');
      o.value = u[0];
      o.textContent = u[0] + ' — ' + u[1];
      sel.appendChild(o);
    });
    sel.value = 'ES';
    $('retemST').checked = PROTOCOLO_ST[sel.value] !== 'saiu';

    // Data de hoje
    var hoje = new Date();
    var iso = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    $('data').value = iso;

    // Tema
    var btnTema = $('btnTema');
    btnTema.addEventListener('click', function () {
      var atual = document.documentElement.getAttribute('data-theme');
      if (!atual) {
        atual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', atual === 'dark' ? 'light' : 'dark');
      renderizar();
    });

    // CNPJ
    $('cnpj').addEventListener('input', function (ev) {
      var pos = ev.target.selectionStart;
      var antes = ev.target.value.length;
      ev.target.value = formatarCnpj(ev.target.value);
      var depois = ev.target.value.length;
      if (pos !== null) ev.target.setSelectionRange(pos + (depois - antes), pos + (depois - antes));
    });
    $('cnpj').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); consultarCnpj(); }
    });
    $('btnCnpj').addEventListener('click', consultarCnpj);

    // Perfil
    Array.prototype.forEach.call(document.querySelectorAll('input[name="perfil"]'), function (radio) {
      radio.addEventListener('change', function () {
        perfilTocadoPeloUsuario = true;
        var aviso = $('avisoPerfil');
        limpar(aviso);
        if (perfilSugerido && perfilSugerido !== radio.value) {
          aviso.appendChild(el('div',
            'Você trocou a sugestão da atividade (' + rotuloPerfil(perfilSugerido) + ') por ' + rotuloPerfil(radio.value) + '. A conta segue o que você escolheu.',
            'nota'));
        }
        renderizar();
      });
    });

    // NCM
    $('btnBuscaNcm').addEventListener('click', buscarNcm);
    $('descricao').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); buscarNcm(); }
    });
    ['codigo', 'descricao'].forEach(function (id) {
      $(id).addEventListener('input', atualizarLinks);
    });

    // IVA
    $('ivaPreset').addEventListener('change', function () {
      if (this.value !== 'custom') $('iva').value = this.value;
      renderizar();
    });
    $('iva').addEventListener('input', function () {
      $('ivaPreset').value = 'custom';
      renderizar();
    });

    // Recalcular a cada mudança
    var campos = ['valor', 'desconto', 'ipi', 'frete', 'seguro', 'outras', 'freteCif',
                  'uf', 'data', 'interna', 'temST', 'retemST', 'importada', 'simples', 'baseDupla'];
    campos.forEach(function (id) {
      var n = $(id);
      n.addEventListener('input', renderizar);
      n.addEventListener('change', renderizar);
    });

    // Trocar o estado reposiciona a caixa do protocolo, até o vendedor decidir
    // por conta própria — a partir daí a escolha dele manda.
    $('retemST').addEventListener('change', function () { retemTocado = true; });
    $('uf').addEventListener('change', function () {
      if (retemTocado) return;
      $('retemST').checked = PROTOCOLO_ST[this.value] !== 'saiu';
      renderizar();
    });

    $('btnCopiar').addEventListener('click', copiarResumo);
    $('formulario').addEventListener('submit', function (ev) { ev.preventDefault(); });

    atualizarLinks();
    renderizar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
