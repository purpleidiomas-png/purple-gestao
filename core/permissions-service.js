(function(){
  'use strict';
  function currentUser(){return window.PurpleState?.user||null}
  function can(permission,user=currentUser()){
    return Boolean(user?.permissions?.[permission]);
  }
  function canAny(permissions=[],user=currentUser()){
    return permissions.some(permission=>can(permission,user));
  }
  function sectorAllowed(sector,user=currentUser()){
    if(!user)return false;
    return user.accessScope==='all_sectors'||user.sector===sector||sector==='all'||sector==='integrado';
  }
  function explain(permission,sector,user=currentUser()){
    if(!user)return {allowed:false,reason:'Usuário não autenticado.'};
    if(permission&&!can(permission,user))return {allowed:false,reason:`Permissão ausente: ${permission}.`};
    if(sector&&!sectorAllowed(sector,user))return {allowed:false,reason:`Setor não autorizado: ${sector}.`};
    return {allowed:true,reason:'Acesso autorizado.'};
  }
  window.PurpleCore=window.PurpleCore||{};
  window.PurpleCore.permissions={currentUser,can,canAny,sectorAllowed,explain};
})();
