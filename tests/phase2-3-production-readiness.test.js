const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');
const {
  startCluster,
  stopCluster,
  createFreshDatabase,
  adminClient,
  seedProfiles,
  seedHealthyStateA,
  applySqlFile,
  runReadOnlyQuery
}=require('./shadow/phase2_2_harness');

const appJs=fs.readFileSync('app.js','utf8');
const plan=fs.readFileSync('PRODUCTION_CHANGE_PLAN.md','utf8');
const stateB=fs.readFileSync('PRODUCTION_STATE_B_RUNBOOK.md','utf8');
const stateC=fs.readFileSync('PRODUCTION_STATE_C_RUNBOOK.md','utf8');

test('compatibilidade do app com Estado B exige fonte acadêmica explícita e preserva APP_RECORDS por padrão',()=>{
  assert.match(appJs,/const ACADEMIC_SOURCE_DEFAULT='APP_RECORDS';/);
  assert.match(appJs,/function academicSourceMode\(\)\{return window\.PurpleAcademicSource==='TYPED'\?'TYPED':ACADEMIC_SOURCE_DEFAULT\}/);
  assert.match(appJs,/useTypedAcademicReads\(\)\?Supabase\.from\('students'\)/);
  assert.match(appJs,/if\(!useTypedAcademicWrites\(\)\)\{\s*await saveTypedAppRecord\(kind,record\);\s*return;\s*\}/);
  assert.match(plan,/App compatibility com Estado B[\s\S]*FAIL \/ P0/);
});

test('runbooks de Estado B e Estado C mantêm stop points separados e sem cutover automático',()=>{
  assert.match(stateB,/ESTADO B VALIDADO — AGUARDANDO AUTORIZAÇÃO DO ESTADO C/);
  assert.match(stateC,/ESTADO C VALIDADO — AGUARDANDO AUTORIZAÇÃO DE CUTOVER/);
  assert.doesNotMatch(stateB,/ACADEMIC_SOURCE = TYPED/);
  assert.match(stateC,/ACADEMIC_SOURCE` continua `APP_RECORDS`|ACADEMIC_SOURCE continua `APP_RECORDS`/);
});

test('dry-run do runbook fragmentado valida Estado B e Estado C no shadow sem cutover', async()=>{
  await startCluster();
  const db=await createFreshDatabase('phase23');
  const admin=await adminClient(db);
  try{
    const ids=await seedProfiles(admin);
    await seedHealthyStateA(admin,ids);

    const before=await admin.query(`
      select
        count(*) filter (where kind='teacher') as teachers,
        count(*) filter (where kind='class') as classes,
        count(*) filter (where kind='student') as students
      from public.app_records
    `);

    await applySqlFile(admin,'supabase/migrations/20260828_academic_transition_v2.sql');

    const stateBChecks=await admin.query(`
      select
        to_regclass('public.teachers') is not null as teachers_ok,
        to_regclass('public.classes') is not null as classes_ok,
        to_regclass('public.students') is not null as students_ok,
        (select count(*) from public.teachers) as typed_teachers,
        (select count(*) from public.classes) as typed_classes,
        (select count(*) from public.students) as typed_students,
        (select count(*) filter (where kind='teacher') from public.app_records) as legacy_teachers,
        (select count(*) filter (where kind='class') from public.app_records) as legacy_classes,
        (select count(*) filter (where kind='student') from public.app_records) as legacy_students
    `);
    assert.equal(stateBChecks.rows[0].teachers_ok,true);
    assert.equal(stateBChecks.rows[0].classes_ok,true);
    assert.equal(stateBChecks.rows[0].students_ok,true);
    assert.equal(stateBChecks.rows[0].typed_teachers,'0');
    assert.equal(stateBChecks.rows[0].typed_classes,'0');
    assert.equal(stateBChecks.rows[0].typed_students,'0');
    assert.equal(stateBChecks.rows[0].legacy_teachers,before.rows[0].teachers);
    assert.equal(stateBChecks.rows[0].legacy_classes,before.rows[0].classes);
    assert.equal(stateBChecks.rows[0].legacy_students,before.rows[0].students);

    await applySqlFile(admin,'supabase/phase2_1/03_academic_backfill.sql');
    const reconciliation=await runReadOnlyQuery(admin,'supabase/phase2_1/04_academic_reconciliation_readonly.sql');
    assert.equal(reconciliation.find(row=>row.entity==='teachers').missing_in_typed,'0');
    assert.equal(reconciliation.find(row=>row.entity==='classes').missing_in_typed,'0');
    assert.equal(reconciliation.find(row=>row.entity==='students').missing_in_typed,'0');

    const cutoverValidation=await runReadOnlyQuery(admin,'supabase/phase2_1/06_cutover_validation_readonly.sql');
    assert.equal(cutoverValidation[0].cutover_result,'GO');
  } finally {
    await admin.end();
    await stopCluster();
  }
});
