(function(){
  'use strict';
  function status(){
    const cfg=window.PurpleAuthConfig||{};
    const auth=window.PurpleAuth?.state||{};
    const sw=window.navigator?.serviceWorker;
    return {
      appVersion:cfg.appVersion||'unknown',
      serviceWorkerVersion:cfg.serviceWorkerVersion||'unknown',
      manifestVersion:cfg.manifestVersion||'manifest.webmanifest',
      supabaseReady:Boolean(window.PurpleCore?.supabase?.state?.ready||window.PurpleAuth?.hasClient?.()),
      supabaseUrl:cfg.supabaseUrl||null,
      authState:auth.loginState||'unknown',
      recovery:Boolean(auth.recovery||window.PurpleBootstrap?.recovery),
      serviceWorkerSupported:Boolean(sw),
      controllerActive:Boolean(sw?.controller),
      timestamp:new Date().toISOString()
    };
  }
  window.PurpleCore=window.PurpleCore||{};
  window.PurpleCore.system={status};
  window.PurpleSystemStatus=status;
})();
