# Descobertas e Restrições — SITE-RGTECH & ERP

## 🔍 Visão Geral do Site Atual (SITE-RGTECH)
* **Design:** Estilo dark-theme muito elegante, com gradientes escuros (`#0D0D0D` e azul/roxo `#2D2B7A`), efeito glassmorphism nas seções e tipografia profissional utilizando Google Fonts (`Inter` e `Material Symbols Outlined`).
* **Estrutura:** Frontend puramente em React e Tailwind CSS v4 (`@tailwindcss/postcss`).
* **Fontes de Ícones:** Usa `Material Symbols Outlined` importados no `index.html`.
* **WhatsApp:** Links de WhatsApp estão apontando para o número `(66) 9 9929-8666`.

## ⚙️ Diferenças de Dependências entre os Projetos
Para unir o gerador de orçamentos ao site principal, precisaremos instalar no `SITE-RGTECH`:
- `react-router-dom` para o roteamento do site corporativo e do painel admin.
- `@supabase/supabase-js` para conexão com o banco.
- `lucide-react` para os ícones do painel administrativo (ou podemos mesclar com o Material Symbols que já está no index.html, mas Lucide é muito comum e prático).
- `html2pdf.js` para a geração de PDF.
- `date-fns` para manipulação e formatação de datas.

## 🗄️ Detalhes da Integração com o Supabase
* O arquivo `.env` com a URL e chave anônima inicial deve ser criado na pasta raiz do `SITE-RGTECH`.
* O script de banco de dados precisará ser expandido para acomodar a tabela `financeiro` e os campos extras de `clientes` (PF/PJ e Origem) definidos em [gemini.md](file:///C:/Projetos%20Antigravity/Jarvis/SITE-RGTECH/gemini.md).

## ⚙️ Descobertas de 2026-07-02
* **Filtros e Visualização:** O ERP agora suporta fechamento mensal e cálculo de crescimento focado no período selecionado, retroativo de forma irrestrita a partir de Janeiro de 2026.
* **Integridade de Datas:** Ao realizar um lançamento retroativo de orçamento, o fluxo de trigger propaga a data de emissão para a OS (`data_abertura`) e para o financeiro (`data_vencimento`), garantindo que o fechamento histórico permaneça perfeitamente alinhado.
* **Políticas PowerShell:** O comando de build de produção no ambiente local Windows do usuário deve ser sempre executado via `npm.cmd run build` para desviar de restrições de script locais.
* **Segurança e Estabilidade de Datas:** Passar objetos `Date` mal formatados ou compostos para a função `format` da biblioteca `date-fns` causa falhas silenciosas de tempo de execução (RangeError) que travam o renderizador do React, exibindo uma tela em branco. Toda formatação de data de templates (mesmo ocultos no DOM como o PDF) deve ser higienizada via tratamento de string pura para garantir imunidade a falhas.

## ⚙️ Descobertas de 2026-07-08
* **Persistência Cloud-side:** Armazenar configurações dinâmicas e dados acumulativos históricos (como metas de faturamento passadas) em `localStorage` resulta em quebras de consistência e reinicialização de metas quando o ERP é acessado em novos domínios, guias anônimas ou outros navegadores.
* **Modelo JSONB Flexível:** A criação de uma única tabela `configuracoes` com chave e valor em formato `JSONB` no Supabase permite persistir objetos de configuração dinâmicos do JavaScript inteiros de forma segura, mantendo a simplicidade de CRUD no frontend e flexibilidade para adicionar novos parâmetros operacionais no futuro sem alterações no DDL.
