# Tasks: Blindagem de Segurança, Code Splitting, SEO Local e Confiabilidade do ERP (`SITE-RGTECH`)

- [x] T001 Sincronizar repositório `C:\Projetos Antigravity\Jarvis\SITE-RGTECH` com `origin/main` (`https://github.com/ricardov7152/SITE-RGTECH`)
- [x] T002 Criar script de testes Spec-Driven `scripts/validate_sdd.mjs` (TDD: validado Red Phase antes e Green Phase 14/14 após implementação)
- [x] T003 [US1] Refatorar `src/App.jsx` com `React.lazy` e `Suspense` para carregar `Login`, `Layout` e todas as telas de `/admin/*` sob demanda
- [x] T004 [US1] Configurar `build.rollupOptions.output.manualChunks` em `vite.config.js` para isolar `html2pdf.js`, `@supabase/supabase-js`, `lucide-react` e `date-fns`
- [x] T005 [US1] Atualizar `src/pages/LandingPage.jsx`: remover `?v=${Date.now()}` de `/pc.png` e mover o botão `LOGIN` do topo para um link discreto `Área Técnica` no rodapé
- [x] T006 [US2] Criar `vercel.json` na raiz do projeto com `rewrites` SPA e cabeçalhos HTTP de segurança (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-XSS-Protection`)
- [x] T007 [US3] Refatorar `src/services/supabase.js` adicionando helper `getNextSequentialId` (`max + 1`) para `ORC-YYYY-XXXX` e `OS-YYYY-XXXX`
- [x] T008 [US3] Atualizar `supabase_schema.sql` com `REVOKE ALL ON TABLE ... FROM anon` e políticas RLS explícitas com `USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated')`
- [x] T009 [US4] Atualizar `index.html` com Meta Description, Keywords, Canonical, Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:locale`), Twitter Card, correção do favicon e JSON-LD `ComputerRepair`
- [x] T010 Executar suite de validação `node scripts/validate_sdd.mjs`, `npm run lint` e `npm run build` (14/14 aprovados, 0 erros)
- [x] T011 Atualizar documentação Spec-Driven (`specs/001-security-performance-seo-hardening/plan.md`, `tasks.md`)
- [x] T012 Realizar commit e `git push origin main` para disparar deploy automático na Vercel e validar em produção (`https://www.rgtechpc.com.br/`)
