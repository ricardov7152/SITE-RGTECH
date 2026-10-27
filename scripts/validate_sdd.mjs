import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`✅ [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

console.log('==========================================================');
console.log('🧪 SPEC-DRIVEN VALIDATION SUITE — SITE-RGTECH (001)');
console.log('==========================================================\n');

// 1. FR-001 & FR-002: Code Splitting & Lazy Loading in App.jsx and vite.config.js
const appJsx = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');
check(
  'FR-001: React.lazy e Suspense configurados em src/App.jsx',
  appJsx.includes('lazy(') && appJsx.includes('<Suspense'),
  'Módulos administrativos devem ser carregados sob demanda'
);

const viteConfig = fs.readFileSync(path.join(rootDir, 'vite.config.js'), 'utf8');
check(
  'FR-002: manualChunks configurado em vite.config.js',
  viteConfig.includes('manualChunks'),
  'Separação de pacotes pesados (html2pdf, supabase, lucide)'
);

// 2. FR-003: LandingPage.jsx sem cache-busting Date.now() e sem botão LOGIN no topo
const landingJsx = fs.readFileSync(path.join(rootDir, 'src/pages/LandingPage.jsx'), 'utf8');
check(
  'FR-003a: Imagem /pc.png sem ?v=${Date.now()} em LandingPage.jsx',
  !landingJsx.includes('pc.png?v=${Date.now()}'),
  'Permite cache da imagem principal no navegador'
);

const navSection = landingJsx.split('{/* ── Hero Section ── */}')[0] || '';
check(
  'FR-003b: Botão LOGIN removido da barra de navegação superior da LandingPage',
  !navSection.includes('>LOGIN<') && !navSection.includes('>\n              LOGIN\n'),
  'Acesso técnico movido discretamente para o rodapé'
);

// 3. FR-004: vercel.json com SPA rewrites e Security Headers
const vercelJsonPath = path.join(rootDir, 'vercel.json');
const hasVercelJson = fs.existsSync(vercelJsonPath);
check('FR-004a: Arquivo vercel.json existe na raiz', hasVercelJson);

if (hasVercelJson) {
  const vercelCfg = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  const hasSpaRewrite = Array.isArray(vercelCfg.rewrites) &&
    vercelCfg.rewrites.some(r => r.destination === '/index.html');
  check('FR-004b: Rewrite SPA para /index.html configurado (corrige 404 em /login e /admin)', hasSpaRewrite);

  const allHeaders = (vercelCfg.headers || []).flatMap(h => h.headers || []).map(h => h.key.toLowerCase());
  const requiredHeaders = ['x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
  const missingHeaders = requiredHeaders.filter(h => !allHeaders.includes(h));
  check(
    'FR-004c: Cabeçalhos HTTP de segurança configurados no vercel.json',
    missingHeaders.length === 0,
    missingHeaders.length ? `Faltando: ${missingHeaders.join(', ')}` : 'Todos presentes'
  );
}

// 4. FR-005: SEO Local, Open Graph, Favicon e JSON-LD no index.html
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
check(
  'FR-005a: Meta Description e Canonical presentes no index.html',
  indexHtml.includes('name="description"') && indexHtml.includes('rel="canonical"')
);
check(
  'FR-005b: Tags Open Graph (og:title, og:description, og:image, og:url) presentes no index.html',
  indexHtml.includes('property="og:title"') &&
  indexHtml.includes('property="og:description"') &&
  indexHtml.includes('property="og:image"') &&
  indexHtml.includes('property="og:url"')
);
check(
  'FR-005c: Schema.org JSON-LD (ComputerRepair / LocalBusiness) presente no index.html',
  indexHtml.includes('application/ld+json') && indexHtml.includes('ComputerRepair')
);

// 5. FR-006: Geração de IDs sem colisão (max + 1) em src/services/supabase.js
const supabaseJs = fs.readFileSync(path.join(rootDir, 'src/services/supabase.js'), 'utf8');
check(
  'FR-006: Geração de IDs de Orçamento e OS livre de colisão por count (usa getNextSequentialId)',
  supabaseJs.includes('getNextSequentialId') && !supabaseJs.includes('1000 + (count || 0) + 1') && !supabaseJs.includes('1000 + count + 1'),
  'Evita erro de chave duplicada após exclusão de registros'
);

// 6. FR-007: Blindagem RLS no supabase_schema.sql
const schemaSql = fs.readFileSync(path.join(rootDir, 'supabase_schema.sql'), 'utf8');
check(
  'FR-007: Políticas RLS com WITH CHECK e REVOKE ALL FROM anon em supabase_schema.sql',
  schemaSql.includes('WITH CHECK') && schemaSql.includes('REVOKE ALL'),
  'Garante bloqueio explícito para role anon nas 9 tabelas'
);

// 7. SC-001: Verificação do tamanho do bundle inicial em dist/assets/
const distAssetsDir = path.join(rootDir, 'dist/assets');
if (fs.existsSync(distAssetsDir)) {
  const files = fs.readdirSync(distAssetsDir);
  const indexJsFile = files.find(f => /^index-.*\.js$/.test(f));
  const jsFiles = files.filter(f => f.endsWith('.js'));
  if (indexJsFile) {
    const stats = fs.statSync(path.join(distAssetsDir, indexJsFile));
    const sizeKb = (stats.size / 1024).toFixed(1);
    check(
      'SC-001a: Bundle JS inicial (index-*.js) menor que 350 KB',
      stats.size < 350 * 1024,
      `Tamanho atual: ${sizeKb} KB`
    );
    check(
      'SC-001b: Múltiplos chunks JS gerados pelo Code Splitting',
      jsFiles.length >= 8,
      `Total de chunks JS em dist/assets: ${jsFiles.length}`
    );
  } else {
    check('SC-001a: Arquivo index-*.js encontrado em dist/assets', false, 'Execute npm run build');
  }
} else {
  check('SC-001: Pasta dist/assets existe', false, 'Execute npm run build');
}

console.log('\n==========================================================');
console.log(`📊 RESULTADO: ${passed} aprovados | ${failed} falharam`);
console.log('==========================================================');

if (failed > 0) {
  process.exit(1);
}
