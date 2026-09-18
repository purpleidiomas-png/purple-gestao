(function financialCenterModule(global){
  'use strict';

  const MONTHS=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  const TYPE_LABELS={MENSALIDADE:'MENSALIDADE',MATERIAL_DIDATICO:'MATERIAL DIDÁTICO',MATRICULA:'MATRÍCULA',REPOSICAO:'REPOSIÇÃO',CONVERSATION_CLUB:'CONVERSATION CLUB',OUTRO:'OUTRO'};

  function cents(value){
    if(typeof value==='number')return Number.isFinite(value)?Math.round(value*100):0;
    let source=String(value??'').trim().replace(/\s|R\$/gi,'');
    if(!source)return 0;
    if(source.includes(','))source=source.replace(/\./g,'').replace(',','.');
    const numeric=Number(source);
    return Number.isFinite(numeric)?Math.round(numeric*100):0;
  }
  function decimal(value){return Math.round(Number(value||0))/100}
  function moneyFromCents(value){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(decimal(value))}
  function isoDate(year,monthIndex,day){
    const lastDay=new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate();
    return `${year}-${String(monthIndex+1).padStart(2,'0')}-${String(Math.min(day,lastDay)).padStart(2,'0')}`;
  }
  function addMonths(dateISO,offset){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateISO||'')))return '';
    const [year,month,day]=dateISO.split('-').map(Number),absolute=year*12+(month-1)+Number(offset||0);
    return isoDate(Math.floor(absolute/12),((absolute%12)+12)%12,day);
  }
  function competence(dueDate){return String(dueDate||'').slice(0,7)}
  function competenceLabel(dueDate){const value=competence(dueDate);return /^\d{4}-\d{2}$/.test(value)?`${value.slice(5,7)}/${value.slice(2,4)}`:'—'}
  function description(type,dueDate){
    const normalized=String(type||'OUTRO').toUpperCase(),base=TYPE_LABELS[normalized]||TYPE_LABELS.OUTRO;
    if(['MATRICULA','REPOSICAO'].includes(normalized))return base;
    const month=Number(String(dueDate||'').slice(5,7));
    return month?`${base} ${MONTHS[month-1]}`:base;
  }
  function schedule(input={}){
    const count=Math.max(1,Math.min(24,Number(input.count||1)||1)),fullCents=cents(input.fullValue),punctualCents=Math.min(fullCents,Math.max(0,cents(input.punctualValue)));
    return Array.from({length:count},(_,index)=>{
      const dueDate=addMonths(input.firstDueDate,index);
      return {installmentNumber:index+1,installmentTotal:count,dueDate,competence:competence(dueDate),description:description(input.chargeType,dueDate),fullValue:decimal(fullCents),punctualValue:decimal(punctualCents),discountValue:decimal(Math.max(0,fullCents-punctualCents)),billingType:String(input.billingType||'PIX').toUpperCase(),chargeType:String(input.chargeType||'MENSALIDADE').toUpperCase()};
    });
  }
  function status(item={},today){
    const raw=String(item.status||'').toLowerCase();
    if(raw==='paid')return 'paid';
    if(['cancelled','canceled','archived'].includes(raw))return 'cancelled';
    if(raw==='refunded')return 'refunded';
    const basis=today||new Date().toISOString().slice(0,10);
    return item.dueDate&&item.dueDate<basis?'overdue':'pending';
  }
  function fullCents(item={}){return cents(item.fullValue??item.amount??item.value??0)}
  function punctualCents(item={}){const full=fullCents(item),value=item.punctualValue??item.discountedValue;return value==null?full:Math.min(full,cents(value))}
  function dueCents(item={},today){
    const current=status(item,today);
    if(current==='paid')return cents(item.paidAmount??item.amount??0);
    if(['cancelled','refunded'].includes(current))return 0;
    const base=current==='overdue'?fullCents(item):punctualCents(item);
    return Math.max(0,base-cents(item.paidAmount||0));
  }
  function summary(rows=[],today){
    const active=rows.filter(item=>!['cancelled','refunded'].includes(status(item,today))),paidRows=active.filter(item=>status(item,today)==='paid'),openRows=active.filter(item=>status(item,today)==='pending'),overdueRows=active.filter(item=>status(item,today)==='overdue');
    const sum=(items,mapper)=>items.reduce((total,item)=>total+mapper(item),0),future=openRows.slice().sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')))[0]||null;
    return {rows,active,paidRows,openRows,overdueRows,totalFull:decimal(sum(active,fullCents)),totalPunctual:decimal(sum(active,punctualCents)),paid:decimal(sum(paidRows,item=>cents(item.paidAmount??item.amount??0))),open:decimal(sum(openRows,item=>dueCents(item,today))),overdue:decimal(sum(overdueRows,item=>dueCents(item,today))),nextDue:future,nextDueAmount:future?decimal(dueCents(future,today)):0};
  }

  global.PurpleFinancial=Object.freeze({MONTHS,cents,decimal,moneyFromCents,addMonths,competence,competenceLabel,description,schedule,status,fullCents,punctualCents,dueCents,summary});
})(window);
