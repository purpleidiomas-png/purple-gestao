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
assert(config.includes('purple-gestao-v156'), 'auth/config.js deve apontar para cache v156');
assert(app.includes('purple-gestao-v156'), 'app.js deve apontar para cache v156');
assert(index.includes('app.js?v=156'), 'index.html deve apontar para app v156');
assert(index.includes('styles.css?v=80'), 'index.html deve apontar para styles v80');

console.log('bootstrap/cache smoke test ok');
