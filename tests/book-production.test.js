const assert=require('node:assert/strict');

const profileSpec={closed_format:'A4',width_mm:210,height_mm:297,cover_paper:'Couchê',cover_grammage:250,cover_print:'4x0',inner_paper:'Offset',inner_grammage:90,inner_print:'4x4',inner_colors:'Colorido',binding_type:'Brochura'};
const bookA='10000000-0000-4000-8000-000000000001';
const bookB='10000000-0000-4000-8000-000000000002';
const profileA='30000000-0000-4000-8000-000000000001';
const tables={
  production_books:[
    {id:bookA,inventory_item_id:'20000000-0000-4000-8000-000000000001',page_count:170,print_profile_id:profileA,has_custom_spec:false,status:'ACTIVE'},
    {id:bookB,inventory_item_id:'20000000-0000-4000-8000-000000000002',page_count:154,print_profile_id:profileA,has_custom_spec:false,status:'ACTIVE'},
    {id:'10000000-0000-4000-8000-000000000003',inventory_item_id:'20000000-0000-4000-8000-000000000003',page_count:0,print_profile_id:profileA,has_custom_spec:false,status:'ACTIVE'},
    {id:'10000000-0000-4000-8000-000000000004',inventory_item_id:'20000000-0000-4000-8000-000000000004',page_count:120,print_profile_id:profileA,has_custom_spec:false,status:'INACTIVE'}
  ],
  production_book_print_specs:[],
  production_book_progressions:[],
  production_print_profiles:[{id:profileA,name:'Padrão Livros Purple',status:'ACTIVE',is_default:true,default_spec:profileSpec}],
  production_print_profile_ranges:[],
  production_book_orders:[],
  production_book_order_classes:[],
  production_book_order_students:[],
  production_book_order_recipients:[],
  production_book_order_items:[],
  production_book_order_spec_snapshots:[],
  production_book_order_status_history:[]
};
let modalHtml='',capturedRpc=null;
let simulateMissingV3Rpc=false;
const state={
  user:{id:'50000000-0000-4000-8000-000000000001',role:'direction'},
  db:{
    inventoryItems:[
      {id:'20000000-0000-4000-8000-000000000001',item_type:'book',internal_code:'CON',name:'CONNECT',course:'Inglês',level:'Iniciante',active:true,current_quantity:0,minimum_quantity:3},
      {id:'20000000-0000-4000-8000-000000000002',item_type:'book',internal_code:'DIS',name:'DISCOVER',course:'Inglês',level:'Básico',active:true,current_quantity:1,minimum_quantity:3},
      {id:'20000000-0000-4000-8000-000000000003',item_type:'book',internal_code:'BAD',name:'SEM PÁGINAS',course:'Inglês',level:'Básico',active:true},
      {id:'20000000-0000-4000-8000-000000000004',item_type:'book',internal_code:'OFF',name:'INATIVO',course:'Inglês',level:'Básico',active:true}
    ],
    classes:[
      {id:'class-discover-1',name:'DISCOVER 1'},
      {id:'class-discover-2',name:'DISCOVER 2'},
      {id:'class-kids-1',name:'SUPER KIDS STARTER 1'}
    ],
    students:[
      {id:'student-ana',name:'Ana',classId:'class-discover-1'},
      {id:'student-bia',name:'Bia',classId:'class-discover-1'},
      {id:'student-caio',name:'Caio',classId:'class-discover-2'},
      {id:'student-dupe',name:'Duplo',classId:'class-discover-1'},
      {id:'student-dupe',name:'Duplo',classId:'class-discover-2'},
      {id:'student-eva',name:'Eva',classId:'class-kids-1'}
    ]
  },
  bookProduction:{tab:'books',loaded:true,loading:false,...Object.fromEntries(Object.entries({
    books:tables.production_books,
    specs:tables.production_book_print_specs,
    progressions:tables.production_book_progressions,
    profiles:tables.production_print_profiles,
    ranges:tables.production_print_profile_ranges,
    orders:[],
    classes:[],
    students:[],
    recipients:[],
    items:[],
    snapshots:[],
    history:[]
  }))}
};
let simulateMissingRecipients=false;
const query=table=>({
  _op:'select',
  _payload:null,
  _filters:[],
  select(){return this},
  order(){return this},
  insert(){return Promise.resolve({data:null,error:null})},
  update(payload){this._op='update';this._payload=payload;return this},
  eq(column,value){this._filters.push([column,value]);return this},
  then(resolve){
    if(simulateMissingRecipients&&table==='production_book_order_recipients'){
      resolve({data:null,error:{code:'PGRST205',message:"Could not find the table 'public.production_book_order_recipients' in the schema cache"}});
      return
    }
    if(this._op==='update'){
      const rows=tables[table]||[];
      const match=row=>this._filters.every(([column,value])=>row[column]===value);
      rows.forEach(row=>{if(match(row))Object.assign(row,this._payload)});
      resolve({data:rows.filter(match),error:null});
      return
    }
    resolve({data:tables[table]||[],error:null})
  }
});
const client={from:query,async rpc(name,args){capturedRpc={name,args};if(name==='create_production_book_order_v3'){if(simulateMissingV3Rpc)return {data:null,error:{code:'42883',message:'function create_production_book_order_v3(jsonb, jsonb, jsonb, jsonb) does not exist'}};return {data:{id:'40000000-0000-4000-8000-000000000001',order_number:'PL-2026-0007'},error:null}}if(name==='create_production_book_order')return {data:{id:'40000000-0000-4000-8000-000000000099',order_number:'PL-2026-0099'},error:null};return {data:'ARCHIVED',error:null}}};

global.document={
  querySelector(){return null},
  querySelectorAll(){return[]},
  getElementById(id){
    if(id==='bookOrderNotes')return {value:''};
    if(id==='createBookOrderButton')return {disabled:false,textContent:''};
    return null
  }
};
global.window={
  App:{},
  confirm:()=>true,
  open:()=>({document:{write(){},open(){},close(){}},print(){},close(){}}),
  PurpleBookProductionContext:{
    state,client,
    escapeHTML:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;'),
    fmtDate:value=>value,
    appIcon:name=>`<svg data-icon="${name}"></svg>`,
    renderPage(){},modal(html){modalHtml=html},closeModal(){},toast(){},async logAudit(){}
  }
};

require('../modules/book-production.js');

(async()=>{
  state.bookProduction.loaded=false;
  simulateMissingRecipients=true;
  await window.PurpleBookProduction.load(true);
  assert.equal(state.bookProduction.error,'');
  assert.deepEqual(state.bookProduction.recipients,[]);
  state.bookProduction.loaded=true;
  simulateMissingRecipients=false;

  let html=window.PurpleBookProduction.render();
assert.match(html,/CONNECT/);
assert.match(html,/170 páginas/);
assert.match(html,/Padrão Livros Purple/);
assert.match(html,/SEM PÁGINAS/);
assert.doesNotMatch(html,/largura/i);

window.App.editProductionBook(bookA);
assert.match(modalHtml,/Quantidade de páginas/);
assert.match(modalHtml,/Padrão gráfico/);
assert.match(modalHtml,/production-book-override hidden/);

window.App.startBookOrder();
html=window.PurpleBookProduction.render();
assert.match(html,/Qual é a origem deste pedido/);
assert.match(html,/Reposição de estoque/);
assert.match(html,/Por turma/);
assert.match(html,/Alunos específicos/);

window.App.setBookOrderSource('CLASS');
window.App.bookOrderNext();
window.App.toggleBookOrderClass('class-discover-1',true);
window.App.toggleBookOrderClass('class-discover-2',true);
assert.equal(state.bookProduction.wizard.students.length,4);
assert.equal(state.bookProduction.wizard.selectedStudentIds.length,0);
window.App.bookOrderNext();
assert.equal(state.bookProduction.wizard.selectedStudentIds.length,4);
html=window.PurpleBookProduction.render();
assert.match(html,/4 aluno\(s\) único\(s\)/);
window.App.updateBookOrderStudent('','student-bia','included',false);
assert.equal(state.bookProduction.wizard.selectedStudentIds.length,3);
window.App.bookOrderNext();
window.App.toggleBookOrderBook(bookA,true);
window.App.toggleBookOrderBook(bookB,true);
html=window.PurpleBookProduction.render();
assert.match(html,/CONNECT/);
assert.match(html,/estoque zerado/);
assert.match(html,/DISCOVER/);
assert.match(html,/estoque baixo/);
window.App.bookOrderNext();
window.App.updateBookOrderQuantity(bookA,'extraQuantity','2');
window.App.updateBookOrderQuantity(bookB,'studentQuantity','5');
window.App.updateBookOrderQuantity(bookB,'extraQuantity','1');
window.App.bookOrderNext();
html=window.PurpleBookProduction.render();
assert.match(html,/2 reserva/);
assert.match(html,/6 exemplares/);
assert.match(html,/Parcelamento para o PDF/);
assert.match(html,/30 dias/);
assert.match(html,/Rua Barberina Girle Cunha, 71 - Campo Grande, Cariacica - ES, 29146-206/);
await window.App.saveBookOrder('DRAFT');
  assert.equal(capturedRpc.name,'create_production_book_order_v3');
  assert.equal(capturedRpc.args.p_order.order_source,'CLASS');
  assert.equal(capturedRpc.args.p_classes.length,2);
  assert.equal(capturedRpc.args.p_items.length,2);
  assert.equal(capturedRpc.args.p_recipients.length,3);
  assert.match(capturedRpc.args.p_order.notes,/\[purple-production-meta\]/);
  assert.match(capturedRpc.args.p_order.notes,/"payment_term_days":30/);
  assert.match(capturedRpc.args.p_order.notes,/Barberina Girle Cunha/);

  window.App.startBookOrder();
  window.App.setBookOrderSource('STOCK');
  window.App.bookOrderNext();
  window.App.toggleBookOrderBook(bookA,true);
  window.App.bookOrderNext();
  window.App.updateBookOrderQuantity(bookA,'totalQuantity','20');
  window.App.bookOrderNext();
  html=window.PurpleBookProduction.render();
  assert.match(html,/Nenhuma turma vinculada/);
  assert.match(html,/Nenhum aluno vinculado/);
  simulateMissingV3Rpc=true;
  await window.App.saveBookOrder('DRAFT');
  assert.equal(capturedRpc.name,'create_production_book_order');
  assert.equal(capturedRpc.args.p_classes.length,0);
  assert.equal(capturedRpc.args.p_items[0].extra_quantity,20);
  simulateMissingV3Rpc=false;
  const pdfOrder={id:'order-pdf',order_number:'PL-2026-0099',order_date:'2026-08-19',period_label:'Produção agosto/2026',status:'REVIEWED',notes:capturedRpc.args.p_order.notes,order_source:'STOCK'};
  state.bookProduction.orders=[pdfOrder];
  state.bookProduction.items=[{id:'item-pdf',order_id:'order-pdf',book_id:bookA,book_name_snapshot:'CONNECT',student_quantity:0,extra_quantity:20,total_quantity:20}];
  html=window.PurpleBookProduction.pdfDocument(pdfOrder);
  assert.match(html,/30 dias/);
  assert.match(html,/Rua Barberina Girle Cunha, 71 - Campo Grande, Cariacica - ES, 29146-206/);
  assert.doesNotMatch(html,/>Alunos</);
  assert.doesNotMatch(html,/>Reserva</);
  assert.match(html,/Especificações padrão/);
  assert.match(html,/Acabamento e observações/);
  assert.match(html,/Resumo técnico consolidado para gráfica/);

  window.App.startBookOrder();
  window.App.setBookOrderSource('STUDENT');
  window.App.bookOrderNext();
  window.App.updateBookOrderStudent('','student-ana','included',true);
  window.App.updateBookOrderStudent('','student-caio','included',true);
  assert.equal(state.bookProduction.wizard.selectedStudentIds.length,2);
  window.App.bookOrderNext();
  window.App.toggleBookOrderBook(bookA,true);
  window.App.bookOrderNext();
  window.App.bookOrderNext();
  await window.App.saveBookOrder('DRAFT');
  assert.equal(capturedRpc.args.p_order.order_source,'STUDENT');
  assert.equal(capturedRpc.args.p_recipients.length,2);

  tables.production_book_orders.push({id:'order-edit',order_number:'PL-2026-0010',order_date:'2026-08-20',period_label:'Produção agosto de 2026',notes:'observação existente',status:'DRAFT',order_source:'STOCK'});
  tables.production_book_order_items.push({id:'order-edit-item',order_id:'order-edit',book_id:bookA,book_name_snapshot:'CONNECT',student_quantity:0,extra_quantity:5,total_quantity:5});
  state.bookProduction.orders=tables.production_book_orders;
  state.bookProduction.items=tables.production_book_order_items;
  state.bookProduction.tab='orders';
  state.bookProduction.wizard=null;
  html=window.PurpleBookProduction.render();
  assert.match(html,/Alterar/);
  assert.match(html,/Excluir/);
  window.App.editBookOrder('order-edit');
  assert.equal(state.bookProduction.wizard.editingOrderId,'order-edit');
  assert.equal(state.bookProduction.wizard.bookIds[0],bookA);
  await window.App.hideBookOrder('order-edit');
  assert.match(tables.production_book_orders.find(row=>row.id==='order-edit').notes,/"hidden":true/);
  console.log('book-production workflow smoke test ok');
})().catch(error=>{console.error(error);process.exitCode=1});
