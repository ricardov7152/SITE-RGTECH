# Feature Specification: Blindagem de Segurança, Code Splitting, SEO Local e Confiabilidade do ERP

**Feature Branch**: `001-security-performance-seo-hardening`

**Created**: 2026-10-27

**Status**: Draft (Awaiting Approval)

**Input**: Auditoria técnica e de segurança do domínio `https://www.rgtechpc.com.br/` (repositório `SITE-RGTECH`).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Isolamento de Bundle (Code Splitting) e Carregamento Rápido no Mobile (Priority: P1)

Um potencial cliente em Sorriso-MT acessa `https://www.rgtechpc.com.br/` pelo celular (4G) procurando assistência técnica. Ele deve baixar apenas o código necessário para a Landing Page, sem baixar o código pesado do ERP administrativo (`jspdf`, `html2pdf.js`, telas de financeiro, ordens de serviço, clientes e orçamentos) e sem rebaixar a imagem principal (`/pc.png`) a cada renderização.

**Why this priority**: Atualmente o bundle único tem **1,63 MB** minificado porque o ERP inteiro e o gerador de PDF são carregados na abertura da Landing Page, prejudicando o tempo de carregamento, a pontuação no Google PageSpeed e expondo imediatamente todas as telas administrativas e estrutura de tabelas no pacote inicial.

**Independent Test**: Executar `npm run build` e verificar na pasta `dist/assets/` que o bundle principal inicial (`index-*.js`) caiu de ~1,63 MB para menos de 350 KB, que as rotas `/admin/*` geram chunks separados sob demanda (`React.lazy`), e que a imagem `/pc.png` não contém `?v=${Date.now()}`.

**Acceptance Scenarios**:

1. **Given** um visitante acessando `/`, **When** a página inicial carrega, **Then** apenas o bundle público e a Landing Page são baixados, sem carregar os módulos de `/admin/*` nem `html2pdf.js`.
2. **Given** a seção Hero da Landing Page, **When** o componente renderiza, **Then** a imagem `/pc.png` é carregada de forma estática permitindo cache do navegador.
3. **Given** um visitante na Landing Page pública, **When** visualiza o menu de navegação superior, **Then** o botão `LOGIN` administrativo não fica exposto no topo comercial (o acesso administrativo ocorre via URL direta `/login` ou link discreto no rodapé).

---

### User Story 2 - Correção de Rotas SPA na Vercel e Cabeçalhos HTTP de Segurança (Priority: P1)

Quando o administrador acessa diretamente `https://www.rgtechpc.com.br/login` ou atualiza a página (F5) dentro de `/admin/dashboard`, a Vercel não deve retornar erro `404 Not Found`. Além disso, todas as respostas HTTP devem incluir cabeçalhos de segurança contra Clickjacking, MIME-sniffing e vazamento de origem.

**Why this priority**: Atualmente o projeto possui apenas um arquivo `public/.htaccess` (que só funciona em servidores Apache e é ignorado pela Vercel). Por isso, dar F5 em `/login` ou `/admin/dashboard` em produção retorna **HTTP 404 Not Found**, e o site não envia `X-Frame-Options`, `X-Content-Type-Options` nem `Referrer-Policy`.

**Independent Test**: Validar a presença e sintaxe do arquivo `vercel.json` na raiz do projeto contendo `rewrites` para `/index.html` e `headers` de segurança (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`).

**Acceptance Scenarios**:

1. **Given** o site hospedado na Vercel, **When** o usuário acessa diretamente `/login` ou dá F5 em `/admin/orcamentos`, **Then** a Vercel serve o `/index.html` com status `200` e o React Router renderiza a tela correta.
2. **Given** qualquer resposta HTTP do domínio, **When** os cabeçalhos são inspecionados, **Then** estão presentes `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy`.

---

### User Story 3 - Blindagem RLS do Supabase e Geração de IDs sem Colisão no ERP (Priority: P1)

O administrador utiliza o ERP para criar e excluir orçamentos (`ORC-YYYY-XXXX`) e ordens de serviço (`OS-YYYY-XXXX`), e precisa de garantia de que:
1. A exclusão de um orçamento ou OS antigo não cause colisão de chave primária (`duplicate key value violates unique constraint`) ao criar o próximo registro.
2. O script `supabase_schema.sql` tenha políticas RLS explícitas (`USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated')`) e `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon` documentado/aplicável para garantir zero acesso anônimo às 9 tabelas.

**Why this priority**: Atualmente o código calcula o ID fazendo `1000 + count + 1`. Se houver 5 orçamentos (`1001` a `1005`) e o `1002` for excluído, o `count` volta para `4` e o próximo orçamento tenta usar `ORC-2026-1005` (que já existe!), travando o salvamento.

**Independent Test**: Verificar no código de `src/services/supabase.js` que a função geradora de ID consulta o maior número sequencial existente no ano corrente (`max + 1`) em vez de `count`, e validar o script SQL de blindagem RLS.

**Acceptance Scenarios**:

1. **Given** que existem os orçamentos `ORC-2026-1001` e `ORC-2026-1003` (porque o `1002` foi apagado), **When** um novo orçamento é criado, **Then** o sistema gera `ORC-2026-1004` sem erro de chave duplicada.
2. **Given** o mesmo cenário em `ordem_servico`, **When** uma nova OS é gerada a partir de um orçamento aprovado, **Then** o sistema gera o próximo `numero_os` sequencial baseado no maior número existente (`max + 1`).

---

### User Story 4 - SEO Local (Sorriso-MT) e Prévia Rica no WhatsApp (Open Graph) (Priority: P2)

Quando a RG TECH envia o link `https://www.rgtechpc.com.br/` para um cliente no WhatsApp ou quando um morador de Sorriso-MT pesquisa "assistência técnica computador Sorriso MT" no Google, o link deve exibir título, descrição persuasiva, miniatura visual (`og:image`), ícone correto e dados estruturados (`Schema.org LocalBusiness`).

**Why this priority**: Melhora diretamente a taxa de cliques no Google e passa profissionalismo imediato quando o link é enviado nas prospecções via WhatsApp.

**Independent Test**: Inspecionar `index.html` e verificar a presença das tags `<meta name="description">`, `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`, link de favicon válido e bloco `<script type="application/ld+json">` com endereço e telefone da RG TECH em Sorriso-MT.

**Acceptance Scenarios**:

1. **Given** o arquivo `index.html`, **When** inspecionado por crawlers do WhatsApp/Google, **Then** todas as meta tags de SEO, Open Graph e JSON-LD `ComputerRepair` / `LocalBusiness` estão preenchidas com os dados reais da RG TECH em Sorriso-MT.

---

### Edge Cases

- **Queda de conexão ao carregar chunk lazy (`/admin/*`)**: O `Suspense` do React deve exibir o loader dark-mode padrão da RG TECH (`Verificando módulos...`) sem tela branca.
- **Primeiro orçamento ou OS do ano**: Se não houver nenhum registro para o ano atual (`2026`), o gerador de ID deve iniciar em `ORC-2026-1001` / `OS-2026-1001`.
- **Orçamentos com ID personalizado**: Se o usuário informar manualmente o `id`, o sistema respeita o ID informado.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O `src/App.jsx` DEVE carregar `Login` e todas as páginas de `/admin/*` usando `React.lazy` e `Suspense`, isolando o código do ERP do bundle da `LandingPage`.
- **FR-002**: O `vite.config.js` DEVE configurar `build.rollupOptions.output.manualChunks` para separar bibliotecas pesadas (`html2pdf.js`, `@supabase/supabase-js`, `lucide-react`) do pacote inicial da Landing Page.
- **FR-003**: O `src/pages/LandingPage.jsx` DEVE remover `?v=${Date.now()}` da imagem `/pc.png` e remover o botão `LOGIN` de destaque da barra de navegação superior (movendo um acesso discreto `Área Técnica` para o rodapé).
- **FR-004**: O projeto DEVE conter um arquivo `vercel.json` na raiz configurando `rewrites` de SPA (`/(.*)` -> `/index.html`) e cabeçalhos de segurança HTTP (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- **FR-005**: O `index.html` DEVE incluir meta tags completas de SEO, Open Graph (`og:title`, `og:description`, `og:image`, `og:type`, `og:locale`), correção do link de favicon e dados estruturados JSON-LD (`LocalBusiness` / `ComputerRepair` em Sorriso-MT).
- **FR-006**: O `src/services/supabase.js` DEVE gerar IDs sequenciais de `orcamentos` (`ORC-YYYY-XXXX`) e `ordem_servico` (`OS-YYYY-XXXX`) buscando o maior sufixo numérico existente no ano corrente (`max + 1`), eliminando colisões após exclusões.
- **FR-007**: O `supabase_schema.sql` DEVE incluir cláusulas `WITH CHECK (true)` nas políticas `TO authenticated` e comandos explícitos revogando permissões de leitura/escrita do role `anon` nas 9 tabelas do ERP.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Redução do bundle JS inicial carregado na Landing Page (`/`) de **1.632 KB** para **menos de 300 KB** (redução > 80%).
- **SC-002**: `npm run build` e `npm run lint` executando com **0 erros**.
- **SC-003**: Script automatizado de validação Spec-Driven (`scripts/validate_sdd.mjs`) aprovando 100% dos checks (Code Splitting, SEO/OG tags, `vercel.json` headers/rewrites, ausência de `Date.now()` em assets, e lógica de ID sem colisão).
