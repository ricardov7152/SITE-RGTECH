# Plano de Trabalho — SITE-RGTECH + ERP Administrativo

## 🎯 Objetivos do Projeto
1. **Ponto de Entrada Comum:** Adicionar botão de "Login" no topo direito do site institucional `SITE-RGTECH`.
2. **Autenticação:** Proteger o painel ERP por meio de login de administrador (e-mail/senha) usando Supabase Auth.
3. **Módulo de Orçamentos:** Integrar o gerador de orçamentos e a listagem de orçamentos com Supabase, com suporte a envio rápido por WhatsApp Web.
4. **Módulo de Clientes (CRM):** Cadastro completo segmentado em Pessoa Física (PF) e Pessoa Jurídica (PJ) com rastreamento de origem (lead source).
5. **Módulo Financeiro (Fluxo de Caixa):**
   * Lançamentos gerados automaticamente a partir de orçamentos aprovados.
   * Lançamentos manuais de receitas e despesas.
   * Suporte a pagamentos mistos (PIX, Cartão, Dinheiro), bancos, descontos e datas de pagamento.
6. **Dashboard do ERP:** Resumo financeiro, ranking de clientes, serviços mais realizados e gráficos/estatísticas.
7. **Identidade Visual Premium:** Manter o layout do ERP dark-theme e glassmorphic coerente com o site institucional da RG TECH.

---

## 📅 Cronograma de Execução (V.L.A.E.G.)

### 🟢 Fase 1: Visão & Lógica (V)
- [x] Obter respostas às 5 Perguntas de Descoberta.
- [x] Definir esquemas de banco de dados refinados no `gemini.md`.
- [x] Criar o Blueprint de Tarefas (`task_plan.md`) e obter aprovação do Ricardo.

### 🟡 Fase 2: Link (L)
- [x] Criar arquivo `.env` em `SITE-RGTECH` contendo as credenciais do Supabase.
- [x] Verificar conexão com o banco de dados.
- [x] Rodar o script de criação de tabelas (`supabase_schema.sql` atualizado) no Supabase.

### 🟠 Fase 3: Arquitetura & Implementação (A)
- [x] Instalar dependências adicionais no `SITE-RGTECH` (`react-router-dom`, `@supabase/supabase-js`, `lucide-react`, `html2pdf.js`, `date-fns`).
- [x] Implementar a estrutura de roteamento (`react-router-dom`) com rotas públicas para a Landing Page e rotas protegidas (`/admin/*`) para o painel ERP.
- [x] Desenvolver tela de **Login** integrada com o Supabase Auth.
- [x] Criar a camada de conexão e serviços API para Supabase (`src/services/supabase.js`).
- [x] Desenvolver as telas do ERP (dentro de um Layout unificado com menu lateral esquerdo):
  - [x] **Dashboard:** Estatísticas financeiras (Faturamento, Receitas, Despesas, Pendências), ranking de clientes e serviços mais feitos.
  - [x] **Clientes:** Cadastro unificado de PF/PJ e controle de origens (Google, Instagram, etc.).
  - [x] **Produtos/Serviços:** Cadastro e listagem de itens.
  - [x] **Orçamentos:** Tela de criação de orçamento (inserção em lote dos itens, cálculo de totais, dados do equipamento, etc.) e listagem geral.
  - [x] **Financeiro:** Lançamentos automáticos a partir de orçamentos e lançamentos manuais de despesas/receitas (conciliação bancária, pix, cartão, dinheiro).
- [x] Implementar a automação de trigger: Orçamento aprovado -> Cria Lançamento Financeiro "A Conferir" automático.
- [x] Implementar botão "Enviar por WhatsApp" nos orçamentos.

### 🔵 Fase 4: Estilo & UI/UX (E)
- [x] Reformular os componentes do ERP usando Tailwind CSS v4 para combinar com a identidade visual dark e neon-blue do site.
- [x] Refinar o layout da folha A4 de orçamentos para impressão em PDF.
- [x] Adicionar micro-animações e feedbacks visuais em botões/telas.

### 🔴 Fase 5: Gatilho & Deploy (G)
- [x] Executar compilação de produção (`npm run build`) para verificar erros de build.
- [ ] Subir as alterações no repositório GitHub.
