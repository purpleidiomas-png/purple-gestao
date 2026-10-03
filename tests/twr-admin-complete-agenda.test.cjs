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
if(process.argv.includes('--production-anna')){
  const raw=execFileSync('pnpm',['dlx','supabase@latest','db','query','--linked',`begin; select set_config('request.jwt.claim.sub','f13cd9af-39fa-495c-9927-c04212d3a0c4',true); set local role authenticated;
    select jsonb_build_object('user',(select to_jsonb(p) from profiles p where id=auth.uid()),'teachers',(select jsonb_agg(data) from app_records where kind='teacher'),'twr',(select data from app_records where kind='twr_workspace')) as payload`],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const payload=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows[0].payload;
  state.user={...payload.user,accessScope:payload.user.access_scope};
  state.db={...state.db,teachers:payload.teachers,users:[state.user],twr:payload.twr};
  global.App.go('twr');html=element('pageContainer').innerHTML;
  const extra=payload.twr.routines.filter(item=>item.active!==false&&['REPOSICAO','FREE_TRIAL','PLANEJAMENTO'].includes(item.type));
  assert.equal(extra.filter(item=>item.type==='REPOSICAO').length,3);
  assert.equal(extra.filter(item=>item.type==='FREE_TRIAL').length,1);
  for(const item of extra)assert(html.includes(`${item.id}@`),`Anna cannot see ${item.type}/${item.id}`);
  console.log(`PASS production Anna: all ${extra.length} non-class routines rendered, including 3 replacements and 1 Purple Class.`);
}
console.log('PASS: complete team agenda, all activity categories, explicit filters and login isolation.');
