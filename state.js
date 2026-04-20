// ═══ state.js — глобальное состояние приложения ═══

import { PROFIT_HISTORY_KEY } from './config.js';

// ── Торговые данные ──
export let trades       = [];
export let selectedId   = null;
export let chain        = 'all';
export let sortMode     = 'spread';
export let sortDir      = 'desc';
export let minSpread    = 0;
export let minVol       = 0;
export let filterDex    = '';
export let spreadHistory = {};

// ── Пользователь и Firebase ──
export let currentUser  = null;
export let db           = null;
export let tradesUnsub  = null;

// ── Наборы ID ──
export const knownIds       = new Set();
export const seenTradeIds   = new Set();
export const notifiedFixed  = new Set(JSON.parse(sessionStorage.getItem('dex_notified_fixed') || '[]'));

// ── Таймер ──
export let activeTimerTrade = null;
export let timerInterval    = null;

// ── Прочее состояние ──
export let alertsOn         = true;
export let alerts           = [];
export let lastDataReceived = Date.now();

// ── Настройки пользователя ──
export let hiddenNets   = JSON.parse(localStorage.getItem('dex_hidden_nets')   || '[]');
export let profitHistory = JSON.parse(localStorage.getItem(PROFIT_HISTORY_KEY) || '[]');

// ── Сессия ──
export const sessionStats = {
  startTime:    Date.now(),
  tradesViewed: 0,
  loginHistory: JSON.parse(sessionStorage.getItem('dex_login_history') || '[]'),
};

// ── История сделок (localStorage, per day) ──
export const todayKey    = 'dex_trade_history_' + new Date().toISOString().slice(0, 10);
export let   tradeHistory = JSON.parse(localStorage.getItem(todayKey) || '[]');

// Чистим старые ключи истории
Object.keys(localStorage)
  .filter(k => k.startsWith('dex_trade_history_') && k !== todayKey)
  .forEach(k => localStorage.removeItem(k));

// ── Сеттеры (нужны т.к. ES-модули экспортируют let через ссылку) ──
export function setTrades(v)            { trades = v; }
export function setSelectedId(v)        { selectedId = v; }
export function setChainFilter(v)       { chain = v; }
export function setSortMode(v)          { sortMode = v; }
export function setSortDir(v)           { sortDir = v; }
export function setMinSpread(v)         { minSpread = v; }
export function setMinVol(v)            { minVol = v; }
export function setFilterDex(v)         { filterDex = v; }
export function setCurrentUser(v)       { currentUser = v; }
export function setDb(v)                { db = v; }
export function setTradesUnsub(v)       { tradesUnsub = v; }
export function setActiveTimerTrade(v)  { activeTimerTrade = v; }
export function setTimerInterval(v)     { timerInterval = v; }
export function setAlertsOn(v)          { alertsOn = v; }
export function setLastDataReceived(v)  { lastDataReceived = v; }
export function setHiddenNets(v)        { hiddenNets = v; localStorage.setItem('dex_hidden_nets', JSON.stringify(v)); }
export function setProfitHistory(v)     { profitHistory = v; }
export function setTradeHistory(v)      { tradeHistory = v; }

// ── Storage helpers ──
export function saveProfitEntry(trade, amount) {
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

export function addToHistory(t) {
  if (!tradeHistory.find(h => h._id === t._id)) {
    tradeHistory.unshift({...t, expiredAt: Date.now()});
    if (tradeHistory.length > 50) tradeHistory.pop();
    localStorage.setItem(todayKey, JSON.stringify(tradeHistory));
  }
}

export function saveBalanceHistory(balance) {
  const key  = 'dex_balance_history';
  const hist = JSON.parse(localStorage.getItem(key) || '[]');
  const last = hist[hist.length - 1];
  if (!last || last.v !== balance) {
    hist.push({v: balance, t: Date.now()});
    if (hist.length > 30) hist.shift();
    localStorage.setItem(key, JSON.stringify(hist));
  }
}

export function recordLogin() {
  const now = new Date();
  sessionStats.loginHistory.unshift({
    time: now.toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'}),
    date: now.toLocaleDateString('ru', {day:'numeric', month:'short'}),
  });
  if (sessionStats.loginHistory.length > 8) sessionStats.loginHistory.pop();
  sessionStorage.setItem('dex_login_history', JSON.stringify(sessionStats.loginHistory));
}

export function saveAlerts() {
  localStorage.setItem('dex_alerts_' + new Date().toISOString().slice(0,10), JSON.stringify({
    date:   new Date().toISOString().slice(0,10),
    alerts: alerts,
  }));
}

export function loadAlerts() {
  try {
    const raw = localStorage.getItem('dex_alerts_' + new Date().toISOString().slice(0,10));
    if (!raw) return;
    const {date, alerts: saved} = JSON.parse(raw);
    if (date === new Date().toISOString().slice(0,10) && saved.length) alerts = saved;
  } catch(e) {}
}
