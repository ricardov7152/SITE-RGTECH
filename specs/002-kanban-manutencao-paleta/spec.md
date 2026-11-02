# Feature Specification: Paleta de Cores em Degradê e Módulo Kanban de Manutenção (Estilo Trello)

**Feature Branch**: `002-kanban-manutencao-paleta`

**Created**: 2026-11-02

**Status**: Draft

**Input**: Documentação do usuário em `E:\RG TECH\mudanças rgtech.docx` (incluindo paleta de cores `image1.png` e referência de UI de adição rápida de cartão `image2.png`) + alinhamentos na conversa.

---

## 1. Intenção e Motivação (The Why)

A **RG TECH Computadores** precisa modernizar tanto a identidade visual completa do site e do painel administrativo quanto o fluxo operacional de bancada/assistência técnica:

1. **Identidade Visual Unificada em Degradê:** Adotar a nova paleta oficial de 5 tons de azul (`#021024`, `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF`) com forte presença de degradês elegantes desde a página pública de clientes (`LandingPage.jsx`) até todas as telas do Painel Administrativo (`/login`, `Layout.jsx`, `Dashboard.jsx`, etc.).
2. **Fluxo Direto de Manutenção (Kanban Estilo Trello):** O fluxo anterior obrigava criar um registro em *Orçamentos*, aprová-lo e só então gerar uma *Ordem de Serviço (OS)* em formato de tabela. Na prática diária da assistência técnica, o equipamento chega na bancada e passa por etapas visuais (*Equipamentos recebidos* → *Em analise* → *Orçamento enviado* → *Aprovado e Execução* → *Finalizado* / *Aguardando Peças*). Substituir a antiga tela de "Ordens de OS" por um quadro **Kanban interativo de Manutenção** estilo Trello elimina burocracia, dá visão imediata da bancada, permite criar cartões rapidamente direto na raia, reordenar prioridades arrastando cards com feedback sonoro/visual e automatiza o lançamento financeiro quando o serviço é **Finalizado**.
3. **Orçamentos Independentes + PDF dentro do Card:** A aba *Orçamentos* permanece no menu lateral para **orçamentos avulsos** (ex: venda de PC montado, peças ou cotações sem entrada física na bancada), enquanto cada card da **Manutenção** possui seu próprio gerador/impressor de **PDF de Orçamento / OS** embutido.

---

## 2. Objetivos, Não-Objetivos e Anti-Objetivos

### Objetivos (Goals)
- **G1 — Paleta e Degradês:** Aplicar a paleta `#021024` (azul meia-noite profundo), `#052659` (azul marinho royal), `#5483B3` (azul aço médio), `#7DA0CA` (azul céu suave) e `#C1E8FF` (azul gelo luminoso) com degradês em todo o site público e painel administrativo.
- **G2 — Troca de "Ordens de OS" por "Manutenção":** Renomear no menu lateral (`Layout.jsx`) e substituir a tabela antiga por um quadro Kanban estilo Trello com 6 raias padrão cujos nomes são **editáveis** pelo usuário e persistidos no Supabase (`configuracoes`).
- **G3 — Raias Padrão do Kanban:**
  1. `Equipamentos recebidos` (chave interna: `recebido`)
  2. `Em analise` (chave interna: `em_analise`)
  3. `Orçamento enviado` (chave interna: `orcamento_enviado`)
  4. `Aprovado e Execução` (chave interna: `aprovado_execucao`)
  5. `Finalizado` (chave interna: `finalizado`)
  6. `Aguardando Peças` (chave interna: `aguardando_peca`)
- **G4 — Adição Rápida no Topo da Raia (Conforme Print `image2.png`):** Logo abaixo do cabeçalho de cada raia, exibir área/botão para incluir novo card com caixa de texto (`"Título do cartão..."`), botão **Adicionar** e botão **X** para fechar, inserindo imediatamente no Supabase.
- **G5 — Drag & Drop Vertical e Horizontal (`@dnd-kit` + Framer Motion + Áudio Tátil + Confete):**
  - Mover cards de uma raia para outra atualiza automaticamente o `status` do card no banco de dados conforme a raia de destino.
  - Mover cards para cima ou para baixo dentro da mesma raia altera e persiste a posição (`posicao`) deles.
  - **Animação Fluida ao Arrastar (`DragOverlay` + Física Spring):**
    - Ao segurar o card, o `DragOverlay` exibe o card "descolando" com leve elevação (`scale: 1.04`), inclinação suave (`rotate: 2deg`) e sombra luminosa em degradê azul (`#7DA0CA` / `#C1E8FF`).
    - Na raia de origem/destino, um placeholder tracejado translúcido mostra exatamente onde o card vai pousar.
    - Os demais cartões abrem caminho deslizando suavemente (`@dnd-kit/sortable` + `CSS.Transform.toString(transform)` + transições suaves) a 60fps.
  - Efeitos sonoros táteis sutis (Web Audio API / ZzFX, com botão de Mute no topo do Kanban) ao pegar/soltar um card, e animação comemorativa (`canvas-confetti` nas cores `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF` + fanfarra suave) ao mover um card para **Finalizado**.
- **G6 — Visual do Card no Kanban:**
  - Título do cartão / descrição rápida do equipamento ou serviço.
  - Badge de **Prioridade** da O.S. (`Baixa`, `Média`, `Alta`, `Urgente`) e badge do status atual / data prevista.
  - **Nome do cliente** com **ícone do WhatsApp** clicável (`e.stopPropagation()`) que abre diretamente o WhatsApp do cliente cadastrado (`https://wa.me/55...`) com mensagem contextual.
- **G7 — Modal Estilo Trello ao Clicar no Card:**
  - Ao clicar sobre qualquer card, abrir modal detalhado onde é possível visualizar e editar todas as informações do equipamento (tipo, marca, modelo, nº de série, acessórios), vincular/trocar cliente (com busca rápida), alterar título, prioridade, raia/status, data de previsão, diagnóstico/problema relatado, observações técnicas, adicionar/remover peças e serviços (com cálculo automático de subtotal, desconto e total) e **Imprimir/Gerar PDF A4 (Orçamento ou Ordem de Serviço)** direto de dentro do card.
- **G8 — Gatilho Financeiro Automático ao Finalizar:**
  - Quando um card muda para a raia **Finalizado** (`finalizado`), o sistema gera automaticamente um lançamento na tabela `financeiro` com `status: 'Pendente'` (*"A Conferir"*), `tipo: 'Receita'`, `categoria: 'Manutenção'` e o valor total das peças/serviços do card (evitando duplicidade caso o card já tenha gerado financeiro anteriormente).
  - Desativar o antigo gatilho em `db.orcamentos` que criava uma Ordem de Serviço automática ao aprovar um orçamento avulso.

### Não-Objetivos (Non-Goals)
- Não remover a aba `Orçamentos` do menu lateral: ela continuará existindo para orçamentos avulsos independentes da bancada de manutenção.
- Não alterar a lógica de autenticação (`Supabase Auth`) nem enfraquecer as políticas de segurança RLS (`authenticated`).

### Anti-Objetivos (Anti-Goals — O que NÃO fazer)
- **PROIBIDO Modo Offline / LocalStorage Fallback para Dados de Negócio:** Conforme regra constitucional do `gemini.md`, todas as leituras e escritas de ordens de manutenção, itens e lançamentos financeiros devem ocorrer diretamente no Supabase.
- **Não quebrar o Code Splitting nem o script `scripts/validate_sdd.mjs`:** O bundle inicial da `LandingPage` deve continuar enxuto (`< 350 KB`), mantendo `React.lazy` para os módulos administrativos e pacotes pesados (`@dnd-kit`, `framer-motion`, `canvas-confetti`, `html2pdf.js`) isolados em chunks separados.

---

## 3. Decisões de Arquitetura e Banco de Dados (Supabase)

### 3.1. Evolução da Tabela `public.ordem_servico` (Backward-Compatible)
Para suportar 100% dos recursos do Kanban sem perder nenhuma OS já existente no banco, um script SQL de migração (`supabase_migration_kanban_manutencao.sql` + atualização de `supabase_schema.sql`) fará:
1. Remover a antiga constraint `CHECK` restritiva de `status` em `public.ordem_servico` e permitir os novos status das raias (`recebido`, `em_analise`, `orcamento_enviado`, `aprovado_execucao`, `finalizado`, `aguardando_peca`, além de manter compatibilidade com registros antigos).
2. Converter automaticamente eventuais status legados para as novas raias:
   - `em_diagnostico` → `em_analise`
   - `em_execucao` → `aprovado_execucao`
   - `pronto_retirada` / `entregue` → `finalizado`
3. Adicionar novas colunas em `public.ordem_servico` (com `ADD COLUMN IF NOT EXISTS` e defaults seguros para que a criação rápida pelo título funcione imediatamente):
   - `titulo TEXT`: Título rápido do cartão (ex: `"Formatação Notebook Dell - João"` ou `"Migração do user da recepção"`).
   - `prioridade TEXT DEFAULT 'Média'`: Prioridade da O.S. (`Baixa`, `Média`, `Alta`, `Urgente`).
   - `posicao INTEGER DEFAULT 0`: Ordem vertical do cartão dentro da raia.
   - `problema_relatado TEXT`: Diagnóstico / defeito relatado no próprio card.
   - `desconto NUMERIC(10,2) DEFAULT 0.00`: Desconto aplicado nos itens do card.
   - `valor_total NUMERIC(10,2) DEFAULT 0.00`: Valor total calculado (ou manual) da manutenção no card.
   - `condicoes_pagamento TEXT DEFAULT 'PIX ou Cartão'`: Forma de pagamento combinada.
4. Ajustar defaults de `equipamento_tipo` (`DEFAULT 'Equipamento'`), `equipamento_marca` (`DEFAULT ''`) e `data_entrega_prevista` (`DEFAULT (CURRENT_DATE + 5)`) para que o usuário possa criar um card digitando apenas o **Título do cartão** no topo da raia (exatamente como no Trello e no print `image2.png`), preenchendo o restante dos detalhes quando clicar no card.
5. Adicionar `nome TEXT` em `public.os_itens` (`ADD COLUMN IF NOT EXISTS nome TEXT`) para permitir tanto itens do catálogo quanto itens avulsos/manuais dentro do card de Manutenção.
6. Adicionar `os_id UUID REFERENCES public.ordem_servico(id) ON DELETE SET NULL` em `public.financeiro` (`ADD COLUMN IF NOT EXISTS`) para rastrear com precisão se o lançamento financeiro "A Conferir" daquela manutenção já foi gerado quando movida para **Finalizado** (com fallback automático no código caso o SQL ainda não tenha sido rodado, buscando pela descrição `Manutenção #OS-...`).

### 3.2. Títulos Editáveis das Raias (Persistência em `public.configuracoes`)
- Os nomes customizados das 6 raias serão salvos no registro JSONB `chave = 'erp_configuracoes'` dentro da propriedade `kanban_colunas`:
  ```json
  [
    { "id": "recebido", "title": "Equipamentos recebidos" },
    { "id": "em_analise", "title": "Em analise" },
    { "id": "orcamento_enviado", "title": "Orçamento enviado" },
    { "id": "aprovado_execucao", "title": "Aprovado e Execução" },
    { "id": "finalizado", "title": "Finalizado" },
    { "id": "aguardando_peca", "title": "Aguardando Peças" }
  ]
  ```
- Ao clicar no ícone de lápis (`Edit2`) ao lado do título de qualquer raia (igual ao print `image2.png` onde aparece `Urgente ✏️ 3`), o título vira um input editável; ao pressionar `Enter` ou sair do campo (`onBlur`), salva imediatamente no Supabase via `db.configuracoes.upsert`.

### 3.3. Sistema de Paleta e Degradês (`#021024`, `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF`)
- **`src/index.css`**:
  - Definir variáveis de tema e utilitários de degradê:
    - Fundo principal escuro profundo: `#021024` com degradês radiais e lineares para `#052659` e `#5483B3`.
    - Superfícies glassmorphism (`glass`): `linear-gradient(135deg, rgba(5, 38, 89, 0.45) 0%, rgba(2, 16, 36, 0.75) 100%)` com borda sutil em `rgba(193, 232, 255, 0.12)`.
    - Botões primários e destaques ativos: degradê `from-[#052659] via-[#5483B3] to-[#7DA0CA]` com hover luminoso em `#C1E8FF` (texto `#021024`).
    - Textos de destaque e badges principais em `#C1E8FF` e `#7DA0CA`.
- Aplicar de ponta a ponta em:
  - `src/pages/LandingPage.jsx` (Hero, Navbar, Cards de Serviços com tilt/hover em degradê, Diferenciais, Prova Social, FAQ, CTA e Footer)
  - `src/pages/Login.jsx`
  - `src/components/Layout.jsx` (Sidebar, Header, links ativos em degradê, nome do item trocado de `"Ordens de OS"` para `"Manutenção"`)
  - `src/pages/admin/Dashboard.jsx` (KPIs com contadores das novas raias de Manutenção e barras do gráfico com a nova paleta em degradê)
  - `src/pages/admin/OrdemServico.jsx` (Transformado no novo Kanban de **Manutenção**)
  - Demais telas do Admin (`Orcamentos.jsx`, `CriarOrcamento.jsx`, `Clientes.jsx`, `Financeiro.jsx`, `Produtos.jsx`, `Configuracoes.jsx`) harmonizadas com a nova paleta.

---

## 4. Detalhes de UX do Kanban de Manutenção (Decisões Técnicas)

1. **Área de Adição Rápida no Topo de Cada Raia (Fiel ao Print `image2.png`):**
   - Cada coluna possui no cabeçalho: ícone de arraste/coluna, **Título Editável** com ícone `✏️`, contador de cartões na direita e botão `+` (ou `"Adicionar cartão"`).
   - Quando aberta, exibe logo abaixo do título da coluna um card branco/claro ou glass destacado com:
     - `textarea` com placeholder `"Título do cartão..."`
     - Seletor rápido opcional de Prioridade (`Baixa`, `Média`, `Alta`, `Urgente`) e Cliente
     - Botão arredondado **`Adicionar`** + botão **`X`** para cancelar.
2. **Design de Cada Card na Raia:**
   - **Título principal** (ex: `titulo` ou `${equipamento_tipo} ${equipamento_marca} ${equipamento_modelo}`).
   - **Linha do Cliente + WhatsApp:** Nome do cliente (ou *"Sem cliente vinculado"*) + botão com ícone oficial do WhatsApp em verde (`#25D366`) que, ao clicar, abre `https://wa.me/55{telefone}` informando o status atual do equipamento.
   - **Rodapé de Badges (estilo print `image2.png`):**
     - Badge de data prevista (`🕒 DD/MM/YYYY`) se houver.
     - Badge do **Status atual** (nome da raia onde o card está).
     - Badge colorido de **Prioridade** (`Baixa` em azul `#5483B3`, `Média` em verde-oliva/ciano, `Alta` em âmbar, `Urgente` em vermelho/rose).
     - Valor total (`R$ ...`) quando já houver itens/orçamento no card.
3. **Automação Financeira ao Mover para "Finalizado":**
   - Ao soltar um card na raia `finalizado` (ou alterar o status para `finalizado` dentro do modal):
     - Atualiza `status = 'finalizado'` e `data_entrega_real = hoje` no Supabase.
     - Dá baixa de estoque nas peças utilizadas (se ainda não baixadas) e ativa a garantia dos itens.
     - Verifica se já existe lançamento em `financeiro` para esta OS. Se não existir, cria automaticamente um registro em `financeiro` com:
       - `tipo: 'Receita'`
       - `categoria: 'Manutenção'`
       - `descricao: 'Manutenção Finalizada #' + os.numero_os + ' - ' + nomeCliente`
       - `valor: valorTotalCalculado` (soma dos itens menos desconto, ou `valor_total` do card)
       - `status: 'Pendente'` (*A Conferir*)
       - `cliente_id: os.cliente_id`
       - `data_vencimento: hoje`
     - Caso o card seja finalizado ainda com valor `R$ 0,00`, ainda assim gera o lançamento `Pendente` ("A Conferir") no Financeiro com observação para o administrador conferir/preencher o valor cobrado, garantindo que nenhuma manutenção finalizada passe sem conferência financeira.

---

## 5. Critérios de Sucesso e Verificação

- **SC-001**: Nova paleta (`#021024`, `#052659`, `#5483B3`, `#7DA0CA`, `#C1E8FF`) e degradês aplicados na Landing Page e em todo o Painel Administrativo.
- **SC-002**: Menu lateral exibe **Manutenção** e abre o Kanban interativo com as 6 raias editáveis, adição rápida no topo de cada raia, drag-and-drop entre raias e reordenação vertical na mesma raia.
- **SC-003**: Cada card exibe prioridade, status atualizado automaticamente ao mover, nome do cliente com botão direto para o WhatsApp e abre o modal completo ao clicar (com edição de equipamento, cliente, itens e impressão de PDF A4 de Orçamento/OS).
- **SC-004**: Mover para **Finalizado** dispara som/confete e cria automaticamente o lançamento `Pendente` (*A Conferir*) na tabela `financeiro`.
- **SC-005**: `npm.cmd run build`, `npm.cmd run lint` e `node scripts/validate_sdd.mjs` executam com **0 erros**.
