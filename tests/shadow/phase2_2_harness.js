const fs=require('node:fs');
const path=require('node:path');
const EmbeddedPostgres=require('embedded-postgres').default;
const {Client}=require('pg');

const ROOT='/Users/raphaelmoraes/Downloads/Purple_Gestao_Completo';
const NODE_BIN='/Users/raphaelmoraes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin';
const RUN_SUFFIX=String(process.pid);
const DATA_DIR=path.join(ROOT,`.shadow-pg-${RUN_SUFFIX}`);
const PORT=56000 + (process.pid % 1000);

let cluster;
let dbCounter=0;

function read(file){
  return fs.readFileSync(path.join(ROOT,file),'utf8');
}

async function startCluster(){
  if(cluster)return cluster;
  cluster=new EmbeddedPostgres({
    databaseDir:DATA_DIR,
    user:'postgres',
    password:'postgres',
    port:PORT,
    persistent:false,
    onLog:()=>{},
    onError:()=>{}
  });
  await cluster.initialise();
  await cluster.start();
  const admin=await adminClient('postgres');
  try{
    await ensureRoles(admin);
  } finally {
    await admin.end();
  }
  return cluster;
}

async function stopCluster(){
  if(!cluster)return;
  await cluster.stop();
  cluster=null;
  fs.rmSync(DATA_DIR,{recursive:true,force:true});
}

async function adminClient(database){
  const client=new Client({
    host:'127.0.0.1',
    port:PORT,
    user:'postgres',
    password:'postgres',
    database
  });
  await client.connect();
  return client;
}

async function appClient(database,userId){
  const client=new Client({
    host:'127.0.0.1',
    port:PORT,
    user:'shadow_app',
    password:'shadow_app',
    database
  });
  await client.connect();
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`,[userId||'']);
  return client;
}

async function ensureRoles(client){
  await client.query(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname='authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname='anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname='shadow_app') then
        create role shadow_app login password 'shadow_app';
      end if;
      grant authenticated to shadow_app;
    end $$;
  `);
}

async function createFreshDatabase(prefix='shadow'){
  await startCluster();
  const database=`${prefix}_${Date.now()}_${++dbCounter}`;
  const admin=await adminClient('postgres');
  try{
    await admin.query(`create database "${database}"`);
  } finally {
    await admin.end();
  }
  const db=await adminClient(database);
  try{
    await bootstrapStateA(db);
  } finally {
    await db.end();
  }
  return database;
}

async function bootstrapStateA(client){
  await client.query(`
    create extension if not exists pgcrypto;
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key,
      email text not null unique,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
    $$;

    create or replace function public.touch_updated_at()
    returns trigger
    language plpgsql
    as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$;

    create table public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      name text not null,
      email text not null unique,
      role text not null check (role in ('direction','leader','viewer')),
      sector text not null check (sector in ('all','retencao','pedagogico','financeiro')),
      active boolean not null default true,
      access_scope text not null default 'own_sector' check (access_scope in ('own_sector','all_sectors')),
      permissions jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table public.app_records (
      id text primary key,
      kind text not null check (kind in ('report','action','case','meeting','audit','settings','notification_reads','student','class','teacher','financial_entry')),
      sector text not null check (sector in ('all','retencao','pedagogico','financeiro')),
      owner_id uuid references public.profiles(id) on delete set null,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table public.financial_charges (
      id uuid primary key default gen_random_uuid(),
      student_id text not null,
      financial_account_id uuid,
      asaas_customer_id uuid,
      provider text not null default 'ASAAS',
      external_charge_id text unique,
      external_reference text,
      charge_type text not null,
      billing_type text not null,
      status text not null,
      description text not null,
      competence text,
      due_date date not null,
      value numeric(12,2) not null,
      paid_amount numeric(12,2) not null default 0,
      fee_value numeric(12,2),
      net_value numeric(12,2),
      invoice_url text,
      bank_slip_url text,
      digitable_line text,
      pix_copy_paste text,
      pix_qr_code text,
      paid_at timestamptz,
      student_name text,
      responsible_name text,
      archived_at timestamptz,
      full_value numeric(12,2),
      punctual_value numeric(12,2),
      discount_value numeric(12,2),
      discount_due_date date,
      installment_number integer,
      installment_total integer,
      installment_group_id uuid,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table public.financial_payments (
      id uuid primary key default gen_random_uuid(),
      charge_id uuid references public.financial_charges(id) on delete cascade,
      student_id text not null,
      provider text not null default 'ASAAS',
      external_payment_id text not null unique,
      status text not null default 'PENDING',
      billing_type text not null,
      value numeric(12,2) not null default 0,
      net_value numeric(12,2),
      fee_value numeric(12,2),
      paid_at timestamptz,
      received_at timestamptz,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table public.production_books (
      id uuid primary key,
      created_at timestamptz not null default now()
    );
    create table public.production_book_orders (
      id uuid primary key,
      created_at timestamptz not null default now()
    );
    create table public.production_book_order_items (
      id uuid primary key,
      order_id uuid references public.production_book_orders(id) on delete cascade,
      book_id uuid references public.production_books(id) on delete cascade,
      created_at timestamptz not null default now()
    );

    create or replace function public.default_permissions(p_role text, p_sector text)
    returns jsonb language plpgsql immutable as $$
    declare p jsonb;
    begin
      if p_role = 'direction' then
        return '{
          "panel.view":true,"reports.view":true,"reports.create":true,"reports.edit":true,"reports.delete":true,
          "actions.view":true,"actions.create":true,"actions.edit":true,"actions.delete":true,
          "meetings.view":true,"meetings.edit":true,"cases.view":true,"audit.view":true,
          "settings.view":true,"settings.edit":true,"users.view":true,"users.edit":true,
          "financial.receipts.view":true,"financial.payments.view":true,"financial.receivables.view":true,
          "financial.payables.view":true,"financial.bank_accounts.view":true,"financial.balances.view":true,
          "financial.transactions.create":true,"financial.transactions.edit":true,"financial.transactions.delete":true,
          "financial.export":true,"twr.view.own":true,"twr.manage":true,"twr.submit.own":true,
          "class_opening.manage":true,"class_opening.exception":true
        }'::jsonb;
      elsif p_role = 'leader' then
        p := '{
          "panel.view":true,"reports.view":true,"reports.create":true,"reports.edit":true,"reports.delete":true,
          "actions.view":true,"actions.create":true,"actions.edit":true,"actions.delete":true,
          "meetings.view":true,"cases.view":true,"settings.view":true,"twr.view.own":true
        }'::jsonb;
        if p_sector = 'financeiro' then
          p := p || '{
            "financial.receipts.view":true,"financial.payments.view":true,"financial.receivables.view":true,
            "financial.payables.view":true,"financial.bank_accounts.view":true,"financial.balances.view":true,
            "financial.transactions.create":true,"financial.transactions.edit":true,"financial.transactions.delete":true
          }'::jsonb;
        end if;
        if p_sector = 'pedagogico' then
          p := p || '{"twr.manage":true,"twr.submit.own":true,"class_opening.manage":true}'::jsonb;
        end if;
        return p;
      end if;
      return '{"panel.view":true,"settings.view":true}'::jsonb;
    end;
    $$;

    create or replace function public.is_direction()
    returns boolean language sql stable security definer set search_path = public as $$
      select exists(select 1 from public.profiles where id = auth.uid() and active = true and role = 'direction')
    $$;
    create or replace function public.is_viewer()
    returns boolean language sql stable security definer set search_path = public as $$
      select exists(select 1 from public.profiles where id = auth.uid() and active = true and role = 'viewer')
    $$;
    create or replace function public.my_sector()
    returns text language sql stable security definer set search_path = public as $$
      select sector from public.profiles where id = auth.uid() and active = true
    $$;
    create or replace function public.has_permission(permission_key text)
    returns boolean language sql stable security definer set search_path = public as $$
      select exists(select 1 from public.profiles where id = auth.uid() and active = true and coalesce((permissions ->> permission_key)::boolean,false))
    $$;
    create or replace function public.has_sector_access(record_sector text)
    returns boolean language sql stable security definer set search_path = public as $$
      select exists (
        select 1 from public.profiles
        where id = auth.uid() and active = true and (
          role='direction'
          or access_scope='all_sectors'
          or record_sector = sector
          or record_sector = 'all'
        )
      )
    $$;

    create trigger profiles_touch_updated_at before update on public.profiles
    for each row execute function public.touch_updated_at();
    create trigger app_records_touch_updated_at before update on public.app_records
    for each row execute function public.touch_updated_at();
    create trigger financial_charges_touch_updated_at before update on public.financial_charges
    for each row execute function public.touch_updated_at();
    create trigger financial_payments_touch_updated_at before update on public.financial_payments
    for each row execute function public.touch_updated_at();

    alter table public.profiles enable row level security;
    alter table public.app_records enable row level security;
    alter table public.financial_charges enable row level security;
    alter table public.financial_payments enable row level security;

    create policy profiles_read on public.profiles for select to authenticated
    using (id = auth.uid() or public.is_direction());

    create policy records_read on public.app_records for select to authenticated using (
      public.has_sector_access(sector) and (
        (kind in ('student','class','teacher') and public.has_permission('reports.view')) or
        (kind = 'financial_entry' and (
          public.has_permission('financial.receipts.view') or public.has_permission('financial.payments.view')
          or public.has_permission('financial.receivables.view') or public.has_permission('financial.payables.view')
        )) or
        (kind = 'case' and public.has_permission('cases.view')) or
        (kind = 'settings' and public.has_permission('settings.view')) or
        kind in ('audit','notification_reads')
      )
    );
    create policy records_insert on public.app_records for insert to authenticated with check (
      owner_id = auth.uid() and public.has_sector_access(sector)
    );
    create policy records_update on public.app_records for update to authenticated using (
      public.is_direction() or (public.has_sector_access(sector) and not public.is_viewer())
    ) with check (public.is_direction() or public.has_sector_access(sector));

    create policy financial_charges_select on public.financial_charges for select to authenticated
    using (public.is_direction());
    create policy financial_charges_write on public.financial_charges for all to authenticated
    using (public.is_direction()) with check (public.is_direction());
    create policy financial_payments_select on public.financial_payments for select to authenticated
    using (public.is_direction());

    grant usage on schema public to authenticated;
    grant usage on schema auth to authenticated;
    grant select on public.profiles to authenticated;
    grant select, insert, update, delete on public.app_records to authenticated;
    grant select, insert, update, delete on public.financial_charges to authenticated;
    grant select on public.financial_payments to authenticated;
  `);
}

async function seedProfiles(client){
  const profiles=[
    ['00000000-0000-4000-8000-000000000001','Direção Shadow','direction@shadow.local','direction','all','all_sectors'],
    ['00000000-0000-4000-8000-000000000002','Pedagógico Shadow','ped@shadow.local','leader','pedagogico','own_sector'],
    ['00000000-0000-4000-8000-000000000003','Financeiro Shadow','fin@shadow.local','leader','financeiro','own_sector'],
    ['00000000-0000-4000-8000-000000000004','Retenção Shadow','ret@shadow.local','leader','retencao','own_sector'],
    ['00000000-0000-4000-8000-000000000005','Professor Shadow','teacher@shadow.local','viewer','pedagogico','own_sector'],
    ['00000000-0000-4000-8000-000000000006','Viewer Shadow','viewer@shadow.local','viewer','all','all_sectors']
  ];
  for(const [id,name,email,role,sector,scope] of profiles){
    await client.query(`insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,'{}')`,[id,email]);
    const {rows:[perm]}=await client.query(`select public.default_permissions($1,$2) as p`,[role,sector]);
    let permissions=perm.p;
    if(id==='00000000-0000-4000-8000-000000000005'){
      permissions={...permissions,'twr.view.own':true,'panel.view':true,'reports.view':false,'settings.view':false};
    }
    await client.query(`
      insert into public.profiles (id,name,email,role,sector,active,access_scope,permissions)
      values ($1,$2,$3,$4,$5,true,$6,$7)
    `,[id,name,email,role,sector,scope,permissions]);
  }
  return {
    direction:'00000000-0000-4000-8000-000000000001',
    pedagogical:'00000000-0000-4000-8000-000000000002',
    financial:'00000000-0000-4000-8000-000000000003',
    retention:'00000000-0000-4000-8000-000000000004',
    teacher:'00000000-0000-4000-8000-000000000005',
    viewer:'00000000-0000-4000-8000-000000000006'
  };
}

async function seedHealthyStateA(client, profileIds){
  const owner=profileIds.direction;
  const teachers=[
    {id:'teacher-legacy-1',name:'Professor Alpha',status:'ATIVO',workload:'20h',classesCount:2,score:9.5,updatedAt:'2026-08-28T12:00:00Z',history:[]},
    {id:'teacher-legacy-2',name:'Professor Beta',status:'ATIVO',email:'',phone:'',classesCount:1,score:8.7,updatedAt:'2026-08-28T12:05:00Z',indicators:''}
  ];
  const classes=[
    {id:'class-legacy-1',name:'Turma Aurora',course:'PURPLE WAY',category:'ADULTO',teacherId:'teacher-legacy-1',bookId:'book-legacy-1',classNumber:1,capacity:8,studentsCount:1,moduleHours:40,classType:'REGULAR',room:'Sala 1',schedule:'Seg 19h',scheduleBlocks:[{day:'SEGUNDA',start:'19:00',end:'20:00'}],recessPeriods:[],status:'ATIVO',updatedAt:'2026-08-28T12:10:00Z'},
    {id:'class-legacy-2',name:'Turma Boreal',course:'PURPLE WAY',category:'ADULTO',teacherId:'teacher-legacy-2',bookId:'book-legacy-2',classNumber:2,capacity:10,studentsCount:0,moduleHours:40,classType:'REGULAR',room:'Sala 2',schedule:'Qua 18h',scheduleBlocks:[{day:'QUARTA',start:'18:00',end:'19:00'}],recessPeriods:[{start:'2026-12-20',end:'2027-01-10'}],status:'ATIVO',updatedAt:'2026-08-28T12:15:00Z'}
  ];
  const students=[
    {id:'student-legacy-1',code:'AL001',name:'Aluno One',fullName:'Aluno One',guardian:'Responsável One',responsible:'Responsável One',status:'ATIVO',birthDate:'2010-01-01',birth_date:'2010-01-01',phone:'0000',whatsapp:'0000',registrationDate:'2026-01-10',classId:'class-legacy-1',responsibles:[{name:'Resp One'}],responsibleFinancial:{name:'Resp Finance One'},addressData:{city:'Cidade'},timeline:[{at:'2026-08-20T09:00:00Z',title:'Cadastro atualizado',detail:'ALTERAÇÃO ACADÊMICA'}]},
    {id:'student-legacy-2',code:'AL002',name:'Aluno Two',fullName:'Aluno Two',guardian:'Responsável Two',responsible:'Responsável Two',status:'ATIVO',birthDate:'2011-02-02',birth_date:'2011-02-02',phone:'1111',whatsapp:'1111',registrationDate:'2026-02-11',responsibles:[{name:'Resp Two'}],responsibleFinancial:{name:'Resp Finance Two'},addressData:{city:'Cidade'},timeline:[]}
  ];
  const charges=[
    {id:'10000000-0000-4000-8000-000000000001',student_id:'student-legacy-1',status:'PENDING',due_date:'2026-09-10',value:100,full_value:100,punctual_value:95,discount_value:5,competence:'2026-09',installment_number:1,installment_total:1,external_charge_id:'charge-ext-1',description:'Mensalidade Setembro',data:{externalChargeId:'charge-ext-1'}},
    {id:'10000000-0000-4000-8000-000000000002',student_id:'student-legacy-2',status:'CANCELED',due_date:'2026-09-12',value:150,full_value:150,punctual_value:150,discount_value:0,competence:'2026-09',installment_number:1,installment_total:1,external_charge_id:'charge-ext-2',description:'Mensalidade Setembro',data:{externalChargeId:'charge-ext-2'}}
  ];
  const financialEntries=[
    {id:'fin-legacy-1',supabaseId:'10000000-0000-4000-8000-000000000001',externalChargeId:'charge-ext-1',studentId:'student-legacy-1',amount:100,fullValue:100,punctualValue:95,discountValue:5,dueDate:'2026-09-10',competence:'2026-09',installmentNumber:1,installmentTotal:1,status:'pending',asaasPayment:{id:'ap-1'}},
    {id:'fin-legacy-2',supabaseId:'10000000-0000-4000-8000-000000000002',externalChargeId:'charge-ext-2',studentId:'student-legacy-2',amount:150,fullValue:150,punctualValue:150,discountValue:0,dueDate:'2026-09-12',competence:'2026-09',installmentNumber:1,installmentTotal:1,status:'canceled',asaasPayment:{id:'ap-2'},cancelResponse:{ok:true}}
  ];
  const caseRecord={id:'case-legacy-1',student:'Aluno One',course:'PURPLE WAY',group:'Turma Aurora',owner:'Retenção Shadow',nextStep:'Ligar para responsável',deadline:'2026-09-15',updatedAt:'2026-08-28T13:00:00Z',retencao:{level:'warn',summary:'Contato pendente'},pedagogico:{level:'good',summary:'Sem alerta'},financeiro:{level:'warn',summary:'Vencimento próximo'}};

  for(const row of teachers)await insertAppRecord(client,{id:row.id,kind:'teacher',sector:'pedagogico',owner_id:owner,data:row});
  for(const row of classes)await insertAppRecord(client,{id:row.id,kind:'class',sector:'pedagogico',owner_id:owner,data:row});
  for(const row of students)await insertAppRecord(client,{id:row.id,kind:'student',sector:'pedagogico',owner_id:owner,data:row});
  for(const row of financialEntries)await insertAppRecord(client,{id:row.id,kind:'financial_entry',sector:'financeiro',owner_id:owner,data:row});
  await insertAppRecord(client,{id:'settings-default',kind:'settings',sector:'all',owner_id:owner,data:{schoolName:'Shadow School'}});
  await insertAppRecord(client,{id:caseRecord.id,kind:'case',sector:'retencao',owner_id:owner,data:caseRecord});

  for(const charge of charges){
    await client.query(`
      insert into public.financial_charges (
        id, student_id, provider, external_charge_id, external_reference, charge_type, billing_type,
        status, description, competence, due_date, value, paid_amount, full_value, punctual_value,
        discount_value, discount_due_date, installment_number, installment_total, student_name,
        responsible_name, data
      ) values (
        $1,$2,'ASAAS',$3,$3,'MENSALIDADE','PIX',$4,$5,$6,$7,$8,0,$9,$10,$11,$7,$12,$13,'Aluno Shadow','Resp Shadow',$14
      )
    `,[charge.id,charge.student_id,charge.external_charge_id,charge.status,charge.description,charge.competence,charge.due_date,charge.value,charge.full_value,charge.punctual_value,charge.discount_value,charge.installment_number,charge.installment_total,charge.data]);
  }

  await client.query(`insert into public.production_books (id) values ('20000000-0000-4000-8000-000000000001')`);
  await client.query(`insert into public.production_book_orders (id) values ('20000000-0000-4000-8000-000000000002')`);
  await client.query(`insert into public.production_book_order_items (id,order_id,book_id) values ('20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001')`);
}

async function insertAppRecord(client,row){
  await client.query(`
    insert into public.app_records (id,kind,sector,owner_id,data)
    values ($1,$2,$3,$4,$5)
  `,[row.id,row.kind,row.sector,row.owner_id,row.data]);
}

async function applySqlFile(client,file){
  await client.query(read(file));
}

async function applyStateBCore(client){
  await applySqlFile(client,'supabase/migrations/20260828_academic_transition_v2.sql');
  await applySqlFile(client,'supabase/migrations/20260828_financial_transition_v2.sql');
  await applySqlFile(client,'supabase/migrations/20260828_student_followups_v2.sql');
  await applySqlFile(client,'supabase/migrations/20260828_integrated_cases_v2.sql');
  await applySqlFile(client,'supabase/migrations/20260828_twr_v2.sql');
  await applySqlFile(client,'supabase/migrations/20260828_class_opening_v2.sql');
  await applySqlFile(client,'supabase/migrations/20260828_academic_rpc_v1.sql');
}

async function runReadOnlyQuery(client,file){
  const {rows}=await client.query(read(file));
  return rows;
}

async function setAcademicSource(client,value,userId){
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`,[userId]);
  await client.query(`update public.runtime_flags set flag_value=$1, updated_at=now(), updated_by=$2 where flag_key='ACADEMIC_SOURCE'`,[value,userId]);
}

module.exports={
  ROOT, PORT, NODE_BIN,
  read,
  startCluster, stopCluster,
  createFreshDatabase,
  adminClient, appClient,
  seedProfiles, seedHealthyStateA,
  applySqlFile, applyStateBCore, runReadOnlyQuery, setAcademicSource
};
