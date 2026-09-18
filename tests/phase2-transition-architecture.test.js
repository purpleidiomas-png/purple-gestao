const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const migrationsDir='supabase/migrations';
const supersededDir='supabase/migrations_superseded';
const academicSql=fs.readFileSync(`${migrationsDir}/20260828_academic_transition_v2.sql`,'utf8');
const financialSql=fs.readFileSync(`${migrationsDir}/20260828_financial_transition_v2.sql`,'utf8');
const followupPlan=fs.readFileSync('FOLLOWUP_MIGRATION_PLAN.md','utf8');
const transitionDoc=fs.readFileSync('TRANSITION_ARCHITECTURE.md','utf8');

test('migrations superseded foram retiradas do diretório executável',()=>{
  const liveFiles=new Set(fs.readdirSync(migrationsDir));
  const archivedFiles=new Set(fs.readdirSync(supersededDir));
  [
    '20260828_permission_defaults_twr_class_opening.sql',
    '20260828_academic_source_of_truth_contract.sql',
    '20260828_financial_source_of_truth_contract.sql',
    '20260828_student_followups_v1.sql',
    '20260828_twr_class_opening_v1.sql'
  ].forEach(file=>{
    assert.equal(liveFiles.has(file),false,`${file} ainda está em supabase/migrations`);
    assert.equal(archivedFiles.has(file),true,`${file} não foi arquivada`);
  });
});

test('migration acadêmica v2 preserva rastreabilidade e não inventa FK student->teacher',()=>{
  assert.match(academicSql,/legacy_record_id text unique/);
  assert.match(academicSql,/teacher_id uuid references public\.teachers\(id\)/);
  assert.match(academicSql,/class_id uuid references public\.classes\(id\)/);
  assert.doesNotMatch(academicSql,/student[s\S]{0,800}teacher_id uuid references public\.teachers\(id\)/i);
});

test('migration financeira v2 não reintroduz asaas_payment_id refutado em produção',()=>{
  assert.match(financialSql,/add column if not exists legacy_record_id text/);
  assert.match(financialSql,/create or replace view public\.financial_ledger_entries/);
  assert.match(financialSql,/grant select on public\.financial_ledger_entries to authenticated/);
  assert.doesNotMatch(financialSql,/asaas_payment_id/);
});

test('arquitetura de transição formaliza cutover controlado sem dual-write cego',()=>{
  assert.match(transitionDoc,/Estado A/i);
  assert.match(transitionDoc,/Estado E/i);
  assert.match(transitionDoc,/Não adotar dual-write cego/i);
  assert.match(transitionDoc,/RPC transacional única/i);
});

test('plano de follow-up reconhece que os 23 eventos reais não migram para follow-up humano',()=>{
  assert.match(followupPlan,/23 eventos totais/i);
  assert.match(followupPlan,/migráveis para `student_followups`: 0/i);
  assert.match(followupPlan,/não migráveis: 23/i);
});
