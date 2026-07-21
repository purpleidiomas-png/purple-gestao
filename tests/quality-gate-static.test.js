const assert=require('node:assert');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
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

console.log('quality gate static test ok');
