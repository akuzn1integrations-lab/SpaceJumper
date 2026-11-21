(function(global){
'use strict';
let ysdk=null;
let player=null;
let readySent=false;
let pausedByPlatform=false;
const hooks={pause:null,resume:null};

async function init(){
 if(!global.YaGames)return null;
 try{
  ysdk=await global.YaGames.init();
  try{
   ysdk.on?.('game_api_pause',()=>{pausedByPlatform=true;hooks.pause?.();});
   ysdk.on?.('game_api_resume',()=>{pausedByPlatform=false;hooks.resume?.();});
  }catch(error){}
  try{player=await ysdk.getPlayer();}catch(error){player=null;}
  return ysdk;
 }catch(error){
  console.warn('Yandex Games SDK init failed',error);
  return null;
 }
}

function onPause(callback){hooks.pause=callback;}
function onResume(callback){hooks.resume=callback;}

function ready(){
 if(!ysdk||readySent)return;
 readySent=true;
 try{ysdk.features?.LoadingAPI?.ready?.();}catch(error){console.warn('LoadingAPI.ready failed',error);}
}

function gameplayStart(){
 try{ysdk?.features?.GameplayAPI?.start?.();}catch(error){console.warn('GameplayAPI.start failed',error);}
}

function gameplayStop(){
 try{ysdk?.features?.GameplayAPI?.stop?.();}catch(error){console.warn('GameplayAPI.stop failed',error);}
}

function lang(){
 const raw=ysdk?.environment?.i18n?.lang||global.navigator?.language||'ru';
 return String(raw).slice(0,2).toLowerCase();
}

async function load(keys){
 if(!player)return null;
 try{return await player.getData(keys);}catch(error){return null;}
}

async function save(data){
 if(!player)return false;
 try{await player.setData(data,true);return true;}catch(error){return false;}
}

async function saveStats(stats){
 if(!player)return false;
 try{await player.setStats(stats);return true;}catch(error){return false;}
}

function showFullscreenAd(){
 return new Promise((resolve)=>{
  if(!ysdk?.adv?.showFullscreenAdv){resolve(false);return;}
  let settled=false;
  const finish=(value)=>{if(settled)return;settled=true;resolve(value);};
  try{
   ysdk.adv.showFullscreenAdv({
    onClose:(wasShown)=>finish(Boolean(wasShown)),
    onError:()=>finish(false)
   });
  }catch(error){finish(false);}
 });
}

function isAuthorized(){
 try{return Boolean(player?.isAuthorized?.());}catch(error){return false;}
}

async function auth(){
 if(!ysdk)return false;
 if(!player){try{player=await ysdk.getPlayer();}catch(error){return false;}}
 if(isAuthorized())return true;
 try{
  await ysdk.auth.openAuthDialog();
  player=await ysdk.getPlayer();
  return isAuthorized();
 }catch(error){return false;}
}

async function submitScore(name,score){
 if(!ysdk||!isAuthorized())return false;
 try{
  if(typeof ysdk.isAvailableMethod==='function'){
   const available=await ysdk.isAvailableMethod('leaderboards.setScore');
   if(!available)return false;
  }
  await ysdk.leaderboards.setScore(name,Math.max(0,Math.floor(score)));
  return true;
 }catch(error){return false;}
}

global.Platform={
 init,onPause,onResume,ready,gameplayStart,gameplayStop,lang,load,save,saveStats,
 showFullscreenAd,isAuthorized,auth,submitScore,
 get available(){return Boolean(ysdk);},
 get pausedByPlatform(){return pausedByPlatform;}
};
})(window);
