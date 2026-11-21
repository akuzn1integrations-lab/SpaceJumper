(function(root){
'use strict';
const TEXT={
 ru:{
  pageTitle:'SpaceJumper — Выше. Ещё выше.',
  status:'ОРБИТАЛЬНАЯ СТАНЦИЯ / СЕКТОР 07',
  settingsAria:'Настройки',
  introEyebrow:'БЕСКОНЕЧНАЯ КОСМИЧЕСКАЯ АРКАДА',
  heroTitle:'Выше.<br>Ещё <em>выше.</em>',
  heroLede:'Станция падает.<br>Твой следующий прыжок — нет.',
  bestLabel:'ЛИЧНЫЙ РЕКОРД',
  bestHint:'Каждый переход имеет значение.',
  controlsTitle:'УПРАВЛЕНИЕ',
  moveLabel:'Движение · или ← →',
  jumpLabel:'Прыжок',
  pauseLabel:'Пауза',
  finePrint:'01 / РУЧНОЙ ПРЫЖОК. ПОЛНЫЙ КОНТРОЛЬ.',
  scoreLabel:'ОЧКИ',
  levelLabel:'УРОВЕНЬ',
  pauseButtonAria:'Пауза',
  canvasLabel:'SpaceJumper: управление стрелками и пробелом',
  gameFieldAria:'Игровое поле',
  touchLeftAria:'Влево',
  touchRightAria:'Вправо',
  touchJumpAria:'Прыжок',
  missionEyebrow:'ПОЛЁТНЫЙ БРИФИНГ',
  missionTitle:'Не останавливайся.',
  missionText:'Платформы уходят вниз.<br>Проходи сквозь них вверх<br>и приземляйся сверху.',
  legendPlatform:'Найди опору',
  legendPlatformSmall:'Холодный свет — безопасный путь',
  legendCrystal:'Собирай энергию',
  legendCrystalSmall:'Кристалл +25 · ядро +100',
  legendDanger:'Смотри под ноги',
  legendDangerSmall:'Шипы и лазеры не прощают ошибок',
  telemetryLabel:'ТЕЛЕМЕТРИЯ ЗАБЕГА',
  jumpsLabel:'Прыжки',
  streakLabel:'Лучшая серия',
  timeLabel:'Время',
  footerVersion:'SPACEJUMPER / FLIGHT SYSTEM v1.2.0',
  footerTagline:'Всё, что нужно — ещё один прыжок.',
  configEyebrow:'ПАРАМЕТРЫ ПОЛЁТА',
  configTitle:'Настройки',
  volumeLabel:'Громкость эффектов',
  musicLabel:'Громкость музыки',
  reducedLabel:'Меньше анимаций и частиц',
  touchSizeLabel:'Размер сенсорных кнопок',
  bindLeftLabel:'Клавиша влево',
  bindRightLabel:'Клавиша вправо',
  bindJumpLabel:'Клавиша прыжка',
  doneLabel:'Готово',
  settingsButton:'Настройки',
  menuTitle:'Следующий прыжок<br>решает всё.',
  menuText:'Выбирай опору. Лови энергию. Оставайся выше.',
  startRun:'Начать забег',
  tutorial:'Обучение',
  pauseTitle:'Пауза',
  pauseText:'Станция подождёт.',
  continueLabel:'Продолжить',
  restartLabel:'Начать заново',
  menuLabel:'В меню',
  againLabel:'Ещё раз',
  disconnected:'Связь потеряна',
  resultScore:'Очки',
  resultRecord:'Рекорд',
  resultJumps:'Прыжки',
  resultStreak:'Лучшая серия',
  resultLevel:'Уровень',
  tutorialMove:'A / D — движение · Пробел — прыжок',
  tutorialLand:'Прыгай сквозь платформы. Приземляйся сверху.',
  tutorialCollect:'Собирай кристаллы · Сделай 5 прыжков',
  tutorialDone:'Обучение завершено · Удачного полёта!',
  shieldEffect:'◇ ЩИТ',
  reserveEffect:'⊕ РЕЗЕРВ',
  flightEffect:'↑ ПОЛЁТ {time}с',
  laserWarning:'⚠ ЛАЗЕР',
  destructionZone:'ЗОНА РАЗРУШЕНИЯ',
  loginForLeaderboard:'Войти, чтобы попасть в рейтинг',
  loginHint:'Авторизация нужна только для общего рейтинга. Играть можно без неё.',
  loggedIn:'Вы вошли. Результат отправлен в рейтинг.',
  leaderboardUnavailable:'Рейтинг временно недоступен.'
 },
 en:{
  pageTitle:'SpaceJumper — Higher. Even Higher.',
  status:'ORBITAL STATION / SECTOR 07',
  settingsAria:'Settings',
  introEyebrow:'ENDLESS SPACE ARCADE',
  heroTitle:'Higher.<br>Even <em>higher.</em>',
  heroLede:'The station is falling.<br>Your next jump is not.',
  bestLabel:'PERSONAL BEST',
  bestHint:'Every landing matters.',
  controlsTitle:'CONTROLS',
  moveLabel:'Move · or ← →',
  jumpLabel:'Jump',
  pauseLabel:'Pause',
  finePrint:'01 / MANUAL JUMP. FULL CONTROL.',
  scoreLabel:'SCORE',
  levelLabel:'LEVEL',
  pauseButtonAria:'Pause',
  canvasLabel:'SpaceJumper: control with arrows and space',
  gameFieldAria:'Game field',
  touchLeftAria:'Left',
  touchRightAria:'Right',
  touchJumpAria:'Jump',
  missionEyebrow:'FLIGHT BRIEFING',
  missionTitle:"Don't stop.",
  missionText:'Platforms are falling.<br>Pass through them upward<br>and land on top.',
  legendPlatform:'Find a footing',
  legendPlatformSmall:'Cold light marks the safe path',
  legendCrystal:'Collect energy',
  legendCrystalSmall:'Crystal +25 · core +100',
  legendDanger:'Watch your step',
  legendDangerSmall:'Spikes and lasers do not forgive',
  telemetryLabel:'RUN TELEMETRY',
  jumpsLabel:'Jumps',
  streakLabel:'Best streak',
  timeLabel:'Time',
  footerVersion:'SPACEJUMPER / FLIGHT SYSTEM v1.2.0',
  footerTagline:'All you need is one more jump.',
  configEyebrow:'FLIGHT PARAMETERS',
  configTitle:'Settings',
  volumeLabel:'Effects volume',
  musicLabel:'Music volume',
  reducedLabel:'Reduce animations and particles',
  touchSizeLabel:'Touch button size',
  bindLeftLabel:'Move left key',
  bindRightLabel:'Move right key',
  bindJumpLabel:'Jump key',
  doneLabel:'Done',
  settingsButton:'Settings',
  menuTitle:'Your next jump<br>decides everything.',
  menuText:'Pick a platform. Catch the energy. Stay above.',
  startRun:'Start run',
  tutorial:'Tutorial',
  pauseTitle:'Pause',
  pauseText:'The station can wait.',
  continueLabel:'Resume',
  restartLabel:'Restart',
  menuLabel:'Menu',
  againLabel:'Play again',
  disconnected:'Connection lost',
  resultScore:'Score',
  resultRecord:'Best',
  resultJumps:'Jumps',
  resultStreak:'Best streak',
  resultLevel:'Level',
  tutorialMove:'A / D — move · Space — jump',
  tutorialLand:'Jump through platforms. Land on top.',
  tutorialCollect:'Collect crystals · Make 5 jumps',
  tutorialDone:'Tutorial complete · Good luck!',
  shieldEffect:'◇ SHIELD',
  reserveEffect:'⊕ RESERVE',
  flightEffect:'↑ FLIGHT {time}s',
  laserWarning:'⚠ LASER',
  destructionZone:'DESTRUCTION ZONE',
  loginForLeaderboard:'Sign in to join the leaderboard',
  loginHint:'Sign-in is only needed for the global leaderboard. You can play without it.',
  loggedIn:'Signed in. Score submitted to the leaderboard.',
  leaderboardUnavailable:'Leaderboard is temporarily unavailable.'
 }
};
const CAUSES={
 ru:{fall:'Пропущена платформа',spikes:'Шипы',laser:'Лазер',mine:'Лазерная мина'},
 en:{fall:'Platform missed',spikes:'Spikes',laser:'Laser',mine:'Laser mine'}
};
const NOTICES={
 ru:{levelUp:'УРОВЕНЬ {level} · Новый сектор',shieldHit:'Щит поглотил удар',rescue:'Резервный модуль · спасение',flightEnd:'Полёт завершён'},
 en:{levelUp:'LEVEL {level} · New sector',shieldHit:'Shield absorbed the hit',rescue:'Reserve module · rescue',flightEnd:'Flight over'}
};
function normalize(lang){
 const code=String(lang||'').toLowerCase().split('-')[0];
 return TEXT[code]?code:'en';
}
function format(template,vars){
 return String(template).replace(/\{(\w+)\}/g,(all,key)=>vars&&Object.prototype.hasOwnProperty.call(vars,key)?String(vars[key]):all);
}
function t(lang,key,vars){
 const dict=TEXT[normalize(lang)];
 return format(Object.prototype.hasOwnProperty.call(dict,key)?dict[key]:key,vars);
}
function cause(lang,code){
 const dict=CAUSES[normalize(lang)]||CAUSES.en;
 return dict[code]||CAUSES.en[code]||code;
}
function notice(lang,event){
 if(!event)return '';
 const dict=NOTICES[normalize(lang)]||NOTICES.en;
 if(event.key&&Object.prototype.hasOwnProperty.call(dict,event.key))return format(dict[event.key],event);
 return event.text||event.key||'';
}
function apply(lang,dom){
 const target=dom||(typeof document!=='undefined'?document:null);
 if(!target)return;
 target.querySelectorAll('[data-i18n]').forEach((element)=>{
  element.textContent=t(lang,element.getAttribute('data-i18n'));
 });
 target.querySelectorAll('[data-i18n-html]').forEach((element)=>{
  element.innerHTML=t(lang,element.getAttribute('data-i18n-html'));
 });
 target.querySelectorAll('[data-i18n-aria]').forEach((element)=>{
  element.setAttribute('aria-label',t(lang,element.getAttribute('data-i18n-aria')));
 });
 target.querySelectorAll('[data-i18n-title]').forEach((element)=>{
  element.title=t(lang,element.getAttribute('data-i18n-title'));
 });
}
const api={TEXT,CAUSES,NOTICES,normalize,t,cause,notice,apply};
if(typeof module!=='undefined')module.exports=api;
root.I18n=api;
})(typeof globalThis!=='undefined'?globalThis:this);
