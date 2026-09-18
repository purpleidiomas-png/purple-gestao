const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const root='/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo';
const read=path=>fs.readFileSync(`${root}/${path}`,'utf8');

const backfillRunbook=read('BACKFILL_RUNBOOK.md');
const cutoverChecklist=read('CUTOVER_CHECKLIST.md');
const rpcContract=read('ACADEMIC_RPC_CONTRACT.md');
const financialDecision=read('FINANCIAL_MODEL_DECISION.md');
const backfillSql=read('supabase/phase2_1/03_academic_backfill.sql');
const preflightSql=read('supabase/phase2_1/01_preflight_readonly.sql');
const academicReconSql=read('supabase/phase2_1/04_academic_reconciliation_readonly.sql');
const financialReconSql=read('supabase/phase2_1/05_financial_reconciliation_readonly.sql');
const cutoverSql=read('supabase/phase2_1/06_cutover_validation_readonly.sql');
const followupPlan=read('FOLLOWUP_MIGRATION_PLAN.md');

test('backfill runbook fixa ordem acadêmica teacher -> class -> student',()=>{
  assert.match(backfillRunbook,/1\.\s*`teachers`/);
  assert.match(backfillRunbook,/2\.\s*`classes`/);
  assert.match(backfillRunbook,/3\.\s*`students`/);
});

test('preflight compara baseline com momento da execução sem tratar baseline como teto',()=>{
  assert.match(preflightSql,/baseline_date/);
  assert.match(preflightSql,/delta_since_baseline/);
  assert.match(preflightSql,/GROWTH_SINCE_BASELINE/);
});

test('backfill acadêmico é idempotente e não usa nome como identidade',()=>{
  assert.match(backfillSql,/on conflict \(legacy_record_id\) do update/gi);
  assert.doesNotMatch(backfillSql,/on conflict \(name\)/i);
  assert.doesNotMatch(backfillSql,/delete from public\.app_records/i);
});

test('backfill acadêmico bloqueia FK inválida de turma para professor',()=>{
  assert.match(backfillSql,/RECONCILIATION_ERROR: class\.teacherId sem teacher legado correspondente/i);
  assert.match(backfillSql,/raise exception/i);
});

test('aluno sem turma continua permitido no backfill',()=>{
  assert.match(backfillSql,/left join public\.classes c/);
  assert.match(backfillSql,/class_id,\n+  status/s);
});

test('reconciliação acadêmica expõe métricas de missing duplicate orphan',()=>{
  [
    'LEGACY_COUNT',
    'TYPED_COUNT',
    'MATCHED_BY_LEGACY_RECORD_ID',
    'MISSING_IN_TYPED',
    'DUPLICATED_IN_TYPED',
    'ORPHAN_TEACHER_LINK',
    'ORPHAN_CLASS_LINK'
  ].forEach(label=>assert.match(academicReconSql,new RegExp(label,'i')));
});

test('reconciliação financeira compara todos os elegíveis sem usar nome como chave principal',()=>{
  assert.match(financialReconSql,/stable_identifier/);
  assert.match(financialReconSql,/fingerprint_match_count/);
  assert.doesNotMatch(financialReconSql,/student_name|responsible_name/i);
});

test('feature flag acadêmica é explícita no contrato e no checklist',()=>{
  assert.match(rpcContract,/ACADEMIC_SOURCE = APP_RECORDS/);
  assert.match(rpcContract,/ACADEMIC_SOURCE = TYPED/);
  assert.match(cutoverChecklist,/a troca não depende apenas da existência de tabela/i);
});

test('decisão financeira evita pagamentos artificiais e prefere ledger derivado',()=>{
  assert.match(financialDecision,/não criar pagamentos artificiais/i);
  assert.match(financialDecision,/VIEW DERIVADA/i);
});

test('follow-up mantém timeline acadêmica fora do backfill inicial de followups',()=>{
  assert.match(followupPlan,/migráveis para `student_followups`: 0/i);
  assert.match(followupPlan,/não migráveis: 23/i);
});

test('cutover validation resulta em GO ou NO-GO e separa backfill de cutover',()=>{
  assert.match(cutoverSql,/then 'NO-GO'/);
  assert.match(cutoverSql,/else 'GO'/);
});
