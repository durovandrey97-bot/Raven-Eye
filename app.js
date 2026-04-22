// ═══ RavenEye Защищённый API ═══
// После деплоя Apps Script вставь URL сюда:
var RAVENEYE_API_URL = ''; // например: https://script.google.com/macros/s/XXX/exec
var RAVENEYE_API_KEY = 'raven_xK9mP3_qW7nR2_vL5tY8_2024'; // ДОЛЖЕН совпадать с SECRET_KEY в скрипте

async function apiCall(action, data) {
  if (!RAVENEYE_API_URL) {
    // Пока URL не задан — пишем напрямую в Firebase (старое поведение)
    return null;
  }
  try {
    var resp = await fetch(RAVENEYE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: RAVENEYE_API_KEY, action: action, data: data })
    });
    return await resp.json();
  } catch(e) {
    console.log('[API] error:', e.message);
    return null;
  }
}

// app.js — Firebase init, login, subscribeToTrades, TG, animated bg, theme

// ═══ TELEGRAM BOT ═══

var _tgSentCache={};
var _tgRateCount=0; // счётчик сообщений в текущей минуте
var _tgRateMinute=0; // номер текущей минуты
// Восстанавливаем кэш из sessionStorage при старте
try {
  var _savedCache=sessionStorage.getItem('dex_tg_cache');
  if(_savedCache) _tgSentCache=JSON.parse(_savedCache);
} catch(e){}
async function tgSendToUser(chatId,text){
  if(!chatId)return false;
  // Защита от дублей: не отправляем одно и то же сообщение дважды за 30 сек
  var cacheKey=chatId+'|'+text.slice(0,50);
  var now=Date.now();
  if(_tgSentCache[cacheKey]&&now-_tgSentCache[cacheKey]<300000){
    console.log('[TG] dedup skip:', text.slice(0,30));
    return false;
  }
  // Rate limit: не более 5 сообщений в минуту
  var currentMinute = Math.floor(now / 60000);
  if (currentMinute !== _tgRateMinute) { _tgRateMinute = currentMinute; _tgRateCount = 0; }
  if (_tgRateCount >= 5) { console.log('[TG] rate limit hit'); return false; }
  _tgRateCount++;
  _tgSentCache[cacheKey]=now;
  try { sessionStorage.setItem('dex_tg_cache',JSON.stringify(_tgSentCache)); } catch(e){}
  try{
    const res=await fetch('https://api.telegram.org/bot'+TG_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text:text,parse_mode:'HTML'})});
    const data=await res.json();
    return data.ok;
  }catch(e){return false;}
}

async function tgRegisterUser(){
  if(!currentUser||!db)return;
  const urlParams=new URLSearchParams(window.location.search);
  const tgFromUrl=urlParams.get('tg');
  if(tgFromUrl&&tgFromUrl.length>5&&!isNaN(Number(tgFromUrl))){
    try{
      await db.collection('users').doc(currentUser.id).update({tgChatId:tgFromUrl});
      currentUser.tgChatId=tgFromUrl;
      await tgSendToUser(tgFromUrl,'✅ Telegram подключён!\n\nТеперь вы будете получать уведомления о новых торговых сигналах.');
      window.history.replaceState({},'',window.location.pathname);
      showTgConnectedToast();updateTgStatusUI();
    }catch(e){}
    return;
  }
  try{
    const snap=await db.collection('users').doc(currentUser.id).get();
    if(snap.exists){const d=snap.data();if(d.tgChatId&&d.tgChatId!==currentUser.tgChatId){currentUser.tgChatId=d.tgChatId;updateTgStatusUI();}}
  }catch(e){}
  if(!window._userUnsub){try{window._userUnsub=db.collection('users').doc(currentUser.id).onSnapshot(snap=>{if(!snap.exists)return;const d=snap.data();if(d.tgChatId&&d.tgChatId!==currentUser.tgChatId){currentUser.tgChatId=d.tgChatId;updateTgStatusUI();showTgConnectedToast();}if(d.balance!==undefined&&d.balance!==currentUser.balance){currentUser.balance=d.balance;document.getElementById('profile-balance').textContent=fmtBal(d.balance);applyProfileLevel(d.balance);}});}catch(e){}}
}
function updateTgStatusUI(){const el=document.getElementById('settings-tg-status');if(el)el.textContent=currentUser?.tgChatId?'Подключено: '+currentUser.tgChatId:'Нажмите для подключения';const ov=document.getElementById('tg-reg-overlay');if(ov)ov.remove();}

function showTgConnectedToast(){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:900;background:rgba(29,185,84,.15);border:1px solid rgba(29,185,84,.4);border-radius:10px;padding:12px 20px;font-size:13px;font-weight:600;color:var(--green);display:flex;align-items:center;gap:8px;box-shadow:0 8px 32px rgba(0,0,0,.5)';
  t.textContent='Telegram подключён!';
  document.body.appendChild(t);
  setTimeout(function(){t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(function(){t.remove();},300);},3000);
}

function showTgRegModal(){
  const ex=document.getElementById('tg-reg-overlay');
  if(ex){ex.style.display='flex';return;}
  const ov=document.createElement('div');
  ov.id='tg-reg-overlay';
  ov.style.cssText='position:fixed;inset:0;z-index:850;background:rgba(7,9,16,.88);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px';
  const connected=currentUser&&currentUser.tgChatId?currentUser.tgChatId:'';
  const botLink='https://t.me/RavenEyeSwapBot?start='+(currentUser?currentUser.id:'');
  let body='';
  if(connected){
    body='<div style="padding:12px 14px;background:rgba(29,185,84,.08);border:1px solid rgba(29,185,84,.2);border-radius:10px;margin-bottom:14px;display:flex;align-items:center;gap:10px"><span style="font-size:20px">✅</span><div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--green)">Telegram подключён</div><div style="font-size:11px;color:var(--txt3);margin-top:2px">Chat ID: '+connected+'</div></div><button onclick="tgDisconnect();document.getElementById(\'tg-reg-overlay\').remove()" style="background:rgba(229,62,62,.1);border:1px solid rgba(229,62,62,.3);border-radius:7px;padding:5px 10px;cursor:pointer;color:#e53e3e;font-size:11px;font-weight:700;font-family:Space Grotesk,sans-serif;white-space:nowrap">Отключить</button></div></div>';
  } else {
    body='<div style="font-size:13px;color:var(--txt2);line-height:1.6;margin-bottom:14px">Получайте сигналы в Telegram — даже когда браузер закрыт</div>';
    body+='<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">';
    body+='<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg3);border-radius:8px"><div style="width:20px;height:20px;border-radius:50%;background:rgba(41,182,246,.2);color:#29B6F6;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">1</div><div style="font-size:12px">Нажмите кнопку ниже — откроется бот</div></div>';
    body+='<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg3);border-radius:8px"><div style="width:20px;height:20px;border-radius:50%;background:rgba(41,182,246,.2);color:#29B6F6;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">2</div><div style="font-size:12px">Нажмите START в боте</div></div>';
    body+='<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg3);border-radius:8px"><div style="width:20px;height:20px;border-radius:50%;background:rgba(41,182,246,.2);color:#29B6F6;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">3</div><div style="font-size:12px">Нажмите ссылку от бота — готово!</div></div>';
    body+='</div>';
  }
  ov.innerHTML='<div style="background:var(--bg2);border:1px solid rgba(41,182,246,.25);border-radius:18px;width:min(380px,100%);overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.8)">'
    +'<div style="padding:16px 20px;background:linear-gradient(135deg,rgba(41,182,246,.12),rgba(41,182,246,.04));border-bottom:1px solid rgba(41,182,246,.15);display:flex;align-items:center;justify-content:space-between">'
    +'<div style="display:flex;align-items:center;gap:10px"><div style="width:34px;height:34px;border-radius:9px;background:rgba(41,182,246,.15);border:1px solid rgba(41,182,246,.3);display:flex;align-items:center;justify-content:center"><svg width="17" height="17" viewBox="0 0 24 24" fill="#29B6F6"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg></div>'
    +'<div><div style="font-size:14px;font-weight:700">Telegram уведомления</div><div style="font-size:10px;color:'+(connected?'rgba(29,185,84,.7)':'rgba(41,182,246,.7)')+';margin-top:1px">'+(connected?'● ПОДКЛЮЧЕНО':'○ НЕ ПОДКЛЮЧЕНО')+'</div></div></div>'
    +'<button onclick="document.getElementById(&quot;tg-reg-overlay&quot;).style.display=&quot;none&quot;" style="background:transparent;border:none;color:var(--txt3);cursor:pointer;font-size:20px;padding:4px 8px">&#x2715;</button>'
    +'</div>'
    +'<div style="padding:18px 20px 20px">'+body
    +'<a href="'+botLink+'" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:10px;background:rgba(41,182,246,.2);border:1px solid rgba(41,182,246,.4);color:#29B6F6;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:12px">'
    +'<svg width="16" height="16" viewBox="0 0 24 24" fill="#29B6F6"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg>Открыть @RavenEyeSwapBot</a>'
    +'<div style="font-size:10px;color:var(--txt3);text-align:center;margin-bottom:8px">или введите Chat ID вручную:</div>'
    +'<div style="display:flex;gap:8px"><input id="tg-chatid-inp" type="number" placeholder="'+(connected||'Chat ID')+'" style="flex:1;font-size:14px;font-weight:700;padding:9px 12px;border:1px solid var(--border2);border-radius:8px;background:var(--bg3);color:var(--txt);outline:none"/>'
    +'<button onclick="saveTgChatId()" style="padding:9px 16px;border-radius:8px;cursor:pointer;background:var(--bg3);border:1px solid var(--border2);color:var(--txt2);font-weight:600;font-size:12px">Сохранить</button></div>'
    +'<div id="tg-save-status" style="font-size:11px;margin-top:8px;min-height:16px"></div>'
    +'</div></div>';
  ov.addEventListener('click',function(e){if(e.target===ov)ov.style.display='none';});
  document.body.appendChild(ov);
}

window.saveTgChatId=async function(){
  const inp=document.getElementById('tg-chatid-inp');
  const status=document.getElementById('tg-save-status');
  const val=inp?inp.value.trim():'';
  if(!val){if(status)status.textContent='Введите Chat ID';return;}
  if(!currentUser||!db){if(status)status.textContent='Нет подключения';return;}
  if(status)status.textContent='Сохранение...';
  try{
    await db.collection('users').doc(currentUser.id).update({tgChatId:val});
    currentUser.tgChatId=val;
    await tgSendToUser(val,'✅ RavenEye подключён! Теперь вы будете получать уведомления о новых сигналах.');
    if(status){status.textContent='✓ Готово! Проверьте Telegram';status.style.color='var(--green)';}
    setTimeout(function(){const o=document.getElementById('tg-reg-overlay');if(o)o.remove();},2000);
  }catch(e){
    if(status){status.textContent='Ошибка: '+e.message;status.style.color='var(--red)';}
  }
};



// Subscribe to thresholds — live updates from Firebase
function loadThresholds(){
  if(!db)return;
  db.collection('meta').doc('thresholds').onSnapshot(snap=>{
    if(!snap.exists)return;
    const d=snap.data();
    let changed=false;
    if(d.eth!==undefined&&NET_THRESHOLDS.eth!==d.eth){NET_THRESHOLDS.eth=d.eth;changed=true;}
    if(d.arb!==undefined&&NET_THRESHOLDS.arb!==d.arb){NET_THRESHOLDS.arb=d.arb;changed=true;}
    if(d.sol!==undefined&&NET_THRESHOLDS.sol!==d.sol){NET_THRESHOLDS.sol=d.sol;changed=true;}
    if(d.bsc!==undefined&&NET_THRESHOLDS.bsc!==d.bsc){NET_THRESHOLDS.bsc=d.bsc;changed=true;}
    if(changed&&currentUser){
      // Re-render profile bar and trades (lock status may have changed)
      const balance=currentUser.balance||0;
      const netOrder=[...['bsc','arb','sol','eth']].sort((a,b)=>(NET_THRESHOLDS[a]||0)-(NET_THRESHOLDS[b]||0));
      document.getElementById('profile-nets').innerHTML=netOrder.map(n=>{
        const thr=NET_THRESHOLDS[n]||0,ok=balance>=thr,color=NET_COLORS[n]||'#888',pct=thr===0?100:Math.min(100,(balance/thr)*100);
        return `<div class="net-item"><div class="net-dot-row"><div class="net-dot" style="background:${color}"></div><span class="net-name" style="color:${ok?'var(--txt)':'var(--txt3)'}">${NET_LABELS[n]}</span><span style="font-size:9px">${ok?'✓':'🔒'}</span></div><div class="net-bar"><div class="net-bar-fill" style="width:${pct}%;background:${ok?color:color+'55'}"></div></div></div>`;
      }).join('');
      render(); // Re-render cards with updated lock status
    }
  },e=>console.log('thresholds error',e));
}

// ═══ SUBSCRIBE TO TRADES ═══
var _reconnectDelay = 3000; // exponential backoff: 3→6→12→30s
var _reconnectTimer = null;

function scheduleReconnect() {
  if (_reconnectTimer) return; // уже запланировано
  _reconnectTimer = setTimeout(function(){
    _reconnectTimer = null;
    if(currentUser) subscribeToTrades();
  }, _reconnectDelay);
  _reconnectDelay = Math.min(_reconnectDelay * 2, 30000); // max 30s
}

function resetReconnectDelay() {
  _reconnectDelay = 3000; // сброс при успешном подключении
  if(_reconnectTimer){ clearTimeout(_reconnectTimer); _reconnectTimer=null; }
}

function subscribeToTrades(){
  console.log('[RavenEye] subscribeToTrades called, db:', !!db, 'user:', currentUser?.id);
  if(!db){
    console.warn('[RavenEye] db not ready, retrying...');
    setTimeout(subscribeToTrades, 1000);
    return;
  }
  {const _as=document.getElementById('api-status');if(_as)_as.textContent='● Подключено';}
  {const _as2=document.getElementById('api-status');if(_as2)_as2.style.color='var(--green)';}
  // Clear skeleton after 5s if no data
  const skeletonTimeout=setTimeout(async()=>{
    const col=document.getElementById('trades-col');
    if(col&&col.querySelector('.skel-card')){trades=[];await render();}
  },5000);
  // Отписываемся от предыдущей подписки перед созданием новой
  if(tradesUnsub){try{tradesUnsub();}catch(e){}tradesUnsub=null;}
  // Guard: не создаём подписку если уже есть активная
  if(window._subscribing){console.log('[RavenEye] subscribe already in progress, skip');return;}
  window._subscribing=true;
  setTimeout(function(){window._subscribing=false;},5000);
  try{
    tradesUnsub=db.collection('trades').onSnapshot(
      async snap=>{
        clearTimeout(skeletonTimeout);
        resetDataTimer();lastDataReceived=Date.now();resetReconnectDelay();
        // Восстанавливаем seenTradeIds из sessionStorage при переподключении
        try {
          var _ss=sessionStorage.getItem('dex_seen_ids');
          if(_ss){JSON.parse(_ss).forEach(function(id){seenTradeIds.add(id);knownIds.add(id);});}
        } catch(e){}
        const allTrades=[];
        snap.forEach(d=>allTrades.push({...d.data(),_id:d.id}));
        // Фильтр по userId: показываем только свои или общие (без userId)
        const newTrades=allTrades.filter(function(t){
          return !t.userId || t.userId===currentUser.id;
        });
        newTrades.forEach(t=>{
          if(!knownIds.has(t._id)&&!seenTradeIds.has(t._id)&&knownIds.size>0&&t.hi>=0.5){
            addAlert(t);
            if(typeof updateDayStats==='function') updateDayStats({signal:true,spread:t.hi});
            // Пуш-уведомление если приложение свёрнуто
            var _pushEmoji={eth:'💎',arb:'🔷',sol:'🟣',bsc:'🟡'}[t.chain]||'⛓';
            sendPushNotification(
              _pushEmoji+' '+t.pair+' · '+(t.hi||0).toFixed(2)+'%',
              (CHAIN_META[t.chain]?.label||t.chain)+' · '+(t.dex||'')+' · доход +'+(((t.lo||0)+(t.hi||0))/2-0.06).toFixed(2)+'%',
              'signal-'+t._id
            );
            if(currentUser?.tgChatId){
              const chainLabel=CHAIN_META[t.chain]?.label||t.chain.toUpperCase();
              const avg=((t.lo||0)+(t.hi||0))/2,gas=CHAIN_META[t.chain]?.gas||0.5;
              const net=(avg-0.06-(gas/1000)).toFixed(2);
              const riskEmoji=t.hi>=1.8?'🔴':t.hi>=1.1?'🟡':'🟢';
              const chainEmoji={eth:'💎',arb:'🔷',sol:'🟣',bsc:'🟡'}[t.chain]||'⛓';
              tgSendToUser(currentUser.tgChatId,'🦅 RAVENEYE PRO · Новый сигнал\n\n'+chainEmoji+' '+t.pair+'\n📍 '+chainLabel+' · '+(t.dex||'')+'\n\n💰 '+( t.lo||0).toFixed(2)+'% → '+(t.hi||0).toFixed(2)+'%\n📈 +'+net+'% '+riskEmoji+'\n💵 '+fmtVol(t.vol||0)+'\n⏱ '+(t.tmin||'?')+'–'+(t.tmax||'?')+' мин\n\n🔗 '+SITE_URL);
            }
          }
          if(t.fixed&&!notifiedFixed.has(t._id)){
            // Сразу добавляем чтобы повторный onSnapshot не отправил снова
            notifiedFixed.add(t._id);
            sessionStorage.setItem('dex_notified_fixed',JSON.stringify([...notifiedFixed]));
            notifyFixed(t);launchConfetti();
            // Если это активная сделка в таймере — переключаем в режим фиксации
            sendPushNotification(
              '💰 Фиксируйте прибыль! '+t.pair,
              (CHAIN_META[t.chain]?.label||t.chain)+' · Время выходить из сделки!',
              'fixed-'+t._id
            );
            if(activeTimerTrade&&activeTimerTrade._id===t._id){
              if(typeof showTimerFixedState==='function') showTimerFixedState();
            }
            if(currentUser?.tgChatId){
              const fixChainEmoji={eth:'💎',arb:'🔷',sol:'🟣',bsc:'🟡'}[t.chain]||'⛓';
              tgSendToUser(currentUser.tgChatId,'💰 ФИКСИРУЙТЕ ПРИБЫЛЬ!\n\n'+fixChainEmoji+' '+t.pair+'\n📍 '+(CHAIN_META[t.chain]?.label||t.chain)+'\n\n⚡ Время выходить!\n\n🔗 '+SITE_URL);
            }
          }
          knownIds.add(t._id);
          seenTradeIds.add(t._id);
        });
        // Сохраняем seen IDs в sessionStorage
        try { sessionStorage.setItem('dex_seen_ids',JSON.stringify([...seenTradeIds])); } catch(e){}
        const newIds=new Set(newTrades.map(t=>t._id));
        trades.forEach(t=>{if(!newIds.has(t._id))knownIds.delete(t._id);});
        const spreadChanges={};
        newTrades.forEach(nt=>{const ot=trades.find(x=>x._id===nt._id);if(ot&&ot.hi!==nt.hi)spreadChanges[nt._id]=nt.hi>ot.hi?'up':'down';if(!spreadHistory[nt._id])spreadHistory[nt._id]=[];const _h=spreadHistory[nt._id];const _l=_h[_h.length-1];if(!_l||_l.v!==nt.hi){_h.push({v:nt.hi,t:Date.now()});if(_h.length>20)_h.shift();}});
        trades=newTrades;
        window._spreadChanges=spreadChanges;
        await render();
        {const _e=document.getElementById('st-cd');if(_e)_e.textContent='LIVE';}
        {const _e=document.getElementById('last-update');if(_e)_e.textContent='Обновлено: '+new Date().toLocaleTimeString('ru');}
        updateConnectionStatus('live');
      },
      async err=>{
        console.error('Firestore error:', err);
        {const _as=document.getElementById('api-status');if(_as)_as.textContent='✗ Ошибка — переподключение...';}
        {const _as2=document.getElementById('api-status');if(_as2)_as2.style.color='var(--red)';}
        clearTimeout(skeletonTimeout);
        trades=[];await render();
        scheduleReconnect();
      }
    );
  }catch(e){
    console.error('Subscribe error:',e);
    scheduleReconnect();
  }
}


// ═══ ANIMATED BG ═══
(function(){
  const canvas=document.getElementById('app-canvas');if(!canvas)return;
  const ctx=canvas.getContext('2d');let w,h,particles=[];
  function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight;}
  resize();window.addEventListener('resize',resize);
  for(let i=0;i<38;i++)particles.push({x:Math.random()*1400,y:Math.random()*900,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,r:Math.random()*1.5+.5,a:Math.random()*.35+.1});
  function draw(){
    ctx.clearRect(0,0,w,h);
    const dark=document.documentElement.getAttribute('data-theme')!=='light';
    ctx.strokeStyle=`rgba(${dark?'255,255,255':'0,0,0'},${dark?.018:.04})`;ctx.lineWidth=.5;
    for(let x=0;x<=w;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<=h;y+=44){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    const pc=dark?'29,185,84':'0,120,50';
    particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(${pc},${p.a})`;ctx.fill();});
    for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<90){ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.strokeStyle=`rgba(${pc},${.06*(1-d/90)})`;ctx.lineWidth=.5;ctx.stroke();}}
    requestAnimationFrame(draw);
  }
  draw();
})();

// ═══ THEME ═══
function applyTheme(t){currentTheme=t;document.documentElement.setAttribute('data-theme',t==='light'?'light':'');const btn=document.getElementById('theme-btn');if(btn)btn.textContent=t==='light'?'🌙':'☀️';const ls=document.getElementById('login-screen');if(ls)ls.style.background=t==='light'?'#e8eaf0':'#070910';document.body.style.background=t==='light'?'#e8eaf0':'#070910';localStorage.setItem('dex_theme',t);}
applyTheme(currentTheme);

// ═══ PLACEHOLDER CHART ═══
let placeholderAnimFrame=null;




// ═══ IndexedDB для iOS PWA (самый надёжный способ) ═══
var _idb = null;
function openIDB() {
  return new Promise(function(resolve) {
    try {
      var req = indexedDB.open('raveneye', 1);
      req.onupgradeneeded = function(e) {
        e.target.result.createObjectStore('kv');
      };
      req.onsuccess = function(e) { _idb = e.target.result; resolve(_idb); };
      req.onerror = function() { resolve(null); };
    } catch(e) { resolve(null); }
  });
}
function idbSet(key, val) {
  if (!_idb) return;
  try {
    var tx = _idb.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(val, key);
  } catch(e) {}
}
function idbGet(key) {
  return new Promise(function(resolve) {
    if (!_idb) { resolve(null); return; }
    try {
      var tx = _idb.transaction('kv', 'readonly');
      var req = tx.objectStore('kv').get(key);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { resolve(null); };
    } catch(e) { resolve(null); }
  });
}
function idbDel(key) {
  if (!_idb) return;
  try {
    var tx = _idb.transaction('kv', 'readwrite');
    tx.objectStore('kv').delete(key);
  } catch(e) {}
}

// Открываем IDB сразу при старте
openIDB();
// ═══ Cookie helpers (для Safari — localStorage чистится ITP) ═══
function setCookie(name, value, days) {
  var expires = '';
  if (days) {
    var d = new Date();
    d.setTime(d.getTime() + days*24*60*60*1000);
    expires = '; expires=' + d.toUTCString();
  }
  // Пробуем разные варианты cookie для iOS PWA совместимости
  document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Strict';
  // Если не записалось (Safari блокирует) — пробуем без SameSite
  if (!getCookie(name)) {
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
  }
}
function getCookie(name) {
  var nameEQ = name + '=';
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}
function getUserId() {
  // Синхронные источники
  return getCookie('dex_user_id') 
    || localStorage.getItem('dex_user_id')
    || sessionStorage.getItem('dex_user_id')
    || null;
}
// Async версия — проверяет IDB тоже (для iOS PWA)
async function getUserIdAsync() {
  // 1. Синхронные источники
  var sync = getUserId();
  console.log('[Auth] sync:', sync, 'ls:', localStorage.getItem('dex_user_id'), 'cookie:', getCookie('dex_user_id'));
  if (sync) return sync;
  // 2. IndexedDB
  var idbVal = await idbGet('dex_user_id');
  console.log('[Auth] IDB:', idbVal);
  if (idbVal) {
    try { localStorage.setItem('dex_user_id', idbVal); } catch(e){}
    try { sessionStorage.setItem('dex_user_id', idbVal); } catch(e){}
    return idbVal;
  }
  return null;
}
function saveUserId(id) {
  try { localStorage.setItem('dex_user_id', id); } catch(e){}
  try { sessionStorage.setItem('dex_user_id', id); } catch(e){}
  try { setCookie('dex_user_id', id, 365); } catch(e){}
  try { idbSet('dex_user_id', id); } catch(e){}
  console.log('[Auth] saved:', id,
    'ls:', !!localStorage.getItem('dex_user_id'),
    'cookie:', !!getCookie('dex_user_id'));
}
function removeUserId() {
  localStorage.removeItem('dex_user_id');
  sessionStorage.removeItem('dex_user_id');
  setCookie('dex_user_id', '', -1);
  idbDel('dex_user_id');
}
// ═══ FIREBASE INIT ═══
try{
  const app=firebase.initializeApp(firebaseConfig);
  db=app.firestore();
  // Офлайн кэш — приложение загружается мгновенно из кэша
  var isSafariBrowser = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if(!isSafariBrowser){
    db.enablePersistence({synchronizeTabs:true}).catch(function(err){
      if(err.code==='failed-precondition'){
        // Несколько вкладок открыто — кэш в первой
      } else if(err.code==='unimplemented'){
        // Браузер не поддерживает
      }
    });
  }
  // Safari/iOS — включаем long polling ДО любых операций с БД
  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if(isSafari || isIOS){
    try {
      db.settings({experimentalForceLongPolling:true});
      console.log('[RavenEye] iOS/Safari: long polling enabled');
    } catch(e) {
      console.log('[RavenEye] settings error (ok):', e.message);
    }
  }
  console.log('[RavenEye] Firebase OK, db:', !!db);
  // ── AUTO LOGIN — ждём IDB перед проверкой ──
  openIDB().then(function() {
    return getUserIdAsync();
  }).then(function(_savedId) {
    if(_savedId){
      const _inp=document.getElementById('login-inp');
      if(_inp)_inp.value=_savedId;
      setTimeout(()=>{window.doLogin&&window.doLogin();},800);
    }
  });
}catch(e){console.error('[RavenEye] Firebase init error:',e);}


// ═══ Service Worker + Push Notifications ═══
var _swReg = null;

function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    _swReg = reg;
    console.log('[RavenEye] SW registered');
  }).catch(function(e) {
    console.log('[RavenEye] SW error:', e);
  });
}

function requestPushPermission() {
  try {
    if (!('Notification' in window) || !window.Notification) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(function(perm) {
        console.log('[RavenEye] Notification permission:', perm);
      }).catch(function(){});
    }
  } catch(e) {
    console.log('[RavenEye] Notifications not supported');
  }
}

function sendPushNotification(title, body, tag) {
  try {
    if (document.visibilityState === 'visible') return;
    if (!_swReg || !('Notification' in window) || !window.Notification) return;
    if (Notification.permission !== 'granted') return;
    _swReg.active && _swReg.active.postMessage({
    type:    'SHOW_NOTIFICATION',
    title:   title,
    body:    body,
    tag:     tag || 'raveneye',
    vibrate: [100, 50, 200],
    url:     window.location.href,
  });
  } catch(e) {}
}

// Инициализируем при загрузке
initServiceWorker();

// ═══ FEATURE 5: LOGIN SUCCESS ANIMATION ═══
// ═══ Защита от брутфорса ═══
var _loginAttempts = 0;
var _loginBlockedUntil = 0;
var _loginLastAttempt = 0;

window.doLogin=async function(){
  console.log('[doLogin] called, db=', !!db);
  const raw=document.getElementById('login-inp').value.trim().toUpperCase();
  const btn=document.getElementById('login-btn'),errEl=document.getElementById('login-error'),inp=document.getElementById('login-inp');
  if(!raw){errEl.textContent='Введите ID';return;}
  if(!db){errEl.textContent='Ошибка подключения к серверу';console.error('[doLogin] db is null!');return;}
  // Проверка блокировки
  var _now = Date.now();
  if(_loginBlockedUntil > _now){
    var _secsLeft = Math.ceil((_loginBlockedUntil - _now)/1000);
    errEl.textContent='Слишком много попыток. Подождите '+_secsLeft+' сек.';
    return;
  }
  if(_loginAttempts >= 3){
    var _delay = Math.min(_loginAttempts * 2000, 30000);
    if(_now - _loginLastAttempt < _delay){
      errEl.textContent='Подождите перед следующей попыткой...';
      return;
    }
  }
  if(_loginAttempts >= 10){
    _loginBlockedUntil = _now + 5*60*1000;
    errEl.textContent='Аккаунт временно заблокирован на 5 минут.';
    return;
  }
  _loginLastAttempt = _now;
  btn.disabled=true;btn.textContent='Проверка...';errEl.textContent='';
  try{
    console.log('[doLogin] querying user:', raw);
    const snap=await db.collection('users').doc(raw).get();
    console.log('[doLogin] snap received, exists:', snap.exists);
    if(!snap.exists){
      _loginAttempts++;
      inp.classList.add('error');setTimeout(()=>inp.classList.remove('error'),400);
      var attLeft = Math.max(0, 10 - _loginAttempts);
      errEl.textContent='Неверный ID.'+(attLeft < 5 ? ' Осталось попыток: '+attLeft : '');
      btn.disabled=false;btn.textContent='ВОЙТИ В СИСТЕМУ';return;
    }
    // Проверяем что аккаунт активен
    if(snap.data().active===false){
      _loginAttempts++;
      inp.classList.add('error');setTimeout(()=>inp.classList.remove('error'),400);
      errEl.textContent='Доступ заблокирован. Обратитесь к администратору.';
      btn.disabled=false;btn.textContent='ВОЙТИ В СИСТЕМУ';return;
    }
    // Сброс счётчика при успешном входе
    _loginAttempts=0; _loginBlockedUntil=0;
    // Логируем вход в Firebase
    try{
      var _device  = /iPhone|iPad/.test(navigator.userAgent)?'iOS':/Android/.test(navigator.userAgent)?'Android':'Desktop';
      var _browser = /Safari/.test(navigator.userAgent)&&!/Chrome/.test(navigator.userAgent)?'Safari':/Chrome/.test(navigator.userAgent)?'Chrome':'Other';
      var _pwa     = window.matchMedia('(display-mode: standalone)').matches;
      // Логируем через защищённый API (если задан) или напрямую
      apiCall('logLogin', { userId: raw, device: _device, browser: _browser, pwa: _pwa })
        .then(function(res) {
          if (!res) {
            // Fallback — напрямую в Firebase
            db.collection('users').doc(raw).update({
              lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
              loginCount: firebase.firestore.FieldValue.increment(1)
            }).catch(function(){});
            db.collection('users').doc(raw).collection('login_history').add({
              time: firebase.firestore.FieldValue.serverTimestamp(),
              device: _device, browser: _browser, pwa: _pwa
            }).catch(function(){});
          }
        }).catch(function(){});
    }catch(e){}
    currentUser={id:raw,...snap.data()};
    saveUserId(raw);
    btn.classList.add('success');btn.textContent='✓ ДОБРО ПОЖАЛОВАТЬ';
    showSkeleton();
    setTimeout(showMainApp,700);
  }catch(e){console.error('[doLogin error]',e.code, e.message, e);errEl.textContent='Ошибка: '+e.message;btn.disabled=false;btn.textContent='ВОЙТИ В СИСТЕМУ';}
};

window.doLogout=function(){
  removeUserId();currentUser=null;
  if(tradesUnsub){tradesUnsub();tradesUnsub=null;}
  if(window._userUnsub){try{window._userUnsub();}catch(e){}window._userUnsub=null;}

  trades=[];selectedId=null;seenTradeIds.clear();
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('main-app').style.display='none';
  document.getElementById('login-inp').value='';
  document.getElementById('login-error').textContent='';
  const btn=document.getElementById('login-btn');btn.disabled=false;btn.textContent='ВОЙТИ В СИСТЕМУ';btn.classList.remove('success');
};
