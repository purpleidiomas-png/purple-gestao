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
global.PurpleCore={supabase:{state:{ready:true,client:null},isReady:()=>true,getClient:()=>global.supabase.createClient()},ui:{toast(){},modal(html){getElement('modalRoot').innerHTML=html},closeModal(){getElement('modalRoot').innerHTML=''}}};

vm.runInThisContext(fs.readFileSync('app.js','utf8'),{filename:'app.js'});

const state=global.PurpleState;
state.user={id:'qa-direction',name:'QA Direção',email:'qa@purple.test',role:'direction',sector:'all',accessScope:'all_sectors',permissions:new Proxy({}, {get:()=>true}),active:true};
state.sector='integrado';

(async()=>{
global.fetch=async (url,options={})=>{
  if(String(url).includes('/api/evolution?action=config'))return {ok:true,status:200,json:async()=>({configured:false,missing:['EVOLUTION_API_URL','EVOLUTION_API_KEY'],instanceName:'purple-gestao'})};
  return {ok:false,status:502,json:async()=>({error:'Evolution API não configurada',missing:['EVOLUTION_API_URL','EVOLUTION_API_KEY']})};
};

global.App.go('whatsapp');
let html=getElement('pageContainer').innerHTML;
assert(html.includes('Central de Atendimento')&&html.includes('Conversas'), 'Central de Atendimento deve abrir como área única de trabalho.');
assert(html.includes('Aluno / contato')&&html.includes('Digite sua resposta...'), 'Central deve priorizar lista, chat e painel do contato.');
assert(html.includes('Conectar WhatsApp')&&html.includes('Financeiro')&&html.includes('Follow-up'), 'MVP deve focar conexão, resposta e consulta rápida.');
assert(!html.includes('Campanhas')&&!html.includes('Automações'), 'MVP não deve destacar automações ou campanhas na rotina da equipe.');

for(const tab of ['connections','conversations','templates']){
  global.App.setWhatsAppTab(tab);
  html=getElement('pageContainer').innerHTML;
  assert(html.length>100, `Aba ${tab} deve renderizar conteúdo.`);
}

global.App.setWhatsAppTab('conversations');
global.App.setWhatsAppSearch('Raphael');
html=getElement('pageContainer').innerHTML;
assert(html.includes('Raphael')||html.includes('Nenhuma conversa'), 'Pesquisa de conversas deve renderizar resultado ou vazio controlado.');

global.App.setWhatsAppSearch('');
global.App.setWhatsAppFilter('unread');
html=getElement('pageContainer').innerHTML;
assert(html.includes('Não lidas')||html.includes('Nenhuma conversa'), 'Filtro de não lidas deve renderizar.');

global.App.setWhatsAppFilter('all');
global.App.setWhatsAppCrmStatus('lead-1','Negociação');
assert.strictEqual(state.whatsappStages['lead-1'],'Negociação','Status CRM deve ser alterado diretamente na conversa.');
global.App.openWhatsAppTemplate('welcome');
assert(getElement('whatsappComposer').value.includes('Seja bem-vindo'), 'Template deve preencher o compositor.');
getElement('whatsappComposer').value='Mensagem fictícia de QA pelo módulo WhatsApp.';
const before=(state.whatsappMessages||[]).length;
await global.App.sendWhatsAppMessage();
assert.strictEqual((state.whatsappMessages||[]).length,before+1,'Enviar deve registrar mensagem na conversa da sessão.');

await global.App.whatsappConnectionAction('connect');
assert((state.whatsappConnection.missing||[]).includes('EVOLUTION_API_KEY'),'Conexão deve informar variáveis faltantes da Evolution API.');
global.App.openWhatsAppDrawer('financial');
assert(getElement('pageContainer').innerHTML.includes('Financeiro do contato'),'Drawer financeiro deve abrir sem sair da Central.');
global.App.openWhatsAppDrawer('details');
assert(getElement('pageContainer').innerHTML.includes('Dados do aluno'),'Drawer de dados deve abrir sem sair da Central.');
global.App.openWhatsAppDrawer('followup');
getElement('centralFollowUpNote').value='QA registrou contato operacional.';
const beforeFollow=(state.whatsappMessages||[]).length;
global.App.saveServiceFollowUp();
assert.strictEqual((state.whatsappMessages||[]).length,beforeFollow+1,'Salvar follow-up deve registrar histórico na conversa.');
global.App.saveWhatsAppTemplate();

console.log('whatsapp module test ok');
})().catch(error=>{console.error(error);process.exit(1)});
