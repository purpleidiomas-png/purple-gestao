const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
function query(sql){
  const raw=execFileSync('pnpm',['dlx','supabase@latest','db','query','--linked',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows;
}
const baseline=query("select updated_at,data from app_records where id='twr-workspace'")[0];
for(const [id,allowed] of [['f13cd9af-39fa-495c-9927-c04212d3a0c4',true],['512b0ff5-5854-4694-b678-80d2a6ae3d42',false]]){
  const rows=query(`begin; select set_config('request.jwt.claim.sub','${id}',true); set local role authenticated;
    do $$ declare saved jsonb; begin
      insert into app_records(id,kind,sector,owner_id,data)
      select id,kind,sector,owner_id,jsonb_set(data,'{events}',coalesce(data->'events','[]')||'[{"id":"rollback-only-twr-probe","teacherId":"teach-1789508765179-2baa1e","type":"REPOSICAO","date":"2099-01-01"}]'::jsonb)
      from app_records where id='twr-workspace'
      on conflict(id) do update set data=excluded.data returning data into saved;
      if not exists(select 1 from jsonb_array_elements(saved->'events') where value->>'id'='rollback-only-twr-probe') then raise exception 'PROBE_NOT_SAVED'; end if;
      raise exception 'ROLLBACK_EXPECTED';
    exception when others then perform set_config('test.twr_result',sqlerrm,true); end $$;
    select current_setting('test.twr_result') result`);
  if(allowed)assert.equal(rows[0].result,'ROLLBACK_EXPECTED','Anna must be able to persist the replacement');
  else assert.notEqual(rows[0].result,'ROLLBACK_EXPECTED','Teachers cannot overwrite the team workspace');
}
assert.deepEqual(query("select updated_at,data from app_records where id='twr-workspace'")[0],baseline,'Rollback probe must not change production data');
console.log('PASS production rollback: Anna persists a replacement, teacher write denied, original workspace unchanged.');
