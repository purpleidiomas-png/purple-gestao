(function(){
  'use strict';
  const timers=new Map();
  function toast(message,options={}){
    const target=document.getElementById(options.targetId||'toast');
    if(!target)return;
    target.textContent=String(message||'');
    target.classList.toggle('premium',options.premium!==false);
    target.classList.add('show');
    clearTimeout(timers.get(target));
    timers.set(target,setTimeout(()=>target.classList.remove('show'),options.duration||2600));
  }
  function modal(content,small=false){
    const root=document.getElementById('modalRoot');
    if(!root)return;
    document.body.classList.add('modal-open');
    root.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)App.closeModal()"><div class="modal ${small?'small':''}">${content}</div></div>`;
  }
  function closeModal(){
    const root=document.getElementById('modalRoot');
    if(root)root.innerHTML='';
    document.body.classList.remove('modal-open');
  }
  function setButtonLoading(button,loading=true,label='Salvando...'){
    if(!button)return;
    if(loading){
      button.dataset.previousText=button.textContent;
      button.textContent=label;
      button.disabled=true;
      button.classList.add('loading');
    }else{
      if(button.dataset.previousText)button.textContent=button.dataset.previousText;
      button.disabled=false;
      button.classList.remove('loading');
      delete button.dataset.previousText;
    }
  }
  window.PurpleCore=window.PurpleCore||{};
  window.PurpleCore.ui={toast,modal,closeModal,setButtonLoading};
})();
