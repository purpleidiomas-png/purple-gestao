const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const app=fs.readFileSync('app.js','utf8');
const auth=fs.readFileSync('auth/bootstrap.js','utf8');

test('fallback de login local continua restrito a host local/preview',()=>{
  assert.match(auth,/const canUseDiagnosticFallback=\(email,password,error\)=>\{if\(!isLocalPreviewHost\(\)\|\|!password\)return false;/);
  assert.doesNotMatch(auth,/canUseDiagnosticFallback[\s\S]{0,120}production/i);
});

test('blocos legacy não possuem callers ativos',()=>{
  const names=[...app.matchAll(/^(?:async\s+)?function\s+([A-Za-z0-9_]+Legacy\d+)\s*\(/gm)].map(match=>match[1]);
  assert.ok(names.length>0,'deve existir inventário de blocos legacy para esta auditoria');
  for(const name of names){
    const refs=[...app.matchAll(new RegExp(`\\b${name}\\b`,'g'))].length;
    assert.equal(refs,1,`${name} ainda possui caller ativo`);
  }
});

test('diretórios acadêmicos permanecem canônicos em app_records até cutover explícito',()=>{
  assert.match(app,/async function saveDirectoryRecord\(kind,table,record,toRow\)/);
  assert.match(app,/if\(!useTypedAcademicWrites\(\)\)\{\s*await saveTypedAppRecord\(kind,record\);\s*return;\s*\}/);
  assert.match(app,/useTypedAcademicReads\(\)\?Supabase\.from\('students'\)/);
  assert.match(app,/await saveTypedAppRecord\(kind,record\)/);
});

test('casos integrados continuam gravando somente via RPC segura',()=>{
  assert.match(app,/Supabase\.rpc\('save_integrated_case',payload\)/);
  assert.doesNotMatch(app,/saveCase[\s\S]{0,400}Storage\.save/);
});
