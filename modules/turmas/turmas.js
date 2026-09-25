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
  const teacherLabel=id=>(db().teachers||[]).find(t=>t.id===id)?.name||'Professor não vinculado';
  const bookLabel=id=>(db().inventoryItems||[]).find(b=>(b.id||b.supabaseId)===id)?.name||(db().lessonPlansWorkspace?.courses||[]).find(c=>c.id===id)?.name||'Livro não vinculado';
  function studentMatchesClass(student={},klass={}){
    if(String(student.classId||'')===String(klass.id||''))return true;
    const linkedIds=new Set([...(klass.studentIds||[]),...(klass.students||[]).map(item=>typeof item==='string'?item:item?.id)].filter(Boolean).map(String));
    if(linkedIds.has(String(student.id)))return true;
    const classNames=[klass.name,klass.title,klass.displayName].map(norm).filter(Boolean);
    const studentClasses=[student.className,student.turma,student.group,student.groupName,student.class,student.courseClass].map(norm).filter(Boolean);
    return classNames.length&&studentClasses.some(value=>classNames.includes(value));
  }
  function classStudents(classId){
    const klass=(db().classes||[]).find(c=>c.id===classId)||{};
    return (db().students||[]).filter(s=>studentMatchesClass(s,klass)&&String(s.situation||s.status||'Ativo').toLowerCase()!=='inativo');
  }
  const performanceGradeTypes=()=>['Participation','Speaking','Listening','Writing','Reading','Midterm Exam','Final Term'];
  const homeworkGradeTypes=()=>['Homework'];
  const gradeTypes=()=>[...performanceGradeTypes(),...homeworkGradeTypes()];
  function normalizeGradeScore(value){
    if(value===''||value===null||value===undefined)return null;
    const parsed=Number(String(value).replace(',','.'));
    if(!Number.isFinite(parsed))return null;
    return parsed<=10?parsed*10:parsed;
  }
  function gradeValue(rows,type){
    const matches=rows.filter(row=>norm(row.type)===norm(type)&&Number.isFinite(Number(row.score)));
    if(!matches.length)return null;
    return matches.reduce((sum,row)=>sum+Number(row.score),0)/matches.length;
  }
  function studentClassGradeSummary(studentId,classId){
    const c=(db().classes||[]).find(item=>item.id===classId)||{};
    const rows=(c.gradeEntries||[]).filter(row=>row.studentId===studentId);
    const weighted=performanceGradeTypes().map(type=>({type,score:gradeValue(rows,type)}));
    const homeworkRows=rows.filter(row=>norm(row.type).includes('HOMEWORK')&&Number.isFinite(Number(row.score)));
    const homeworkAverage=homeworkRows.length?homeworkRows.reduce((sum,row)=>sum+Number(row.score),0)/homeworkRows.length:null;
    const averageItems=[...weighted.map(item=>item.score),homeworkAverage].filter(value=>Number.isFinite(Number(value)));
    const finalAverage=averageItems.length?averageItems.reduce((sum,value)=>sum+Number(value),0)/averageItems.length:null;
    return {rows,weighted,finalAverage,homeworkAverage,status:finalAverage===null?'Aguardando':finalAverage>=70?'Aprovado':'Reprovado'};
  }
  const classBlocks=c=>Array.isArray(c.scheduleBlocks)&&c.scheduleBlocks.length?c.scheduleBlocks:String(c.schedule||'').split('•').map(item=>({day:item.trim().split(/\s+/)[0]||'',time:item.trim().replace(/^\S+\s*/,'')||'',room:c.room||''})).filter(b=>b.day||b.time);
  const classStatus=c=>norm(c.status||'Ativa').toLowerCase();
  const isArchivedClass=c=>['arquivada','arquivado','concluida','concluido','inativa','inativo'].includes(classStatus(c));
  const isActiveClass=c=>!isArchivedClass(c);
  const dayKey=(date=new Date())=>String(date.toLocaleDateString('pt-BR',{weekday:'long'})).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const lessonWorkspace=()=>db().lessonPlansWorkspace||{};
  const WEEKDAY_INDEX={DOMINGO:0,SEGUNDA:1,TERCA:2,QUARTA:3,QUINTA:4,SEXTA:5,SABADO:6};
  const BLOCK_TYPES=['AULA','REVIEW','SKILLCHECK','PROJECT','ASSESSMENT','MIDTERM','FINAL TEST','EXTRA','OUTRO','LESSON','PRESENTATION','PRACTICE','EXTRA ACTIVITY','CONVERSATION','OTHER'];
  const DISCOVER_TEMPLATE_ID='discover-1-1-oficial-v1';
  const CONNECT_TEMPLATE_ID='connect-1-2-oficial-v1';
  const EXPLORE_TEMPLATE_ID='explore-oficial-v1';
  const CHANGE_TEMPLATE_ID='change-oficial-v1';
  const INSPIRE_TEMPLATE_ID='inspire-oficial-v1';
  const TRAVEL_TEMPLATE_ID='travel-oficial-v1';
  const YOUNG_LEARNERS_3_TEMPLATE_ID='young-learners-3-oficial-v1';
  const SUPER_KIDS_STARTER_TEMPLATE_ID='super-kids-starter-oficial-v1';
  const SUPER_KIDS_1_TEMPLATE_ID='super-kids-1-oficial-v1';
  const SUPER_KIDS_2_TEMPLATE_ID='super-kids-2-oficial-v1';
  const SUPER_KIDS_3_TEMPLATE_ID='super-kids-3-oficial-v1';
  const SUPER_KIDS_4_TEMPLATE_ID='super-kids-4-oficial-v1';
  const DISCOVER_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'8-10','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [4,2,'8-10','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [5,3,'10-12','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [6,3,'10-12','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [7,4,'18-24','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [8,4,'18-24','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [9,5,'30-40','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [10,5,'30-40','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [11,6,'46-52','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [12,6,'46-52','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [13,7,'58-62','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [14,7,'58-62','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [15,8,'64-68','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [16,8,'64-68','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [17,9,'74-78','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [18,9,'74-78','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [19,10,'78-84','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [20,10,'78-84','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [21,11,'Practice','Conversation Class','CONVERSATION CLASS','Oral practice','Speaking'],
    [22,11,'Practice','Conversation Class','CONVERSATION CLASS','Oral practice','Speaking'],
    [23,12,'92-97','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [24,12,'92-97','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [25,13,'102-106','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [26,13,'102-106','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [27,14,'112-120','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [28,14,'112-120','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [29,15,'126-134','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [30,15,'126-134','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [31,16,'140-146','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [32,16,'140-146','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [33,17,'152-158','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [34,17,'152-158','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [35,18,'164-168','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [36,18,'168-171','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [37,19,'Practice','Conversation Class','CONVERSATION CLASS','Oral practice','Speaking'],
    [38,19,'Practice','Conversation Class','CONVERSATION CLASS','Oral practice','Speaking'],
    [39,20,'Final Review','Review Final Test','REVIEW FINAL TEST','Revision','Consolidation + revision'],
    [40,20,'Final Review','Review Final Test','REVIEW FINAL TEST','Revision','Consolidation + revision'],
    [41,21,'Final Exam','Final Test','FINAL TEST','Checkpoint','Oral practice + checkpoint'],
    [42,21,'Final Exam','Final Test','FINAL TEST','Checkpoint','Oral practice + checkpoint']
  ];
  const CONNECT_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'10','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [4,2,'12','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [5,3,'14','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [6,3,'16','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [7,4,'22-24','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [8,4,'26','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [9,5,'28-30','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [10,5,'36-38','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [11,6,'40','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [12,6,'40,42-44','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [13,7,'50-52','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [14,7,'54-56','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [15,8,'62-64','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [16,8,'66-68','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [17,9,'74,76-78','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [18,9,'78-80','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [19,10,'Practice','Review','REVIEW','Speaking Practice','Oral practice + checkpoint'],
    [20,10,'Practice','Review','REVIEW','Speaking Practice','Oral practice + checkpoint'],
    [21,11,'88-92','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [22,11,'92','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [23,12,'98-100','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [24,12,'100-102','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [25,13,'110-112','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [26,13,'114-116','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [27,14,'122-124','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [28,14,'126-128','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [29,15,'134-136','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [30,15,'136-140','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [31,16,'146-150','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [32,16,'150-152','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [33,17,'158-162','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [34,17,'158-162','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [35,18,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [36,18,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [37,19,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [38,19,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [39,20,'','Skillcheck Review','SKILLCHECK REVIEW','Regular Class','Pages + guided practice'],
    [40,20,'','Skillcheck Review','SKILLCHECK REVIEW','Regular Class','Pages + guided practice'],
    [41,21,'','Skillcheck','SKILLCHECK','Regular Class','Pages + guided practice'],
    [42,21,'','Skillcheck','SKILLCHECK','Regular Class','Pages + guided practice']
  ];
  const EXPLORE_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'10-14','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [4,2,'16-18','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [5,3,'24-26','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [6,3,'26-28','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [7,4,'34-36','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [8,4,'38-40','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [9,5,'46-48','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [10,5,'50-52','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [11,6,'58-60','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [12,6,'60-62','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [13,7,'68-72','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [14,7,'68-72','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [15,8,'72-74','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [16,8,'72-74','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [17,9,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [18,9,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [19,10,'82-83','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [20,10,'84-88','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [21,11,'94','Unit 8','Unit 8','Regular Class','Oral practice'],
    [22,11,'96-98','Unit 8','Unit 8','Regular Class','Oral practice'],
    [23,12,'100','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [24,12,'106','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [25,13,'108','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [26,13,'108-110','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [27,14,'116-118','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [28,14,'118','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [29,15,'120','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [30,15,'126-128','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [31,16,'128','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [32,16,'130-132','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [33,17,'138-140','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [34,17,'142','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [35,18,'148-150','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [36,18,'152-154','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [37,19,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [38,19,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [39,20,'Final Review','Review Final Test','REVIEW FINAL TEST','Revision','Consolidation + revision'],
    [40,20,'Final Review','Review Final Test','REVIEW FINAL TEST','Revision','Consolidation + revision'],
    [41,21,'Final Exam','Final Test','FINAL TEST','Checkpoint','Oral practice + checkpoint'],
    [42,21,'Final Exam','Final Test','FINAL TEST','Checkpoint','Oral practice + checkpoint']
  ];
  const CHANGE_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'6-13','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [4,2,'6-13','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [5,3,'14-21','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [6,3,'14-21','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [7,4,'22-45','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [8,4,'22-45','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [9,5,'22-45','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [10,5,'22-45','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [11,6,'46-71','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [12,6,'46-71','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [13,7,'46-71','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [14,7,'72-95','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [15,8,'72-95','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [16,8,'72-95','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [17,9,'96-117','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [18,9,'96-117','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [19,10,'96-117','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [20,10,'118','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [21,11,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [22,11,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [23,12,'120-145','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [24,12,'120-145','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [25,13,'120-145','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [26,13,'146-167','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [27,14,'146-167','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [28,14,'146-167','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [29,15,'168-189','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [30,15,'168-189','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [31,16,'190-211','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [32,16,'190-211','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [33,17,'212-231','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [34,17,'212-231','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [35,18,'232-255','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [36,18,'232-255','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [37,19,'256-263','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [38,19,'256-263','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [39,20,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [40,20,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [41,21,'Final Review','Review Final Test','REVIEW FINAL TEST','Final Review','Consolidation + revision'],
    [42,21,'Final Review','Review Final Test','REVIEW FINAL TEST','Final Review','Consolidation + revision'],
    [43,22,'Final Exam','Final Test','FINAL TEST','Final Exam','Oral practice + checkpoint'],
    [44,22,'Final Exam','Final Test','FINAL TEST','Final Exam','Oral practice + checkpoint']
  ];
  const INSPIRE_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'10-12','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [4,2,'14-20','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [5,3,'26-28','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [6,3,'30-36','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [7,4,'42-48','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [8,4,'50-56','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [9,5,'62-66','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [10,5,'68-74','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [11,6,'80-84','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [12,6,'86-94','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [13,7,'100-102','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [14,7,'104-112','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [15,8,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Pages + guided practice'],
    [16,8,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Pages + guided practice'],
    [17,9,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Pages + guided practice'],
    [18,9,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Pages + guided practice'],
    [19,10,'120-122','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [20,10,'122-128','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [21,11,'130-134','Unit 7','Unit 7','Regular Class','Oral practice'],
    [22,11,'136','Unit 7','Unit 7','Regular Class','Oral practice'],
    [23,12,'142','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [24,12,'144-146','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [25,13,'148-154','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [26,13,'160-162','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [27,14,'164-170','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [28,14,'176-178','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [29,15,'178-186','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [30,15,'192','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [31,16,'194-198','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [32,16,'200-204','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [33,17,'210-214','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [34,17,'216-222','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [35,18,'228-232','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [36,18,'234-238','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [37,19,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [38,19,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [39,20,'Final Review','Review Final Test','REVIEW FINAL TEST','Final Review','Consolidation + revision'],
    [40,20,'Final Review','Review Final Test','REVIEW FINAL TEST','Final Review','Consolidation + revision'],
    [41,21,'Final Exam','Final Test','FINAL TEST','Final Exam','Oral practice + checkpoint'],
    [42,21,'Final Exam','Final Test','FINAL TEST','Final Exam','Oral practice + checkpoint']
  ];
  const TRAVEL_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'4-12','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [4,2,'14-20','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [5,3,'22-28','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [6,3,'30-36','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [7,4,'38-44','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [8,4,'38-44','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [9,5,'46-54','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [10,5,'46-54','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [11,6,'56-62','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [12,6,'56-62','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [13,7,'64-70','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [14,7,'64-70','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [15,8,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [16,8,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [17,9,'72-76','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [18,9,'72-76','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [19,10,'78-84','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [20,10,'78-84','Unit 10','Unit 10','Regular Class','Pages + guided practice'],
    [21,11,'86-94','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [22,11,'86-94','Unit 11','Unit 11','Regular Class','Pages + guided practice'],
    [23,12,'96-102','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [24,12,'96-102','Unit 12','Unit 12','Regular Class','Pages + guided practice'],
    [25,13,'104-110','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [26,13,'104-110','Unit 13','Unit 13','Regular Class','Pages + guided practice'],
    [27,14,'112-118','Unit 14','Unit 14','Regular Class','Pages + guided practice'],
    [28,14,'112-118','Unit 14','Unit 14','Regular Class','Pages + guided practice'],
    [29,15,'120-126','Unit 15','Unit 15','Regular Class','Pages + guided practice'],
    [30,15,'120-126','Unit 15','Unit 15','Regular Class','Pages + guided practice'],
    [31,16,'128-134','Unit 16','Unit 16','Regular Class','Pages + guided practice'],
    [32,16,'136-142','Unit 17','Unit 17','Regular Class','Pages + guided practice'],
    [33,17,'144-150','Unit 18','Unit 18','Regular Class','Pages + guided practice'],
    [34,17,'144-150','Unit 18','Unit 18','Regular Class','Pages + guided practice'],
    [35,18,'152-160','Unit 19','Unit 19','Regular Class','Pages + guided practice'],
    [36,18,'152-160','Unit 19','Unit 19','Regular Class','Pages + guided practice'],
    [37,19,'162-168','Unit 20','Unit 20','Regular Class','Pages + guided practice'],
    [38,19,'162-168','Unit 20','Unit 20','Regular Class','Pages + guided practice'],
    [39,20,'170-176','Unit 21','Unit 21','Regular Class','Pages + guided practice'],
    [40,20,'170-176','Unit 21','Unit 21','Regular Class','Pages + guided practice'],
    [41,21,'178-184','Unit 22','Unit 22','Regular Class','Pages + guided practice'],
    [42,21,'186-192','Unit 23','Unit 23','Regular Class','Pages + guided practice']
  ];
  const YOUNG_LEARNERS_3_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'07-12','UNIT 1','UNIT 1','Regular Class','Pages + guided practice'],
    [4,2,'12-17','UNIT 1','UNIT 1','Regular Class','Pages + guided practice'],
    [5,3,'21-26','UNIT 2','UNIT 2','Regular Class','Pages + guided practice'],
    [6,3,'26-31','UNIT 2','UNIT 2','Regular Class','Pages + guided practice'],
    [7,4,'35-40','UNIT 3','UNIT 3','Regular Class','Pages + guided practice'],
    [8,4,'40-45','UNIT 3','UNIT 3','Regular Class','Pages + guided practice'],
    [9,5,'49-54','UNIT 4','UNIT 4','Regular Class','Pages + guided practice'],
    [10,5,'54-59','UNIT 4','UNIT 4','Regular Class','Pages + guided practice'],
    [11,6,'63-68','UNIT 5','UNIT 5','Regular Class','Pages + guided practice'],
    [12,6,'68-73','UNIT 5','UNIT 5','Regular Class','Pages + guided practice'],
    [13,7,'77-82','UNIT 6','UNIT 6','Regular Class','Pages + guided practice'],
    [14,7,'82-87','UNIT 6','UNIT 6','Regular Class','Pages + guided practice'],
    [15,8,'91-96','UNIT 7','UNIT 7','Regular Class','Pages + guided practice'],
    [16,8,'96-101','UNIT 7','UNIT 7','Regular Class','Pages + guided practice'],
    [17,9,'105-110','UNIT 8','UNIT 8','Regular Class','Pages + guided practice'],
    [18,9,'110-115','UNIT 8','UNIT 8','Regular Class','Pages + guided practice'],
    [19,10,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [20,10,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [21,11,'119-124','UNIT 9','UNIT 9','Regular Class','Pages + guided practice'],
    [22,11,'124-129','UNIT 9','UNIT 9','Regular Class','Pages + guided practice'],
    [23,12,'147-152','UNIT 10','UNIT 10','Regular Class','Pages + guided practice'],
    [24,12,'138-143','UNIT 10','UNIT 10','Regular Class','Pages + guided practice'],
    [25,13,'147-152','UNIT 11','UNIT 11','Regular Class','Pages + guided practice'],
    [26,13,'152-157','UNIT 11','UNIT 11','Regular Class','Pages + guided practice'],
    [27,14,'161-166','UNIT 12','UNIT 12','Regular Class','Pages + guided practice'],
    [28,14,'166-171','UNIT 12','UNIT 12','Regular Class','Pages + guided practice'],
    [29,15,'175-180','UNIT 13','UNIT 13','Regular Class','Pages + guided practice'],
    [30,15,'180-185','UNIT 13','UNIT 13','Regular Class','Pages + guided practice'],
    [31,16,'189-194','UNIT 14','UNIT 14','Regular Class','Pages + guided practice'],
    [32,16,'194-199','UNIT 14','UNIT 14','Regular Class','Pages + guided practice'],
    [33,17,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [34,17,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice + checkpoint'],
    [35,18,'Review','Skillcheck Review','SKILLCHECK REVIEW','Regular Class','Pages + guided practice'],
    [36,18,'Review','Skillcheck Review','SKILLCHECK REVIEW','Regular Class','Pages + guided practice'],
    [37,19,'Skillcheck','Skillcheck','SKILLCHECK','Regular Class','Pages + guided practice'],
    [38,19,'Skillcheck','Skillcheck','SKILLCHECK','Regular Class','Pages + guided practice']
  ];
  const SUPER_KIDS_STARTER_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'4-9/ 111-116','Say Hello','Say Hello','Regular Class','Pages + guided practice'],
    [4,2,'10-15/ 117-121','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [5,3,'16-19','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [6,3,'122-126','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [7,4,'20-25','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [8,4,'127-131','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [9,5,'26-29','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [10,5,'132-136','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [11,6,'30-33','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [12,6,'137-141','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [13,7,'34-39','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [14,7,'142-146','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [15,8,'40-43','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [16,8,'147-151','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [17,9,'44-49','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [18,9,'152-156','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [19,10,'50-53','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [20,10,'157-161','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [21,11,'54-59','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [22,11,'162-166','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [23,12,'Exam','Project I','PROJECT I','Exam','Oral practice + checkpoint'],
    [24,12,'Exam','Project I','PROJECT I','Exam','Oral practice + checkpoint'],
    [25,13,'60-63','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [26,13,'167-171','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [27,14,'64-69','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [28,14,'172-176','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [29,15,'70-73','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [30,15,'177-181','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [31,16,'74-79','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [32,16,'182-186','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [33,17,'80-83','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [34,17,'187-191','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [35,18,'84-89','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [36,18,'192-196','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [37,19,'90-93','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [38,19,'197-201','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [39,20,'94-99','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [40,20,'202-206','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [41,21,'Final Exam','Project II','PROJECT II','Final Exam','Oral practice + checkpoint'],
    [42,21,'Final Exam','Project II','PROJECT II','Final Exam','Oral practice + checkpoint']
  ];
  const SUPER_KIDS_1_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'4-9','Friends','Friends','Regular Class','Pages + guided practice'],
    [3,2,'10-16','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [4,2,'17-21','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [5,3,'22-24','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [6,3,'25-27','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [7,4,'28-30','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [8,4,'31-33','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [9,5,'34-36','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [10,5,'37-39','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [11,6,'40-42','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [12,6,'43-45','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [13,7,'46-48','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [14,7,'49-51','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [15,8,'52-54','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [16,8,'55-57','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [17,9,'58-60','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [18,9,'61-63','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [19,10,'64-66','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [20,10,'67-69','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [21,11,'Exam','Project I','PROJECT I','Exam','Oral practice + checkpoint'],
    [22,11,'Exam','Project I','PROJECT I','Exam','Oral practice + checkpoint'],
    [23,12,'70-72','Unit 6','Unit 6','Exam','Oral practice + checkpoint'],
    [24,12,'73-75','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [25,13,'76-78','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [26,13,'79-81','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [27,14,'82-84','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [28,14,'85-87','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [29,15,'88-90','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [30,15,'91-93','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [31,16,'94-96','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [32,16,'97-99','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [33,17,'100-102','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [34,17,'103-105','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [35,18,'106-108','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [36,18,'109-111','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [37,19,'112-114','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [38,19,'115-117','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [39,20,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [40,20,'Practice','Conversation Class','CONVERSATION CLASS','Speaking Practice','Oral practice'],
    [41,21,'Final Exam','Project II','PROJECT II','Final Exam','Oral practice + checkpoint'],
    [42,21,'Final Exam','Project II','PROJECT II','Final Exam','Oral practice + checkpoint']
  ];
  const SUPER_KIDS_2_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'4-6','Back to school','Back to school','Regular Class','Pages + guided practice'],
    [4,2,'7-9','Back to school','Back to school','Regular Class','Pages + guided practice'],
    [5,3,'10-13','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [6,3,'14-16','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [7,4,'17-19','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [8,4,'20-21','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [9,5,'22-24','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [10,5,'25-27','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [11,6,'28-30','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [12,6,'31-33','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [13,7,'34-36','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [14,7,'37-39','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [15,8,'40-42','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [16,8,'43-45','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [17,9,'46-48','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [18,9,'49-51','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [19,10,'52-54','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [20,10,'55-57','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [21,11,'58-60','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [22,11,'61-63','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [23,12,'64-66','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [24,12,'67-69','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [25,13,'Exam','Project I','PROJECT I','Exam','Oral practice + checkpoint'],
    [26,13,'Exam','Project I','PROJECT I','Exam','Oral practice + checkpoint'],
    [27,14,'70-72','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [28,14,'73-75','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [29,15,'76-78','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [30,15,'79-81','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [31,16,'82-84','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [32,16,'85-87','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [33,17,'88-90','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [34,17,'91-93','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [35,18,'94-96','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [36,18,'97-99','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [37,19,'100-102','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [38,19,'103-105','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [39,20,'106-108','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [40,20,'109-111','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [41,21,'112-114','Unit 9','Unit 9','Final Exam','Pages + guided practice'],
    [42,21,'115-117','Unit 9','Unit 9','Final Exam','Pages + guided practice'],
    [43,22,'Exam','Project II','PROJECT II','Exam','Oral practice + checkpoint'],
    [44,22,'Exam','Project II','PROJECT II','Exam','Oral practice + checkpoint']
  ];
  const SUPER_KIDS_3_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'4-6','Meet the explorers','Meet the explorers','Regular Class','Pages + guided practice'],
    [4,2,'7-9','Meet the explorers','Meet the explorers','Regular Class','Pages + guided practice'],
    [5,3,'10-13','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [6,3,'14-16','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [7,4,'17-19','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [8,4,'20-21','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [9,5,'22-24','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [10,5,'25-27','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [11,6,'28-30','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [12,6,'31-33','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [13,7,'34-36','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [14,7,'37-39','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [15,8,'40-42','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [16,8,'43-45','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [17,9,'46-48','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [18,9,'49-51','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [19,10,'52-54','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [20,10,'55-57','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [21,11,'58-60','Unit 5','Unit 5','Exam','Oral practice + checkpoint'],
    [22,11,'61-63','Unit 5','Unit 5','Exam','Oral practice + checkpoint'],
    [23,12,'64-66','Unit 5','Unit 5','Exam','Oral practice + checkpoint'],
    [24,12,'67-69','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [25,13,'Project I','Project I','PROJECT I','Regular Class','Pages + guided practice'],
    [26,13,'Project I','Project I','PROJECT I','Regular Class','Pages + guided practice'],
    [27,14,'70-72','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [28,14,'73-75','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [29,15,'76-78','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [30,15,'79-81','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [31,16,'82-84','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [32,16,'85-87','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [33,17,'88-90','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [34,17,'91-93','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [35,18,'94-96','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [36,18,'97-99','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [37,19,'100-102','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [38,19,'103-105','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [39,20,'106-108','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [40,20,'109-111','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [41,21,'112-114','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [42,21,'115-117','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [43,22,'Final Exam','Final Exam','FINAL EXAM','Final Exam','Oral practice + checkpoint'],
    [44,22,'Project II','Project II','PROJECT II','Final Exam','Oral practice + checkpoint']
  ];
  const SUPER_KIDS_4_OFFICIAL_BLOCKS=[
    [1,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [2,1,'','Welcoming Class','Welcoming Class','Regular Class','Pages + guided practice'],
    [3,2,'4-9','Well done','Well done','Regular Class','Pages + guided practice'],
    [4,2,'128-131','Well done','Well done','Regular Class','Pages + guided practice'],
    [5,3,'10-14','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [6,3,'136-140','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [7,4,'15-21','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [8,4,'141-144','Unit 1','Unit 1','Regular Class','Pages + guided practice'],
    [9,5,'22-28','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [10,5,'148-151','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [11,6,'29-33','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [12,6,'152-155','Unit 2','Unit 2','Regular Class','Pages + guided practice'],
    [13,7,'34-39','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [14,7,'160-165','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [15,8,'40-44','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [16,8,'166-169','Unit 3','Unit 3','Regular Class','Pages + guided practice'],
    [17,9,'46-51','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [18,9,'172-176','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [19,10,'52-57','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [20,10,'177-180','Unit 4','Unit 4','Regular Class','Pages + guided practice'],
    [21,11,'58-63','Unit 5','Unit 5','Exam','Oral practice + checkpoint'],
    [22,11,'184-187','Unit 5','Unit 5','Exam','Oral practice + checkpoint'],
    [23,12,'64-69','Unit 5','Unit 5','Exam','Oral practice + checkpoint'],
    [24,12,'188-191','Unit 5','Unit 5','Regular Class','Pages + guided practice'],
    [25,13,'Project I','Project I','PROJECT I','Regular Class','Pages + guided practice'],
    [26,13,'Project I','Project I','PROJECT I','Regular Class','Pages + guided practice'],
    [27,14,'70-75','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [28,14,'196-199','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [29,15,'76-81','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [30,15,'200-204','Unit 6','Unit 6','Regular Class','Pages + guided practice'],
    [31,16,'82-87','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [32,16,'208-211','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [33,17,'88-93','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [34,17,'212-215','Unit 7','Unit 7','Regular Class','Pages + guided practice'],
    [35,18,'94-100','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [36,18,'220-223','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [37,19,'101-105','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [38,19,'224-227','Unit 8','Unit 8','Regular Class','Pages + guided practice'],
    [39,20,'106-111','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [40,20,'232-235','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [41,21,'112-118','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [42,21,'236-239','Unit 9','Unit 9','Regular Class','Pages + guided practice'],
    [43,22,'Final Exam','Final Exam','FINAL EXAM','Final Exam','Oral practice + checkpoint'],
    [44,22,'Project II','Project II','PROJECT II','Final Exam','Oral practice + checkpoint']
  ];

  function ensure(){
    const settings=db().settings=db().settings||{};
    const t=settings.turmas=settings.turmas||{};
    t.view=t.view||'list';
    t.activeClassId=t.activeClassId||'';
    t.activeTab=t.activeTab==='today'?'schedule':(t.activeTab||'schedule');
    t.activeMeetingId=t.activeMeetingId||'';
    t.classFilter=t.classFilter||'active';
    t.attendance=t.attendance||{};
    t.signals=t.signals||[];
    t.inboxTab=t.inboxTab||'new';
    t.scheduleTemplates=Array.isArray(t.scheduleTemplates)?t.scheduleTemplates:[];
    t.generatedSchedules=t.generatedSchedules||{};
    t.blockExecution=t.blockExecution||{};
    t.pendingBlocks=t.pendingBlocks||{};
    t.meetingNotes=t.meetingNotes||{};
    t.templateOverrides=t.templateOverrides||{};
    t.attendanceRules=t.attendanceRules||{present:1,absent:0,justified:0,replacement:1,warningPercent:75};
    seedScheduleTemplates(t);
    return t;
  }

  function officialScheduleTemplate(t,id,config){
    const override=t.templateOverrides?.[id]||{};
    return {
      id,
      stableKey:config.stableKey,
      title:override.title||config.title,
      book:override.book||config.book,
      source:config.source,
      version:1,
      status:'published',
      createdAt:'2026-09-22T00:00:00.000Z',
      publishedAt:'2026-09-22T00:00:00.000Z',
      groupingMode:'encounterOrder',
      notes:override.notes||config.notes,
      blocks:config.blocks.map(([order,encounterOrder,pages,unit,title,type,content])=>({id:`${config.blockPrefix}-b${String(order).padStart(2,'0')}`,order,encounterOrder,unit,title,topic:title,bookPages:pages,content,activities:splitActivities(content),type,estimatedDuration:'1 HA',lessonPlanRef:'',resourceRefs:[],notes:''}))
    };
  }

  function seedScheduleTemplates(t=ensure()){
    t.scheduleTemplates=[
      officialScheduleTemplate(t,DISCOVER_TEMPLATE_ID,{stableKey:'discover-1-1-oficial',title:'DISCOVER 1.1 - Modelo Oficial',book:'DISCOVER 1.1',source:'DISCOVER ATUALIZADO - MODELO DISCOVER.pdf',notes:'Modelo oficial Discover atualizado. Base sem datas fixas: 42 horas-aula em 21 encontros, com páginas, unidade/aula, tipo e descrição.',blockPrefix:'discover-oficial',blocks:DISCOVER_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,CONNECT_TEMPLATE_ID,{stableKey:'connect-1-2-oficial',title:'CONNECT 1.2 - Modelo Oficial',book:'CONNECT 1.2',source:'CONNECT ATUALIZADO - CONNECT 1.2 | QUINTA 19H.pdf',notes:'Modelo oficial Connect atualizado. Base sem datas fixas: 42 horas-aula em 21 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'connect-oficial',blocks:CONNECT_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,EXPLORE_TEMPLATE_ID,{stableKey:'explore-oficial',title:'EXPLORE - Modelo Oficial',book:'EXPLORE',source:'EXPLORE ATUALIZADO - MODELO EXPLORE.pdf',notes:'Modelo oficial Explore atualizado. Base sem datas fixas: 42 horas-aula em 21 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'explore-oficial',blocks:EXPLORE_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,CHANGE_TEMPLATE_ID,{stableKey:'change-oficial',title:'CHANGE - Modelo Oficial',book:'CHANGE',source:'CHANGE ATUALIZADO - MODELO CHANGE.pdf',notes:'Modelo oficial Change atualizado. Base sem datas fixas: 44 horas-aula em 22 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'change-oficial',blocks:CHANGE_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,INSPIRE_TEMPLATE_ID,{stableKey:'inspire-oficial',title:'INSPIRE - Modelo Oficial',book:'INSPIRE',source:'INSPIRE ATUALIZADO - MODELO INSPIRE.pdf',notes:'Modelo oficial Inspire atualizado. Base sem datas fixas: 42 horas-aula em 21 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'inspire-oficial',blocks:INSPIRE_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,TRAVEL_TEMPLATE_ID,{stableKey:'travel-oficial',title:'TRAVEL - Modelo Oficial',book:'TRAVEL',source:'TRAVEL ATUALIZADO - MODELO TRAVEL.pdf',notes:'Modelo oficial Travel atualizado. Base sem datas fixas: 42 horas-aula em 21 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'travel-oficial',blocks:TRAVEL_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,YOUNG_LEARNERS_3_TEMPLATE_ID,{stableKey:'young-learners-3-oficial',title:'YOUNG LEARNERS 3 - Modelo Oficial',book:'YOUNG LEARNERS 3',source:'YOUNG LEARNERS 3 ATUALIZADO - MODELO Y.L .pdf',notes:'Modelo oficial Young Learners 3 atualizado. Base sem datas fixas: 38 horas-aula em 19 encontros extraidos da tabela, com paginas, unidade/aula, tipo e foco.',blockPrefix:'yl3-oficial',blocks:YOUNG_LEARNERS_3_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,SUPER_KIDS_STARTER_TEMPLATE_ID,{stableKey:'super-kids-starter-oficial',title:'SUPER KIDS STARTER - Modelo Oficial',book:'SUPER KIDS STARTER',source:'SUPER KIDS STARTER - MODELO S.K STARTER.pdf',notes:'Modelo oficial Super Kids Starter atualizado. Base sem datas fixas: 42 horas-aula em 21 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'sk-starter-oficial',blocks:SUPER_KIDS_STARTER_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,SUPER_KIDS_1_TEMPLATE_ID,{stableKey:'super-kids-1-oficial',title:'SUPER KIDS 1 - Modelo Oficial',book:'SUPER KIDS 1',source:'Super Kids 1 Atualizado - MODELO SUPER KIDS 1.pdf',notes:'Modelo oficial Super Kids 1 atualizado. Base sem datas fixas: 42 horas-aula em 21 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'sk1-oficial',blocks:SUPER_KIDS_1_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,SUPER_KIDS_2_TEMPLATE_ID,{stableKey:'super-kids-2-oficial',title:'SUPER KIDS 2 - Modelo Oficial',book:'SUPER KIDS 2',source:'SUPER KIDS 2 - Modelo SK 2.pdf',notes:'Modelo oficial Super Kids 2 atualizado. Base sem datas fixas: 44 horas-aula em 22 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'sk2-oficial',blocks:SUPER_KIDS_2_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,SUPER_KIDS_3_TEMPLATE_ID,{stableKey:'super-kids-3-oficial',title:'SUPER KIDS 3 - Modelo Oficial',book:'SUPER KIDS 3',source:'Super Kids 3 atualizado - MODELO SUPER KIDS 3.pdf',notes:'Modelo oficial Super Kids 3 atualizado. Base sem datas fixas: 44 horas-aula em 22 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'sk3-oficial',blocks:SUPER_KIDS_3_OFFICIAL_BLOCKS}),
      officialScheduleTemplate(t,SUPER_KIDS_4_TEMPLATE_ID,{stableKey:'super-kids-4-oficial',title:'SUPER KIDS 4 - Modelo Oficial',book:'SUPER KIDS 4',source:'Super Kids 4 Atualizado - MODELO SUPER KIDS 4.pdf',notes:'Modelo oficial Super Kids 4 atualizado. Base sem datas fixas: 44 horas-aula em 22 encontros, com páginas, unidade/aula, tipo e foco.',blockPrefix:'sk4-oficial',blocks:SUPER_KIDS_4_OFFICIAL_BLOCKS})
    ];
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
  function syncHolidayList(list){
    const normalized=(list||[]).filter(item=>item?.date).map(item=>({id:item.id||uid('hol'),date:item.date,name:norm(item.name||'FERIADO'),scope:norm(item.scope||'NACIONAL')}));
    db().settings=db().settings||{};
    db().settings.classHolidays=normalized;
    db().classHolidays=normalized;
    return normalized;
  }
  function recessList(c){return Array.isArray(c.recessPeriods)?c.recessPeriods.filter(item=>item?.start||item?.end):[]}
  function previewBlockedDates(c,preview){
    const start=preview?.startDate||c.startDate||today(),end=preview?.projectedEndDate||start;
    const holidays=holidayList().filter(item=>item.date>=start&&item.date<=end).map(item=>({date:item.date,reason:`Feriado: ${item.name||'sem aula'}`}));
    const recesses=recessList(c).map(period=>({start:period.start||'',end:period.end||'',reason:`Recesso: ${fmtDate(period.start)} a ${fmtDate(period.end)}`}));
    return {holidays,recesses};
  }
  function blockedReason(dateISO,c){
    const holiday=holidayList().find(item=>item.date===dateISO);
    if(holiday)return `Feriado: ${holiday.name||'sem aula'}`;
    const recess=recessList(c).find(period=>(!period.start||dateISO>=period.start)&&(!period.end||dateISO<=period.end));
    if(recess)return `Recesso: ${fmtDate(recess.start)} a ${fmtDate(recess.end)}`;
    return '';
  }
  function scheduleBlockedReason(dateISO,c,schedule=null){
    const base=blockedReason(dateISO,c);
    if(base)return base;
    const skipped=(schedule?.skippedDates||schedule?.postponedDates||[]).find(item=>(typeof item==='string'?item:item?.date)===dateISO);
    return skipped?`Aula movida: ${typeof skipped==='string'?'sem aula nesta data':(skipped.reason||'sem aula nesta data')}`:'';
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
  function meetingDone(c,meeting){const blocks=meeting.blocks||[];return Boolean(blocks.length)&&blocks.every(block=>executionFor(c,block.id).status==='done')}
  function meetingStatus(c,meeting){const blocks=meeting.blocks||[],done=blocks.filter(block=>executionFor(c,block.id).status==='done').length;if(meeting.status==='cancelled')return 'Não realizada';if(meetingDone(c,meeting))return 'Realizado';if(done>0)return 'Parcial';return meeting.date<today()?'Pendente':'Planejado'}
  function scheduleMeetings(schedule){
    return (schedule?.meetings||[]).slice().sort((a,b)=>(Number(a.encounterOrder)||0)-(Number(b.encounterOrder)||0)||String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id)));
  }
  function isRepeatedContentMeeting(meeting){
    const haystack=norm([meeting?.id,meeting?.changeReason,meeting?.notes,...(meeting?.blocks||[]).map(block=>block.notes)].filter(Boolean).join(' '));
    return haystack.includes('REPEAT MEETING')||haystack.includes('REPETICAO');
  }
  function normalizeScheduleOrder(schedule){
    const ordered=scheduleMeetings(schedule).filter(meeting=>!isRepeatedContentMeeting(meeting));
    let changed=ordered.length!==(schedule?.meetings||[]).length;
    ordered.forEach((meeting,index)=>{
      const nextOrder=index+1;
      if(Number(meeting.encounterOrder)!==nextOrder){meeting.encounterOrder=nextOrder;changed=true}
      (meeting.blocks||[]).forEach(block=>{if(Number(block.encounterOrder)!==nextOrder){block.encounterOrder=nextOrder;changed=true}});
    });
    if(schedule&&changed)schedule.meetings=ordered;
    return changed;
  }
  function repairGeneratedSchedules(){
    const t=ensure();
    if(t.repeatContentRepairVersion==='2026-09-23')return;
    let changed=false;
    Object.keys(t.generatedSchedules||{}).forEach(classId=>{
      const schedule=t.generatedSchedules[classId];
      if(!schedule)return;
      changed=normalizeScheduleOrder(schedule)||changed;
      recalcSchedule(classId);
    });
    t.repeatContentRepairVersion='2026-09-23';
    if(changed)persist('Cronograma ajustado: repetições antigas foram removidas e a ordem foi recalculada.').catch(console.error);
  }
  function recalcSchedule(classId){
    const c=(db().classes||[]).find(item=>item.id===classId),schedule=classGeneratedSchedule(classId);
    if(!c||!schedule)return null;
    normalizeScheduleOrder(schedule);
    const weekday=classWeekday(c),ignored=[],time=classBlocks(c)[0]?.time||schedule.time||'';
    let cursor=firstRecurringDate(schedule.startDate||c.startDate||today(),weekday),guard=0;
    for(const meeting of scheduleMeetings(schedule)){
      let reason=scheduleBlockedReason(iso(cursor),c,schedule);
      while(reason&&guard<520){ignored.push({date:iso(cursor),reason});cursor=addDays(cursor,7);guard+=1;reason=scheduleBlockedReason(iso(cursor),c,schedule)}
      meeting.date=iso(cursor);meeting.time=time;cursor=addDays(cursor,7);
    }
    schedule.ignored=ignored;schedule.projectedEndDate=scheduleMeetings(schedule).at(-1)?.date||'';c.projectedEndDate=schedule.projectedEndDate;return schedule;
  }
  function attendanceStats(studentId,classId){
    const rows=Object.entries(ensure().attendance).filter(([key])=>key.startsWith(`${classId}::`)).map(([,map])=>map?.[studentId]?.status).filter(Boolean);
    if(!rows.length)return null;
    const absences=rows.filter(status=>status==='absent'||status==='replacement').length;
    const replacements=rows.filter(status=>status==='replacement').length;
    const counted=rows.filter(status=>status!=='replacement');
    const present=counted.filter(status=>status==='present').length;
    const percent=counted.length?Math.round(present/counted.length*100):100;
    return {total:rows.length,percent,absences,replacements};
  }
  function attendancePercent(studentId,classId){
    return attendanceStats(studentId,classId)?.percent??null;
  }

  function visibleClasses(){
    const t=ensure(),query=norm(state().catalogSearch?.classes||''),filter=t.classFilter||'active';
    let all=(db().classes||[]).filter(c=>filter==='archived'?isArchivedClass(c):filter==='all'?true:isActiveClass(c));
    if(query)all=all.filter(c=>norm([c.name,c.course,c.level,c.status,teacherLabel(c.teacherId),bookLabel(c.bookId),c.room,c.schedule,...classBlocks(c).flatMap(block=>[block.day,block.time,block.room])].join(' ')).includes(query));
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

  function meetingAttendanceKey(c,meeting=null){return attendanceKey(c.id,meeting?.date||today(),meeting?.id||'main')}
  function attendanceKey(classId,date=today(),session='main'){return `${classId}::${date}::${session}`}
  function attendanceRows(c,meeting=null){
    const key=meetingAttendanceKey(c,meeting),map=ensure().attendance[key]||{};
    return classStudents(c.id).map(student=>({student,status:map[student.id]?.status||'pending',updatedAt:map[student.id]?.updatedAt||'',note:map[student.id]?.note||'',meeting}));
  }
  function attendanceSummary(c,meeting=null){
    return attendanceRows(c,meeting).reduce((acc,row)=>{acc.total++;acc[row.status]=(acc[row.status]||0)+1;return acc},{total:0,present:0,absent:0,justified:0,replacement:0,pending:0});
  }

  function renderCard(c){
    const students=classStudents(c.id),session=nextSession(c),meta=lessonMeta(c),meeting=todayMeeting(c),summary=attendanceSummary(c,meeting);
    const book=bookLabel(c.bookId),missingBook=norm(book).includes('NAO VINCULADO'),teacher=teacherLabel(c.teacherId);
    return `<article class="turma-list-row premium-row">
      <button class="turma-row-main" onclick="PurpleTurmas.open('${esc(c.id)}')">
        <span class="eyebrow">${esc(c.course||'Curso')} ${c.level?`/ ${esc(c.level)}`:''}</span>
        <strong>${esc(c.name)}</strong>
        <small>${esc([session.block.day,session.block.time].filter(Boolean).join(' · ')||c.schedule||'Horário não informado')}</small>
      </button>
      <div class="turma-row-meta">
        <span>${esc(teacher)}</span>
        <span>${fmtNumber(students.length)} aluno${students.length===1?'':'s'}</span>
        <span>Próxima aula: ${meeting?fmtDate(meeting.date):fmtDate(session.date)}</span>
        ${missingBook?'<span class="quiet-warning">Livro pendente</span>':`<span>${esc(book)}</span>`}
      </div>
      <div class="turma-row-attendance"><b>${summary.present}/${summary.total}</b><small>presentes hoje</small></div>
      <div class="turma-row-actions">
        <button class="btn primary small" onclick="PurpleTurmas.open('${esc(c.id)}')">Abrir aula</button>
        ${user().role!=='teacher'?`<details class="action-menu" onclick="event.stopPropagation()"><summary aria-label="Ações da turma">•••</summary><div><button onclick="App.editClass('${esc(c.id)}')">Editar turma</button><button onclick="PurpleTurmas.completeClass('${esc(c.id)}')">Concluir turma</button><button onclick="PurpleTurmas.archiveClass('${esc(c.id)}')">Arquivar</button><button class="danger" onclick="PurpleTurmas.deleteClass('${esc(c.id)}')">Excluir</button></div></details>`:''}
      </div>
    </article>`;
  }

  function renderModule(mode='classes'){
    if(!can('panel.view'))return `<div class="page"><div class="empty"><div class="emoji">🔒</div><h3>Acesso restrito</h3></div></div>`;
    window.App?.cleanupClassesExceptDiscover3?.({silent:true});
    repairGeneratedSchedules();
    const t=ensure(),classes=visibleClasses(),active=(db().classes||[]).find(c=>c.id===t.activeClassId);
    if(mode==='templates'){t.view='templates';t.activeClassId='';return renderTemplatesPage(classes,true)}
    if(t.view==='calendar')return renderCalendarPage(classes);
    if(active)return renderClass(active);
    t.view='list';
    const inboxCount=followupInbox().filter(item=>item.status==='new').length;
    return `<div class="page turmas-page">
      <div class="section-title turmas-compact-header"><div><h2>${user().role==='teacher'?'Minhas turmas':'Turmas'}</h2><p>Aula, chamada e acompanhamento sem ruído administrativo.</p></div><div class="section-actions">${user().role!=='teacher'?`<button class="btn ghost" onclick="PurpleTurmas.showCalendar()">Calendário</button><button class="btn ghost" onclick="PurpleTurmas.openInbox()">Acompanhamentos ${inboxCount?`(${inboxCount})`:''}</button><button class="btn primary" onclick="App.editClass()">Nova turma</button>`:''}</div></div>
      ${renderTurmasNav('classes')}
      <section class="turma-list-controls"><input type="search" value="${esc(state().catalogSearch?.classes||'')}" placeholder="Pesquisar por dia, horário, professor, sala ou turma" oninput="App.setCatalogSearch('classes',this.value)"/><div class="teacher-filter-chips"><button class="${t.classFilter==='active'?'active':''}" onclick="PurpleTurmas.setClassFilter('active')">Ativas</button><button class="${t.classFilter==='archived'?'active':''}" onclick="PurpleTurmas.setClassFilter('archived')">Arquivadas / concluídas</button><button class="${t.classFilter==='all'?'active':''}" onclick="PurpleTurmas.setClassFilter('all')">Todas</button></div></section>
      <section class="turma-list-table premium-list">${classes.map(renderCard).join('')||'<div class="empty"><h3>Nenhuma turma autorizada</h3><p>Verifique professor vinculado, permissão ou cadastro acadêmico.</p></div>'}</section>
    </div>`;
  }

  function renderTurmasNav(active='classes'){
    return `<nav class="turmas-module-tabs"><button class="${active==='classes'?'active':''}" onclick="PurpleTurmas.showClasses()">Turmas</button><button class="${active==='templates'?'active':''}" onclick="PurpleTurmas.showTemplates()">Cronogramas Base</button><button class="${active==='calendar'?'active':''}" onclick="PurpleTurmas.showCalendar()">Calendário Acadêmico</button></nav>`;
  }

  function renderCalendarPage(classes=[]){
    const holidays=holidayList().slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const all=(db().classes||[]).filter(isActiveClass);
    return `<div class="page turmas-page"><div class="section-title"><div><span class="eyebrow">Calendário acadêmico</span><h2>Feriados e recessos</h2><p>Estas datas são descontadas automaticamente ao gerar ou recalcular cronogramas.</p></div><div class="section-actions"><button class="btn ghost" onclick="PurpleTurmas.showClasses()">Voltar</button><button class="btn primary" onclick="PurpleTurmas.openHoliday()">Incluir feriado</button></div></div>${renderTurmasNav('calendar')}<section class="calendar-admin-grid"><div class="panel calendar-panel"><div class="panel-head"><div><h3>Feriados globais</h3><small>Valem para todas as turmas.</small></div><button class="btn primary small" onclick="PurpleTurmas.openHoliday()">Incluir</button></div><div class="calendar-list">${holidays.map(item=>`<article><time>${fmtDate(item.date)}</time><div><b>${esc(item.name||'FERIADO')}</b><span>${esc(item.scope||'NACIONAL')}</span></div><div class="calendar-actions"><button class="btn ghost small" onclick="PurpleTurmas.openHoliday('${esc(item.id)}')">Alterar</button><button class="btn danger small" onclick="PurpleTurmas.deleteHoliday('${esc(item.id)}')">Excluir</button></div></article>`).join('')||'<div class="empty"><p>Nenhum feriado cadastrado.</p></div>'}</div></div><div class="panel calendar-panel"><div class="panel-head"><div><h3>Recessos por turma</h3><small>Início e fim descontados no cronograma daquela turma.</small></div></div><div class="turma-recess-list">${all.map(c=>{const recesses=recessList(c),hasRecess=Boolean(recesses.length);return `<article><div><b>${esc(c.name)}</b><span>${esc(classBlocks(c).map(block=>[block.day,block.time].filter(Boolean).join(' ')).join(' / ')||'Horário não informado')}</span><small>${hasRecess?recesses.map(period=>`${fmtDate(period.start)} a ${fmtDate(period.end)}`).join(' • '):'Sem recesso cadastrado'}</small></div><div class="calendar-actions"><button class="btn ${hasRecess?'ghost':'primary'} small" onclick="PurpleTurmas.openRecess('${esc(c.id)}')">${hasRecess?'Alterar':'Incluir'}</button>${hasRecess?`<button class="btn danger small" onclick="PurpleTurmas.deleteRecess('${esc(c.id)}')">Excluir</button>`:''}</div></article>`}).join('')||'<div class="empty"><p>Nenhuma turma ativa.</p></div>'}</div></div></section></div>`;
  }

  function renderTemplatesPage(classes=[],standalone=false){
    const templates=scheduleTemplates();
    return `<div class="page turmas-page">
      <div class="section-title"><div><span class="eyebrow">Acadêmico</span><h2>Cronogramas</h2><p>Cronograma base oficial por livro. Sem datas fixas; serve para gerar cronogramas reais das turmas.</p></div><div class="section-actions">${standalone?'<button class="btn ghost" onclick="App.go(&quot;classes&quot;)">Ver turmas</button>':'<button class="btn ghost" onclick="PurpleTurmas.showClasses()">Voltar para turmas</button>'}</div></div>
      ${standalone?'':renderTurmasNav('templates')}
      <section class="template-library-grid">${templates.map(template=>{const groups=groupedTemplateBlocks(template);return `<article class="template-library-card"><div><span class="eyebrow">${esc(template.book||'Livro')}</span><h3>${esc(template.title)}</h3><p>${esc(template.notes||'Modelo institucional reutilizável.')}</p></div><div class="schedule-template-stats"><span><b>${fmtNumber(template.blocks.length)}</b> blocos</span><span><b>${fmtNumber(groups.length)}</b> encontros</span><span><b>v${esc(template.version)}</b> ${esc(template.status)}</span></div><div class="section-actions"><button class="btn primary small" onclick="PurpleTurmas.openTemplate('${esc(template.id)}')">Abrir cronograma</button><button class="btn ghost small" onclick="PurpleTurmas.editTemplateInfo('${esc(template.id)}')">Editar nome</button>${classes[0]?`<button class="btn soft small" onclick="PurpleTurmas.chooseClassForTemplate('${esc(template.id)}')">Gerar em turma</button>`:''}</div></article>`}).join('')||'<div class="empty"><h3>Nenhum cronograma base</h3></div>'}</section>
    </div>`;
  }

  function renderScheduleTemplateSpotlight(classes=[]){
    const template=scheduleTemplate(OFFICIAL_TEMPLATE_ID)||scheduleTemplates()[0];
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
    const t=ensure(),tab=t.activeTab||'schedule',tabs=[['students','Alunos'],['schedule','Cronograma'],['grades','Notas'],['base','Base'],['history','Histórico']];
    const blocks=classBlocks(c),book=bookLabel(c.bookId),teacher=teacherLabel(c.teacherId);
    return `<div class="page turma-workspace">
      <div class="turma-topline compact-class-head"><button class="btn ghost small" onclick="PurpleTurmas.back()">Voltar</button><div><h2>${esc(c.name)}</h2><p><b>${esc(teacher)}</b><span>${esc(blocks.map(b=>[b.day,b.time].filter(Boolean).join(' · ')).join(' / ')||'Horário não informado')}</span></p></div><span class="turma-book-status ${norm(book).includes('NAO VINCULADO')?'warning':''}">${esc(book)}</span></div>
      <nav class="twr-top-tabs">${tabs.map(([id,label])=>`<button class="${tab===id?'active':''}" onclick="PurpleTurmas.tab('${id}')">${label}</button>`).join('')}</nav>
      ${tab==='today'?renderToday(c):tab==='students'?renderStudents(c):tab==='schedule'?renderSchedule(c):tab==='grades'?renderClassGrades(c):tab==='base'?renderBaseForClass(c):renderHistory(c)}
    </div>`;
  }

  function renderToday(c){
    const session=nextSession(c),meta=lessonMeta(c),meeting=todayMeeting(c),summary=attendanceSummary(c,meeting),pending=pendingBlocks(c);
    const plannedBlocks=meeting?.blocks||[];
    return `<section class="turma-today-grid">
      <div class="turma-command">
        <div class="panel-head"><div><span class="eyebrow">${meeting?'Encontro do cronograma':'Hoje'} · ${fmtDate(meeting?.date||session.date)}</span><h3>O que vou ensinar?</h3><small>${esc(session.block.time||meeting?.time||'Horário a confirmar')} · encontro ${esc(meeting?.encounterOrder||meta.lesson?.meetingNumber||'--')}</small></div></div>
        ${pending.length?`<div class="alert yellow turma-pending"><div class="alert-icon">!</div><div><b>Conteúdo pendente da aula anterior</b><span>${pending.map(block=>`Bloco ${block.order} - ${esc(block.title)}`).join(' • ')}</span></div></div>`:''}
        <div class="turma-lesson-focus"><b>${esc(classGeneratedSchedule(c.id)?.templateTitle||meta.course?.name||c.course||'Curso')}</b>${plannedBlocks.length?plannedBlocks.map(block=>`<div class="today-block"><strong>Bloco ${block.order} · ${esc(block.title)}</strong><span>${esc(block.content)}</span><small>Páginas: ${esc(block.bookPages||'--')}</small></div>`).join(''):`<strong>${esc(meta.unit?.title||'Unit a definir')} · ${esc(meta.lesson?.title||'Lesson a definir')}</strong><span>${esc(meta.lesson?.theme||meta.plan?.theme||'Plano base ainda não vinculado')}</span><small>Páginas do livro: ${esc(meta.lesson?.bookPages||meta.unit?.studentBookPages||'--')}</small>`}</div>
        <div class="section-actions" style="justify-content:flex-start">${meta.lesson?`<button class="btn primary" onclick="PurpleTurmas.openLesson('${esc(meta.lesson.id)}')">Abrir plano base</button>`:''}<button class="btn ghost" onclick="PurpleTurmas.openBook('${esc(c.bookId||'')}')">Abrir livro</button>${plannedBlocks.length?`<button class="btn soft" onclick="PurpleTurmas.completePlanned('${esc(c.id)}','${esc(meeting.id)}')">Concluir conforme planejado</button>`:''}<button class="btn ghost" onclick="PurpleTurmas.noteClass('${esc(c.id)}','${esc(meeting?.id||'')}')">Registrar aula</button></div>
        ${plannedBlocks.length?`<div class="turma-block-execution">${plannedBlocks.map(block=>renderBlockExecution(c,block)).join('')}</div>`:''}
      </div>
      <div class="turma-attendance">
        <div class="panel-head"><div><h3>Chamada da aula</h3><small>${meeting?`${fmtDate(meeting.date)} · encontro ${meeting.encounterOrder}`:'Sem cronograma publicado'} · ${summary.present} presentes · ${summary.absent} faltas · ${summary.justified} justificadas · ${summary.replacement} reposições</small></div><button class="btn soft small" onclick="PurpleTurmas.allPresent('${esc(c.id)}','${esc(meeting?.id||'')}')">Todos presentes</button></div>
        <div class="attendance-list">${attendanceRows(c,meeting).map(row=>renderAttendanceRow(c,row,meeting)).join('')||'<div class="empty"><p>Nenhum aluno vinculado a esta turma.</p></div>'}</div>
      </div>
    </section>`;
  }

  function renderBlockExecution(c,block){
    const execution=executionFor(c,block.id),status=execution.status||'planned';
    return `<article class="block-exec ${status}"><div><b>Bloco ${block.order}</b><span>${esc(block.title)} · ${esc(block.bookPages||'--')}</span></div><div class="attendance-actions"><button class="${status==='done'?'active':''}" onclick="PurpleTurmas.setBlockStatus('${esc(c.id)}','${esc(block.id)}','done')">Concluído</button><button class="${status==='partial'?'active':''}" onclick="PurpleTurmas.setBlockStatus('${esc(c.id)}','${esc(block.id)}','partial')">Parcial</button><button class="${status==='pending'?'active':''}" onclick="PurpleTurmas.setBlockStatus('${esc(c.id)}','${esc(block.id)}','pending')">Pendente</button></div></article>`;
  }

  function renderAttendanceRow(c,row,meeting=null){
    const options=[['','Pendente'],['present','Presente'],['absent','Falta'],['justified','Falta justificada'],['replacement','Reposição realizada']];
    const meetingId=meeting?.id||'';
    const rowId=`att-${c.id}-${meetingId||'main'}-${row.student.id}`;
    return `<article class="attendance-row ${row.status}">
      <div class="attendance-mainline"><button class="student-link" onclick="PurpleTurmas.quickStudent('${esc(row.student.id)}','${esc(c.id)}')">${esc(row.student.name)}</button><label class="attendance-status-control ${esc(row.status)}"><select onchange="PurpleTurmas.setAttendance('${esc(c.id)}','${esc(row.student.id)}',this.value||'pending','${esc(meetingId)}',{clear:!this.value})">${options.map(([status,label])=>`<option value="${esc(status)}" ${(status||'pending')===row.status?'selected':''}>${label}</option>`).join('')}</select></label></div>
      <span class="save-state" id="${esc(rowId)}">${row.updatedAt?'Salvo':'--'}</span>
    </article>`;
  }

  function renderStudents(c){
    return `<section class="panel turma-students-panel"><div class="panel-head"><div><h3>Alunos da turma</h3><small>Lista operacional compacta. O nome abre o perfil do aluno.</small></div><div class="section-actions"><button class="btn primary small" onclick="PurpleTurmas.openAddStudent('${esc(c.id)}')">Adicionar aluno</button></div></div><div class="turma-student-list premium-students">${classStudents(c.id).map(s=>{const stats=attendanceStats(s.id,c.id),freq=stats?.percent??(s.frequency||0);return `<article><button class="student-row-main" onclick="PurpleTurmas.quickStudent('${esc(s.id)}','${esc(c.id)}')"><b>${esc(s.name)}</b><span>${esc(s.level||c.level||'Nível não informado')} · frequência ${fmtNumber(freq)}%${stats?` · ${fmtNumber(stats.absences)} faltas · ${fmtNumber(stats.replacements)} reposições`:''}</span></button><button class="btn ghost small" onclick="PurpleTurmas.signal('${esc(s.id)}','${esc(c.id)}')">Acompanhar</button><details class="action-menu" onclick="event.stopPropagation()"><summary aria-label="Ações do aluno">•••</summary><div><button onclick="PurpleTurmas.quickStudent('${esc(s.id)}','${esc(c.id)}')">Ver aluno</button><button onclick="PurpleTurmas.signal('${esc(s.id)}','${esc(c.id)}')">Registrar acompanhamento</button><button class="danger" onclick="PurpleTurmas.unlinkStudent('${esc(c.id)}','${esc(s.id)}')">Remover da turma</button></div></details></article>`}).join('')||'<div class="empty"><p>Nenhum aluno vinculado.</p></div>'}</div></section>`;
  }
  function renderSchedule(c){
    const schedule=classGeneratedSchedule(c.id),progress=progressFor(c);
    if(schedule){
      const meetings=scheduleMeetings(schedule),selected=meetings.find(meeting=>meeting.id===ensure().activeMeetingId)||todayMeeting(c)||meetings[0];
      const selectedIndex=Math.max(0,meetings.findIndex(meeting=>meeting.id===selected?.id)),prevMeeting=meetings[selectedIndex-1],nextMeeting=meetings[selectedIndex+1];
      return `<section class="panel turma-schedule-premium"><div class="schedule-compact-head"><div><span class="eyebrow">${esc(schedule.templateTitle)}</span><h3>Cronograma</h3><p><b>${fmtNumber(progress.done)} de ${fmtNumber(progress.planned)} HA</b> realizadas · ${fmtNumber(progress.percent)}% · conclusão prevista ${fmtDate(schedule.projectedEndDate)}</p><div class="schedule-progress"><span style="width:${Math.min(100,Math.max(0,Number(progress.percent)||0))}%"></span></div></div><div class="section-actions schedule-head-actions"><button class="btn primary small" onclick="PurpleTurmas.insertLesson('${esc(c.id)}')">Inserir aula</button><div class="schedule-stepper" aria-label="Navegação entre aulas"><button class="btn ghost small" ${prevMeeting?'':"disabled"} onclick="PurpleTurmas.jumpMeeting('${esc(c.id)}','prev')">Aula anterior</button><button class="btn ghost small" ${nextMeeting?'':"disabled"} onclick="PurpleTurmas.jumpMeeting('${esc(c.id)}','next')">Próxima aula</button></div><details class="action-menu" onclick="event.stopPropagation()"><summary aria-label="Ações do cronograma">•••</summary><div><button onclick="PurpleTurmas.previewSchedule('${esc(c.id)}')">Regerar preview</button></div></details></div></div>${selected?renderMeetingClassroom(c,selected):''}<div class="schedule-timeline compact">${meetings.map(meeting=>{const done=meetingDone(c,meeting),status=meetingStatus(c,meeting),firstBlock=(meeting.blocks||[])[0]||{};return `<article class="schedule-node ${meeting.id===selected?.id?'active':''} ${meeting.localChange?'local-change':''} ${meeting.status==='cancelled'?'cancelled':''} ${done?'done':''}" role="button" tabindex="0" onclick="PurpleTurmas.openMeeting('${esc(c.id)}','${esc(meeting.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();PurpleTurmas.openMeeting('${esc(c.id)}','${esc(meeting.id)}')}"><time><b>${fmtDate(meeting.date)}</b><small>${esc(meeting.time||'--')}</small></time><div><div class="schedule-node-head"><h4><i aria-hidden="true"></i> Encontro ${String(meeting.encounterOrder).padStart(2,'0')}</h4></div><p><b>${esc(firstBlock.unit||'Unit')}</b><small>${(meeting.blocks||[]).map(block=>`${esc(block.title)}${block.bookPages?` · p. ${esc(block.bookPages)}`:''}`).join(' / ')}</small></p></div><div class="timeline-actions"><span class="timeline-status">${esc(status)}</span><button class="btn primary small" onclick="event.stopPropagation();PurpleTurmas.openMeeting('${esc(c.id)}','${esc(meeting.id)}')">Abrir</button><details class="action-menu" onclick="event.stopPropagation()"><summary aria-label="Ações do encontro">•••</summary><div><button onclick="PurpleTurmas.completePlanned('${esc(c.id)}','${esc(meeting.id)}')">${done?'Desmarcar confirmação':'Confirmar aula'}</button><button onclick="PurpleTurmas.registerDivergence('${esc(c.id)}','${esc(meeting.id)}')">Registrar divergência</button><button onclick="PurpleTurmas.postponeMeeting('${esc(c.id)}','${esc(meeting.id)}')">Mover aula e recalcular</button><button class="danger" onclick="PurpleTurmas.cancelMeeting('${esc(c.id)}','${esc(meeting.id)}')">Cancelar / não realizada</button></div></details></div></article>`}).join('')}</div></section>`;
    }
    return `<section class="panel class-empty-schedule"><div class="panel-head"><div><h3>Cronograma</h3><small>Grade oficial preservada do cadastro de Turmas. Gere o cronograma real a partir de um cronograma base.</small></div><button class="btn primary small" onclick="PurpleTurmas.previewSchedule('${esc(c.id)}')">Gerar cronograma</button></div><div class="class-block-list">${classBlocks(c).map(b=>`<article><span>${esc(b.day||'--')}</span><b>${esc(b.time||'--')}</b><small>${esc(b.room||c.room||'Sala não informada')}</small></article>`).join('')||'<div class="empty"><p>Sem grade cadastrada.</p></div>'}</div></section>`;
  }
  function renderMeetingClassroom(c,meeting){
    const summary=attendanceSummary(c,meeting),note=ensure().meetingNotes[`${c.id}::${meeting.id}`],done=meetingDone(c,meeting);
    return `<section class="panel meeting-classroom-panel ${done?'done':''}"><div class="panel-head"><div><span class="eyebrow">Aula selecionada</span><h3>Encontro ${String(meeting.encounterOrder).padStart(2,'0')}</h3><small>${fmtDate(meeting.date)} · ${esc(meeting.time||'Horário a confirmar')} · chamada vinculada a este encontro</small></div><div class="section-actions"><button class="btn ${done?'success':'primary'} small" onclick="PurpleTurmas.completePlanned('${esc(c.id)}','${esc(meeting.id)}')">${done?'Aula confirmada':'Confirmar aula'}</button><button class="btn soft small" onclick="PurpleTurmas.allPresent('${esc(c.id)}','${esc(meeting.id)}')">Todos presentes</button><button class="btn ghost small" onclick="PurpleTurmas.replanContent('${esc(c.id)}','${esc(meeting.id)}')">Ajustar conteúdo</button><button class="btn ghost small" onclick="PurpleTurmas.noteClass('${esc(c.id)}','${esc(meeting.id)}')">Registrar aula</button></div></div><div class="meeting-classroom-grid"><div class="meeting-content-pane"><div class="pane-kicker">Conteúdo</div><div class="turma-lesson-focus">${(meeting.blocks||[]).map(block=>`<div class="today-block"><div><strong>Bloco ${block.order} · ${esc(block.title)}</strong><span>${esc(block.content)}</span></div><small>${esc(block.type||'Aula')} · Páginas: ${esc(block.bookPages||'--')}</small></div>`).join('')||'<p class="muted">Nenhum conteúdo vinculado a este encontro.</p>'}</div><div class="lesson-material-strip"><button class="btn ghost small" onclick="PurpleTurmas.openLesson('${esc((meeting.blocks||[])[0]?.lessonPlanRef||'')}')">Abrir plano</button><button class="btn ghost small" onclick="PurpleTurmas.openBook('${esc(c.bookId||'')}')">Abrir livro</button></div>${note?.text?`<div class="alert green"><div class="alert-icon">✓</div><div><b>Registro da aula</b><span>${esc(note.text)}</span></div></div>`:''}${note?.divergence?`<div class="alert yellow"><div class="alert-icon">!</div><div><b>Divergência registrada</b><span>${esc(note.divergence)}</span></div></div>`:''}</div><aside class="meeting-students-pane"><div class="meeting-students-head"><div><span class="eyebrow">Frequência</span><h3>Chamada</h3><small>${summary.present} presentes · ${summary.absent} faltas · ${summary.justified} justificadas · ${summary.replacement} reposições · ${summary.pending} pendentes</small></div></div><div class="attendance-list">${attendanceRows(c,meeting).map(row=>renderAttendanceRow(c,row,meeting)).join('')||'<div class="empty"><p>Nenhum aluno vinculado a esta turma.</p></div>'}</div></aside></div></section>`;
  }
  function classGradeRows(c){return (Array.isArray(c.gradeEntries)?c.gradeEntries:[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.studentName||'').localeCompare(String(b.studentName||'')))}
  function renderClassGrades(c){
    const rows=classGradeRows(c),students=classStudents(c.id),summaries=students.map(student=>{
      const grades=studentClassGradeSummary(student.id,c.id),freq=attendanceStats(student.id,c.id)||{percent:0};
      const byType=Object.fromEntries((grades.weighted||[]).map(item=>[norm(item.type),item]));
      return {student,grades,freq,byType};
    });
    const finals=summaries.map(item=>item.grades?.finalAverage).filter(value=>Number.isFinite(Number(value)));
    const avg=finals.length?finals.reduce((sum,value)=>sum+Number(value),0)/finals.length:null;
    const scoreCell=(grades,type)=>{const row=(grades.rows||[]).find(item=>norm(item.type)===norm(type))||{},score=gradeValue(grades.rows||[],type);return score===null?'<span>--</span>':`<button class="student-link" onclick="PurpleTurmas.openClassGrade('${esc(c.id)}','${esc(row.id||'')}')">${fmtNumber(score,1)}</button>`};
    const statusFor=(grades,freq)=>grades.status==='Aguardando'?'Aguardando':(grades.finalAverage>=70&&freq.percent>=70?'Aprovado':'Reprovado');
    return `<section class="panel class-grades-panel"><div class="panel-head"><div><h3>Notas da turma</h3><small>Média automática de 0 a 100. Avalia participação, skills, homework, Midterm Exam e Final Term.</small></div><div class="section-actions"><button class="btn primary small" onclick="PurpleTurmas.openClassGrade('${esc(c.id)}')">Incluir nota</button></div></div><section class="student-attendance-summary"><span><b>Alunos</b>${fmtNumber(students.length)}</span><span><b>Lançamentos</b>${fmtNumber(rows.length)}</span><span><b>Média geral</b>${avg===null?'--':`${fmtNumber(avg,1)}%`}</span><span><b>Regra</b>70%</span></section><div class="class-grade-list">${summaries.map(({student,grades,freq})=>{const status=statusFor(grades,freq);return `<article><div class="grade-student-main"><button class="student-link" onclick="PurpleTurmas.quickStudent('${esc(student.id)}','${esc(c.id)}')">${esc(student.name||'--')}</button><span class="status ${status==='Aprovado'?'approved':status==='Aguardando'?'draft':'rejected'}">${esc(status)}</span></div><div class="grade-score-grid">${performanceGradeTypes().map(type=>`<span><b>${esc(type.replace(' Exam','').replace(' Term',''))}</b>${scoreCell(grades,type)}</span>`).join('')}<span><b>Homework</b>${grades.homeworkAverage===null?'--':fmtNumber(grades.homeworkAverage,1)}</span><span><b>Média</b>${grades.finalAverage===null?'--':`${fmtNumber(grades.finalAverage,1)}%`}</span><span><b>Frequência</b>${fmtNumber(freq.percent,1)}%</span></div><div class="section-actions"><button class="btn primary small" onclick="PurpleTurmas.openClassGrade('${esc(c.id)}','','${esc(student.id)}')">Lançar nota</button></div></article>`}).join('')||'<div class="empty"><p>Nenhum aluno vinculado para lançar notas.</p></div>'}</div><details class="class-grade-details" open><summary>Lançamentos detalhados para editar</summary><div class="class-grade-entry-list">${rows.map(row=>`<article><div><b>${esc(row.studentName||'--')}</b><span>${esc(row.unit||'Geral')} · ${esc(row.type||'--')} · ${Number.isFinite(Number(row.score))?fmtNumber(row.score,1):'--'}%</span><small>${fmtDate(row.date)} · ${esc(row.status||'Lançado')}</small></div><div class="table-actions"><button class="btn ghost small" onclick="PurpleTurmas.openClassGrade('${esc(c.id)}','${esc(row.id||'')}')">Editar</button><button class="btn danger small" onclick="PurpleTurmas.deleteClassGrade('${esc(c.id)}','${esc(row.id||'')}')">Excluir</button></div></article>`).join('')||'<div class="empty"><p>Nenhuma nota lançada.</p></div>'}</div></details></section>`;
  }
  function renderBaseForClass(c){
    const schedule=classGeneratedSchedule(c.id),template=scheduleTemplate(schedule?.templateId)||scheduleTemplates()[0];
    return `<section class="panel"><div class="panel-head"><div><h3>Cronograma base do livro</h3><small>Conteúdo e ordem separados das datas reais da turma.</small></div><div class="section-actions"><button class="btn ghost small" onclick="PurpleTurmas.openTemplate('${esc(template?.id||'')}')">Ver base</button><button class="btn primary small" onclick="PurpleTurmas.previewSchedule('${esc(c.id)}')">Gerar/atualizar preview</button></div></div>${template?renderTemplateSummary(template):'<div class="empty"><p>Nenhum cronograma base cadastrado.</p></div>'}</section>`;
  }
  function renderHistory(c){
    const signals=ensure().signals.filter(s=>s.classId===c.id);
    return `<section class="panel"><div class="panel-head"><div><h3>Histórico da turma</h3><small>Frequências e sinais registrados no ambiente da aula.</small></div></div><div class="timeline">${signals.map(s=>`<div class="timeline-item"><b>${esc(s.studentName)} · ${esc(s.type)}</b><p>${esc(s.description)}</p><time>${fmtDate(s.date)} · ${esc(s.priority)} · ${esc((s.destinations||[]).join(' + '))}</time></div>`).join('')||'<div class="empty"><p>Nenhum acompanhamento registrado.</p></div>'}</div></section>`;
  }

  function renderTemplateSummary(template){
    const groups=groupedTemplateBlocks(template);
    return `<div class="template-summary"><div class="turma-card-facts"><span><b>${fmtNumber(template.blocks.length)}</b> blocos</span><span><b>${fmtNumber(groups.length)}</b> encontros</span><span>Versão ${esc(template.version)}</span><span>${esc(template.status==='published'?'Publicado':'Rascunho')}</span></div><div class="base-schedule-list compact">${groups.slice(0,4).map(group=>`<article><h4>Encontro ${String(group.encounterOrder).padStart(2,'0')}</h4>${group.blocks.map(block=>`<p><b>${String(block.order).padStart(2,'0')}</b> ${esc(block.title)} <small>${esc(block.bookPages)} · ${esc(block.content)}</small></p>`).join('')}</article>`).join('')}</div></div>`;
  }

  function chooseClassForTemplate(templateId){
    const template=scheduleTemplate(templateId),classes=visibleClasses();
    if(!template)return toast('Cronograma base não encontrado.');
    if(!classes.length)return toast('Nenhuma turma autorizada.');
    showModal(`<div class="modal-head"><div><span class="eyebrow">Gerar em turma</span><h3>${esc(template.title)}</h3><p class="helper">Escolha a turma e confira feriados/recessos antes de publicar.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="base-template-list">${classes.map(c=>{const blocks=classBlocks(c),holidays=holidayList(),recesses=recessList(c);return `<article><div><b>${esc(c.name)}</b><span>${esc(blocks.map(block=>[block.day,block.time].filter(Boolean).join(' ')).join(' / ')||'Horário não informado')} · Início ${fmtDate(c.startDate||today())}</span><small>${fmtNumber(holidays.length)} feriado(s) cadastrado(s) · ${fmtNumber(recesses.length)} recesso(s) nesta turma</small></div><button class="btn primary small" onclick="PurpleTurmas.previewSchedule('${esc(c.id)}','${esc(template.id)}')">Gerar preview</button></article>`}).join('')}</div>`);
  }

  function openTemplates(){
    const templates=scheduleTemplates();
    showModal(`<div class="modal-head"><div><span class="eyebrow">Biblioteca pedagógica</span><h3>Cronogramas base</h3><p class="helper">Templates versionados: conteúdo e ordem sem datas fixas.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="base-template-list">${templates.map(template=>`<article><div><b>${esc(template.title)}</b><span>${fmtNumber(template.blocks.length)} blocos · ${fmtNumber(groupedTemplateBlocks(template).length)} encontros · v${esc(template.version)} · ${esc(template.status)}</span></div><button class="btn ghost small" onclick="PurpleTurmas.openTemplate('${esc(template.id)}')">Abrir</button></article>`).join('')||'<div class="empty"><p>Nenhum cronograma base cadastrado.</p></div>'}</div>`,true);
  }

  function openTemplate(id){
    const template=scheduleTemplate(id);
    if(!template)return toast('Cronograma base não encontrado.');
    const groups=groupedTemplateBlocks(template);
    showModal(`<div class="modal-head"><div><span class="eyebrow">Cronograma Base</span><h3>${esc(template.title)}</h3><p class="helper">${fmtNumber(template.blocks.length)} blocos · ${fmtNumber(groups.length)} encontros · versão ${esc(template.version)} · ${esc(template.status)}</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="section-actions" style="justify-content:flex-start;margin-bottom:12px"><button class="btn ghost small" onclick="PurpleTurmas.editTemplateInfo('${esc(template.id)}')">Editar nome</button><button class="btn ghost small" onclick="PurpleTurmas.addTemplateBlock('${esc(template.id)}')">Adicionar bloco</button><button class="btn soft small" onclick="PurpleTurmas.publishTemplateVersion('${esc(template.id)}')">Publicar nova versão</button></div><div class="base-schedule-list">${groups.map(group=>`<article><h4>Encontro ${String(group.encounterOrder).padStart(2,'0')}</h4>${group.blocks.map(block=>`<div class="template-block-row"><div><b>${String(block.order).padStart(2,'0')} · ${esc(block.title)}</b><span>${esc(block.type)} · páginas ${esc(block.bookPages||'--')}</span><small>${esc(block.content)}</small></div><div class="table-actions"><button class="btn ghost small" onclick="PurpleTurmas.editTemplateBlock('${esc(template.id)}','${esc(block.id)}')">Editar</button><button class="btn ghost small" onclick="PurpleTurmas.moveTemplateBlock('${esc(template.id)}','${esc(block.id)}',-1)">↑</button><button class="btn ghost small" onclick="PurpleTurmas.moveTemplateBlock('${esc(template.id)}','${esc(block.id)}',1)">↓</button><button class="btn danger small" onclick="PurpleTurmas.removeTemplateBlock('${esc(template.id)}','${esc(block.id)}')">Remover</button></div></div>`).join('')}</article>`).join('')}</div>`);
  }

  function editTemplateInfo(templateId){
    const template=scheduleTemplate(templateId);
    if(!template)return toast('Cronograma base não encontrado.');
    showModal(`<div class="modal-head"><div><span class="eyebrow">Editar cronograma padrão</span><h3>${esc(template.title)}</h3><p class="helper">Altere o nome exibido sem mexer nos encontros e blocos oficiais.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-2"><div class="field"><label>Nome do cronograma</label><input id="templateInfoTitle" value="${esc(template.title)}"/></div><div class="field"><label>Livro / módulo</label><input id="templateInfoBook" value="${esc(template.book||'')}"/></div></div><div class="field"><label>Descrição</label><textarea id="templateInfoNotes">${esc(template.notes||'')}</textarea></div><div class="section-actions"><button class="btn ghost" onclick="PurpleTurmas.openTemplate('${esc(templateId)}')">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.saveTemplateInfo('${esc(templateId)}')">Salvar nome</button></div>`);
  }

  async function saveTemplateInfo(templateId){
    const template=scheduleTemplate(templateId);
    if(!template)return toast('Cronograma base não encontrado.');
    const title=$('#templateInfoTitle')?.value.trim()||'',book=$('#templateInfoBook')?.value.trim()||'',notes=$('#templateInfoNotes')?.value.trim()||'';
    if(!title)return toast('Informe o nome do cronograma.');
    const t=ensure();
    t.templateOverrides=t.templateOverrides||{};
    t.templateOverrides[templateId]={title,book:book||template.book,notes:notes||template.notes,updatedAt:new Date().toISOString(),updatedBy:user().name||'Purple'};
    seedScheduleTemplates(t);
    await persist('Nome do cronograma atualizado.');
    openTemplate(templateId);
  }

  function templateBlockModal(templateId,blockId=''){
    const template=scheduleTemplate(templateId),block=template?.blocks.find(item=>item.id===blockId)||{order:(template?.blocks.length||0)+1,encounterOrder:groupedTemplateBlocks(template).length+1,title:'',topic:'',bookPages:'',content:'',type:'LESSON',lessonPlanRef:'',resourceRefs:[],notes:''};
    if(!template)return toast('Cronograma base não encontrado.');
    showModal(`<div class="modal-head"><div><span class="eyebrow">${blockId?'Editar':'Novo'} bloco</span><h3>${esc(template.title)}</h3></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-3"><div class="field"><label>Ordem</label><input id="tplBlockOrder" type="number" min="1" value="${Number(block.order||1)}"/></div><div class="field"><label>Encontro</label><input id="tplBlockEncounter" type="number" min="1" value="${Number(block.encounterOrder||1)}"/></div><div class="field"><label>Tipo</label><select id="tplBlockType">${BLOCK_TYPES.map(type=>`<option ${block.type===type?'selected':''}>${esc(type)}</option>`).join('')}</select></div><div class="field"><label>Título/tópico</label><input id="tplBlockTitle" value="${esc(block.title||'')}"/></div><div class="field"><label>Páginas</label><input id="tplBlockPages" value="${esc(block.bookPages||'')}"/></div><div class="field"><label>Lesson Plan ref.</label><input id="tplBlockLesson" value="${esc(block.lessonPlanRef||'')}"/></div></div><div class="field"><label>Conteúdo / atividades</label><textarea id="tplBlockContent">${esc(block.content||'')}</textarea></div><div class="field"><label>Notas</label><textarea id="tplBlockNotes">${esc(block.notes||'')}</textarea></div><div class="section-actions"><button class="btn ghost" onclick="PurpleTurmas.openTemplate('${esc(templateId)}')">Voltar</button><button class="btn primary" onclick="PurpleTurmas.saveTemplateBlock('${esc(templateId)}','${esc(blockId)}')">Salvar bloco</button></div>`);
  }

  function newTemplate(){
    showModal(`<div class="modal-head"><div><span class="eyebrow">Novo cronograma base</span><h3>Criar base por livro</h3><p class="helper">Crie o rascunho e depois adicione os blocos/encontros.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-2"><div class="field"><label>Título</label><input id="newTemplateTitle" placeholder="Ex.: Super Kids 2.1"/></div><div class="field"><label>Livro</label><input id="newTemplateBook" placeholder="Ex.: Super Kids 2"/></div><div class="field"><label>Versão</label><input id="newTemplateVersion" type="number" min="1" value="1"/></div><div class="field"><label>Origem</label><input id="newTemplateSource" placeholder="PDF, modelo interno ou referência"/></div></div><div class="field"><label>Notas</label><textarea id="newTemplateNotes" placeholder="Observações para a equipe pedagógica"></textarea></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.saveTemplate()">Criar cronograma</button></div>`);
  }

  async function saveTemplate(){
    const title=$('#newTemplateTitle')?.value.trim()||'',book=$('#newTemplateBook')?.value.trim()||'Livro não informado';
    if(!title)return toast('Informe o título do cronograma base.');
    const stableKey=norm(title).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||uid('cronograma');
    let id=`${stableKey}-v${Number($('#newTemplateVersion')?.value||1)}`;
    while(ensure().scheduleTemplates.some(item=>item.id===id))id=`${stableKey}-${Date.now().toString(36)}`;
    const template={id,stableKey,title,book,source:$('#newTemplateSource')?.value.trim()||'Criado no Purple Gestão',version:Number($('#newTemplateVersion')?.value||1),status:'draft',createdAt:new Date().toISOString(),groupingMode:'encounterOrder',notes:$('#newTemplateNotes')?.value.trim()||'Cronograma base criado manualmente.',blocks:[]};
    ensure().scheduleTemplates.unshift(template);
    await persist('Cronograma base criado.');
    closeModal();
    openTemplate(template.id);
  }

  async function saveTemplateBlock(templateId,blockId=''){
    const template=scheduleTemplate(templateId);
    if(!template)return toast('Cronograma base não encontrado.');
    const block={id:blockId||uid('tpl-block'),order:Number($('#tplBlockOrder')?.value||1),encounterOrder:Number($('#tplBlockEncounter')?.value||1),title:$('#tplBlockTitle')?.value.trim()||'Sem título',topic:$('#tplBlockTitle')?.value.trim()||'Sem título',bookPages:$('#tplBlockPages')?.value.trim()||'~',content:$('#tplBlockContent')?.value.trim()||'',activities:splitActivities($('#tplBlockContent')?.value||''),type:$('#tplBlockType')?.value||'LESSON',estimatedDuration:'',lessonPlanRef:$('#tplBlockLesson')?.value.trim()||'',resourceRefs:[],notes:$('#tplBlockNotes')?.value.trim()||''};
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
    await persist('Versão publicada e nova versão rascunho criada.');
    openTemplates();
  }

  function previewSchedule(classId,forcedTemplateId=''){
    const c=(db().classes||[]).find(item=>item.id===classId),templates=scheduleTemplates();
    if(!c)return toast('Turma não encontrada.');
    if(!templates.length)return toast('Cadastre um cronograma base primeiro.');
    const selected=forcedTemplateId||classGeneratedSchedule(classId)?.templateId||templates[0].id,holidays=holidayList(),recesses=recessList(c);
    showModal(`<div class="modal-head"><div><span class="eyebrow">Gerar cronograma da turma</span><h3>${esc(c.name)}</h3><p class="helper">Confira a data inicial, feriados e recessos antes de publicar.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-2"><div class="field"><label>Cronograma base</label><select id="scheduleTemplateSelect">${templates.map(template=>`<option value="${esc(template.id)}" ${template.id===selected?'selected':''}>${esc(template.title)} v${esc(template.version)} (${esc(template.status)})</option>`).join('')}</select></div><div class="field"><label>Data inicial</label><input id="scheduleStartDate" type="date" value="${esc(c.startDate||today())}"/></div></div><div class="turma-card-facts"><span><b>Feriados cadastrados</b>${fmtNumber(holidays.length)}</span><span><b>Recessos da turma</b>${fmtNumber(recesses.length)}</span><span><b>Horário</b>${esc(classBlocks(c)[0]?.time||'--')}</span><span><b>Dia</b>${esc(classBlocks(c)[0]?.day||'--')}</span></div>${holidays.length||recesses.length?`<div class="alert yellow"><div class="alert-icon">!</div><div><b>Datas que podem afetar o cronograma</b><span>${[...holidays.map(item=>`${fmtDate(item.date)} - ${esc(item.name||'Feriado')}`),...recesses.map(item=>`${fmtDate(item.start)} a ${fmtDate(item.end)} - Recesso`)].join(' • ')}</span></div></div>`:''}<div class="section-actions"><button class="btn ghost" onclick="PurpleTurmas.chooseClassForTemplate('${esc(selected)}')">Trocar turma</button><button class="btn primary" onclick="PurpleTurmas.showSchedulePreview('${esc(classId)}')">Ver preview</button></div>`);
  }

  function showSchedulePreview(classId){
    const c=(db().classes||[]).find(item=>item.id===classId),preview=generateSchedulePreview(c,$('#scheduleTemplateSelect')?.value,$('#scheduleStartDate')?.value);
    const blocked=previewBlockedDates(c,preview),blockedSummary=[...blocked.holidays.map(item=>`${fmtDate(item.date)} - ${esc(item.reason)}`),...blocked.recesses.map(item=>`${esc(item.reason)}`)];
    showModal(`<div class="modal-head"><div><span class="eyebrow">Preview antes de publicar</span><h3>${esc(preview.templateTitle)} v${esc(preview.templateVersion)}</h3><p class="helper">${fmtNumber(preview.blockCount)} blocos · ${fmtNumber(preview.meetingCount)} encontros · conclusão ${fmtDate(preview.projectedEndDate)}</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="turma-card-facts"><span><b>Início</b>${fmtDate(preview.startDate)}</span><span><b>Horário</b>${esc(preview.time||'--')}</span><span><b>Datas puladas</b>${fmtNumber(preview.ignored.length)}</span><span><b>Template</b>${esc(preview.templateTitle)}</span></div>${blockedSummary.length?`<div class="alert yellow"><div class="alert-icon">!</div><div><b>Feriados e recessos conferidos</b><span>${blockedSummary.join(' • ')}</span></div></div>`:''}${preview.ignored.length?`<div class="alert yellow"><div class="alert-icon">!</div><div><b>Datas sem aula que serão puladas</b><span>${preview.ignored.map(item=>`${fmtDate(item.date)} - ${esc(item.reason)}`).join(' • ')}</span></div></div>`:`<div class="alert green"><div class="alert-icon">✓</div><div><b>Nenhuma data bloqueada no caminho</b><span>O cronograma será gerado sem pular encontros por feriado ou recesso.</span></div></div>`}<div class="base-schedule-list preview">${preview.meetings.map(meeting=>`<article><h4>Encontro ${String(meeting.encounterOrder).padStart(2,'0')} · ${fmtDate(meeting.date)} · ${esc(meeting.time||'--')}</h4>${meeting.blocks.map(block=>`<p><b>Bloco ${block.order}</b> ${esc(block.title)} <small>${esc(block.bookPages)} · ${esc(block.content)}</small></p>`).join('')}</article>`).join('')}</div><div class="section-actions"><button class="btn ghost" onclick="PurpleTurmas.previewSchedule('${esc(classId)}','${esc(preview.templateId)}')">Voltar e ajustar</button><button class="btn primary" onclick="PurpleTurmas.publishSchedule('${esc(classId)}','${esc(preview.templateId)}','${esc(preview.startDate)}')">Confirmar e publicar</button></div>`);
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
    showModal(`<div class="modal-head"><div><span class="eyebrow">Ajuste desta turma</span><h3>Inserir aula</h3><p class="helper">Altera somente a instância desta turma.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-2"><div class="field"><label>Título</label><input id="localLessonTitle" value="Reforço Unit 04"/></div><div class="field"><label>Tipo</label><select id="localLessonType">${BLOCK_TYPES.map(type=>`<option ${type==='REVIEW'?'selected':''}>${esc(type)}</option>`).join('')}</select></div><div class="field"><label>Quantidade de blocos</label><input id="localLessonBlocks" type="number" min="1" max="6" value="2"/></div><div class="field"><label>Páginas</label><input id="localLessonPages" placeholder="p. 30-40"/></div></div><div class="field"><label>Conteúdo</label><textarea id="localLessonContent">Reforço pedagógico conforme necessidade da turma.</textarea></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.saveInsertedLesson('${esc(classId)}')">Inserir e recalcular</button></div>`);
  }
  async function saveInsertedLesson(classId){
    const schedule=classGeneratedSchedule(classId);if(!schedule)return toast('Publique um cronograma antes.');
    const count=Math.max(1,Number($('#localLessonBlocks')?.value||1)),maxOrder=Math.max(0,...schedule.meetings.flatMap(m=>(m.blocks||[]).map(b=>Number(b.order)||0))),nextEncounter=Math.max(0,...schedule.meetings.map(m=>Number(m.encounterOrder)||0))+1;
    const blocks=Array.from({length:count},(_,i)=>({id:uid('local-block'),order:maxOrder+i+1,encounterOrder:nextEncounter,title:$('#localLessonTitle')?.value.trim()||'Aula inserida',topic:$('#localLessonTitle')?.value.trim()||'Aula inserida',bookPages:$('#localLessonPages')?.value.trim()||'',content:$('#localLessonContent')?.value.trim()||'',type:$('#localLessonType')?.value||'REVIEW',localChange:true,notes:'Inserido na turma'}));
    schedule.meetings.push({id:uid('local-meeting'),encounterOrder:nextEncounter,date:schedule.projectedEndDate||today(),time:schedule.time||'',blockIds:blocks.map(b=>b.id),blocks,localChange:true,changeReason:'Aula inserida'});
    recalcSchedule(classId);await persist('Aula inserida e cronograma recalculado.');closeModal();rerender();
  }
  function classReplanBlock(block,meeting){
    return {...block,id:`${meeting.id}__${block.id}__replan`,encounterOrder:meeting.encounterOrder,localChange:true,sourceBlockId:block.id,notes:'Conteúdo reajustado nesta turma'};
  }
  function replanScheduleContent(schedule,meetingId,groups,startIndex){
    const meetings=scheduleMeetings(schedule),meetingIndex=meetings.findIndex(item=>item.id===meetingId);
    if(!schedule||meetingIndex<0||startIndex<0||!groups[startIndex])return false;
    let nextEncounter=Math.max(0,...meetings.map(item=>Number(item.encounterOrder)||0))+1;
    for(let groupIndex=startIndex,offset=0;groupIndex<groups.length;groupIndex+=1,offset+=1){
      let item=meetings[meetingIndex+offset];
      if(!item){
        item={id:uid('replanned-meeting'),encounterOrder:nextEncounter,date:schedule.projectedEndDate||'',time:schedule.time||'',blocks:[],blockIds:[],localChange:true,generatedByReplanFrom:meetingId};
        nextEncounter+=1;
        schedule.meetings.push(item);
      }
      const blocks=groups[groupIndex].blocks.map(block=>classReplanBlock(block,item));
      item.blocks=blocks;
      item.blockIds=blocks.map(block=>block.id);
      item.localChange=true;
      item.changeReason=`Conteúdo reajustado a partir do encontro ${String(meetings[meetingIndex].encounterOrder).padStart(2,'0')}`;
    }
    return true;
  }
  function replanContent(classId,meetingId){
    const schedule=classGeneratedSchedule(classId),meeting=schedule?.meetings.find(item=>item.id===meetingId),template=scheduleTemplate(schedule?.templateId),groups=groupedTemplateBlocks(template);
    if(!schedule||!meeting||!groups.length)return toast('Cronograma base não encontrado para ajustar conteúdo.');
    const currentFirst=(meeting.blocks||[])[0],currentOrder=Number(currentFirst?.encounterOrder)||Number(meeting.encounterOrder)||1;
    const options=groups.map((group,index)=>{const first=group.blocks[0]||{},label=`Encontro ${String(group.encounterOrder).padStart(2,'0')} · ${first.unit||'Unit'} · ${first.title||'Conteúdo'}`;return `<option value="${index}" ${Number(group.encounterOrder)===currentOrder?'selected':''}>${esc(label)}</option>`}).join('');
    showModal(`<div class="modal-head"><div><span class="eyebrow">Ajustar planejamento</span><h3>Reorganizar conteúdo a partir deste encontro</h3><p class="helper">Escolha qual conteúdo base será dado nesta aula. Os encontros seguintes assumem a sequência posterior automaticamente.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="field"><label>Conteúdo para este encontro</label><select id="replanStartGroup">${options}</select><small>Use quando a turma atrasou ou adiantou conteúdo. Datas, chamadas e alunos são preservados.</small></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.saveReplanContent('${esc(classId)}','${esc(meetingId)}')">Aplicar sequência</button></div>`);
  }
  async function saveReplanContent(classId,meetingId){
    const schedule=classGeneratedSchedule(classId),meeting=schedule?.meetings.find(item=>item.id===meetingId),template=scheduleTemplate(schedule?.templateId),groups=groupedTemplateBlocks(template);
    if(!schedule||!meeting||!groups.length)return toast('Cronograma base não encontrado para ajustar conteúdo.');
    const startIndex=Number($('#replanStartGroup')?.value||0);
    if(!replanScheduleContent(schedule,meetingId,groups,startIndex))return toast('Selecione o conteúdo inicial.');
    recalcSchedule(classId);
    ensure().activeClassId=classId;
    ensure().activeTab='schedule';
    ensure().activeMeetingId=meetingId;
    await persist('Conteúdo do cronograma reajustado.');
    closeModal();
    rerender();
  }
  function registerDivergence(classId,meetingId){
    const c=(db().classes||[]).find(item=>item.id===classId),meeting=meetingById(classId,meetingId),note=ensure().meetingNotes[`${classId}::${meetingId}`]||{};
    if(!c||!meeting)return toast('Selecione um encontro do cronograma para registrar a divergência.');
    showModal(`<div class="modal-head"><div><span class="eyebrow">Divergência do cronograma</span><h3>${esc(c.name)} · Encontro ${String(meeting.encounterOrder).padStart(2,'0')}</h3><p class="helper">${fmtDate(meeting.date)} · ${esc(meeting.time||'Horário a confirmar')} · não altera a ordem dos encontros.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="field"><label>O que aconteceu nesta aula?</label><textarea id="meetingDivergenceText" class="large" placeholder="Ex.: conteúdo retomado, parte do bloco ficou pendente, turma precisou de reforço.">${esc(note.divergence||'')}</textarea><small>Para empurrar a aula para a próxima semana, use Mover aula e recalcular no menu do encontro.</small></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.saveDivergence('${esc(classId)}','${esc(meetingId)}')">Salvar divergência</button></div>`);
  }
  async function saveDivergence(classId,meetingId){
    const text=$('#meetingDivergenceText')?.value.trim()||'';
    if(!text)return toast('Informe a divergência da aula.');
    const key=`${classId}::${meetingId}`,previous=ensure().meetingNotes[key]||{};
    ensure().meetingNotes[key]={...previous,divergence:text,updatedAt:new Date().toISOString(),by:user().name||'Professor'};
    await persist('Divergência registrada.');
    closeModal();
    ensure().activeMeetingId=meetingId;
    rerender();
  }
  async function repeatMeeting(classId,meetingId){registerDivergence(classId,meetingId)}
  async function postponeMeeting(classId,meetingId){
    const schedule=classGeneratedSchedule(classId),meeting=schedule?.meetings.find(item=>item.id===meetingId);
    if(!schedule||!meeting)return toast('Selecione um encontro do cronograma.');
    if(!confirm(`Mover o encontro ${String(meeting.encounterOrder).padStart(2,'0')} de ${fmtDate(meeting.date)} para a próxima data válida e recalcular os próximos encontros?`))return;
    const skipped=Array.isArray(schedule.skippedDates)?schedule.skippedDates:[...(schedule.postponedDates||[])];
    if(!skipped.some(item=>(typeof item==='string'?item:item?.date)===meeting.date)){
      skipped.push({id:uid('skip'),date:meeting.date,meetingId:meeting.id,reason:`Encontro ${String(meeting.encounterOrder).padStart(2,'0')} não realizado`,createdAt:new Date().toISOString()});
    }
    schedule.skippedDates=skipped;
    delete schedule.postponedDates;
    meeting.status='planned';
    meeting.localChange=true;
    meeting.postponedFromDate=meeting.postponedFromDate||meeting.date;
    meeting.changeReason='Aula movida; cronograma recalculado';
    recalcSchedule(classId);
    ensure().activeClassId=classId;
    ensure().activeTab='schedule';
    ensure().activeMeetingId=meetingId;
    await persist('Aula movida e cronograma recalculado.');
    rerender();
  }
  async function cancelMeeting(classId,meetingId){
    return postponeMeeting(classId,meetingId);
  }

  function openHoliday(id=''){
    const item=holidayList().find(holiday=>holiday.id===id)||{};
    showModal(`<div class="modal-head"><div><span class="eyebrow">Calendário acadêmico</span><h3>${id?'Editar':'Novo'} feriado</h3><p class="helper">Feriados são descontados de todos os cronogramas gerados.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-3"><div class="field"><label>Data</label><input id="holidayDate" type="date" value="${esc(item.date||'')}"/></div><div class="field"><label>Nome</label><input id="holidayName" value="${esc(item.name||'')}" data-uppercase="true" oninput="this.value=(window.App?.upperLiveValue?App.upperLiveValue(this.value):this.value.toUpperCase())"/></div><div class="field"><label>Escopo</label><select id="holidayScope">${['NACIONAL','ESTADUAL','MUNICIPAL'].map(scope=>`<option value="${scope}" ${norm(item.scope||'NACIONAL')===scope?'selected':''}>${scope}</option>`).join('')}</select></div></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button>${id?`<button class="btn danger" onclick="PurpleTurmas.deleteHoliday('${esc(id)}')">Excluir</button>`:''}<button class="btn primary" onclick="PurpleTurmas.saveHoliday('${esc(id)}')">Salvar feriado</button></div>`);
  }
  async function saveHoliday(id=''){
    const date=$('#holidayDate')?.value||'',name=norm($('#holidayName')?.value||''),scope=norm($('#holidayScope')?.value||'NACIONAL')||'NACIONAL';
    if(!date||!name)return toast('Informe data e nome do feriado.');
    const list=holidayList().slice(),existing=id?list.find(item=>item.id===id):null,payload={id:existing?.id||uid('hol'),date,name,scope};
    if(existing)Object.assign(existing,payload);else list.unshift(payload);
    syncHolidayList(list);
    Object.keys(ensure().generatedSchedules||{}).forEach(recalcSchedule);
    await persist(existing?'Feriado atualizado.':'Feriado salvo.');
    closeModal();ensure().view='calendar';rerender();
  }
  async function deleteHoliday(id){
    const item=holidayList().find(holiday=>holiday.id===id);
    if(!item)return toast('Feriado não encontrado.');
    if(!confirm('Excluir este feriado?'))return;
    syncHolidayList(holidayList().filter(holiday=>holiday.id!==id));
    Object.keys(ensure().generatedSchedules||{}).forEach(recalcSchedule);
    await persist('Feriado excluído e cronogramas recalculados.');
    closeModal();ensure().view='calendar';rerender();
  }
  function openRecess(classId){
    const c=(db().classes||[]).find(item=>item.id===classId);if(!c)return toast('Turma não encontrada.');
    const saved=recessList(c),periods=saved.slice();while(periods.length<3)periods.push({start:'',end:''});
    showModal(`<div class="modal-head"><div><span class="eyebrow">Recesso da turma</span><h3>${saved.length?'Alterar':'Incluir'} recesso · ${esc(c.name)}</h3><p class="helper">Informe início e fim. O cronograma pula as aulas dentro do período.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-2">${periods.slice(0,3).map((period,index)=>`<div class="mini-card"><strong>${index+1}º recesso</strong><div class="field"><label>Início</label><input id="recessStart${index}" type="date" value="${esc(period.start||'')}"/></div><div class="field"><label>Fim</label><input id="recessEnd${index}" type="date" value="${esc(period.end||'')}"/></div></div>`).join('')}</div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button>${saved.length?`<button class="btn danger" onclick="PurpleTurmas.deleteRecess('${esc(classId)}')">Excluir recesso</button>`:''}<button class="btn primary" onclick="PurpleTurmas.saveRecess('${esc(classId)}')">${saved.length?'Alterar':'Incluir'} recesso</button></div>`);
  }
  async function saveRecess(classId){
    const c=(db().classes||[]).find(item=>item.id===classId);if(!c)return toast('Turma não encontrada.');
    const periods=[0,1,2].map(index=>({start:$(`#recessStart${index}`)?.value||'',end:$(`#recessEnd${index}`)?.value||''})).filter(period=>period.start||period.end);
    if(periods.some(period=>!period.start||!period.end||period.end<period.start))return toast('Informe início e fim válidos para cada recesso.');
    c.recessPeriods=periods;
    if(classGeneratedSchedule(classId))recalcSchedule(classId);
    await persist('Recesso salvo e cronograma recalculado.');
    closeModal();ensure().view='calendar';rerender();
  }
  async function deleteRecess(classId){
    const c=(db().classes||[]).find(item=>item.id===classId);if(!c)return toast('Turma não encontrada.');
    if(!recessList(c).length)return toast('Esta turma não tem recesso cadastrado.');
    if(!confirm(`Excluir o recesso da turma ${c.name}?`))return;
    c.recessPeriods=[];
    if(classGeneratedSchedule(classId))recalcSchedule(classId);
    await persist('Recesso excluído e cronograma recalculado.');
    closeModal();ensure().view='calendar';rerender();
  }

  function studentClassLabel(classId){return (db().classes||[]).find(item=>item.id===classId)?.name||'Sem turma'}
  function studentSearchRows(classId,query=''){
    const q=norm(query),students=(db().students||[]).filter(student=>String(student.situation||student.status||'Ativo').toLowerCase()!=='inativo');
    return students.filter(student=>!q||norm([student.name,student.guardian,student.document,student.whatsapp,student.phone,student.classId?studentClassLabel(student.classId):''].join(' ')).includes(q)).sort((a,b)=>String(a.name).localeCompare(String(b.name))).slice(0,40);
  }
  function renderStudentSearchResults(classId,query=''){
    const rows=studentSearchRows(classId,query);
    return rows.map(student=>`<article class="${student.classId===classId?'linked':''}"><div><b>${esc(student.name)}</b><span>${esc(student.guardian||student.whatsapp||student.phone||'Sem contato informado')}</span><small>${student.classId===classId?'Já está nesta turma':student.classId?`Turma atual: ${esc(studentClassLabel(student.classId))}`:'Sem turma vinculada'}</small></div><button class="btn ${student.classId===classId?'soft':'primary'} small" onclick="PurpleTurmas.linkStudent('${esc(classId)}','${esc(student.id)}')" ${student.classId===classId?'disabled':''}>${student.classId?'Transferir':'Adicionar'}</button></article>`).join('')||'<div class="empty"><p>Nenhum aluno encontrado.</p></div>';
  }
  function openAddStudent(classId){
    const c=(db().classes||[]).find(item=>item.id===classId);if(!c)return toast('Turma não encontrada.');
    showModal(`<div class="modal-head"><div><span class="eyebrow">Alunos da turma</span><h3>Adicionar aluno em ${esc(c.name)}</h3><p class="helper">Pesquise pelo nome e vincule sem abrir o cadastro individual.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="field"><label>Buscar aluno</label><input id="classStudentSearch" type="search" placeholder="Digite o nome do aluno" oninput="PurpleTurmas.filterAddStudent('${esc(classId)}',this.value)" autofocus/></div><div id="classStudentSearchResults" class="class-student-picker">${renderStudentSearchResults(classId)}</div>`);
  }
  function filterAddStudent(classId,query=''){
    const target=$('#classStudentSearchResults');
    if(target)target.innerHTML=renderStudentSearchResults(classId,query);
  }
  async function linkStudent(classId,studentId){
    const c=(db().classes||[]).find(item=>item.id===classId),student=(db().students||[]).find(item=>item.id===studentId);
    if(!c||!student)return toast('Turma ou aluno não encontrado.');
    if(student.classId&&student.classId!==classId&&!confirm(`${student.name} já está em ${studentClassLabel(student.classId)}. Transferir para ${c.name}?`))return;
    student.classId=classId;
    c.studentIds=Array.isArray(c.studentIds)?c.studentIds:[];
    if(!c.studentIds.includes(studentId))c.studentIds.push(studentId);
    if(!student.teacherId&&c.teacherId)student.teacherId=c.teacherId;
    if(!student.bookId&&c.bookId)student.bookId=c.bookId;
    student.updatedAt=new Date().toISOString();
    c.studentsCount=classStudents(classId).length;
    await persist('Aluno vinculado à turma.');
    const query=$('#classStudentSearch')?.value||'';
    filterAddStudent(classId,query);
    rerender();
  }
  async function unlinkStudent(classId,studentId){
    const c=(db().classes||[]).find(item=>item.id===classId),student=(db().students||[]).find(item=>item.id===studentId);
    if(!c||!student)return toast('Turma ou aluno não encontrado.');
    if(!confirm(`Remover ${student.name} da turma ${c.name}?`))return;
    student.classId='';
    c.studentIds=(c.studentIds||[]).filter(id=>String(id)!==String(studentId));
    student.updatedAt=new Date().toISOString();
    c.studentsCount=classStudents(classId).length;
    await persist('Aluno removido da turma.');
    rerender();
  }

  function gradeUnitOptions(selected=''){return ['','Unit 01','Unit 02','Unit 03','Unit 04','Unit 05','Unit 06','Unit 07','Unit 08','Unit 09','Unit 10','Unit 11','Unit 12','Unit 13','Unit 14','Final'].map(unit=>`<option value="${esc(unit)}" ${String(selected||'')===unit?'selected':''}>${esc(unit||'Geral')}</option>`).join('')}
  function classGradeById(classId,gradeId){
    const c=(db().classes||[]).find(item=>item.id===classId);
    return (c?.gradeEntries||[]).find(row=>row.id===gradeId)||null;
  }
  function openClassGrade(classId,gradeId='',presetStudentId=''){
    const c=(db().classes||[]).find(item=>item.id===classId);
    if(!c)return toast('Turma não encontrada.');
    const row=classGradeById(classId,gradeId)||{},students=classStudents(classId),types=gradeTypes();
    const selectedStudentId=row.studentId||presetStudentId;
    showModal(`<div class="modal-head"><div><span class="eyebrow">Notas da turma</span><h3>${gradeId?'Editar nota':'Incluir nota'}</h3><p class="helper">${gradeId?'Altere a nota lançada.':'Salva e mantém a janela aberta para lançar a próxima nota.'}</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-3"><div class="field"><label>Aluno</label><select id="classGradeStudent">${students.map(s=>`<option value="${esc(s.id)}" ${String(selectedStudentId||'')===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Unidade</label><select id="classGradeUnit">${gradeUnitOptions(row.unit)}</select></div><div class="field"><label>Tipo</label><select id="classGradeType">${types.map(type=>`<option ${String(row.type||types[0])===type?'selected':''}>${esc(type)}</option>`).join('')}</select></div><div class="field"><label>Nota</label><input id="classGradeScore" type="number" min="0" max="100" step="0.1" value="${row.score??''}"/><small>Aceita 0 a 10 ou 0 a 100. Ex.: 10 vira 100%.</small></div><div class="field"><label>Data</label><input id="classGradeDate" type="date" value="${row.date||today()}"/></div><div class="field"><label>Módulo</label><input id="classGradeModule" value="${esc(row.module||c.course||c.name||'')}"/></div><div class="field"><label>Situação</label><select id="classGradeStatus">${['Lançado','Aguardando','Recuperação','Revisão','Não aguardado'].map(status=>`<option ${String(row.status||'Lançado')===status?'selected':''}>${esc(status)}</option>`).join('')}</select></div></div><div class="field"><label>Observações</label><textarea id="classGradeNotes">${esc(row.notes||'')}</textarea></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Fechar</button><button class="btn primary" onclick="PurpleTurmas.saveClassGrade('${esc(classId)}','${esc(gradeId)}')">${gradeId?'Salvar alteração':'Salvar e lançar próxima'}</button></div>`);
  }
  async function saveClassGrade(classId,gradeId=''){
    const c=(db().classes||[]).find(item=>item.id===classId);
    if(!c)return toast('Turma não encontrada.');
    const studentId=$('#classGradeStudent')?.value||'',student=(db().students||[]).find(s=>s.id===studentId);
    if(!student)return toast('Selecione um aluno da turma.');
    const scoreRaw=$('#classGradeScore')?.value,score=normalizeGradeScore(scoreRaw);
    if(score!==null&&(score<0||score>100))return toast('A nota deve estar entre 0 e 100.');
    c.gradeEntries=Array.isArray(c.gradeEntries)?c.gradeEntries:[];
    const row={id:gradeId||uid('cgr'),studentId,studentName:student.name,classId,className:c.name,module:$('#classGradeModule')?.value.trim()||c.course||c.name||'',unit:$('#classGradeUnit')?.value||'',type:$('#classGradeType')?.value||'Média',score,date:$('#classGradeDate')?.value||today(),status:$('#classGradeStatus')?.value||'Lançado',notes:$('#classGradeNotes')?.value.trim()||'',source:'turmas',updatedAt:new Date().toISOString()};
    const idx=c.gradeEntries.findIndex(item=>item.id===gradeId);
    if(idx>=0)c.gradeEntries[idx]=row;else c.gradeEntries.unshift(row);
    student.gradeEntries=Array.isArray(student.gradeEntries)?student.gradeEntries:[];
    const studentGrade={...row,id:`class-${classId}-${row.id}`};
    const sIdx=student.gradeEntries.findIndex(item=>item.id===studentGrade.id||item.classGradeId===row.id);
    studentGrade.classGradeId=row.id;
    if(sIdx>=0)student.gradeEntries[sIdx]=studentGrade;else student.gradeEntries.unshift(studentGrade);
    student.updatedAt=new Date().toISOString();
    await persist(gradeId?'Nota atualizada.':'Nota salva. Próximo lançamento liberado.');
    if(gradeId){closeModal();rerender();return;}
    const scoreInput=$('#classGradeScore'),notesInput=$('#classGradeNotes');
    if(scoreInput){scoreInput.value='';scoreInput.focus?.();}
    if(notesInput)notesInput.value='';
    rerender();
    openClassGrade(classId,'',studentId);
  }
  async function deleteClassGrade(classId,gradeId){
    const c=(db().classes||[]).find(item=>item.id===classId),row=classGradeById(classId,gradeId);
    if(!c||!row)return toast('Nota não encontrada.');
    if(!confirm(`Excluir a nota de ${row.studentName||'aluno'}?`))return;
    c.gradeEntries=(c.gradeEntries||[]).filter(item=>item.id!==gradeId);
    const student=(db().students||[]).find(s=>s.id===row.studentId);
    if(student)student.gradeEntries=(student.gradeEntries||[]).filter(item=>item.id!==`class-${classId}-${gradeId}`&&item.classGradeId!==gradeId);
    await persist('Nota excluída da turma e do perfil do aluno.');
    rerender();
  }

  async function persist(message){
    await storage()?.save?.(db());
    if(message)toast(message);
  }
  function meetingById(classId,meetingId){
    const schedule=classGeneratedSchedule(classId);
    return (schedule?.meetings||[]).find(item=>item.id===meetingId)||null;
  }
  async function setAttendance(classId,studentId,status,meetingId='',options={}){
    const c=(db().classes||[]).find(item=>item.id===classId)||{},meeting=meetingById(classId,meetingId)||todayMeeting(c),t=ensure(),key=meetingAttendanceKey(c,meeting),rowId=`att-${classId}-${meeting?.id||'main'}-${studentId}`,el=$(`#${CSS.escape(rowId)}`);
    t.attendance[key]=t.attendance[key]||{};
    const nextStatus=!options.force&&(options.clear||t.attendance[key][studentId]?.status===status)?'pending':status;
    if(nextStatus==='pending')delete t.attendance[key][studentId];
    else t.attendance[key][studentId]={status:nextStatus,updatedAt:new Date().toISOString(),meetingId:meeting?.id||'',date:meeting?.date||today()};
    if(el)el.textContent='Salvando...';
    try{
      const student=(db().students||[]).find(s=>s.id===studentId);
      if(student){
        student.attendanceEntries=Array.isArray(student.attendanceEntries)?student.attendanceEntries:[];
        const entryId=`class-${classId}-${meeting?.id||meeting?.date||today()}`;
        const idx=student.attendanceEntries.findIndex(x=>x.id===entryId);
        if(nextStatus==='pending'){
          if(idx>=0)student.attendanceEntries.splice(idx,1);
        }else{
          const row={id:entryId,date:meeting?.date||today(),scheduledTime:meeting?.time||nextSession(c).block.time||'',teacherId:c.teacherId||'',teacher:teacherLabel(c.teacherId),classType:'Turma',classId,meetingId:meeting?.id||'',meetingOrder:meeting?.encounterOrder||'',meetingTitle:meeting?`Encontro ${meeting.encounterOrder}`:'Aula',present:nextStatus==='present',justified:nextStatus==='justified',replacementDone:nextStatus==='replacement',source:'turmas'};
          if(idx>=0)student.attendanceEntries[idx]=row;else student.attendanceEntries.unshift(row);
        }
      }
      await persist();
      if(el)el.textContent=nextStatus==='pending'?'Removido':'Salvo';
      rerender();
    }catch(error){console.error(error);if(el)el.textContent='Erro ao salvar';toast('Erro ao salvar chamada. Tente novamente.')}
  }
  async function allPresent(classId,meetingId=''){
    const c=(db().classes||[]).find(item=>item.id===classId);
    if(!c)return;
    for(const s of classStudents(classId))await setAttendance(classId,s.id,'present',meetingId,{force:true});
  }
  async function updateClassStatus(classId,status,message){
    const c=(db().classes||[]).find(item=>item.id===classId);
    if(!c)return toast('Turma não encontrada.');
    if(norm(status)==='CONCLUIDA'||norm(status)==='CONCLUIDO')snapshotClassGrades(c);
    c.status=status;
    c.updatedAt=new Date().toISOString();
    await persist(message);
    ensure().activeClassId='';
    rerender();
  }
  function snapshotClassGrades(c){
    const closedAt=new Date().toISOString();
    classStudents(c.id).forEach(student=>{
      const grades=studentClassGradeSummary(student.id,c.id),freq=attendanceStats(student.id,c.id);
      student.moduleHistories=Array.isArray(student.moduleHistories)?student.moduleHistories:[];
      const payload={id:`module-${c.id}`,classId:c.id,className:c.name,module:c.course||c.name||'',closedAt,average:grades.finalAverage,homeworkAverage:grades.homeworkAverage,frequency:freq.percent,status:grades.finalAverage!==null&&grades.finalAverage>=70&&freq.percent>=70?'Aprovado':'Reprovado',grades:grades.rows.map(row=>({...row}))};
      const idx=student.moduleHistories.findIndex(item=>item.id===payload.id||item.classId===c.id);
      if(idx>=0)student.moduleHistories[idx]=payload;else student.moduleHistories.unshift(payload);
      student.evaluation=`${payload.module||payload.className}: média ${payload.average===null?'--':fmtNumber(payload.average,1)}% • frequência ${fmtNumber(payload.frequency,1)}% • ${payload.status}`;
      student.updatedAt=closedAt;
    });
  }
  function nextLevelValue(level=''){
    const raw=String(level||'').trim();
    if(!raw)return '';
    if(norm(raw)==='STARTER')return '1';
    const number=Number(raw.match(/\d+/)?.[0]||'');
    return Number.isFinite(number)&&number>0?String(number+1):raw;
  }
  function nextModuleSuggestion(c={}){
    const nextLevel=nextLevelValue(c.level)||nextLevelValue(c.classNumber)||'';
    const course=c.course||String(c.name||'').replace(/\s+\d+$/,'');
    const books=db().inventoryItems||[];
    const nextBook=books.find(book=>norm(book.course||book.collection||book.name).includes(norm(course))&&norm(book.level||book.volume||book.name).includes(norm(nextLevel)))||books.find(book=>norm(book.name).includes(norm(course))&&norm(book.name).includes(norm(nextLevel)));
    const baseName=[course,nextLevel].filter(Boolean).join(' ').trim()||`${c.name||'TURMA'} - PRÓXIMO MÓDULO`;
    let name=baseName,seq=2;
    while((db().classes||[]).some(item=>norm(item.name)===norm(name)))name=`${baseName} ${seq++}`;
    return {course,nextLevel,nextBook,name};
  }
  function openCompleteClass(classId){
    const c=(db().classes||[]).find(item=>item.id===classId);if(!c)return toast('Turma não encontrada.');
    const suggestion=nextModuleSuggestion(c),students=classStudents(classId),blocks=classBlocks(c);
    showModal(`<div class="modal-head"><div><span class="eyebrow">Conclusão da turma</span><h3>Concluir ${esc(c.name)}</h3><p class="helper">Você pode apenas concluir ou já abrir a próxima turma com os mesmos alunos, dia e horário.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><section class="student-attendance-summary"><span><b>Alunos</b>${fmtNumber(students.length)}</span><span><b>Próximo módulo</b>${esc(suggestion.name)}</span><span><b>Horário</b>${esc(blocks.map(block=>[block.day,block.time].filter(Boolean).join(' ')).join(' / ')||'Mesmo horário')}</span><span><b>Livro</b>${esc(suggestion.nextBook?.name||'A definir')}</span></section><div class="form-grid cols-2"><div class="field"><label>Nome da nova turma</label><input id="nextClassName" value="${esc(suggestion.name)}" data-uppercase="true" oninput="this.value=(window.App?.upperLiveValue?App.upperLiveValue(this.value):this.value.toUpperCase())"/></div><div class="field"><label>Data inicial da nova turma</label><input id="nextClassStart" type="date" value="${today()}"/></div></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn soft" onclick="PurpleTurmas.finishClassOnly('${esc(classId)}')">Concluir sem criar turma</button><button class="btn primary" onclick="PurpleTurmas.createNextClassFromCompleted('${esc(classId)}')">Concluir e criar próxima turma</button></div>`);
  }
  async function finishClassOnly(classId){
    await updateClassStatus(classId,'Concluída','Turma concluída.');
    closeModal();
  }
  async function createNextClassFromCompleted(classId){
    const c=(db().classes||[]).find(item=>item.id===classId);if(!c)return toast('Turma não encontrada.');
    const students=classStudents(classId),suggestion=nextModuleSuggestion(c),now=new Date().toISOString(),newId=uid('class');
    snapshotClassGrades(c);
    const nextClass={...c,id:newId,name:norm($('#nextClassName')?.value||suggestion.name),course:suggestion.course||c.course,level:suggestion.nextLevel||c.level,classNumber:Number(suggestion.nextLevel)||Number(c.classNumber||0)+1,bookId:suggestion.nextBook?.id||suggestion.nextBook?.supabaseId||'',status:'Ativa',startDate:$('#nextClassStart')?.value||today(),studentIds:students.map(student=>student.id),studentsCount:students.length,gradeEntries:[],recessPeriods:Array.isArray(c.recessPeriods)?c.recessPeriods.map(period=>({...period})):[],scheduleBlocks:classBlocks(c).map(block=>({...block})),schedule:classBlocks(c).map(block=>[block.day,block.time].filter(Boolean).join(' ')).join(' • '),createdFromClassId:c.id,createdAt:now,updatedAt:now};
    c.status='Concluída';c.updatedAt=now;c.nextClassId=newId;
    students.forEach(student=>{student.previousClassId=c.id;student.classId=newId;student.className=nextClass.name;if(nextClass.bookId)student.bookId=nextClass.bookId;student.updatedAt=now});
    db().classes=db().classes||[];
    db().classes.unshift(nextClass);
    await persist('Turma concluída e próxima turma criada com os alunos transferidos.');
    closeModal();ensure().activeClassId=newId;ensure().activeTab='students';rerender();
  }
  function archiveClass(classId){
    if(!confirm('Arquivar esta turma? Ela ficará disponível no filtro Arquivadas / concluídas.'))return;
    updateClassStatus(classId,'Arquivada','Turma arquivada.');
  }
  function completeClass(classId){
    openCompleteClass(classId);
  }
  function deleteClass(classId){
    window.App?.deleteClass?.(classId);
  }
  async function setBlockStatus(classId,blockId,status){
    const t=ensure(),schedule=classGeneratedSchedule(classId),block=(schedule?.meetings||[]).flatMap(meeting=>meeting.blocks||[]).find(item=>item.id===blockId);
    if(!block)return toast('Bloco não encontrado no cronograma publicado.');
    t.blockExecution[`${classId}::${blockId}`]={status,updatedAt:new Date().toISOString(),by:user().name||'Professor'};
    t.pendingBlocks[classId]=(t.pendingBlocks[classId]||[]).filter(item=>item.id!==blockId);
    if(status==='partial'||status==='pending')t.pendingBlocks[classId].push({...block,pendingStatus:status,updatedAt:new Date().toISOString()});
    await persist(status==='done'?'Bloco concluído.':'Pendência acadêmica registrada.');
    rerender();
  }
  async function completePlanned(classId,meetingId){
    const schedule=classGeneratedSchedule(classId),meeting=(schedule?.meetings||[]).find(item=>item.id===meetingId);
    if(!meeting)return toast('Encontro não encontrado.');
    const blocks=meeting.blocks||[],t=ensure(),alreadyDone=blocks.length&&blocks.every(block=>t.blockExecution[`${classId}::${block.id}`]?.status==='done');
    if(alreadyDone){
      meeting.status='planned';delete meeting.completedAt;delete meeting.completedBy;
      blocks.forEach(block=>delete t.blockExecution[`${classId}::${block.id}`]);
      await persist('Confirmação da aula removida.');
      rerender();
      return;
    }
    const now=new Date().toISOString(),teacher=user().name||'Professor';
    meeting.status='done';meeting.completedAt=now;meeting.completedBy=teacher;
    for(const block of blocks)t.blockExecution[`${classId}::${block.id}`]={status:'done',updatedAt:now,by:teacher};
    t.pendingBlocks[classId]=(t.pendingBlocks[classId]||[]).filter(item=>!blocks.some(block=>block.id===item.id));
    await persist('Aula confirmada conforme cronograma.');
    rerender();
  }
  function quickStudent(studentId,classId){
    const s=(db().students||[]).find(item=>item.id===studentId),c=(db().classes||[]).find(item=>item.id===classId);
    if(!s)return toast('Aluno não encontrado.');
    const follow=(s.followUpEntries||[]).slice(0,3),freq=attendancePercent(studentId,classId);
    window.App?.closeModal?.();
    showModal(`<div class="modal-head"><div><span class="eyebrow">Aluno da turma</span><h3>${esc(s.name)}</h3><p class="helper">Escolha uma ação rápida para este aluno.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="quick-student-facts"><span><b>Turma</b>${esc(c?.name||'--')}</span><span><b>Nível</b>${esc(s.level||c?.level||'--')}</span><span><b>Status</b>${esc(s.situation||s.status||'--')}</span><span><b>Frequência</b>${freq===null?fmtNumber(s.frequency||0):fmtNumber(freq)}%</span></div><section class="form-card"><h3>Últimos acompanhamentos</h3>${follow.map(f=>`<p class="muted"><b>${esc(f.type||'Follow-up')}</b> · ${esc(f.subject||f.result||'')}</p>`).join('')||'<p class="muted">Sem acompanhamentos recentes.</p>'}</section><div class="section-actions"><button class="btn primary" onclick="PurpleTurmas.openClassGrade('${esc(classId)}','','${esc(s.id)}')">Lançar nota</button><button class="btn ghost" onclick="PurpleTurmas.signal('${esc(s.id)}','${esc(classId)}')">Acompanhamento</button><button class="btn ghost" onclick="App.closeModal();setTimeout(()=>App.openStudent?.('${esc(s.id)}'),0)">Abrir cadastro</button></div>`);
  }
  const destinationsFor=type=>({APRENDIZAGEM:['pedagogico'],COMPORTAMENTO:['pedagogico'],ENGAJAMENTO:['pedagogico'],FREQUENCIA:['retencao','pedagogico'],INSATISFACAO:['retencao'],RISCO_CANCELAMENTO:['retencao'],PEDIDO_ALUNO:['retencao','pedagogico'],EVOLUCAO_POSITIVA:['pedagogico'],RELACIONAMENTO:['pedagogico']}[type]||['pedagogico']);
  function signal(studentId,classId){
    const s=(db().students||[]).find(item=>item.id===studentId),c=(db().classes||[]).find(item=>item.id===classId);
    if(!s)return toast('Aluno não encontrado.');
    showModal(`<div class="modal-head"><div><span class="eyebrow">Sinal de acompanhamento</span><h3>${esc(s.name)}</h3><p class="helper">${esc(c?.name||'Turma')} · registre fatos observáveis e falas relevantes.</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="form-grid cols-2"><div class="field"><label>Tipo / motivo</label><select id="turmaSignalType"><option value="ENGAJAMENTO">Engajamento</option><option value="COMPORTAMENTO">Comportamento</option><option value="APRENDIZAGEM">Aprendizagem</option><option value="FREQUENCIA">Frequência</option><option value="RELACIONAMENTO">Relacionamento / integração</option><option value="INSATISFACAO">Insatisfação</option><option value="RISCO_CANCELAMENTO">Risco de cancelamento</option><option value="PEDIDO_ALUNO">Pedido do aluno</option><option value="EVOLUCAO_POSITIVA">Evolução positiva</option><option value="OUTRO">Outro</option></select></div><div class="field"><label>Prioridade</label><select id="turmaSignalPriority"><option>Rotina</option><option>Atenção</option><option>Prioridade</option></select></div></div><div class="field"><label>O que você observou ou o aluno disse?</label><textarea id="turmaSignalDescription" class="large" placeholder="Descreva objetivamente o que aconteceu ou foi dito."></textarea><small>Evite diagnósticos ou julgamentos. Use contexto acadêmico.</small></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.saveSignal('${esc(studentId)}','${esc(classId)}')">Salvar sinal</button></div>`);
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
  function openBook(){toast('Vínculo do livro preparado para integração com biblioteca/material.')}
  function noteClass(classId='',meetingId=''){
    const c=(db().classes||[]).find(item=>item.id===classId),meeting=meetingById(classId,meetingId),note=ensure().meetingNotes[`${classId}::${meetingId}`]||{};
    if(!c||!meeting)return toast('Selecione um encontro do cronograma para registrar a aula.');
    showModal(`<div class="modal-head"><div><span class="eyebrow">Registro da aula</span><h3>${esc(c.name)} · Encontro ${String(meeting.encounterOrder).padStart(2,'0')}</h3><p class="helper">${fmtDate(meeting.date)} · ${esc(meeting.time||'Horário a confirmar')}</p></div><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="field"><label>Informações da turma nesta aula</label><textarea id="meetingClassNote" class="large" placeholder="Ex.: turma avançou bem, revisar vocabulário na próxima aula, aluno X precisa de acompanhamento.">${esc(note.text||'')}</textarea><small>Este registro fica vinculado a este encontro, junto com a chamada.</small></div><div class="section-actions"><button class="btn ghost" onclick="App.closeModal()">Cancelar</button><button class="btn primary" onclick="PurpleTurmas.saveMeetingNote('${esc(classId)}','${esc(meetingId)}')">Salvar registro</button></div>`);
  }
  async function saveMeetingNote(classId,meetingId){
    const text=$('#meetingClassNote')?.value.trim()||'';
    if(!text)return toast('Informe o registro da aula.');
    ensure().meetingNotes[`${classId}::${meetingId}`]={text,updatedAt:new Date().toISOString(),by:user().name||'Professor'};
    await persist('Registro da aula salvo.');
    closeModal();
    ensure().activeMeetingId=meetingId;
    rerender();
  }
  function jumpMeeting(classId,direction='next'){
    const c=(db().classes||[]).find(item=>item.id===classId),schedule=classGeneratedSchedule(classId);
    if(!c||!schedule)return toast('Cronograma não encontrado.');
    const meetings=scheduleMeetings(schedule);
    if(!meetings.length)return toast('Nenhuma aula no cronograma.');
    const fallback=todayMeeting(c)||meetings[0];
    const currentId=ensure().activeMeetingId||fallback?.id||meetings[0].id;
    const currentIndex=Math.max(0,meetings.findIndex(meeting=>meeting.id===currentId));
    const nextIndex=direction==='prev'?Math.max(0,currentIndex-1):Math.min(meetings.length-1,currentIndex+1);
    if(nextIndex===currentIndex)return toast(direction==='prev'?'Você já está na primeira aula.':'Você já está na última aula.');
    ensure().activeClassId=classId;
    ensure().activeTab='schedule';
    ensure().activeMeetingId=meetings[nextIndex].id;
    rerender();
  }

  window.PurpleTurmas={render:renderModule,showClasses:()=>{ensure().view='list';ensure().activeClassId='';rerender()},setClassFilter:filter=>{ensure().classFilter=filter;rerender()},showTemplates:()=>{ensure().view='templates';ensure().activeClassId='';if(window.App?.go)window.App.go('schedules');else rerender()},showCalendar:()=>{ensure().view='calendar';ensure().activeClassId='';rerender()},open:id=>{ensure().activeClassId=id;ensure().activeTab='schedule';rerender()},openMeeting:(classId,meetingId)=>{ensure().activeClassId=classId;ensure().activeTab='schedule';ensure().activeMeetingId=meetingId;rerender()},jumpMeeting,back:()=>{ensure().activeClassId='';rerender()},tab:id=>{ensure().activeTab=id==='today'?'schedule':id;rerender()},setAttendance,allPresent,completeClass,finishClassOnly,createNextClassFromCompleted,archiveClass,deleteClass,setBlockStatus,completePlanned,quickStudent,signal,saveSignal,openInbox,updateSignal,openLesson,openBook,noteClass,saveMeetingNote,registerDivergence,saveDivergence,openHoliday,saveHoliday,deleteHoliday,openRecess,saveRecess,deleteRecess,openAddStudent,filterAddStudent,linkStudent,unlinkStudent,openClassGrade,saveClassGrade,deleteClassGrade,openTemplates,openTemplate,editTemplateInfo,saveTemplateInfo,chooseClassForTemplate,newTemplate,saveTemplate,addTemplateBlock:templateId=>templateBlockModal(templateId),editTemplateBlock:templateBlockModal,saveTemplateBlock,moveTemplateBlock,removeTemplateBlock,publishTemplateVersion,previewSchedule,showSchedulePreview,publishSchedule,insertLesson,saveInsertedLesson,replanContent,saveReplanContent,repeatMeeting,postponeMeeting,cancelMeeting,_test:{ensure,scheduleTemplates,scheduleTemplate,groupedTemplateBlocks,generateSchedulePreview,progressFor,attendancePercent,attendanceStats,recalcSchedule,meetingAttendanceKey,attendanceRows,scheduleMeetings,normalizeScheduleOrder,scheduleBlockedReason,replanScheduleContent,holidayList,recessList,studentSearchRows,classGradeRows,classStudents,gradeTypes,normalizeGradeScore,studentClassGradeSummary,nextModuleSuggestion,jumpMeeting,postponeMeeting}};
})();
