const REQUIRED_ENV=['EVOLUTION_API_URL','EVOLUTION_API_KEY'];

function json(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function configured(){
  const missing=REQUIRED_ENV.filter(key=>!process.env[key]);
  return {
    ok:missing.length===0,
    missing,
    apiUrl:process.env.EVOLUTION_API_URL||'',
    apiKey:process.env.EVOLUTION_API_KEY||'',
    instanceName:process.env.EVOLUTION_INSTANCE_NAME||'purple-gestao'
  };
}

function cleanBase(url){return String(url||'').replace(/\/+$/,'')}

async function readBody(req){
  if(req.body&&typeof req.body==='object')return req.body;
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  const raw=Buffer.concat(chunks).toString('utf8');
  if(!raw)return {};
  try{return JSON.parse(raw)}catch{return {}}
}

async function evolutionFetch(paths,{method='GET',body,apiUrl,apiKey}={}){
  const base=cleanBase(apiUrl);
  let lastError=null;
  for(const path of paths){
    const url=`${base}${path.startsWith('/')?path:`/${path}`}`;
    try{
      const response=await fetch(url,{
        method,
        headers:{apikey:apiKey,'Content-Type':'application/json'},
        body:body?JSON.stringify(body):undefined
      });
      const text=await response.text();
      let data=null;
      try{data=text?JSON.parse(text):null}catch{data={raw:text}}
      if(response.ok)return {ok:true,status:response.status,data,url};
      lastError={ok:false,status:response.status,data,url};
    }catch(error){
      lastError={ok:false,status:0,data:{message:error.message},url};
    }
  }
  return lastError||{ok:false,status:500,data:{message:'Evolution API indisponível'}};
}

function normalizeStatus(data){
  const instance=data?.instance||data;
  const state=data?.state||data?.connectionState||instance?.state||instance?.status||data?.status||'Desconhecido';
  const number=data?.number||instance?.number||instance?.ownerJid||'';
  return {
    raw:data,
    status:String(state),
    connected:/open|connected|connectado|conectado/i.test(String(state)),
    device:instance?.profileName||instance?.device||data?.device||'WhatsApp Business',
    number:number||'Não informado',
    lastSync:new Date().toISOString()
  };
}

module.exports=async function handler(req,res){
  const cfg=configured();
  const body=req.method==='POST'?await readBody(req):{};
  const requestedAction=body.action||req.query?.action||'config';

  if(requestedAction==='config'){
    return json(res,200,{configured:cfg.ok,missing:cfg.missing,instanceName:cfg.instanceName});
  }
  if(!cfg.ok){
    return json(res,200,{configured:false,missing:cfg.missing,error:'Evolution API não configurada no ambiente da Vercel.'});
  }

  const instance=cfg.instanceName;
  const common={apiUrl:cfg.apiUrl,apiKey:cfg.apiKey};

  if(req.method==='GET'&&requestedAction==='status'){
    const result=await evolutionFetch([
      `/instance/connectionState/${encodeURIComponent(instance)}`,
      `/instance/${encodeURIComponent(instance)}/status`
    ],common);
    if(!result.ok)return json(res,502,{configured:true,error:'Não foi possível consultar o status da Evolution API.',details:result});
    return json(res,200,{configured:true,instanceName:instance,...normalizeStatus(result.data)});
  }

  if(req.method==='GET'&&requestedAction==='qrcode'){
    const result=await evolutionFetch([
      `/instance/connect/${encodeURIComponent(instance)}`,
      `/instance/${encodeURIComponent(instance)}/qrcode`
    ],common);
    if(!result.ok)return json(res,502,{configured:true,error:'Não foi possível obter o QR Code.',details:result});
    return json(res,200,{configured:true,instanceName:instance,qrcode:result.data?.qrcode||result.data,raw:result.data});
  }

  if(req.method!=='POST')return json(res,405,{error:'Método não permitido.'});

  if(requestedAction==='connect'||requestedAction==='reconnect'){
    const origin=req.headers.origin||(process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:'');
    const result=await evolutionFetch(['/instance/create'],{
      ...common,
      method:'POST',
      body:{
        instanceName:instance,
        qrcode:true,
        integration:'WHATSAPP-BAILEYS',
        number:body.number||undefined,
        webhook:origin?{
          enabled:true,
          url:`${origin.replace(/\/+$/,'')}/api/evolution-webhook`,
          events:['QRCODE_UPDATED','MESSAGES_UPSERT','SEND_MESSAGE','CONNECTION_UPDATE']
        }:undefined
      }
    });
    if(!result.ok)return json(res,502,{configured:true,error:'Não foi possível criar/reconectar a instância.',details:result});
    return json(res,200,{configured:true,instanceName:instance,status:'connecting',qrcode:result.data?.qrcode,raw:result.data});
  }

  if(requestedAction==='disconnect'){
    const result=await evolutionFetch([
      `/instance/logout/${encodeURIComponent(instance)}`,
      `/instance/delete/${encodeURIComponent(instance)}`,
      `/instance/${encodeURIComponent(instance)}`
    ],{...common,method:'DELETE'});
    if(!result.ok)return json(res,502,{configured:true,error:'Não foi possível desconectar a instância.',details:result});
    return json(res,200,{configured:true,instanceName:instance,disconnected:true,raw:result.data});
  }

  if(requestedAction==='sendText'){
    const number=String(body.number||'').replace(/\D/g,'');
    const text=String(body.text||'').trim();
    if(!number||!text)return json(res,400,{error:'Número e texto são obrigatórios.'});
    const result=await evolutionFetch([`/message/sendText/${encodeURIComponent(instance)}`],{
      ...common,
      method:'POST',
      body:{number,textMessage:{text},delay:0,linkPreview:true}
    });
    if(!result.ok)return json(res,502,{configured:true,error:'Não foi possível enviar a mensagem.',details:result});
    return json(res,200,{configured:true,sent:true,raw:result.data});
  }

  if(requestedAction==='sendMedia'){
    const number=String(body.number||'').replace(/\D/g,'');
    const media=String(body.media||'');
    if(!number||!media)return json(res,400,{error:'Número e arquivo são obrigatórios.'});
    const result=await evolutionFetch([`/message/sendMedia/${encodeURIComponent(instance)}`],{
      ...common,
      method:'POST',
      body:{number,mediatype:body.mediatype||'document',mimetype:body.mimetype||'application/octet-stream',caption:body.caption||'',media,fileName:body.fileName||'arquivo'}
    });
    if(!result.ok)return json(res,502,{configured:true,error:'Não foi possível enviar o arquivo.',details:result});
    return json(res,200,{configured:true,sent:true,raw:result.data});
  }

  return json(res,400,{error:'Ação não reconhecida.'});
};
