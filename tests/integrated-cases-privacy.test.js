const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260724_integrated_cases_privacy.sql'),'utf8');

function functionSource(name,nextName){
  const asyncStart=app.indexOf(`async function ${name}`);
  const start=asyncStart===-1?app.indexOf(`function ${name}`):asyncStart;
  const end=app.indexOf(`function ${nextName}`,start+1);
  assert.notEqual(start,-1,`função ${name} ausente`);
  assert.notEqual(end,-1,`limite após ${name} ausente`);
  return app.slice(start,end);
}

test('o frontend não carrega nem sincroniza o JSON legado de casos',()=>{
  assert.doesNotMatch(app,/case\s*:\s*['"]cases['"]/);
  assert.doesNotMatch(app,/add\(['"]case['"]/);
  assert.match(app,/rows\.filter\(row=>row\.kind!==['"]case['"]\)/);
  assert.match(app,/Supabase\.rpc\(['"]list_integrated_cases['"]\)/);
});

test('a gravação de casos usa somente a RPC segura',()=>{
  const source=functionSource('saveCase','meetingVisible');
  assert.match(source,/Supabase\.rpc\(['"]save_integrated_case['"],payload\)/);
  assert.doesNotMatch(source,/Storage\.save/);
  assert.match(source,/expectedUpdatedAt:current\?\.\[sector\]\?\.updatedAt\|\|null/);
  assert.match(source,/p_expected_core_updated_at:current\?\.coreUpdatedAt\|\|null/);
  assert.match(source,/CASE_CORE_CONFLICT/);
  assert.match(source,/CASE_SECTOR_CONFLICT/);
});

test('a migration preserva o legado e normaliza sem sobrescrita',()=>{
  assert.match(migration,/from public\.app_records legacy[\s\S]*where legacy\.kind = 'case'[\s\S]*on conflict \(id\) do nothing;/);
  assert.match(migration,/on conflict \(case_id, sector\) do nothing;/);
  assert.doesNotMatch(migration,/\bdelete\s+from\b/i);
  assert.doesNotMatch(migration,/\btruncate\b/i);
  assert.doesNotMatch(migration,/\bdrop\s+table\b/i);
  assert.doesNotMatch(migration,/\bupdate\s+public\.app_records\b/i);
});

test('RLS bloqueia o JSON legado e detalhes cruzados para líderes',()=>{
  assert.match(migration,/integrated_cases_legacy_read_guard[\s\S]*as restrictive[\s\S]*kind <> 'case'/);
  assert.match(migration,/integrated_case_sector_details_read[\s\S]*sector = public\.my_sector\(\)/);
  assert.match(migration,/when v_full_access or v_profile\.sector = 'retencao'[\s\S]*else ''/);
  assert.match(migration,/when v_full_access or v_profile\.sector = 'pedagogico'[\s\S]*else ''/);
  assert.match(migration,/when v_full_access or v_profile\.sector = 'financeiro'[\s\S]*else ''/);
});

test('a RPC restringe mutação por perfil, setor e versão',()=>{
  assert.match(migration,/v_profile\.role not in \('direction', 'leader'\)/);
  assert.match(migration,/payload_sector <> v_profile\.sector/);
  assert.match(migration,/CASE_CORE_CONFLICT/);
  assert.match(migration,/CASE_SECTOR_CONFLICT/);
  assert.match(migration,/revoke insert, update, delete on public\.integrated_cases from authenticated/);
  assert.match(migration,/revoke insert, update, delete on public\.integrated_case_sector_details from authenticated/);
});

async function executeSaveAs(role,sector){
  const rpcCalls=[];
  const fields={
    caseStudent:'Aluno seguro',caseCourse:'Curso',caseGroup:'Turma',
    caseOwner:'Responsável',caseNext:'Acompanhar',caseDeadline:'2026-07-30',
    'case-retencao-level':'warn','case-retencao-summary':'Somente retenção',
    'case-pedagogico-level':'bad','case-pedagogico-summary':'Somente pedagógico',
    'case-financeiro-level':'good','case-financeiro-summary':'Somente financeiro'
  };
  const current={
    id:'case-safe',student:'Aluno seguro',course:'Curso',group:'Turma',
    owner:'Responsável',nextStep:'Acompanhar',deadline:'2026-07-30',
    coreUpdatedAt:'2026-07-17T20:00:00Z',updatedAt:'2026-07-17T20:00:00Z',
    retencao:{level:'warn',summary:'R',updatedAt:'2026-07-17T20:01:00Z'},
    pedagogico:{level:'bad',summary:'P',updatedAt:'2026-07-17T20:02:00Z'},
    financeiro:{level:'good',summary:'F',updatedAt:'2026-07-17T20:03:00Z'}
  };
  const context={
    State:{user:{role,sector},db:{cases:[current]}},
    Supabase:{rpc:async(name,payload)=>{
      rpcCalls.push({name,payload});
      return name==='list_integrated_cases'?{data:[current],error:null}:{data:'case-safe',error:null};
    }},
    $:selector=>({value:fields[selector.slice(1)]??''}),
    uid:()=> 'case-new',hasSupabaseClient:()=>true,
    toast:()=>{},friendlyError:error=>String(error),logAudit:()=>{},
    closeModal:()=>{},renderPage:()=>{},console
  };
  vm.createContext(context);
  const refresh=functionSource('refreshIntegratedCases','caseVisible');
  const save=functionSource('saveCase','meetingVisible');
  vm.runInContext(`${refresh}\n${save}\nthis.runSave=saveCase;`,context);
  await context.runSave('case-safe');
  return rpcCalls;
}

test('um líder envia somente o payload do próprio setor',async()=>{
  const calls=await executeSaveAs('leader','retencao');
  assert.equal(calls[0].name,'save_integrated_case');
  assert.deepEqual(Object.keys(calls[0].payload.p_sector_payload),['retencao']);
  assert.equal(calls[0].payload.p_sector_payload.retencao.expectedUpdatedAt,'2026-07-17T20:01:00Z');
  assert.equal(calls[1].name,'list_integrated_cases');
});

test('a Direção mantém atualização integral com versões por setor',async()=>{
  const calls=await executeSaveAs('direction','all');
  assert.deepEqual(
    Object.keys(calls[0].payload.p_sector_payload),
    ['retencao','pedagogico','financeiro']
  );
  assert.equal(calls[0].payload.p_expected_core_updated_at,'2026-07-17T20:00:00Z');
  assert.equal(calls[0].payload.p_sector_payload.financeiro.expectedUpdatedAt,'2026-07-17T20:03:00Z');
});
