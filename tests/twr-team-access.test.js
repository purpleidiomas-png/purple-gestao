const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

class ElementMock{
  constructor(id=''){this.id=id;this.value='';this.innerHTML='';this.textContent='';this.disabled=false;this.dataset={};this.style={};this.files=[];this.classList={add(){},remove(){},toggle(){},contains(){return false}}}
  addEventListener(){}
  insertAdjacentHTML(_pos,html){this.innerHTML+=html}
  querySelector(selector){if(selector.startsWith('#'))return getElement(selector.slice(1));return new ElementMock(selector)}
  querySelectorAll(){return []}
  closest(){return null}
  scrollIntoView(){}
  remove(){}
  reportValidity(){return true}
}

const elements=new Map();
const getElement=id=>elements.get(id)||elements.set(id,new ElementMock(id)).get(id);

global.window=global;
global.addEventListener=()=>{};
global.location={hash:'',protocol:'https:'};
global.navigator={};
global.requestAnimationFrame=fn=>fn();
global.setTimeout=()=>0;
global.confirm=()=>true;
global.alert=()=>{};
global.Blob=function(){};
global.URL={createObjectURL:()=>'',revokeObjectURL(){}};
global.document={
  scripts:[{getAttribute:()=> 'app.js'}],
  body:new ElementMock('body'),
  addEventListener(){},
  createElement:tag=>new ElementMock(tag),
  querySelector(selector){if(selector.startsWith('#'))return getElement(selector.slice(1));return new ElementMock(selector)},
  querySelectorAll(){return []},
  getElementById:getElement
};
global.performance={getEntriesByType:()=>[]};
global.PurpleAuthConfig={appVersion:'test',serviceWorkerVersion:'test-cache',manifestVersion:'manifest.webmanifest',supabaseUrl:'',supabaseKey:''};

vm.runInThisContext(fs.readFileSync('app.js','utf8'),{filename:'app.js'});

const state=global.PurpleState;
state.user={id:'u-dir',name:'Direção QA',email:'direcao@purple.test',role:'direction',sector:'all',accessScope:'all_sectors',permissions:{'users.view':true,'users.edit':true,'panel.view':true},active:true};
global.App.go('users');
const usersHtml=getElement('pageContainer').innerHTML;
assert(usersHtml.includes('Professor coordenação TWR'),'Direção deve ter um perfil pronto para liberar professor com visão TWR da equipe.');
global.App.editUser();
const modalHtml=getElement('modalRoot').innerHTML;
assert(modalHtml.includes('TWR da equipe'),'Editor de usuário deve expor o acesso de equipe do TWR como opção clara.');
global.App.closeModal();

const permissions={
  'panel.view':true,
  'twr.view.own':false,
  'twr.approve':false,
  'classes.view':true,
  'teachers.view':true,
  'twr.manage':false
};

state.user={id:'u-deborah-qa',name:'Deborah QA',email:'deborah@purple.test',role:'teacher',sector:'pedagogico',accessScope:'own_sector',permissions,active:true};
state.db={
  ...state.db,
  teachers:[
    {id:'teach-a',name:'Teacher A',active:true},
    {id:'teach-b',name:'Teacher B',active:true}
  ],
  twr:{version:'manual-empty-v2',routines:[],events:[
    {id:'evt-a',teacherId:'teach-a',type:'AULA',start:'08:00',end:'10:10',recurrence:'WEEKLY',day:'SEGUNDA',title:'Connect A',displayClassName:'Connect A',active:true},
    {id:'evt-b',teacherId:'teach-b',type:'AULA',start:'14:00',end:'16:10',recurrence:'WEEKLY',day:'TERCA',title:'Explore B',displayClassName:'Explore B',active:true}
  ],exceptions:[],workWindows:[],history:[],notifications:[],filters:{view:'team',weekOffset:0,type:'all',day:'all'}}
};

global.App.go('twr');
const html=getElement('pageContainer').innerHTML;

assert.strictEqual(state.page,'twr','Deborah deve conseguir abrir o TWR.');
assert(html.includes('Todos os professores'),'Coordenação deve ver o dashboard de todos os professores.');
assert(html.includes('Carga da equipe'),'Coordenação deve ver métricas consolidadas da equipe.');
assert(html.includes('Teacher A')||html.includes('Teacher B'),'Coordenação deve ver horários/teachers no quadro.');
assert(!html.includes('Limpar TWR'),'Quem não tem twr.manage não deve ver ação destrutiva.');
assert(!html.includes('+ Nova atividade'),'Quem não tem twr.manage não deve criar atividade.');

state.user={id:'u-teacher-basic',name:'Professor comum',email:'teacher@purple.test',role:'teacher',sector:'pedagogico',accessScope:'own_records',permissions:{
  'panel.view':true,
  'twr.view.own':true,
  'classes.view':true,
  'twr.approve':false,
  'teachers.view':false,
  'twr.manage':false
},active:true};

global.App.go('twr');
const teacherHtml=getElement('pageContainer').innerHTML;

assert(!teacherHtml.includes('Todos os teachers'),'Professor comum não deve ver a visão de equipe.');
assert(teacherHtml.includes('Meu TWR'),'Professor comum deve continuar na visão individual.');

console.log('twr team access test ok');
