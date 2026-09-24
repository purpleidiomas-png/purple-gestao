(function(){
  'use strict';

  const MODULES=window.RapidModules||[];

  const state={client:null,session:null,profile:null,isAdmin:false,adminMode:false,enrollment:null,progress:{},microclass:null,media:{},view:'dashboard',currentModule:null,quizAnswers:{},adminTab:'teachers',teacherRows:[],adminData:null,previewMode:false};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const firstName=name=>String(name||'Teacher').trim().split(/\s+/)[0]||'Teacher';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const fmtDate=value=>value?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)):'—';
  const nowIso=()=>new Date().toISOString();
  const moduleByKey=key=>MODULES.find(m=>m.key===key);
  const progressFor=key=>state.progress[key]||null;
  const isDone=key=>progressFor(key)?.status==='completed';
  const completedCount=()=>MODULES.filter(m=>isDone(m.key)).length;
  const coursePercent=()=>Math.round((completedCount()/MODULES.length)*100);
  const averageScore=()=>{const scores=Object.values(state.progress).map(p=>Number(p.score)).filter(Number.isFinite);return scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0};
  const isUnlocked=index=>index===0||MODULES.slice(0,index).every(m=>isDone(m.key));
  const nextModule=()=>MODULES.find((m,i)=>!isDone(m.key)&&isUnlocked(i))||MODULES[MODULES.length-1];
  const moduleStatus=(m,i)=>{const p=progressFor(m.key);if(p?.status==='completed')return ['Concluído','done'];if(p?.status==='review')return ['Revisar','review'];if(p?.status==='in_progress')return ['Em andamento','progress'];if(!isUnlocked(i))return ['Bloqueado','todo'];return ['Disponível','todo']};

  function toast(message,type='ok'){
    const el=$('toast');if(!el)return;el.textContent=message;el.className=`rapid-toast show ${type==='error'?'error':''}`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='rapid-toast',3200);
  }
  function setLoading(container=true){if(container)$('rapidContent').innerHTML='<div class="loading-block"><div><div class="spinner"></div>Carregando Purple Academy…</div></div>'}
  function modal(html){$('rapidModalRoot').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)Rapid.closeModal()"><div class="modal-card">${html}</div></div>`}
  function closeModal(){$('rapidModalRoot').innerHTML=''}

  async function init(){
    bindGlobalEvents();
    try{
      state.client=window.PurpleCore?.supabase?.getClient?.()||window.supabase.createClient(window.PurpleAuthConfig.supabaseUrl,window.PurpleAuthConfig.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,storage:localStorage,storageKey:'purple-gestao-auth'}});
      const {data}=await state.client.auth.getSession();
      if(data?.session){state.session=data.session;await loadUser();}else showLogin();
      state.client.auth.onAuthStateChange(async(event,session)=>{if(event==='SIGNED_OUT'){resetState();showLogin()}else if(session&&!state.profile){state.session=session;await loadUser()}});
    }catch(error){console.error(error);showLogin();showLoginError('Não foi possível iniciar a Purple Academy. Atualize a página e tente novamente.')}
  }

  function bindGlobalEvents(){
    $('rapidLoginForm').addEventListener('submit',async e=>{e.preventDefault();await login()});
    $('togglePassword').addEventListener('click',()=>{const input=$('rapidPassword');input.type=input.type==='password'?'text':'password';$('togglePassword').textContent=input.type==='password'?'Ver':'Ocultar'});
    $('rapidLogout').addEventListener('click',logout);
    $('rapidMenuButton').addEventListener('click',()=>toggleSidebar(true));
    $('rapidSidebarBackdrop').addEventListener('click',()=>toggleSidebar(false));
    $('adminModeButton').addEventListener('click',()=>{state.adminMode=!state.adminMode;state.view=state.adminMode?'admin':'dashboard';renderApp()});
  }

  async function login(){
    const email=$('rapidEmail').value.trim().toLowerCase(),password=$('rapidPassword').value,button=$('rapidLoginButton');
    $('rapidLoginError').classList.add('hidden');button.disabled=true;button.textContent='Entrando…';
    try{
      const {data,error}=await state.client.auth.signInWithPassword({email,password});if(error)throw error;state.session=data.session;await loadUser();
    }catch(error){console.error(error);showLoginError('E-mail ou senha inválidos, ou seu acesso ainda não foi liberado.')}
    finally{button.disabled=false;button.textContent='Entrar na Purple Academy'}
  }
  function showLoginError(message){const el=$('rapidLoginError');el.textContent=message;el.classList.remove('hidden')}
  function showLogin(){$('rapidLogin').classList.remove('hidden');$('rapidApp').classList.add('hidden')}
  async function logout(){try{await state.client.auth.signOut()}catch{}resetState();showLogin()}
  function resetState(){Object.assign(state,{session:null,profile:null,isAdmin:false,adminMode:false,enrollment:null,progress:{},microclass:null,media:{},view:'dashboard',currentModule:null,quizAnswers:{},teacherRows:[],adminData:null})}

  async function loadUser(){
    const user=state.session?.user;if(!user)return showLogin();
    const {data:profile,error}=await state.client.from('profiles').select('id,name,email,role,sector,active,job_title,must_change_password').eq('id',user.id).single();
    if(error||!profile?.active){showLoginError('Seu perfil não está ativo para acessar a Purple Academy.');await state.client.auth.signOut();return}
    state.profile=profile;state.isAdmin=profile.role==='direction';state.adminMode=state.isAdmin;
    $('rapidLogin').classList.add('hidden');$('rapidApp').classList.remove('hidden');$('rapidUserName').textContent=profile.name;$('rapidUserRole').textContent=profile.role==='direction'?'Direção':'Teacher';$('rapidAvatar').textContent=(profile.name||'P')[0].toUpperCase();
    if(state.isAdmin)$('adminModeButton').classList.remove('hidden');else $('adminModeButton').classList.add('hidden');
    setLoading();await loadMedia();
    if(state.adminMode){state.view='admin';await loadAdminData()}else{await loadTeacherData();state.view='dashboard'}
    renderApp();
  }

  async function loadMedia(){
    const {data,error}=await state.client.from('rapid_module_media').select('*');
    if(error){if(String(error.message||'').includes('rapid_module_media'))console.warn('R.A.P.I.D. migration ainda não aplicada.',error);return}
    state.media=Object.fromEntries((data||[]).map(row=>[row.module_key,row]));
  }

  async function loadTeacherData(){
    if(!state.profile)return;
    const {data:enrollment,error}=await state.client.from('rapid_enrollments').select('*').eq('teacher_id',state.profile.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error){console.warn(error);state.enrollment=null;state.progress={};return}
    state.enrollment=enrollment||null;state.progress={};state.microclass=null;
    if(!enrollment)return;
    const [{data:progress},{data:micro}]=await Promise.all([
      state.client.from('rapid_module_progress').select('*').eq('enrollment_id',enrollment.id),
      state.client.from('rapid_microclasses').select('*').eq('enrollment_id',enrollment.id).maybeSingle()
    ]);
    state.progress=Object.fromEntries((progress||[]).map(row=>[row.module_key,row]));state.microclass=micro||null;
  }

  async function loadAdminData(){
    setLoading();
    const [{data:enrollments,error:e1},{data:profiles,error:e2},{data:progress,error:e3},{data:microclasses,error:e4}]=await Promise.all([
      state.client.from('rapid_enrollments').select('*').order('created_at',{ascending:false}),
      state.client.from('profiles').select('id,name,email,role,active,job_title').eq('role','teacher').order('name'),
      state.client.from('rapid_module_progress').select('*'),
      state.client.from('rapid_microclasses').select('*').order('created_at',{ascending:false})
    ]);
    const firstError=e1||e2||e3||e4;if(firstError){console.error(firstError);state.adminData={error:firstError.message};state.teacherRows=[];return}
    const profileMap=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
    state.adminData={enrollments:enrollments||[],profiles:profiles||[],progress:progress||[],microclasses:microclasses||[]};
    state.teacherRows=(enrollments||[]).map(en=>{
      const pp=(progress||[]).filter(p=>p.enrollment_id===en.id),done=pp.filter(p=>p.status==='completed'),scores=pp.map(p=>Number(p.score)).filter(Number.isFinite),micro=(microclasses||[]).find(m=>m.enrollment_id===en.id);
      return {enrollment:en,teacher:profileMap[en.teacher_id]||{id:en.teacher_id,name:'Professor',email:'—'},progress:pp,done:done.length,percent:Math.round((done.length/MODULES.length)*100),avg:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0,micro};
    });
  }

  function renderApp(){
    renderNav();toggleSidebar(false);
    $('adminModeButton').textContent=state.adminMode?'Ver experiência do professor':'Painel Gestão';
    if(state.adminMode)return renderAdmin();
    if(state.view==='module'&&state.currentModule)return renderModule(state.currentModule);
    if(state.view==='certificate')return renderCertificate();
    renderDashboard();
  }

  function renderNav(){
    const nav=$('rapidNav');
    if(state.adminMode){nav.innerHTML=`<div class="nav-section">Gestão R.A.P.I.D.</div><button class="nav-link ${state.view==='admin'?'active':''}" onclick="Rapid.adminTab('teachers')"><span>◫</span>Professores</button><button class="nav-link" onclick="Rapid.adminTab('microclasses')"><span>▶</span>Microaulas</button><button class="nav-link" onclick="Rapid.adminTab('content')"><span>✦</span>Conteúdo & vídeos</button>`;return}
    nav.innerHTML=`<div class="nav-section">Minha certificação</div><button class="nav-link ${state.view==='dashboard'?'active':''}" onclick="Rapid.go('dashboard')"><span>⌂</span>Minha jornada</button><button class="nav-link ${state.view==='certificate'?'active':''}" onclick="Rapid.go('certificate')"><span>◇</span>Certificação</button><div class="nav-section">Módulos</div>${MODULES.map((m,i)=>`<button class="nav-link ${state.currentModule===m.key&&state.view==='module'?'active':''}" onclick="Rapid.openModule('${m.key}')"><span>${esc(m.letter)}</span>${m.number} • ${esc(m.title)}</button>`).join('')}`;
  }

  function setTopbar(title,breadcrumb='Purple Academy'){$('rapidPageTitle').textContent=title;$('rapidBreadcrumb').textContent=breadcrumb}
  function go(view){state.view=view;state.currentModule=null;renderApp()}
  function toggleSidebar(open){$('rapidSidebar').classList.toggle('open',!!open);$('rapidSidebarBackdrop').classList.toggle('show',!!open)}

  function renderDashboard(){
    setTopbar('Minha jornada','R.A.P.I.D. Teacher Certification');
    if(!state.enrollment){$('rapidContent').innerHTML=`<div class="hero-card"><div class="empty-state"><b>Seu treinamento ainda não foi atribuído.</b><span>Seu acesso está ativo, mas a Direção ainda precisa vincular a trilha R.A.P.I.D. ao seu perfil.</span></div></div>`;return}
    const percent=coursePercent(),next=nextModule(),due=state.enrollment.due_date;
    $('rapidContent').innerHTML=`
      ${state.profile.must_change_password?'<div class="content-card" style="border-color:rgba(255,215,106,.2);margin-bottom:14px"><b>Primeiro acesso</b><p style="margin:4px 0 0;color:var(--muted)">Sua senha está marcada como temporária. Faça a troca pelo Purple Gestão assim que possível.</p></div>':''}
      <div class="hero-card"><div class="hero-grid"><div><span class="eyebrow">SUA JORNADA</span><h1>Olá, ${esc(firstName(state.profile.name))}.<br/>Vamos colocar o método em prática.</h1><p>Avance módulo a módulo, teste suas decisões e finalize com uma microaula avaliada pela coordenação pedagógica.</p><div class="hero-actions"><button class="btn primary" onclick="Rapid.openModule('${next.key}')">${percent?'Continuar treinamento':'Começar agora'} →</button><button class="btn ghost" onclick="Rapid.go('certificate')">Ver certificação</button></div></div><div class="progress-orb" style="--progress:${percent}%"><div class="progress-orb-inner"><div><b>${percent}%</b><span>concluído</span></div></div></div></div></div>
      <div class="metrics-grid"><div class="metric"><span>Módulos</span><b>${completedCount()}/${MODULES.length}</b><small>trilha concluída</small></div><div class="metric"><span>Média dos checkpoints</span><b>${averageScore()||'—'}${averageScore()?'%':''}</b><small>mínimo 80%</small></div><div class="metric"><span>Prazo</span><b style="font-size:20px">${fmtDate(due)}</b><small>${due&&new Date(due)<new Date()?'prazo encerrado':'data de conclusão'}</small></div><div class="metric"><span>Microaula</span><b style="font-size:20px">${state.microclass?statusLabel(state.microclass.status):'Pendente'}</b><small>etapa prática final</small></div></div>
      <div class="section-head"><div><h2>Seu mapa R.A.P.I.D.</h2><p>Cada dimensão fica verde quando o módulo correspondente é concluído.</p></div></div>
      <div class="rapid-letters">${['real-life','active','personalized','interactive','feedback'].map((key,i)=>{const m=moduleByKey(key);return `<div class="letter-card ${isDone(key)?'completed':''}"><b>${m.letter}</b><span>${esc(m.title)}</span></div>`}).join('')}</div>
      <div class="section-head"><div><h2>Trilha completa</h2><p>10 módulos curtos, aplicados e sequenciais.</p></div><span class="pill progress">aprox. 2h40 + microaula</span></div>
      <div class="module-grid">${MODULES.map(renderModuleCard).join('')}</div>`;
  }

  function renderModuleCard(m,i){const [label,cls]=moduleStatus(m,i),p=progressFor(m.key),locked=!isUnlocked(i);return `<article class="module-card ${locked?'locked':''}"><span class="module-num">MÓDULO ${m.number} • ${esc(m.duration)}</span><div class="module-letter">${esc(m.letter)}</div><h3>${esc(m.title)}</h3><p>${esc(m.subtitle)}</p><div class="module-footer"><span class="pill ${cls}">${label}${p?.score!=null?` • ${Math.round(p.score)}%`:''}</span><button class="btn ghost small" ${locked?'disabled':''} onclick="Rapid.openModule('${m.key}')">Abrir</button></div></article>`}

  async function openModule(key){
    const idx=MODULES.findIndex(m=>m.key===key);if(idx<0)return;if(!state.adminMode&&!isUnlocked(idx)){toast('Conclua o módulo anterior para continuar.','error');return}
    state.adminMode=false;state.view='module';state.currentModule=key;
    if(state.enrollment&&!progressFor(key)){await saveProgress(key,{status:'in_progress',progress_percent:20,started_at:nowIso()},{silent:true})}
    renderApp();window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderModule(key){
    const m=moduleByKey(key),idx=MODULES.findIndex(x=>x.key===key),p=progressFor(key),answers=state.quizAnswers[key]||{},media=state.media[key];
    setTopbar(m.title,`Módulo ${m.number} • ${m.duration}`);
    $('rapidContent').innerHTML=`
      <div class="content-card"><div class="module-header"><div><span class="eyebrow">MÓDULO ${m.number}</span><h1>${esc(m.title)}</h1><p>${esc(m.subtitle)}</p></div><div class="module-badge">${esc(m.letter)}</div></div>
      ${renderVideo(media,m)}</div>
      <div class="content-card"><div class="quote">${esc(m.quote)}</div><div class="section-head"><div><h2>O que você precisa levar para a sala</h2></div></div><div class="learning-grid">${m.principles.map(([t,d])=>`<div class="principle-box"><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join('')}</div></div>
      <div class="content-card"><span class="eyebrow">R.A.P.I.D. THINKING</span><div class="case-card" style="margin-top:10px"><h3>${esc(m.caseStudy.prompt)}</h3><div class="choice-list">${m.caseStudy.options.map((opt,i)=>`<button class="choice ${answers.case===i?(i===m.caseStudy.correct?'correct':'wrong'):''}" onclick="Rapid.chooseCase('${m.key}',${i})">${String.fromCharCode(65+i)}. ${esc(opt)}</button>`).join('')}</div>${answers.case!=null?`<div class="feedback-box">${answers.case===m.caseStudy.correct?'✓ Boa decisão. ':'↻ Reavalie. '}${esc(m.caseStudy.feedback)}</div>`:''}</div></div>
      <div class="content-card"><span class="eyebrow">CHECKPOINT ${m.number}</span><div class="section-head"><div><h2>Teste suas decisões</h2><p>Você precisa de 80% ou mais para liberar o próximo módulo.</p></div>${p?.score!=null?`<span class="pill ${p.status==='completed'?'done':'review'}">Última nota: ${Math.round(p.score)}%</span>`:''}</div>${m.quiz.map((q,qi)=>renderQuestion(m,qi,q,answers[qi])).join('')}<div class="quiz-actions"><button class="btn ghost" onclick="Rapid.go('dashboard')">← Voltar para a jornada</button><button class="btn primary" onclick="Rapid.submitQuiz('${m.key}')">Corrigir checkpoint</button></div></div>
      ${m.key==='certification'?renderMicroclassBlock():''}
      <div class="quiz-actions"><span></span>${idx<MODULES.length-1&&isDone(m.key)?`<button class="btn secondary" onclick="Rapid.openModule('${MODULES[idx+1].key}')">Próximo módulo →</button>`:''}</div>`;
  }

  function renderVideo(media,m){
    const url=String(media?.video_url||'').trim();if(!url)return `<div class="video-shell"><div class="video-placeholder"><div class="play">▶</div><b>Vídeo da Direção</b><p>${esc(media?.video_title||videoPrompt(m.key))}</p><span class="pill todo">conteúdo em preparação</span></div></div>`;
    const embed=embedUrl(url);if(/\.mp4($|\?)/i.test(url))return `<div class="video-shell"><video controls preload="metadata" src="${esc(url)}"></video></div>`;
    return `<div class="video-shell"><iframe src="${esc(embed)}" title="${esc(media?.video_title||m.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  function videoPrompt(key){return ({welcome:'Uma mensagem curta sobre o que você espera de quem ensina na Purple.',foundations:'Por que o R.A.P.I.D. existe e o que ele muda na prática.',feedback:'Como corrigir sem reduzir confiança e participação.','purple-class':'Como deve ser a sensação de uma aula Purple.',certification:'Mensagem final antes da microaula.'}[key]||'Exemplo prático do princípio aplicado em sala.')}
  function embedUrl(url){try{const u=new URL(url);if(u.hostname.includes('youtu.be'))return `https://www.youtube.com/embed/${u.pathname.replace('/','')}`;if(u.hostname.includes('youtube.com')){const id=u.searchParams.get('v');if(id)return `https://www.youtube.com/embed/${id}`;if(u.pathname.includes('/embed/'))return url}if(u.hostname.includes('vimeo.com'))return `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean).pop()}`;return url}catch{return url}}
  function renderQuestion(m,qi,q,selected){return `<div class="case-card" style="margin-bottom:12px"><span class="pill todo">Questão ${qi+1}</span><h3>${esc(q.q)}</h3><div class="choice-list">${q.o.map((opt,oi)=>`<button class="choice ${selected===oi?(oi===q.a?'correct':'wrong'):''}" onclick="Rapid.chooseAnswer('${m.key}',${qi},${oi})">${String.fromCharCode(65+oi)}. ${esc(opt)}</button>`).join('')}</div>${selected!=null?`<div class="feedback-box">${selected===q.a?'✓ ': '↻ '}${esc(q.f)}</div>`:''}</div>`}
  function chooseCase(key,index){state.quizAnswers[key]=state.quizAnswers[key]||{};state.quizAnswers[key].case=index;renderModule(key)}
  function chooseAnswer(key,question,index){state.quizAnswers[key]=state.quizAnswers[key]||{};state.quizAnswers[key][question]=index;renderModule(key)}

  async function submitQuiz(key){
    if(!state.enrollment){toast('Treinamento ainda não atribuído.','error');return}
    const m=moduleByKey(key),answers=state.quizAnswers[key]||{};if(m.quiz.some((_,i)=>answers[i]==null)){toast('Responda todas as questões antes de corrigir.','error');return}
    const correct=m.quiz.filter((q,i)=>answers[i]===q.a).length,score=Math.round((correct/m.quiz.length)*100),passed=score>=80;
    await saveProgress(key,{status:passed?'completed':'review',progress_percent:passed?100:65,score,answers:{quiz:m.quiz.map((q,i)=>({selected:answers[i],correct:q.a})),case:answers.case},completed_at:passed?nowIso():null});
    modal(`<div class="modal-head"><div><span class="eyebrow">CHECKPOINT</span><h2>${passed?'Módulo concluído':'Revise e tente novamente'}</h2></div><button class="modal-close" onclick="Rapid.closeModal()">×</button></div><div class="score-card"><span class="eyebrow">SUA NOTA</span><b>${score}%</b><p>${passed?'Você demonstrou compreensão suficiente para avançar.':'A meta é 80%. Releia os feedbacks das questões e faça uma nova tentativa.'}</p></div><div class="quiz-actions"><button class="btn ghost" onclick="Rapid.closeModal()">Fechar</button>${passed&&MODULES.indexOf(m)<MODULES.length-1?`<button class="btn primary" onclick="Rapid.closeModal();Rapid.openModule('${MODULES[MODULES.indexOf(m)+1].key}')">Próximo módulo →</button>`:''}</div>`);
    renderNav();
  }

  async function saveProgress(key,patch,{silent=false}={}){
    if(!state.enrollment)return;
    const current=progressFor(key)||{},payload={enrollment_id:state.enrollment.id,module_key:key,status:patch.status||current.status||'in_progress',progress_percent:patch.progress_percent??current.progress_percent??20,score:patch.score??current.score??null,answers:patch.answers??current.answers??{},started_at:patch.started_at??current.started_at??nowIso(),completed_at:patch.completed_at!==undefined?patch.completed_at:current.completed_at??null};
    const {data,error}=await state.client.from('rapid_module_progress').upsert(payload,{onConflict:'enrollment_id,module_key'}).select().single();
    if(error){console.error(error);if(!silent)toast('Não foi possível salvar seu progresso.','error');return}
    state.progress[key]=data;if(!silent)toast('Progresso salvo.');
  }

  function renderMicroclassBlock(){
    const m=state.microclass;if(m)return `<div class="content-card"><span class="eyebrow">MICROCLASS • ETAPA PRÁTICA</span><div class="section-head"><div><h2>Microaula enviada</h2><p>Status: ${statusLabel(m.status)} • enviada em ${fmtDate(m.created_at)}</p></div><span class="pill ${m.status==='approved'?'done':m.status==='changes_requested'?'review':'progress'}">${statusLabel(m.status)}</span></div>${m.reviewer_notes?`<div class="feedback-box"><b>Feedback da coordenação</b><br/>${esc(m.reviewer_notes)}</div>`:''}${m.status!=='approved'?`<div class="hero-actions"><button class="btn ghost" onclick="Rapid.openMicroclassForm()">Atualizar envio</button></div>`:''}</div>`;
    return `<div class="content-card"><span class="eyebrow">MICROCLASS • ETAPA PRÁTICA</span><div class="section-head"><div><h2>Envie sua microaula</h2><p>3–5 minutos. Demonstre um conteúdo simples com decisões R.A.P.I.D.</p></div></div><div class="principle-box"><b>Sugestão de prompt</b><p>Teach “I like / I don’t like” (ou conteúdo equivalente) criando conexão real, prática ativa, apoio adequado, interação e feedback.</p></div><div class="hero-actions"><button class="btn primary" onclick="Rapid.openMicroclassForm()">Enviar link da microaula</button></div></div>`;
  }
  function openMicroclassForm(){
    const m=state.microclass||{};modal(`<div class="modal-head"><div><span class="eyebrow">ETAPA PRÁTICA</span><h2>Enviar microaula</h2></div><button class="modal-close" onclick="Rapid.closeModal()">×</button></div><div class="field"><label>Link do vídeo</label><input id="microUrl" type="url" value="${esc(m.submission_url||'')}" placeholder="YouTube não listado, Drive, Loom…" /></div><div class="field"><label>Observação para a coordenação</label><textarea id="microNotes" placeholder="Contexto da aula, perfil do aluno, objetivo…">${esc(m.teacher_notes||'')}</textarea></div><div class="quiz-actions"><button class="btn ghost" onclick="Rapid.closeModal()">Cancelar</button><button class="btn primary" onclick="Rapid.submitMicroclass()">Enviar para avaliação</button></div>`)
  }
  async function submitMicroclass(){
    if(!state.enrollment)return;const url=$('microUrl').value.trim(),notes=$('microNotes').value.trim();if(!url){toast('Informe o link do vídeo.','error');return}
    const payload={enrollment_id:state.enrollment.id,submission_url:url,teacher_notes:notes,status:'submitted',rubric_scores:{},reviewer_id:null,reviewer_notes:null,reviewed_at:null,submitted_at:nowIso()};
    const {data,error}=await state.client.from('rapid_microclasses').upsert(payload,{onConflict:'enrollment_id'}).select().single();if(error){console.error(error);toast('Não foi possível enviar a microaula.','error');return}state.microclass=data;closeModal();toast('Microaula enviada para a coordenação.');renderModule('certification')
  }
  function statusLabel(status){return ({assigned:'Atribuído',in_progress:'Em andamento',review:'Revisar',completed:'Concluído',training_completed:'Treinamento concluído',certified:'Certificado',submitted:'Aguardando avaliação',approved:'Aprovada',changes_requested:'Ajustes solicitados'}[status]||status||'Pendente')}

  function renderCertificate(){
    setTopbar('Certificação','R.A.P.I.D. Teacher Certification');
    if(!state.enrollment){$('rapidContent').innerHTML='<div class="empty-state"><b>Certificação indisponível</b>Seu treinamento ainda não foi atribuído.</div>';return}
    const trainingDone=completedCount()===MODULES.length,microApproved=state.microclass?.status==='approved',certified=trainingDone&&microApproved;
    $('rapidContent').innerHTML=`<div class="hero-card"><div class="admin-hero"><div><span class="eyebrow">CERTIFICATION STATUS</span><h1>${certified?'Você é R.A.P.I.D. Certified.':'Sua certificação está em construção.'}</h1><p>${certified?'Conhecimento e prática validados pela coordenação pedagógica da Purple Idiomas.':'Complete a trilha e tenha sua microaula aprovada para liberar o certificado.'}</p></div><span class="pill ${certified?'done':'progress'}">${certified?'CERTIFICADO':'EM ANDAMENTO'}</span></div></div><div class="metrics-grid"><div class="metric"><span>Trilha</span><b>${coursePercent()}%</b><small>${trainingDone?'concluída':'continue os módulos'}</small></div><div class="metric"><span>Checkpoints</span><b>${averageScore()||'—'}${averageScore()?'%':''}</b><small>média atual</small></div><div class="metric"><span>Microaula</span><b style="font-size:19px">${state.microclass?statusLabel(state.microclass.status):'Pendente'}</b><small>validação prática</small></div><div class="metric"><span>Status final</span><b style="font-size:19px">${certified?'Certificado':'Pendente'}</b><small>R.A.P.I.D.</small></div></div>${certified?`<div class="certificate"><div class="seal">R•A•P•I•D</div><span class="eyebrow">PURPLE IDIOMAS • TEACHER DEVELOPMENT</span><h2>R.A.P.I.D. Teacher Certification</h2><p>Certificamos que <b>${esc(state.profile.name)}</b> concluiu a formação interna no Método R.A.P.I.D., com validação dos conhecimentos e da aplicação prática.</p><p style="color:var(--muted)">Certificação interna Purple Idiomas • ${fmtDate(state.microclass.reviewed_at||new Date())}</p><div class="hero-actions" style="justify-content:center"><button class="btn ghost" onclick="window.print()">Imprimir certificado</button></div></div>`:`<div class="content-card"><div class="section-head"><div><h2>O que falta?</h2></div></div><div class="learning-grid"><div class="principle-box"><b>${trainingDone?'✓':'○'} Trilha de conhecimento</b><p>${trainingDone?'Todos os módulos foram concluídos.':`${completedCount()} de ${MODULES.length} módulos concluídos.`}</p></div><div class="principle-box"><b>${microApproved?'✓':'○'} Microaula aprovada</b><p>${state.microclass?statusLabel(state.microclass.status):'Envie sua microaula no módulo final.'}</p></div></div></div>`}`;
  }

  function renderAdmin(){
    setTopbar('Gestão R.A.P.I.D.','Purple Academy • Administração');
    if(state.adminData?.error){$('rapidContent').innerHTML=`<div class="empty-state"><b>Estrutura do R.A.P.I.D. ainda não está ativa no banco.</b><span>Aplique a migration do módulo e recarregue a página.<br/><small>${esc(state.adminData.error)}</small></span></div>`;return}
    const rows=state.teacherRows,active=rows.filter(r=>r.enrollment.status!=='certified').length,certified=rows.filter(r=>r.enrollment.status==='certified'||(r.done===MODULES.length&&r.micro?.status==='approved')).length,completion=rows.length?Math.round(rows.reduce((a,r)=>a+r.percent,0)/rows.length):0,pending=rows.filter(r=>r.micro?.status==='submitted').length;
    $('rapidContent').innerHTML=`<div class="hero-card"><div class="admin-hero"><div><span class="eyebrow">PURPLE ACADEMY</span><h1>R.A.P.I.D. Training Control</h1><p>Cadastre professores, acompanhe checkpoints e concentre seu tempo onde cada teacher realmente precisa.</p></div><button class="btn primary" onclick="Rapid.openNewTeacher()">+ Cadastrar professor</button></div></div><div class="metrics-grid"><div class="metric"><span>Professores na trilha</span><b>${rows.length}</b><small>${active} em desenvolvimento</small></div><div class="metric"><span>Progresso médio</span><b>${completion}%</b><small>todos os inscritos</small></div><div class="metric"><span>Microaulas pendentes</span><b>${pending}</b><small>aguardando avaliação</small></div><div class="metric"><span>Certificados</span><b>${certified}</b><small>trilha + prática</small></div></div><div class="admin-tabs"><button class="tab ${state.adminTab==='teachers'?'active':''}" onclick="Rapid.adminTab('teachers')">Professores</button><button class="tab ${state.adminTab==='microclasses'?'active':''}" onclick="Rapid.adminTab('microclasses')">Microaulas ${pending?`(${pending})`:''}</button><button class="tab ${state.adminTab==='content'?'active':''}" onclick="Rapid.adminTab('content')">Conteúdo & vídeos</button></div><div id="adminTabContent">${state.adminTab==='teachers'?renderTeachersAdmin():state.adminTab==='microclasses'?renderMicroclassesAdmin():renderContentAdmin()}</div>`;
  }
  function adminTab(tab){state.adminMode=true;state.view='admin';state.adminTab=tab;renderApp()}
  function renderTeachersAdmin(){
    const unassigned=(state.adminData?.profiles||[]).filter(p=>!state.adminData.enrollments.some(e=>e.teacher_id===p.id));
    return `<div class="section-head"><div><h2>Desempenho dos professores</h2><p>Clique em “Detalhes” para ver notas por módulo e feedback.</p></div>${unassigned.length?`<button class="btn ghost small" onclick="Rapid.openAssignExisting()">Atribuir existente (${unassigned.length})</button>`:''}</div>${state.teacherRows.length?`<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Professor</th><th>Progresso</th><th>Média</th><th>Microaula</th><th>Prazo</th><th></th></tr></thead><tbody>${state.teacherRows.map(r=>`<tr><td><div class="person"><div class="avatar">${esc((r.teacher.name||'P')[0].toUpperCase())}</div><div><b>${esc(r.teacher.name)}</b><span>${esc(r.teacher.email)}</span></div></div></td><td><div style="display:flex;align-items:center;gap:9px"><div class="mini-progress"><i style="width:${r.percent}%"></i></div><b>${r.percent}%</b></div></td><td>${r.avg?r.avg+'%':'—'}</td><td><span class="pill ${r.micro?.status==='approved'?'done':r.micro?.status==='submitted'?'progress':r.micro?.status==='changes_requested'?'review':'todo'}">${r.micro?statusLabel(r.micro.status):'Pendente'}</span></td><td>${fmtDate(r.enrollment.due_date)}</td><td><button class="btn ghost small" onclick="Rapid.openTeacher('${r.enrollment.id}')">Detalhes</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><b>Nenhum professor na trilha ainda.</b>Cadastre o primeiro teacher e atribua a certificação R.A.P.I.D.</div>`}`;
  }
  function renderMicroclassesAdmin(){
    const withMicro=state.teacherRows.filter(r=>r.micro);return `<div class="section-head"><div><h2>Microaulas</h2><p>Avaliação R, A, P, I e D em uma única rubrica.</p></div></div>${withMicro.length?`<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Professor</th><th>Envio</th><th>Status</th><th>Score</th><th></th></tr></thead><tbody>${withMicro.map(r=>`<tr><td><div class="person"><div class="avatar">${esc((r.teacher.name||'P')[0])}</div><div><b>${esc(r.teacher.name)}</b><span>${esc(r.teacher.email)}</span></div></div></td><td>${fmtDate(r.micro.submitted_at||r.micro.created_at)}</td><td><span class="pill ${r.micro.status==='approved'?'done':r.micro.status==='changes_requested'?'review':'progress'}">${statusLabel(r.micro.status)}</span></td><td>${microScore(r.micro)||'—'}${microScore(r.micro)?'%':''}</td><td><button class="btn primary small" onclick="Rapid.reviewMicroclass('${r.micro.id}')">${r.micro.status==='submitted'?'Avaliar':'Revisar'}</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><b>Nenhuma microaula enviada.</b>Quando um professor concluir a etapa prática, ela aparecerá aqui.</div>`}`
  }
  function microScore(m){const s=m?.rubric_scores||{};const vals=['r','a','p','i','d'].map(k=>Number(s[k])).filter(Number.isFinite);return vals.length===5?Math.round(vals.reduce((x,y)=>x+y,0)/5):0}
  function renderContentAdmin(){return `<div class="section-head"><div><h2>Vídeos da formação</h2><p>Cole URLs do YouTube, Vimeo ou MP4. O professor verá o vídeo dentro do módulo.</p></div></div><div class="module-grid">${MODULES.map(m=>{const media=state.media[m.key]||{};return `<div class="module-card"><span class="module-num">MÓDULO ${m.number}</span><div class="module-letter" style="font-size:30px">${esc(m.letter)}</div><h3>${esc(m.title)}</h3><div class="field" style="margin-top:14px"><label>Título do vídeo</label><input id="mediaTitle-${m.key}" value="${esc(media.video_title||'')}" placeholder="${esc(videoPrompt(m.key))}" /></div><div class="field"><label>URL</label><input id="mediaUrl-${m.key}" value="${esc(media.video_url||'')}" placeholder="https://…" /></div><button class="btn ghost small" onclick="Rapid.saveMedia('${m.key}')">Salvar vídeo</button></div>`}).join('')}</div>`}
  async function saveMedia(key){const title=$(`mediaTitle-${key}`).value.trim(),url=$(`mediaUrl-${key}`).value.trim(),payload={module_key:key,video_title:title||null,video_url:url||null,updated_by:state.profile.id};const {data,error}=await state.client.from('rapid_module_media').upsert(payload,{onConflict:'module_key'}).select().single();if(error){toast('Não foi possível salvar o vídeo.','error');return}state.media[key]=data;toast('Conteúdo do módulo atualizado.')}

  function openNewTeacher(){
    const password=generatePassword(),defaultDue=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
    modal(`<div class="modal-head"><div><span class="eyebrow">NOVO PROFESSOR</span><h2>Cadastrar e atribuir R.A.P.I.D.</h2></div><button class="modal-close" onclick="Rapid.closeModal()">×</button></div><div class="field-grid"><div class="field"><label>Nome completo</label><input id="newTeacherName" placeholder="Nome do professor" /></div><div class="field"><label>E-mail</label><input id="newTeacherEmail" type="email" placeholder="nome@purpleidiomas.com.br" /></div><div class="field"><label>Senha inicial</label><input id="newTeacherPassword" value="${esc(password)}" /></div><div class="field"><label>Prazo da certificação</label><input id="newTeacherDue" type="date" value="${defaultDue}" /></div></div><div class="principle-box"><b>O que acontece ao cadastrar?</b><p>O sistema cria o acesso como Professor no setor Pedagógico, marca a senha para troca no primeiro acesso e atribui a trilha R.A.P.I.D.</p></div><div class="quiz-actions"><button class="btn ghost" onclick="Rapid.closeModal()">Cancelar</button><button class="btn primary" onclick="Rapid.createTeacher()">Criar professor</button></div>`)
  }
  function generatePassword(){const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);return `Purple!${bytes[0].toString(36).slice(0,4)}${bytes[1].toString(36).slice(0,4)}A1`}
  async function createTeacher(){
    const name=$('newTeacherName').value.trim(),email=$('newTeacherEmail').value.trim().toLowerCase(),password=$('newTeacherPassword').value,due=$('newTeacherDue').value;if(!name||!email||password.length<8){toast('Preencha nome, e-mail e uma senha com pelo menos 8 caracteres.','error');return}
    const button=document.querySelector('.modal-card .btn.primary');button.disabled=true;button.textContent='Criando…';
    try{
      const token=(await state.client.auth.getSession()).data.session?.access_token;if(!token)throw new Error('Sessão expirada.');
      const response=await fetch(`${window.PurpleAuthConfig.supabaseUrl}/functions/v1/admin-manage-user`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'apikey':window.PurpleAuthConfig.supabaseKey},body:JSON.stringify({action:'create',name,email,password,role:'teacher',sector:'pedagogico',access_scope:'own_sector',permissions:{},active:true,job_title:'Teacher',avatar_url:null,must_change_password:true})});
      const result=await response.json();if(!response.ok||!result.profile)throw new Error(result.error||'Falha ao criar professor.');
      const {error}=await state.client.from('rapid_enrollments').insert({teacher_id:result.profile.id,assigned_by:state.profile.id,due_date:due||null,status:'assigned'});if(error)throw error;
      closeModal();await loadAdminData();renderAdmin();toast(`Professor cadastrado. Senha inicial: ${password}`);
    }catch(error){console.error(error);toast(error.message||'Não foi possível cadastrar o professor.','error');button.disabled=false;button.textContent='Criar professor'}
  }
  function openAssignExisting(){
    const available=(state.adminData.profiles||[]).filter(p=>!state.adminData.enrollments.some(e=>e.teacher_id===p.id));const defaultDue=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
    modal(`<div class="modal-head"><div><span class="eyebrow">ATRIBUIR TRILHA</span><h2>Professor existente</h2></div><button class="modal-close" onclick="Rapid.closeModal()">×</button></div><div class="field"><label>Professor</label><select id="existingTeacher">${available.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} • ${esc(p.email)}</option>`).join('')}</select></div><div class="field"><label>Prazo</label><input id="existingDue" type="date" value="${defaultDue}" /></div><div class="quiz-actions"><button class="btn ghost" onclick="Rapid.closeModal()">Cancelar</button><button class="btn primary" onclick="Rapid.assignExisting()">Atribuir R.A.P.I.D.</button></div>`)
  }
  async function assignExisting(){const teacherId=$('existingTeacher').value,due=$('existingDue').value;const {error}=await state.client.from('rapid_enrollments').insert({teacher_id:teacherId,assigned_by:state.profile.id,due_date:due||null,status:'assigned'});if(error){toast(error.message,'error');return}closeModal();await loadAdminData();renderAdmin();toast('Trilha atribuída ao professor.')}

  function openTeacher(enrollmentId){
    const row=state.teacherRows.find(r=>r.enrollment.id===enrollmentId);if(!row)return;
    modal(`<div class="modal-head"><div><span class="eyebrow">DESEMPENHO</span><h2>${esc(row.teacher.name)}</h2><p style="color:var(--muted);margin:4px 0 0">${esc(row.teacher.email)}</p></div><button class="modal-close" onclick="Rapid.closeModal()">×</button></div><div class="metrics-grid" style="grid-template-columns:repeat(3,1fr)"><div class="metric"><span>Progresso</span><b>${row.percent}%</b></div><div class="metric"><span>Média</span><b>${row.avg||'—'}${row.avg?'%':''}</b></div><div class="metric"><span>Microaula</span><b style="font-size:16px">${row.micro?statusLabel(row.micro.status):'Pendente'}</b></div></div><div class="data-table-wrap"><table class="data-table" style="min-width:0"><thead><tr><th>Módulo</th><th>Status</th><th>Nota</th></tr></thead><tbody>${MODULES.map(m=>{const p=row.progress.find(x=>x.module_key===m.key);return `<tr><td>${m.number} • ${esc(m.title)}</td><td><span class="pill ${p?.status==='completed'?'done':p?.status==='review'?'review':p?'progress':'todo'}">${p?statusLabel(p.status):'Não iniciado'}</span></td><td>${p?.score!=null?Math.round(p.score)+'%':'—'}</td></tr>`}).join('')}</tbody></table></div>${row.micro?`<div class="hero-actions"><button class="btn primary" onclick="Rapid.closeModal();Rapid.reviewMicroclass('${row.micro.id}')">Avaliar microaula</button></div>`:''}`)
  }

  function reviewMicroclass(id){
    const row=state.teacherRows.find(r=>r.micro?.id===id);if(!row)return;const m=row.micro,s=m.rubric_scores||{},score=k=>Number.isFinite(Number(s[k]))?Number(s[k]):80;
    modal(`<div class="modal-head"><div><span class="eyebrow">MICROCLASS REVIEW</span><h2>${esc(row.teacher.name)}</h2><p style="margin:4px 0 0"><a href="${esc(m.submission_url)}" target="_blank" rel="noopener" style="color:#cba2ff">Abrir vídeo da microaula ↗</a></p></div><button class="modal-close" onclick="Rapid.closeModal()">×</button></div>${[['r','R','Real-life Connection'],['a','A','Active Learning'],['p','P','Personalized Practice'],['i','I','Interactive Engagement'],['d','D','Dynamic Feedback']].map(([k,l,t])=>`<div class="rubric-row"><b>${l}</b><div><label style="font-size:11px;color:var(--muted)">${t}</label><input id="rubric-${k}" type="range" min="0" max="100" step="5" value="${score(k)}" oninput="document.getElementById('rubricOut-${k}').value=this.value+'%'" /></div><output id="rubricOut-${k}">${score(k)}%</output></div>`).join('')}<div class="field" style="margin-top:16px"><label>Feedback da coordenação</label><textarea id="reviewNotes" placeholder="Pontos fortes, evidências e próximo passo…">${esc(m.reviewer_notes||'')}</textarea></div><div class="field"><label>Decisão</label><select id="reviewStatus"><option value="approved" ${m.status==='approved'?'selected':''}>Aprovar microaula</option><option value="changes_requested" ${m.status==='changes_requested'?'selected':''}>Solicitar ajustes</option></select></div><div class="quiz-actions"><button class="btn ghost" onclick="Rapid.closeModal()">Cancelar</button><button class="btn primary" onclick="Rapid.saveMicroReview('${id}')">Salvar avaliação</button></div>`)
  }
  async function saveMicroReview(id){
    const scores=Object.fromEntries(['r','a','p','i','d'].map(k=>[k,Number($(`rubric-${k}`).value)])),status=$('reviewStatus').value,notes=$('reviewNotes').value.trim();const {data,error}=await state.client.from('rapid_microclasses').update({rubric_scores:scores,status,reviewer_notes:notes,reviewer_id:state.profile.id,reviewed_at:nowIso()}).eq('id',id).select().single();if(error){toast('Não foi possível salvar a avaliação.','error');return}
    const row=state.teacherRows.find(r=>r.micro?.id===id);if(status==='approved'&&row){await state.client.from('rapid_enrollments').update({status:'certified',certified_at:nowIso()}).eq('id',row.enrollment.id)}
    closeModal();await loadAdminData();renderAdmin();toast(status==='approved'?'Microaula aprovada e certificação liberada.':'Feedback salvo e ajustes solicitados.')
  }

  window.Rapid={go,openModule,chooseCase,chooseAnswer,submitQuiz,openMicroclassForm,submitMicroclass,closeModal,adminTab,openNewTeacher,createTeacher,openAssignExisting,assignExisting,openTeacher,reviewMicroclass,saveMicroReview,saveMedia};
  document.addEventListener('DOMContentLoaded',init);
})();
