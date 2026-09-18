const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

global.window=global;
vm.runInThisContext(fs.readFileSync('modules/financial-center.js','utf8'),{filename:'financial-center.js'});
const F=global.PurpleFinancial;

assert.equal(F.addMonths('2026-12-10',1),'2027-01-10');
assert.equal(F.addMonths('2027-01-31',1),'2027-02-28');
assert.equal(F.addMonths('2028-01-31',1),'2028-02-29');
assert.equal(F.addMonths('2026-03-30',1),'2026-04-30');
assert.equal(F.addMonths('2026-01-29',1),'2026-02-28');
assert.equal(F.competenceLabel('2026-09-10'),'09/26');
assert.equal(F.description('MENSALIDADE','2026-09-10'),'MENSALIDADE SETEMBRO');
assert.equal(F.description('MATRICULA','2026-09-10'),'MATRÍCULA');

for(const count of [1,2,6,12,24]){
  const rows=F.schedule({count,fullValue:397,punctualValue:295,firstDueDate:'2026-09-10',billingType:'PIX',chargeType:'MENSALIDADE'});
  assert.equal(rows.length,count);
  assert.equal(rows[0].installmentNumber,1);
  assert.equal(rows.at(-1).installmentNumber,count);
  assert.equal(rows.at(-1).installmentTotal,count);
  assert.equal(rows[0].discountValue,102);
}

const pending={status:'pending',dueDate:'2026-09-10',fullValue:397,punctualValue:295,paidAmount:0};
assert.equal(F.status(pending,'2026-09-10'),'pending');
assert.equal(F.decimal(F.dueCents(pending,'2026-09-10')),295);
assert.equal(F.status(pending,'2026-09-11'),'overdue');
assert.equal(F.decimal(F.dueCents(pending,'2026-09-11')),397);
const paid={...pending,status:'paid',paidAmount:295,paidDate:'2026-09-10'};
assert.equal(F.decimal(F.dueCents(paid,'2027-01-01')),295);
const totals=F.summary([pending,paid],'2026-09-10');
assert.equal(totals.totalFull,794);
assert.equal(totals.totalPunctual,590);
assert.equal(totals.open,295);
assert.equal(totals.paid,295);

console.log('financial center rules test ok');
