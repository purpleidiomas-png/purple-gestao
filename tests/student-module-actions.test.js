const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

class ElementMock{
  constructor(id=''){this.id=id;this.value='';this.checked=false;this.innerHTML='';this.textContent='';this.disabled=false;this.dataset={};this.style={};this.files=[];this.options=[];this.classList={add(){},remove(){},toggle(){},contains(){return false}}}
  addEventListener(){}
  insertAdjacentHTML(_pos,html){this.innerHTML+=html}
  querySelector(selector){if(selector.startsWith('#'))return getElement(selector.slice(1));return new ElementMock(selector)}
  querySelectorAll(){return []}
  closest(selector){return selector===`#${this.id}`?this:null}
  after(){}
  remove(){}
}

const elements=new Map();
const getElement=id=>elements.get(id)||elements.set(id,new ElementMock(id)).get(id);
function setValue(id,value){getElement(id).value=value}
function setChecked(id,value){getElement(id).checked=value}
const documentListeners={};
function addDocumentListener(type,handler){
  documentListeners[type]=documentListeners[type]||[];
  documentListeners[type].push(handler);
}
async function flushPromises(){for(let i=0;i<8;i++)await Promise.resolve()}

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
  addEventListener:addDocumentListener,
  createElement:tag=>new ElementMock(tag),
  querySelector(selector){if(selector.startsWith('#'))return getElement(selector.slice(1));return new ElementMock(selector)},
  querySelectorAll(){return []},
  getElementById:getElement
};
global.performance={getEntriesByType:()=>[]};
global.PurpleAuthConfig={appVersion:'test',serviceWorkerVersion:'test-cache',manifestVersion:'manifest.webmanifest',supabaseUrl:'',supabaseKey:''};

vm.runInThisContext(fs.readFileSync('app.js','utf8'),{filename:'app.js'});
const appSource=fs.readFileSync('app.js','utf8');
assert(appSource.includes('bindStudentSaveButtonDelegation'),'Botão Salvar aluno deve ter listener delegado de segurança.');
assert(/data-student-id="\$\{escapeHTML\(id\|\|''\)\}"/.test(appSource),'Botão Salvar aluno deve carregar o id do aluno para o listener delegado.');
assert(appSource.includes('data-next-action="close"'),'Botão Salvar aluno deve carregar a ação de fechamento para o listener delegado.');

const state=global.PurpleState;
state.user={id:'qa-direction',name:'QA Direção',email:'qa@purple.test',role:'direction',sector:'direcao',accessScope:'all_sectors',permissions:new Proxy({}, {get:()=>true}),active:true};
state.page='students';
state.sector='integrado';
state.db={...state.db,students:[{id:'student-qa',code:'QA001',name:'Aluno Teste QA',document:'00000000000',phone:'27992052581',whatsapp:'27992052581',email:'qa.aluno@purple.test',city:'Campo Grande',guardian:'Responsável QA',situation:'Ativo',financialStatus:'Em dia',timeline:[]}],classes:[{id:'class-qa',name:'Turma QA',day:'Segunda',room:'Sala 01'}],teachers:[{id:'teacher-qa',name:'Professor QA'}],financialEntries:[],settings:{...state.db.settings}};
state.selectedStudentId='student-qa';

(async()=>{
  const clickSaveHandlers=documentListeners.click||[];
  assert(clickSaveHandlers.length,'O botão Salvar aluno deve registrar um listener de clique.');
  setValue('studentName','Marina Click QA');
  setValue('studentBirthDate','');
  setValue('studentSex','F');
  setValue('studentDocument','');
  setValue('studentWhatsapp','27999997777');
  setValue('studentPhone','');
  setValue('studentEmail','marina.click@purple.test');
  setValue('studentFinanceMonthlyValue','210');
  setValue('studentFinanceDueDay','8');
  setValue('studentFinanceDefaultMethod','PIX');
  setValue('studentFinanceStatus','EM DIA');
  setValue('studentFinanceNotes','criada por clique no botao salvar');
  setValue('studentNotes','observacao criada por clique');
  setChecked('studentHasDiagnosis',false);
  setValue('studentDiagnosis','');
  const saveButton=getElement('studentSaveButton');
  saveButton.dataset={studentId:'',nextAction:'close'};
  saveButton.textContent='Salvar aluno';
  saveButton.disabled=false;
  clickSaveHandlers.forEach(handler=>handler({target:saveButton,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}}));
  await flushPromises();
  const clickedStudent=state.db.students.find(student=>student.name==='MARINA CLICK QA');
  assert(clickedStudent,'Clique no botão Salvar aluno deve criar um aluno.');
  assert.strictEqual(clickedStudent.financeMonthlyValue,210,'Clique no botão Salvar aluno deve persistir os dados financeiros.');

  setValue('studentName','Nicole Silva QA');
  setValue('studentBirthDate','01/01/2000');
  setValue('studentSex','F');
  setValue('studentDocument','');
  setValue('studentWhatsapp','27999998888');
  setValue('studentPhone','');
  setValue('studentEmail','nicole.qa@purple.test');
  setValue('studentFinanceMonthlyValue','123.45');
  setValue('studentFinanceDueDay','12');
  setValue('studentFinanceDefaultMethod','BOLETO');
  setValue('studentFinanceStatus','PENDENTE');
  setValue('studentFinanceNotes','observacao financeira criada pelo salvar aluno');
  setValue('studentNotes','observacao geral criada pelo salvar aluno');
  setChecked('studentHasDiagnosis',false);
  setValue('studentDiagnosis','');
  await global.App.saveStudent('','close');
  const createdStudent=state.db.students.find(student=>student.name==='NICOLE SILVA QA');
  assert(createdStudent,'Salvar aluno deve criar um aluno com nome composto.');
  assert.strictEqual(createdStudent.financeMonthlyValue,123.45,'Salvar aluno deve persistir mensalidade padrão.');
  assert.strictEqual(createdStudent.financeDueDay,12,'Salvar aluno deve persistir dia de vencimento.');
  assert.strictEqual(createdStudent.financeDefaultMethod,'BOLETO','Salvar aluno deve persistir forma padrão.');
  assert.strictEqual(createdStudent.financeNotes,'OBSERVACAO FINANCEIRA CRIADA PELO SALVAR ALUNO','Salvar aluno deve persistir observação financeira.');

  const fallbackRows=[];
  global.PurpleAcademicSource='TYPED';
  global.__studentFallbackSupabase={
    auth:{},
    from:table=>({
      upsert(row){
        if(table==='students')return Promise.resolve({error:{message:'RLS bloqueou students no teste',code:'42501'}});
        assert.strictEqual(table,'app_records');
        fallbackRows.push(row);
        return {select(){return {single:async()=>({data:{id:row.id},error:null})}}};
      },
      insert:async()=>({error:null})
    })
  };
  vm.runInThisContext('Supabase=global.__studentFallbackSupabase');
  setValue('studentName','Nicole Silva QA Editada');
  setValue('studentFinanceMonthlyValue','0');
  setValue('studentFinanceDueDay','0');
  setValue('studentFinanceNotes','');
  await global.App.saveStudent(createdStudent.id,'close');
  assert.strictEqual(createdStudent.name,'NICOLE SILVA QA EDITADA','Edição pelo Salvar aluno deve atualizar o cadastro local.');
  assert.strictEqual(createdStudent.financeMonthlyValue,0,'Salvar aluno deve permitir zerar mensalidade.');
  assert.strictEqual(createdStudent.financeDueDay,0,'Salvar aluno deve permitir limpar vencimento.');
  assert.strictEqual(createdStudent.financeNotes,'','Salvar aluno deve permitir limpar observação financeira.');
  assert.strictEqual(fallbackRows.filter(row=>row.kind==='student').length,1,'Falha na tabela students deve cair para app_records.');
  global.PurpleAcademicSource='';

  global.__studentHardFailSupabase={
    auth:{},
    from:()=>({
      upsert:async()=>({error:{message:'Falha remota total no teste',code:'42501'}}),
      insert:async()=>({error:{message:'Falha auditoria no teste',code:'42501'}})
    })
  };
  vm.runInThisContext('Supabase=global.__studentHardFailSupabase');
  setValue('studentName','Nicole Silva QA Cache Local');
  getElement('studentSaveButton').textContent='Salvar aluno';
  getElement('studentSaveButton').disabled=false;
  await global.App.saveStudent(createdStudent.id,'close');
  assert.strictEqual(createdStudent.name,'NICOLE SILVA QA CACHE LOCAL','Falha remota total não deve desfazer o cadastro local do aluno.');
  assert.strictEqual(getElement('studentSaveButton').disabled,false,'Botão salvar deve ser reativado após falha remota.');
  assert.strictEqual(getElement('studentSaveButton').textContent,'Salvar aluno','Botão salvar deve voltar ao texto original.');
  vm.runInThisContext('Supabase=null');

  state.db.students.sort((a,b)=>a.id==='student-qa'?-1:b.id==='student-qa'?1:0);

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

  setValue('enrollmentPackage','Inglês Adulto');setValue('enrollmentPlan','Anual');setValue('enrollmentType','Turma');
  setValue('enrollmentMonthlyValue','350');setValue('enrollmentMonthlyDiscountValue','320');setValue('enrollmentInstallments','2');
  setValue('enrollmentFirstDueDate','2026-08-10');setValue('enrollmentStartDate','2026-08-01');setValue('enrollmentEndDate','2027-07-31');
  setValue('enrollmentSituation','Matrícula em andamento');setValue('enrollmentClass','class-qa');setValue('enrollmentTeacher','teacher-qa');
  setValue('enrollmentBook','');setValue('enrollmentMaterialCount','0');setValue('enrollmentMaterialValue','0');
  setValue('enrollmentMaterialDiscountValue','0');setValue('enrollmentMaterialFirstDueDate','2026-08-10');
  setValue('enrollmentNotes','Plano QA');setChecked('enrollmentCreateInstallments',true);setChecked('enrollmentCreateMaterialPlan',false);
  await global.App.saveStudentEnrollment('student-qa');
  assert.strictEqual(state.db.students[0].coursePackage,'Inglês Adulto','A matrícula deve atualizar o aluno.');
  assert.strictEqual(state.db.students[0].courseCreateInstallments,true,'A escolha de gerar parcelas deve ser salva.');
  assert.strictEqual(state.db.financialEntries.filter(row=>row.source==='student-enrollment-plan').length,2,'A matrícula deve criar as parcelas.');
  const generatedIds=state.db.financialEntries.filter(row=>row.source==='student-enrollment-plan').map(row=>row.id);
  await global.App.saveStudentEnrollment('student-qa');
  assert.deepStrictEqual(state.db.financialEntries.filter(row=>row.source==='student-enrollment-plan').map(row=>row.id),generatedIds,'Salvar novamente não deve duplicar parcelas.');

  const savedRows=[];
  global.__studentTestSupabase={auth:{},from:table=>({upsert(row){assert.strictEqual(table,'app_records');savedRows.push(row);return {select(){return {single:async()=>({data:{id:row.id},error:null})}}}},insert:async()=>({error:null})})};
  vm.runInThisContext('Supabase=global.__studentTestSupabase');
  setValue('enrollmentNotes','Plano QA remoto');
  await global.App.saveStudentEnrollment('student-qa');
  assert.strictEqual(savedRows.filter(row=>row.kind==='student').length,1,'A matrícula deve persistir o aluno diretamente.');
  assert.strictEqual(savedRows.filter(row=>row.kind==='financial_entry').length,2,'A matrícula deve persistir as parcelas diretamente.');
  assert.strictEqual(savedRows.find(row=>row.kind==='student').data.courseNotes,'Plano QA remoto');

  setChecked('enrollmentCreateInstallments',false);
  setValue('enrollmentMonthlyValue','0');
  await global.App.saveStudentEnrollment('student-qa');
  assert.strictEqual(state.db.students[0].courseCreateInstallments,false,'Desmarcar a geração de parcelas deve persistir.');
  global.App.openStudentEnrollment('student-qa');
  assert(/id="enrollmentCreateInstallments" type="checkbox"\s*\/>/.test(getElement('modalRoot').innerHTML),'A opção não deve voltar marcada ao reabrir.');

  for(const tab of ['courses','payments','schedule','frequency','grades','followup','contacts','documents','history','whatsapp','more']){
    state.studentTab=tab;
    const html=global.App.renderPage?null:null;
    const content=global.PurpleState.selectedStudentId&&global.document.querySelector('#pageContainer');
    global.App.go('students');
    assert(getElement('pageContainer').innerHTML.length>20, `Aba ${tab} deve renderizar.`);
  }

  console.log('student module actions test ok');
})().catch(error=>{console.error(error);process.exit(1)});
