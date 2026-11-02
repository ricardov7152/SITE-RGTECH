# Paleta de Cores em Degradê e Módulo Kanban de Manutenção Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar a nova paleta de cores em degradê (`#021024`, `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF`) em todo o site e painel administrativo da RG Tech e substituir a tabela de "Ordens de OS" pelo novo módulo **Manutenção** em formato Kanban interativo estilo Trello com 6 raias editáveis, adição rápida no topo da raia, drag-and-drop fluido com `DragOverlay` + sons táteis + confetes, modal de edição/PDF e geração automática de lançamento financeiro ao mover para **Finalizado**.

**Architecture:** SPA em React 19 + Vite 8 + Tailwind CSS v4 conectada 100% online ao Supabase. O módulo Kanban utiliza `@dnd-kit/core` + `@dnd-kit/sortable` + `framer-motion` + `canvas-confetti` + sintetizador de áudio tátil nativo (Web Audio API), carregado via `React.lazy` para preservar o bundle inicial da Landing Page abaixo de 350 KB.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4, `@supabase/supabase-js`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `framer-motion`, `canvas-confetti`, `html2pdf.js`, `lucide-react`, `date-fns`.

**Spec:** [`specs/002-kanban-manutencao-paleta/spec.md`](file:///e:/RG%20TECH/frontend/specs/002-kanban-manutencao-paleta/spec.md)

## Global Constraints

- Paleta oficial obrigatória em degradê: `#021024`, `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF`.
- Conexão 100% online com Supabase (proibido criar modo offline/fallback local de dados em `localStorage` para tabelas de negócio, conforme `gemini.md`).
- Bundle JS inicial (`index-*.js`) em `dist/assets/` deve permanecer `< 350 KB` e passar em todos os checks de `scripts/validate_sdd.mjs`.
- As 6 raias padrão do Kanban são: `recebido` ("Equipamentos recebidos"), `em_analise` ("Em analise"), `orcamento_enviado` ("Orçamento enviado"), `aprovado_execucao` ("Aprovado e Execução"), `finalizado` ("Finalizado") e `aguardando_peca` ("Aguardando Peças"), com títulos editáveis salvos em `configuracoes.valor.kanban_colunas`.
- A aba `Orçamentos` permanece no menu lateral para orçamentos avulsos (sem disparar criação automática de OS), enquanto o card da `Manutenção` possui geração de PDF A4 própria e dispara o financeiro `Pendente` ("A Conferir") ao entrar em `finalizado`.

## Review Focus

1. **Banco Supabase ainda sem as novas colunas (`titulo`, `prioridade`, `posicao`, etc.) no instante do primeiro acesso:** `db.ordem_servico` em `src/services/supabase.js` deve tentar gravar/atualizar o payload completo e, caso o PostgreSQL retorne erro de coluna inexistente (`PGRST204` / `column ... does not exist`), fazer fallback automático mapeando os metadados extras no campo `observacoes_internas` / colunas legadas e alertar de forma amigável, enquanto o script `supabase_migration_kanban_manutencao.sql` adiciona todas as colunas definitivamente.
2. **Clique no botão do WhatsApp ou botão de editar raia disparando abertura do modal ou drag acidental:** O `PointerSensor` do `@dnd-kit` deve ter `activationConstraint: { distance: 6 }` e o botão de WhatsApp no card deve usar `onClick={(e) => { e.stopPropagation(); ... }}` e `onPointerDown={(e) => e.stopPropagation()}`.
3. **Duplicação de lançamento financeiro ao mover um card para "Finalizado" mais de uma vez:** `db.ordem_servico.triggerFinanceiroFromOS(os, subtotalItens)` deve verificar no Supabase se já existe lançamento em `financeiro` vinculado àquela OS (por `os_id` ou descrição contendo `#${os.numero_os}`) antes de inserir, atualizando o valor caso ainda esteja `Pendente`.
4. **Card movido para "Finalizado" sem cliente ou com valor zero:** Deve permitir a movimentação normalmente e gerar o lançamento em `financeiro` com `status: 'Pendente'` ("A Conferir") e `valor: Number(valorTotal || 0)`, garantindo que toda manutenção finalizada apareça na lista financeira para conferência.
5. **Status legados no banco (`em_diagnostico`, `em_execucao`, `pronto_retirada`, `entregue`):** A função normalizadora `normalizeKanbanStatus(status)` deve mapear automaticamente `em_diagnostico -> em_analise`, `em_execucao -> aprovado_execucao` e `pronto_retirada / entregue -> finalizado` para que nenhum card antigo suma do quadro Kanban.

---

### Task 1: Dependências, Configuração de Chunks (`vite.config.js`) e Script SQL de Migração

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.js`
- Modify: `frontend/supabase_schema.sql`
- Create: `frontend/supabase_migration_kanban_manutencao.sql`

**Interfaces:**
- Produces: Pacotes `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `framer-motion`, `canvas-confetti`, `react-parallax-tilt` instalados em `frontend/package.json`, separados em `manualChunks` (`vendor-kanban`) no `vite.config.js`, e script SQL idempotente pronto para o SQL Editor do Supabase.

- [ ] **Step 1: Instalar pacotes de Kanban, animação e confete em `frontend/package.json`**
  Executar `npm.cmd install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities framer-motion canvas-confetti react-parallax-tilt --legacy-peer-deps` em `e:\RG TECH\frontend`.

- [ ] **Step 2: Atualizar `manualChunks` em `frontend/vite.config.js`**
  Adicionar separação para `@dnd-kit`, `framer-motion`, `canvas-confetti` e `react-parallax-tilt` em `vendor-kanban` para manter o bundle inicial da Landing Page abaixo de 350 KB.

- [ ] **Step 3: Criar `frontend/supabase_migration_kanban_manutencao.sql` e atualizar `frontend/supabase_schema.sql`**
  Incluir `ALTER TABLE public.ordem_servico` adicionando `titulo`, `prioridade`, `posicao`, `problema_relatado`, `desconto`, `valor_total`, `condicoes_pagamento`, removendo a constraint antiga de `status` e criando a nova constraint com os 6 status do Kanban + legados; adicionar `nome` em `public.os_itens` e `os_id` em `public.financeiro`.

---

### Task 2: Sistema de Cores em Degradê (`index.css`, `LandingPage.jsx`, `Login.jsx`, `Layout.jsx`, `App.jsx`)

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/LandingPage.jsx`
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `frontend/src/components/Layout.jsx`

**Interfaces:**
- Produces: Variáveis e classes utilitárias CSS da paleta `#021024`, `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF`; `LandingPage.jsx`, `Login.jsx` e `Layout.jsx` estilizados com degradês profundos; item de menu lateral renomeado de `"Ordens de OS"` para `"Manutenção"`.

- [ ] **Step 1: Atualizar `frontend/src/index.css` com a nova paleta e utilitários de degradê**
  Definir `--color-bg-deep: #021024`, `--color-navy: #052659`, `--color-steel: #5483B3`, `--color-sky: #7DA0CA`, `--color-ice: #C1E8FF`, classes `.glass`, `.hero-gradient`, `.rg-gradient-bg`, `.rg-gradient-btn`, `.rg-gradient-card` e animações suaves.

- [ ] **Step 2: Atualizar `frontend/src/pages/LandingPage.jsx` e `frontend/src/pages/Login.jsx`**
  Aplicar os degradês da nova paleta (`#021024` → `#052659` → `#5483B3` → `#7DA0CA` → `#C1E8FF`) em todas as seções, botões, badges, cards (com efeito 3D/tilt suave e bordas iluminadas em `#7DA0CA`/`#C1E8FF`), preservando as regras de SEO e performance (`validate_sdd.mjs`).

- [ ] **Step 3: Atualizar `frontend/src/components/Layout.jsx` e `frontend/src/App.jsx`**
  Trocar `"Ordens de OS"` por `"Manutenção"` na Sidebar, aplicar o degradê `#021024` / `#052659` / `#5483B3` / `#C1E8FF` na Sidebar, Header e itens ativos.

---

### Task 3: Serviços Supabase (`src/services/supabase.js`) e Utilitário de Sons Táteis (`src/utils/kanbanAudio.js`)

**Files:**
- Create: `frontend/src/utils/kanbanAudio.js`
- Modify: `frontend/src/services/supabase.js`

**Interfaces:**
- Produces:
  - `kanbanAudio`: `{ playPickup(), playHover(), playDrop(), playSuccess(), isMuted(), toggleMute() }`
  - `DEFAULT_KANBAN_COLUMNS`: array com as 6 raias padrão (`recebido`, `em_analise`, `orcamento_enviado`, `aprovado_execucao`, `finalizado`, `aguardando_peca`)
  - `normalizeKanbanStatus(status)`: converte status legados para os IDs das 6 raias
  - `db.ordem_servico`: suporte a criação rápida (`createCard`), reordenação (`updatePositions`), atualização completa (`update`), mudança de raia/status (`updateStatus`) com gatilho automático `triggerFinanceiroFromOS` quando `status === 'finalizado'`
  - `db.orcamentos`: mantém geração de financeiro para orçamento avulso aprovado, mas **remove** `await db.ordem_servico.triggerFromOrcamento(...)` para desacoplar Orçamentos Avulsos da Manutenção.

- [ ] **Step 1: Criar `frontend/src/utils/kanbanAudio.js`**
  Implementar sintetizador leve via Web Audio API (sem arquivos MP3 externos pesados) para sons táteis de *pickup* (pop suave ao segurar o card), *drop* (clique macio ao soltar na raia) e *success chime* (acorde harmônico ao finalizar manutenção), com estado de mute persistido em `localStorage`.

- [ ] **Step 2: Atualizar `frontend/src/services/supabase.js`**
  - Desacoplar `db.orcamentos.insert` e `db.orcamentos.updateStatus` de `db.ordem_servico.triggerFromOrcamento`.
  - Atualizar `db.ordem_servico` com suporte às novas colunas (`titulo`, `prioridade`, `posicao`, `problema_relatado`, `desconto`, `valor_total`, `condicoes_pagamento`), fallback resiliente caso a migração SQL ainda não tenha sido aplicada no Supabase, e função `triggerFinanceiroFromOS(os)` chamada automaticamente quando o card vai para `finalizado`.

---

### Task 4: Quadro Kanban de Manutenção Estilo Trello (`src/pages/admin/OrdemServico.jsx`)

**Files:**
- Modify: `frontend/src/pages/admin/OrdemServico.jsx`

**Interfaces:**
- Consumes: `db` e `DEFAULT_KANBAN_COLUMNS`, `normalizeKanbanStatus` de `src/services/supabase.js`; `kanbanAudio` de `src/utils/kanbanAudio.js`; `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `framer-motion`, `canvas-confetti`, `html2pdf.js`.
- Produces: Componente completo `OrdemServico` (Manutenção Kanban) com:
  1. Barra superior em degradê com busca, filtro de prioridade, botão de som ligado/mudo e botão "+ Nova Manutenção".
  2. 6 colunas/raias estilo Trello com **título editável** (ícone de lápis `✏️` que salva em `db.configuracoes.upsert`), contador de cards e botão `+` para abrir a caixa de adição rápida logo abaixo do título da raia (idêntico ao print `image2.png`: caixa branca/destacada com `"Título do cartão..."`, seletor rápido opcional de cliente/prioridade, botão **Adicionar** e **X**).
  3. Drag & Drop fluido (`DndContext`, `SortableContext`, `verticalListSortingStrategy`, `DragOverlay`):
     - Reordenação vertical (um card acima/abaixo do outro na mesma raia) atualizando `posicao`.
     - Movimentação entre raias atualizando `status` automaticamente no card e no Supabase.
     - `DragOverlay` mostrando o card sendo arrastado com `scale(1.04) rotate(2deg)` e sombra luminosa `#7DA0CA`, enquanto o slot na coluna exibe placeholder tracejado suave.
     - Ao soltar na raia **Finalizado** (`finalizado`), dispara `confetti()` nas cores `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF`, toca o som de conclusão e gera automaticamente o lançamento `"A Conferir"` (`Pendente`) no Financeiro.
  4. Card rico com: Título, Nome do Cliente + **ícone do WhatsApp** clicável (abre conversa direta com o cliente no WhatsApp), data prevista, badge do **Status atual** (atualizado conforme a raia), badge de **Prioridade** (`Baixa`, `Média`, `Alta`, `Urgente`) e valor total.
  5. Modal completo estilo Trello ao clicar no card: permite editar título, raia/status, prioridade, cliente (com busca rápida), equipamento (tipo, marca, modelo, série, acessórios), diagnóstico/problema relatado, observações técnicas, adicionar/editar/remover peças e serviços (do catálogo ou manuais), desconto, forma de pagamento, excluir card e **Imprimir / Gerar PDF A4 (Orçamento / Ordem de Serviço)** direto de dentro do card.

- [ ] **Step 1: Implementar o Quadro Kanban completo, Cards Sortable, `DragOverlay`, Adição Rápida no Topo da Raia e Modal com PDF em `frontend/src/pages/admin/OrdemServico.jsx`**

---

### Task 5: Atualização do `Dashboard.jsx` e Demais Telas Admin com a Nova Paleta e Raias de Manutenção

**Files:**
- Modify: `frontend/src/pages/admin/Dashboard.jsx`
- Modify: `frontend/src/pages/admin/Orcamentos.jsx`
- Modify: `frontend/src/pages/admin/CriarOrcamento.jsx`
- Modify: `frontend/src/pages/admin/Financeiro.jsx`
- Modify: `frontend/src/pages/admin/Clientes.jsx`
- Modify: `frontend/src/pages/admin/Produtos.jsx`
- Modify: `frontend/src/pages/admin/Configuracoes.jsx`

**Interfaces:**
- Produces: Dashboard contabilizando as 6 novas raias da Manutenção (usando os títulos customizados salvos em `configuracoes`), somando também os itens de Manutenção finalizados/aprovados na divisão Peças vs. Serviços, e todas as páginas administrativas harmonizadas com a nova paleta `#021024`, `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF`.

- [ ] **Step 1: Atualizar `frontend/src/pages/admin/Dashboard.jsx`**
  Exibir os contadores das 6 raias da Manutenção com clique rápido levando para `/admin/ordens-servico` e aplicar os degradês `#052659` / `#5483B3` / `#7DA0CA` / `#C1E8FF` nos cards e no gráfico mensal.

- [ ] **Step 2: Harmonizar cores e degradês em `Orcamentos.jsx`, `CriarOrcamento.jsx`, `Financeiro.jsx`, `Clientes.jsx`, `Produtos.jsx` e `Configuracoes.jsx`**
  Substituir os antigos tons roxos (`#2D2B7A`, `#4A47FF`, `#c2c1ff`) pela nova paleta oficial (`#021024`, `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF`) e remover em `Orcamentos.jsx` a menção de criar OS automática.

---

### Task 6: Suite de Validação (`scripts/validate_sdd.mjs`), Build e Verificação Final

**Files:**
- Modify: `frontend/scripts/validate_sdd.mjs`

- [ ] **Step 1: Adicionar validações da Feature 002 em `frontend/scripts/validate_sdd.mjs`**
  Validar presença da nova paleta, módulo Kanban com `@dnd-kit` e `DragOverlay`, 6 raias padrão, botão WhatsApp no card, gatilho financeiro ao finalizar e script SQL de migração.

- [ ] **Step 2: Executar `npm.cmd run lint`, `npm.cmd run build` e `node scripts/validate_sdd.mjs`**
  Confirmar 0 erros de lint, 0 erros de build e 100% dos testes de especificação aprovados.
