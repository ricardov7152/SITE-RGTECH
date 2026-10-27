# Plano de Implementação (Spec-Driven): Blindagem, Performance e SEO — `rgtechpc.com.br`

**Repositório Alvo**: `https://github.com/ricardov7152/SITE-RGTECH`  
**Domínio em Produção**: `https://www.rgtechpc.com.br/`  
**Especificação SDD**: `specs/001-security-performance-seo-hardening/spec.md`  
**Constituição do Projeto**: `gemini.md`

---

## 1. Resumo Executivo & Diagnóstico

| # | Problema Encontrado | Impacto Atual | Solução Implementada |
| :--- | :--- | :--- | :--- |
| **1** | **Bundle Único de 1,63 MB** | Visitantes da Landing Page no 4G baixavam todo o código do ERP + gerador de PDF (`html2pdf.js`) sem necessidade, expondo todas as telas do ERP logo na entrada. | **Code Splitting (`React.lazy` + `manualChunks`)**: Separamos a Landing Page (~244 KB) dos módulos do ERP (`/admin/*`), que agora só são baixados sob demanda em 18 chunks independentes. |
| **2** | **Erro 404 ao atualizar `/login` ou `/admin/*` na Vercel + Falta de Headers HTTP** | Dar F5 em `rgtechpc.com.br/login` ou `/admin/dashboard` retornava `404 Not Found` na Vercel; faltavam headers contra Clickjacking e XSS. | Criado `vercel.json` com `rewrites` de SPA para `/index.html` e cabeçalhos `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e `X-XSS-Protection`. |
| **3** | **Botão `LOGIN` exposto no topo + Cache quebrado em `/pc.png`** | Botão `LOGIN` no topo distraía visitantes e atraía curiosos; `src="/pc.png?v=${Date.now()}"` impedia cache da imagem principal. | Removido `?v=${Date.now()}` da Hero e movido o link de acesso interno discretamente para o final do rodapé (`Área Técnica`). |
| **4** | **Colisão de IDs (`ORC-2026-XXXX` e `OS-2026-XXXX`) após exclusão** | O código usava `1000 + count + 1`. Ao apagar um orçamento antigo, o `count` diminuía e o próximo orçamento falhava por chave duplicada. | Refatorado `src/services/supabase.js` com `getNextSequentialId` para calcular o próximo ID buscando o **maior número sequencial já emitido no ano (`max + 1`)**. |
| **5** | **Blindagem RLS no Supabase** | As políticas em `supabase_schema.sql` não tinham `WITH CHECK` explícito nem `REVOKE` explícito para o role `anon`. | Atualizado `supabase_schema.sql` com `REVOKE ALL` para `anon` e políticas `USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated')` nas 9 tabelas. |
| **6** | **Falta de SEO Local, Open Graph (WhatsApp) e JSON-LD** | Enviar `rgtechpc.com.br` no WhatsApp não gerava prévia com foto/descrição, e o Google não recebia Schema `ComputerRepair` de Sorriso-MT. | Enriquecido `index.html` com Meta Description, Open Graph completo, correção do favicon e Schema.org `ComputerRepair`. |

---

## 2. Resultado da Validação Spec-Driven (`validate_sdd.mjs`)

- **Bundle Inicial (`index-*.js`)**: Reduzido de **1.595,6 KB** para **244,0 KB** (**redução de 84,7%**).
- **Testes Spec-Driven (`node scripts/validate_sdd.mjs`)**: **14/14 aprovados (100%)**.
- **Build & Lint (`npm run build` & `npm run lint`)**: **0 erros**.
