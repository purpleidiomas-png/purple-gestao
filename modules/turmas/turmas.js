(function(){
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const state=()=>window.PurpleState||{};
  const db=()=>state().db||{};
  const storage=()=>window.PurpleStorage;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const uid=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today=()=>new Date().toISOString().slice(0,10);
  const toast=message=>window.App?.toast?.(message);
  const rerender=()=>window.App?.renderPage?.();
  const closeModal=()=>window.App?.closeModal?.();
  function showModal(content){
    const root=document.getElementById('modalRoot');
    if(!root)return;
    document.body.classList.add('modal-open');
    root.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)App.closeModal()"><div class="modal">${content}</div></div>`;
  }
  const fmtDate=value=>value?new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR'):'--';
  const fmtNumber=value=>Number(value||0).toLocaleString('pt-BR');
  const user=()=>state().user||{};
  const can=permission=>Boolean(user()?.permissions?.[permission]);
  const canEdit=()=>user().role!=='viewer'&&(can('reports.edit')||can('reports.create')||can('panel.view'));
  const teacherLabel=id=>(db().teachers||[]).find(t=>t.id===id)?.name||'Professor nao vinculado';
  const bookLabel=id=>(db().inventoryItems||[]).find(b=>(b.id||b.supabaseId)===id)?.name||(db().lessonPlansWorkspace?.courses||[]).find(c=>c.id===id)?.name||'Livro nao vinculado';
  const classStudents=classId=>(db().students||[]).filter(s=>s.classId===classId&&String(s.situation||s.status||'Ativo').toLowerCase()!=='inativo');
  const classBlocks=c=>Array.isArray(c.scheduleBlocks)&&c.scheduleBlocks.length?c.scheduleBlocks:String(c.schedule||'').split('•').map(item=>({day:item.trim().split(/\s+/)[0]||'',time:item.trim().replace(/^\S+\s*/,'')||'',room:c.room||''})).filter(b=>b.day||b.time);
  const classStatus=c=>String(c.status||'Ativa').toLowerCase();
  const isActiveClass=c=>!['inativa','inativo'].includes(classStatus(c));
  const dayKey=(date=new Date())=>String(date.toLocaleDateString('pt-BR',{weekday:'long'})).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const lessonWorkspace=()=>db().lessonPlansWorkspace||{};
  const WEEKDAY_INDEX={DOMINGO:0,SEGUNDA:1,TERCA:2,QUARTA:3,QUINTA:4,SEXTA:5,SABADO:6};
  const BLOCK_TYPES=['AULA','REVIEW','SKILLCHECK','PROJECT','ASSESSMENT','MIDTERM','FINAL TEST','EXTRA','OUTRO','LESSON','PRESENTATION','PRACTICE','EXTRA ACTIVITY','CONVERSATION','OTHER'];
  const LL402_BLOCKS=[
    [1,1,'~','Welcoming Class','Welcoming class','OTHER'],
    [2,1,'9','Colors and shapes','Presenting the colors and the shapes','PRESENTATION'],
    [3,2,'11 - 15','Colors and shapes','Activity 1 | Activity 2','PRACTICE'],
    [4,2,'163','Colors and shapes','Extra activity','EXTRA ACTIVITY'],
    [5,3,'17','School Objects','Presenting the school objects','PRESENTATION'],
    [6,3,'19 / 165','School Objects','Activity 3 | Extra activity','PRACTICE'],
    [7,4,'21 - 23','Animals','Presenting the animals','PRESENTATION'],
    [8,4,'25 - 27','Animals','Activity 4 | Activity 5','PRACTICE'],
    [9,5,'29 / 167','Animals','Activity 6 | Extra activity','PRACTICE'],
    [10,5,'31 - 33','Food','Presenting the food | Activity 7','PRESENTATION'],
    [11,6,'35 / 169','Food','Activity 8 | Extra Activity','PRACTICE'],
    [12,6,'37 - 41','Family Members and emotions','Presenting family and emotions | Activity 9 | Activity 10','PRESENTATION'],
    [13,7,'171 - 175','Family Members and emotions','Extra activity','EXTRA ACTIVITY'],
    [14,7,'43 - 47','Body Parts and clothes','Activity 11 | Activity 12 | Presenting the body and clothes','PRESENTATION'],
    [15,8,'49 / 177','Body Parts and clothes','Activity 13 | Extra activity','PRACTICE'],
    [16,8,'51 - 53','Transportation','Presenting the means of transportation | Activity 14','PRESENTATION'],
    [17,9,'55','Toys','Presenting the toys','PRESENTATION'],
    [18,9,'57 - 59','Toys','Activity 15 | Activity 16','PRACTICE'],
    [19,10,'~','PROJECT I','Project I','PROJECT'],
    [20,10,'~','PROJECT I','Project I','PROJECT'],
    [21,11,'61 - 63','Professions','Presenting the professions | Activity 17','PRESENTATION'],
    [22,11,'65 - 67 / 179','Professions','Activity 18 | Extra activity','PRACTICE'],
    [23,12,'69 - 71','Opposites','Presenting the opposites | Activity 19','PRESENTATION'],
    [24,12,'73 - 77 / 181','Opposites','Activity 20 | Activity 21 | Extra activity','PRACTICE'],
    [25,13,'79 - 85','Opposites','Activity 22 | Activity 23 | Activity 24','PRACTICE'],
    [26,13,'89 - 93','Places','Presenting the places | Activity 26 | Activity 27','PRESENTATION'],
    [27,14,'95 - 99','Camping','Presenting the camp | Activity 28 | Activity 29','PRESENTATION'],
    [28,14,'101 - 103','At the beach','Presenting the beach | Activity 30','PRESENTATION'],
    [29,15,'105 - 107','Objects and appliances','Presenting the objects','PRESENTATION'],
    [30,15,'109 - 113','Objects and appliances','Activity 31 | Activity 32','PRACTICE'],
    [31,16,'115 / 87','Sports','Presenting the sports | Activity 25','PRESENTATION'],
    [32,16,'117 - 119 / 183','Sports','Activity 33 | Activity 34 | Extra activity','PRACTICE'],
    [33,17,'121 - 123','Verbs','Presenting the verbs','PRESENTATION'],
    [34,17,'125 - 127','Verbs','Activity 35 | Activity 36','PRACTICE'],
    [35,18,'121 - 123','Verbs','Presenting the verbs','PRESENTATION'],
    [36,18,'129 - 131','Verbs','Activity 37 | Activity 38','PRACTICE'],
    [37,19,'~','PROJECT II','Project II','PROJECT'],
    [38,19,'~','PROJECT II','Project II','PROJECT']
  ];
  const DISCOVER_42_TOPICS=['Welcoming Class','Unit 1 - Important Vocabulary','Unit 1 - Practice','Unit 2 - Getting to know each other','Unit 2 - Practice','Unit 3 - Daily life','Unit 3 - Communication','Review 1','Skillcheck 1','Unit 4 - My routine','Unit 4 - Practice','Project 1','Unit 5 - Around town','Unit 5 - Practice','Unit 6 - Food and choices','Unit 6 - Communication','Review 2','Midterm','Unit 7 - Experiences','Unit 7 - Practice','Unit 8 - Future plans','Unit 8 - Communication','Skillcheck 2','Project 2','Unit 9 - Culture','Unit 9 - Practice','Unit 10 - Problem solving','Unit 10 - Communication','Review 3','Assessment','Unit 11 - Media','Unit 11 - Practice','Unit 12 - Presentations','Unit 12 - Communication','Project 3','Final Review','Final Test Prep','Final Test','Feedback Class','Extra Practice','Portfolio Closing','Wrap-up'];

  function ensure(){
    const settings=db().settings=db().settings||{};
    const t=settings.turmas=settings.turmas||{};
    t.view=t.view||'list';
    t.activeClassId=t.activeClassId||'';
    t.activeTab=t.activeTab||'today';
    t.attendance=t.attendance||{};
    t.signals=t.signals||[];
    t.inboxTab=t.inboxTab||'new';
    t.scheduleTemplates=Array.isArray(t.scheduleTemplates)?t.scheduleTemplates:[];
    t.generatedSchedules=t.generatedSchedules||{};
    t.blockExecution=t.blockExecution||{};
    t.pendingBlocks=t.pendingBlocks||{};
    t.attendanceRules=t.attendanceRules||{present:1,absent:0,justified:0,replacement:1,warningPercent:75};
    seedScheduleTemplates(t);
    return t;
  }

  function seedScheduleTemplates(t=ensure()){
    if(!t.scheduleTemplates.some(item=>item.id==='little-learners-4-02-v1'))t.scheduleTemplates.push({
      id:'little-learners-4-02-v1',
      stableKey:'little-learners-4-02',
      title:'Little Learners 4.02',
      book:'Little Learners 4',
      source:'SCHEDULE LITTLE LEARNERS 4 CONQUERING 2o 2025 - LITTLE LEARNERS 4.02.pdf',
      version:1,
      status:'draft',
      createdAt:new Date().toISOString(),
      groupingMode:'encounterOrder',
      notes:'Interpretação inicial do PDF real. Datas históricas de 2025 foram usadas apenas para preservar agrupamentos; o template não possui datas fixas.',
      blocks:LL402_BLOCKS.map(([order,encounterOrder,pages,topic,content,type])=>({id:`ll402-b${String(order).padStart(2,'0')}`,order,encounterOrder,title:topic,topic,bookPages:pages,content,activities:splitActivities(content),type,estimatedDuration:'',lessonPlanRef:'',resourceRefs:[],notes:''}))
    });
    if(!t.scheduleTemplates.some(item=>item.id==='discover-42ha-v1'))t.scheduleTemplates.push({
      id:'discover-42ha-v1',
      stableKey:'discover-42ha',
      title:'Discover - Cronograma Base 42 HA',
      book:'Discover',
      source:'Modelo institucional 42 horas-aula',
      version:1,
      status:'draft',
      createdAt:new Date().toISOString(),
      groupingMode:'encounterOrder',
      notes:'Base reutilizavel. Sem datas fixas. Agrupamento inicial em encontros configuraveis por encounterOrder.',
      blocks:DISCOVER_42_TOPICS.map((topic,index)=>{const order=index+1,type=/review/i.test(topic)?'REVIEW':/skillcheck/i.test(topic)?'SKILLCHECK':/project/i.test(topic)?'PROJECT':/midterm/i.test(topic)?'MIDTERM':/final test/i.test(topic)?'FINAL TEST':/assessment/i.test(topic)?'ASSESSMENT':/extra/i.test(topic)?'EXTRA':'AULA';return {id:`discover42-b${String(order).padStart(2,'0')}`,order,encounterOrder:Math.ceil(order/2),unit:topic.match(/Unit \d+/)?.[0]||'',title:topic,topic,bookPages:'',content:topic,type,estimatedDuration:'1 HA',lessonPlanRef:'',resourceRefs:[],notes:''}})
    });
  }

  function splitActivities(content=''){return String(content).split(/\s+\|\s+|\s+-\s+/).map(item=>item.trim()).filter(Boolean).filter(item=>/^activity|^extra|^project|^presenting/i.test(item))}
  function scheduleTemplates(){return ensure().scheduleTemplates.slice().sort((a,b)=>String(a.title).localeCompare(String(b.title))||Number(b.version)-Number(a.version))}
  function scheduleTemplate(id){return ensure().scheduleTemplates.find(item=>item.id===id)||scheduleTemplates()[0]||null}
  function groupedTemplateBlocks(template){const groups=[];for(const block of (template?.blocks||[]).slice().sort((a,b)=>Number(a.order)-Number(b.order))){let group=groups.find(item=>item.encounterOrder===block.encounterOrder);if(!group){group={encounterOrder:block.encounterOrder,blocks:[]};groups.push(group)}group.blocks.push(block)}return groups.sort((a,b)=>Number(a.encounterOrder)-Number(b.encounterOrder))}
  function classGeneratedSchedule(classId){return ensure().generatedSchedules[classId]||null}
  function dateFromISO(value){const date=value?new Date(`${value}T12:00:00`):new Date();date.setHours(12,0,0,0);return date}
  function addDays(date,days){const next=new Date(date);next.setDate(next.getDate()+days);return next}
  function iso(date){return date.toISOString().slice(0,10)}
  function classWeekday(c){const first=classBlocks(c)[0]?.day||'';const key=Object.keys(WEEKDAY_INDEX).find(day=>norm(first).startsWith(day.slice(0,3)));return WEEKDAY_INDEX[key]??dateFromISO(c.startDate||today()).getDay()}
  function firstRecurringDate(startDate,weekday){let date=dateFromISO(startDate||today());for(let i=0;i<7&&date.getDay()!==weekday;i+=1)date=addDays(date,1);return date}
  function holidayList(){return [...(db().settings?.classHolidays||[]),...(db().classHolidays||[])].filter((item,index,arr)=>item?.date&&arr.findIndex(other=>other.date===item.date)===index)}
  function recessList(c){return Array.isArray(c.recessPeriods)?c.recessPeriods.filter(item=>item?.start||item?.end):[]}
  function blockedReason(dateISO,c){
    const holiday=holidayList().find(item=>item.date===dateISO);
    if(holiday)return `Feriado: ${holiday.name||'sem aula'}`;
    const recess=recessList(c).find(period=>(!period.start||dateISO>=period.start)&&(!period.end||dateISO<=period.end));
    if(recess)return `Recesso: ${fmtDate(recess.start)} a ${fmtDate(recess.end)}`;
    return '';
  }
  function generateSchedulePreview(c,templateId,startDate=c.startDate||today()){
    const template=scheduleTemplate(templateId),groups=groupedTemplateBlocks(template),weekday=classWeekday(c),time=classBlocks(c)[0]?.time||'',ignored=[];
    let cursor=firstRecurringDate(startDate,weekday),guard=0;
    const meetings=groups.map(group=>{
      while(blockedReason(iso(cursor),c)&&guard<260){ignored.push({date:iso(cursor),reason:blockedReason(iso(cursor),c)});cursor=addDays(cursor,7);guard+=1}
      const meeting={id:`${c.id}-m${String(group.encounterOrder).padStart(2,'0')}`,encounterOrder:group.encounterOrder,date:iso(cursor),time,blockIds:group.blocks.map(block=>block.id),blocks:group.blocks.map(block=>({...block}))};
      cursor=addDays(cursor,7);
      return meeting;
    });
    return {templateId:template.id,templateTitle:template.title,templateVersion:template.version,status:'preview',classId:c.id,startDate,weekday,time,blockCount:template.blocks.length,meetingCount:meetings.length,projectedEndDate:meetings.at(-1)?.date||'',ignored,meetings,createdAt:new Date().toISOString()};
  }
  function todayMeeting(c){
    const schedule=classGeneratedSchedule(c.id);
    if(!schedule)return null;
    return schedule.meetings.find(item=>item.date===today())||schedule.meetings.find(item=>item.date>=today())||schedule.meetings.at(-1)||null;
  }
  function pendingBlocks(c){return ensure().pendingBlocks[c.id]||[]}
  function executionFor(c,blockId){return ensure().blockExecution[`${c.id}::${blockId}`]||{}}
  function progressFor(c){
    const schedule=classGeneratedSchedule(c.id),blocks=(schedule?.meetings||[]).flatMap(meeting=>meeting.blocks||[]),done=blocks.filter(block=>executionFor(c,block.id).status==='done').length,partial=blocks.filter(block=>executionFor(c,block.id).status==='partial').length,pending=pendingBlocks(c).length;
    return {planned:blocks.length,done,partial,pending,percent:blocks.length?Math.round(done/blocks.length*100):0};
  }
  function meetingStatus(c,meeting){const blocks=meeting.blocks||[],done=blocks.filter(block=>executionFor(c,block.id).status==='done').length;if(meeting.status==='cancelled')return 'Nao realizada';if(done===blocks.length&&blocks.length)return 'Realizado';if(done>0)return 'Parcial';return meeting.date<today()?'Pendente':'Planejado'}
  function scheduleMeetings(schedule){return (schedule?.meetings||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.encounterOrder)-Number(b.encounterOrder))}
  function recalcSchedule(classId){
    const c=(db().classes||[]).find(item=>item.id===classId),schedule=classGeneratedSchedule(classId);
    if(!c||!schedule)return null;
    const weekday=classWeekday(c),ignored=[],time=classBlocks(c)[0]?.time||schedule.time||'';
    let cursor=firstRecurringDate(schedule.startDate||c.startDate||today(),weekday),guard=0;
    for(const meeting of scheduleMeetings(schedule)){
      while(blockedReason(iso(cursor),c)&&guard<520){ignored.push({date:iso(cursor),reason:blockedReason(iso(cursor),c)});cursor=addDays(cursor,7);guard+=1}
      meeting.date=iso(cursor);meeting.time=time;cursor=addDays(cursor,7);
    }
    schedule.ignored=ignored;schedule.projectedEndDate=scheduleMeetings(schedule).at(-1)?.date||'';c.projectedEndDate=schedule.projectedEndDate;return schedule;
  }
  function attendancePercent(studentId,classId){
    const rules=ensure().attendanceRules,rows=Object.entries(ensure().attendance).filter(([key])=>key.startsWith(`${classId}::`)).map(([,map])=>map?.[studentId]?.status).filter(Boolean);
    if(!rows.length)return null;
    const points=rows.reduce((sum,status)=>sum+Number(rules[status]??0),0);
    return Math.round(points/rows.length*100);
  }

  function visibleClasses(){
    const all=(db().classes||[]).filter(isActiveClass);
    if(user().role!=='teacher')return all;
    const teacherId=window.App?.resolveTeacherIdForUser?.(user())||'';
    return teacherId?all.filter(c=>c.teacherId===teacherId):[];
  }

  function nextSession(c){
    const blocks=classBlocks(c),now=new Date(),todayName=dayKey(now);
    const todayBlock=blocks.find(b=>norm(b.day).startsWith(todayName.slice(0,3)));
    return {date:today(),label:todayBlock?'Hoje':blocks[0]?.day||'A definir',block:todayBlock||blocks[0]||{}};
  }

  function lessonMeta(c){
    const w=lessonWorkspace(),courses=w.courses||[],bookName=norm(bookLabel(c.bookId)||c.course);
    const course=courses.find(item=>norm(item.id)===norm(c.bookId)||bookName.includes(norm(item.name))||norm(c.course).includes(norm(item.name)))||courses[0];
    const unit=(course?.units||[])[0],lesson=(unit?.lessons||[])[0],plan=w.lessonPlans?.[lesson?.id];
    return {course,unit,lesson,plan};
  }

  function attendanceKey(classId,date=today(),session='main'){return `${classId}::${date}::${session}`}
  function attendanceRows(c,date=today()){
    const key=attendanceKey(c.id,date),map=ensure().attendance[key]||{};
    return classStudents(c.id).map(student=>({student,status:map[student.id]?.status||'pending',updatedAt:map[student.id]?.updatedAt||'',note:map[student.id]?.note||''}));
  }
  function attendanceSummary(c,date=today()){
    return attendanceRows(c,date).reduce((acc,row)=>{acc.total++;acc[row.status]=(acc[row.status]||0)+1;return acc},{total:0,present:0,absent:0,justified:0,pending:0});
  }

  function renderCard(c){
    const students=classStudents(c.id),session=nextSession(c),meta=lessonMeta(c),summary=attendanceSummary(c);
    return `<article class="turma-card">
      <div class="turma-card-main">
        <span class="eyebrow">${esc(c.course||'Curso')} ${c.level?`/ ${esc(c.level)}`:''}</span>
        <h3>${esc(c.name)}</h3>
        <p>${esc([session.block.day,session.block.time].filter(Boolean).join(' · ')||c.schedule||'Horario nao informado')}</p>
      </div>
      <div class="turma-card-facts">
        <span><b>${fmtNumber(students.length)}</b> alunos</span>
        <span>${esc(bookLabel(c.bookId))}</span>
        <span>${esc(meta.unit?.title||'Unit a definir')} · ${esc(meta.lesson?.title||'Lesson a definir')}</span>
        <span>${summary.present}/${summary.total} presentes hoje</span>
      </div>
      <button class="btn primary" onclick="PurpleTurmas.open('${esc(c.id)}')">Abrir aula</button>
    </article>`;
  }

  function renderModule(){
    if(!can('panel.view'))return `<div class="page"><div class="empty"><div class="emoji">🔒</div><h3>Acesso restrito</h3></div></div>`;
    const t=ensure(),classes=visibleClasses(),active=(db().classes||[]).find(c=>c.id===t.activeClassId);
    if(active)return renderClass(active);
    if(t.view==='templates')return renderTemplatesPage(classes);
    const inboxCount=followupInbox().filter(item=>item.status==='new').length;
    const templateCount=scheduleTemplates().length;
    return `<div class="page turmas-page">
      <div class="section-title"><div><span class="eyebrow">Centro operacional da aula</span><h2>${user().role==='teacher'?'Minhas turmas':'Turmas'}</h2><p>Chamada, cronograma base, execução e acompanhamento no mesmo fluxo.</p></div><div class="section-actions">${user().role!=='teacher'?`<button class="btn ghost" onclick="PurpleTurmas.showTemplates()">Schedules padrão (${templateCount})</button><button class="btn ghost" onclick="PurpleTurmas.openInbox()">Acompanhamentos ${inboxCount?`(${inboxCount})`:''}</button><button class="btn soft" onclick="App.editClass()">Nova turma</button>`:''}</div></div>
      ${renderTurmasNav('classes')}
      ${renderScheduleTemplateSpotlight(classes)}
      <section class="turmas-grid">${classes.map(renderCard).join('')||'<div class="empty"><h3>Nenhuma turma autorizada</h3><p>Verifique professor vinculado, permissao ou cadastro academico.</p></div>'}</section>
    </div>`;
  }

  function renderTurmasNav(active='classes'){
    return `<nav class="turmas-module-tabs"><button class="${active==='classes'?'active':''}" onclick="PurpleTurmas.showClasses()">Turmas</button><button class="${active==='templates'?'active':''}" onclick="PurpleTurmas.showTemplates()">Schedules padrão</button></nav>`;
  }

  function renderTemplatesPage(classes=[]){
    const templates=scheduleTemplates();
    return `<div class="page turmas-page">
      <div class="section-title"><div><span class="eyebrow">Biblioteca pedagogica</span><h2>Schedules padrão</h2><p>Cronogramas base institucionais por livro. Sem datas fixas; servem para gerar cronogramas reais das turmas.</p></div><div class="section-actions"><button class="btn ghost" onclick="PurpleTurmas.showClasses()">Voltar para turmas</button></div></div>
      ${renderTurmasNav('templates')}
      <section class="template-library-grid">${templates.map(template=>{const groups=groupedTemplateBlocks(template);return `<article class="template-library-card"><div><span class="eyebrow">${esc(template.book||'Livro')}</span><h3>${esc(template.title)}</h3><p>${esc(template.notes||'Modelo institucional reutilizavel.')}</p></div><div class="schedule-template-stats"><span><b>${fmtNumber(template.blocks.length)}</b> blocos</span><span><b>${fmtNumber(groups.length)}</b> encontros</span><span><b>v${esc(template.version)}</b> ${esc(template.status)}</span></div><div class="section-actions"><button class="btn primary small" onclick="PurpleTurmas.openTemplate('${esc(template.id)}')">Abrir schedule</button>${classes[0]?`<button class="btn soft small" onclick="PurpleTurmas.open('${esc(classes[0].id)}');PurpleTurmas.tab('base')">Gerar em turma</button>`:''}</div></article>`}).join('')||'<div class="empty"><h3>Nenhum schedule padrão</h3></div>'}</section>
    </div>`;
  }

  function renderScheduleTemplateSpotlight(classes=[]){
    const template=scheduleTemplate('little-learners-4-02-v1')||scheduleTemplates()[0];
    if(!template)return '';
    const groups=groupedTemplateBlocks(template),firstClass=classes[0];
    return `<section class="panel schedule-template-spotlight">
      <div>
        <span class="eyebrow">Cronograma Base por Livro</span>
        <h3>${esc(template.title)}</h3>
        <p>Base importada do PDF oficial: ${fmtNumber(template.blocks.length)} blocos em ${fmtNumber(groups.length)} encontros, sem datas fixas. Use para gerar o cronograma real de cada turma respeitando feriados e recessos.</p>
      </div>
      <div class="schedule-template-stats">
        <span><b>${fmtNumber(template.blocks.length)}</b> blocos</span>
        <span><b>${fmtNumber(groups.length)}</b> encontros</span>
        <span><b>v${esc(template.version)}</b> ${esc(template.status==='published'?'publicada':'rascunho')}</span>
      </div>
      <div class="section-actions schedule-template-actions">
        <button class="btn primary" onclick="PurpleTurmas.showTemplates()">Ver schedules padrão</button>
        <button class="btn ghost" onclick="PurpleTurmas.openTemplate('${esc(template.id)}')">Visualizar base</button>
        ${firstClass?`<button class="btn soft" onclick="PurpleTurmas.open('${esc(firstClass.id)}');PurpleTurmas.tab('base')">Gerar em uma turma</button>`:''}
      </div>
    </section>`;
  }

  function renderClass(c){
    const t=ensure(),tab=t.activeTab||'today',tabs=[['today','Hoje'],['students','Alunos'],['schedule','Cronograma'],['base','Base'],['history','Historico']];
    return `<div class="page turma-workspace">
      <div class="turma-topline"><button class="btn ghost small" onclick="PurpleTurmas.back()">Voltar</button><div><span class="eyebrow">${esc(bookLabel(c.bookId))}</span><h2>${esc(c.name)}</h2><p>${esc(teacherLabel(c.teacherId))} · ${esc(classBlocks(c).map(b=>[b.day,b.time].filter(Boolean).join(' ')).join(' / ')||'Horario nao informado')}</p></div></div>
      <nav class="twr-top-tabs">${tabs.map(([id,label])=>`<button class="${tab===id?'active':''}" onclick="PurpleTurmas.tab('${id}')">${label}</button>`).join('')}</nav>
      ${tab==='today'?renderToday(c):tab==='students'?renderStudents(c):tab==='schedule'?renderSchedule(c):tab==='base'?renderBaseForClass(c):renderHistory(c)}
    </div>`;
  }

  function renderToday(c){
    const session=nextSession(c),meta=lessonMeta(c),summary=attendanceSummary(c),meeting=todayMeeting(c),pending=pendingBlocks(c);
    const plannedBlocks=meeting?.blocks||[];
    return `<section class="turma-today-grid">
      <div class="turma-command">
        <div class="panel-head"><div><span class="eyebrow">Hoje · ${fmtDate(session.date)}</span><h3>O que vou ensinar?</h3><small>${esc(session.block.time||meeting?.time||'Horario a confirmar')} · encontro ${esc(meeting?.encounterOrder||meta.lesson?.meetingNumber||'--')}</small></div></div>
        ${pending.length?`<div class="alert yellow turma-pending"><div class="alert-icon">!</div><div><b>Conteudo pendente da aula anterior</b><span>${pending.map(block=>`Bloco ${block.order} - ${esc(block.title)}`).join(' • ')}</span></div></div>`:''}
        <div class="turma-lesson-focus"><b>${esc(classGeneratedSchedule(c.id)?.templateTitle||meta.course?.name||c.course||'Curso')}</b>${plannedBlocks.length?plannedBlocks.map(block=>`<div class="today-block"><strong>Bloco ${block.order} · ${esc(block.title)}</strong><span>${esc(block.content)}</span><small>Paginas: ${esc(block.bookPages||'--')}</small></div>`).join(''):`<strong>${esc(meta.unit?.title||'Unit a definir')} · ${esc(meta.lesson?.title||'Lesson a definir')}</strong><span>${esc(meta.lesson?.theme||meta.plan?.theme||'Plano base ainda nao vinculado')}</span><small>Book pages: ${esc(meta.lesson?.bookPages||meta.unit?.studentBookPages||'--')}</small>`}</div>
        <div class="section-actions" style="justify-content:flex-start">${meta.lesson?`<button class="btn primary" onclick="PurpleTurmas.openLesson('${esc(meta.lesson.id)}')">Abrir plano base</button>`:''}<button class="btn ghost" onclick="PurpleTurmas.openBook('${esc(c.bookId||'')}')">Abrir livro</button>${plannedBlocks.length?`<button class="btn soft" onclick="PurpleTurmas.completePlanned('${esc(c.id)}','${esc(meeting.id)}')">Concluir conforme planejado</button>`:''}<button class="btn ghost" onclick="PurpleTurmas.noteClass('${esc(c.id)}')">Registrar aula</button></div>
        ${plannedBlocks.length?`<div class="turma-block-execution">${plannedBlocks.map(block=>renderBlockExecution(c,block)).join('')}</div>`:''}
      </div>
      <div class="turma-attendance">
        <div class="panel-head"><div><h3>Chamada em tempo real</h3><small>${summary.present} presentes · ${summary.absent} faltas · ${summary.justified} justificadas</small></div><button class="btn soft small" onclick="PurpleTurmas.allPresent('${esc(c.id)}')">Todos presentes</button></div>
        <div class="attendance-list">${attendanceRows(c).map(row=>renderAttendanceRow(c,row)).join('')||'<div class="empty"><p>Nenhum aluno vinculado a esta turma.</p></div>'}</div>
      </div>
    </section>`;
  }

  function renderBlockExecution(c,block){
    const execution=executionFor(c,block.id),status=execution.status||'planned';
    return `<article class="block-exec ${status}"><div><b>Bloco ${block.order}</b><span>${esc(block.title)} · ${esc(block.bookPages||'--')}</span></div><div class="attendance-actions"><button class="${status==='done'?'active':''}" onclick="PurpleTurmas.setBlockStatus('${esc(c.id)}','${esc(block.id)}','done')">Concluido</button><button class="${status==='partial'?'active':''}" onclick="PurpleTurmas.setBlockStatus('${esc(c.id)}','${esc(block.id)}','partial')">Parcial</button><button class="${status==='pending'?'active':''}" onclick="PurpleTurmas.setBlockStatus('${esc(c.id)}','${esc(block.id)}','pending')">Pendente</button></div></article>`;
  }

  function renderAttendanceRow(c,row){
    const buttons=[['present','Presente'],['absent','Falta'],['justified','Falta justificada'],['replacement','Reposicao realizada']];
    return `<article class="attendance-row ${row.status}">
      <button class="student-link" onclick="PurpleTurmas.quickStudent('${esc(row.student.id)}','${esc(c.id)}')">${esc(row.student.name)}</button>
      <div class="attendance-actions">${buttons.map(([status,label])=>`<button class="${row.status===status?'active':''}" onclick="PurpleTurmas.setAttendance('${esc(c.id)}','${esc(row.student.id)}','${status}')">${label}</button>`).join('')}</div>
      <span class="save-state" id="att-${esc(c.id)}-${esc(row.student.id)}">${row.updatedAt?'Salvo':'--'}</span>
    </article>`;
  }

  function renderStudents(c){
    return `<section class="panel"><div class="panel-head"><div><h3>Alunos da turma</h3><small>Nome clicavel para consulta operacional rapida.</small></div></div><div class="turma-student-list">${classStudents(c.id).map(s=>{const freq=attendancePercent(s.id,c.id);return `<article><button onclick="PurpleTurmas.quickStudent('${esc(s.id)}','${esc(c.id)}')"><b>${esc(s.name)}</b><span>${esc(s.level||c.level||'Nivel nao informado')} · freq. ${freq===null?fmtNumber(s.frequency||0):fmtNumber(freq)}%</span></button><button class="btn ghost small" onclick="PurpleTurmas.signal('${esc(s.id)}','${esc(c.id)}')">Registrar acompanhamento</button></article>`}).join('')||'<div class="empty"><p>Nenhum aluno vinculado.</p></div>'}</div></section>`;
  }
  function renderSchedule(c){
    const schedule=classGeneratedSchedule(c.id),progress=progressFor(c);
    if(schedule)return `<section class="panel turma-schedule-premium"><div class="panel-head"><div><span class="eyebrow">${esc(schedule.templateTitle)}</span><h3>Cronograma real da turma</h3><small>${fmtNumber(progress.done)} / ${fmtNumber(progress.planned)} horas-aula realizadas · conclusao prevista ${fmtDate(schedule.projectedEndDate)}</small></div><div class="section-actions"><button class="btn ghost small" onclick="PurpleTurmas.insertLesson('${esc(c.id)}')">Inserir aula</button><button class="btn ghost small" onclick="PurpleTurmas.previewSchedule('${esc(c.id)}')">Regerar preview</button></div></div><section class="student-attendance-summary"><span><b>Planejado</b>${fmtNumber(progress.planned)} HA</span><span><b>Realizado</b>${fmtNumber(progress.done)} HA</span><span><b>Pendentes</b>${fmtNumber(progress.pending)}</span><span><b>${fmtNumber(progress.percent)}%</b> progresso</span></section><div class="schedule-timeline">${scheduleMeetings(schedule).map(meeting=>`<article class="schedule-node ${meeting.localChange?'local-change':''} ${meeting.status==='cancelled'?'cancelled':''}"><time>${fmtDate(meeting.date)}</time><div><div class="schedule-node-head"><h4>Encontro ${String(meeting.encounterOrder).padStart(2,'0')}</h4><span>${meetingStatus(c,meeting)}</span></div>${meeting.localChange?'<small class="local-badge">Ajuste desta turma</small>':'<small class="local-badge base">Conforme plano base</small>'}${meeting.blocks.map(block=>`<p><b>${String(block.order).padStart(2,'0')} · ${esc(block.title)}</b><small>${esc(block.unit||'')} ${esc(block.bookPages?`p. ${block.bookPages}`:'')} · ${esc(block.content)}</small></p>`).join('')}<div class="table-actions"><button class="btn ghost small" onclick="PurpleTurmas.repeatMeeting('${esc(c.id)}','${esc(meeting.id)}')">Repetir conteudo</button><button class="btn danger small" onclick="PurpleTurmas.cancelMeeting('${esc(c.id)}','${esc(meeting.id)}')">Cancelar / nao realizada</button></div></div></article>`).join('')}</div></section>`;
    return `<section class="panel"><div class="panel-head"><div><h3>Cronograma</h3><small>Grade oficial preservada do cadastro de Turmas. Gere o cronograma real a partir de um cronograma base.</small></div><button class="btn primary small" onclick="PurpleTurmas.previewSchedule('${esc(c.id)}')">Gerar cronograma</button></div><div class="table-wrap"><table><thead><tr><th>Dia</th><th>Horario</th><th>Sala</th></tr></thead><tbody>${classBlocks(c).map(b=>`<tr><td>${esc(b.day||'--')}</td><td>${esc(b.time||'--')}</td><td>${esc(b.room||c.room||'--')}</td></tr>`).join('')||'<tr><td colspan="3">Sem grade cadastrada.</td></tr>'}</tbody></table></div></section>`;
  }
  function renderBaseForClass(c){
    const schedule=classGeneratedSchedule(c.id),template=scheduleTemplate(schedule?.templateId)||scheduleTemplates()[0];
    return `<section class="panel"><div class="panel-head"><div><h3>Cronograma base do livro</h3><small>Conteudo e ordem separados das datas reais da turma.</small></div><div class="section-actions"><button class="btn ghost small" onclick="PurpleTurmas.openTemplate('${esc(template?.id||'')}')">Ver base</button><button class="btn primary small" onclick="PurpleTurmas.previewSchedule('${esc(c.id)}')">Gerar/atualizar preview</button></div></div>${template?renderTemplateSummary(template):'<div class="empty"><p>Nenhum cronograma base cadastrado.</p></div>'}</section>`;
  }
  function renderHistory(c){
    const signals=ensure().signals.filter(s=>s.classId===c.id);
    return `<section class="panel"><div class="panel-head"><div><h3>Historico da turma</h3><small>Frequencias e sinais registrados no ambiente da aula.</small></div></div><div class="timeline">${signals.map(s=>`<div class="timeline-item"><b>${esc(s.studentName)} · ${esc(s.type)}</b><p>${esc(s.description)}</p><time>${fmtDate(s.date)} · ${esc(s.priority)} · ${esc((s.destinations||[]).join(' + '))}</time></div>`).join('')||'<div class="empty"><p>Nenhum acompanhamento registrado.</p></div>'}</div></section>`;
  }

  function renderTemplateSummary(template){
    const groups=groupedTemplateBlocks(template);
    return `<div class="template-summary"><div class="turma-card-facts"><span><b>${fmtNumber(template.blocks.length)}</b> blocos</span><span><b>${fmtNumber(groups.length)}</b> encontros</span><span>Versao ${esc(template.version)}</span><span>${esc(template.status==='published'?'Publicado':'Rascunho')}</span></div><div class="base-schedule-list compact">${groups.slice(0,4).map(group=>`<article><h4>Encontro ${String(group.encounterOrder).padStart(2,'0')}</h4>${group.blocks.map(block=>`<p><b>${String(block.order).padStart(2,'0')}</b> ${esc(block.title)} <small>${esc(block.bookPages)} · ${esc(block.content)}</small></p>`).join('')}</article>`).join('')}</div></div>`;
  }

  function openTemplates(){
    const templates=scheduleTemplates();
    showModal(`<div class="modal-head"><div><span class="eyebrow">Biblioteca pedagogica</span><h3>Cronogramas base</h3><p class="helper">Templates versionados: conteúdo e ordem sem datas fixas.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="base-template-list">${templates.map(template=>`<article><div><b>${esc(template.title)}</b><span>${fmtNumber(template.blocks.length)} blocos · ${fmtNumber(groupedTemplateBlocks(template).length)} encontros · v${esc(template.version)} · ${esc(template.status)}</span></div><button class="btn ghost small" onclick="PurpleTurmas.openTemplate('${esc(template.id)}')">Abrir</button></article>`).join('')||'<div class="empty"><p>Nenhum cronograma base cadastrado.</p></div>'}</div>`,true);
  }

  function openTemplate(id){
    const template=scheduleTemplate(id);
    if(!template)return toast('Cronograma base nao encontrado.');
    const groups=groupedTemplateBlocks(template);
    showModal(`<div class="modal-head"><div><span class="eyebrow">Cronograma Base</span><h3>${esc(template.title)}</h3><p class="helper">${fmtNumber(template.blocks.length)} blocos · ${fmtNumber(groups.length)} encontros · versao ${esc(template.version)} · ${esc(template.status)}</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="section-actions" style="justify-content:flex-start;margin-bottom:12px"><button class="btn ghost small" onclick="PurpleTurmas.addTemplateBlock('${esc(template.id)}')">Adicionar bloco</button><button class="btn soft small" onclick="PurpleTurmas.publishTemplateVersion('${esc(template.id)}')">Publicar nova versao</button></div><div class="base-schedule-list">${groups.map(group=>`<article><h4>Encontro ${String(group.encounterOrder).padStart(2,'0')}</h4>${group.blocks.map(block=>`<div class="template-block-row"><div><b>${String(block.order).padStart(2,'0')} · ${esc(block.title)}</b><span>${esc(block.type)} · paginas ${esc(block.bookPages||'--')}</span><small>${esc(block.content)}</small></div><div class="table-actions"><button class="btn ghost small" onclick="PurpleTurmas.editTemplateBlock('${esc(template.id)}','${esc(block.id)}')">Editar</button><button class="btn ghost small" onclick="PurpleTurmas.moveTemplateBlock('${esc(template.id)}','${esc(block.id)}',-1)">↑</button><button class="btn ghost small" onclick="PurpleTurmas.moveTemplateBlock('${esc(template.id)}','${esc(block.id)}',1)">↓</button><button class="btn danger small" onclick="PurpleTurmas.removeTemplateBlock('${esc(template.id)}','${esc(block.id)}')">Remover</button></div></div>`).join('')}</article>`).join('')}</div>`);
  }

  function templateBlockModal(templateId,blockId=''){
    const template=scheduleTemplate(templateId),block=template?.blocks.find(item=>item.id===blockId)||{order:(template?.blocks.length||0)+1,encounterOrder:groupedTemplateBlocks(template).length+1,title:'',topic:'',bookPages:'',content:'',type:'LESSON',lessonPlanRef:'',resourceRefs:[],notes:''};
    if(!template)return toast('Cronograma base nao encontrado.');
    showModal(`<div class="modal-head"><div><span class="eyebrow">${blockId?'Editar':'Novo'} bloco</span><h3>${esc(template.title)}</h3></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-3"><div class="field"><label>Ordem</label><input id="tplBlockOrder" type="number" min="1" value="${Number(block.order||1)}"/></div><div class="field"><label>Encontro</label><input id="tplBlockEncounter" type="number" min="1" value="${Number(block.encounterOrder||1)}"/></div><div class="field"><label>Tipo</label><select id="tplBlockType">${BLOCK_TYPES.map(type=>`<option ${block.type===type?'selected':''}>${esc(type)}</option>`).join('')}</select></div><div class="field"><label>Titulo/topico</label><input id="tplBlockTitle" value="${esc(block.title||'')}"/></div><div class="field"><label>Paginas</label><input id="tplBlockPages" value="${esc(block.bookPages||'')}"/></div><div class="field"><label>Lesson Plan ref.</label><input id="tplBlockLesson" value="${esc(block.lessonPlanRef||'')}"/></div></div><div class="field"><label>Conteudo / atividades</label><textarea id="tplBlockContent">${esc(block.content||'')}</textarea></div><div class="field"><label>Notas</label><textarea id="tplBlockNotes">${esc(block.notes||'')}</textarea></div><div class="section-actions"><button class="btn ghost" onclick="PurpleTurmas.openTemplate('${esc(templateId)}')">Voltar</button><button class="btn primary" onclick="PurpleTurmas.saveTemplateBlock('${esc(templateId)}','${esc(blockId)}')">Salvar bloco</button></div>`);
  }

  async function saveTemplateBlock(templateId,blockId=''){
    const template=scheduleTemplate(templateId);
    if(!template)return toast('Cronograma base nao encontrado.');
    const block={id:blockId||uid('tpl-block'),order:Number($('#tplBlockOrder')?.value||1),encounterOrder:Number($('#tplBlockEncounter')?.value||1),title:$('#tplBlockTitle')?.value.trim()||'Sem titulo',topic:$('#tplBlockTitle')?.value.trim()||'Sem titulo',bookPages:$('#tplBlockPages')?.value.trim()||'~',content:$('#tplBlockContent')?.value.trim()||'',activities:splitActivities($('#tplBlockContent')?.value||''),type:$('#tplBlockType')?.value||'LESSON',estimatedDuration:'',lessonPlanRef:$('#tplBlockLesson')?.value.trim()||'',resourceRefs:[],notes:$('#tplBlockNotes')?.value.trim()||''};
    const idx=template.blocks.findIndex(item=>item.id===blockId);
    if(idx>=0)template.blocks[idx]=block;else template.blocks.push(block);
    template.status='draft';template.updatedAt=new Date().toISOString();
    template.blocks.sort((a,b)=>Number(a.order)-Number(b.order)).forEach((item,index)=>item.order=index+1);
    await persist('Cronograma base salvo como rascunho.');
    openTemplate(templateId);
  }

  async function moveTemplateBlock(templateId,blockId,delta){
    const template=scheduleTemplate(templateId),blocks=template?.blocks.sort((a,b)=>Number(a.order)-Number(b.order));
    if(!blocks)return;
    const index=blocks.findIndex(item=>item.id===blockId),next=index+Number(delta);
    if(index<0||next<0||next>=blocks.length)return;
    [blocks[index],blocks[next]]=[blocks[next],blocks[index]];
    blocks.forEach((item,i)=>item.order=i+1);
    template.status='draft';template.updatedAt=new Date().toISOString();
    await persist();
    openTemplate(templateId);
  }

  async function removeTemplateBlock(templateId,blockId){
    const template=scheduleTemplate(templateId);
    if(!template||!confirm('Remover este bloco do cronograma base?'))return;
    template.blocks=template.blocks.filter(item=>item.id!==blockId).map((item,index)=>({...item,order:index+1}));
    template.status='draft';template.updatedAt=new Date().toISOString();
    await persist('Bloco removido do rascunho.');
    openTemplate(templateId);
  }

  async function publishTemplateVersion(templateId){
    const template=scheduleTemplate(templateId);
    if(!template)return;
    const copy=JSON.parse(JSON.stringify(template));
    copy.id=`${copy.stableKey}-v${Number(copy.version||1)+1}`;
    copy.version=Number(copy.version||1)+1;
    copy.status='draft';
    copy.createdAt=new Date().toISOString();
    ensure().scheduleTemplates.push(copy);
    template.status='published';
    template.publishedAt=new Date().toISOString();
    await persist('Versao publicada e nova versao rascunho criada.');
    openTemplates();
  }

  function previewSchedule(classId){
    const c=(db().classes||[]).find(item=>item.id===classId),templates=scheduleTemplates();
    if(!c)return toast('Turma nao encontrada.');
    if(!templates.length)return toast('Cadastre um cronograma base primeiro.');
    const selected=classGeneratedSchedule(classId)?.templateId||templates[0].id;
    showModal(`<div class="modal-head"><div><span class="eyebrow">Gerar cronograma da turma</span><h3>${esc(c.name)}</h3><p class="helper">O preview pula feriados/recessos sem consumir conteudo.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-2"><div class="field"><label>Cronograma base</label><select id="scheduleTemplateSelect">${templates.map(template=>`<option value="${esc(template.id)}" ${template.id===selected?'selected':''}>${esc(template.title)} v${esc(template.version)} (${esc(template.status)})</option>`).join('')}</select></div><div class="field"><label>Data inicial</label><input id="scheduleStartDate" type="date" value="${esc(c.startDate||today())}"/></div></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.showSchedulePreview('${esc(classId)}')">Ver preview</button></div>`);
  }

  function showSchedulePreview(classId){
    const c=(db().classes||[]).find(item=>item.id===classId),preview=generateSchedulePreview(c,$('#scheduleTemplateSelect')?.value,$('#scheduleStartDate')?.value);
    showModal(`<div class="modal-head"><div><span class="eyebrow">Preview antes de publicar</span><h3>${esc(preview.templateTitle)} v${esc(preview.templateVersion)}</h3><p class="helper">${fmtNumber(preview.blockCount)} blocos · ${fmtNumber(preview.meetingCount)} encontros · conclusao ${fmtDate(preview.projectedEndDate)}</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="turma-card-facts"><span><b>Inicio</b>${fmtDate(preview.startDate)}</span><span><b>Horario</b>${esc(preview.time||'--')}</span><span><b>Ignorados</b>${fmtNumber(preview.ignored.length)}</span><span><b>Template</b>${esc(preview.templateTitle)}</span></div>${preview.ignored.length?`<div class="alert yellow"><div class="alert-icon">!</div><div><b>Datas sem aula ignoradas</b><span>${preview.ignored.map(item=>`${fmtDate(item.date)} - ${esc(item.reason)}`).join(' • ')}</span></div></div>`:''}<div class="base-schedule-list preview">${preview.meetings.map(meeting=>`<article><h4>Encontro ${String(meeting.encounterOrder).padStart(2,'0')} · ${fmtDate(meeting.date)} · ${esc(meeting.time||'--')}</h4>${meeting.blocks.map(block=>`<p><b>Bloco ${block.order}</b> ${esc(block.title)} <small>${esc(block.bookPages)} · ${esc(block.content)}</small></p>`).join('')}</article>`).join('')}</div><div class="section-actions"><button class="btn ghost" onclick="PurpleTurmas.previewSchedule('${esc(classId)}')">Voltar e ajustar</button><button class="btn primary" onclick="PurpleTurmas.publishSchedule('${esc(classId)}','${esc(preview.templateId)}','${esc(preview.startDate)}')">Publicar cronograma</button></div>`);
  }

  async function publishSchedule(classId,templateId,startDate){
    const c=(db().classes||[]).find(item=>item.id===classId);
    const preview=generateSchedulePreview(c,templateId,startDate);
    preview.status='published';preview.publishedAt=new Date().toISOString();preview.publishedBy=user().name||'Purple';
    ensure().generatedSchedules[classId]=preview;
    c.projectedEndDate=preview.projectedEndDate;
    c.scheduleTemplateId=preview.templateId;
    c.scheduleTemplateVersion=preview.templateVersion;
    await persist('Cronograma publicado para a turma.');
    closeModal();rerender();
  }

  function insertLesson(classId){
    showModal(`<div class="modal-head"><div><span class="eyebrow">Ajuste desta turma</span><h3>Inserir aula</h3><p class="helper">Altera somente a instancia desta turma.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-2"><div class="field"><label>Titulo</label><input id="localLessonTitle" value="Reforco Unit 04"/></div><div class="field"><label>Tipo</label><select id="localLessonType">${BLOCK_TYPES.map(type=>`<option ${type==='REVIEW'?'selected':''}>${esc(type)}</option>`).join('')}</select></div><div class="field"><label>Quantidade de blocos</label><input id="localLessonBlocks" type="number" min="1" max="6" value="2"/></div><div class="field"><label>Paginas</label><input id="localLessonPages" placeholder="p. 30-40"/></div></div><div class="field"><label>Conteudo</label><textarea id="localLessonContent">Reforco pedagogico conforme necessidade da turma.</textarea></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.saveInsertedLesson('${esc(classId)}')">Inserir e recalcular</button></div>`);
  }
  async function saveInsertedLesson(classId){
    const schedule=classGeneratedSchedule(classId);if(!schedule)return toast('Publique um cronograma antes.');
    const count=Math.max(1,Number($('#localLessonBlocks')?.value||1)),maxOrder=Math.max(0,...schedule.meetings.flatMap(m=>(m.blocks||[]).map(b=>Number(b.order)||0))),nextEncounter=Math.max(0,...schedule.meetings.map(m=>Number(m.encounterOrder)||0))+1;
    const blocks=Array.from({length:count},(_,i)=>({id:uid('local-block'),order:maxOrder+i+1,encounterOrder:nextEncounter,title:$('#localLessonTitle')?.value.trim()||'Aula inserida',topic:$('#localLessonTitle')?.value.trim()||'Aula inserida',bookPages:$('#localLessonPages')?.value.trim()||'',content:$('#localLessonContent')?.value.trim()||'',type:$('#localLessonType')?.value||'REVIEW',localChange:true,notes:'Inserido na turma'}));
    schedule.meetings.push({id:uid('local-meeting'),encounterOrder:nextEncounter,date:schedule.projectedEndDate||today(),time:schedule.time||'',blockIds:blocks.map(b=>b.id),blocks,localChange:true,changeReason:'Aula inserida'});
    recalcSchedule(classId);await persist('Aula inserida e cronograma recalculado.');closeModal();rerender();
  }
  async function repeatMeeting(classId,meetingId){
    const schedule=classGeneratedSchedule(classId),meeting=schedule?.meetings.find(item=>item.id===meetingId);if(!meeting)return;
    const nextEncounter=Math.max(...schedule.meetings.map(m=>Number(m.encounterOrder)||0))+1,maxOrder=Math.max(...schedule.meetings.flatMap(m=>(m.blocks||[]).map(b=>Number(b.order)||0)));
    const blocks=(meeting.blocks||[]).map((block,index)=>({...block,id:uid('repeat-block'),order:maxOrder+index+1,encounterOrder:nextEncounter,localChange:true,notes:`Repeticao do bloco ${block.order}`}));
    schedule.meetings.push({id:uid('repeat-meeting'),encounterOrder:nextEncounter,date:meeting.date,time:meeting.time,blockIds:blocks.map(b=>b.id),blocks,localChange:true,changeReason:`Repeticao do encontro ${meeting.encounterOrder}`});
    recalcSchedule(classId);await persist('Conteudo repetido e datas futuras recalculadas.');rerender();
  }
  async function cancelMeeting(classId,meetingId){
    const schedule=classGeneratedSchedule(classId),meeting=schedule?.meetings.find(item=>item.id===meetingId);if(!meeting||!confirm('Marcar aula como nao realizada e reprogramar conteudo?'))return;
    meeting.status='cancelled';meeting.localChange=true;meeting.changeReason='Aula nao realizada';
    const clone={...meeting,id:uid('reprogrammed-meeting'),status:'planned',localChange:true,changeReason:'Conteudo reprogramado',blocks:(meeting.blocks||[]).map(block=>({...block,localChange:true,notes:'Reprogramado apos aula nao realizada'}))};
    schedule.meetings.push(clone);recalcSchedule(classId);await persist('Aula reprogramada e previsao atualizada.');rerender();
  }

  async function persist(message){
    await storage()?.save?.(db());
    if(message)toast(message);
  }
  async function setAttendance(classId,studentId,status){
    const t=ensure(),key=attendanceKey(classId),el=$(`#att-${CSS.escape(classId)}-${CSS.escape(studentId)}`);
    t.attendance[key]=t.attendance[key]||{};
    t.attendance[key][studentId]={status,updatedAt:new Date().toISOString()};
    if(el)el.textContent='Salvando...';
    try{
      const student=(db().students||[]).find(s=>s.id===studentId);
      if(student){
        student.attendanceEntries=Array.isArray(student.attendanceEntries)?student.attendanceEntries:[];
        const rowId=`class-${classId}-${today()}`;
        const row={id:rowId,date:today(),scheduledTime:nextSession((db().classes||[]).find(c=>c.id===classId)||{}).block.time||'',teacherId:(db().classes||[]).find(c=>c.id===classId)?.teacherId||'',teacher:teacherLabel((db().classes||[]).find(c=>c.id===classId)?.teacherId),classType:'Turma',present:status==='present',justified:status==='justified',replacementDone:status==='replacement',source:'turmas'};
        const idx=student.attendanceEntries.findIndex(x=>x.id===rowId);
        if(idx>=0)student.attendanceEntries[idx]=row;else student.attendanceEntries.unshift(row);
      }
      await persist();
      if(el)el.textContent='Salvo';
      rerender();
    }catch(error){console.error(error);if(el)el.textContent='Erro ao salvar';toast('Erro ao salvar chamada. Tente novamente.')}
  }
  async function allPresent(classId){
    const c=(db().classes||[]).find(item=>item.id===classId);
    if(!c)return;
    for(const s of classStudents(classId))await setAttendance(classId,s.id,'present');
  }
  async function setBlockStatus(classId,blockId,status){
    const t=ensure(),schedule=classGeneratedSchedule(classId),block=(schedule?.meetings||[]).flatMap(meeting=>meeting.blocks||[]).find(item=>item.id===blockId);
    if(!block)return toast('Bloco nao encontrado no cronograma publicado.');
    t.blockExecution[`${classId}::${blockId}`]={status,updatedAt:new Date().toISOString(),by:user().name||'Professor'};
    t.pendingBlocks[classId]=(t.pendingBlocks[classId]||[]).filter(item=>item.id!==blockId);
    if(status==='partial'||status==='pending')t.pendingBlocks[classId].push({...block,pendingStatus:status,updatedAt:new Date().toISOString()});
    await persist(status==='done'?'Bloco concluido.':'Pendencia academica registrada.');
    rerender();
  }
  async function completePlanned(classId,meetingId){
    const schedule=classGeneratedSchedule(classId),meeting=(schedule?.meetings||[]).find(item=>item.id===meetingId);
    if(!meeting)return toast('Encontro nao encontrado.');
    for(const block of meeting.blocks||[])ensure().blockExecution[`${classId}::${block.id}`]={status:'done',updatedAt:new Date().toISOString(),by:user().name||'Professor'};
    ensure().pendingBlocks[classId]=(ensure().pendingBlocks[classId]||[]).filter(item=>!(meeting.blocks||[]).some(block=>block.id===item.id));
    await persist('Blocos previstos marcados como concluidos.');
    rerender();
  }
  function quickStudent(studentId,classId){
    const s=(db().students||[]).find(item=>item.id===studentId),c=(db().classes||[]).find(item=>item.id===classId);
    if(!s)return toast('Aluno nao encontrado.');
    const follow=(s.followUpEntries||[]).slice(0,3),freq=attendancePercent(studentId,classId);
    window.App?.closeModal?.();
    showModal(`<div class="modal-head"><div><span class="eyebrow">Quick Student View</span><h3>${esc(s.name)}</h3></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="quick-student-facts"><span><b>Turma</b>${esc(c?.name||'--')}</span><span><b>Nivel</b>${esc(s.level||c?.level||'--')}</span><span><b>Status</b>${esc(s.situation||s.status||'--')}</span><span><b>Frequencia</b>${freq===null?fmtNumber(s.frequency||0):fmtNumber(freq)}%</span></div><section class="form-card"><h3>Ultimos acompanhamentos</h3>${follow.map(f=>`<p class="muted"><b>${esc(f.type||'Follow-up')}</b> · ${esc(f.subject||f.result||'')}</p>`).join('')||'<p class="muted">Sem acompanhamentos recentes.</p>'}</section><div class="section-actions"><button class="btn primary" onclick="PurpleTurmas.signal('${esc(s.id)}','${esc(classId)}')">Registrar acompanhamento</button><button class="btn ghost" onclick="App.openStudent('${esc(s.id)}')">Abrir cadastro</button></div>`);
  }
  const destinationsFor=type=>({APRENDIZAGEM:['pedagogico'],COMPORTAMENTO:['pedagogico'],ENGAJAMENTO:['pedagogico'],FREQUENCIA:['retencao','pedagogico'],INSATISFACAO:['retencao'],RISCO_CANCELAMENTO:['retencao'],PEDIDO_ALUNO:['retencao','pedagogico'],EVOLUCAO_POSITIVA:['pedagogico'],RELACIONAMENTO:['pedagogico']}[type]||['pedagogico']);
  function signal(studentId,classId){
    const s=(db().students||[]).find(item=>item.id===studentId),c=(db().classes||[]).find(item=>item.id===classId);
    if(!s)return toast('Aluno nao encontrado.');
    showModal(`<div class="modal-head"><div><span class="eyebrow">Sinal de acompanhamento</span><h3>${esc(s.name)}</h3><p class="helper">${esc(c?.name||'Turma')} · registre fatos observaveis e falas relevantes.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-2"><div class="field"><label>Tipo / motivo</label><select id="turmaSignalType"><option value="ENGAJAMENTO">Engajamento</option><option value="COMPORTAMENTO">Comportamento</option><option value="APRENDIZAGEM">Aprendizagem</option><option value="FREQUENCIA">Frequencia</option><option value="RELACIONAMENTO">Relacionamento / integracao</option><option value="INSATISFACAO">Insatisfacao</option><option value="RISCO_CANCELAMENTO">Risco de cancelamento</option><option value="PEDIDO_ALUNO">Pedido do aluno</option><option value="EVOLUCAO_POSITIVA">Evolucao positiva</option><option value="OUTRO">Outro</option></select></div><div class="field"><label>Prioridade</label><select id="turmaSignalPriority"><option>Rotina</option><option>Atencao</option><option>Prioridade</option></select></div></div><div class="field"><label>O que voce observou ou o aluno disse?</label><textarea id="turmaSignalDescription" class="large" placeholder="Descreva objetivamente o que aconteceu ou foi dito."></textarea><small>Evite diagnosticos ou julgamentos. Use contexto academico.</small></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.saveSignal('${esc(studentId)}','${esc(classId)}')">Salvar sinal</button></div>`);
  }
  async function saveSignal(studentId,classId){
    const s=(db().students||[]).find(item=>item.id===studentId),c=(db().classes||[]).find(item=>item.id===classId),type=$('#turmaSignalType')?.value||'OUTRO',description=$('#turmaSignalDescription')?.value.trim()||'';
    if(!description)return toast('Descreva objetivamente o que aconteceu ou foi dito.');
    const record={id:uid('sig'),studentId,classId,studentName:s?.name||'',className:c?.name||'',teacherId:c?.teacherId||'',teacherName:teacherLabel(c?.teacherId),date:today(),sessionId:attendanceKey(classId),type,priority:$('#turmaSignalPriority')?.value||'Rotina',description,destinations:destinationsFor(type),status:'new',createdAt:new Date().toISOString(),createdBy:user().name||'Professor'};
    ensure().signals.unshift(record);
    if(s){
      s.followUpEntries=Array.isArray(s.followUpEntries)?s.followUpEntries:[];
      s.followUpEntries.unshift({id:record.id,at:record.createdAt,contactDate:record.date,employee:record.createdBy,type:'Sinal de acompanhamento',result:record.priority,subject:description,source:'turmas',destinations:record.destinations,done:false});
      s.timeline=Array.isArray(s.timeline)?s.timeline:[];
      s.timeline.unshift({at:record.createdAt,title:'Sinal de acompanhamento',detail:description});
    }
    try{await persist('Acompanhamento registrado.');closeModal();rerender()}catch(error){console.error(error);toast('Erro ao salvar acompanhamento.')}
  }
  function followupInbox(){
    const sector=user().sector;
    return ensure().signals.filter(item=>user().accessScope==='all_sectors'||(item.destinations||[]).includes(sector)||can('reports.view'));
  }
  function openInbox(){ensure().activeClassId='';ensure().view='inbox';showModal(`<div class="modal-head"><div><span class="eyebrow">Acompanhamentos</span><h3>Inbox de sinais da sala</h3></div><button class="modal-close" onclick="App.closeModal()">×</button></div>${renderInboxList()}`)}
  function renderInboxList(){
    const rows=followupInbox();
    return `<div class="turma-inbox-list">${rows.map(item=>`<article><div><b>${esc(item.studentName)}</b><span>${esc(item.className)} · ${esc(item.type)} · ${esc(item.priority)}</span><p>${esc(item.description)}</p></div><select onchange="PurpleTurmas.updateSignal('${esc(item.id)}',this.value)"><option value="new" ${item.status==='new'?'selected':''}>Novo</option><option value="progress" ${item.status==='progress'?'selected':''}>Em acompanhamento</option><option value="done" ${item.status==='done'?'selected':''}>Resolvido</option></select></article>`).join('')||'<div class="empty"><p>Nenhum sinal destinado ao seu perfil.</p></div>'}</div>`;
  }
  async function updateSignal(id,status){const item=ensure().signals.find(x=>x.id===id);if(!item)return;item.status=status;item.updatedAt=new Date().toISOString();await persist('Acompanhamento atualizado.');openInbox()}
  function openLesson(id){if(window.PurpleLessonPlans?.openLesson)window.PurpleLessonPlans.openLesson(id);else toast('Lesson Plans indisponivel.')}
  function openBook(){toast('Vinculo do livro preparado para integracao com biblioteca/material.')}
  function noteClass(){toast('Registro da aula preparado para a proxima etapa.')}

  window.PurpleTurmas={render:renderModule,showClasses:()=>{ensure().view='list';rerender()},showTemplates:()=>{ensure().view='templates';ensure().activeClassId='';rerender()},open:id=>{ensure().activeClassId=id;ensure().activeTab='today';rerender()},back:()=>{ensure().activeClassId='';rerender()},tab:id=>{ensure().activeTab=id;rerender()},setAttendance,allPresent,setBlockStatus,completePlanned,quickStudent,signal,saveSignal,openInbox,updateSignal,openLesson,openBook,noteClass,openTemplates,openTemplate,addTemplateBlock:templateId=>templateBlockModal(templateId),editTemplateBlock:templateBlockModal,saveTemplateBlock,moveTemplateBlock,removeTemplateBlock,publishTemplateVersion,previewSchedule,showSchedulePreview,publishSchedule,insertLesson,saveInsertedLesson,repeatMeeting,cancelMeeting,_test:{ensure,scheduleTemplates,scheduleTemplate,groupedTemplateBlocks,generateSchedulePreview,progressFor,attendancePercent,recalcSchedule}};
})();
