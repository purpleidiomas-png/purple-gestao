const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
class Element{
  constructor(){this.innerHTML='';this.dataset={};this.style={};this.classList={add(){},remove(){},toggle(){},contains(){return false}}}
  addEventListener(){} getAttribute(){return ''} querySelector(){return new Element()} querySelectorAll(){return []} closest(){return null} remove(){} scrollIntoView(){}
}
const elements=new Map(),element=id=>elements.get(id)||elements.set(id,new Element()).get(id);
global.window=global;global.addEventListener=()=>{};global.location={hash:'',protocol:'https:'};global.navigator={};
global.requestAnimationFrame=fn=>fn();global.setTimeout=()=>0;global.confirm=()=>true;
global.document={scripts:[{getAttribute:()=> 'app.js'}],body:new Element(),addEventListener(){},createElement:()=>new Element(),querySelector:s=>element(s.replace(/^#/,'')),querySelectorAll:()=>[],getElementById:element};
global.performance={getEntriesByType:()=>[]};global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
global.PurpleAuthConfig={appVersion:'test',serviceWorkerVersion:'test-cache',supabaseUrl:'',supabaseKey:''};
vm.runInThisContext(fs.readFileSync('app.js','utf8'),{filename:'app.js'});
const state=global.PurpleState;
const anna={id:'anna-test',name:'Anna',role:'leader',sector:'financeiro',accessScope:'own_sector',permissions:{'panel.view':true,'teachers.view':true,'twr.manage':true}};
const routines=[
  {id:'a',teacherId:'teacher-a',title:'Regular class',type:'AULA',day:'SEGUNDA'},
  {id:'r',teacherId:'teacher-b',title:'Team replacement',type:'REPOSICAO',day:'TERCA'},
  {id:'p',teacherId:'teacher-c',title:'PURPLE CLASS',type:'FREE_TRIAL',day:'SEXTA'}
].map(item=>({...item,active:true,recurrence:'WEEKLY',start:'08:00',end:'09:00'}));
state.user=anna;state.db={...state.db,users:[anna],teachers:[{id:'teacher-a',name:'Teacher A'},{id:'teacher-b',name:'Teacher B'},{id:'teacher-c',name:'Teacher C'}],twr:{version:'manual-empty-v2',routines,events:[],filters:{view:'week',type:'AULA',day:'SEGUNDA'}}};
global.App.go('twr');
let html=element('pageContainer').innerHTML;
assert.equal(state.db.twr.filters.view,'team','Staff starts in the consolidated agenda');
assert.equal(state.db.twr.filters.type,'all','Another user cannot restrict staff to regular classes');
assert(html.includes('Team replacement')&&html.includes('PURPLE CLASS'));
global.App.setTwrFilter('type','REPOSICAO');
html=element('pageContainer').innerHTML;
assert(html.includes('Team replacement')&&!html.includes('PURPLE CLASS'),'Explicit user filter still works');
state.user={...anna,id:'another-admin'};global.App.go('twr');
assert.equal(state.db.twr.filters.type,'all','Filters do not leak across logins');
const storage=global.PurpleStorage;
const workspace={id:'twr-workspace',kind:'twr_workspace',sector:'pedagogico',owner_id:'original-owner',data:state.db.twr};
storage.metadata.set(workspace.id,{sector:workspace.sector,owner_id:workspace.owner_id});
const before=storage.serialize(workspace);
global.App.setTwrView('week');
global.App.setTwrFilter('type','REPOSICAO');
assert.equal(storage.serialize(workspace),before,'Navigation cannot cause a workspace write');
assert.equal(storage.rows(state.db).find(row=>row.id===workspace.id).owner_id,workspace.owner_id);
const teacherUser={...anna,id:'teacher-login',name:'Teacher B',role:'teacher',teacherId:'teacher-b'};
state.user=teacherUser;
state.db.teachers.find(item=>item.id==='teacher-b').userId=teacherUser.id;
global.App.go('twr');
html=element('pageContainer').innerHTML;
assert(html.includes('Team replacement')&&!html.includes('Regular class')&&!html.includes('PURPLE CLASS'),'Teacher with legacy admin permissions still sees only own activities');
assert.equal(state.db.twr.filters.view,'week');
assert(!storage.rows(state.db).some(row=>row.kind==='twr_workspace'),'Teacher cannot overwrite the team workspace');
global.App.twrOpenLesson('p');
assert(!element('modalContent').innerHTML.includes('PURPLE CLASS'),'Foreign activity details are blocked');
if(process.argv.includes('--production-anna')){
  const raw=execFileSync('pnpm',['dlx','supabase@latest','db','query','--linked',`begin; select set_config('request.jwt.claim.sub','f13cd9af-39fa-495c-9927-c04212d3a0c4',true); set local role authenticated;
    select jsonb_build_object('user',(select to_jsonb(p) from profiles p where id=auth.uid()),'teachers',(select jsonb_agg(data) from app_records where kind='teacher'),'twr',(select data from app_records where kind='twr_workspace')) as payload`],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const payload=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows[0].payload;
  state.user={...payload.user,accessScope:payload.user.access_scope};
  state.db={...state.db,teachers:payload.teachers,users:[state.user],twr:payload.twr};
  global.App.go('twr');html=element('pageContainer').innerHTML;
  const expected=twrProjectedActivities().filter(item=>payload.teachers.some(teacher=>teacherIdentityIds(teacher).map(catalogMatchToken).includes(catalogMatchToken(item.teacherId))));
  for(const item of expected)assert(html.includes(item.occurrenceId),`Anna cannot see ${item.type}/${item.id}`);
  const rawTeachers=execFileSync('pnpm',['dlx','supabase@latest','db','query','--linked',"select jsonb_agg(to_jsonb(p)) payload from profiles p where role='teacher' and active=true"],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const profiles=JSON.parse(rawTeachers.slice(rawTeachers.indexOf('{'),rawTeachers.lastIndexOf('}')+1)).rows[0].payload;
  for(const profile of profiles){
    state.user={...profile,accessScope:profile.access_scope};
    const fullDb={...state.db,teachers:payload.teachers,users:[state.user],twr:structuredClone(payload.twr)};
    state.db=sanitizeTeacherDb(fullDb,state.user);
    const ownIds=teacherIdentityIds(resolveTeacherRecordForUser(state.user,fullDb),fullDb).map(catalogMatchToken);
    const ownRecords=[...payload.twr.routines,...payload.twr.events].filter(item=>ownIds.includes(catalogMatchToken(item.teacherId)));
    assert.equal(state.db.twr.routines.length+state.db.twr.events.length,ownRecords.length,`${profile.name}: missing stored activities`);
    assert([...state.db.twr.routines,...state.db.twr.events].every(item=>ownIds.includes(catalogMatchToken(item.teacherId))));
    global.App.go('twr');
    const teacherHtml=element('pageContainer').innerHTML;
    for(const item of twrProjectedActivities())assert(teacherHtml.includes(item.occurrenceId),`${profile.name}: missing own occurrence ${item.id}`);
  }
  console.log(`PASS production: Anna sees all ${expected.length} weekly occurrences; ${profiles.length} teachers see all and only their own records.`);
}
console.log('PASS: complete team agenda, all activity categories, explicit filters and login isolation.');
