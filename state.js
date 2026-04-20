// ═══ state.js — глобальное состояние приложения ═══


// ── Торговые данные ──
var trades       = [];
var selectedId   = null;
var chain        = 'all';
var sortMode     = 'spread';
var sortDir      = 'desc';
var minSpread    = 0;
var minVol       = 0;
var filterDex    = '';
var spreadHistory = {};

// ── Пользователь и Firebase ──
var currentUser  = null;
var db           = null;
var tradesUnsub  = null;

// ── Наборы ID ──
var knownIds       = new Set();
var seenTradeIds   = new Set();
var notifiedFixed  = new Set(JSON.parse(sessionStorage.getItem('dex_notified_fixed') || '[]'));

// ── Таймер ──
var activeTimerTrade = null;
var timerInterval    = null;

// ── Прочее состояние ──
var alertsOn         = true;
var alerts           = [];
var lastDataReceived = Date.now();

// ── Настройки пользователя ──
var hiddenNets   = JSON.parse(localStorage.getItem('dex_hidden_nets')   || '[]');
var profitHistory = JSON.parse(localStorage.getItem(PROFIT_HISTORY_KEY) || '[]');

// ── Сессия ──
var sessionStats = {
  startTime:    Date.now(),
  tradesViewed: 0,
  loginHistory: JSON.parse(sessionStorage.getItem('dex_login_history') || '[]'),
};

// ── История сделок (localStorage, per day) ──
var todayKey    = 'dex_trade_history_' + new Date().toISOString().slice(0, 10);
var tradeHistory = JSON.parse(localStorage.getItem(todayKey) || '[]');

// Чистим старые ключи истории
Object.keys(localStorage)
  .filter(k => k.startsWith('dex_trade_history_') && k !== todayKey)
  .forEach(k => localStorage.removeItem(k));

// ── Сеттеры (нужны т.к. ES-модули экспортируют let через ссылку) ──
function setTrades(v)            { trades = v; }
function setSelectedId(v)        { selectedId = v; }
function setChainFilter(v)       { chain = v; }
function setSortMode(v)          { sortMode = v; }
function setSortDir(v)           { sortDir = v; }
function setMinSpread(v)         { minSpread = v; }
function setMinVol(v)            { minVol = v; }
function setFilterDex(v)         { filterDex = v; }
function setCurrentUser(v)       { currentUser = v; }
function setDb(v)                { db = v; }
function setTradesUnsub(v)       { tradesUnsub = v; }
function setActiveTimerTrade(v)  { activeTimerTrade = v; }
function setTimerInterval(v)     { timerInterval = v; }
function setAlertsOn(v)          { alertsOn = v; }
function setLastDataReceived(v)  { lastDataReceived = v; }
function setHiddenNets(v)        { hiddenNets = v; localStorage.setItem('dex_hidden_nets', JSON.stringify(v)); }
function setProfitHistory(v)     { profitHistory = v; }
function setTradeHistory(v)      { tradeHistory = v; }

// ── Storage helpers ──
function saveProfitEntry(trade, amount) {
  const entry = {
    id:     trade._id,
    pair:   trade.pair   || '—',
    chain:  trade.chain  || '',
    dex:    trade.dex    || '',
    amount: amount,
    spread: trade.hi     || 0,
    time:   Date.now(),
  };
  profitHistory.unshift(entry);
  if (profitHistory.length > 50) profitHistory.pop();
  localStorage.setItem(PROFIT_HISTORY_KEY, JSON.stringify(profitHistory));
}

function addToHistory(t) {
  if (!tradeHistory.find(h => h._id === t._id)) {
    tradeHistory.unshift({...t, expiredAt: Date.now()});
    if (tradeHistory.length > 50) tradeHistory.pop();
    localStorage.setItem(todayKey, JSON.stringify(tradeHistory));
  }
}

function saveBalanceHistory(balance) {
  const key  = 'dex_balance_history';
  const hist = JSON.parse(localStorage.getItem(key) || '[]');
  const last = hist[hist.length - 1];
  if (!last || last.v !== balance) {
    hist.push({v: balance, t: Date.now()});
    if (hist.length > 30) hist.shift();
    localStorage.setItem(key, JSON.stringify(hist));
  }
}

function recordLogin() {
  const now = new Date();
  sessionStats.loginHistory.unshift({
    time: now.toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'}),
    date: now.toLocaleDateString('ru', {day:'numeric', month:'short'}),
  });
  if (sessionStats.loginHistory.length > 8) sessionStats.loginHistory.pop();
  sessionStorage.setItem('dex_login_history', JSON.stringify(sessionStats.loginHistory));
}

function saveAlerts() {
  localStorage.setItem('dex_alerts_' + new Date().toISOString().slice(0,10), JSON.stringify({
    date:   new Date().toISOString().slice(0,10),
    alerts: alerts,
  }));
}

function loadAlerts() {
  try {
    const raw = localStorage.getItem('dex_alerts_' + new Date().toISOString().slice(0,10));
    if (!raw) return;
    const {date, alerts: saved} = JSON.parse(raw);
    if (date === new Date().toISOString().slice(0,10) && saved.length) alerts = saved;
  } catch(e) {}
}