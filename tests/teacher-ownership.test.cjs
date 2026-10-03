const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
const ctx=vm.createContext({State:{db:{},user:null},Date,console,readLocalCatalogCache:()=>({twr:{version:'manual-empty-v2',routines:[]}}),usingLocalDiagnosticMode:()=>false,Bootstrap:{},defaultDB:()=>({})});
for(const name of ['catalogMatchToken','cloneValue','personNameKey','personNamesMatch','resolveTeacherRecordForUser','teacherIdentityIds','classTeacherMatches','resolveTeacherIdForUser','sanitizeTeacherDb','mergeLocalTwrCache']){
  const start=source.indexOf(`function ${name}(`),end=source.indexOf('\nfunction ',start+1);
  vm.runInContext(source.slice(start,end),ctx);
}
const ana={id:'ana-user',name:'ANA LAURA VIANA',email:'ana@test',role:'teacher',permissions:{}};
const dayana={id:'dayana-user',name:'DAYANA NASCIMENTO',email:'dayana@test',role:'teacher',permissions:{}};
const db={settings:{userTeacherLinks:{'dayana-user':'ana'}},users:[ana,dayana],teachers:[
  {id:'ana',name:'ANA LAURA',userId:ana.id,legacyId:'ana-old'},
  {id:'dayana',name:'DAYANA NASCIMENTO',supabaseId:'dayana-uuid'}
],classes:[
  {id:'ana-class',teacherId:'ana'},
  {id:'dayana-class',teacherId:'dayana-uuid'},
  {id:'conflict',teacherId:'ana',teacherName:'DAYANA NASCIMENTO'},
  {id:'unassigned',teacherId:''}
],students:[],twr:{version:'manual-empty-v2',routines:[{id:'a',teacherId:'ana'},{id:'d',teacherId:'dayana'},{id:'du',teacherId:dayana.id}],events:[],exceptions:[]}};
ctx.State.db=db;ctx.State.user=dayana;
assert.equal(ctx.resolveTeacherIdForUser(dayana),'dayana','Stale settings cannot link Dayana to a teacher explicitly linked to Ana');
assert.equal(ctx.personNamesMatch('ANA LAURA','ANA BEATRIZ'),false);
assert.equal(ctx.personNamesMatch('ANA LAURA','ANA LAURA VIANA'),true);
assert.equal(ctx.classTeacherMatches(db.classes[2],db.teachers[1]),false,'Explicit ID wins over a contradictory name');
const safe=ctx.sanitizeTeacherDb(db,dayana);
assert.deepEqual(Array.from(safe.classes,c=>c.id),['dayana-class']);
assert.deepEqual(Array.from(safe.twr.routines,r=>r.id),['d','du'],'Legacy teacher and login IDs refer to the same owner');
const anaSafe=ctx.sanitizeTeacherDb(db,ana);
assert.deepEqual(Array.from(anaSafe.classes,c=>c.id),['ana-class','conflict']);
assert.deepEqual(Array.from(anaSafe.twr.routines,r=>r.id),['a']);
const unlinked={id:'none',name:'Unknown',email:'',role:'teacher',permissions:{}};
assert.equal(ctx.resolveTeacherRecordForUser(unlinked,db),null,'Empty emails must not match empty teacher emails');
assert.equal(ctx.sanitizeTeacherDb(db,unlinked).classes.length,0,'Unlinked user sees no classes');
const ambiguous={...db,teachers:[{id:'x',name:'ANA LAURA SILVA'},{id:'y',name:'ANA LAURA SOUZA'}],settings:{}};
assert.equal(ctx.resolveTeacherRecordForUser({...ana,name:'ANA LAURA'},ambiguous),null,'Ambiguous abbreviated names fail closed');
const remote={twr:{version:'manual-empty-v2',routines:[{id:'fresh'}]}};
ctx.mergeLocalTwrCache(remote);
assert.equal(remote.twr.routines[0].id,'fresh','Local cache cannot replace the remote schedule');
console.log('PASS: stale link, exact aliases, conflicting assignment, own TWR, unlinked and ambiguous users, remote cache priority.');
