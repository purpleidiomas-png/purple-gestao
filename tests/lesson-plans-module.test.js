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
assert(getElement('pageContainer').innerHTML.includes('Ready for another great class?'),'Home do professor deve priorizar operação diária.');
assert(getElement('pageContainer').innerHTML.includes('Meu TWR'),'Home do professor deve destacar o TWR do professor.');
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
assert(getElement('pageContainer').innerHTML.includes('assets/lesson-plans/purple-way-discover-cover.png'),'Livro Purple Way deve usar capa oficial do Drive como fallback visual.');

const mioloWorkspace=state.db.lessonPlansWorkspace;
assert.strictEqual(mioloWorkspace.courses.find(course=>course.id==='discover').units.length,13,'Discover deve ser estruturado automaticamente com 13 unidades do miolo.');
assert.strictEqual(mioloWorkspace.courses.find(course=>course.id==='explore').units.length,13,'Explore deve ser estruturado automaticamente com 13 unidades do miolo.');
assert.strictEqual(mioloWorkspace.courses.find(course=>course.id==='change').units.length,5,'Change deve ser estruturado automaticamente com 5 unidades do miolo.');
assert.strictEqual(mioloWorkspace.courses.find(course=>course.id==='inspire').units.length,5,'Inspire deve ser estruturado automaticamente com 5 unidades do miolo.');
assert(mioloWorkspace.courses.find(course=>course.id==='discover').units.some(unit=>unit.theme==='Getting to know each other'&&unit.studentBookPages==='14-25'),'Discover deve preservar títulos e páginas extraídos do miolo.');
assert(mioloWorkspace.courses.find(course=>course.id==='inspire').units.some(unit=>unit.theme==='English x Portuguese'&&unit.studentBookPages==='120-129'),'Inspire deve preservar títulos e páginas extraídos do miolo.');

global.PurpleLessonPlans.openCourse('discover');
assert(getElement('pageContainer').innerHTML.includes('Gerenciar livro')===false,'Professor não deve gerenciar livro.');
assert(getElement('pageContainer').innerHTML.includes('Abrir livro'),'Página do livro deve oferecer consulta do livro digital.');
assert(getElement('pageContainer').innerHTML.includes('Unit 01'),'Página do livro deve listar unidades.');

global.PurpleLessonPlans.openUnit('discover','discover-u01');
assert(getElement('pageContainer').innerHTML.includes('Plano padrão da unidade'),'Unidade deve exibir o espaço do PDF padrão antes das Lessons.');
assert(getElement('pageContainer').innerHTML.includes('PDF da unidade ainda não lançado'),'Unidade sem PDF deve mostrar estado honesto para lançamento.');
assert(getElement('pageContainer').innerHTML.includes('Informações da unidade'),'Unidade deve deixar referências complementares fora do protagonismo.');
assert(!getElement('pageContainer').innerHTML.includes('Resumo pedagógico da unidade'),'Estrutura pedagógica legada não deve ser experiência principal da Unit.');
assert(!getElement('pageContainer').innerHTML.includes('Aulas da unidade'),'Unidade não deve listar Lessons como bloco principal.');
assert(!getElement('pageContainer').innerHTML.includes('Navegação por Lesson'),'Unidade deve focar no plano padrão da unidade.');

global.PurpleLessonPlans.openLesson('discover-u01-l02');
assert.strictEqual(state.page,'lesson-plans','Abrir aula deve navegar para o módulo principal.');
assert(getElement('pageContainer').innerHTML.includes('Plano Base Purple'),'Lesson deve priorizar o Plano Base Purple.');
assert(getElement('pageContainer').innerHTML.includes('Atividades Extras'),'Lesson deve possuir aba de atividades extras.');
assert(getElement('pageContainer').innerHTML.includes('Links &amp; Mídia')||getElement('pageContainer').innerHTML.includes('Links & Mídia'),'Lesson deve possuir aba de links e mídia.');
assert(getElement('pageContainer').innerHTML.includes('Contribuições'),'Lesson deve possuir aba de contribuições.');

global.PurpleLessonPlans.openCourse('connect');
assert(getElement('pageContainer').innerHTML.includes('Connect — 2ª Edição'),'Connect deve refletir o lote real 2026.2.');
assert(getElement('pageContainer').innerHTML.includes('Unit 01'),'Connect deve exibir Unit 01 importada.');
assert(getElement('pageContainer').innerHTML.includes('Yesterday'),'Connect deve exibir mapa real da Unit 01.');

global.PurpleLessonPlans.openUnit('connect','connect-u01');
assert(getElement('pageContainer').innerHTML.includes('Plano padrão da unidade'),'Connect Unit 01 deve priorizar PDF padrão da unidade.');
assert(!getElement('pageContainer').innerHTML.includes('Meeting 02'),'Unit não deve listar Meeting 02 como card secundário.');
assert(!getElement('pageContainer').innerHTML.includes('Ask Me What Happened'),'Unit não deve listar Meeting 03 como card secundário.');
assert.strictEqual(state.db.lessonPlansWorkspace.courses.find(course=>course.id==='connect').units.find(unit=>unit.id==='connect-u01').lessons.length,2,'Dados de Meetings devem ser preservados no workspace.');

global.PurpleLessonPlans.openLesson('connect-m05');
const meeting05=state.db.lessonPlansWorkspace.lessonPlans['connect-m05'];
assert.strictEqual(meeting05.meetingType,'transition','Meeting 05 deve ser modelado como transition meeting.');
assert.strictEqual(meeting05.unitRelations.length,2,'Meeting 05 deve relacionar Unit 02 e Unit 03.');
assert.strictEqual(meeting05.meetingArcs.length,2,'Meeting 05 deve possuir dois Learning Arcs.');
assert(getElement('pageContainer').innerHTML.includes('Plano Base Purple'),'Meeting deve abrir pela experiência de Plano Base.');
assert(getElement('pageContainer').innerHTML.includes('Atividades Extras'),'Meeting deve manter aba de atividades extras.');
assert(getElement('pageContainer').innerHTML.includes('Links &amp; Mídia')||getElement('pageContainer').innerHTML.includes('Links & Mídia'),'Meeting deve manter aba de links e mídia.');

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
assert(getElement('pageContainer').innerHTML.includes('Nova unidade'),'Direção deve criar unidades dentro do livro.');
assert(getElement('pageContainer').innerHTML.includes('Editar'),'Direção deve editar unidades dentro do livro.');
assert(getElement('pageContainer').innerHTML.includes('Excluir'),'Direção deve excluir unidades dentro do livro.');
const unitsBeforeCreate=adminWorkspace.courses[0].units.length;
global.PurpleLessonPlans.openUnitEditor('discover');
assert(getElement('modalRoot').innerHTML.includes('Nova unidade'),'Livro deve abrir cadastro de nova unidade.');
assert(getElement('modalRoot').innerHTML.includes('Criar unidade'),'Cadastro de unidade deve ter ação clara de criação.');
getElement('lpUnitTitle').value='Unit QA';
getElement('lpUnitTheme').value='Automation flow';
getElement('lpUnitSubtitle').value='Unidade criada no teste automatizado.';
getElement('lpUnitAudience').value='QA';
getElement('lpUnitStudentBookPages').value='40-45';
getElement('lpUnitWorkbookPages').value='20-21';
getElement('lpUnitEstimatedLessons').value='2';
global.PurpleLessonPlans.saveUnitEditor('discover');
const createdUnit=adminWorkspace.courses[0].units.find(unit=>unit.title==='Unit QA');
assert(createdUnit,'Nova unidade deve persistir no livro.');
assert.strictEqual(createdUnit.theme,'Automation flow','Nova unidade deve persistir subtítulo curto.');
assert.strictEqual(adminWorkspace.courses[0].units.length,unitsBeforeCreate+1,'Nova unidade deve aumentar a coleção do livro.');
global.PurpleLessonPlans.openCourse('discover');
assert(getElement('pageContainer').innerHTML.includes('Unit QA'),'Nova unidade deve aparecer na página do livro.');
global.PurpleLessonPlans.deleteUnit('discover',createdUnit.id);
assert(!adminWorkspace.courses[0].units.some(unit=>unit.id===createdUnit.id),'Excluir unidade deve remover o cadastro do livro.');
assert.strictEqual(adminWorkspace.courses[0].units.length,unitsBeforeCreate,'Excluir unidade deve retornar a quantidade inicial.');
global.PurpleLessonPlans.openCollection('purple-way');
assert(getElement('pageContainer').innerHTML.includes('Gerenciar coleção'),'Direção deve gerenciar capa da coleção.');
assert(getElement('pageContainer').innerHTML.includes('Adicionar livro/programa'),'Direção deve incluir livros/programas na coleção.');
assert(getElement('pageContainer').innerHTML.includes('Alterar'),'Direção deve alterar livros/programas da coleção.');
assert(getElement('pageContainer').innerHTML.includes('Excluir'),'Direção deve excluir livros/programas da coleção.');
const coursesBeforeCreate=adminWorkspace.courses.length;
global.PurpleLessonPlans.openCollectionBookEditor('purple-way');
assert(getElement('modalRoot').innerHTML.includes('Adicionar à coleção'),'Coleção deve abrir cadastro de livro/programa.');
getElement('lpBookName').value='Livro QA';
getElement('lpBookLevel').value='QA Level';
getElement('lpBookOrder').value='9';
getElement('lpBookStatus').value='active';
getElement('lpBookDescription').value='Livro criado por teste.';
getElement('lpBookPedagogicalInfo').value='Informações pedagógicas de teste.';
global.PurpleLessonPlans.saveCollectionBookEditor('purple-way');
const createdBook=adminWorkspace.courses.find(course=>course.name==='Livro QA');
assert(createdBook,'Livro/programa criado na coleção deve persistir.');
assert(adminWorkspace.collections[0].bookIds.includes(createdBook.id),'Coleção deve referenciar livro/programa criado.');
global.PurpleLessonPlans.openCollection('purple-way');
assert(getElement('pageContainer').innerHTML.includes('Livro QA'),'Livro/programa criado deve aparecer na coleção.');
global.PurpleLessonPlans.deleteCollectionBook('purple-way',createdBook.id);
assert(!adminWorkspace.courses.some(course=>course.id===createdBook.id),'Excluir livro/programa deve remover da biblioteca.');
assert.strictEqual(adminWorkspace.courses.length,coursesBeforeCreate,'Excluir livro/programa deve restaurar quantidade inicial.');
global.PurpleLessonPlans.openCollectionEditor('purple-way');
assert(getElement('modalRoot').innerHTML.includes('Subir capa da coleção'),'Painel de coleção deve preparar upload seguro de capa.');
assert(getElement('modalRoot').innerHTML.includes('Zoom da capa'),'Painel de coleção deve permitir enquadrar a capa.');
getElement('lpCollectionName').value='Purple Way';
getElement('lpCollectionStatus').value='active';
getElement('lpCollectionCoverUrl').value='https://example.com/purple-way-cover.png';
getElement('lpCollectionCoverStoragePath').value='collections/purple-way/cover-test.png';
getElement('lpCollectionCoverZoom').value='112';
getElement('lpCollectionCoverX').value='48';
getElement('lpCollectionCoverY').value='44';
getElement('lpCollectionDescription').value='Coleção principal da biblioteca pedagógica Purple.';
global.PurpleLessonPlans.saveCollectionEditor('purple-way');
assert.strictEqual(adminWorkspace.collections[0].coverUrl,'https://example.com/purple-way-cover.png','Coleção deve persistir capa segura.');
assert.strictEqual(adminWorkspace.collections[0].coverStoragePath,'collections/purple-way/cover-test.png','Coleção deve persistir caminho seguro da capa.');
assert.strictEqual(adminWorkspace.collections[0].coverZoom,112,'Coleção deve persistir enquadramento da capa.');
global.PurpleLessonPlans.openCourse('discover');
global.PurpleLessonPlans.openBookEditor('discover');
assert(getElement('modalRoot').innerHTML.includes('Subir arquivos do livro'),'Painel de livro deve preparar upload seguro de capa/PDF.');
assert(getElement('modalRoot').innerHTML.includes('Zoom da capa'),'Painel de livro deve permitir ajustar a capa dentro do espaço.');
assert(getElement('modalRoot').innerHTML.includes('URL segura da capa'),'Painel de livro deve permitir associar capa por URL segura.');
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

global.PurpleLessonPlans.openUnitMapEditor('discover','discover-u01');
assert(getElement('modalRoot').innerHTML.includes('Título da unidade'),'Editor da unidade deve permitir corrigir o título.');
assert(getElement('modalRoot').innerHTML.includes('Subtítulo exibido no topo'),'Editor da unidade deve permitir corrigir o subtítulo.');
assert(getElement('modalRoot').innerHTML.includes('Campos legados opcionais'),'Editor da unidade deve rebaixar a estrutura antiga para opção complementar.');
getElement('lpUnitTitle').value='Unit 01 Revisada';
getElement('lpUnitTheme').value='Classroom survival atualizado';
getElement('lpUnitSubtitle').value='Subtítulo operacional revisado para a página da unidade.';
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
assert.strictEqual(adminWorkspace.courses[0].units[0].title,'Unit 01 Revisada','Mapa da Unidade deve persistir título editável.');
assert.strictEqual(adminWorkspace.courses[0].units[0].theme,'Classroom survival atualizado','Mapa da Unidade deve persistir edição.');
assert.strictEqual(adminWorkspace.courses[0].units[0].subtitle,'Subtítulo operacional revisado para a página da unidade.','Mapa da Unidade deve persistir subtítulo.');

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
assert(getElement('pageContainer').innerHTML.includes('Gestão da biblioteca'),'Gestão deve focar biblioteca visual e acervo.');
assert(getElement('pageContainer').innerHTML.includes('Biblioteca visual da Purple'),'Gestão deve preservar painel de capas/PDFs.');
assert(!getElement('pageContainer').innerHTML.includes('Ciclos ativos'),'Gestão não deve mais exibir KPIs administrativos.');
assert(!getElement('pageContainer').innerHTML.includes('Em andamento agora'),'Gestão não deve mais exibir ciclos como experiência principal.');
assert(!getElement('pageContainer').innerHTML.includes('Planos base recentes'),'Gestão não deve mais exibir publicados recentes como painel lateral.');
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
global.PurpleLessonPlans.setLessonTab('contrib');
assert(getElement('pageContainer').innerHTML.includes('A turma precisou de mais scaffolding'),'Render pós-reload simulado deve consultar dados persistidos.');

console.log('lesson plans module test ok');
