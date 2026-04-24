// ui.js


// ═══ HELPERS ═══
function fmtVol(v){if(v>=1e9)return '$'+(v/1e9).toFixed(1)+'B';if(v>=1e6)return '$'+(v/1e6).toFixed(1)+'M';if(v>=1e3)return '$'+(v/1e3).toFixed(0)+'K';return '$'+v}
function fmtBal(v){if(v>=1e6)return '$'+(v/1e6).toFixed(2)+'M';if(v>=1e3)return '$'+(v/1e3).toFixed(1)+'K';return '$'+v}
function spCls(v){return v>=1.8?'sp-hi-r':v>=1.1?'sp-hi-a':'sp-hi-g'}
function chainBadge(c){const m=CHAIN_META[c];if(!m)return '';return `<span class="b b-chain" style="color:${m.color};border-color:${m.color}55;background:${m.color}12">${m.label}</span>`}
function getTokenIcon(sym){const t=TOKEN_ICONS[sym]||{bg:'#4a9eff'};return `<span class="token-icon" style="background:${t.bg}22;border-color:${t.bg}55;color:${t.bg}">${sym.slice(0,3)}</span>`}
function getAddedTime(t){if(t.createdAtMs)return new Date(t.createdAtMs);if(!t.createdAt)return null;if(t.createdAt.toDate)return t.createdAt.toDate();if(t.createdAt.seconds)return new Date(t.createdAt.seconds*1000);return null;}
function hasRealTime(t){return !!(t.createdAtMs||t.createdAt?.seconds||t.createdAt?.toDate);}
function isExpired(t){const d=getAddedTime(t);return hasRealTime(t)&&d?(Date.now()-d.getTime())>30*60*1000:false;}
function getPoolName(t){const dex=(t.dex||'').toLowerCase(),asset=(t.pair||'').split('/')[1]||(t.pair||'').split('/')[0];if(dex.includes('uniswap')){const f=['0.05%','0.3%','1%'];return `${asset}/USDT · Uniswap ${f[Math.abs(asset.charCodeAt(0))%3]}`}if(dex.includes('pancake'))return `${asset}-USDT · PancakeSwap ${(t.vol||0)>2e6?'v3':'v2'}`;if(dex.includes('sushi'))return `${asset}/USDT · SushiSwap SLP`;if(dex.includes('1inch'))return `${asset}/USDT · 1inch Aggregated`;return `${asset}/USDT Pool`;}

// ═══ FILTERS ═══
function getFiltered(){
  let list=trades.filter(t=>{
    if(chain!=='all'&&t.chain!==chain)return false;
    if(hiddenNets.includes(t.chain))return false;
    if(t.hi<minSpread)return false;
    if((t.vol||0)<minVol)return false;
    if(filterDex&&!(t.dex||'').includes(filterDex))return false;
    return true;
  });
  const dir=sortDir==='desc'?-1:1;
  return sortMode==='spread'?list.sort((a,b)=>(b.hi-a.hi)*dir):list.sort((a,b)=>(b.vol-a.vol)*dir);
}
window.setChain=function(c,btn){
  document.querySelectorAll('.ctab').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  if(navigator.vibrate)navigator.vibrate(5);
  if(c==='history'){chain='history';renderHistory();updateStats([]);}
  else{
    chain=c;
    const col=document.getElementById('trades-col');
    if(col){col.style.opacity='.3';col.style.transition='opacity .1s';}
    setTimeout(async()=>{await render();if(col){col.style.opacity='1';}},80);
  }
};
window.setDex=async function(d,btn){
  filterDex=d;
  document.querySelectorAll('[id^="dex-"]').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  if(navigator.vibrate)navigator.vibrate(5);
  await render();
};

window.setSort=async function(m,btn){
  if(sortMode===m){
    // Toggle direction
    sortDir=sortDir==='desc'?'asc':'desc';
  } else {
    sortMode=m;sortDir='desc';
  }
  document.querySelectorAll('.sort-pill').forEach(b=>{b.classList.remove('on');b.textContent=b.id==='sort-spread'?'Спред':'Объём';});
  const arrow=sortDir==='desc'?' ↓':' ↑';
  btn.classList.add('on');
  btn.textContent=(m==='spread'?'Спред':'Объём')+arrow;
  if(navigator.vibrate)navigator.vibrate(5);
  await render();
};
window.setSpread=async function(v,btn){minSpread=v;document.querySelectorAll('.filter-pill').forEach(b=>{if(b.id.startsWith('sp-'))b.classList.remove('on')});btn.classList.add('on');await render();};
window.setVol=async function(v,btn){minVol=v;document.querySelectorAll('.filter-pill').forEach(b=>{if(b.id.startsWith('vol-'))b.classList.remove('on')});btn.classList.add('on');await render();};

// ═══ STATS ═══
const _statPrev={};

// Count-up animation — like airport scoreboard
function countUp(el, fromVal, toVal, suffix, decimals, duration){
  const start=performance.now();
  function step(now){
    const p=Math.min((now-start)/duration,1);
    // ease out cubic
    const e=1-Math.pow(1-p,3);
    const cur=fromVal+(toVal-fromVal)*e;
    const disp=decimals>0?Number(cur.toFixed(decimals)).toFixed(decimals):String(Math.round(cur));
    el.textContent=disp+suffix;
    if(p<1)requestAnimationFrame(step);
    else el.textContent=Number(toVal.toFixed(decimals)).toFixed(decimals)+suffix;
  }
  requestAnimationFrame(step);
}

function animateStat(id, val, opts={}){
  const el=document.getElementById(id);if(!el)return;
  const newStr=String(val);
  if(_statPrev[id]===newStr)return;
  const prevStr=_statPrev[id]||'';
  _statPrev[id]=newStr;

  // Try to extract number for count-up
  const {suffix='',decimals=0,animate=true}=opts;
  const prevNum=parseFloat(prevStr);
  const newNum=parseFloat(newStr);
  if(animate && !isNaN(prevNum) && !isNaN(newNum) && prevNum!==newNum){
    countUp(el,prevNum,newNum,suffix,decimals,600);
  } else {
    el.textContent=newStr;
    el.classList.remove('updated');
    void el.offsetWidth;
    el.classList.add('updated');
  }
}

function updateStats(list){
  animateStat('st-pairs', list.length, {suffix:'',decimals:0});
  if(!list.length){['st-avg','st-best','st-vol'].forEach(id=>{const el=document.getElementById(id);if(el){el.textContent='—';_statPrev[id]='—';}});return;}
  const avg=parseFloat((list.reduce((s,t)=>s+(t.lo+t.hi)/2,0)/list.length).toFixed(2));
  animateStat('st-avg', avg, {suffix:'%',decimals:2});
  animateStat('st-best', Math.max(...list.map(t=>t.hi)), {suffix:'%',decimals:2});
  // vol — no count-up (formatted string), just flip
  const volStr=fmtVol(list.reduce((s,t)=>s+(t.vol||0),0));
  const el=document.getElementById('st-vol');
  if(el&&_statPrev['st-vol']!==volStr){_statPrev['st-vol']=volStr;el.textContent=volStr;el.classList.remove('updated');void el.offsetWidth;el.classList.add('updated');}
}

// ═══ SPARKLINES ═══
const sparkData={bsc:[],arb:[],eth:[],sol:[]};
function updateSparklines(){
  const colors={bsc:'#F0B90B',arb:'#29B6F6',eth:'#6366F1',sol:'#9945FF'};
  Object.keys(sparkData).forEach(c=>{
    sparkData[c].push(trades.filter(t=>t.chain===c&&!isExpired(t)).length);
    if(sparkData[c].length>8)sparkData[c].shift();
    const el=document.getElementById('spark-'+c);if(!el)return;
    const max=Math.max(...sparkData[c],1);
    el.innerHTML=sparkData[c].map(v=>`<div class="spark-bar" style="height:${Math.max(1,Math.round((v/max)*8))}px;background:${colors[c]};opacity:${v>0?1:.3}"></div>`).join('');
  });
}

// ═══ RENDER ═══
var _lastRenderHash = '';

async function render(){
  const list=getFiltered();
  // Дедупликация: пропускаем рендер если данные не изменились
  const newHash = list.map(t=>t._id+'|'+t.hi+'|'+t.fixed+'|'+(t._id===selectedId)).join(',')+'|'+hiddenNets.join(',');
  if(newHash === _lastRenderHash) return;
  _lastRenderHash = newHash;
  updateStats(list);
  const col=document.getElementById('trades-col');
  if(!list.length){col.innerHTML=`<div class="empty-state">
      <div class="radar-wrap">
        <div class="radar-circle"></div><div class="radar-circle"></div><div class="radar-circle"></div>
        <div class="radar-crosshair"></div>
        <div class="radar-sweep"></div>
      </div>
      <div class="empty-title">Сигналов не найдено</div>
      <div class="empty-sub">Попробуйте изменить фильтры<br>или переключите сеть</div>
    </div>`;return;}
  col.innerHTML=list.map((t,i)=>{
    const sel=t._id===selectedId,expired=isExpired(t);
    const chainColor=CHAIN_META[t.chain]?.color||'#888';
    const threshold=NET_THRESHOLDS[t.chain]||0,userBalance=currentUser?(currentUser.balance||0):0,locked=threshold>0&&userBalance<threshold;
    const risk=t.hi>=1.8?'HIGH':t.hi>=1.1?'MED':'LOW',riskCls=`b-risk-${risk.toLowerCase()}`;
    const hasTime=hasRealTime(t),addedDate=getAddedTime(t);
    const avg=((t.lo||0)+(t.hi||0))/2,gas=CHAIN_META[t.chain]?.gas||0.5,netPct=avg-0.06-(gas/1000);
    const minsAgo=addedDate?Math.floor((Date.now()-addedDate.getTime())/60000):null;
    const agoStr=minsAgo!==null?(minsAgo<1?'только что':minsAgo===1?'1 мин назад':minsAgo+' мин назад'):'';
    const borderColor=expired?'rgba(229,62,62,.35)':sel?chainColor:chainColor+'30';
  const borderW=expired?'3px':Math.max(3,Math.min(8,Math.round((t.hi||0)*2.5)))+'px';
    const chainGrad=CHAIN_GRADIENT[t.chain]||'transparent';

    // countdown
    let cdHtml='';
    if(!expired&&addedDate&&hasTime){
      const rem=Math.max(0,30*60*1000-(Date.now()-addedDate.getTime()));
      const pct=Math.max(0,(rem/(30*60*1000))*100);
      const cls=pct<25?'urgent':pct<60?'normal':'fresh',col2=pct<25?'#e53e3e':pct<60?'#f0a500':'#1db954';
      const cdMins=Math.floor(rem/60000),cdSecs=String(Math.floor((rem%60000)/1000)).padStart(2,'0');
      const cdCirc=(2*Math.PI*12).toFixed(1),cdOff=(2*Math.PI*12*(1-pct/100)).toFixed(1);
      cdHtml=`<div class="countdown ${cls}" data-id="${t._id}" style="display:flex;align-items:center;gap:5px"><svg width="16" height="16" viewBox="0 0 28 28" style="flex-shrink:0"><circle cx="14" cy="14" r="12" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="2.5"/><circle cx="14" cy="14" r="12" fill="none" stroke="${col2}" stroke-width="2.5" stroke-dasharray="${cdCirc}" stroke-dashoffset="${cdOff}" stroke-linecap="round" transform="rotate(-90 14 14)"/></svg><span class="cd-time" style="font-size:11px;font-family:'JetBrains Mono',monospace;color:${col2};font-weight:700">${cdMins}:${cdSecs}</span></div>`;
    } else if(expired&&hasTime){
      cdHtml=`<span style="font-size:10px;color:var(--red);font-family:'JetBrains Mono',monospace">истекло</span>`;
    }

    // lock
    let lockHtml='';
    if(locked){
      const def=threshold-userBalance,pct=Math.min(100,(userBalance/threshold)*100);
      const chainName=CHAIN_META[t.chain]?.label||t.chain.toUpperCase();
      lockHtml=`<div class="lock-overlay">
        <div class="lock-icon">🔒</div>
        <div class="lock-txt">НЕДОСТАТОЧНЫЙ КАПИТАЛ</div>
        <div class="lock-sub">для входа в эту сеть</div>
        <div class="lock-deficit">не хватает ${def>=1000?'$'+(def/1000).toFixed(1)+'K':'$'+Math.round(def)}</div>
        <div class="lock-prog"><div class="lock-prog-fill" style="width:${pct}%"></div></div>
        <div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:6px;font-family:'JetBrains Mono',monospace">Нужно $${(threshold/1000).toFixed(0)}K для ${chainName}</div>
      </div>`;
    }

    const yieldHtml=expired?'':`<span class="yield-chip">+${netPct.toFixed(2)}%</span>`;
    const toks=(t.pair||'').split('/');

    const chainColorVar=`--chain-color:${chainColor};`;
    const fixedColorVar=t.fixed?'--chain-color:#14b8a6;':'';
    return `<div class="trade-item-wrap" data-wrap-id="${t._id}">

      <div class="trade-item${sel?' selected':''}${expired?' expired':''}${locked?' locked':''}${t.fixed?' fixed-trade':''}${t.hi>=1.8?' high-risk':''}" style="animation-delay:${i*.04}s;border-left:${borderW} solid ${t.fixed?'#14b8a6':borderColor};background-image:linear-gradient(135deg,${t.fixed?'rgba(20,184,166,.06)':chainGrad} 0%,transparent 55%);${chainColorVar}${fixedColorVar}" data-id="${t._id}">
      ${lockHtml}
      <div class="ti-top">
        <div class="ti-badges">${chainBadge(t.chain)}<span class="dex-badge">${t.dex||''}</span><span class="b ${riskCls}">${risk}</span>${t.isNew&&!expired?'<span class="b b-new">NEW</span>':''}${expired?'<span class="b b-expired">ИСТЕКЛО</span>':''}</div>
        <div class="spread-display"><span class="sp-val sp-lo">${(t.lo||0).toFixed(2)}%</span><span class="sp-sep">→</span><span class="sp-val ${spCls(t.hi)}">${(t.hi||0).toFixed(2)}%</span></div>
      </div>
      <div class="ti-mid">
        <div>
          <div class="pair-row">
            ${toks.slice(0,2).map(s=>getTokenIcon(s)).join('')}
            <div class="pair-name">${t.pair||'—'}</div>
            <button class="share-btn" data-share-id="${t._id}" title="Поделиться">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button class="copy-btn" data-copy="${t.pair||''}" title="Скопировать">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
          </div>
          <div class="pool-name">${getPoolName(t)}</div>
        </div>
        <div class="flow-row">${(t.dir||[t.pair]).map((tok,idx)=>`${idx>0?'<span class="tok-arr">→</span>':''}<span class="tok">${tok}</span>`).join('')}</div>
      </div>
      ${t.fixed?`<div class="fixed-banner">
        <div class="fixed-banner-txt">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          ФИКСИРУЙТЕ ПРИБЫЛЬ
        </div>
        <div class="fixed-banner-time">${t.fixedAt?.seconds?new Date(t.fixedAt.seconds*1000).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}):''}</div>
      </div>`:''}
      <div class="ti-bot">
        <div class="ti-meta">
          <span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Вход ${t.tmin||'?'}–${t.tmax||'?'} мин</span>
          ${agoStr?`<span class="meta-item" style="opacity:.55">${agoStr}</span>`:''}
          <span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>${fmtVol(t.vol||0)}</span>
        </div>
        <div class="ti-right">${cdHtml}${yieldHtml}</div>
      </div>
    </div></div>`;
  }).join('');

  // Add expired to history + sparklines
  trades.filter(t=>isExpired(t)).forEach(t=>addToHistory(t));
  updateSparklines();

  // Virtual scroll: если карточек много — скрываем невидимые
  if(list.length > 12){
    var col2 = document.getElementById('trades-col');
    if(col2 && !col2._vsObserver){
      col2._vsObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          var wrap = e.target;
          // Скрываем контент невидимых карточек для экономии GPU
          var inner = wrap.querySelector('.trade-item');
          if(inner) inner.style.contentVisibility = e.isIntersecting ? 'visible' : 'auto';
        });
      },{root: col2, rootMargin:'200px 0px', threshold:0});
      document.querySelectorAll('.trade-item-wrap').forEach(function(w){
        col2._vsObserver.observe(w);
      });
    }
  }

  // Click handlers
  document.querySelectorAll('.trade-item:not(.locked)').forEach(el=>{
    el.addEventListener('click',async()=>{
      if(navigator.vibrate)navigator.vibrate(8);
      selectedId=el.dataset.id;const t=trades.find(x=>x._id===el.dataset.id);if(t){
        await render();openDetailModal(t);
      }
    });
  });


  // ── SWIPE TO REVEAL ──
  initSwipeCards();

  // Fly-in for new trades (FEATURE 1)
  list.forEach(t=>{
    if(!seenTradeIds.has(t._id)&&seenTradeIds.size>0){
      seenTradeIds.add(t._id);
      setTimeout(()=>{
        const el=document.querySelector(`.trade-item[data-id="${t._id}"]`);
        if(el){el.classList.add('new-arrival');el.querySelectorAll('.sp-val').forEach(s=>s.classList.add('pulsing'));setTimeout(()=>el.querySelectorAll('.sp-val').forEach(s=>s.classList.remove('pulsing')),4000);const _rh=trades.find(x=>x._id===t._id)?.hi||0;if(_rh>=1.8&&navigator.vibrate)navigator.vibrate([60,30,60,30,120]);else if(_rh>=1.1&&navigator.vibrate)navigator.vibrate([30,20,60]);else if(navigator.vibrate)navigator.vibrate(25);}
      },50);
    } else seenTradeIds.add(t._id);
  });
}

// ═══ HISTORY RENDER ═══
function renderHistory(){
  const col=document.getElementById('trades-col');
  if(!tradeHistory.length){col.innerHTML='<div class="history-empty">📋 История пуста<br>Истёкшие сделки<br>появятся здесь</div>';return;}
  col.innerHTML=tradeHistory.map((t,i)=>{
    const chainColor=CHAIN_META[t.chain]?.color||'#888';
    return `<div class="trade-item history-item" style="border-left:3px solid ${chainColor}44;animation-delay:${i*.03}s">
      <div class="ti-top"><div class="ti-badges">${chainBadge(t.chain)}<span class="dex-badge">${t.dex||''}</span></div><div class="spread-display"><span class="sp-val sp-lo">${(t.lo||0).toFixed(2)}%</span><span class="sp-sep">→</span><span class="sp-val">${(t.hi||0).toFixed(2)}%</span></div></div>
      <div class="ti-mid"><div><div class="pair-name">${t.pair||'—'}</div></div><div class="flow-row">${(t.dir||[t.pair]).map((tok,idx)=>`${idx>0?'<span class="tok-arr">→</span>':''}<span class="tok">${tok}</span>`).join('')}</div></div>
    </div>`;
  }).join('');
}

// ═══ SKELETON (FEATURE 4) ═══
function showSkeleton(){
  const col=document.getElementById('trades-col');
  if(!col)return;
  col.innerHTML=`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:20px;flex:1;min-height:320px">
      <div style="position:relative;width:56px;height:56px">
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(212,175,55,.15)"></div>
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid transparent;border-top-color:#d4af37;animation:spin .8s linear infinite"></div>
        <div style="position:absolute;inset:10px;border-radius:50%;border:1.5px solid rgba(212,175,55,.3)"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
          <svg width="18" height="18" viewBox="0 0 60 60" fill="none">
            <path d="M10 30 C18 18 42 18 50 30 C42 42 18 42 10 30 Z" stroke="#d4af37" stroke-width="2" fill="rgba(212,175,55,.1)"/>
            <circle cx="30" cy="30" r="7" fill="#d4af37"/>
            <circle cx="30" cy="30" r="4" fill="#0b0d12"/>
          </svg>
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(212,175,55,.6);letter-spacing:.1em;animation:pulse 1.5s ease-in-out infinite">ЗАГРУЗКА СИГНАЛОВ</div>
    </div>
    ${Array(3).fill(0).map(()=>`<div class="skel-card"><div class="skel-row"><div class="skeleton skel-badge" style="width:70px;height:18px"></div><div class="skeleton skel-badge" style="width:60px;height:18px"></div><div class="skeleton" style="width:80px;height:22px;margin-left:auto;border-radius:4px"></div></div><div class="skel-row"><div style="flex:1"><div class="skeleton" style="width:120px;height:18px;margin-bottom:7px"></div><div class="skeleton" style="width:180px;height:10px;opacity:.6"></div></div><div class="skeleton" style="width:90px;height:28px;border-radius:6px"></div></div></div>`).join('')}`;
}

// ═══ CALCULATOR ═══
function calcNet(t,inp){const gas=CHAIN_META[t.chain]?.gas||0.5,avg=((t.lo||0)+(t.hi||0))/2,threshold=NET_THRESHOLDS[t.chain]||0,gross=inp*avg/100,fees=inp*0.3/100*2;let net=gross-fees-gas;if(threshold>0&&inp<threshold){net=-(gross*(threshold-inp)/threshold*1.8+gas);}return{gas,avg,gross,fees,net,roi:(net/inp)*100,threshold};}


// ═══ MINI CHART ═══

// ═══ ALERTS ═══
const processedAlertIds=new Set(JSON.parse(sessionStorage.getItem('dex_processed_alerts')||'[]'));
function saveAlerts(){localStorage.setItem('dex_alerts_'+new Date().toISOString().slice(0,10),JSON.stringify({date:new Date().toISOString().slice(0,10),alerts}));}
function loadAlerts(){try{const raw=localStorage.getItem('dex_alerts_'+new Date().toISOString().slice(0,10));if(!raw)return;const{date,alerts:saved}=JSON.parse(raw);if(date===new Date().toISOString().slice(0,10)&&saved.length)alerts=saved;}catch(e){}}
function addAlert(t){
  const key=t._id+'_'+new Date().toISOString().slice(0,13);
  if(processedAlertIds.has(key))return;
  processedAlertIds.add(key);sessionStorage.setItem('dex_processed_alerts',JSON.stringify([...processedAlertIds]));
  const time=new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const level=t.hi>=1.8?'r':t.hi>=1.1?'a':'g';
  updateMobAlertBadge(alerts.length+1);
  alerts.unshift({msg:`${t.pair} ${(t.chain||'').toUpperCase()} · спред ${(t.hi||0).toFixed(2)}%`,time,level});
  if(alerts.length>6)alerts.pop();saveAlerts();renderAlerts();
  if(alertsOn){try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator();const g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=660;g.gain.setValueAtTime(0.08,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);o.start();o.stop(ctx.currentTime+0.25);}catch(e){}}
}
function renderAlerts(){const el=document.getElementById('alerts-list');if(!el)return;if(!alerts.length){el.innerHTML='<div style="font-size:10px;color:var(--txt3);font-family:JetBrains Mono,monospace">Нет алертов</div>';return;}el.innerHTML=alerts.map(a=>`<div class="alert-item"><div class="alert-dot ${a.level}"></div><div><div class="alert-txt">${a.msg}</div><div class="alert-time">${a.time}</div></div></div>`).join('');}
window.toggleAlerts=function(){alertsOn=!alertsOn;document.getElementById('alert-btn').classList.toggle('on',alertsOn);};

// ═══ FEATURE 3: PROFILE GRADIENT BY LEVEL ═══

// ═══ КАК ЗАРАБАТЫВАТЬ БОЛЬШЕ ═══
function openEarnMore(){
  // Удаляем старый модал если есть
  var old = document.getElementById('earn-more-modal');
  if(old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'earn-more-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s ease';
  modal.innerHTML = `
    <div style="width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:#111318;border-radius:20px 20px 0 0;padding:0 0 40px;scrollbar-width:none">
      <!-- Хедер -->
      <div style="position:sticky;top:0;z-index:10;background:#111318;padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:10px;background:rgba(212,175,55,.12);border:1px solid rgba(212,175,55,.25);display:flex;align-items:center;justify-content:center;font-size:17px">🚀</div>
          <div>
            <div style="font-size:15px;font-weight:700;color:#d4af37">Как зарабатывать больше?</div>
            <div style="font-size:10px;color:rgba(255,255,255,.35);font-family:'JetBrains Mono',monospace">ИНВЕСТИЦИОННЫЙ МЕМОРАНДУМ · 60 ДНЕЙ</div>
          </div>
        </div>
        <button onclick="document.getElementById('earn-more-modal').remove()" style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.07);border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <div style="padding:20px">

        <!-- Баннер -->
        <div style="background:linear-gradient(135deg,rgba(212,175,55,.18),rgba(212,175,55,.05));border:1px solid rgba(212,175,55,.3);border-radius:16px;padding:18px;margin-bottom:20px;text-align:center">
          <div style="font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(212,175,55,.7);letter-spacing:2px;margin-bottom:6px">RAVENEYE · DEX SCANNER PLATFORM</div>
          <div style="font-size:22px;font-weight:800;color:#d4af37;margin-bottom:4px">+1 132.9% ROI</div>
          <div style="font-size:12px;color:rgba(255,255,255,.5)">за 60 дней · CRYPTO SWAP стратегия</div>
        </div>

        <!-- Ключевые показатели -->
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:1.5px;margin-bottom:10px">КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">
          ${[
            ['💰','Стартовый капитал','$10 000','$3K своих + $7K займ'],
            ['📅','Горизонт','60 дней','44 торговых дня'],
            ['📈','Доходность','5% / день','диапазон 4–6%'],
            ['🔄','Реинвест','85%','compound growth'],
            ['⭐','День закрытия займа','17-й день','06.05.2026'],
            ['🏆','Итоговый капитал','$36 986','чистое тело'],
          ].map(([ic,lab,val,sub])=>`
            <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px">
              <div style="font-size:16px;margin-bottom:4px">${ic}</div>
              <div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:2px">${lab}</div>
              <div style="font-size:15px;font-weight:700;color:#fff">${val}</div>
              <div style="font-size:10px;color:rgba(255,255,255,.3);font-family:'JetBrains Mono',monospace">${sub}</div>
            </div>`).join('')}
        </div>

        <!-- Фазы -->
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:1.5px;margin-bottom:10px">3 ФАЗЫ СТРАТЕГИИ</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
          ${[
            ['Ф.1 РАЗГОН','Дни 1–17','Закрыть займ','100% SWAP','#e53e3e'],
            ['Ф.2 РОСТ','Дни 18–40','Compound growth','85% SWAP / 15% резерв','#d4af37'],
            ['Ф.3 ФИНАЛ','Дни 41–60','Фиксация прибыли','70% SWAP / 30% резерв','#1db954'],
          ].map(([name,period,goal,alloc,color])=>`
            <div style="background:rgba(255,255,255,.04);border:1px solid ${color}30;border-radius:12px;padding:13px;display:flex;align-items:center;gap:12px">
              <div style="width:38px;height:38px;border-radius:10px;background:${color}18;border:1px solid ${color}35;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <span style="font-size:10px;font-weight:800;font-family:'JetBrains Mono',monospace;color:${color}">${name.split(' ')[0]}</span>
              </div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:700;color:${color}">${name}</div>
                <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:1px">${period} · ${goal}</div>
                <div style="font-size:10px;color:rgba(255,255,255,.3);font-family:'JetBrains Mono',monospace;margin-top:2px">${alloc}</div>
              </div>
            </div>`).join('')}
        </div>

        <!-- Контрольные точки -->
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:1.5px;margin-bottom:10px">КОНТРОЛЬНЫЕ ТОЧКИ</div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden;margin-bottom:20px">
          ${[
            ['СТАРТ','20.04.2026','$10 000','—'],
            ['День 10','29.04.2026','$13 951','—'],
            ['★ День 17','06.05.2026','$10 179','займ закрыт!'],
            ['День 30','19.05.2026','$14 804','—'],
            ['День 40','07.06.2026','$20 653','Ф.3 старт'],
            ['День 60','18.06.2026','$36 987','финиш'],
          ].map(([day,date,cap,note],i)=>`
            <div style="display:flex;align-items:center;padding:11px 14px;${i>0?'border-top:1px solid rgba(255,255,255,.05)':''}${day.includes('★')?';background:rgba(212,175,55,.06)':''}">
              <div style="width:70px;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${day.includes('★')?'#d4af37':'rgba(255,255,255,.6)'}">${day}</div>
              <div style="flex:1;font-size:10px;color:rgba(255,255,255,.3);font-family:'JetBrains Mono',monospace">${date}</div>
              <div style="font-size:13px;font-weight:700;color:#1db954;font-family:'JetBrains Mono',monospace">${cap}</div>
              ${note!=='—'?`<div style="margin-left:8px;font-size:9px;background:rgba(212,175,55,.15);border:1px solid rgba(212,175,55,.3);color:#d4af37;padding:2px 7px;border-radius:20px;font-weight:700">${note}</div>`:''}
            </div>`).join('')}
        </div>

        <!-- 3 сценария -->
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:1.5px;margin-bottom:10px">3 СЦЕНАРИЯ ДОХОДНОСТИ</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:20px">
          ${[
            ['Консерв.','4%/день','$25 690','+756%','rgba(255,255,255,.4)'],
            ['Базово','5%/день','$36 987','+1 133%','#d4af37'],
            ['Оптимист.','6%/день','$53 092','+1 670%','#1db954'],
          ].map(([name,rate,cap,roi,color])=>`
            <div style="background:rgba(255,255,255,.04);border:1px solid ${name==='Базово'?'rgba(212,175,55,.3)':'rgba(255,255,255,.07)'};border-radius:12px;padding:12px;text-align:center${name==='Базово'?';background:rgba(212,175,55,.07)':''}">
              <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:4px">${name}</div>
              <div style="font-size:10px;color:rgba(255,255,255,.35);font-family:'JetBrains Mono',monospace;margin-bottom:6px">${rate}</div>
              <div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:2px">${cap}</div>
              <div style="font-size:10px;font-weight:700;color:${color};font-family:'JetBrains Mono',monospace">${roi}</div>
            </div>`).join('')}
        </div>

        <!-- Принципы -->
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:1.5px;margin-bottom:10px">КЛЮЧЕВЫЕ ПРИНЦИПЫ</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">
          ${[
            '85% реинвест / 15% комиссия — ежедневно, без исключений',
            'Займ закрывается разово при $17 000+ — защита капитала',
            'Ежедневный учёт: факт vs план в Google Sheets / Notion',
            'СТОП при просадке > 15% от планового значения',
            'Контрольный аудит на Днях 17, 30, 40 — обязателен',
          ].map(text=>`
            <div style="display:flex;align-items:flex-start;gap:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px 12px">
              <div style="width:16px;height:16px;border-radius:50%;background:rgba(29,185,84,.15);border:1px solid rgba(29,185,84,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#1db954" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style="font-size:12px;color:rgba(255,255,255,.65);line-height:1.5">${text}</div>
            </div>`).join('')}
        </div>

        <!-- Итог -->
        <div style="background:linear-gradient(135deg,rgba(29,185,84,.12),rgba(29,185,84,.04));border:1px solid rgba(29,185,84,.25);border-radius:16px;padding:18px;text-align:center">
          <div style="font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(29,185,84,.7);letter-spacing:2px;margin-bottom:8px">ИТОГ · ДЕНЬ 60 · 18.06.2026</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:2px">Итоговый капитал</div>
              <div style="font-size:20px;font-weight:800;color:#1db954;font-family:'JetBrains Mono',monospace">$36 987</div>
            </div>
            <div>
              <div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:2px">Чистая прибыль</div>
              <div style="font-size:20px;font-weight:800;color:#d4af37;font-family:'JetBrains Mono',monospace">$33 987</div>
            </div>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,.4)">Документ подготовлен для пользователей <span style="color:#d4af37;font-weight:700">RavenEye</span> · Апрель 2026</div>
        </div>

      </div>
    </div>`;

  // Закрытие по клику на фон
  modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

function applyProfileLevel(balance){
  const bar=document.getElementById('profile-bar');if(!bar)return;
  bar.classList.remove('lvl-bronze','lvl-silver','lvl-gold','lvl-platinum');
  if(balance>=20000)bar.classList.add('lvl-platinum');
  else if(balance>=10000)bar.classList.add('lvl-gold');
  else if(balance>=5000)bar.classList.add('lvl-silver');
  else bar.classList.add('lvl-bronze');
}

// ═══ PROFILE MODAL ═══
function openProfileModal(){
  const u=currentUser;if(!u)return;
  const balance=u.balance||0;
  const initials=(u.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const levels=[{name:'Bronze',min:0,max:5000,color:'#cd7f32'},{name:'Silver',min:5000,max:10000,color:'#aaaaaa'},{name:'Gold',min:10000,max:20000,color:'#f0a500'},{name:'Platinum',min:20000,max:50000,color:'#8b72f5'}];
  const lvl=levels.filter(l=>balance>=l.min).pop()||levels[0];
  const nextLvl=levels.find(l=>l.min>balance);
  const pct=nextLvl?Math.round(((balance-lvl.min)/(nextLvl.min-lvl.min))*100):100;
  const sessionMins=Math.floor((Date.now()-sessionStats.startTime)/60000);
  const totalProfit=profitHistory.reduce((s,e)=>s+(e.amount||0),0);
  const totalDeals=profitHistory.length;
  document.getElementById('profile-modal-body').innerHTML=`
    <div style="margin:-16px -20px 0;padding:24px 20px 20px;background:linear-gradient(160deg,${lvl.color}20 0%,transparent 60%);border-bottom:1px solid ${lvl.color}18">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div style="width:60px;height:60px;border-radius:50%;background:${lvl.color}20;border:2px solid ${lvl.color}55;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${lvl.color};flex-shrink:0">${initials}</div>
        <div style="flex:1">
          <div style="font-size:19px;font-weight:700;margin-bottom:3px">${u.name||'Пользователь'}</div>
          <div style="font-size:10px;color:var(--txt3);font-family:'JetBrains Mono',monospace;margin-bottom:6px">ID: ${u.id}</div>
          <div style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;background:${lvl.color}15;border:1px solid ${lvl.color}35">
            <div style="width:5px;height:5px;border-radius:50%;background:${lvl.color}"></div>
            <span style="font-size:10px;font-weight:700;color:${lvl.color};font-family:'JetBrains Mono',monospace">${lvl.name.toUpperCase()}${!nextLvl?' ✦ MAX':''}</span>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        <div style="background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:12px 14px">
          <div style="font-size:9px;color:var(--txt3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">💰 Капитал</div>
          <div style="font-size:19px;font-weight:700;color:${lvl.color};font-family:'JetBrains Mono',monospace">${fmtBal(balance)}</div>
        </div>
        <div style="background:rgba(0,0,0,.2);border:1px solid rgba(29,185,84,.15);border-radius:11px;padding:12px 14px">
          <div style="font-size:9px;color:var(--txt3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">📈 Заработано</div>
          <div style="font-size:19px;font-weight:700;color:#1db954;font-family:'JetBrains Mono',monospace">+${fmtBal(totalProfit)}</div>
        </div>
        <div style="background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:12px 14px">
          <div style="font-size:9px;color:var(--txt3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">🔔 Сигналов</div>
          <div style="font-size:19px;font-weight:700;color:var(--blue);font-family:'JetBrains Mono',monospace">${trades.filter(t=>!isExpired(t)).length}</div>
        </div>
        <div style="background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:12px 14px">
          <div style="font-size:9px;color:var(--txt3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">⏱ Онлайн</div>
          <div style="font-size:19px;font-weight:700;color:var(--txt);font-family:'JetBrains Mono',monospace">${sessionMins<60?sessionMins+'м':Math.floor(sessionMins/60)+'ч'}</div>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:10px;font-weight:700;color:${lvl.color};font-family:'JetBrains Mono',monospace">${lvl.name}</span>
          ${nextLvl?`<span style="font-size:10px;color:var(--txt3);font-family:'JetBrains Mono',monospace">до ${nextLvl.name}: $${(nextLvl.min-balance).toLocaleString()}</span>`:`<span style="font-size:10px;color:${lvl.color};font-family:'JetBrains Mono',monospace">MAX LEVEL</span>`}
        </div>
        <div style="height:6px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${lvl.color}88,${lvl.color});border-radius:3px;box-shadow:0 0 8px ${lvl.color}44"></div>
        </div>
      </div>
      <div style="background:rgba(0,0,0,.2);border:1px solid rgba(29,185,84,.12);border-radius:11px;padding:10px 12px">
        <div style="font-size:9px;color:var(--txt3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">График капитала</div>
        <canvas id="balance-chart-canvas" style="width:100%;height:50px;display:block"></canvas>
      </div>
    </div>
    <div style="padding:16px 0 0">
      <button onclick="window._openDealHistory()" style="width:100%;padding:14px 16px;background:rgba(212,175,55,.07);border:1px solid rgba(212,175,55,.2);border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-family:'Space Grotesk',sans-serif;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:11px">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.2);display:flex;align-items:center;justify-content:center;font-size:17px">📊</div>
          <div style="text-align:left"><div style="font-size:13px;font-weight:700;color:var(--txt)">История сделок</div><div style="font-size:11px;color:var(--txt3);margin-top:1px">${totalDeals?totalDeals+' сделок · +'+fmtBal(totalProfit):'Нет зафиксированных сделок'}</div></div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div style="display:flex;gap:8px">
        <button onclick="window._addBalanceManual()" style="flex:1;padding:12px;border-radius:11px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;background:rgba(29,185,84,.08);border:1px solid rgba(29,185,84,.2);color:#1db954;display:flex;align-items:center;justify-content:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Пополнить</button>
        <button onclick="window._clearProfitHistory()" style="flex:1;padding:12px;border-radius:11px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;background:rgba(229,62,62,.07);border:1px solid rgba(229,62,62,.2);color:#e53e3e;display:flex;align-items:center;justify-content:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>Сбросить историю</button>
      </div>
      <!-- Кнопка "Как зарабатывать больше" -->
      <button onclick="openEarnMore()" style="width:100%;margin-top:10px;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(212,175,55,.15),rgba(212,175,55,.06));border:1px solid rgba(212,175,55,.3);display:flex;align-items:center;gap:12px;cursor:pointer;font-family:inherit;text-align:left">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(212,175,55,.12);border:1px solid rgba(212,175,55,.25);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🚀</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#d4af37">Как зарабатывать больше?</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px">Советы и стратегии для роста капитала</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,.5)" stroke-width="2" style="margin-left:auto;flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    </div>`;
  window._openDealHistory=function(){
    const body=document.getElementById('profile-modal-body');
    const tp=profitHistory.reduce((s,e)=>s+(e.amount||0),0);
    const items=profitHistory.length?profitHistory.slice(0,30).map(e=>{
      const col=CHAIN_META[e.chain]?.color||'#888';
      const dt=new Date(e.time);
      const ts=dt.toLocaleDateString('ru',{day:'numeric',month:'short'})+' · '+dt.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
      return '<div style="display:flex;align-items:center;gap:11px;padding:12px 0;border-bottom:1px solid var(--border)"><div style="width:38px;height:38px;border-radius:10px;background:'+col+'18;border:1px solid '+col+'30;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:8px;font-weight:700;font-family:JetBrains Mono,monospace;color:'+col+'">'+( CHAIN_META[e.chain]?.label||e.chain||'').toUpperCase().slice(0,3)+'</span></div><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700">'+e.pair+'</div><div style="font-size:10px;color:var(--txt3);font-family:JetBrains Mono,monospace;margin-top:2px">'+e.dex+' · '+ts+'</div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:16px;font-weight:700;color:#1db954;font-family:JetBrains Mono,monospace">+$'+e.amount+'</div><div style="font-size:10px;color:var(--txt3);font-family:JetBrains Mono,monospace;margin-top:2px">'+e.spread.toFixed(2)+'% спред</div></div></div>';
    }).join(''):'<div style="text-align:center;padding:40px 0"><div style="font-size:32px;margin-bottom:12px;opacity:.25">📊</div><div style="font-size:14px;font-weight:600;color:var(--txt2);margin-bottom:6px">Нет зафиксированных сделок</div><div style="font-size:11px;color:var(--txt3);font-family:JetBrains Mono,monospace;line-height:1.7">Возьмите сделку → Зафиксируйте прибыль</div></div>';
    body.innerHTML='<button onclick="openProfileModal()" style="display:flex;align-items:center;gap:7px;background:transparent;border:none;color:var(--txt3);cursor:pointer;font-family:Space Grotesk,sans-serif;font-size:13px;padding:0 0 16px;font-weight:600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>Назад</button><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div style="font-size:17px;font-weight:700">История сделок</div>'+(profitHistory.length?'<div style="font-family:JetBrains Mono,monospace;font-size:14px;font-weight:700;color:#1db954">+'+fmtBal(tp)+'</div>':'')+'</div>'+items;
  };
  var av2=document.getElementById('profile-avatar');
  if(av2){
    var _avColor=balance>=20000?'#8b72f5':balance>=10000?'#f0a500':balance>=5000?'#aaaaaa':'#cd7f32';
    var lastT=profitHistory[0]?profitHistory[0].time:0;
    var todayE=profitHistory.filter(function(e){return new Date(e.time).toDateString()===new Date().toDateString();}).reduce(function(s,e){return s+e.amount;},0);
    if(Date.now()-lastT<3600000){av2.style.border='2px solid #1db954';av2.style.boxShadow='0 0 12px rgba(29,185,84,.4)';}
    else if(todayE>0){av2.style.border='2px solid #d4af37';av2.style.boxShadow='0 0 12px rgba(212,175,55,.4)';}
    else{av2.style.border='2px solid '+_avColor+'55';av2.style.boxShadow='none';}
  }
  document.getElementById('profile-modal').classList.add('show');
  setTimeout(()=>{
    saveBalanceHistory(balance);
    // Lazy: перерисовываем только если баланс изменился
    var _balKey = 'bal|'+balance;
    if(window._lastBalChartKey !== _balKey){
      window._lastBalChartKey = _balKey;
      drawBalanceChart();
    }
  },80);
}

// ═══ DETAIL MODAL ═══
function openDetailModal(t){
  sessionStats.tradesViewed++;
  const chainColor=CHAIN_META[t.chain]?.color||'#888',expired=isExpired(t);
  const addedDate=getAddedTime(t),addedStr=addedDate?addedDate.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}):'—';
  const similar=trades.filter(x=>x._id!==t._id&&x.chain===t.chain&&!isExpired(x)).slice(0,3);
  const avg=((t.lo||0)+(t.hi||0))/2,gas=CHAIN_META[t.chain]?.gas||0.5,netPct=(avg-0.06-(gas/1000)).toFixed(2);
  const dexUrl=DEX_LINKS[t.dex]||'https://dexscreener.com';
  const toks=(t.pair||'').split('/');
  document.getElementById('detail-modal-title').textContent=t.pair||'Детали';
  document.getElementById('detail-modal-body').innerHTML=`
    <div style="margin:-16px -20px 16px;padding:20px;background:linear-gradient(135deg,${chainColor}22,${chainColor}08);border-bottom:1px solid ${chainColor}33;border-radius:0">
      <div style="display:flex;align-items:center;gap:10px">
        ${toks.slice(0,2).map(s=>getTokenIcon(s)).join('')}
        <div><div style="font-size:24px;font-weight:700">${t.pair||'—'}</div><div style="font-size:11px;opacity:.6;font-family:'JetBrains Mono',monospace;margin-top:2px">${t.dex} · ${CHAIN_META[t.chain]?.label||t.chain}</div></div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:22px;font-weight:700;color:${chainColor};font-family:'JetBrains Mono',monospace">${(t.lo||0).toFixed(2)}–${(t.hi||0).toFixed(2)}%</div>
          <div style="font-size:11px;color:var(--green);font-family:'JetBrains Mono',monospace">↑ чистый +${((((t.lo||0)+(t.hi||0))/2)-0.06-(( CHAIN_META[t.chain]?.gas||0.5)/1000)).toFixed(2)}%</div>
        </div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-card"><div class="detail-card-label">Спред</div><div class="detail-card-val" style="color:var(--green)">${(t.lo||0).toFixed(2)}–${(t.hi||0).toFixed(2)}%</div></div>
      <div class="detail-card"><div class="detail-card-label">Чистый доход</div><div class="detail-card-val" style="color:var(--green)">+${netPct}%</div></div>
      <div class="detail-card"><div class="detail-card-label">Объём 24h</div><div class="detail-card-val">${fmtVol(t.vol||0)}</div></div>
      <div class="detail-card"><div class="detail-card-label">Окно входа</div><div class="detail-card-val">${t.tmin||'?'}–${t.tmax||'?'} мин</div></div>
      <div class="detail-card"><div class="detail-card-label">Добавлено</div><div class="detail-card-val" style="font-size:14px">${addedStr}</div></div>
      <div class="detail-card"><div class="detail-card-label">Маршрут</div><div class="detail-card-val" style="font-size:11px">${(t.dir||[]).join('→')}</div></div>
    </div>
    <div class="detail-chart-wrap"><div class="detail-chart-title">История спреда</div><div class="detail-chart"><canvas id="detail-chart-canvas"></canvas></div></div>
    <div style="font-size:10px;color:var(--txt3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Похожие пары в этой сети</div>
    <div class="similar-list">${similar.length?similar.map(s=>`<div class="similar-item" data-similar="${s._id}"><div><div style="font-size:13px;font-weight:700">${s.pair}</div><div style="font-size:10px;color:var(--txt3);font-family:'JetBrains Mono',monospace">${s.dex}</div></div><div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--green)">+${(((s.lo||0)+(s.hi||0))/2-0.06).toFixed(2)}%</div></div>`).join(''):'<div style="font-size:11px;color:var(--txt3);font-family:JetBrains Mono,monospace;padding:8px 0">Нет похожих сделок</div>'}</div>
    ${currentUser?.tgChatId ? `<button onclick="window._shareDetailToTg()" style="width:100%;margin-bottom:8px;padding:12px;border-radius:12px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700;background:rgba(41,182,246,.1);border:1px solid rgba(41,182,246,.3);color:#29B6F6;display:flex;align-items:center;justify-content:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="#29B6F6"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg>Поделиться в Telegram</button>` : ''}
    ${!expired ? `<button onclick="window._takeTradeFromModal()" style="width:100%;margin-bottom:10px;padding:15px;border-radius:12px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;background:linear-gradient(135deg,rgba(29,185,84,.25),rgba(29,185,84,.12));border:1px solid rgba(29,185,84,.5);color:#1db954;display:flex;align-items:center;justify-content:center;gap:8px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Взять сделку</button>` : ''}
    <a href="${dexUrl}" target="_blank" class="dex-link-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Открыть на ${t.dex||'DEX'}</a>`;
  window._detailModalTrade=t;
  window._takeTradeFromModal=function(){document.getElementById('detail-modal').classList.remove('show');setTimeout(()=>setActiveTrade(window._detailModalTrade),180);};
  window._shareDetailToTg=function(){const tr=window._detailModalTrade;if(!tr||!currentUser?.tgChatId)return;const cm=CHAIN_META[tr.chain]||{label:tr.chain};const avg=((tr.lo||0)+(tr.hi||0))/2,gas=cm.gas||0.5,np=(avg-0.06-gas/1000).toFixed(2);const ce={eth:'💎',arb:'🔷',sol:'🟣',bsc:'🟡'}[tr.chain]||'⛓';tgSendToUser(currentUser.tgChatId,'🦅 Сигнал RavenEye\n\n'+ce+' '+tr.pair+'\n📍 '+cm.label+' · '+(tr.dex||'')+'\n\n💰 '+(tr.lo||0).toFixed(2)+'% → '+(tr.hi||0).toFixed(2)+'%\n📈 +'+np+'%\n💵 '+fmtVol(tr.vol||0)+'\n⏱ '+(tr.tmin||'?')+'–'+(tr.tmax||'?')+' мин\n\n🔗 '+SITE_URL).then(()=>showToast('📨 Отправлено в Telegram!','success'));};
  document.getElementById('detail-modal').classList.add('show');
  // Lazy load: перерисовываем только если данные изменились
  var _chartKey = t._id+'|'+(spreadHistory[t._id]||[]).map(h=>h.v).join(',');
  if(window._lastChartKey !== _chartKey){
    window._lastChartKey = _chartKey;
    setTimeout(()=>drawSpreadChart(t),60);
  }
}

// ═══ FEATURE 11: SHARE MODAL ═══
function openShareModal(t){
  const avg=((t.lo||0)+(t.hi||0))/2,gas=CHAIN_META[t.chain]?.gas||0.5,netPct=(avg-0.06-(gas/1000)).toFixed(2);
  const chainMeta=CHAIN_META[t.chain]||{label:t.chain,color:'#888'};
  const time=new Date().toLocaleString('ru',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  document.getElementById('share-pair').textContent=t.pair||'—';
  document.getElementById('share-pool').textContent=getPoolName(t);
  document.getElementById('share-spread').textContent=`${(t.lo||0).toFixed(2)}–${(t.hi||0).toFixed(2)}%`;
  document.getElementById('share-yield').textContent=`+${netPct}%`;
  document.getElementById('share-vol').textContent=fmtVol(t.vol||0);
  document.getElementById('share-chain').innerHTML=`<span style="color:${chainMeta.color}">${chainMeta.label} · ${t.dex}</span>`;
  document.getElementById('share-time').textContent=time;
  document.getElementById('share-overlay').classList.add('show');
  document.getElementById('share-copy-btn').onclick=()=>{
    const text=`🔥 Сигнал DEX Scanner PRO\n\n📊 Пара: ${t.pair}\n⛓ Сеть: ${chainMeta.label} · ${t.dex}\n💰 Спред: ${(t.lo||0).toFixed(2)}–${(t.hi||0).toFixed(2)}%\n📈 Доход: +${netPct}%\n💵 Объём: ${fmtVol(t.vol||0)}\n⏱ Окно: ${t.tmin}–${t.tmax} мин\n\n🕐 ${time}`;
    navigator.clipboard.writeText(text).then(()=>{const btn=document.getElementById('share-copy-btn');btn.textContent='✓ Скопировано!';setTimeout(()=>btn.textContent='📋 Скопировать',2000);});
  };
}

// ═══ FEATURE 15: RECONNECT ═══
let reconnectTimer=null;

async function getNextSlotHtml(){
  try{
    const snap=await getDoc(doc(db,'meta','schedule'));
    if(!snap.exists)return '';
    const slots=JSON.parse(snap.data().slots||'[]');
    const msk=new Date(Date.now()+3*60*60*1000);
    const nowStr=String(msk.getUTCHours()).padStart(2,'0')+':'+String(msk.getUTCMinutes()).padStart(2,'0');
    const chainColors={eth:'#6366F1',arb:'#29B6F6',sol:'#9945FF',bsc:'#F0B90B'};
    const next=slots.filter(s=>!s.done&&s.fireAt>nowStr).sort((a,b)=>a.fireAt.localeCompare(b.fireAt))[0];
    if(!next)return '';
    const color=chainColors[next.chainId]||'#888';
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:11px">
      <span style="color:var(--txt3)">Следующий сигнал:</span>
      <span style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>
      <span style="color:${color};font-weight:700">${next.chainId.toUpperCase()}</span>
      <span style="color:var(--txt2);font-weight:700">в ${next.fireAt} МСК</span>
    </div>`;
  }catch(e){return '';}
}

function showUserDeletedBanner(){
  if(tradesUnsub){try{tradesUnsub();}catch(e){} tradesUnsub=null;}
  localStorage.removeItem('dex_user_id');
  document.getElementById('deleted-banner')?.classList.add('show');
}
function resetDataTimer(){lastDataReceived=Date.now();document.getElementById('reconnect-btn')?.classList.remove('show');}
setInterval(()=>{if(Date.now()-lastDataReceived>90000&&document.getElementById('main-app')?.style.display!=='none')document.getElementById('reconnect-btn')?.classList.add('show');},15000);
document.getElementById('reconnect-btn')?.addEventListener('click',()=>{document.getElementById('reconnect-btn').classList.remove('show');if(tradesUnsub){tradesUnsub();tradesUnsub=null;}setTimeout(()=>{if(db){subscribeToTrades();}},800);});



// ═══ ОНБОРДИНГ ═══
function checkOnboarding(){
  try{
    if(!localStorage.getItem('raven_onboarded')){
      document.getElementById('onboarding-overlay').style.display='block';
    }
  }catch(e){}
}

window.obNext = function(slide){
  for(var i=1;i<=3;i++){
    var el=document.getElementById('ob-slide-'+i);
    var dot=document.getElementById('ob-dot-'+i);
    if(el) el.style.display = i===slide?'block':'none';
    if(dot) dot.style.background = i===slide?'#d4af37':'rgba(255,255,255,.2)';
  }
};

window.obFinish = function(){
  try{ localStorage.setItem('raven_onboarded','1'); }catch(e){}
  var ov = document.getElementById('onboarding-overlay');
  if(ov){ ov.style.opacity='0'; ov.style.transition='opacity .4s'; setTimeout(function(){ov.style.display='none';ov.style.opacity='';},400); }
};

// ═══ МИНИ-ГРАФИК КАПИТАЛА В ТОПБАРЕ ═══
function updateTopbarChart(){
  var wrap  = document.getElementById('topbar-chart-wrap');
  var canvas = document.getElementById('topbar-chart');
  if(!wrap || !canvas || !currentUser) return;

  var balance = currentUser.balance || 0;
  if(!balance){ wrap.style.display='none'; return; }

  // Показываем блок
  wrap.style.display='flex';

  // Данные для графика — строим накопленный капитал по истории фиксаций
  var history = [];
  try{
    var saved = localStorage.getItem('raven_profit_history_'+currentUser.id);
    if(saved) history = JSON.parse(saved);
  }catch(e){}

  // Строим точки: стартовый баланс → накопленные суммы по хронологии
  var points = [];
  if(history.length >= 2){
    // История хранится от новых к старым — разворачиваем
    var sorted = history.slice().reverse().slice(-12);
    var running = balance;
    // Идём от старых к новым, вычитая суммы чтобы получить баланс на тот момент
    var amounts = sorted.map(function(e){ return e.amount||0; });
    var totalAmounts = amounts.reduce(function(s,a){ return s+a; }, 0);
    var startBal = balance - totalAmounts;
    if(startBal < 0) startBal = balance * 0.5;
    points.push(startBal);
    var acc = startBal;
    amounts.forEach(function(a){ acc += a; points.push(acc); });
  }
  if(points.length < 2) points = [balance * 0.88, balance];

  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  var min = Math.min.apply(null, points);
  var max = Math.max.apply(null, points);
  var range = max - min || 1;

  // Градиент
  var grad = ctx.createLinearGradient(0,0,0,H);
  var isGrowing = points[points.length-1] >= points[0];
  var color = isGrowing ? '#1db954' : '#e53e3e';
  grad.addColorStop(0, color+'44');
  grad.addColorStop(1, color+'00');

  // Путь
  ctx.beginPath();
  var step = W / (points.length - 1);
  points.forEach(function(p, i){
    var x = i * step;
    var y = H - ((p - min) / range) * (H-4) - 2;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });

  // Заливка
  var lastX = (points.length-1)*step;
  var lastY = H - ((points[points.length-1]-min)/range)*(H-4) - 2;
  ctx.lineTo(lastX, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Линия
  ctx.beginPath();
  points.forEach(function(p,i){
    var x = i*step;
    var y = H - ((p-min)/range)*(H-4) - 2;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Точка конца
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2.5, 0, Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();
}

function showMainApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('main-app').style.display='block';
  // Subscribe to live threshold updates
  loadThresholds();
  const u=currentUser,balance=u.balance||0;
  const initials=(u.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const avatarColor=balance>=20000?'#8b72f5':balance>=10000?'#f0a500':balance>=5000?'#aaaaaa':'#cd7f32';
  const av=document.getElementById('profile-avatar');av.textContent=initials;av.style.background=avatarColor+'18';av.style.border='1px solid '+avatarColor+'22';av.style.color=avatarColor;
  // Level ring progress
  const levels=[{min:0,max:5000},{min:5000,max:10000},{min:10000,max:20000},{min:20000,max:Infinity}];
  const lvl=levels.filter(l=>balance>=l.min).pop()||levels[0];
  const ringPct=lvl.max===Infinity?100:Math.round(((balance-lvl.min)/(lvl.max-lvl.min))*100);
  av.style.setProperty('--avatar-ring',avatarColor);av.style.setProperty('--ring-pct',ringPct+'%');
  document.getElementById('profile-name').textContent=u.name||'Пользователь';
  document.getElementById('profile-id-txt').textContent='ID: '+u.id;
  document.getElementById('profile-balance').textContent=fmtBal(balance);
  // Sort networks by threshold low→high
  const netOrder=[...['bsc','arb','sol','eth']].sort((a,b)=>(NET_THRESHOLDS[a]||0)-(NET_THRESHOLDS[b]||0));
  document.getElementById('profile-nets').innerHTML=netOrder.map(n=>{const thr=NET_THRESHOLDS[n]||0,ok=balance>=thr,color=NET_COLORS[n]||'#888',pct=thr===0?100:Math.min(100,(balance/thr)*100);return `<div class="net-item"><div class="net-dot-row"><div class="net-dot" style="background:${color}"></div><span class="net-name" style="color:${ok?'var(--txt)':'var(--txt3)'}">${NET_LABELS[n]}</span><span style="font-size:9px">${ok?'✓':'🔒'}</span></div><div class="net-bar"><div class="net-bar-fill" style="width:${pct}%;background:${ok?color:color+'55'}"></div></div></div>`;}).join('');
  applyProfileLevel(balance);
  updateTopbarChart();
  loadAlerts();renderAlerts();
  recordLogin();
  requestNotifPermission();

  // Show onboarding for first-time users (after short delay)
  setTimeout(showOnboarding, 1200);
  // Prompt Telegram registration after 5s (non-intrusive)
  // Сброс счётчика брутфорса при успешном входе
  if(typeof _loginAttempts !== 'undefined'){ window._loginAttempts=0; window._loginBlockedUntil=0; }
  setTimeout(tgRegisterUser, 5000);
  // Показываем онбординг при первом входе
  setTimeout(checkOnboarding, 800);
  subscribeToTrades();
  // Онлайн присутствие
  // Онлайн — пишем lastSeen прямо в users (presence коллекция может быть закрыта)
  // Проверка сессии каждые 5 минут
  setInterval(function(){
    if(!currentUser||!db) return;
    db.collection('users').doc(currentUser.id).get().then(function(snap){
      if(!snap.exists||snap.data().active===false){
        showToast('Сессия завершена. Войдите снова.','error');
        setTimeout(function(){ if(typeof window.doLogout==='function') window.doLogout(); },2000);
      }
    }).catch(function(){});
  }, 5*60*1000);

  function updatePresence(){
    if(!currentUser||!db) return;
    // Через API если задан, иначе напрямую
    apiCall('updatePresence', { userId: currentUser.id, online: true })
      .then(function(res){
        if(!res){
          try{
            db.collection('users').doc(currentUser.id).update({
              lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
              online: true
            });
          }catch(e){}
        }
      }).catch(function(){
        try{
          db.collection('users').doc(currentUser.id).update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            online: true
          });
        }catch(e){}
      });
  }
  updatePresence();
  setInterval(updatePresence, 15000); // каждые 15 сек
  window.addEventListener('beforeunload',function(){
    try{
      db.collection('users').doc(currentUser.id).update({online:false});
    }catch(e){}
  });
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden){ updatePresence(); }
  });
  
  setTimeout(()=>{if(deferredPrompt&&!sessionStorage.getItem('pwa_dismissed')){document.getElementById('pwa-banner')?.classList.add('show');}},4000);
}

// ═══ CONFETTI ═══
function launchConfetti(){
  const colors=['#d4af37','#f0a500','#1db954','#29B6F6','#9945FF','#fff'];
  for(let i=0;i<45;i++){
    const el=document.createElement('div');
    el.className='confetti-piece';
    const color=colors[i%colors.length];
    const isRect=Math.random()>.5;
    el.style.cssText=`left:${Math.random()*100}vw;top:-10px;background:${color};border-radius:${isRect?'2px':'50%'};width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;--dur:${1.2+Math.random()*.8}s;--delay:${Math.random()*.4}s`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),(1.6+Math.random()*.8)*1000);
  }
}

// Push notification for fixed trades
function notifyFixed(t){
  if(notifiedFixed.has(t._id))return;
  notifiedFixed.add(t._id);
  sessionStorage.setItem('dex_notified_fixed',JSON.stringify([...notifiedFixed]));
  // Browser notification
  try{if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
    new Notification('💰 DEX Scanner — Фиксируйте прибыль!',{
      body:`${t.pair} · ${CHAIN_META[t.chain]?.label||t.chain} · спред ${(t.lo||0).toFixed(2)}–${(t.hi||0).toFixed(2)}%`,
      icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="%230b0d12"/><polygon points="32,8 56,22 56,42 32,56 8,42 8,22" stroke="%2314b8a6" stroke-width="4" fill="none"/><circle cx="32" cy="32" r="8" fill="%2314b8a6"/></svg>',
      tag:'dex-fixed-'+t._id,
    });
  }}catch(e){}
  // Sound — двухтоновый chime
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [[660,0],[880,.2]].forEach(([freq,delay])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.frequency.value=freq;o.type='sine';
      g.gain.setValueAtTime(0,ctx.currentTime+delay);
      g.gain.linearRampToValueAtTime(0.12,ctx.currentTime+delay+.02);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay+.4);
      o.start(ctx.currentTime+delay);o.stop(ctx.currentTime+delay+.4);
    });
  }catch(e){}
}

function requestNotifPermission(){
  try{if(typeof Notification!=='undefined'&&Notification.permission==='default'){Notification.requestPermission().catch(function(){});}}
  catch(e){}
}


// ═══ CLOCK + COUNTDOWN ═══
setInterval(()=>{
  document.getElementById('top-time').textContent=new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  trades.forEach(t=>{if(!hasRealTime(t))return;const d=getAddedTime(t);if(!d)return;const rem=Math.max(0,30*60*1000-(Date.now()-d.getTime())),pct=Math.max(0,(rem/(30*60*1000))*100),cls=pct<25?'urgent':pct<60?'normal':'fresh',col=pct<25?'#e53e3e':pct<60?'#f0a500':'#1db954';const el=document.querySelector(`.countdown[data-id="${t._id}"]`);if(el){el.className=`countdown ${cls}`;const ct=el.querySelector('.cd-time');if(ct)ct.textContent=`⏱ ${Math.floor(rem/60000)}:${String(Math.floor((rem%60000)/1000)).padStart(2,'0')}`;const fill=el.querySelector('.cd-fill');if(fill){fill.style.width=pct+'%';fill.style.background=col;}}});
},1000);
setInterval(async()=>{if(trades.length&&chain!=='history')await render();},60000);


// ═══ MOBILE SIDEBAR ═══
document.getElementById('side-close-btn')?.addEventListener('click',closeMobileSidebar);

// ═══ OFFLINE DETECTION ═══
let offlineTimeout=null;
window.addEventListener('online',()=>{document.getElementById('offline-banner')?.classList.remove('show');{const _as=document.getElementById('api-status');if(_as)_as.textContent='● Восстановлено';}{const _as2=document.getElementById('api-status');if(_as2)_as2.style.color='var(--green)';}});
window.addEventListener('offline',()=>{document.getElementById('offline-banner')?.classList.add('show');{const _as=document.getElementById('api-status');if(_as)_as.textContent='✗ Нет соединения';}{const _as2=document.getElementById('api-status');if(_as2)_as2.style.color='var(--red)';}});

// ═══ LOGIN PARTICLES ═══
(function(){
  const wrap=document.getElementById('login-particles');
  if(!wrap)return;
  for(let i=0;i<22;i++){
    const p=document.createElement('div');
    p.className='login-particle';
    const size=1+Math.random()*2.5;
    p.style.cssText=`left:${Math.random()*100}%;--dur:${7+Math.random()*9}s;--delay:-${Math.random()*12}s;width:${size}px;height:${size}px`;
    wrap.appendChild(p);
  }
})();

// ═══ ONBOARDING ═══
function showOnboarding(){
  const u=currentUser;if(!u)return;
  const seen=localStorage.getItem('dex_onboarding_'+u.id);
  if(seen)return;
  // Set welcome name
  const nameEl=document.getElementById('ob-welcome-name');
  if(nameEl)nameEl.textContent='Добро пожаловать, '+(u.name||'трейдер')+'!';
  // Show locked nets info
  const bal=u.balance||0;
  const locked=Object.entries(NET_THRESHOLDS).filter(([n,t])=>t>0&&bal<t).map(([n])=>n.toUpperCase());
  const netsEl=document.getElementById('ob-nets-sub');
  if(netsEl&&locked.length>0)netsEl.textContent=`У вас заблокированы сети: ${locked.join(', ')}. Пополните капитал для доступа`;
  document.getElementById('onboarding')?.classList.remove('hidden');
}

window.closeOnboarding=function(){
  document.getElementById('onboarding')?.classList.add('hidden');
  if(currentUser)localStorage.setItem('dex_onboarding_'+currentUser.id,'1');
};


// ═══ УЛУЧШ.7: Live индикатор ═══
function updateConnectionStatus(status){
  const el=document.getElementById('api-status');if(!el)return;
  if(status==='live'){el.innerHTML='<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#1db954;margin-right:5px;animation:blink 1.4s infinite"></span>Firebase Live';el.style.color='var(--green)';}
  else if(status==='error'){el.innerHTML='<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#e53e3e;margin-right:5px"></span>Ошибка';el.style.color='var(--red)';}
  else{el.innerHTML='<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f0a500;margin-right:5px;animation:blink 1.4s infinite"></span>Подключение...';el.style.color='var(--amber)';}
}

// ═══ УЛУЧШ.1: TG отключить ═══
function tgDisconnect(){
  if(!currentUser||!db)return;
  updateDoc(doc(db,'users',currentUser.id),{tgChatId:''}).then(()=>{
    currentUser.tgChatId='';updateTgStatusUI();showToast('Telegram отключён','success');
  }).catch(()=>showToast('Ошибка','error'));
}

// ═══ УЛУЧШ.5/НОВОЕ.9: Скрытие сетей ═══
function toggleNetVisibility(net,el){
  const idx=hiddenNets.indexOf(net);
  const knob=el.querySelector('div');
  const colors={bsc:'#F0B90B',arb:'#29B6F6',eth:'#6366F1',sol:'#9945FF'};
  if(idx===-1){
    hiddenNets.push(net);
    el.style.background='rgba(255,255,255,.1)';el.style.borderColor='rgba(255,255,255,.15)';
    if(knob){knob.style.left='3px';knob.style.background='rgba(255,255,255,.3)';}
  } else {
    hiddenNets.splice(idx,1);
    const col=colors[net]||'#888';
    el.style.background=col+'28';el.style.borderColor=col+'44';
    if(knob){knob.style.left='21px';knob.style.background=col;}
  }
  localStorage.setItem('dex_hidden_nets',JSON.stringify(hiddenNets));
  render();
}

// ═══ УЛУЧШ.4: Мини-график баланса ═══
function saveBalanceHistory(balance){
  const key='dex_balance_history';
  const hist=JSON.parse(localStorage.getItem(key)||'[]');
  const last=hist[hist.length-1];
  if(!last||last.v!==balance){hist.push({v:balance,t:Date.now()});if(hist.length>30)hist.shift();localStorage.setItem(key,JSON.stringify(hist));}
}
function drawBalanceChart(){
  const canvas=document.getElementById('balance-chart-canvas');if(!canvas)return;
  const history=JSON.parse(localStorage.getItem('dex_balance_history')||'[]');
  if(history.length<2)return;
  const W=canvas.offsetWidth||280,H=50;
  canvas.width=W*devicePixelRatio;canvas.height=H*devicePixelRatio;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(devicePixelRatio,devicePixelRatio);
  const vals=history.map(h=>h.v),min=Math.min(...vals)*.98,max=Math.max(...vals)*1.02;
  const px=i=>i*(W-2)/(vals.length-1)+1,py=v=>H-4-(v-min)/(max-min||1)*(H-8);
  const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'rgba(29,185,84,.3)');grad.addColorStop(1,'rgba(29,185,84,.0)');
  ctx.beginPath();ctx.moveTo(px(0),py(vals[0]));for(let i=1;i<vals.length;i++)ctx.lineTo(px(i),py(vals[i]));
  ctx.lineTo(px(vals.length-1),H);ctx.lineTo(px(0),H);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();ctx.moveTo(px(0),py(vals[0]));for(let i=1;i<vals.length;i++)ctx.lineTo(px(i),py(vals[i]));
  ctx.strokeStyle='#1db954';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
}

// ═══ drawSpreadChart ═══
function drawSpreadChart(t){
  const canvas=document.getElementById('detail-chart-canvas');if(!canvas)return;
  const hist=spreadHistory[t._id]||[];
  const data=hist.length>=2?hist.map(h=>h.v):(()=>{const pts=[];const base=t.lo||0,range=(t.hi||0)-(t.lo||0);for(let i=0;i<12;i++){pts.push(Math.max(base*.7,base+range*(i/11)+(Math.random()-.5)*range*.6));}pts[pts.length-1]=t.hi;return pts;})();
  const wrap=canvas.closest('.detail-chart-wrap');const W=(wrap?wrap.offsetWidth:canvas.offsetWidth)||300,H=100;
  canvas.width=W*devicePixelRatio;canvas.height=H*devicePixelRatio;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(devicePixelRatio,devicePixelRatio);
  const min=Math.min(...data)*.95,max=Math.max(...data)*1.05,col=CHAIN_META[t.chain]?.color||'#1db954';
  const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,col+'40');grad.addColorStop(1,col+'00');
  const px=i=>i*(W-2)/(data.length-1)+1,py=v=>H-4-(v-min)/(max-min||1)*(H-8);
  ctx.beginPath();ctx.moveTo(px(0),py(data[0]));for(let i=1;i<data.length;i++)ctx.lineTo(px(i),py(data[i]));
  ctx.lineTo(px(data.length-1),H);ctx.lineTo(px(0),H);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();ctx.moveTo(px(0),py(data[0]));for(let i=1;i<data.length;i++)ctx.lineTo(px(i),py(data[i]));
  ctx.strokeStyle=col;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.4)';ctx.font='9px JetBrains Mono,monospace';
  ctx.fillText(min.toFixed(2)+'%',3,H-5);ctx.textAlign='right';ctx.fillText(max.toFixed(2)+'%',W-3,12);ctx.textAlign='left';
  const lx=px(data.length-1),ly=py(data[data.length-1]);ctx.beginPath();ctx.arc(lx,ly,3,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
}

// ═══ НОВОЕ.10: Быстрые действия профиля ═══
window._addBalanceManual=function(){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML='<div style="background:#13161f;border:1px solid rgba(29,185,84,.3);border-radius:16px;padding:24px 20px;width:100%;max-width:320px"><div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:16px">Пополнить капитал</div><input id="_bi" type="number" min="1" placeholder="Сумма" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(29,185,84,.3);border-radius:10px;padding:12px 14px;font-size:20px;font-weight:700;color:#1db954;font-family:JetBrains Mono,monospace;outline:none;box-sizing:border-box;margin-bottom:14px"><div style="display:flex;gap:8px"><button id="_bc" style="flex:1;padding:12px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Отмена</button><button id="_bo" style="flex:2;padding:12px;border-radius:10px;background:rgba(29,185,84,.2);border:1px solid rgba(29,185,84,.4);color:#1db954;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Добавить</button></div></div>';
  document.body.appendChild(ov);
  setTimeout(()=>ov.querySelector('#_bi').focus(),100);
  ov.querySelector('#_bc').onclick=()=>ov.remove();
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.querySelector('#_bo').onclick=function(){
    const amt=parseFloat(ov.querySelector('#_bi').value);ov.remove();
    if(!amt||amt<=0){showToast('Неверная сумма','error');return;}
    if(!currentUser||!db)return;
    const nb=Math.round(((currentUser.balance||0)+amt)*100)/100;
    updateDoc(doc(db,'users',currentUser.id),{balance:nb}).then(()=>{
      currentUser.balance=nb;saveBalanceHistory(nb);
      document.getElementById('profile-balance').textContent=fmtBal(nb);
      applyProfileLevel(nb);showToast('💰 +$'+amt+' добавлено!','success');openProfileModal();
    }).catch(()=>showToast('Ошибка','error'));
  };
};
window._clearProfitHistory=function(){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML='<div style="background:#13161f;border:1px solid rgba(229,62,62,.3);border-radius:16px;padding:24px 20px;width:100%;max-width:300px;text-align:center"><div style="font-size:32px;margin-bottom:12px">🗑️</div><div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:8px">Сбросить историю?</div><div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:20px">Все зафиксированные сделки<br>будут удалены</div><div style="display:flex;gap:8px"><button id="_cc" style="flex:1;padding:12px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Отмена</button><button id="_co" style="flex:1;padding:12px;border-radius:10px;background:rgba(229,62,62,.15);border:1px solid rgba(229,62,62,.4);color:#e53e3e;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Сбросить</button></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#_cc').onclick=()=>ov.remove();
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.querySelector('#_co').onclick=function(){ov.remove();profitHistory=[];localStorage.removeItem(PROFIT_HISTORY_KEY);showToast('История сброшена','success');openProfileModal();};
};

document.getElementById('share-close-btn')?.addEventListener('click',()=>document.getElementById('share-overlay').classList.remove('show'));
document.getElementById('share-overlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove('show');});

window._addBalanceManual=function(){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML='<div style="background:#13161f;border:1px solid rgba(29,185,84,.3);border-radius:16px;padding:24px 20px;width:100%;max-width:320px"><div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:16px">Пополнить капитал</div><input id="_bi" type="number" min="1" placeholder="Сумма" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(29,185,84,.3);border-radius:10px;padding:12px 14px;font-size:20px;font-weight:700;color:#1db954;font-family:JetBrains Mono,monospace;outline:none;box-sizing:border-box;margin-bottom:14px"><div style="display:flex;gap:8px"><button id="_bc" style="flex:1;padding:12px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Отмена</button><button id="_bo" style="flex:2;padding:12px;border-radius:10px;background:rgba(29,185,84,.2);border:1px solid rgba(29,185,84,.4);color:#1db954;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Добавить</button></div></div>';
  document.body.appendChild(ov);
  setTimeout(()=>ov.querySelector('#_bi').focus(),100);
  ov.querySelector('#_bc').onclick=()=>ov.remove();
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.querySelector('#_bo').onclick=function(){
    const amt=parseFloat(ov.querySelector('#_bi').value);ov.remove();
    if(!amt||amt<=0){showToast('Неверная сумма','error');return;}
    if(!currentUser||!db)return;
    const nb=Math.round(((currentUser.balance||0)+amt)*100)/100;
    db.collection('users').doc(currentUser.id).update({balance:nb}).then(()=>{
      currentUser.balance=nb;saveBalanceHistory(nb);
      document.getElementById('profile-balance').textContent=fmtBal(nb);
      applyProfileLevel(nb);showToast('💰 +$'+amt+' добавлено!','success');openProfileModal();
    }).catch(()=>showToast('Ошибка','error'));
  };
};

window._clearProfitHistory=function(){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML='<div style="background:#13161f;border:1px solid rgba(229,62,62,.3);border-radius:16px;padding:24px 20px;width:100%;max-width:300px;text-align:center"><div style="font-size:32px;margin-bottom:12px">🗑️</div><div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:8px">Сбросить историю?</div><div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:20px">Все зафиксированные сделки<br>будут удалены</div><div style="display:flex;gap:8px"><button id="_cc" style="flex:1;padding:12px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Отмена</button><button id="_co" style="flex:1;padding:12px;border-radius:10px;background:rgba(229,62,62,.15);border:1px solid rgba(229,62,62,.4);color:#e53e3e;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Сбросить</button></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#_cc').onclick=()=>ov.remove();
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.querySelector('#_co').onclick=function(){ov.remove();profitHistory=[];localStorage.removeItem(PROFIT_HISTORY_KEY);showToast('История сброшена','success');openProfileModal();};
};
// ═══ Статистика дня ═══
var dayStatsKey = 'dex_day_stats_' + new Date().toISOString().slice(0,10);
var dayStats = JSON.parse(localStorage.getItem(dayStatsKey) || '{"signals":0,"best":0,"earned":0,"spreads":[]}');

function saveDayStats(){ localStorage.setItem(dayStatsKey, JSON.stringify(dayStats)); }

function updateDayStats(opts) {
  if (opts.signal) {
    dayStats.signals++;
    dayStats.spreads.push(opts.spread||0);
    if ((opts.spread||0) > dayStats.best) dayStats.best = opts.spread||0;
    saveDayStats();
  }
  if (opts.earned) {
    dayStats.earned = Math.round((dayStats.earned + opts.earned)*100)/100;
    saveDayStats();
  }
  renderDayStats();
}

function renderDayStats() {
  var bar = document.getElementById('day-stats-bar');
  if (!bar) return;
  var hasData = dayStats.signals > 0 || dayStats.earned > 0;
  bar.style.display = hasData ? 'flex' : 'none';
  var el;
  el = document.getElementById('day-signals'); if(el) el.textContent = dayStats.signals;
  el = document.getElementById('day-best');    if(el) el.textContent = dayStats.best>0?dayStats.best.toFixed(2)+'%':'—';
  el = document.getElementById('day-earned');  if(el) el.textContent = '$'+(dayStats.earned||0).toFixed(0);
  var avg = dayStats.spreads.length ? (dayStats.spreads.reduce(function(a,b){return a+b;},0)/dayStats.spreads.length).toFixed(2) : '—';
  el = document.getElementById('day-avg'); if(el) el.textContent = avg!=='—'?avg+'%':'—';
}

// ═══ Звуки ═══
function playSound(type) {
  if (!alertsOn) return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === 'expire') {
      [880,660,440].forEach(function(freq,i){
        var o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.value=freq;o.type='sine';
        g.gain.setValueAtTime(0,ctx.currentTime+i*.15);
        g.gain.linearRampToValueAtTime(0.15,ctx.currentTime+i*.15+.05);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*.15+.25);
        o.start(ctx.currentTime+i*.15);o.stop(ctx.currentTime+i*.15+.25);
      });
    } else if (type === 'profit') {
      [523,659,784,1047].forEach(function(freq,i){
        var o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.value=freq;o.type='triangle';
        g.gain.setValueAtTime(0,ctx.currentTime+i*.1);
        g.gain.linearRampToValueAtTime(0.12,ctx.currentTime+i*.1+.04);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*.1+.25);
        o.start(ctx.currentTime+i*.1);o.stop(ctx.currentTime+i*.1+.25);
      });
    } else if (type === 'fixed_alert') {
      [440,880].forEach(function(freq,i){
        var o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.value=freq;o.type='sine';
        g.gain.setValueAtTime(0.1,ctx.currentTime+i*.2);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*.2+.3);
        o.start(ctx.currentTime+i*.2);o.stop(ctx.currentTime+i*.2+.3);
      });
    }
  } catch(e){}
}


function drawSpreadChart(t){
  const canvas=document.getElementById('detail-chart-canvas');if(!canvas)return;
  const hist=spreadHistory[t._id]||[];
  const data=hist.length>=2?hist.map(h=>h.v):(()=>{const pts=[];const base=t.lo||0,range=(t.hi||0)-(t.lo||0);for(let i=0;i<12;i++){pts.push(Math.max(base*.7,base+range*(i/11)+(Math.random()-.5)*range*.6));}pts[pts.length-1]=t.hi;return pts;})();
  const wrap=canvas.closest('.detail-chart-wrap');const W=(wrap?wrap.offsetWidth:canvas.offsetWidth)||300,H=100;
  canvas.width=W*devicePixelRatio;canvas.height=H*devicePixelRatio;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(devicePixelRatio,devicePixelRatio);
  const min=Math.min(...data)*.95,max=Math.max(...data)*1.05,col=CHAIN_META[t.chain]?.color||'#1db954';
  const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,col+'40');grad.addColorStop(1,col+'00');
  const px=i=>i*(W-2)/(data.length-1)+1,py=v=>H-4-(v-min)/(max-min||1)*(H-8);
  ctx.beginPath();ctx.moveTo(px(0),py(data[0]));for(let i=1;i<data.length;i++)ctx.lineTo(px(i),py(data[i]));
  ctx.lineTo(px(data.length-1),H);ctx.lineTo(px(0),H);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();ctx.moveTo(px(0),py(data[0]));for(let i=1;i<data.length;i++)ctx.lineTo(px(i),py(data[i]));
  ctx.strokeStyle=col;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.4)';ctx.font='9px JetBrains Mono,monospace';
  ctx.fillText(min.toFixed(2)+'%',3,H-5);ctx.textAlign='right';ctx.fillText(max.toFixed(2)+'%',W-3,12);ctx.textAlign='left';
  const lx=px(data.length-1),ly=py(data[data.length-1]);ctx.beginPath();ctx.arc(lx,ly,3,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
}
// ═══ Автоматический дневник ═══
var _diaryLastSent = localStorage.getItem('dex_diary_last') || '';

function checkDiarySend() {
  if (!currentUser || !currentUser.tgChatId) return;
  var now = new Date();
  var dateKey = now.toISOString().slice(0,10);
  if (now.getHours() !== 23 || now.getMinutes() !== 59) return;
  if (_diaryLastSent === dateKey) return;
  _diaryLastSent = dateKey;
  localStorage.setItem('dex_diary_last', dateKey);
  sendDiaryMessage(dateKey);
}

function sendDiaryMessage(dateKey) {
  if (!currentUser || !currentUser.tgChatId) return;
  var hist = typeof profitHistory !== 'undefined' ? profitHistory : [];
  var todayDeals = hist.filter(function(e){
    return new Date(e.time).toISOString().slice(0,10) === dateKey;
  });
  var earned = todayDeals.reduce(function(s,e){ return s+(e.amount||0); },0);
  var best   = todayDeals.reduce(function(b,e){ return e.amount>b?e.amount:b; },0);
  var count  = todayDeals.length;
  var signals = typeof dayStats !== 'undefined' ? (dayStats.signals||0) : 0;
  var spread  = typeof dayStats !== 'undefined' ? (dayStats.best||0) : 0;
  var streak  = calcStreak();
  var dn = new Date().toLocaleDateString('ru',{day:'numeric',month:'long',weekday:'long'});
  var lines2 = [];
  lines2.push('\uD83D\uDCCB ДНЕВНИК RAVENEYE');
  lines2.push(dn);
  lines2.push('\u2015\u2015\u2015\u2015\u2015\u2015\u2015');
  lines2.push('');
  if (count === 0 && signals === 0) {
    lines2.push('\uD83D\uDE34 Сегодня без сделок');
    lines2.push('Завтра рынок откроет новые возможности \uD83E\uDD85');
  } else {
    lines2.push('\uD83D\uDCCA Сигналов: ' + signals);
    if (spread > 0) lines2.push('\uD83C\uDFC6 Лучший спред: ' + spread.toFixed(2) + '%');
    lines2.push('');
    if (count > 0) {
      lines2.push('\uD83D\uDCBC Сделок: ' + count);
      lines2.push('\uD83D\uDCB0 Заработано: +$' + earned.toFixed(0));
      if (best > 0) lines2.push('\u2B50 Лучшая: +$' + best);
    } else {
      lines2.push('\uD83D\uDCED Без фиксаций');
    }
    if (streak > 1) lines2.push('\uD83D\uDD25 Серия: ' + streak + ' дней подряд');
    lines2.push('');
    if (earned >= 500) lines2.push('\uD83D\uDE80 Отличный день!');
    else if (earned > 0) lines2.push('\u2705 Хороший день!');
    else lines2.push('\uD83D\uDC40 Завтра будет лучше');
  }
  var msg = lines2.join('\n');
  if (typeof tgSendToUser === 'function') tgSendToUser(currentUser.tgChatId, msg);
}

function calcStreak() {
  try {
    var h = JSON.parse(localStorage.getItem('dex_profit_history') || '[]');
    var s = 0;
    for (var i = 0; i < 30; i++) {
      var ds = new Date(Date.now()-i*86400000).toISOString().slice(0,10);
      if (h.some(function(e){ return new Date(e.time).toISOString().slice(0,10)===ds; })) s++;
      else if (i > 0) break;
    }
    return s;
  } catch(e) { return 0; }
}

setInterval(checkDiarySend, 60000);