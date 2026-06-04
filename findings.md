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
