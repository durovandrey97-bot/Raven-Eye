// state.js — глобальное состояние

// Торговые данные
var trades        = [];
var selectedId    = null;
var chain         = 'all';
var sortMode      = 'spread';
var sortDir       = 'desc';
var minSpread     = 0;
var minVol        = 0;
var filterDex     = '';
var spreadHistory = {};

// Пользователь и Firebase
var currentUser   = null;
var db            = null;
var tradesUnsub   = null;

// ID наборы
var knownIds      = new Set();
var seenTradeIds  = new Set();
var notifiedFixed = new Set(JSON.parse(sessionStorage.getItem('dex_notified_fixed') || '[]'));

// Таймер
var activeTimerTrade = null;
var timerInterval    = null;

// Прочее
var alertsOn         = true;
var alerts           = [];
var lastDataReceived = Date.now();
var currentTheme     = localStorage.getItem('dex_theme') || 'dark';

// Настройки пользователя
var hiddenNets    = JSON.parse(localStorage.getItem('dex_hidden_nets')    || '[]');
var profitHistory = JSON.parse(localStorage.getItem(PROFIT_HISTORY_KEY)  || '[]');

// История сделок (per day)
var todayKey      = 'dex_trade_history_' + new Date().toISOString().slice(0,10);
var tradeHistory  = JSON.parse(localStorage.getItem(todayKey) || '[]');

// Сессия
var sessionStats = {
  startTime:    Date.now(),
  tradesViewed: 0,
  loginHistory: JSON.parse(sessionStorage.getItem('dex_login_history') || '[]'),
};

// Чистим старые ключи истории
Object.keys(localStorage)
  .filter(function(k){ return k.startsWith('dex_trade_history_') && k !== todayKey; })
  .forEach(function(k){ localStorage.removeItem(k); });

// ── Storage helpers ──
function saveProfitEntry(trade, amount) {
  var entry = {
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
  if (!tradeHistory.find(function(h){ return h._id === t._id; })) {
    tradeHistory.unshift(Object.assign({}, t, {expiredAt: Date.now()}));
    if (tradeHistory.length > 50) tradeHistory.pop();
    localStorage.setItem(todayKey, JSON.stringify(tradeHistory));
  }
}

function saveBalanceHistory(balance) {
  var key  = 'dex_balance_history';
  var hist = JSON.parse(localStorage.getItem(key) || '[]');
  var last = hist[hist.length - 1];
  if (!last || last.v !== balance) {
    hist.push({v: balance, t: Date.now()});
    if (hist.length > 30) hist.shift();
    localStorage.setItem(key, JSON.stringify(hist));
  }
}

function recordLogin() {
  var now = new Date();
  sessionStats.loginHistory.unshift({
    time: now.toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'}),
    date: now.toLocaleDateString('ru', {day:'numeric', month:'short'}),
  });
  if (sessionStats.loginHistory.length > 8) sessionStats.loginHistory.pop();
  sessionStorage.setItem('dex_login_history', JSON.stringify(sessionStats.loginHistory));
}

function saveAlerts() {
  localStorage.setItem('dex_alerts_' + new Date().toISOString().slice(0,10),
    JSON.stringify({date: new Date().toISOString().slice(0,10), alerts: alerts}));
}

function loadAlerts() {
  try {
    var raw = localStorage.getItem('dex_alerts_' + new Date().toISOString().slice(0,10));
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (parsed.date === new Date().toISOString().slice(0,10) && parsed.alerts.length)
      alerts = parsed.alerts;
  } catch(e) {}
}
