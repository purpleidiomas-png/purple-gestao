const fs=require('node:fs');
const assert=require('node:assert/strict');
const h=require('./shadow/phase2_2_harness.js');

(async()=>{
  let db,staff;
  try{
    db=await h.adminClient(await h.createFreshDatabase('twr_sector'));
    await db.query('alter table app_records drop constraint app_records_kind_check');
    const access=fs.readFileSync('supabase/migrations/20260716_access_control.sql','utf8');
    await db.query(access.slice(access.indexOf('create or replace function public.has_permission'),access.indexOf('create or replace function public.audit_profile_permissions')));
    await db.query(fs.readFileSync('supabase/migrations/20260917_twr_teacher_app_records_policy.sql','utf8'));
    const id='11111111-1111-4111-8111-111111111111';
    await db.query('insert into auth.users(id,email) values($1,$2)',[id,'staff@example.invalid']);
    await db.query("insert into profiles(id,name,email,role,sector,permissions) values($1,'Staff',$2,'leader','financeiro',$3)",[id,'staff@example.invalid',{'teachers.view':true,'twr.manage':true}]);
    await db.query("insert into app_records(id,kind,sector,owner_id) values('twr','twr_workspace','pedagogico',$1),('teacher','teacher','pedagogico',$1),('private','report','pedagogico',$1)",[id]);
    await db.query('grant usage on schema auth to authenticated; grant select,update,delete on app_records to authenticated');
    staff=await h.appClient(db.database,id);
    const visible=async()=>(await staff.query('select id from app_records order by id')).rows.map(r=>r.id);
    assert.deepEqual(await visible(),[],'Finance staff was blocked by the sector rule despite TWR permission');
    await db.query(fs.readFileSync('supabase/migrations/20261003_twr_team_cross_sector_read.sql','utf8'));
    assert.deepEqual(await visible(),['teacher','twr']);
    assert.equal((await staff.query("update app_records set data='{}' where id='twr' returning id")).rows.length,0,'Read grant does not grant cross-sector writes');
    assert.equal((await staff.query("delete from app_records where id='twr' returning id")).rows.length,0,'Read grant does not grant deletion');
    await db.query('update profiles set permissions=$1 where id=$2',[{'teachers.view':true},id]);
    assert.deepEqual(await visible(),['teacher','twr'],'Team viewer can read without management permission');
    await db.query('update profiles set permissions=$1 where id=$2',[{'twr.view.own':true},id]);
    assert.deepEqual(await visible(),[],'Own TWR permission alone does not grant cross-sector team access');
    await db.query('update profiles set permissions=$1,active=false where id=$2',[{'teachers.view':true},id]);
    assert.deepEqual(await visible(),[],'Inactive account cannot read the team');
    console.log('PASS: cross-sector TWR team read, private reports protected, writes denied, own-only and inactive accounts denied.');
  }finally{
    if(staff)await staff.end();
    if(db)await db.end();
    await h.stopCluster();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
