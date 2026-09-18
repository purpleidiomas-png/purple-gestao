const assert=require('node:assert');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const lessonPlans=fs.readFileSync('modules/lesson-plans.js','utf8');
const importSchema=fs.readFileSync('docs/LESSON_PLANS_PURPLE_IMPORT_SCHEMA_V1.md','utf8');
const source=`${html}\n${app}`;

const appRefs=[...source.matchAll(/App\.([A-Za-z0-9_]+)/g)].map(match=>match[1]);
const appBlock=app.match(/window\.App=\{([\s\S]*?)\};\nwindow\.AppDiagnostics/);
assert(appBlock, 'window.App deve existir e exportar os handlers globais.');
const exported=new Set();
for(const token of appBlock[1].split(',')){
  const clean=token.trim();
  if(!clean)continue;
  const key=clean.includes(':')?clean.split(':')[0].trim():clean.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/)?.[1];
  if(key)exported.add(key);
}
const missing=[...new Set(appRefs)].filter(name=>!exported.has(name));
assert.deepStrictEqual(missing, [], `Handlers App.* sem exportação: ${missing.join(', ')}`);

const functions=[...app.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)].map(match=>match[1]);
const duplicateFunctions=functions.filter((name,index)=>functions.indexOf(name)!==index);
assert.deepStrictEqual([...new Set(duplicateFunctions)], [], `Funções duplicadas encontradas: ${[...new Set(duplicateFunctions)].join(', ')}`);

assert(!app.includes('function renderFinancialHubLegacy(){')||app.includes('function renderFinancialHub(){'), 'Financeiro novo deve permanecer ativo.');
assert(app.includes('financialEntries'), 'Financeiro deve possuir armazenamento próprio de contas.');
assert(app.includes('setFinancialView'), 'Financeiro deve possuir navegação por áreas separadas.');
assert(app.includes('deleteFinancialEntry'), 'Financeiro deve permitir exclusão lógica autorizada.');
assert(app.includes('renderFinancialLedger'), 'Financeiro deve renderizar contas a receber/pagar em telas próprias.');
assert(app.includes('renderWhatsApp'), 'WhatsApp deve possuir tela própria.');
assert(app.includes('whatsapp.view'), 'WhatsApp deve possuir permissão de visualização.');
assert(app.includes('whatsapp.reply'), 'WhatsApp deve possuir permissão de resposta.');
assert(app.includes('whatsapp.manage'), 'WhatsApp deve possuir permissão de conexão.');
assert(!app.includes('web.whatsapp.com'), 'WhatsApp não deve ser incorporado via WhatsApp Web/iframe.');
assert(html.includes('modules/lesson-plans.js'), 'Lesson Plans deve ser carregado como módulo integrado do app original.');
assert(app.includes('lesson_plans.view'), 'Lesson Plans deve possuir permissão explícita.');
assert(app.includes("teacherAllowedPages"), 'Professor deve possuir restrição real de navegação.');
assert(lessonPlans.includes('collections'), 'Lesson Plans deve suportar coleções como primeiro nível.');
assert(lessonPlans.includes('Purple Way'), 'Lesson Plans deve migrar dados para a coleção Purple Way.');
assert(lessonPlans.includes('Livro digital'), 'Lesson Plans deve possuir contexto de livro digital.');
assert(lessonPlans.includes('Recursos da aula'), 'Lesson Plans deve destacar recursos da aula.');
assert(lessonPlans.includes('Gestão de planejamentos'), 'Dashboard administrativo deve existir como camada de gestão.');
assert(lessonPlans.includes('Como a Purple ensina.'), 'Biblioteca deve ser a experiência principal, não o dashboard administrativo.');
assert(lessonPlans.includes('Capas e livros digitais'), 'Gestão deve incluir operação de capas e PDFs dos livros.');
assert(lessonPlans.includes('Subir capa'), 'Painel de gestor deve oferecer fluxo visual para capa.');
assert(lessonPlans.includes('Zoom da capa'), 'Painel de gestor deve permitir ajuste de enquadramento da capa.');
assert(lessonPlans.includes('Subir arquivo'), 'Professor autorizado deve conseguir iniciar upload de arquivos em recursos.');
assert(lessonPlans.includes('uploadResourceAsset'), 'Upload de recurso deve tentar storage seguro antes de depender de URL manual.');
assert(lessonPlans.includes('pdfStoragePath'), 'Livro digital deve persistir caminho seguro do PDF, não apenas URL temporária.');
assert(lessonPlans.includes('signedStorageUrl'), 'Viewer deve gerar URL assinada atualizada ao abrir PDF do Storage.');
assert(lessonPlans.includes('connectRealBatch'), 'Lesson Plans deve importar o primeiro lote real Connect Units 01-03.');
assert(lessonPlans.includes('meetingArcs'), 'Lesson Plans deve suportar Transition Meeting com Learning Arcs.');
assert(lessonPlans.includes('Teacher Quick View'), 'Lesson Plans deve ter visão rápida para professor usar em aula.');
assert(lessonPlans.includes('basePdf'), 'Lesson Plans deve suportar Plano Base Purple em PDF por Lesson.');
assert(lessonPlans.includes('Atividades Extras'), 'Lesson deve separar atividades extras do Plano Base oficial.');
assert(lessonPlans.includes('Links & Mídia'), 'Lesson deve separar links e mídia dos PDFs internos.');
assert(lessonPlans.includes('assertFile'), 'Uploads de Lesson Plans devem validar tipo, extensão, tamanho e arquivo vazio.');
assert(lessonPlans.includes('PurpleWriteLessonPlansCache?.();return true'), 'Cache local de Lesson Plans deve ser atualizado somente após persistência confirmada.');
assert(importSchema.includes('lesson-plans-purple-import-v1'), 'Contrato de importação v1 deve estar documentado.');
assert(importSchema.includes('Duplicate Protection'), 'Contrato v1 deve descrever proteção contra duplicidade.');

console.log('quality gate static test ok');
