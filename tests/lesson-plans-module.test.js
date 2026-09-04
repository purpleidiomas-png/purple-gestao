const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

class ElementMock{
  constructor(id=''){
    this.id=id;
    this.value='';
    this.checked=false;
    this.innerHTML='';
    this.textContent='';
    this.disabled=false;
    this.dataset={};
    this.style={};
    this.files=[];
    this.options=[];
    this.className='';
    this.classList={add(){},remove(){},toggle(){},contains(){return false}};
  }
  addEventListener(){}
  insertAdjacentHTML(_pos,html){this.innerHTML+=html}
  querySelector(selector){if(selector.startsWith('#'))return getElement(selector.slice(1));return new ElementMock(selector)}
  querySelectorAll(){return []}
  closest(){return null}
  after(){}
  remove(){}
  setAttribute(){}
  removeAttribute(){}
}

const elements=new Map();
const getElement=id=>elements.get(id)||elements.set(id,new ElementMock(id)).get(id);
const selectorResults=new Map();

global.window=global;
global.addEventListener=()=>{};
global.location={hash:'',protocol:'file:',hostname:'localhost'};
global.navigator={};
global.crypto={randomUUID:()=> '11111111-1111-4111-8111-111111111111'};
global.localStorage={getItem(){return null},setItem(){},removeItem(){}};
global.requestAnimationFrame=fn=>fn();
global.setTimeout=()=>0;
global.confirm=()=>true;
global.alert=()=>{};
global.open=()=>({document:{write(){},close(){}},focus(){}});
global.Blob=function(){};
global.URL={createObjectURL:()=>'',revokeObjectURL(){}};
global.document={
  scripts:[{getAttribute:()=> 'modules/lesson-plans.js'},{getAttribute:()=> 'app.js'}],
  body:new ElementMock('body'),
  addEventListener(){},
  createElement:tag=>new ElementMock(tag),
  querySelector(selector){if(selector.startsWith('#'))return getElement(selector.slice(1));return new ElementMock(selector)},
  querySelectorAll(selector){return selectorResults.get(selector)||[]},
  getElementById:getElement
};
global.performance={getEntriesByType:()=>[]};
global.history={replaceState(){}};
global.PurpleAuthConfig={appVersion:'test',serviceWorkerVersion:'test-cache',manifestVersion:'manifest.webmanifest',supabaseUrl:'',supabaseKey:''};

vm.runInThisContext(fs.readFileSync('modules/lesson-plans.js','utf8'),{filename:'modules/lesson-plans.js'});
vm.runInThisContext(fs.readFileSync('app.js','utf8'),{filename:'app.js'});

const state=global.PurpleState;
state.user={
  id:'u-teach-ana',
  name:'Ana Laura — Professora',
  email:'ana@purple.com',
  role:'teacher',
  sector:'pedagogico',
  accessScope:'own_sector',
  permissions:new Proxy({},{
    get(_target,key){
      return ['panel.view','settings.view','lesson_plans.view','lesson_plans.edit','lesson_plans.ai'].includes(String(key));
    }
  }),
  active:true
};
state.db=global.PurpleApplyRoleDataVisibility(global.defaultDB(),state.user);
state.sector='pedagogico';

global.startApp();

assert.strictEqual(state.page,'home','Professor deve iniciar na home.');
assert(getElement('pageContainer').innerHTML.includes('Biblioteca Pedagógica Purple'),'Home do professor deve priorizar conteúdo e biblioteca.');
assert(getElement('mainNav').innerHTML.includes('Início'),'Menu do professor deve ter Início.');
assert(getElement('mainNav').innerHTML.includes('Biblioteca'),'Menu do professor deve ter Biblioteca.');
assert(getElement('mainNav').innerHTML.includes('Planejamentos'),'Menu do professor deve ter Planejamentos.');
assert(getElement('mainNav').innerHTML.includes('Minhas contribuições'),'Menu do professor deve ter Minhas contribuições.');
assert(getElement('mainNav').innerHTML.includes('Minha conta'),'Menu do professor deve ter Minha conta.');
assert(!getElement('mainNav').innerHTML.includes('Financeiro'),'Menu do professor não deve expor Financeiro.');
assert(!getElement('mainNav').innerHTML.includes('Operação'),'Menu do professor não deve expor Operação.');
assert(!getElement('mainNav').innerHTML.includes('Comunicação'),'Menu do professor não deve expor Comunicação.');

global.App.go('financial');
assert.strictEqual(state.page,'home','Professor não pode navegar para Financeiro.');

global.App.go('lesson-library');
assert(getElement('pageContainer').innerHTML.includes('Qual aula você vai ensinar?'),'Biblioteca pedagógica deve renderizar para professor.');
assert(getElement('pageContainer').innerHTML.includes('Coleções'),'Biblioteca deve iniciar por coleções.');
assert(getElement('pageContainer').innerHTML.includes('Purple Way'),'Biblioteca deve exibir Purple Way.');

global.PurpleLessonPlans.openCollection('purple-way');
assert(getElement('pageContainer').innerHTML.includes('Discover'),'Coleção deve exibir livros/programas.');
assert(getElement('pageContainer').innerHTML.includes('Capa real não cadastrada'),'Livro sem capa real deve usar placeholder honesto.');

global.PurpleLessonPlans.openCourse('discover');
assert(getElement('pageContainer').innerHTML.includes('Gerenciar livro')===false,'Professor não deve gerenciar livro.');
assert(getElement('pageContainer').innerHTML.includes('Abrir livro'),'Página do livro deve oferecer consulta do livro digital.');
assert(getElement('pageContainer').innerHTML.includes('Unit 01'),'Página do livro deve listar unidades.');

global.PurpleLessonPlans.openUnit('discover','discover-u01');
assert(getElement('pageContainer').innerHTML.includes('Resumo pedagógico da unidade'),'Unidade deve virar o coração pedagógico.');
assert(getElement('pageContainer').innerHTML.includes('Vocabulary'),'Resumo da unidade deve exibir vocabulary.');
assert(getElement('pageContainer').innerHTML.includes('Lesson Plans'),'Unidade deve listar aulas.');

global.PurpleLessonPlans.openLesson('discover-u01-l02');
assert.strictEqual(state.page,'lesson-plans','Abrir aula deve navegar para o módulo principal.');
assert(getElement('pageContainer').innerHTML.includes('R.A.P.I.D. Check'),'Plano de aula deve renderizar checklist metodológico.');
assert(getElement('pageContainer').innerHTML.includes('Assistente Purple'),'Plano de aula deve renderizar a área do assistente.');

global.PurpleLessonPlans.openCourse('connect');
assert(getElement('pageContainer').innerHTML.includes('Connect — 2ª Edição'),'Connect deve refletir o lote real 2026.2.');
assert(getElement('pageContainer').innerHTML.includes('Unit 01'),'Connect deve exibir Unit 01 importada.');
assert(getElement('pageContainer').innerHTML.includes('Yesterday'),'Connect deve exibir mapa real da Unit 01.');

global.PurpleLessonPlans.openUnit('connect','connect-u01');
assert(getElement('pageContainer').innerHTML.includes('Meeting 02'),'Unit 01 deve listar Meeting 02.');
assert(getElement('pageContainer').innerHTML.includes('Ask Me What Happened'),'Unit 01 deve listar Meeting 03.');

global.PurpleLessonPlans.openLesson('connect-m05');
assert(getElement('pageContainer').innerHTML.includes('Transition Meeting'),'Meeting 05 deve marcar transição visualmente.');
assert(getElement('pageContainer').innerHTML.includes('Transition Learning Arcs'),'Meeting 05 deve renderizar Learning Arcs.');
assert(getElement('pageContainer').innerHTML.includes('UNIT 02'),'Meeting 05 deve manter arco da Unit 02.');
assert(getElement('pageContainer').innerHTML.includes('UNIT 03'),'Meeting 05 deve manter arco da Unit 03.');
assert(getElement('pageContainer').innerHTML.includes('Teacher Quick View'),'Meeting deve oferecer visão rápida para uso em aula.');
assert(getElement('pageContainer').innerHTML.includes('Lesson Flow'),'Plano deve exibir Lesson Flow em modo leitura.');
assert(getElement('pageContainer').innerHTML.includes('Recursos da aula'),'Plano deve destacar recursos.');
assert(getElement('pageContainer').innerHTML.includes('Contribuição coletiva'),'Colaboração deve existir de forma compacta.');

global.PurpleLessonPlans.openStageInBook('discover-u01-l02','presentation');
assert(getElement('pageContainer').innerHTML.includes('Livro Digital'),'Páginas da etapa devem abrir o viewer do livro.');
assert(getElement('pageContainer').innerHTML.includes('Página anterior'),'Viewer deve oferecer navegação de página.');

global.PurpleLessonPlans.openManagement();
assert(!getElement('pageContainer').innerHTML.includes('Gestão de planejamentos'),'Professor não deve acessar Gestão por API interna.');

const workspace=state.db.lessonPlansWorkspace;
assert.strictEqual(workspace.version,4,'Workspace deve migrar internamente para biblioteca com coleções e livros.');
assert(workspace.collections.some(collection=>collection.id==='purple-way'),'Workspace deve preservar/adaptar dados para coleção Purple Way.');
assert.strictEqual(workspace.lessonPlans['discover-u01-l02'].revision,1,'Plano deve iniciar com revisão explícita.');

global.PurpleLessonPlans.updateSearch('survival');
assert(getElement('pageContainer').innerHTML.includes('Purple classroom survival'),'Busca da biblioteca deve encontrar aula por tema.');

global.PurpleLessonPlans.sendToReview('discover-u01-l02');
assert.strictEqual(workspace.lessonPlans['discover-u01-l02'].status,'EM_REVISAO','Professor deve conseguir enviar plano para revisão.');
assert(workspace.lessonPlans['discover-u01-l02'].history[0].action.includes('revisão'),'Envio para revisão deve registrar histórico.');

const beforeConflictRevision=workspace.lessonPlans['discover-u01-l02'].revision;
getElement('lpStageRevision').value=String(beforeConflictRevision-1);
global.PurpleLessonPlans.saveStageEditor('discover-u01-l02','presentation');
assert.strictEqual(workspace.lessonPlans['discover-u01-l02'].revision,beforeConflictRevision,'Conflito de edição não deve sobrescrever plano.');

getElement('lpStageRevision').value=String(beforeConflictRevision);
getElement('lpStageObjective').value='Objetivo atualizado para teste';
getElement('lpStageActivity').value='Atividade atualizada para teste';
getElement('lpStageInstructions').value='Instruções atualizadas';
getElement('lpStageObservations').value='Observações atualizadas';
getElement('lpStageDuration').value='16';
getElement('lpStageInteraction').value='Pair work';
getElement('lpStagePages').value='SB 12';
getElement('lpStageResources').value='cards, timer';
selectorResults.set('#lpStageRapid input:checked',[{value:'realLife'},{value:'active'}]);
global.PurpleLessonPlans.saveStageEditor('discover-u01-l02','presentation');
assert.strictEqual(workspace.lessonPlans['discover-u01-l02'].stages.presentation.objective,'Objetivo atualizado para teste','Editor de Presentation deve persistir conteúdo.');
assert.strictEqual(workspace.lessonPlans['discover-u01-l02'].revision,beforeConflictRevision+1,'Edição válida deve incrementar revisão.');

state.user={
  ...state.user,
  id:'u-1',
  name:'Rafael — Direção',
  role:'direction',
  sector:'all',
  accessScope:'all_sectors',
  permissions:new Proxy({}, {get(){return true}})
};
state.db=global.defaultDB();
global.PurpleLessonPlans.openLesson('discover-u01-l02');
const adminWorkspace=state.db.lessonPlansWorkspace;

global.PurpleLessonPlans.openCourse('discover');
assert(getElement('pageContainer').innerHTML.includes('Gerenciar livro'),'Direção deve gerenciar capa/PDF do livro.');
global.PurpleLessonPlans.openBookEditor('discover');
assert(getElement('modalRoot').innerHTML.includes('Subir arquivos do livro'),'Painel de livro deve preparar upload seguro de capa/PDF.');
assert(getElement('modalRoot').innerHTML.includes('Zoom da capa'),'Painel de livro deve permitir ajustar a capa dentro do espaço.');
assert(getElement('modalRoot').innerHTML.includes('URL segura da capa oficial'),'Painel de livro deve permitir associar capa por URL segura.');
assert(getElement('modalRoot').innerHTML.includes('lpBookPdfStoragePath'),'Painel de livro deve guardar o caminho seguro do PDF no Storage.');
getElement('lpBookName').value='Discover';
getElement('lpBookLevel').value='Foundation atualizado';
getElement('lpBookCoverUrl').value='https://example.com/discover-cover.png';
getElement('lpBookPdfUrl').value='https://example.com/discover.pdf';
getElement('lpBookPdfStoragePath').value='books/discover/pdf-test.pdf';
getElement('lpBookDescription').value='Livro Discover atualizado.';
getElement('lpBookPedagogicalInfo').value='Cobertura pedagógica atualizada.';
global.PurpleLessonPlans.saveBookEditor('discover');
assert.strictEqual(adminWorkspace.courses[0].pdfUrl,'https://example.com/discover.pdf','Livro deve persistir PDF seguro associado.');
assert.strictEqual(adminWorkspace.courses[0].pdfStoragePath,'books/discover/pdf-test.pdf','Livro deve persistir caminho seguro do PDF para reabrir com URL assinada.');
assert.strictEqual(adminWorkspace.courses[0].coverZoom,100,'Livro deve persistir enquadramento de capa.');

getElement('lpUnitTheme').value='Classroom survival atualizado';
getElement('lpUnitAudience').value='Teens 11-14';
getElement('lpUnitObjective').value='Objetivo de unidade atualizado';
getElement('lpUnitExpectedOutcome').value='Resultado atualizado';
getElement('lpUnitStudentBookPages').value='12-19';
getElement('lpUnitWorkbookPages').value='6-12';
getElement('lpUnitEstimatedLessons').value='11';
getElement('lpUnitVocabulary').value='help, repeat, instructions';
getElement('lpUnitGrammar').value='imperatives, can';
getElement('lpUnitSkills').value='speaking, listening';
getElement('lpUnitResources').value='cards, projector';
getElement('lpUnitAttention').value='atenção 1, atenção 2';
getElement('lpUnitDifficulties').value='dificuldade 1';
getElement('lpUnitCoordinatorNotes').value='Nota premium da coordenação';
global.PurpleLessonPlans.saveUnitMap('discover','discover-u01');
assert.strictEqual(adminWorkspace.courses[0].units[0].theme,'Classroom survival atualizado','Mapa da Unidade deve persistir edição.');

global.PurpleLessonPlans.openLesson('discover-u01-l02');
global.PurpleLessonPlans.setEditMode('discover-u01-l02');
getElement('lpEdit-presentation-objective').value='Objetivo editorial salvo';
getElement('lpEdit-presentation-activity').value='Atividade editorial salva';
getElement('lpEdit-presentation-instructions').value='Orientação editorial salva';
getElement('lpEdit-presentation-observations').value='Teacher note salva';
getElement('lpEdit-presentation-duration').value='17';
getElement('lpEdit-presentation-interaction').value='Whole class';
getElement('lpEdit-presentation-studentBookPages').value='12';
getElement('lpEdit-presentation-workbookPages').value='6';
global.PurpleLessonPlans.saveLessonEditor('discover-u01-l02');
assert.strictEqual(adminWorkspace.lessonPlans['discover-u01-l02'].stages.presentation.objective,'Objetivo editorial salvo','Modo edição deve persistir e voltar ao modo leitura.');

global.PurpleLessonPlans.openResourceEditor('discover-u01-l02');
assert(getElement('modalRoot').innerHTML.includes('Link ou material da aula'),'Professor autorizado deve ter fluxo claro para link/material.');
assert(getElement('modalRoot').innerHTML.includes('Arquivo da aula'),'Modal de recurso deve preparar anexos sem armazenamento inseguro.');
getElement('lpResourceTitle').value='Vocabulary Review';
getElement('lpResourceUrl').value='https://wordwall.net/resource/purple';
getElement('lpResourceDescription').value='Jogo rápido de vocabulário.';
getElement('lpResourceType').value='Wordwall';
getElement('lpResourceStage').value='review';
global.PurpleLessonPlans.saveResource('discover-u01-l02');
assert(adminWorkspace.lessonPlans['discover-u01-l02'].resources.some(resource=>resource.title==='Vocabulary Review'),'Adicionar recurso deve persistir.');

getElement('lpCycleTitle').value='Ciclo E2E Purple';
getElement('lpCycleDeadline').value='2026-09-14T18:00';
getElement('lpCycleReviewer').value='Coordenação E2E';
getElement('lpCycleScope').value='Aula específica';
getElement('lpCycleSummary').value='Resumo do ciclo criado em teste.';
selectorResults.set('#lpCycleLessons input:checked',[{value:'discover-u01-l02'}]);
selectorResults.set('#lpCycleParticipants input:checked',[{value:'u-teach-ana'},{value:'u-teach-eduardo'}]);
global.PurpleLessonPlans.saveCycle('', 'discover', 'discover-u01');
assert(adminWorkspace.cycles.some(cycle=>cycle.title==='Ciclo E2E Purple'),'Criação de ciclo deve persistir.');
assert.strictEqual(adminWorkspace.lessonPlans['discover-u01-l02'].cycleId,adminWorkspace.cycles[0].id,'Plano deve apontar para ciclo criado.');

global.PurpleLessonPlans.openManagement();
assert(getElement('pageContainer').innerHTML.includes('Gestão de planejamentos'),'Dashboard administrativo deve ficar na camada de Gestão.');
assert(getElement('pageContainer').innerHTML.includes('Ciclos ativos'),'Gestão deve preservar ciclos ativos.');
assert(getElement('pageContainer').innerHTML.includes('Capas e livros digitais'),'Gestão deve expor painel operacional de capas e PDFs.');

global.PurpleLessonPlans.requestAdjustments('discover-u01-l02');
assert.strictEqual(adminWorkspace.lessonPlans['discover-u01-l02'].status,'AJUSTES','Coordenação deve solicitar ajustes.');
global.PurpleLessonPlans.approvePlan('discover-u01-l02');
assert.strictEqual(adminWorkspace.lessonPlans['discover-u01-l02'].status,'APROVADA','Coordenação deve aprovar plano.');
global.PurpleLessonPlans.publishPlan('discover-u01-l02');
assert.strictEqual(adminWorkspace.lessonPlans['discover-u01-l02'].status,'PUBLICADA','Coordenação deve publicar plano.');
assert.strictEqual(adminWorkspace.publishedFeed[0].lessonId,'discover-u01-l02','Publicação deve aparecer no feed da Biblioteca.');
global.PurpleLessonPlans.setBasePlan('discover-u01-l02');
assert.strictEqual(adminWorkspace.lessonPlans['discover-u01-l02'].baseVersion,true,'Plano Base Purple deve ser marcado.');

getElement('lpPostClassFeedback').value='A turma precisou de mais scaffolding no Practice.';
global.PurpleLessonPlans.saveFeedback('discover-u01-l02');
assert(adminWorkspace.lessonPlans['discover-u01-l02'].postClassFeedback[0].note.includes('scaffolding'),'Feedback pós-aula deve persistir.');

const savedPayload=JSON.stringify(adminWorkspace);
state.db.lessonPlansWorkspace=JSON.parse(savedPayload);
global.PurpleLessonPlans.openLesson('discover-u01-l02');
assert(getElement('pageContainer').innerHTML.includes('A turma precisou de mais scaffolding'),'Render pós-reload simulado deve consultar dados persistidos.');

console.log('lesson plans module test ok');
