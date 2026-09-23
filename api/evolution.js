const REQUIRED_ENV=[
  'META_WHATSAPP_PHONE_NUMBER_ID',
  'META_WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_BUSINESS_ACCOUNT_ID',
  'META_WHATSAPP_WEBHOOK_VERIFY_TOKEN'
];

function json(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readBody(req){
  if(req.body&&typeof req.body==='object')return req.body;
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  const raw=Buffer.concat(chunks).toString('utf8');
  if(!raw)return {};
  try{return JSON.parse(raw)}catch{return {}}
}

function configured(){
  const missing=REQUIRED_ENV.filter(key=>!process.env[key]);
  return {
    ok:missing.length===0,
    missing,
    provider:'WhatsApp Cloud API',
    phoneNumberId:process.env.META_WHATSAPP_PHONE_NUMBER_ID||'',
    businessAccountId:process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID||'',
    graphVersion:process.env.META_GRAPH_VERSION||'v20.0'
  };
}

async function metaFetch(path,{method='GET',body}={}){
  const cfg=configured();
  const base=`https://graph.facebook.com/${cfg.graphVersion}`;
  const response=await fetch(`${base}${path.startsWith('/')?path:`/${path}`}`,{
    method,
    headers:{
      Authorization:`Bearer ${process.env.META_WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type':'application/json'
    },
    body:body?JSON.stringify(body):undefined
  });
  const text=await response.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch{data={raw:text}}
  if(response.ok)return {ok:true,status:response.status,data};
  return {ok:false,status:response.status,data};
}

function normalizePhone(value){
  const digits=String(value||'').replace(/\D/g,'');
  if(!digits)return '';
  if(digits.length===10||digits.length===11)return `55${digits}`;
  return digits;
}

function connectionStatus(data,cfg){
  const phone=data?.display_phone_number||data?.verified_name||cfg.phoneNumberId;
  return {
    configured:true,
    provider:cfg.provider,
    status:data?.code_verification_status||data?.quality_rating||'Configurado',
    connected:Boolean(cfg.phoneNumberId&&process.env.META_WHATSAPP_ACCESS_TOKEN),
    device:data?.verified_name||'WhatsApp Business Platform',
    number:phone||'Phone Number ID configurado',
    businessAccountId:cfg.businessAccountId,
    phoneNumberId:cfg.phoneNumberId,
    lastSync:new Date().toISOString(),
    raw:data||null
  };
}

module.exports=async function handler(req,res){
  const cfg=configured();
  const body=req.method==='POST'?await readBody(req):{};
  const requestedAction=body.action||req.query?.action||'config';

  if(requestedAction==='config'){
    return json(res,200,{configured:cfg.ok,missing:cfg.missing,provider:cfg.provider,phoneNumberId:cfg.phoneNumberId,businessAccountId:cfg.businessAccountId});
  }
  if(!cfg.ok){
    return json(res,200,{configured:false,missing:cfg.missing,provider:cfg.provider,error:'WhatsApp Cloud API não configurada no ambiente.'});
  }

  if(req.method==='GET'&&requestedAction==='status'){
    const result=await metaFetch(`/${encodeURIComponent(cfg.phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`);
    if(!result.ok)return json(res,502,{configured:true,provider:cfg.provider,error:'Não foi possível consultar o status da WhatsApp Cloud API.',details:result});
    return json(res,200,connectionStatus(result.data,cfg));
  }

  if(req.method!=='POST')return json(res,405,{error:'Método não permitido.'});

  if(requestedAction==='connect'||requestedAction==='reconnect'){
    return json(res,200,{
      ...connectionStatus(null,cfg),
      status:'Configuração validada. Configure o webhook no painel da Meta.',
      webhookPath:'/api/evolution-webhook'
    });
  }

  if(requestedAction==='disconnect'){
    return json(res,400,{configured:true,provider:cfg.provider,error:'A Cloud API oficial não possui logout por sessão. Revogue o token ou remova o número no painel da Meta.'});
  }

  if(requestedAction==='sendText'){
    const number=normalizePhone(body.number);
    const text=String(body.text||'').trim();
    if(!number||!text)return json(res,400,{error:'Número e texto são obrigatórios.'});
    const result=await metaFetch(`/${encodeURIComponent(cfg.phoneNumberId)}/messages`,{
      method:'POST',
      body:{messaging_product:'whatsapp',recipient_type:'individual',to:number,type:'text',text:{preview_url:true,body:text}}
    });
    if(!result.ok)return json(res,502,{configured:true,provider:cfg.provider,error:'Não foi possível enviar a mensagem pela Cloud API.',details:result});
    return json(res,200,{configured:true,provider:cfg.provider,sent:true,status:'sent',externalId:result.data?.messages?.[0]?.id||null,raw:result.data});
  }

  if(requestedAction==='sendTemplate'){
    const number=normalizePhone(body.number),name=String(body.templateName||'').trim(),language=body.language||'pt_BR';
    if(!number||!name)return json(res,400,{error:'Número e template aprovado são obrigatórios.'});
    const components=Array.isArray(body.components)?body.components:[];
    const result=await metaFetch(`/${encodeURIComponent(cfg.phoneNumberId)}/messages`,{
      method:'POST',
      body:{messaging_product:'whatsapp',to:number,type:'template',template:{name,language:{code:language},components}}
    });
    if(!result.ok)return json(res,502,{configured:true,provider:cfg.provider,error:'Não foi possível enviar o template pela Cloud API.',details:result});
    return json(res,200,{configured:true,provider:cfg.provider,sent:true,status:'sent',externalId:result.data?.messages?.[0]?.id||null,raw:result.data});
  }

  return json(res,400,{error:'Ação não reconhecida.'});
};
