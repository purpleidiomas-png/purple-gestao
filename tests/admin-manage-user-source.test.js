const assert=require('node:assert');
const fs=require('node:fs');

const source=fs.readFileSync('supabase/functions/admin-manage-user/index.ts','utf8');

assert(
  source.includes("admin.from('profiles').update(changes).eq('id', userId).select().single()"),
  'admin-manage-user deve atualizar profiles com service role após validar a Direção.'
);
assert(
  source.includes("admin.from('profiles').update(rollback).eq('id', userId)"),
  'Rollback de profile também deve usar service role.'
);
assert(
  !source.includes("callerDb.from('profiles').update(changes).eq('id', userId).select().single()"),
  'Atualização de profile não pode depender de RLS/grants do cliente comum.'
);

console.log('admin manage user source test ok');
