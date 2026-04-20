// ═══ firebase.js — Firebase, подписки, TG, логин ═══

import { initializeApp }                                          from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore, collection, doc, getDoc, updateDoc,
         onSnapshot, enableNetwork }                             from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { firebaseConfig, TG_TOKEN, SITE_URL, CHAIN_META, NET_THRESHOLDS,
         NET_COLORS, NET_LABELS }                                from './config.js';
import { trades, currentUser, db, tradesUnsub, knownIds, seenTradeIds,
         notifiedFixed, spreadHistory, profitHistory,
         setTrades, setCurrentUser, setDb, setTradesUnsub,
         setLastDataReceived, saveProfitEntry, loadAlerts, recordLogin }  from './state.js';

// ── Инициализация Firebase ──
export function initFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    setDb(getFirestore(app));
    enableNetwork(db).catch(e => console.error('[RavenEye] enableNetwork error:', e));

    // Автологин если ID сохранён
    const savedId = localStorage.getItem('dex_user_id');
    if (savedId) {
      const inp = document.getElementById('login-inp');
      if (inp) inp.value = savedId;
      setTimeout(() => { window.doLogin && window.doLogin(); }, 400);
    }
  } catch(e) {
    console.error('[RavenEye] Firebase init error:', e);
  }
}

// ── Подписка на пороги сетей ──
export function loadThresholds() {
  if (!db) return;
  onSnapshot(doc(db, 'meta', 'thresholds'), snap => {
    if (!snap.exists()) return;
    const d = snap.data();
    let changed = false;
    ['eth','arb','sol','bsc'].forEach(k => {
      if (d[k] !== undefined && NET_THRESHOLDS[k] !== d[k]) {
        NET_THRESHOLDS[k] = d[k]; changed = true;
      }
    });
    if (changed && currentUser) {
      const balance  = currentUser.balance || 0;
      const netOrder = ['bsc','arb','sol','eth'].sort((a,b) => (NET_THRESHOLDS[a]||0) - (NET_THRESHOLDS[b]||0));
      document.getElementById('profile-nets').innerHTML = netOrder.map(n => {
        const thr = NET_THRESHOLDS[n]||0, ok = balance>=thr,
              color = NET_COLORS[n]||'#888', pct = thr===0?100:Math.min(100,(balance/thr)*100);
        return `<div class="net-item"><div class="net-dot-row"><div class="net-dot" style="background:${color}"></div><span class="net-name" style="color:${ok?'var(--txt)':'var(--txt3)'}">${NET_LABELS[n]}</span><span style="font-size:9px">${ok?'✓':'🔒'}</span></div><div class="net-bar"><div class="net-bar-fill" style="width:${pct}%;background:${ok?color:color+'55'}"></div></div></div>`;
      }).join('');
      render();
    }
  }, e => console.log('thresholds error', e));
}

// ── Подписка на сделки ──
export function subscribeToTrades() {
  if (!db) { setTimeout(subscribeToTrades, 1000); return; }

  document.getElementById('api-status').textContent = '● Подключено';

  const skeletonTimeout = setTimeout(async () => {
    const col = document.getElementById('trades-col');
    if (col && col.querySelector('.skel-card')) { setTrades([]); await render(); }
  }, 5000);

  if (tradesUnsub) { try { tradesUnsub(); } catch(e) {} setTradesUnsub(null); }

  try {
    setTradesUnsub(onSnapshot(collection(db, 'trades'),
      async snap => {
        clearTimeout(skeletonTimeout);
        resetDataTimer(); setLastDataReceived(Date.now());

        const newTrades = [];
        snap.forEach(d => newTrades.push({...d.data(), _id: d.id}));

        newTrades.forEach(t => {
          // Новая сделка
          if (!knownIds.has(t._id) && knownIds.size > 0 && t.hi >= 0.5) {
            addAlert(t);
            if (currentUser?.tgChatId) {
              const cm = CHAIN_META[t.chain] || {label: t.chain.toUpperCase(), gas: 0.5};
              const avg = ((t.lo||0)+(t.hi||0))/2, net = (avg-0.06-(cm.gas/1000)).toFixed(2);
              const riskEmoji  = t.hi>=1.8?'🔴':t.hi>=1.1?'🟡':'🟢';
              const chainEmoji = {eth:'💎',arb:'🔷',sol:'🟣',bsc:'🟡'}[t.chain]||'⛓';
              tgSendToUser(currentUser.tgChatId,
                '🦅 RAVENEYE PRO · Новый сигнал\n\n'+chainEmoji+' '+t.pair+
                '\n📍 '+cm.label+' · '+(t.dex||'')+
                '\n\n💰 '+(t.lo||0).toFixed(2)+'% → '+(t.hi||0).toFixed(2)+'%'+
                '\n📈 +'+net+'% '+riskEmoji+
                '\n💵 '+fmtVol(t.vol||0)+
                '\n⏱ '+(t.tmin||'?')+'–'+(t.tmax||'?')+' мин\n\n🔗 '+SITE_URL
              );
            }
          }
          // Фиксация прибыли
          if (t.fixed && !notifiedFixed.has(t._id)) {
            notifyFixed(t); launchConfetti();
            if (currentUser?.tgChatId) {
              const ce = {eth:'💎',arb:'🔷',sol:'🟣',bsc:'🟡'}[t.chain]||'⛓';
              tgSendToUser(currentUser.tgChatId,
                '💰 ФИКСИРУЙТЕ ПРИБЫЛЬ!\n\n'+ce+' '+t.pair+
                '\n📍 '+(CHAIN_META[t.chain]?.label||t.chain)+
                '\n\n⚡ Время выходить!\n\n🔗 '+SITE_URL
              );
            }
          }
          knownIds.add(t._id);
        });

        const newIds = new Set(newTrades.map(t => t._id));
        trades.forEach(t => { if (!newIds.has(t._id)) knownIds.delete(t._id); });

        // Обновляем spreadHistory
        const spreadChanges = {};
        newTrades.forEach(nt => {
          const ot = trades.find(x => x._id === nt._id);
          if (ot && ot.hi !== nt.hi) spreadChanges[nt._id] = nt.hi > ot.hi ? 'up' : 'down';
          if (!spreadHistory[nt._id]) spreadHistory[nt._id] = [];
          const _h = spreadHistory[nt._id], _l = _h[_h.length-1];
          if (!_l || _l.v !== nt.hi) { _h.push({v:nt.hi, t:Date.now()}); if (_h.length>20) _h.shift(); }
        });

        setTrades(newTrades);
        window._spreadChanges = spreadChanges;
        await render();

        document.getElementById('st-cd').textContent = 'LIVE';
        document.getElementById('last-update').textContent = 'Обновлено: ' + new Date().toLocaleTimeString('ru');
        updateConnectionStatus('live');
      },
      async err => {
        console.error('Firestore error:', err);
        clearTimeout(skeletonTimeout);
        setTrades([]); await render();
        updateConnectionStatus('error');
        setTimeout(() => { if (currentUser) subscribeToTrades(); }, 3000);
      }
    ));
  } catch(e) {
    console.error('Subscribe error:', e);
    setTimeout(() => { if (currentUser) subscribeToTrades(); }, 3000);
  }
}

// ── Telegram ──
export async function tgSendToUser(chatId, text) {
  if (!chatId) return false;
  try {
    const res  = await fetch('https://api.telegram.org/bot'+TG_TOKEN+'/sendMessage', {
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({chat_id: chatId, text, parse_mode:'HTML'}),
    });
    return (await res.json()).ok;
  } catch(e) { return false; }
}

export async function tgRegisterUser() {
  if (!currentUser || !db) return;
  const tgFromUrl = new URLSearchParams(window.location.search).get('tg');
  if (tgFromUrl && tgFromUrl.length > 5 && !isNaN(Number(tgFromUrl))) {
    try {
      await updateDoc(doc(db,'users',currentUser.id), {tgChatId: tgFromUrl});
      currentUser.tgChatId = tgFromUrl;
      await tgSendToUser(tgFromUrl, '✅ Telegram подключён!\n\nТеперь вы будете получать уведомления о новых торговых сигналах.');
      window.history.replaceState({}, '', window.location.pathname);
      showTgConnectedToast(); updateTgStatusUI();
    } catch(e) {}
    return;
  }
  try {
    const snap = await getDoc(doc(db,'users',currentUser.id));
    if (snap.exists()) {
      const d = snap.data();
      if (d.tgChatId && d.tgChatId !== currentUser.tgChatId) { currentUser.tgChatId = d.tgChatId; updateTgStatusUI(); }
    }
  } catch(e) {}
  if (!window._userUnsub) {
    try {
      window._userUnsub = onSnapshot(doc(db,'users',currentUser.id), snap => {
        if (!snap.exists()) return;
        const d = snap.data();
        if (d.tgChatId && d.tgChatId !== currentUser.tgChatId) {
          currentUser.tgChatId = d.tgChatId; updateTgStatusUI(); showTgConnectedToast();
        }
        if (d.balance !== undefined && d.balance !== currentUser.balance) {
          currentUser.balance = d.balance;
          document.getElementById('profile-balance').textContent = fmtBal(d.balance);
          applyProfileLevel(d.balance);
        }
      });
    } catch(e) {}
  }
}

export function tgDisconnect() {
  if (!currentUser || !db) return;
  updateDoc(doc(db,'users',currentUser.id), {tgChatId: ''}).then(() => {
    currentUser.tgChatId = '';
    updateTgStatusUI();
    showToast('Telegram отключён', 'success');
  }).catch(() => showToast('Ошибка', 'error'));
}

// ── Login / Logout ──
export async function doLogin() {
  const raw  = document.getElementById('login-inp').value.trim().toUpperCase();
  const btn  = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const inp  = document.getElementById('login-inp');
  if (!raw)  { errEl.textContent = 'Введите ID'; return; }
  if (!db)   { errEl.textContent = 'Ошибка подключения к серверу'; return; }
  btn.disabled = true; btn.textContent = 'Проверка...'; errEl.textContent = '';
  try {
    const snap = await getDoc(doc(db,'users',raw));
    if (!snap.exists()) {
      inp.classList.add('error');
      setTimeout(() => inp.classList.remove('error'), 400);
      errEl.textContent = 'Вы ввели неверный ID. Обратитесь к администратору за получением нового ID.';
      btn.disabled = false; btn.textContent = 'ВОЙТИ В СИСТЕМУ';
      return;
    }
    setCurrentUser({id: raw, ...snap.data()});
    localStorage.setItem('dex_user_id', raw);
    btn.classList.add('success'); btn.textContent = '✓ ДОБРО ПОЖАЛОВАТЬ';
    showSkeleton();
    setTimeout(showMainApp, 700);
  } catch(e) {
    errEl.textContent = 'Ошибка сервера. Попробуйте ещё раз.';
    btn.disabled = false; btn.textContent = 'ВОЙТИ В СИСТЕМУ';
  }
}

export function doLogout() {
  localStorage.removeItem('dex_user_id');
  setCurrentUser(null);
  if (tradesUnsub) { tradesUnsub(); setTradesUnsub(null); }
  if (window._userUnsub) { try { window._userUnsub(); } catch(e) {} window._userUnsub = null; }
  setTrades([]); setSelectedId(null); seenTradeIds.clear();
  document.getElementById('login-screen').style.display  = 'flex';
  document.getElementById('main-app').style.display      = 'none';
  document.getElementById('login-inp').value             = '';
  document.getElementById('login-error').textContent     = '';
  const btn = document.getElementById('login-btn');
  btn.disabled = false; btn.textContent = 'ВОЙТИ В СИСТЕМУ'; btn.classList.remove('success');
}

// ── Timer ──
export let resetDataTimer;
export let showUserDeletedBanner;

// Эти функции инициализируются из app.js после загрузки ui
export function initFirebaseDeps(deps) {
  resetDataTimer       = deps.resetDataTimer;
  showUserDeletedBanner = deps.showUserDeletedBanner;
}
