# INFORMATION_ARCHITECTURE.md — Arquitetura de informação

---

## 1. Mapa de navegação

```
/                        Landing institucional (pública, fora do app)
│
└── /app                 Shell do produto
    ├── /app/cockpit         Cockpit do Dia            ← rota inicial
    ├── /app/carteira        Radar da Carteira
    │   └── /app/cliente/:id     Perfil 360
    ├── /app/acoes           Next Best Action (fila completa)
    ├── /app/andon           Painel ANDON
    ├── /app/diagnostico     Diagnóstico Guiado
    ├── /app/perdas          Inteligência de Venda Perdida
    ├── /app/simulador       Simulador de Cenários
    ├── /app/conhecimento    Centro de Conhecimento
    ├── /app/telemetria      Telemetria Comercial
    ├── /app/debriefing      Debriefing do Dia
    └── /app/dados           Dados, importação, exportação, privacidade
```

**Modos de foco** (sobrepõem-se a qualquer tela, acessíveis do Cockpit):
`?modo=veiculo-parado`, `?modo=recuperar-orcamento`, `?modo=carteira-esquecida`,
`?modo=venda-completa`.

> **Decisão:** modos são parâmetros de rota, não telas separadas. Um modo é uma **lente sobre a
> carteira**, não um lugar novo. Isso preserva o contexto e evita quatro telas quase idênticas.

---

## 2. Navegação por dispositivo

### Mobile (< 768 px)
Barra inferior fixa com **5 destinos**: Cockpit, Carteira, Ações, ANDON, Mais.
Alvos de toque de 48 px, alcançáveis com o polegar. Tudo o mais vive em "Mais".

> **Decisão:** cinco itens é o limite do polegar. O sexto item de uma barra inferior nunca é
> tocado. Telemetria, conhecimento, perdas e dados são tarefas de sessão longa — cabem em "Mais".

### Tablet e desktop (≥ 768 px)
Barra lateral fixa com todos os 11 destinos, agrupados em **Operação** / **Inteligência** /
**Sistema**.

---

## 3. Hierarquia do Cockpit

A tela precisa responder em **10 segundos**. A ordem vertical é a ordem de leitura obrigatória:

```
1. Faixa de status do dia    ── quanto falta, meta de execução, foco
2. ANDON crítico             ── no máximo 3, deduplicado por conta
3. Top 3 Próximas Ações      ── card completo, com "Iniciar próxima ação"
4. Compromissos de hoje      ── promessas e tarefas com prazo
5. Modos de foco             ── quatro atalhos
6. Mapa de calor da carteira ── esquemático, por cidade
7. Debriefing                ── só aparece após as 16h
```

> **Decisão:** ANDON **antes** do Top 3. Um veículo parado invalida o plano do dia. Colocar o
> plano antes da anormalidade é o erro que a aviação corrigiu há décadas.
>
> **Decisão:** o debriefing só aparece após as 16h. Um card de fim de dia visível às 8h é ruído
> sete horas por dia.

---

## 4. Anatomia do card de ação

Todo card de recomendação carrega, na ordem:

```
┌────────────────────────────────────────────┐
│ [TIPO]  [confiança]              [score]   │  ← identidade e prioridade
│ Nome do cliente · cidade/UF                │
├────────────────────────────────────────────┤
│ AÇÃO — em uma linha imperativa             │  ← o que fazer
│ Prazo · Valor potencial estimado           │
├────────────────────────────────────────────┤
│ POR QUE (fatores + evidências)             │  ← raciocínio exposto (P1)
│ PENALIDADES                                │
│ FALTA SABER (lacunas)                      │
│ PERGUNTE: ...                              │
├────────────────────────────────────────────┤
│ [Executar]  [Não faz sentido]  [Detalhar]  │  ← saída sempre acionável
└────────────────────────────────────────────┘
```

O bloco "POR QUE" é **obrigatório e não colapsável no Top 3**. Na fila secundária ele começa
colapsado para permitir varredura rápida.

---

## 5. Padrão SCAR

Formato único de resumo em todo o produto: **Situação, Contexto, Análise, Recomendação**.
Gerado em `Perfil 360 → Preparar ligação` e reutilizado nos modos de foco, no diagnóstico e na
transferência interna.

Copiável em um clique, em formato adequado a ligação, WhatsApp ou visita.

> **Decisão:** um único formato de resumo em todo o produto. Dois formatos concorrentes fariam o
> vendedor precisar aprender qual usar em cada tela — custo cognitivo sem retorno.

---

## 6. Perfil 360 — organização por abas

| Aba | Conteúdo | Por que existe |
|---|---|---|
| **Situação** | Temperatura, score com drivers, radar de reposição, lacunas | Resposta em 5 segundos |
| **Histórico** | Compras, orçamentos, interações, perdas | Evidência para a conversa |
| **Frota** | Perfil, veículos, sistemas relevantes | Base da oportunidade |
| **Oportunidade** | Grafo de famílias, expansão, kit incompleto | O que vender além do óbvio |
| **Execução** | Promessas, tarefas, próximas ações | Disciplina |

O botão **"Preparar ligação"** é persistente no topo, em todas as abas. É a ação mais frequente
da tela e não pode exigir navegação.

---

## 7. Densidade de informação

- **Mobile:** uma coluna, no máximo 3 métricas por linha, tipografia com escala clara.
- **Desktop:** até 3 colunas; tabelas com colunas essenciais visíveis e o resto sob "mais colunas".
- **Regra transversal:** nenhuma tela abre com mais de **7 elementos interativos** acima da dobra.

---

## 8. Estados vazios

Nenhum estado vazio decorativo. Todo estado vazio diz **o que falta** e **oferece a ação**:

| Situação | Mensagem |
|---|---|
| Sem dados | "Nenhuma carteira carregada." → `[Carregar dados de demonstração]` `[Importar CSV]` |
| Carteira sem sinais | "Sua carteira está dentro do ciclo. Nada exige ação agora." → `[Ver carteira esquecida]` |
| Cliente sem histórico | "4 compras são necessárias para calcular cadência. Há 1." → `[Registrar interação]` |
| Aplicação técnica | "Catálogo de aplicações não importado. O BRUTO OS não infere aplicação." → `[Como importar]` |
| Sem perdas | "Nenhuma perda registrada. Isso é bom — ou o registro não está acontecendo." → `[Registrar perda]` |

---

## 9. Vocabulário

Termos do setor, sempre: *linha pesada*, *veículo parado*, *aplicação*, *kit completo*, *frota*,
*reposição*, *carteira*, *tira-pedido*.

Termos proibidos na interface: *IA*, *inteligente*, *prever*, *machine learning*, *engajamento*,
*lead*, *funil*, *pipeline*, *insight*.

> Um vendedor de linha pesada não tem "leads". Tem clientes. O vocabulário é parte da
> credibilidade do produto.

---

## 10. Selo de demonstração

Faixa persistente no topo do app enquanto os dados forem de demonstração:

> **Dados demonstrativos — nenhuma aplicação técnica deve ser usada comercialmente.**

Não é dispensável enquanto o seed estiver ativo. Some automaticamente após importação de dados
reais. Confundir demonstração com produção é o risco de credibilidade mais barato de evitar e
mais caro de consertar.
