const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

class ElementMock{
  constructor(id=''){this.id=id;this.value='';this.innerHTML='';this.textContent='';this.disabled=false;this.dataset={};this.style={};this.files=[];this.classList={add(){},remove(){},toggle(){},contains(){return false}}}
  addEventListener(){}
  insertAdjacentHTML(_pos,html){this.innerHTML+=html}
  querySelector(){return new ElementMock()}
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
global.navigator={serviceWorker:{register:()=>Promise.resolve()}};
global.requestAnimationFrame=fn=>fn();
global.setTimeout=()=>0;
global.confirm=()=>true;
global.Blob=function(){};
global.URL={createObjectURL:()=>'',revokeObjectURL(){}};
global.document={
  scripts:[{getAttribute:()=> 'auth/config.js'},{getAttribute:()=> 'app.js'}],
  body:new ElementMock('body'),
  addEventListener(){},
  createElement:tag=>new ElementMock(tag),
  querySelector(selector){if(selector.startsWith('#'))return getElement(selector.slice(1));if(selector==='.login-card')return getElement('loginCard');return new ElementMock(selector)},
  querySelectorAll(){return []},
  getElementById:getElement
};
global.performance={getEntriesByType:()=>[]};
global.PurpleAuthConfig={appVersion:'test',serviceWorkerVersion:'test-cache',manifestVersion:'manifest.webmanifest',supabaseUrl:'https://example.supabase.co',supabaseKey:'test-key'};
global.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null}),signOut:async()=>({})},from:()=>({select(){return this},eq(){return this},single:async()=>({data:null,error:null}),order(){return this},limit(){return this}})})};
global.PurpleCore={supabase:{state:{ready:true,client:null},isReady:()=>true,getClient:()=>global.supabase.createClient()},ui:{toast(){},modal(){},closeModal(){}}};

vm.runInThisContext(fs.readFileSync('app.js','utf8'),{filename:'app.js'});

const state=global.PurpleState;
assert(state, 'PurpleState deve ser exposto.');
state.user={id:'qa-direction',name:'QA Direção',email:'qa@purple.test',role:'direction',sector:'direcao',accessScope:'all_sectors',permissions:new Proxy({}, {get:()=>true}),active:true,phone:'',jobTitle:'',avatarUrl:'',electronicSignature:'',lastLoginAt:null,createdAt:null};
state.sector='integrado';

const pages=['home','dashboard','purple-ia','financial','reports','new-report','operational-diary','students','classes','teachers','twr','actions','cases','meetings','mural','whatsapp','notifications','inventory','users','audit','settings'];
const failures=[];
for(const page of pages){
  try{
    global.App.go(page);
    const html=getElement('pageContainer').innerHTML;
    assert(html&&html.length>20, `${page} deve renderizar conteúdo.`);
    assert(!/undefined undefined|null null/.test(html), `${page} não deve renderizar placeholders quebrados.`);
  }catch(error){
    failures.push(`${page}: ${error.message}`);
  }
}
assert.deepStrictEqual(failures, [], `Falhas de renderização: ${failures.join(' | ')}`);
console.log(`quality gate render smoke ok (${pages.length} telas)`);
