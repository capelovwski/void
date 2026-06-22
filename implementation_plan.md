# Plano de Implementação - Void v2.1 & v2.2 (Refinamentos Visuais e Componentes Premium)

Este documento estabelece o design técnico para a reestruturação da plataforma **Void**, contemplando centralização do Horizonte de Eventos, destaque do dia atual, diminuição de opacidade de dias passados, modal diário unificado com auto-save, painel de relatórios modular customizável (com suporte a Drag-and-Drop, redimensionamento, filtros e segmentação de até 3 instituições bancárias), modernização das categorias/tags com ícones vetoriais SVG, e a segunda proposta de layout typographic compacto de alta densidade no histórico de transações.

---

## Proposed Changes

### [Novos Modelos e Configurações]

#### [MODIFY] [types.ts](file:///g:/Meu%20Drive/0.%20WORK/4.%20REALTY/src/types.ts)
- Atualizar a interface `Tag` para incluir a propriedade opcional `icon?: string` mapeando o identificador do ícone.

---

### [Componente de Partículas]

#### [MODIFY] [ParticleBackground.tsx](file:///g:/Meu%20Drive/0.%20WORK/4.%20REALTY/src/components/ParticleBackground.tsx)
- Elevar a densidade de partículas na tela em 20% (de 80 para 96).
- Forçar inline `style={{ zIndex: -10 }}` no elemento `<canvas>` para impedir qualquer renderização sobreposta à interface do app.

---

### [Horizonte de Eventos & Modal Diário]

#### [MODIFY] [SaldosTab.tsx](file:///g:/Meu%20Drive/0.%20WORK/4.%20REALTY/src/components/SaldosTab.tsx)
- **Centralização Vertical/Horizontal**: Adaptar o container do dashboard para se esticar com `min-h-[calc(100vh-140px)] flex flex-col justify-center` no desktop.
- **Consistência de Alturas**: Fixar a altura das visualizações de 1 Mês e 3 Meses em `h-[72vh] flex flex-col`. Remover a restrição `h-24` nos dias do calendário de 1 mês, substituindo por `h-full min-h-16`.
- **Destaque do Dia Atual ("Hoje")**: Preenchimento e borda amarelos com sombra fluida (`ring-2 ring-main border-main bg-main/20 shadow-[0_0_15px_rgba(254,247,175,0.3)]`). O indicador numérico usará preenchimento amarelo com texto preto (`w-6 h-6 rounded-full bg-main text-zinc-950 font-black flex items-center justify-center`).
- **Opacidade dos Dias Passados**: Mudar para `opacity-35 grayscale contrast-75 brightness-[0.8]`, ativando o retorno a cores completas (`hover:opacity-85 hover:grayscale-0 hover:contrast-100 hover:brightness-100 transition-all`) no hover.
- **Modal Unificado de Dia**: 
  - Retirar a caixa delimitadora "Monitoramento Diário" e o botão "Salvar Gasto Real".
  - Apresentar o input de Gasto Real diretamente com estilo idêntico aos inputs do modal principal.
  - Implementar a escuta `onChange` para atualizar e persistir o valor dinamicamente via `handleRealSpendInputChange`. Limpar o campo resulta no salvamento automático de R$ 0.

---

### [Relatórios Modulares e Multi-Bancos]

#### [MODIFY] [RelatoriosTab.tsx](file:///g:/Meu%20Drive/0.%20WORK/4.%20REALTY/src/components/RelatoriosTab.tsx)
- **Centralização**: Adicionar `max-w-5xl mx-auto w-full` no contêiner para centralizar no desktop.
- **Widgets Customizados**:
  - `summary`: O grid de 4 cartões com totais.
  - `savings_rate`: A taxa de investimento.
  - `timeline_chart`: Gráfico de saldo projetado.
  - `expenses_chart`: Distribuição de gastos por tag.
  - `multi_banks`: NOVO widget "Custódia & Faturas Multi-Bancos" dividindo dados simulados de faturas, investimentos e saldos entre **Nubank**, **Itaú** e **XP Investimentos** proporcionalmente à movimentação real.
- **Drag-and-Drop & Ordenação**:
  - Implementar estado `widgetOrder: string[]`.
  - Adicionar manipulação dos eventos drag (`draggable="true"`, `onDragStart`, `onDragOver`, `onDrop`) com o ícone `GripVertical` para reordenação física intuitiva.
  - Adicionar botões alternativos de seta (Mover ▲ e Mover ▼) para reposicionamento instantâneo.
- **Controle de Redimensionamento**:
  - Estado `widgetSizes` definindo cada gráfico e painel como largura média (`col-span-1`) ou largura total (`col-span-1 desktop:col-span-2`).
- **Dynamic Filters Side Menu**:
  - Painel colapsável no topo com checkboxes individuais para gerenciar a exibição/ocultação dinâmica dos 5 widgets.

---

### [Tags, Categorias e Modais]

#### [MODIFY] [PlanejamentoTab.tsx](file:///g:/Meu%20Drive/0.%20WORK/4.%20REALTY/src/components/PlanejamentoTab.tsx)
- **Biblioteca de 10 Ícones**: Declarar e exportar o objeto `CATEGORY_ICONS` contendo 10 ícones minimalistas do Lucide (`Utensils`, `Film`, `PiggyBank`, `Car`, `Heart`, `Home`, `ShoppingBag`, `BookOpen`, `Wrench`, `Briefcase`).
- **Seleção no Formulário**: Adicionar um grid com os 10 ícones para permitir a seleção de um ícone no formulário de criação de tags.
- **Botão Custom Redesenhado**: Substituir o botão de texto customizado por um container circular estético, exibindo o ícone de `Palette` da paleta moderna, que ativa o color picker de forma invisível/intuitiva no clique.
- **UIs Sem Bolinhas Coloridas**: Substituir as bolinhas sólidas por ícones coloridos envoltos em um background de tom pastel correspondente (`bg-color/15 border-color/30 text-color`).

#### [MODIFY] [TransactionModal.tsx](file:///g:/Meu%20Drive/0.%20WORK/4.%20REALTY/src/components/TransactionModal.tsx)
- Adaptar o painel inferior do campo de tags para buscar e carregar o ícone vetorial correspondente à tag selecionada no dropdown.

---

### [Histórico de Movimentações (Extrato Tipográfico v2)]

#### [MODIFY] [TransacoesTab.tsx](file:///g:/Meu%20Drive/0.%20WORK/4.%20REALTY/src/components/TransacoesTab.tsx)
- Criar a visualização **Extrato Tipográfico** (v2): linhas compactas com tipografia monospace elegante, margens reduzidas, divisores sutis e alta densidade de informação.
- Adicionar um seletor visual discreto no cabeçalho para alternar entre "Visualização de Cards" e "Extrato Tipográfico".

---

## Verification Plan

### Automated Tests
- Executar `cmd /c "npm run build"` no scratch para verificar compatibilidade sintática e PostCSS.

### Manual Verification
1. Testar o Drag and Drop do dashboard de relatórios no desktop.
2. Conferir o auto-save no input de gasto real no Horizonte de Eventos.
3. Testar a criação de tag selecionando um dos 10 ícones e a paleta de cores personalizada.
4. Alternar layouts no Histórico de Transações e verificar o extrato compacto de alta densidade.
