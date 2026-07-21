(function(){
  'use strict';
  const config=()=>window.PurpleAuthConfig||{};
  const state={client:null,ready:false,lastError:null,createdAt:null};
  const readError=error=>error instanceof Error?`${error.name}: ${error.message}`:String(error);
  function validate(){
    const cfg=config();
    if(typeof window.supabase!=='object')throw new Error('SDK Supabase indisponível.');
    if(typeof window.supabase.createClient!=='function')throw new Error('SDK Supabase sem createClient.');
    if(!cfg.supabaseUrl)throw new Error('URL do Supabase ausente.');
    if(!cfg.supabaseKey)throw new Error('Publishable key do Supabase ausente.');
    return cfg;
  }
  function getClient(){
    if(state.client&&state.ready)return state.client;
    try{
      const cfg=validate();
      state.client=window.PurpleAuth?.state?.client||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:'purple-gestao-auth'}});
      if(!state.client?.auth||typeof state.client.from!=='function')throw new Error('Cliente Supabase inválido.');
      state.ready=true;
      state.lastError=null;
      state.createdAt=state.createdAt||new Date().toISOString();
      return state.client;
    }catch(error){
      state.client=null;
      state.ready=false;
      state.lastError=readError(error);
      throw error;
    }
  }
  async function getSession(){
    const client=getClient();
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    return data?.session||null;
  }
  window.PurpleCore=window.PurpleCore||{};
  window.PurpleCore.supabase={state,validate,getClient,getSession,isReady:()=>state.ready};
})();
