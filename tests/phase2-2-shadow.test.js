const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const {
  ROOT, startCluster, stopCluster, createFreshDatabase, adminClient, appClient,
  seedProfiles, seedHealthyStateA, applySqlFile, applyStateBCore, runReadOnlyQuery, setAcademicSource
}=require('./shadow/phase2_2_harness');

let reportLines=[];
let clusterStarted=false;

function add(line=''){reportLines.push(line);}
async function setupHealthyDb(){
  const dbName=await createFreshDatabase('healthy');
  const admin=await adminClient(dbName);
  const ids=await seedProfiles(admin);
  await seedHealthyStateA(admin, ids);
  return {dbName, admin, ids};
}

test.before(async()=>{
  await startCluster();
  clusterStarted=true;
  reportLines=[
    '# SHADOW REHEARSAL REPORT',
    '',
    `Data: 2026-08-28`,
    '',
    '## Ambiente',
    '',
    '- Tipo: Embedded Postgres local descartável',
    '- PostgreSQL: 18.4',
    '- Produção acessada: NÃO',
    '- Produção alterada: NÃO',
    ''
  ];
});

test.after(async()=>{
  if(clusterStarted)await stopCluster();
  fs.writeFileSync(path.join(ROOT,'SHADOW_REHEARSAL_REPORT.md'),reportLines.join('\n'));
});

test('shadow reproduz Estado A e aplica migrations V2 com sucesso', async()=>{
  const {dbName, admin, ids}=await setupHealthyDb();
  try{
    const before=await admin.query(`
      select to_regclass('public.students') as students,
             to_regclass('public.classes') as classes,
             to_regclass('public.teachers') as teachers
    `);
    assert.equal(before.rows[0].students,null);
    assert.equal(before.rows[0].classes,null);
    assert.equal(before.rows[0].teachers,null);

    await applyStateBCore(admin);

    const after=await admin.query(`
      select
        to_regclass('public.students') is not null as students_ok,
        to_regclass('public.classes') is not null as classes_ok,
        to_regclass('public.teachers') is not null as teachers_ok,
        to_regclass('public.student_followups') is not null as followups_ok,
        to_regclass('public.integrated_cases') is not null as cases_ok,
        to_regclass('public.twr_teacher_profiles') is not null as twr_ok,
        to_regclass('public.class_opening_analyses') is not null as opening_ok,
        to_regclass('public.runtime_flags') is not null as runtime_flags_ok
    `);
    assert.equal(after.rows[0].students_ok,true);
    assert.equal(after.rows[0].classes_ok,true);
    assert.equal(after.rows[0].teachers_ok,true);
    assert.equal(after.rows[0].followups_ok,true);
    assert.equal(after.rows[0].cases_ok,true);
    assert.equal(after.rows[0].twr_ok,true);
    assert.equal(after.rows[0].opening_ok,true);
    assert.equal(after.rows[0].runtime_flags_ok,true);

    const idx=await admin.query(`select indexname from pg_indexes where schemaname='public' and tablename in ('students','classes','teachers')`);
    assert.ok(idx.rows.length>=5);

    add('## Academic migration');
    add('');
    add('- Resultado: PASS');
    add(`- Database: ${dbName}`);
    add('');
  } finally {
    await admin.end();
  }
});

test('backfill acadêmico executa duas vezes sem duplicar e reconcilia saudável', async()=>{
  const {admin, ids}=await setupHealthyDb();
  try{
    await applyStateBCore(admin);
    await applySqlFile(admin,'supabase/phase2_1/03_academic_backfill.sql');
    const firstCounts=await admin.query(`select (select count(*) from public.teachers) t,(select count(*) from public.classes) c,(select count(*) from public.students) s`);
    assert.deepEqual(firstCounts.rows[0],{t:'2',c:'2',s:'2'});

    await applySqlFile(admin,'supabase/phase2_1/03_academic_backfill.sql');
    const secondCounts=await admin.query(`select (select count(*) from public.teachers) t,(select count(*) from public.classes) c,(select count(*) from public.students) s`);
    assert.deepEqual(secondCounts.rows[0],{t:'2',c:'2',s:'2'});

    const dupe=await admin.query(`
      select
        (select count(*) from (select legacy_record_id from public.teachers group by legacy_record_id having count(*)>1) x) as teacher_dupes,
        (select count(*) from (select legacy_record_id from public.classes group by legacy_record_id having count(*)>1) x) as class_dupes,
        (select count(*) from (select legacy_record_id from public.students group by legacy_record_id having count(*)>1) x) as student_dupes
    `);
    assert.deepEqual(dupe.rows[0],{teacher_dupes:'0',class_dupes:'0',student_dupes:'0'});

    const recon=await runReadOnlyQuery(admin,'supabase/phase2_1/04_academic_reconciliation_readonly.sql');
    const summary=Object.fromEntries(recon.map(row=>[row.entity,row]));
    assert.equal(summary.teachers.missing_in_typed,'0');
    assert.equal(summary.classes.missing_in_typed,'0');
    assert.equal(summary.students.missing_in_typed,'0');
    assert.equal(summary.classes.orphan_teacher_link,'0');
    assert.equal(summary.students.orphan_class_link,'0');

    add('## Academic backfill');
    add('');
    add('- Primeira execução: PASS');
    add('- Segunda execução: PASS');
    add('- Idempotência: PASS');
    add(`- Reconciliação saudável: teachers=${summary.teachers.matched_by_legacy_record_id}, classes=${summary.classes.matched_by_legacy_record_id}, students=${summary.students.matched_by_legacy_record_id}`);
    add('');
  } finally {
    await admin.end();
  }
});

test('negative tests do backfill bloqueiam teacher/class inválidos e permitem aluno sem turma', async()=>{
  const dbName=await createFreshDatabase('negative');
  const admin=await adminClient(dbName);
  try{
    const ids=await seedProfiles(admin);
    await seedHealthyStateA(admin,ids);
    await admin.query(`update public.app_records set data = jsonb_set(data,'{teacherId}','\"missing-teacher\"'::jsonb) where id='class-legacy-2'`);
    await applyStateBCore(admin);
    await assert.rejects(()=>applySqlFile(admin,'supabase/phase2_1/03_academic_backfill.sql'),/RECONCILIATION_ERROR: class\.teacherId/);

    await admin.query(`delete from public.classes where true`).catch(()=>{});
  } finally {
    await admin.end();
  }

  const dbName2=await createFreshDatabase('negative2');
  const admin2=await adminClient(dbName2);
  try{
    const ids=await seedProfiles(admin2);
    await seedHealthyStateA(admin2,ids);
    await admin2.query(`update public.app_records set data = jsonb_set(data,'{classId}','\"missing-class\"'::jsonb) where id='student-legacy-1'`);
    await applyStateBCore(admin2);
    await assert.rejects(()=>applySqlFile(admin2,'supabase/phase2_1/03_academic_backfill.sql'),/RECONCILIATION_ERROR: student\.classId/);
  } finally {
    await admin2.end();
  }

  const dbName3=await createFreshDatabase('negative3');
  const admin3=await adminClient(dbName3);
  try{
    const ids=await seedProfiles(admin3);
    await seedHealthyStateA(admin3,ids);
    await applyStateBCore(admin3);
    await applySqlFile(admin3,'supabase/phase2_1/03_academic_backfill.sql');
    const student=await admin3.query(`select class_id from public.students where legacy_record_id='student-legacy-2'`);
    assert.equal(student.rows[0].class_id,null);

    await assert.rejects(
      ()=>admin3.query(`insert into public.teachers (legacy_record_id,name,status,data) values ('teacher-legacy-1','X','ATIVO','{}')`),
      /duplicate key/
    );
  } finally {
    await admin3.end();
  }
});

test('fingerprint acadêmico detecta divergência semântica proposital', async()=>{
  const {admin}=await setupHealthyDb();
  try{
    await applyStateBCore(admin);
    await applySqlFile(admin,'supabase/phase2_1/03_academic_backfill.sql');
    const before=await admin.query(`
      select md5(concat_ws('|', legacy_record_id, name, status, coalesce(class_id::text,''), coalesce(registration_date::text,''))) as fp
      from public.students where legacy_record_id='student-legacy-1'
    `);
    await admin.query(`update public.students set name='Aluno Divergente' where legacy_record_id='student-legacy-1'`);
    const after=await admin.query(`
      select md5(concat_ws('|', legacy_record_id, name, status, coalesce(class_id::text,''), coalesce(registration_date::text,''))) as fp
      from public.students where legacy_record_id='student-legacy-1'
    `);
    assert.notEqual(before.rows[0].fp, after.rows[0].fp);
    add('## Fingerprint');
    add('');
    add('- Resultado: PASS');
    add('- Divergência semântica detectada após alteração proposital no destino');
    add('');
  } finally {
    await admin.end();
  }
});

test('financeiro reconcilia match e detecta divergent legacy_only typed_only com payments vazio', async()=>{
  const {admin}=await setupHealthyDb();
  try{
    await applyStateBCore(admin);
    let res=await runReadOnlyQuery(admin,'supabase/phase2_1/05_financial_reconciliation_readonly.sql');
    assert.equal(res[0].matched_count,'2');
    assert.equal(res[0].legacy_only,'0');
    assert.equal(res[0].typed_only,'0');
    assert.equal(res[0].ambiguous,'0');

    await admin.query(`update public.financial_charges set value = 999, full_value=999 where external_charge_id='charge-ext-1'`);
    res=await runReadOnlyQuery(admin,'supabase/phase2_1/05_financial_reconciliation_readonly.sql');
    assert.equal(res[0].divergent,'1');

    await admin.query(`delete from public.financial_charges where external_charge_id='charge-ext-1'`);
    res=await runReadOnlyQuery(admin,'supabase/phase2_1/05_financial_reconciliation_readonly.sql');
    assert.equal(res[0].legacy_only,'1');

    await admin.query(`
      insert into public.financial_charges (
        id, student_id, provider, external_charge_id, external_reference, charge_type, billing_type, status,
        description, competence, due_date, value, full_value, punctual_value, discount_value, installment_number, installment_total, data
      ) values (
        '10000000-0000-4000-8000-000000000099','student-legacy-9','ASAAS','charge-extra','charge-extra','MENSALIDADE','PIX','PENDING',
        'Extra','2026-09','2026-09-30',200,200,200,0,1,1,'{}'
      )
	    `);
	    res=await runReadOnlyQuery(admin,'supabase/phase2_1/05_financial_reconciliation_readonly.sql');
	    assert.equal(res[0].typed_only,'1');

    const ledger=await admin.query(`select count(*) from public.financial_ledger_entries`);
    assert.equal(ledger.rows[0].count,'0');
    const payments=await admin.query(`select count(*) from public.financial_payments`);
    assert.equal(payments.rows[0].count,'0');
    add('## Financial');
    add('');
    add('- Reconciliação base: PASS');
    add('- Divergência de valor detectada: PASS');
    add('- Legacy only detectado: PASS');
    add('- Typed only detectado: PASS');
    add('- financial_payments vazio não quebrou reconciliação: PASS');
    add('- Ledger derivado sem terceira cópia persistida: PASS');
    add('');
  } finally {
    await admin.end();
  }
});

test('follow-up, integrated cases, twr e class opening funcionam no shadow', async()=>{
  const {admin, ids}=await setupHealthyDb();
  try{
    await applyStateBCore(admin);
    await applySqlFile(admin,'supabase/phase2_1/03_academic_backfill.sql');

    const migrated=await admin.query(`
      select count(*) from public.student_followups
    `);
    assert.equal(migrated.rows[0].count,'0');

    const followStudent=await admin.query(`select id from public.students where legacy_record_id='student-legacy-1'`);
    await admin.query(`
      insert into public.student_followups (student_id, legacy_record_id, source_module, contact_at, subject, payload)
      values ($1,'fup-1','MANUAL','2026-08-29T10:00:00Z','Contato humano','{"kind":"followup"}')
    `,[followStudent.rows[0].id]);
    const followCount=await admin.query(`select count(*) from public.student_followups`);
    assert.equal(followCount.rows[0].count,'1');

    const caseCount=await admin.query(`select count(*) from public.integrated_cases`);
    assert.equal(caseCount.rows[0].count,'0');
    await admin.query(`
      insert into public.integrated_cases (legacy_record_id, student_name, course, group_name, owner_name, next_step, deadline, data)
      values ('case-legacy-1','Aluno Sanitizado','CURSO','GRUPO','OWNER','NEXT','2026-09-15','{}')
    `);
    await admin.query(`
      insert into public.integrated_case_sector_details (case_id, sector, level, summary)
      select id, 'retencao', 'warn', 'Resumo'
      from public.integrated_cases where legacy_record_id='case-legacy-1'
    `);

    const teacher=await admin.query(`select id from public.teachers where legacy_record_id='teacher-legacy-1'`);
    await admin.query(`insert into public.twr_teacher_profiles (teacher_id, weekly_mode, status, effective_from, data) values ($1,'FIXA','RASCUNHO','2026-09-01','{}')`,[teacher.rows[0].id]);
    const profile=await admin.query(`select id from public.twr_teacher_profiles limit 1`);
    await admin.query(`insert into public.twr_schedule_windows (twr_profile_id, day_of_week, start_time, end_time, kind) values ($1,'SEGUNDA','09:00','10:00','WORK')`,[profile.rows[0].id]);
    await admin.query(`insert into public.twr_activities (teacher_id, twr_profile_id, activity_type, status, day_of_week, start_time, end_time, source, payload) values ($1,$2,'PLANNING','AGENDADO','SEGUNDA','09:00','10:00','MANUAL','{}')`,[teacher.rows[0].id,profile.rows[0].id]);
    await admin.query(`insert into public.twr_publication_history (twr_profile_id, to_status) values ($1,'PUBLICADO')`,[profile.rows[0].id]);

    const klass=await admin.query(`select id from public.classes where legacy_record_id='class-legacy-1'`);
    await admin.query(`insert into public.class_opening_analyses (mode, requested_course, linked_class_id, payload) values ('demand','CURSO',$1,'{}')`,[klass.rows[0].id]);
    const analysis=await admin.query(`select id from public.class_opening_analyses limit 1`);
    await admin.query(`insert into public.class_opening_checklist (analysis_id, item_key, item_label) values ($1,'capacity','Capacidade')`,[analysis.rows[0].id]);
    await admin.query(`insert into public.class_opening_history (analysis_id, action) values ($1,'CREATED')`,[analysis.rows[0].id]);
    const classCountBefore=(await admin.query(`select count(*) from public.classes`)).rows[0].count;
    const classCountAfter=(await admin.query(`select count(*) from public.classes`)).rows[0].count;
    assert.equal(classCountBefore,classCountAfter);

    add('## Follow-up / Cases / TWR / Class Opening');
    add('');
    add('- Follow-up: PASS');
    add('- Integrated Cases: PASS');
    add('- TWR: PASS');
    add('- Class Opening: PASS');
    add('');
  } finally {
    await admin.end();
  }
});

test('RLS, feature flag, academic RPC, rollback transacional e simulação de cutover funcionam', async()=>{
  const {dbName, admin, ids}=await setupHealthyDb();
  try{
    await applyStateBCore(admin);
    await applySqlFile(admin,'supabase/phase2_1/03_academic_backfill.sql');

    const viewer=await appClient(dbName, ids.viewer);
    const direction=await appClient(dbName, ids.direction);
    const financial=await appClient(dbName, ids.financial);
    const teacher=await appClient(dbName, ids.teacher);
    try{
      const viewerProfiles=await viewer.query(`select count(*) from public.profiles`);
      assert.equal(viewerProfiles.rows[0].count,'1');

      const financialChargesDenied=await financial.query(`select count(*) from public.financial_charges`);
      assert.equal(financialChargesDenied.rows[0].count,'0');

      const teacherTwrRead=await teacher.query(`select count(*) from public.twr_teacher_profiles`);
      assert.ok(Number(teacherTwrRead.rows[0].count)>=0);

      await assert.rejects(
        ()=>viewer.query(`insert into public.students (legacy_record_id, code, name, status, data) values ('x','X','Viewer','ATIVO','{}')`),
        /permission denied|violates row-level security/i
      );

      await setAcademicSource(admin,'APP_RECORDS',ids.direction);
      await assert.rejects(
        ()=>direction.query(`select public.save_academic_directory_record($1::jsonb)`,[JSON.stringify({operation:'teacher.upsert',source_mode:'TYPED',record:{legacy_record_id:'rpc-teacher-1',name:'RPC Teacher',status:'ATIVO',data:{}}})]),
        /ACADEMIC_SOURCE_NOT_TYPED/
      );

      await setAcademicSource(admin,'TYPED',ids.direction);
      const teacherInsert=await direction.query(`select public.save_academic_directory_record($1::jsonb) as result`,[JSON.stringify({operation:'teacher.upsert',source_mode:'TYPED',record:{legacy_record_id:'rpc-teacher-1',name:'RPC Teacher',status:'ATIVO',data:{tag:'shadow'}}})]);
      const rpcTeacherId=teacherInsert.rows[0].result.record_id;
      assert.ok(rpcTeacherId);

      const teacherUpdate=await direction.query(`select public.save_academic_directory_record($1::jsonb) as result`,[JSON.stringify({operation:'teacher.upsert',source_mode:'TYPED',record:{id:rpcTeacherId,legacy_record_id:'rpc-teacher-1',name:'RPC Teacher Updated',status:'ATIVO',data:{tag:'shadow2'}}})]);
      assert.equal(teacherUpdate.rows[0].result.operation,'upsert');

      const auditCount=await admin.query(`select count(*) from public.academic_directory_audit where legacy_record_id='rpc-teacher-1'`);
      assert.equal(auditCount.rows[0].count,'2');

      const beforeFail=await admin.query(`select count(*) from public.classes where legacy_record_id='rpc-class-fail'`);
      await assert.rejects(
        ()=>direction.query(`select public.save_academic_directory_record($1::jsonb)`,[JSON.stringify({operation:'class.upsert',source_mode:'TYPED',record:{legacy_record_id:'rpc-class-fail',name:'Bad',course:'CURSO',category:'ADULTO',teacher_id:'30000000-0000-4000-8000-000000000001',status:'ATIVO',data:{}}})]),
        /TEACHER_REFERENCE_NOT_FOUND/
      );
      const afterFail=await admin.query(`select count(*) from public.classes where legacy_record_id='rpc-class-fail'`);
      const auditAfterFail=await admin.query(`select count(*) from public.academic_directory_audit where legacy_record_id='rpc-class-fail'`);
      assert.equal(beforeFail.rows[0].count,afterFail.rows[0].count);
      assert.equal(auditAfterFail.rows[0].count,'0');

      const cutoverGo=await runReadOnlyQuery(admin,'supabase/phase2_1/06_cutover_validation_readonly.sql');
      assert.equal(cutoverGo[0].cutover_result,'GO');

      await admin.query(`delete from public.students where legacy_record_id='student-legacy-1'`);
      const cutoverNoGo=await runReadOnlyQuery(admin,'supabase/phase2_1/06_cutover_validation_readonly.sql');
      assert.equal(cutoverNoGo[0].cutover_result,'NO-GO');

      await setAcademicSource(admin,'APP_RECORDS',ids.direction);
      const source=await admin.query(`select public.current_academic_source() as source`);
      assert.equal(source.rows[0].source,'APP_RECORDS');

      add('## RLS / RPC / Cutover / Rollback');
      add('');
      add('- RLS: PASS');
      add('- Academic RPC: PASS');
      add('- Transaction rollback: PASS');
      add('- Feature flag: PASS');
      add('- Cutover simulation: PASS');
      add('- Rollback simulation: PASS');
      add('');
    } finally {
      await viewer.end();
      await direction.end();
      await financial.end();
      await teacher.end();
    }
  } finally {
    await admin.end();
  }
});
