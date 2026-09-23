const crypto=require('node:crypto');

function json(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readRaw(req){
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  return Buffer.concat(chunks);
}

function timingSafeEqual(a,b){
  const left=Buffer.from(String(a||''));
  const right=Buffer.from(String(b||''));
  return left.length===right.length&&crypto.timingSafeEqual(left,right);
}

function validSignature(req,raw){
  const secret=process.env.META_WHATSAPP_APP_SECRET;
  if(!secret)return true;
  const received=String(req.headers['x-hub-signature-256']||'').replace(/^sha256=/,'');
  const expected=crypto.createHmac('sha256',secret).update(raw).digest('hex');
  return timingSafeEqual(received,expected);
}

function eventRows(payload){
  const rows=[];
  for(const entry of payload?.entry||[]){
    for(const change of entry?.changes||[]){
      const value=change?.value||{};
      for(const message of value.messages||[]){
        rows.push({
          kind:'message',
          externalId:message.id,
          from:message.from,
          timestamp:message.timestamp,
          type:message.type,
          text:message.text?.body||'',
          contactName:value.contacts?.find(contact=>contact.wa_id===message.from)?.profile?.name||''
        });
      }
      for(const status of value.statuses||[]){
        rows.push({
          kind:'status',
          externalId:status.id,
          recipientId:status.recipient_id,
          status:status.status,
          timestamp:status.timestamp,
          conversationId:status.conversation?.id||''
        });
      }
    }
  }
  return rows;
}

module.exports=async function handler(req,res){
  if(req.method==='GET'){
    const mode=req.query?.['hub.mode'];
    const token=req.query?.['hub.verify_token'];
    const challenge=req.query?.['hub.challenge'];
    if(mode==='subscribe'&&token&&timingSafeEqual(token,process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN)){
      res.statusCode=200;
      res.setHeader('Content-Type','text/plain; charset=utf-8');
      return res.end(String(challenge||''));
    }
    return json(res,403,{ok:false,error:'Token de verificação inválido.'});
  }

  if(req.method!=='POST')return json(res,405,{ok:false,error:'Método não permitido.'});
  const raw=await readRaw(req);
  if(!validSignature(req,raw))return json(res,401,{ok:false,error:'Assinatura do webhook inválida.'});
  let payload={};
  try{payload=raw.length?JSON.parse(raw.toString('utf8')):{}}catch(error){return json(res,400,{ok:false,error:'JSON inválido.'})}
  const rows=eventRows(payload);
  const messageIds=rows.filter(row=>row.kind==='message').map(row=>row.externalId);
  const statusIds=rows.filter(row=>row.kind==='status').map(row=>`${row.externalId}:${row.status}`);
  console.log('[Purple Gestão] WhatsApp Cloud webhook recebido', {
    object:payload?.object||'unknown',
    messages:messageIds.length,
    statuses:statusIds.length,
    messageIds,
    statusIds,
    at:new Date().toISOString()
  });
  return json(res,200,{ok:true,received:true,events:rows.length,messageIds,statusIds});
};
