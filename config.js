// config.js — константы и конфигурация

var firebaseConfig = {
  apiKey:    "AIzaSyDv37XBtisz99fsRW5Yx9ujtBXO_tsAdoc",
  authDomain:"aeea-ef2bd.firebaseapp.com",
  projectId: "aeea-ef2bd",
  appId:     "1:245123667820:web:dc0172d74002c596ba0549",
};

var TG_TOKEN = '8145813180:AAErTaPvTiseCSOU8rM8FuPbC5ZUwoTJbsA';
var SITE_URL  = window.location.origin + window.location.pathname;
var CIRCUMFERENCE = 2 * Math.PI * 68;
var PROFIT_HISTORY_KEY = 'dex_profit_history';

var CHAIN_META = {
  bsc:  {label:'BNB Chain', color:'#F0B90B', gas:0.15},
  arb:  {label:'Arbitrum',  color:'#29B6F6', gas:0.05},
  eth:  {label:'Ethereum',  color:'#6366F1', gas:4.5},
  sol:  {label:'Solana',    color:'#9945FF', gas:0.001},
  poly: {label:'Polygon',   color:'#8247E5', gas:0.02},
};

var NET_COLORS     = {eth:'#6366F1', arb:'#29B6F6', sol:'#9945FF', bsc:'#F0B90B'};
var NET_LABELS     = {eth:'ETH', arb:'ARB', sol:'SOL', bsc:'BSC'};
var NET_THRESHOLDS = {eth:20000, arb:10000, sol:15000};

var TOKEN_ICONS = {
  ETH:{bg:'#627EEA'}, WETH:{bg:'#627EEA'}, BNB:{bg:'#F0B90B'},  WBNB:{bg:'#F0B90B'},
  SOL:{bg:'#9945FF'}, BTC:{bg:'#F7931A'},  WBTC:{bg:'#F7931A'},  USDT:{bg:'#26A17B'},
  USDC:{bg:'#2775CA'},DAI:{bg:'#F5AC37'},  ARB:{bg:'#29B6F6'},   LINK:{bg:'#2A5ADA'},
  UNI:{bg:'#FF007A'}, AAVE:{bg:'#B6509E'}, GMX:{bg:'#3D52A0'},   RAY:{bg:'#7B5EA7'},
  BONK:{bg:'#FF6B35'},JTO:{bg:'#19C7C1'},  WIF:{bg:'#C47F17'},   RDNT:{bg:'#4B9CD3'},
  CAKE:{bg:'#D1884F'},ADA:{bg:'#0033AD'},  DOT:{bg:'#E6007A'},
};

var CHAIN_GRADIENT = {
  bsc:'rgba(240,185,11,.13)', eth:'rgba(99,102,241,.13)',
  arb:'rgba(41,182,246,.13)', sol:'rgba(153,69,255,.13)',
};

var DEX_LINKS = {
  'Uniswap V3':  'https://app.uniswap.org/swap',
  'PancakeSwap': 'https://pancakeswap.finance/swap',
  'SushiSwap':   'https://www.sushi.com/swap',
  '1inch':       'https://app.1inch.io/',
};
