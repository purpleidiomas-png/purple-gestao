const assert=require('node:assert');
const fs=require('node:fs');

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const config=fs.readFileSync('auth/config.js','utf8');
const app=fs.readFileSync('app.js','utf8');

assert(index.includes('core/supabase-service.js'), 'index.html deve carregar core/supabase-service.js');
assert(index.includes('core/permissions-service.js'), 'index.html deve carregar core/permissions-service.js');
assert(index.includes('core/system-status.js'), 'index.html deve carregar core/system-status.js');
assert(index.includes('core/ui-service.js'), 'index.html deve carregar core/ui-service.js');
assert(sw.includes('core/supabase-service.js'), 'service worker deve versionar core/supabase-service.js');
assert(sw.includes('core/ui-service.js'), 'service worker deve versionar core/ui-service.js');
assert(sw.includes('networkFirst(request)'), 'service worker deve usar network-first para arquivos críticos');
assert(config.includes('purple-gestao-v231'), 'auth/config.js deve apontar para cache v231');
assert(app.includes('purple-gestao-v230'), 'app.js deve possuir fallback de cache compatível');
assert(index.includes('auth/config.js?v=94'), 'index.html deve apontar para config v94');
assert(index.includes('auth/bootstrap.js?v=16'), 'index.html deve apontar para bootstrap v16');
assert(index.includes('app.js?v=225'), 'index.html deve apontar para app v225');
assert(sw.includes('app.js?v=225'), 'service worker deve versionar app v225');
assert(index.includes('styles.css?v=214'), 'index.html deve apontar para styles v214');
assert(index.includes('core/ui-service.js?v=2'), 'index.html deve apontar para ui-service v2');
assert(index.includes('modules/financial-center.js?v=2'), 'index.html deve carregar a central financeira antes do app');
assert(sw.includes('modules/financial-center.js?v=2'), 'service worker deve versionar a central financeira');
assert(index.includes('modules/lesson-plans.js?v=25'), 'index.html deve carregar Lesson Plans antes do app');
assert(sw.includes('modules/lesson-plans.js?v=25'), 'service worker deve versionar Lesson Plans');
assert(sw.includes('modules\\/lesson-plans\\.js'), 'service worker deve tratar Lesson Plans como asset crítico');
assert(sw.includes('assets/lesson-plans/purple-way-collection-cover-originals.png'), 'service worker deve cachear a capa padrão Purple Way com capas originais');
assert(sw.includes('assets/lesson-plans/purple-way-discover-cover.png'), 'service worker deve cachear as capas oficiais dos livros Purple Way');
assert(index.includes('modules/book-production.js?v=10'), 'index.html deve carregar Produção de Livros');
assert(sw.includes('modules/book-production.js?v=10'), 'service worker deve versionar Produção de Livros');

console.log('bootstrap/cache smoke test ok');
