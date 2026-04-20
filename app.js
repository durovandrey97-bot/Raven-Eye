// ═══ app.js — точка входа, инициализация ═══

import { getFirestore, collection, doc, getDoc, updateDoc,
         onSnapshot, enableNetwork }                                  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { setDb, setCurrentUser, setTrades, setTradesUnsub,
         seenTradeIds, knownIds }                                     from './state.js';
import { showMainApp, showSkeleton, applyTheme, applyProfileLevel,
         showToast, fmtBal, updateConnectionStatus }                  from './ui.js';

// ── Делаем Firebase функции доступными для events.js (updateDoc, doc) ──
window._fbFns = { updateDoc, doc };

// ── Animated BG ──
(function(){
  const canvas = document.getElementById('app-canvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d'); let w, h, particles = [];
  function resize(){ w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  for (let i = 0; i < 38; i++) particles.push({
    x: Math.random()*1400, y: Math.random()*900,
    vx: (Math.random()-.5)*.18, vy: (Math.random()-.5)*.18,
    r: Math.random()*1.5+.5, a: Math.random()*.35+.1,
  });
  function draw(){
    ctx.clearRect(0, 0, w, h);
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.strokeStyle = `rgba(${dark?'255,255,255':'0,0,0'},${dark?.018:.04})`; ctx.lineWidth = .5;
    for (let x = 0; x <= w; x += 44){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 44){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    const pc = dark ? '29,185,84' : '0,120,50';
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${pc},${p.a})`; ctx.fill();
    });
    for (let i = 0; i < particles.length; i++)
      for (let j = i+1; j < particles.length; j++){
        const dx = particles[i].x-particles[j].x, dy = particles[i].y-particles[j].y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 90){
          ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y);
          ctx.lineTo(particles[j].x,particles[j].y);
          ctx.strokeStyle = `rgba(${pc},${.06*(1-d/90)})`; ctx.lineWidth = .5; ctx.stroke();
        }
      }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Тема ──
let currentTheme = localStorage.getItem('dex_theme') || 'dark';
applyTheme(currentTheme);

// ── Login particles на экране входа ──
(function(){
  const wrap = document.querySelector('.login-particles'); if (!wrap) return;
  for (let i = 0; i < 18; i++){
    const p = document.createElement('div'); p.className = 'login-particle';
    p.style.cssText = `left:${Math.random()*100}%;--dur:${6+Math.random()*8}s;--delay:${Math.random()*6}s`;
    wrap.appendChild(p);
  }
})();

// ── Firebase init ──
let db_instance;
try {
  const app  = initializeApp(firebaseConfig);
  db_instance = getFirestore(app);
  setDb(db_instance);
  enableNetwork(db_instance).catch(e => console.error('[RavenEye] enableNetwork:', e));

  // Автологин
  const savedId = localStorage.getItem('dex_user_id');
  if (savedId){
    const inp = document.getElementById('login-inp');
    if (inp) inp.value = savedId;
    setTimeout(() => { window.doLogin && window.doLogin(); }, 400);
  }
} catch(e){ console.error('[RavenEye] Firebase init error:', e); }

// ── doLogin ──
window.doLogin = async function(){
  const raw   = document.getElementById('login-inp').value.trim().toUpperCase();
  const btn   = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const inp   = document.getElementById('login-inp');
  if (!raw)  { errEl.textContent = 'Введите ID'; return; }
  if (!db_instance) { errEl.textContent = 'Ошибка подключения к серверу'; return; }
  btn.disabled = true; btn.textContent = 'Проверка...'; errEl.textContent = '';
  try {
    const snap = await getDoc(doc(db_instance, 'users', raw));
    if (!snap.exists()){
      inp.classList.add('error');
      setTimeout(() => inp.classList.remove('error'), 400);
      errEl.textContent = 'Вы ввели неверный ID. Обратитесь к администратору.';
      btn.disabled = false; btn.textContent = 'ВОЙТИ В СИСТЕМУ';
      return;
    }
    setCurrentUser({id: raw, ...snap.data()});
    localStorage.setItem('dex_user_id', raw);
    btn.classList.add('success'); btn.textContent = '✓ ДОБРО ПОЖАЛОВАТЬ';
    showSkeleton();
    setTimeout(showMainApp, 700);
  } catch(e){
    errEl.textContent = 'Ошибка сервера. Попробуйте ещё раз.';
    btn.disabled = false; btn.textContent = 'ВОЙТИ В СИСТЕМУ';
  }
};

// ── doLogout ──
window.doLogout = function(){
  localStorage.removeItem('dex_user_id');
  setCurrentUser(null); setTrades([]); seenTradeIds.clear(); knownIds.clear();
  document.getElementById('login-screen').style.display  = 'flex';
  document.getElementById('main-app').style.display      = 'none';
  document.getElementById('login-inp').value             = '';
  document.getElementById('login-error').textContent     = '';
  const btn = document.getElementById('login-btn');
  btn.disabled = false; btn.textContent = 'ВОЙТИ В СИСТЕМУ'; btn.classList.remove('success');
};

// ── Offline banner ──
window.addEventListener('online',  () => { document.getElementById('offline-banner')?.classList.remove('show'); updateConnectionStatus('live'); });
window.addEventListener('offline', () => { document.getElementById('offline-banner')?.classList.add('show'); });