// Validate production SELECT policies with each teacher's JWT identity. No data writes.
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
function query(sql){
  const raw=execFileSync('pnpm',['dlx','supabase@latest','db','query','--linked',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows;
}
const teachers=query(`select p.id,p.name,t.data->>'id' as teacher_id,
  (select count(*) from app_records c where c.kind='class' and c.data->>'teacherId'=t.data->>'id') as expected_classes,
  (select count(*) from app_records w cross join lateral jsonb_array_elements(coalesce(w.data->'routines','[]')) r where w.kind='twr_workspace' and r->>'teacherId'=t.data->>'id') as expected_routines
  from profiles p join app_records t on t.kind='teacher' and t.data->>'userId'=p.id::text where p.role='teacher' and p.active=true order by p.name`);
assert.equal(teachers.length,7,'All seven teacher accounts must have an explicit mapping');
for(const teacher of teachers){
  assert(/^[a-f0-9-]{36}$/.test(teacher.id));
  const [result]=query(`begin; select set_config('request.jwt.claim.sub','${teacher.id}',true); set local role authenticated;
    select count(*) as visible_classes,count(*) filter(where not public.teacher_owns_class(data)) as foreign_classes,
    (select count(*) from app_records w cross join lateral jsonb_array_elements(coalesce(w.data->'routines','[]')) r
      where w.kind='twr_workspace' and r->>'teacherId'=any(public.current_teacher_identity_ids())) as own_routines
    from app_records where kind='class'`);
  assert.equal(result.foreign_classes,0,`${teacher.name}: foreign class access`);
  assert.equal(result.visible_classes,teacher.expected_classes,`${teacher.name}: own classes missing`);
  assert.equal(result.own_routines,teacher.expected_routines,`${teacher.name}: own routines missing`);
  console.log(`${teacher.name}: ${result.visible_classes} own classes, ${result.own_routines} own routines, 0 foreign classes`);
}
console.log('PASS: all seven production teacher identities validated; no data writes.');
