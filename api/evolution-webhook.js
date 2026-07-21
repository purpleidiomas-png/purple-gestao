function json(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readBody(req){
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  const raw=Buffer.concat(chunks).toString('utf8');
  if(!raw)return {};
  try{return JSON.parse(raw)}catch{return {raw}}
}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Método não permitido.'});
  const secret=process.env.EVOLUTION_WEBHOOK_SECRET;
  if(secret){
    const received=req.headers['x-purple-webhook-secret']||req.headers.authorization?.replace(/^Bearer\s+/i,'');
    if(received!==secret)return json(res,401,{ok:false,error:'Webhook não autorizado.'});
  }
  const event=await readBody(req);
  console.log('[Purple Gestão] Evolution webhook recebido', {
    event:event?.event||event?.type||'unknown',
    instance:event?.instance||event?.instanceName||'unknown',
    at:new Date().toISOString()
  });
  return json(res,200,{ok:true,received:true});
};
