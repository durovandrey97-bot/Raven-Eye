// events.js — navigation, timer, filters, settings, login events

// ═══ MOBILE BOTTOM NAV ═══
function mobNav(tab,btn){
  if(window.innerWidth>768)return;
  if(navigator.vibrate)navigator.vibrate(8);
  if(tab==='signals'){
    // Close any open screens first
    closeMobCalc(false);closeMobSettings(false);closeMobTimer(false);
    document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('mob-active'));
    if(btn)btn.classList.add('mob-active');
    document.getElementById('trades-col')?.scrollTo({top:0,behavior:'smooth'});
  } else if(tab==='calc'){
    closeMobSettings(false);
    closeMobCalc(false);
    document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('mob-active'));
    if(btn)btn.classList.add('mob-active');
    if(window.innerWidth < 900) openMobTimer();
  } else if(tab==='profile'){
    closeMobCalc(false);closeMobSettings(false);closeMobTimer(false);
    if(typeof openProfileModal==='function') openProfileModal();
    else document.getElementById('profile-open-btn')?.click();
    setTimeout(()=>{document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('mob-active'));document.getElementById('mob-btn-signals')?.classList.add('mob-active');},200);
  } else if(tab==='settings'){
    closeMobCalc(false);closeMobTimer(false);
    document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('mob-active'));
    if(btn)btn.classList.add('mob-active');
    openMobSettings();
  }
}

// ── Settings sheet ──
function openMobSettings(){
  // Update dynamic values
  const tgStatus=currentUser?.tgChatId?'Подключено: '+currentUser.tgChatId:'Нажмите для подключения';
  const el=document.getElementById('settings-tg-status');if(el)el.textContent=tgStatus;
  const idEl=document.getElementById('settings-user-id');if(idEl)idEl.textContent=currentUser?.id||'—';
  // Ссылка поддержки с ID
  const suppLink=document.getElementById('support-link');
  if(suppLink&&currentUser?.id) suppLink.href='https://t.me/Denslezzz?text='+encodeURIComponent('Привет! Мой ID: '+currentUser.id+'\nПроблема: ');
  // Theme toggle state
  const isDark=currentTheme!=='light';
  const knob=document.getElementById('settings-theme-knob');
  const toggle=document.getElementById('settings-theme-toggle');
  const sub=document.getElementById('settings-theme-sub');
  if(knob)knob.style.left=isDark?'21px':'3px';
  if(toggle)toggle.style.background=isDark?'rgba(212,175,55,.2)':'rgba(255,255,255,.15)';
  if(sub)sub.textContent='Сейчас: '+(isDark?'тёмная':'светлая');
  // Sound toggle
  const soundKnob=document.getElementById('settings-sound-knob');
  const soundToggle=document.getElementById('settings-sound-toggle');
  if(soundKnob)soundKnob.style.left=alertsOn?'21px':'3px';
  if(soundToggle)soundToggle.style.background=alertsOn?'rgba(29,185,84,.25)':'rgba(255,255,255,.1)';
  // Alert threshold
  const thr=parseFloat(localStorage.getItem('dex_alert_thr')||'0.5');
  const thrEl=document.getElementById('settings-alert-thr');if(thrEl)thrEl.textContent=thr.toFixed(1)+'%';
  // Show
  document.getElementById('mob-settings-overlay')?.classList.add('open');
  document.getElementById('mob-settings-sheet')?.classList.add('open');
}

function closeMobSettings(resetNav=true){
  document.getElementById('mob-settings-overlay')?.classList.remove('open');
  document.getElementById('mob-settings-sheet')?.classList.remove('open');
  if(resetNav){document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('mob-active'));document.getElementById('mob-btn-signals')?.classList.add('mob-active');}
}

function settingsToggleTheme(){
  const newTheme=currentTheme==='dark'?'light':'dark';
  applyTheme(newTheme);
  const isDark=newTheme!=='light';
  const knob=document.getElementById('settings-theme-knob');
  const toggle=document.getElementById('settings-theme-toggle');
  const sub=document.getElementById('settings-theme-sub');
  if(knob)knob.style.left=isDark?'21px':'3px';
  if(toggle)toggle.style.background=isDark?'rgba(212,175,55,.2)':'rgba(255,255,255,.15)';
  if(sub)sub.textContent='Сейчас: '+(isDark?'тёмная':'светлая');
}

function settingsToggleSound(){
  alertsOn=!alertsOn;
  const knob=document.getElementById('settings-sound-knob');
  const toggle=document.getElementById('settings-sound-toggle');
  if(knob)knob.style.left=alertsOn?'21px':'3px';
  if(toggle)toggle.style.background=alertsOn?'rgba(29,185,84,.25)':'rgba(255,255,255,.1)';
  document.getElementById('alert-btn')?.classList.toggle('on',alertsOn);
}

function settingsAlertThreshold(delta){
  let thr=parseFloat(localStorage.getItem('dex_alert_thr')||'0.5')+delta;
  thr=Math.max(0,Math.min(3,thr));thr=parseFloat(thr.toFixed(1));
  localStorage.setItem('dex_alert_thr',thr);
  const el=document.getElementById('settings-alert-thr');if(el)el.textContent=thr.toFixed(1)+'%';
}

function copyUserId(){
  const id=currentUser?.id||'';
  if(navigator.clipboard)navigator.clipboard.writeText(id);
  const btn=event.target;const orig=btn.textContent;
  btn.textContent='✓ Скопировано';btn.style.color='var(--green)';
  setTimeout(()=>{btn.textContent=orig;btn.style.color='';},1500);
}

// ── Calculator screen ──
function openMobCalc(){
  document.getElementById('mob-calc-screen')?.classList.add('open');
  renderMobCalc();
}

// ═══ TIMER TAB ═══

function openMobTimer(){
  // На ПК мобильный таймер не открываем — есть sidebar
  if(window.innerWidth >= 900) return;
  document.getElementById('mob-timer-screen')?.classList.add('open');
  renderTimerScreen();
}

function closeMobTimer(resetNav=true){
  document.getElementById('mob-timer-screen')?.classList.remove('open');
  if(resetNav){
    document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('mob-active'));
    document.getElementById('mob-btn-signals')?.classList.add('mob-active');
  }
}

function setActiveTrade(trade){
  activeTimerTrade = trade;
  document.getElementById('timer-nav-badge')?.classList.add('show');
  if(navigator.vibrate) navigator.vibrate([8,40,8]);
  // Тост подтверждения
  showToast('⏱ Таймер запущен · '+trade.pair+' · +'+(((trade.lo||0)+(trade.hi||0))/2-0.06).toFixed(2)+'%', 'success');
  // Switch to timer tab
  if(window.innerWidth < 900){
    document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('mob-active'));
    document.getElementById('mob-btn-calc')?.classList.add('mob-active');
    openMobTimer();
  }
  updatePcTimer();
}

function clearActiveTrade(){
  activeTimerTrade = null;
  updatePcTimer();
  if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
  document.getElementById('timer-nav-badge')?.classList.remove('show');
}

function renderTimerScreen(){
  const empty = document.getElementById('timer-empty');
  const active = document.getElementById('timer-active');
  if(!activeTimerTrade || !empty || !active){
    if(empty) empty.style.display='flex';
    if(active) active.style.display='none';
    document.getElementById('timer-header-sub').textContent='Выберите сделку';
    return;
  }
  empty.style.display='none';
  active.style.display='block';
  const t = activeTimerTrade;
  const chainMeta = CHAIN_META[t.chain]||{label:t.chain,color:'#888'};
  const color = chainMeta.color||'#888';
  const avg = ((t.lo||0)+(t.hi||0))/2;
  const gas = chainMeta.gas||0.5;
  const yieldPct = (avg - 0.06 - gas/1000).toFixed(2);

  // Header
  document.getElementById('timer-header-sub').textContent = t.pair||'—';

  // Chain badge
  const badge = document.getElementById('timer-chain-badge');
  badge.textContent = chainMeta.label||t.chain.toUpperCase();
  badge.style.background = color+'18';
  badge.style.borderColor = color+'40';
  badge.style.color = color;

  document.getElementById('timer-dex-name').textContent = t.dex||'';
  document.getElementById('timer-pair-name').textContent = t.pair||'—';
  document.getElementById('timer-pool-name').textContent = (t.dir||[]).join(' → ')||'';
  document.getElementById('timer-spread').textContent = (t.hi||0).toFixed(2)+'%';
  document.getElementById('timer-yield').textContent = '+'+yieldPct+'%';
  document.getElementById('timer-vol').textContent = fmtVol(t.vol||0);
  document.getElementById('timer-window-label').textContent = (t.tmin||'?')+'–'+(t.tmax||'?')+' мин';

  // Start countdown
  if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
  
  // Calculate end time: use t.autoDate or current time + tmax minutes
  const startedAt = t.autoDate?.seconds ? t.autoDate.seconds*1000 : (Date.now() - 5*60*1000);
  const windowMs = (t.tmax||30) * 60 * 1000;
  const endTime = startedAt + windowMs;
  const totalMs = windowMs;

  function tick(){
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    const elapsed = totalMs - remaining;
    const pct = Math.max(0, Math.min(1, remaining/totalMs));
    const minutes = Math.floor(remaining/60000);
    const seconds = Math.floor((remaining%60000)/1000);

    // Countdown text
    const countEl = document.getElementById('timer-countdown');
    if(countEl) countEl.textContent = String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');

    // Ring color & offset
    const ring = document.getElementById('timer-ring');
    if(ring){
      const offset = CIRCUMFERENCE * (1-pct);
      ring.style.strokeDashoffset = offset;
      if(pct > 0.5) ring.style.stroke='#1db954';
      else if(pct > 0.2) ring.style.stroke='#f0a500';
      else { ring.style.stroke='#e53e3e'; if(seconds%2===0) ring.style.opacity='.7'; else ring.style.opacity='1'; }
    }

    // Progress bar
    const bar = document.getElementById('timer-window-bar');
    if(bar){
      bar.style.width = (pct*100)+'%';
      if(pct > 0.5) bar.style.background='#1db954';
      else if(pct > 0.2) bar.style.background='#f0a500';
      else bar.style.background='#e53e3e';
    }

    if(remaining <= 0){
      clearInterval(timerInterval); timerInterval=null;
      if(countEl) countEl.textContent='00:00';
      // Вибрация и анимация при истечении
      if(navigator.vibrate) navigator.vibrate([200,100,200,100,400]);
      if(ring){ ring.style.stroke='#e53e3e'; ring.style.animation='blink 0.5s ease-in-out infinite'; }
      if(typeof playSound==='function') playSound('expire');
      showToast('⏰ Окно входа закрыто! '+((activeTimerTrade?.pair)||''), 'error');
    }

    // Проверяем — пометила ли сделку как fixed через админку
    if(activeTimerTrade){
      const liveTrade = trades.find(function(x){ return x._id === activeTimerTrade._id; });
      if(liveTrade && liveTrade.fixed){
        clearInterval(timerInterval); timerInterval=null;
        showTimerFixedState();
      }
    }
  }
  tick();
  timerInterval = setInterval(tick, 1000);
}

function showTimerFixedState(){
  if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }

  const ring = document.getElementById('timer-ring');
  if(ring){ ring.style.stroke='#d4af37'; ring.style.opacity='1'; ring.style.strokeDashoffset='0'; }

  const countEl = document.getElementById('timer-countdown');
  if(countEl){ countEl.style.fontSize='28px'; countEl.style.color='#d4af37'; countEl.textContent='💰'; }

  const subEl = document.getElementById('timer-countdown-sub');
  if(subEl){ subEl.textContent='ФИКСИРУЙТЕ ПРИБЫЛЬ'; subEl.style.color='#d4af37'; subEl.style.fontWeight='700'; subEl.style.fontSize='14px'; }

  const bar = document.getElementById('timer-window-bar');
  if(bar){ bar.style.width='100%'; bar.style.background='linear-gradient(90deg,#d4af37,#f0a500)'; }

  const fixBtn = document.getElementById('timer-fix-btn');
  if(fixBtn){ fixBtn.style.background='linear-gradient(135deg,rgba(212,175,55,.5),rgba(212,175,55,.3))'; fixBtn.style.borderColor='rgba(212,175,55,.8)'; }

  if(navigator.vibrate) navigator.vibrate([100,50,100,50,200]);
  if(typeof playSound==='function') playSound('fixed_alert');
  setTimeout(function(){ openFixProfitModal(); }, 800);
}

// Fix profit flow
function openFixProfitModal(){
  if(!activeTimerTrade) return;
  const t = activeTimerTrade;
  const avg = ((t.lo||0)+(t.hi||0))/2;
  const gas = (CHAIN_META[t.chain]?.gas)||0.5;
  const suggested = currentUser?.balance ? Math.round(currentUser.balance * avg / 100 - gas) : 0;

  document.getElementById('fix-modal-pair').textContent = (t.pair||'—')+' · '+(CHAIN_META[t.chain]?.label||t.chain.toUpperCase());
  document.getElementById('fix-profit-inp').value = suggested > 0 ? suggested : '';
  document.getElementById('fix-modal-hint').textContent = 'Расчётная прибыль: +$'+suggested+' · добавится к капиталу';

  // Quick amount buttons
  const quickContainer = document.getElementById('fix-quick-btns');
  const amounts = [Math.round(suggested*0.5), suggested, Math.round(suggested*1.5), Math.round(suggested*2)].filter(x=>x>0);
  quickContainer.innerHTML = amounts.map(a=>`<button onclick="document.getElementById('fix-profit-inp').value=${a}" style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:6px 0;font-size:10px;font-weight:700;color:rgba(255,255,255,.45);font-family:'JetBrains Mono',monospace;cursor:pointer">$${a}</button>`).join('');

  document.getElementById('fix-profit-overlay')?.classList.add('open');
  setTimeout(()=>document.getElementById('fix-profit-inp')?.focus(), 300);
}

async function confirmFixProfit(){
  const inp = document.getElementById('fix-profit-inp');
  const amount = parseFloat(inp?.value||0);
  if(isNaN(amount) || amount < 0){ inp?.focus(); return; }

  if(!currentUser || !db) return;

  const btn = document.getElementById('fix-confirm-btn');
  btn.disabled=true; btn.textContent='Сохранение...';

  // Offline queue — если нет интернета сохраняем локально
  if(!navigator.onLine){
    var queueKey='dex_offline_queue';
    var queue=JSON.parse(localStorage.getItem(queueKey)||'[]');
    queue.push({type:'fixProfit',userId:currentUser.id,amount:amount,balance:Math.round(((currentUser.balance||0)+amount)*100)/100,ts:Date.now()});
    localStorage.setItem(queueKey,JSON.stringify(queue));
    // Применяем локально
    currentUser.balance=Math.round(((currentUser.balance||0)+amount)*100)/100;
    document.getElementById('profile-balance').textContent=fmtBal(currentUser.balance);
    document.getElementById('fix-profit-overlay')?.classList.remove('open');
    if(activeTimerTrade&&amount>0)saveProfitEntry(activeTimerTrade,amount);
    showToast('💾 Сохранено локально — отправим когда появится интернет','success');
    launchConfetti();
    if(typeof playSound==='function') playSound('profit');
    btn.disabled=false; btn.textContent='Подтвердить';
    if(activeTimerTrade){var fixedId=activeTimerTrade._id;trades=trades.filter(function(x){return x._id!==fixedId;});notifiedFixed.add(fixedId);render();}
    clearActiveTrade();closeMobTimer(true);applyProfileLevel(currentUser.balance);
    return;
  }
  try{
    const newBalance = Math.round(((currentUser.balance||0) + amount)*100)/100;
    await db.collection('users').doc(currentUser.id).update({balance:newBalance});
    currentUser.balance = newBalance;

    // Update UI
    document.getElementById('profile-balance').textContent = fmtBal(newBalance);
    const topBal = document.querySelector('.user-balance');
    if(topBal) topBal.textContent = fmtBal(newBalance);

    // Close modal
    document.getElementById('fix-profit-overlay')?.classList.remove('open');

    if(activeTimerTrade&&amount>0)saveProfitEntry(activeTimerTrade,amount);
    showToast('💰 +$'+amount+' добавлено к капиталу!', 'success');

    // Confetti
    launchConfetti();
    if(typeof playSound==='function') playSound('profit');

    // Скрываем сделку из списка (помечаем локально как обработанную)
    if(activeTimerTrade){
      var fixedId = activeTimerTrade._id;
      trades = trades.filter(function(x){ return x._id !== fixedId; });
      notifiedFixed.add(fixedId);
      render();
    }

    // Clear timer
    clearActiveTrade();
    closeMobTimer(true);

    // Re-render profile
    applyProfileLevel(newBalance);
    document.getElementById('profile-stat-balance')&&(document.getElementById('profile-stat-balance').textContent=fmtBal(newBalance));

  }catch(e){
    console.error('fix profit error', e);
    showToast('Ошибка сохранения. Попробуйте ещё раз.','error');
  }
  btn.disabled=false; btn.textContent='Подтвердить';
}

function showToast(msg, type='success'){
  const el=document.createElement('div');
  const color=type==='success'?'#1db954':'#e53e3e';
  const bg=type==='success'?'rgba(29,185,84,.12)':'rgba(229,62,62,.12)';
  el.style.cssText=`position:fixed;top:max(env(safe-area-inset-top,0px),44px)+8px;left:50%;transform:translateX(-50%);background:${bg};border:1px solid ${color}44;color:${color};font-size:12px;font-weight:700;padding:10px 18px;border-radius:10px;z-index:9999;font-family:'Space Grotesk',sans-serif;white-space:nowrap;pointer-events:none;animation:fadeIn .2s ease`;
  el.style.top = 'calc(max(env(safe-area-inset-top,0px), 44px) + 60px)';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 2800);
}

function closeMobCalc(resetNav=true){
  document.getElementById('mob-calc-screen')?.classList.remove('open');
  if(resetNav){document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('mob-active'));document.getElementById('mob-btn-signals')?.classList.add('mob-active');}
}

function wireTimerButtons(){
  const fixBtn=document.getElementById('timer-fix-btn');
  const cancelBtn=document.getElementById('timer-cancel-btn');
  const fixConfirm=document.getElementById('fix-confirm-btn');
  const fixCancel=document.getElementById('fix-cancel-btn');
  if(fixBtn&&!fixBtn._wired){fixBtn._wired=true;fixBtn.addEventListener('click',openFixProfitModal);fixBtn.addEventListener('touchend',function(e){e.preventDefault();openFixProfitModal();},{passive:false});}
  if(cancelBtn&&!cancelBtn._wired){cancelBtn._wired=true;cancelBtn.addEventListener('click',()=>{clearActiveTrade();closeMobTimer(true);});cancelBtn.addEventListener('touchend',function(e){e.preventDefault();clearActiveTrade();closeMobTimer(true);},{passive:false});}
  if(fixConfirm&&!fixConfirm._wired){fixConfirm._wired=true;fixConfirm.addEventListener('click',confirmFixProfit);fixConfirm.addEventListener('touchend',function(e){e.preventDefault();confirmFixProfit();},{passive:false});}
  if(fixCancel&&!fixCancel._wired){fixCancel._wired=true;fixCancel.addEventListener('click',()=>document.getElementById('fix-profit-overlay')?.classList.remove('open'));fixCancel.addEventListener('touchend',function(e){e.preventDefault();document.getElementById('fix-profit-overlay')?.classList.remove('open');},{passive:false});}
}


function setMobCalcAmt(amt){
  const inp=document.getElementById('mob-calc-inp');if(inp){inp.value=amt;}
  document.querySelectorAll('.mob-calc-quick').forEach(b=>{
    b.classList.remove('mob-calc-quick-active');
    const label=b.textContent.trim();
    if((amt===1000&&label==='$1K')||(amt===5000&&label==='$5K')||(amt===10000&&label==='$10K')||(amt===25000&&label==='$25K'))b.classList.add('mob-calc-quick-active');
  });
  renderMobCalc();
}

function renderMobCalc(){
  const inp=document.getElementById('mob-calc-inp');
  const container=document.getElementById('mob-calc-results');
  if(!container)return;
  const amount=parseFloat(inp?.value)||10000;
  const list=trades.filter(t=>!isExpired(t));
  if(!list.length){
    container.innerHTML='<div style="font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Активные сигналы</div><div style="color:rgba(255,255,255,.2);font-size:12px;text-align:center;padding:24px 0;font-family:JetBrains Mono,monospace">Нет активных сигналов</div>';
    return;
  }
  const chainColors={eth:'#6366F1',arb:'#29B6F6',sol:'#9945FF',bsc:'#F0B90B'};
  let bestProfit=0,totalProfit=0;
  const cards=list.sort((a,b)=>b.hi-a.hi).map(t=>{
    const avg=((t.lo||0)+(t.hi||0))/2;
    const gas=CHAIN_META[t.chain]?.gas||0.5;
    const fees=amount*0.3/100*2;
    const gross=amount*avg/100;
    const net=Math.max(gross-fees-gas,0);
    const roi=(net/amount*100);
    if(net>bestProfit)bestProfit=net;
    totalProfit+=net;
    const color=chainColors[t.chain]||'#888';
    const profitColor=net>0?'#1db954':'#e53e3e';
    return `<div style="background:${color}18;border:1px solid ${color}30;border-left:3px solid ${color};border-radius:10px;padding:11px 13px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="color:#fff;font-size:14px;font-weight:700">${t.pair}</div>
          <div style="color:rgba(255,255,255,.4);font-size:9px;margin-top:2px">${(CHAIN_META[t.chain]?.label||t.chain).toUpperCase()} · ${t.dex||''}</div>
        </div>
        <div style="text-align:right">
          <div style="color:${profitColor};font-size:17px;font-weight:700">+$${net.toFixed(0)}</div>
          <div style="color:${profitColor};font-size:9px;opacity:.7">+${roi.toFixed(2)}%</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
        <div style="text-align:center"><div style="color:rgba(255,255,255,.3);font-size:7px;text-transform:uppercase;margin-bottom:2px">Спред</div><div style="color:rgba(255,255,255,.7);font-size:10px;font-weight:700;font-family:JetBrains Mono,monospace">${avg.toFixed(2)}%</div></div>
        <div style="text-align:center"><div style="color:rgba(255,255,255,.3);font-size:7px;text-transform:uppercase;margin-bottom:2px">Газ</div><div style="color:rgba(255,255,255,.7);font-size:10px;font-weight:700;font-family:JetBrains Mono,monospace">−$${gas.toFixed(2)}</div></div>
        <div style="text-align:center"><div style="color:rgba(255,255,255,.3);font-size:7px;text-transform:uppercase;margin-bottom:2px">Комис.</div><div style="color:rgba(255,255,255,.7);font-size:10px;font-weight:700;font-family:JetBrains Mono,monospace">−$${fees.toFixed(0)}</div></div>
        <div style="text-align:center"><div style="color:rgba(255,255,255,.3);font-size:7px;text-transform:uppercase;margin-bottom:2px">Окно</div><div style="color:rgba(255,255,255,.7);font-size:10px;font-weight:700;font-family:JetBrains Mono,monospace">${t.tmin}–${t.tmax}м</div></div>
      </div>
    </div>`;
  }).join('');
  container.innerHTML=`<div style="font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Активные сигналы (${list.length})</div>
  ${cards}
  <div style="background:rgba(212,175,55,.07);border:1px solid rgba(212,175,55,.2);border-radius:10px;padding:12px 14px;margin-top:4px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <span style="color:rgba(255,255,255,.5);font-size:11px">Лучший результат</span>
      <span style="color:#d4af37;font-size:18px;font-weight:700">+$${bestProfit.toFixed(0)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="color:rgba(255,255,255,.3);font-size:10px">Если войти во все</span>
      <span style="color:rgba(212,175,55,.6);font-size:12px;font-weight:600">+$${totalProfit.toFixed(0)}</span>
    </div>
  </div>`;
}

// ── Mobile Filters ──
let mobFilterSpread=0,mobFilterVol=0,mobFilterDex='',mobFilterSortMode='spread',mobFilterSortDir='desc';
function openMobFilters(){
  mobFilterSpread=minSpread;mobFilterVol=minVol;mobFilterDex=filterDex;mobFilterSortMode=sortMode;mobFilterSortDir=sortDir;
  const spMap={0:'mf-sp-0',0.5:'mf-sp-05',1:'mf-sp-1',1.5:'mf-sp-15'};
  document.querySelectorAll('[id^="mf-sp-"]').forEach(b=>b.classList.remove('on'));document.getElementById(spMap[minSpread])?.classList.add('on');
  const volMap={0:'mf-vol-0',100000:'mf-vol-100k',1000000:'mf-vol-1m'};
  document.querySelectorAll('[id^="mf-vol-"]').forEach(b=>b.classList.remove('on'));document.getElementById(volMap[minVol]||'mf-vol-0')?.classList.add('on');
  const dexMap={'':'mf-dex-all','Uniswap':'mf-dex-uni','Pancake':'mf-dex-cake','Sushi':'mf-dex-sushi','1inch':'mf-dex-inch'};
  document.querySelectorAll('[id^="mf-dex-"]').forEach(b=>b.classList.remove('on'));document.getElementById(dexMap[filterDex]||'mf-dex-all')?.classList.add('on');
  const sortMap={'spread_desc':'mf-sort-sp-desc','spread_asc':'mf-sort-sp-asc','vol_desc':'mf-sort-vol-desc','vol_asc':'mf-sort-vol-asc'};
  document.querySelectorAll('[id^="mf-sort-"]').forEach(b=>b.classList.remove('on'));document.getElementById(sortMap[sortMode+'_'+sortDir])?.classList.add('on');
  document.getElementById('mob-filter-overlay')?.classList.add('open');
  document.getElementById('mob-filter-sheet')?.classList.add('open');
  if(navigator.vibrate)navigator.vibrate(8);
}
function closeMobFilters(){document.getElementById('mob-filter-overlay')?.classList.remove('open');document.getElementById('mob-filter-sheet')?.classList.remove('open');}
function setMobFilterSpread(val,btn){mobFilterSpread=val;document.querySelectorAll('[id^="mf-sp-"]').forEach(b=>b.classList.remove('on'));btn?.classList.add('on');}
function setMobFilterVol(val,btn){mobFilterVol=val;document.querySelectorAll('[id^="mf-vol-"]').forEach(b=>b.classList.remove('on'));btn?.classList.add('on');}
function setMobFilterDex(val,btn){mobFilterDex=val;document.querySelectorAll('[id^="mf-dex-"]').forEach(b=>b.classList.remove('on'));btn?.classList.add('on');}
function setMobFilterSort(mode,dir,btn){mobFilterSortMode=mode;mobFilterSortDir=dir;document.querySelectorAll('[id^="mf-sort-"]').forEach(b=>b.classList.remove('on'));btn?.classList.add('on');}
async function applyMobFilters(){
  minSpread=mobFilterSpread;minVol=mobFilterVol;filterDex=mobFilterDex;sortMode=mobFilterSortMode;sortDir=mobFilterSortDir;
  const hasFilters=minSpread>0||minVol>0||filterDex!=='';
  const badge=document.getElementById('mob-filter-badge');if(badge)badge.style.display=hasFilters?'block':'none';
  const btn=document.getElementById('mob-filter-btn');if(btn){btn.style.borderColor=hasFilters?'rgba(212,175,55,.5)':'';btn.style.color=hasFilters?'#d4af37':'';}
  await render();closeMobFilters();
  if(navigator.vibrate)navigator.vibrate([5,30,5]);
}
function resetMobFilters(){
  mobFilterSpread=0;mobFilterVol=0;mobFilterDex='';mobFilterSortMode='spread';mobFilterSortDir='desc';
  document.querySelectorAll('[id^="mf-"]').forEach(b=>b.classList.remove('on'));
  ['mf-sp-0','mf-vol-0','mf-dex-all','mf-sort-sp-desc'].forEach(id=>document.getElementById(id)?.classList.add('on'));
}

function updateMobAlertBadge(count){
  const b=document.getElementById('mob-alert-badge');
  if(!b)return;
  if(count>0){b.textContent=count>99?'99+':count;b.classList.add('show');}
  else b.classList.remove('show');
}

// ═══ PWA ═══
let deferredPrompt=null;
const manifest={name:'DEX Scanner PRO',short_name:'DEX Scanner',description:'Профессиональный сканер DEX арбитража',start_url:'/',display:'standalone',orientation:'portrait-primary',background_color:'#070910',theme_color:'#0b0d12',icons:[{src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="%230b0d12"/><polygon points="96,24 168,66 168,126 96,168 24,126 24,66" stroke="%231db954" stroke-width="10" fill="none"/><circle cx="96" cy="96" r="24" fill="%231db954"/></svg>',sizes:'192x192',type:'image/svg+xml'},{src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="%230b0d12"/><polygon points="256,60 448,170 448,342 256,452 64,342 64,170" stroke="%231db954" stroke-width="24" fill="none"/><circle cx="256" cy="256" r="64" fill="%231db954"/></svg>',sizes:'512x512',type:'image/svg+xml'}],categories:['finance'],lang:'ru'};
const manifestBlob=new Blob([JSON.stringify(manifest)],{type:'application/json'});
const manifestLink=document.getElementById('manifest-link');if(manifestLink)manifestLink.href=URL.createObjectURL(manifestBlob);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
document.getElementById('pwa-install-btn')?.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById('pwa-banner')?.classList.remove('show');});
document.getElementById('pwa-close')?.addEventListener('click',()=>{document.getElementById('pwa-banner')?.classList.remove('show');sessionStorage.setItem('pwa_dismissed','1');});

// ═══ FULLSCREEN ═══
document.getElementById('fs-btn')?.addEventListener('click',()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});else document.exitFullscreen().catch(()=>{});});
document.addEventListener('fullscreenchange',()=>{const btn=document.getElementById('fs-btn');if(btn)btn.textContent=document.fullscreenElement?'✕':'⛶';});

// ═══ THEME ═══
document.getElementById('theme-btn')?.addEventListener('click',()=>applyTheme(currentTheme==='dark'?'light':'dark'));

// ═══ ALERTS TOGGLE ═══
document.getElementById('alert-btn')?.addEventListener('click',()=>window.toggleAlerts&&window.toggleAlerts());

// ═══ LOGIN EVENTS ═══
(function(){
  var btn=document.getElementById('login-btn');
  var inp=document.getElementById('login-inp');
  if(btn){
    var moved=false;
    btn.addEventListener('touchstart',function(){moved=false;},{passive:true});
    btn.addEventListener('touchmove',function(){moved=true;},{passive:true});
    btn.addEventListener('touchend',function(e){if(moved)return;e.preventDefault();window.doLogin&&window.doLogin();},{passive:false});
    btn.addEventListener('click',function(){window.doLogin&&window.doLogin();});
  }
  if(inp){
    inp.addEventListener('keydown',function(e){if(e.key==='Enter')window.doLogin&&window.doLogin();});
  }
})();
document.getElementById('logout-btn')?.addEventListener('click',()=>window.doLogout&&window.doLogout());


// ═══ MODAL CLOSE ═══
document.getElementById('profile-modal-close')?.addEventListener('click',()=>document.getElementById('profile-modal').classList.remove('show'));
document.getElementById('profile-modal')?.addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove('show');});
document.getElementById('detail-modal-close')?.addEventListener('click',()=>{document.getElementById('detail-modal').classList.remove('show');});
document.getElementById('detail-modal')?.addEventListener('click',e=>{if(e.target===e.currentTarget){e.currentTarget.classList.remove('show');}});
document.getElementById('tg-connect-btn')?.addEventListener('click',()=>showTgRegModal());

// ═══ SWIPE TO REVEAL ═══
function initSwipeCards(){
  const THRESHOLD = 60;    // px to trigger reveal
  const MAX_SWIPE = 160;   // max px (width of reveal panel)
  const SNAP_OPEN = 160;
  const SNAP_CLOSE = 0;

  document.querySelectorAll('.trade-item-wrap').forEach(wrap=>{
    const card = wrap.querySelector('.trade-item');
    if(!card || wrap._swipeInited) return;
    wrap._swipeInited = true;

    let startX=0, startY=0, currentX=0, isDragging=false, isOpen=false, isLocked=false;

    function setX(x, animate){
      currentX = Math.max(-MAX_SWIPE, Math.min(0, x));
      card.style.transition = animate ? 'transform .28s cubic-bezier(.25,.46,.45,.94)' : 'none';
      card.style.transform = `translateX(${currentX}px)`;
    }

    function open(animate){
      isOpen = true;
      setX(-SNAP_OPEN, animate);
      if(navigator.vibrate) navigator.vibrate(10);
    }

    function close(animate){
      isOpen = false;
      setX(SNAP_CLOSE, animate);
    }

    // Close all other open cards
    function closeOthers(){
      document.querySelectorAll('.trade-item-wrap').forEach(w=>{
        if(w !== wrap && w._swipeClose) w._swipeClose();
      });
    }
    wrap._swipeClose = ()=>close(true);

    card.addEventListener('touchstart', e=>{
      if(isLocked) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      isDragging = false;
      card.style.transition = 'none';
    }, {passive:true});

    card.addEventListener('touchmove', e=>{
      if(isLocked) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // Determine drag direction on first move
      if(!isDragging){
        if(Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        if(Math.abs(dy) > Math.abs(dx)){
          isLocked = true;
          setTimeout(()=>isLocked=false, 50);
          return;
        }
        isDragging = true;
        closeOthers();
      }

      e.preventDefault();
      const base = isOpen ? -SNAP_OPEN : 0;
      setX(base + dx, false);
    }, {passive:false});

    card.addEventListener('touchend', e=>{
      isLocked = false;
      if(!isDragging){
        if(isOpen){ close(true); return; }
        return;
      }
      isDragging = false;
      const velocity = currentX / SNAP_OPEN;

      if(currentX < -THRESHOLD){
        open(true);
      } else {
        close(true);
      }
    }, {passive:true});

    // Swipe reveal button actions
    wrap.querySelectorAll('.swipe-reveal-btn').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const pair = btn.dataset.pair || '';

        if(action === 'share'){
          const t = trades.find(x=>x._id===id);
          if(t){ close(true); setTimeout(()=>openShareModal(t), 200); }
        } else if(action === 'copy'){
          navigator.clipboard.writeText(pair).then(()=>{
            const orig = btn.innerHTML;
            btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Скопировано';
            btn.style.background = '#0a5c2f';
            if(navigator.vibrate) navigator.vibrate([5,30,5]);
            setTimeout(()=>{ btn.innerHTML=orig; btn.style.background=''; close(true); }, 1200);
          });
        }
      });

      // Touch support for reveal buttons
      let bMoved=false;
      btn.addEventListener('touchstart',()=>bMoved=false,{passive:true});
      btn.addEventListener('touchmove',()=>bMoved=true,{passive:true});
      btn.addEventListener('touchend',e=>{
        if(bMoved)return;
        e.preventDefault();
        btn.click();
      },{passive:false});
    });
  });
}

// ═══ MOBILE NAV — iOS PWA TOUCH FIX ═══
(function(){
  // Глобальный touchend для кнопок топбара (iOS PWA не передаёт click на sticky)
  document.addEventListener('touchend', function(e){
    var t = e.target.closest('#profile-open-btn, #theme-btn, #alert-btn, #tg-connect-btn, #logout-btn');
    if(!t) return;
    e.preventDefault();
    var id = t.id;
    if(id==='profile-open-btn' && typeof openProfileModal==='function') openProfileModal();
    else if(id==='theme-btn') applyTheme(currentTheme==='dark'?'light':'dark');
    else if(id==='alert-btn' && typeof window.toggleAlerts==='function') window.toggleAlerts();
    else if(id==='tg-connect-btn' && typeof showTgRegModal==='function') showTgRegModal();
    else if(id==='logout-btn' && window.doLogout) window.doLogout();
  }, {passive:false});
  // On iOS PWA, position:fixed elements need touchend instead of click
  function T(el, fn){
    if(!el) return;
    var moved=false;
    el.addEventListener('touchstart',function(){moved=false;},{passive:true});
    el.addEventListener('touchmove',function(){moved=true;},{passive:true});
    el.addEventListener('touchend',function(e){
      if(moved)return;
      e.preventDefault();
      fn();
    },{passive:false});
    el.addEventListener('click',fn);
  }
  // Nav
  T(document.getElementById('mob-btn-signals'),function(){mobNav('signals',document.getElementById('mob-btn-signals'));});
  T(document.getElementById('mob-btn-calc'),function(){mobNav('calc',document.getElementById('mob-btn-calc'));});
  T(document.getElementById('mob-btn-profile'),function(){mobNav('profile',document.getElementById('mob-btn-profile'));});
  T(document.getElementById('mob-btn-settings'),function(){mobNav('settings',document.getElementById('mob-btn-settings'));});
  T(document.getElementById('mob-filter-btn'),function(){openMobFilters();});
  // Топбар кнопки — тоже нужен touchend fix для iOS PWA

  // Bind all buttons inside fixed panels using event delegation
  function delegateFixed(containerId){
    var el=document.getElementById(containerId);
    if(!el)return;
    var moved=false;
    el.addEventListener('touchstart',function(){moved=false;},{passive:true});
    el.addEventListener('touchmove',function(){moved=true;},{passive:true});
    el.addEventListener('touchend',function(e){
      if(moved)return;
      var btn=e.target.closest('button,[onclick],[data-fn]');
      if(!btn)return;
      e.preventDefault();
      var fn=btn.getAttribute('data-fn')||btn.getAttribute('onclick');
      if(fn)runFn(fn,btn);
    },{passive:false});
  }
  function runFn(fn,btn){
    if(fn.includes('showTgRegModal')){closeMobSettings();setTimeout(function(){showTgRegModal();},350);}
    else if(fn.includes('doLogout')){closeMobSettings();setTimeout(function(){window.doLogout();},100);}
    else if(fn.includes('settingsToggleTheme'))settingsToggleTheme();
    else if(fn.includes('settingsToggleSound'))settingsToggleSound();
    else if(fn.includes('copyUserId'))copyUserId();
    else if(fn.includes('toggleNetVisibility')){
      var m=fn.match(/toggleNetVisibility\('([^']+)'/);
      if(m)toggleNetVisibility(m[1],btn);
    }
    else if(fn.includes('closeMobSettings'))closeMobSettings();
    else if(fn.includes('closeMobCalc'))closeMobCalc();
    else if(fn.includes('closeMobFilters'))closeMobFilters();
    else if(fn.includes('settingsAlertThreshold')){
      var m=fn.match(/settingsAlertThreshold\(([^)]+)\)/);
      if(m)settingsAlertThreshold(parseFloat(m[1]));
    }
    else if(fn.includes('applyMobFilters'))applyMobFilters();
    else if(fn.includes('resetMobFilters'))resetMobFilters();
    else if(fn.includes('setMobFilterSpread')){
      var m=fn.match(/setMobFilterSpread\(([^,)]+)/);
      if(m)setMobFilterSpread(parseFloat(m[1]),btn);
    }
    else if(fn.includes('setMobFilterVol')){
      var m=fn.match(/setMobFilterVol\(([^,)]+)/);
      if(m)setMobFilterVol(parseFloat(m[1]),btn);
    }
    else if(fn.includes('setMobFilterDex')){
      var m=fn.match(/setMobFilterDex\('([^']*)'/);
      if(m)setMobFilterDex(m[1],btn);
    }
    else if(fn.includes('setMobFilterSort')){
      var m=fn.match(/setMobFilterSort\('([^']*)','([^']*)'/);
      if(m)setMobFilterSort(m[1],m[2],btn);
    }
    else if(fn.includes('setMobCalcAmt')){
      var m=fn.match(/setMobCalcAmt\(([^)]+)\)/);
      if(m){var a=m[1];setMobCalcAmt(a.includes('currentUser')?currentUser?currentUser.balance||10000:10000:parseFloat(a));}
    }
    else if(fn.includes('closeMobTimer'))closeMobTimer();
    else if(fn.includes('openFixProfitModal'))openFixProfitModal();
    else if(fn.includes('confirmFixProfit'))confirmFixProfit();
  }
  delegateFixed('mob-settings-sheet');
  delegateFixed('mob-calc-screen');
  delegateFixed('mob-filter-sheet');
  delegateFixed('mob-timer-screen');
  delegateFixed('fix-profit-card');
  // Close fix-profit overlay on backdrop tap
  var fpOverlay=document.getElementById('fix-profit-overlay');
  if(fpOverlay){
    var fpMoved=false;
    fpOverlay.addEventListener('touchstart',function(){fpMoved=false;},{passive:true});
    fpOverlay.addEventListener('touchmove',function(){fpMoved=true;},{passive:true});
    fpOverlay.addEventListener('touchend',function(e){
      if(fpMoved)return;
      if(e.target===fpOverlay){e.preventDefault();fpOverlay.classList.remove('open');}
    },{passive:false});
    fpOverlay.addEventListener('click',function(e){if(e.target===fpOverlay)fpOverlay.classList.remove('open');});
  }
  // Also bind calc input
  var calcInp=document.getElementById('mob-calc-inp');
  if(calcInp)calcInp.addEventListener('input',renderMobCalc);
  wireTimerButtons();
})();

// ═══ ПК таймер sidebar ═══
var _pcTimerInterval = null;

function updatePcTimer() {
  var sidebar  = document.getElementById('pc-timer-sidebar');
  var empty    = document.getElementById('pc-timer-empty');
  var active   = document.getElementById('pc-timer-active');
  if (!sidebar) return;

  if (!activeTimerTrade) {
    if (empty)  empty.style.display  = 'flex';
    if (active) active.style.display = 'none';
    sidebar.classList.remove('fixed-state');
    clearInterval(_pcTimerInterval);
    _pcTimerInterval = null;
    return;
  }

  if (empty)  empty.style.display  = 'none';
  if (active) active.style.display = 'flex';

  var t = activeTimerTrade;
  var cm = CHAIN_META[t.chain] || {label: t.chain, color: '#888', gas: 0.5};
  var avg = ((t.lo||0)+(t.hi||0))/2;
  var yieldPct = (avg - 0.06 - cm.gas/1000).toFixed(2);

  // Бейдж сети
  var badge = document.getElementById('pc-timer-badge');
  if (badge) {
    badge.textContent = cm.label;
    badge.style.background  = cm.color + '18';
    badge.style.border      = '1px solid ' + cm.color + '40';
    badge.style.color       = cm.color;
  }
  var pairEl = document.getElementById('pc-timer-pair');
  if (pairEl) pairEl.textContent = t.pair || '—';
  var dexEl  = document.getElementById('pc-timer-dex');
  if (dexEl)  dexEl.textContent  = t.dex  || '';

  // Статы
  var spEl = document.getElementById('pc-spread');
  if (spEl) spEl.textContent = (t.hi||0).toFixed(2) + '%';
  var ylEl = document.getElementById('pc-yield');
  if (ylEl) ylEl.textContent = '+' + yieldPct + '%';
  var volEl = document.getElementById('pc-vol');
  if (volEl) volEl.textContent = typeof fmtVol === 'function' ? fmtVol(t.vol||0) : '$' + (t.vol||0);
  var winEl = document.getElementById('pc-window-label');
  if (winEl) winEl.textContent = (t.tmin||'?') + '–' + (t.tmax||'?') + ' мин';

  // Запускаем тик если ещё не запущен
  if (!_pcTimerInterval) {
    _pcTimerInterval = setInterval(tickPcTimer, 1000);
    tickPcTimer();
  }
}

function tickPcTimer() {
  if (!activeTimerTrade) {
    clearInterval(_pcTimerInterval); _pcTimerInterval = null; return;
  }
  var t = activeTimerTrade;
  var startedAt = t.autoDate && t.autoDate.seconds ? t.autoDate.seconds*1000 : Date.now()-5*60*1000;
  var windowMs  = (t.tmax||30) * 60 * 1000;
  var endTime   = startedAt + windowMs;
  var remaining = Math.max(0, endTime - Date.now());
  var pct       = Math.max(0, Math.min(1, remaining / windowMs));

  var mins = Math.floor(remaining/60000);
  var secs = String(Math.floor((remaining%60000)/1000)).padStart(2,'0');
  var cdEl = document.getElementById('pc-timer-countdown');
  if (cdEl) cdEl.textContent = mins + ':' + secs;

  // Кольцо
  var CIRC = 326.7;
  var ring = document.getElementById('pc-timer-ring');
  if (ring) {
    ring.style.strokeDashoffset = (CIRC * (1 - pct)).toFixed(1);
    ring.style.stroke = pct > 0.5 ? '#1db954' : pct > 0.2 ? '#f0a500' : '#e53e3e';
  }

  // Прогресс бар
  var bar = document.getElementById('pc-window-bar');
  if (bar) {
    bar.style.width = (pct*100) + '%';
    bar.style.background = pct > 0.5 ? '#1db954' : pct > 0.2 ? '#f0a500' : '#e53e3e';
  }

  // Fixed state
  if (t.fixed) {
    var sidebar = document.getElementById('pc-timer-sidebar');
    if (sidebar) sidebar.classList.add('fixed-state');
    var cdLabel = document.getElementById('pc-timer-label');
    if (cdLabel) cdLabel.textContent = 'ФИКСИРУЙТЕ!';
    if (ring) { ring.style.stroke = '#d4af37'; ring.style.strokeDashoffset = '0'; }
    if (cdEl) { cdEl.textContent = String.fromCodePoint(0x1F4B0); cdEl.style.fontSize = '28px'; }
  }

  if (remaining <= 0) {
    clearInterval(_pcTimerInterval); _pcTimerInterval = null;
    if (cdEl) cdEl.textContent = '00:00';
  }
}

// ═══ Offline queue processor ═══
function processOfflineQueue() {
  if (!navigator.onLine || !db || !currentUser) return;
  var queueKey = 'dex_offline_queue';
  var queue;
  try { queue = JSON.parse(localStorage.getItem(queueKey)||'[]'); } catch(e){ return; }
  if (!queue.length) return;

  var item = queue[0]; // берём первый
  if (item.type === 'fixProfit' && item.userId === currentUser.id) {
    db.collection('users').doc(item.userId).update({balance: item.balance})
      .then(function(){
        queue.shift(); // убираем обработанный
        localStorage.setItem(queueKey, JSON.stringify(queue));
        currentUser.balance = item.balance;
        document.getElementById('profile-balance').textContent = fmtBal(item.balance);
        showToast('✅ Прибыль синхронизирована с сервером', 'success');
        if (queue.length) setTimeout(processOfflineQueue, 1000);
      })
      .catch(function(){ setTimeout(processOfflineQueue, 5000); });
  }
}

window.addEventListener('online', function(){
  showToast('🌐 Соединение восстановлено', 'success');
  setTimeout(processOfflineQueue, 1000);
});
