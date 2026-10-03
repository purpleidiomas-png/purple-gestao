const fs=require('node:fs'),assert=require('node:assert/strict');
const h=require('./shadow/phase2_2_harness.js');
(async()=>{
  let db,ana,dayana;
  const anaId='512b0ff5-5854-4694-b678-80d2a6ae3d42',dayanaId='5aaf77ae-cbb2-42de-ac4b-aae740d1f406';
  try{
    db=await h.adminClient(await h.createFreshDatabase('teacher_scope'));
    await db.query('alter table profiles drop constraint profiles_role_check; alter table app_records drop constraint app_records_kind_check');
    const access=fs.readFileSync('supabase/migrations/20260716_access_control.sql','utf8');
    await db.query(access.slice(access.indexOf('create or replace function public.has_permission'),access.indexOf('create or replace function public.audit_profile_permissions')));
    await db.query(fs.readFileSync('supabase/migrations/20260917_twr_teacher_app_records_policy.sql','utf8'));
    for(const [id,name] of [[anaId,'ANA LAURA VIANA'],[dayanaId,'DAYANA NASCIMENTO']]){
      await db.query('insert into auth.users(id,email) values($1,$2)',[id,`${id}@example.invalid`]);
      await db.query("insert into profiles(id,name,email,role,sector,permissions) values($1,$2,$3,'teacher','pedagogico',$4)",[id,name,`${id}@example.invalid`,{'classes.view':true,'reports.view':id===anaId,'reports.edit':true}]);
    }
    const records=[
      ['teach-1789672187882-1180ac','teacher',{id:'teach-1789672187882-1180ac',name:'ANA LAURA',userId:anaId}],
      ['teach-1789671634306-f04e24','teacher',{id:'teach-1789671634306-f04e24',name:'DAYANA NASCIMENTO',supabaseId:'dayana-uuid'}],
      ['settings','settings',{userTeacherLinks:{[dayanaId]:'teach-1789672187882-1180ac'}}],
      ['a','class',{teacherId:'teach-1789672187882-1180ac'}],
      ['d','class',{teacherId:'dayana-uuid'}]
    ];
    for(const [id,kind,data] of records)await db.query('insert into app_records(id,kind,sector,data) values($1,$2,$3,$4)',[id,kind,'pedagogico',data]);
    await db.query('grant usage on schema auth to authenticated');
    ana=await h.appClient(db.database,anaId);dayana=await h.appClient(db.database,dayanaId);
    const classes=async client=>(await client.query("select id from app_records where kind='class' order by id")).rows.map(r=>r.id);
    assert.deepEqual(await classes(ana),['a','d'],'Reproduce old policy exposing other teachers classes');
    assert.deepEqual(await classes(dayana),[],'Reproduce own class hidden when reports.view is false');
    await db.query(fs.readFileSync('supabase/migrations/20261003_teacher_identity_class_scope.sql','utf8'));
    assert.deepEqual(await classes(ana),['a']);assert.deepEqual(await classes(dayana),['d']);
    assert.equal((await dayana.query("update app_records set data=data||'{\"notes\":\"foreign\"}'::jsonb where id='a' returning id")).rows.length,0);
    assert.equal((await dayana.query("delete from app_records where id='a' returning id")).rows.length,0);
    await db.query("update app_records set data=jsonb_set(data,'{teacherId}','\"teach-1789672187882-1180ac\"') where id='d'");
    assert.deepEqual(await classes(dayana),[],'Reassignment removes the old owner immediately');
    assert.deepEqual(await classes(ana),['a','d'],'Reassignment reaches the new owner immediately');
    await db.query('update profiles set active=false where id=$1',[anaId]);
    assert.deepEqual(await classes(ana),[]);
    console.log('PASS: own class RLS, denied foreign writes, missing reports permission, corrected Dayana link, reassignment and inactive users.');
  }finally{for(const client of [ana,dayana,db])if(client)await client.end();await h.stopCluster()}
})().catch(error=>{console.error(error);process.exitCode=1});
