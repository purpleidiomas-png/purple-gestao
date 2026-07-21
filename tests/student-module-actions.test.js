const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

class ElementMock{
  constructor(id=''){this.id=id;this.value='';this.checked=false;this.innerHTML='';this.textContent='';this.disabled=false;this.dataset={};this.style={};this.files=[];this.options=[];this.classList={add(){},remove(){},toggle(){},contains(){return false}}}
  addEventListener(){}
  insertAdjacentHTML(_pos,html){this.innerHTML+=html}
  querySelector(selector){if(selector.startsWith('#'))return getElement(selector.slice(1));return new ElementMock(selector)}
  querySelectorAll(){return []}
  closest(){return null}
  after(){}
  remove(){}
}

const elements=new Map();
const getElement=id=>elements.get(id)||elements.set(id,new ElementMock(id)).get(id);
function setValue(id,value){getElement(id).value=value}
function setChecked(id,value){getElement(id).checked=value}

global.window=global;
global.addEventListener=()=>{};
global.location={hash:'',protocol:'file:'};
global.navigator={};
global.requestAnimationFrame=fn=>fn();
global.setTimeout=()=>0;
global.confirm=()=>true;
global.alert=()=>{};
global.open=()=>({document:{write(){},close(){}},focus(){}});
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
state.user={id:'qa-direction',name:'QA Direção',email:'qa@purple.test',role:'direction',sector:'direcao',accessScope:'all_sectors',permissions:new Proxy({}, {get:()=>true}),active:true};
state.page='students';
state.sector='integrado';
state.db={...state.db,students:[{id:'student-qa',code:'QA001',name:'Aluno Teste QA',document:'00000000000',phone:'27992052581',whatsapp:'27992052581',email:'qa.aluno@purple.test',city:'Campo Grande',guardian:'Responsável QA',situation:'Ativo',financialStatus:'Em dia',timeline:[]}],classes:[{id:'class-qa',name:'Turma QA',day:'Segunda',room:'Sala 01'}],teachers:[{id:'teacher-qa',name:'Professor QA'}],financialEntries:[],settings:{...state.db.settings}};
state.selectedStudentId='student-qa';

(async()=>{
  setValue('studentFollowupNote','Contato fictício de QA para validar salvamento.');
  await global.App.saveStudentFollowUp('student-qa');
  assert.strictEqual(state.db.students[0].followUpEntries.length,1,'Follow-up deve ser salvo mesmo com campos opcionais vazios.');

  setValue('studentScheduleKind','normal');setValue('studentScheduleDay','Segunda');setValue('studentScheduleStartDate','2026-07-20');setValue('studentScheduleTime','08:00');setValue('studentScheduleEndTime','09:00');setValue('studentScheduleRoom','Sala 01');setValue('studentScheduleTeacher','teacher-qa');setValue('studentScheduleType','Turma');setValue('studentScheduleNotes','Horário fictício QA');
  await global.App.saveStudentSchedule('student-qa');
  assert.strictEqual(state.db.students[0].scheduleEntries.length,1,'Horário deve ser salvo.');

  setValue('studentAttendanceDate','2026-07-20');setValue('studentAttendanceScheduledTime','08:00 às 09:00');setValue('studentAttendanceEntryTime','08:02');setValue('studentAttendanceTeacher','teacher-qa');setValue('studentAttendanceClassType','Normal');setValue('studentAttendanceStatus','present');setChecked('studentAttendanceAnticipated',false);setChecked('studentAttendanceReplacement',false);setValue('studentAttendanceNotes','Presença fictícia QA');
  await global.App.saveStudentAttendance('student-qa');
  assert.strictEqual(state.db.students[0].attendanceEntries.length,1,'Frequência deve ser salva.');

  setValue('studentGradeModule','Travel');setValue('studentGradeType','Speaking');setValue('studentGradeScore','92');setValue('studentGradeDate','2026-07-20');setValue('studentGradeStatus','Lançado');setValue('studentGradeNotes','Nota fictícia QA');
  await global.App.saveStudentGrade('student-qa');
  assert.strictEqual(state.db.students[0].gradeEntries.length,1,'Nota deve ser salva.');

  setValue('studentParcelCount','2');setValue('studentParcelDiscountValue','295');setValue('studentParcelFullValue','397');setValue('studentParcelFirstDue','2026-07-20');setValue('studentParcelPaymentMethod','PIX');setValue('studentParcelSubaccount','Mensalidade');setValue('studentParcelHistory','Mensalidade QA');setChecked('studentParcelReplace',false);
  await global.App.saveStudentInstallments('student-qa');
  assert.strictEqual(state.db.financialEntries.length,2,'Parcelas devem ser criadas.');

  const entry=state.db.financialEntries[0];
  setValue('studentReceiveDate','2026-07-20');getElement('studentReceiveDue').dataset={base:String(entry.amount)};setValue('studentReceiveBonus','0');setValue('studentReceiveInterest','0');setValue('studentReceiveFine','0');setValue('studentReceivePaid',String(entry.amount));setValue('studentReceiveReceived',String(entry.amount));setValue('studentReceiveMethod','PIX');setValue('studentReceiveAccount','Caixa da escola');setValue('studentReceiveCheckFor','');setValue('studentReceiveCheckNumber','');setValue('studentReceiveNotes','Recebimento fictício QA');
  await global.App.saveStudentReceivePayment('student-qa',entry.id);
  assert.strictEqual(entry.status,'paid','Recebimento deve quitar a parcela.');

  for(const tab of ['courses','payments','schedule','frequency','grades','followup','contacts','documents','history','whatsapp','more']){
    state.studentTab=tab;
    const html=global.App.renderPage?null:null;
    const content=global.PurpleState.selectedStudentId&&global.document.querySelector('#pageContainer');
    global.App.go('students');
    assert(getElement('pageContainer').innerHTML.length>20, `Aba ${tab} deve renderizar.`);
  }

  console.log('student module actions test ok');
})().catch(error=>{console.error(error);process.exit(1)});
