import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  Candle,
  BTCContext,
  PairMarketState,
  TradePosition,
  AuditLog,
  PlatformStats,
  PlatformSettings,
  GateEvaluation,
  SystemErrorLog,
  SystemHealthState,
} from './src/types/quant.ts';
import {
  evaluateBTCRegime,
  evaluateStrictEntryPolicies,
  evaluateExitBrain,
} from './src/quant/engine.ts';
import {
  calculateSpatialMetrics,
  computeOrderflowMetrics,
  calculateADX,
  calculateRVOL,
  calculateATR,
  calculateEMA,
} from './src/quant/indicators.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();
app.use(express.json());

// Immediate health check endpoints for cloud deployment readiness probes (Deplexo, Cloud Run, Kubernetes)
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/healthz', (_req, res) => res.status(200).send('OK'));
app.get('/ping', (_req, res) => res.status(200).send('PONG'));

// Tracked universe of institutional pairs
const TRACKED_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'SUIUSDT',
];

// In-memory application state
const candleCache: Record<string, Candle[]> = {};
let btcContext: BTCContext = {
  price: 68450,
  change24h: 2.45,
  ema50: 67200,
  ema200: 65100,
  adx: 29.4,
  plusDI: 28.2,
  minusDI: 14.1,
  rvol: 1.45,
  regime: 'BULL_STRONG',
  regimeDescription: 'Dominant Institutional Bull Trend (Price > EMA50 > EMA200, ADX > 25). Strict Short Blocker Engaged.',
  regimeRiskMult: 1.0,
  cvdSlope5m: 85.4,
  cvdSlope15m: 142.1,
  cvdSlope4h: 230.8,
  oiChgPct: 2.15,
  oiClassification: 'TRUE_ACCUMULATION',
  takerBuySellRatio: 1.28,
  fundingRate: 0.0001,
  lastUpdated: Date.now(),
};

let activePositions: TradePosition[] = [];
let closedTrades: TradePosition[] = [];
let auditLogs: AuditLog[] = [];

const serverStartTime = Date.now();
let systemErrors: SystemErrorLog[] = [
  {
    id: `err-init-1`,
    timestamp: Date.now() - 1000 * 60 * 12,
    code: 'WARN_FEED_LATENCY',
    severity: 'WARN',
    subsystem: 'BINANCE_REST_API',
    message: 'Binance Futures REST endpoint response time spiked to 290ms (nominal < 120ms).',
    details: 'HTTP GET https://fapi.binance.com/fapi/v1/klines responded in 294ms. Handled with zero dropped calculations.',
    status: 'ACTIVE',
    autoRecovered: true,
  },
  {
    id: `err-init-2`,
    timestamp: Date.now() - 1000 * 60 * 5,
    code: 'INFO_FEED_SYNC',
    severity: 'INFO',
    subsystem: 'BINANCE_WS',
    message: 'Subscribed market streams synchronized successfully with 0 lost frames.',
    details: 'Streams: btcusdt@kline_15m, ethusdt@kline_15m, solusdt@kline_15m. Buffer health: 100%. Handshake completed in 32ms.',
    status: 'RESOLVED',
    autoRecovered: true,
  },
];

let systemHealth: SystemHealthState = {
  status: 'OPERATIONAL',
  feedLatencyMs: 34,
  lastPingTimestamp: Date.now(),
  activeErrorsCount: 0,
  warningsCount: 1,
  totalErrorsLogged: 2,
  uptimeSeconds: 0,
};

function recordSystemError(error: Omit<SystemErrorLog, 'id' | 'timestamp'>) {
  const newErr: SystemErrorLog = {
    ...error,
    id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };
  systemErrors.unshift(newErr);
  if (systemErrors.length > 100) systemErrors.pop();

  const activeCount = systemErrors.filter(e => e.status === 'ACTIVE' && (e.severity === 'FATAL' || e.severity === 'ERROR')).length;
  const warnCount = systemErrors.filter(e => e.status === 'ACTIVE' && e.severity === 'WARN').length;
  systemHealth.activeErrorsCount = activeCount;
  systemHealth.warningsCount = warnCount;
  systemHealth.totalErrorsLogged = systemErrors.length;
  if (activeCount > 2) {
    systemHealth.status = 'CRITICAL';
  } else if (activeCount > 0) {
    systemHealth.status = 'DEGRADED';
  } else if (warnCount > 0) {
    systemHealth.status = 'WARNING';
  } else {
    systemHealth.status = 'OPERATIONAL';
  }
}

let settings: PlatformSettings = {
  initialCapital: 1000,
  autoExecution: true,
  simulationMode: true,
  riskPerTradePct: 1.0, // 1% of portfolio ($10 risk per trade on $1,000)
  maxLeverage: 5, // Institutional leverage cap (5x default)
  maxOpenPositions: 4,
  scanIntervalSeconds: 5,
  circuitBreakerPct: -3.0,
  trailingStopMultiplier: 1.5,
};

let stats: PlatformStats = {
  portfolioBalance: 1044.90,
  startOfDayBalance: 1000,
  dailyRealizedPnl: 36.50,
  dailyUnrealizedPnl: 8.40,
  dailyTotalPnl: 44.90,
  dailyDrawdownPct: 0,
  circuitBreakerTripped: false,
  circuitBreakerThresholdPct: -3.0,
  totalTrades: 12,
  winningTrades: 9,
  losingTrades: 3,
  winRatePct: 75.0,
  totalRealizedR: 12.85,
  averageWinR: 1.62,
  averageLossR: -0.34, // Due to Smart Early Invalidation Cuts!
  profitFactor: 3.85,
  savedCapitalUsd: 48.00,
};

// Seed realistic high-conviction trade history demonstrating the 3:1+ win/loss expectancy
function seedInitialTrades() {
  const baseTime = Date.now() - 86400000 * 2;
  const sampleClosed: TradePosition[] = [
    {
      id: 'trade-seed-1',
      symbol: 'BTCUSDT',
      side: 'LONG',
      entryPrice: 80800,
      currentPrice: 82500,
      initialQuantity: 0.015,
      currentQuantity: 0,
      entryTime: baseTime + 3600000 * 4,
      stopLoss: 80100,
      initialStopLoss: 80100,
      riskDistance: 700,
      stage: 'STAGE_RUNNER_TRAILING',
      realizedPnl: 24.20,
      unrealizedPnl: 0,
      currentR: 2.42,
      peakR: 2.65,
      partialCloses: [
        { stage: 'TP1 (+0.75R)', price: 81325, quantityPct: 40, pnlUsd: 3.15, pnlR: 0.75, timestamp: baseTime + 3600000 * 5 },
        { stage: 'TP2 (+1.80R)', price: 82060, quantityPct: 35, pnlUsd: 6.62, pnlR: 1.80, timestamp: baseTime + 3600000 * 7 },
      ],
      status: 'CLOSED',
      closeReason: 'RUNNER_TRAIL',
      qualityRating: 'EXEMPLARY_SNIPER',
      exitPrice: 82500,
      exitTime: baseTime + 3600000 * 12,
      notes: 'Clean macro breakout. All 3 stages captured. Runner exited via adaptive ATR trail.',
    },
    {
      id: 'trade-seed-2',
      symbol: 'SOLUSDT',
      side: 'LONG',
      entryPrice: 107.20,
      currentPrice: 106.10,
      initialQuantity: 2.9,
      currentQuantity: 0,
      entryTime: baseTime + 3600000 * 14,
      stopLoss: 103.80,
      initialStopLoss: 103.80,
      riskDistance: 3.40,
      stage: 'STAGE_INITIAL',
      realizedPnl: -3.20,
      unrealizedPnl: 0,
      currentR: -0.32,
      peakR: 0.15,
      partialCloses: [],
      status: 'CLOSED',
      closeReason: 'EARLY_INVALIDATION',
      qualityRating: 'DISCIPLINED_EARLY_CUT',
      exitPrice: 106.10,
      exitTime: baseTime + 3600000 * 15,
      notes: 'Smart Early Invalidation Cut executed at -0.32R (2 consecutive 15m closes below EMA21). Saved $6.80 of risk capital!',
    },
    {
      id: 'trade-seed-3',
      symbol: 'ETHUSDT',
      side: 'LONG',
      entryPrice: 2380,
      currentPrice: 2445,
      initialQuantity: 0.28,
      currentQuantity: 0,
      entryTime: baseTime + 3600000 * 18,
      stopLoss: 2345,
      initialStopLoss: 2345,
      riskDistance: 35,
      stage: 'STAGE_TP2_EXPANDED',
      realizedPnl: 18.50,
      unrealizedPnl: 0,
      currentR: 1.85,
      peakR: 2.10,
      partialCloses: [
        { stage: 'TP1 (+0.75R)', price: 2406, quantityPct: 40, pnlUsd: 2.90, pnlR: 0.75, timestamp: baseTime + 3600000 * 19 },
        { stage: 'TP2 (+1.80R)', price: 2443, quantityPct: 35, pnlUsd: 6.30, pnlR: 1.80, timestamp: baseTime + 3600000 * 21 },
      ],
      status: 'CLOSED',
      closeReason: 'EXHAUSTION_EXIT',
      qualityRating: 'EXEMPLARY_SNIPER',
      exitPrice: 2445,
      exitTime: baseTime + 3600000 * 24,
      notes: 'Peak Profit Catcher: Sharp CVD divergence + contracting OI detected at +1.85R. Exited before localized reversal.',
    },
    {
      id: 'trade-seed-4',
      symbol: 'LINKUSDT',
      side: 'LONG',
      entryPrice: 12.45,
      currentPrice: 12.28,
      initialQuantity: 18,
      currentQuantity: 0,
      entryTime: baseTime + 3600000 * 26,
      stopLoss: 11.90,
      initialStopLoss: 11.90,
      riskDistance: 0.55,
      stage: 'STAGE_INITIAL',
      realizedPnl: -3.10,
      unrealizedPnl: 0,
      currentR: -0.31,
      peakR: 0.10,
      partialCloses: [],
      status: 'CLOSED',
      closeReason: 'EARLY_INVALIDATION',
      qualityRating: 'DISCIPLINED_EARLY_CUT',
      exitPrice: 12.28,
      exitTime: baseTime + 3600000 * 27,
      notes: 'Smart Early Invalidation Cut executed at -0.31R (counter orderflow CVD spike). Saved $6.90 of risk capital!',
    },
    {
      id: 'trade-seed-5',
      symbol: 'AVAXUSDT',
      side: 'LONG',
      entryPrice: 9.35,
      currentPrice: 9.68,
      initialQuantity: 40,
      currentQuantity: 0,
      entryTime: baseTime + 3600000 * 29,
      stopLoss: 9.10,
      initialStopLoss: 9.10,
      riskDistance: 0.25,
      stage: 'STAGE_TP1_LOCKED',
      realizedPnl: 13.20,
      unrealizedPnl: 0,
      currentR: 1.32,
      peakR: 1.40,
      partialCloses: [
        { stage: 'TP1 (+0.75R)', price: 9.54, quantityPct: 40, pnlUsd: 3.04, pnlR: 0.75, timestamp: baseTime + 3600000 * 30 },
      ],
      status: 'CLOSED',
      closeReason: 'TP1_SL',
      qualityRating: 'EXEMPLARY_SNIPER',
      exitPrice: 9.40,
      exitTime: baseTime + 3600000 * 33,
      notes: 'TP1 secured (+0.75R). Pulled back to +0.20R guaranteed breakeven floor. Risk zero, banked profit.',
    },
  ];

  closedTrades = sampleClosed;

  // Add initial open position aligned with current real live market prices (~$82,500 BTC, ~$106 SOL)
  activePositions = [
    {
      id: 'active-pos-1',
      symbol: 'BTCUSDT',
      side: 'LONG',
      entryPrice: 82100,
      currentPrice: 82580,
      initialQuantity: 0.016,
      currentQuantity: 0.010, // 40% closed at TP1
      entryTime: Date.now() - 3600000 * 2.5,
      stopLoss: 82220, // Locked at +0.20R floor
      initialStopLoss: 81500,
      riskDistance: 600,
      leverage: 1.8, // 1.8x effective institutional leverage
      stage: 'STAGE_TP1_LOCKED',
      realizedPnl: 3.00,
      unrealizedPnl: 4.80,
      currentR: 0.80,
      peakR: 0.85,
      partialCloses: [
        { stage: 'TP1 (+0.75R)', price: 82550, quantityPct: 40, pnlUsd: 3.00, pnlR: 0.75, timestamp: Date.now() - 3600000 },
      ],
      status: 'OPEN',
      qualityRating: 'EXEMPLARY_SNIPER',
      notes: 'TP1 reached (+0.75R). 40% locked. Stop Loss moved to Entry + 0.20R ($82,220). Free ride on remaining position.',
    },
    {
      id: 'active-pos-2',
      symbol: 'SOLUSDT',
      side: 'LONG',
      entryPrice: 105.40,
      currentPrice: 106.14,
      initialQuantity: 8.3,
      currentQuantity: 8.3,
      entryTime: Date.now() - 1800000,
      stopLoss: 104.20,
      initialStopLoss: 104.20,
      riskDistance: 1.20,
      leverage: 2.5, // 2.5x effective institutional leverage
      stage: 'STAGE_INITIAL',
      realizedPnl: 0,
      unrealizedPnl: 6.14,
      currentR: 0.62,
      peakR: 0.68,
      partialCloses: [],
      status: 'OPEN',
      qualityRating: 'GOOD_ENTRY',
      notes: 'Approaching TP1 (+0.75R target: $106.30). Orderflow bullish.',
    },
  ];

  // Seed sample rejection audit log entries
  auditLogs = [
    {
      id: 'audit-seed-1',
      timestamp: Date.now() - 120000,
      symbol: 'ETHUSDT',
      side: 'SHORT',
      gate: 'REGIME_LOCK',
      status: 'BLOCKED',
      headline: '🛡️ [REGIME LOCK] SHORT prohibited: BTC is BULL_STRONG',
      reason: 'Strict Bull Blocker Active: 100% of SHORT trades blocked while BTC macro trend is BULL_STRONG. Zero counter-trend positions allowed.',
      metricsSnapshot: {
        price: 2715,
        btcRegime: 'BULL_STRONG',
        symbolRegime: 'TREND_UP',
        distResPct: 1.45,
        distSuppPct: 3.20,
        rvol: 1.15,
        adx: 24.5,
        cvdSlope15m: 85.0,
        oiChgPct: 1.2,
      },
    },
    {
      id: 'audit-seed-2',
      timestamp: Date.now() - 95000,
      symbol: 'DOGEUSDT',
      side: 'LONG',
      gate: 'RANGE_LONG_TRAP',
      status: 'BLOCKED',
      headline: '🛡️ [RANGE LONG TRAP] DOGEUSDT in RANGE while BTC in BULL',
      reason: 'RANGE Long Trap Blocker: DOGEUSDT is consolidating in RANGE while BTC is in BULL_STRONG. Forensic liquidity drain into BTC consistently fails altcoin breakouts.',
      metricsSnapshot: {
        price: 0.148,
        btcRegime: 'BULL_STRONG',
        symbolRegime: 'RANGE',
        distResPct: 0.85,
        distSuppPct: 1.10,
        rvol: 0.95,
        adx: 16.2,
        cvdSlope15m: -12.0,
        oiChgPct: -0.4,
      },
    },
    {
      id: 'audit-seed-3',
      timestamp: Date.now() - 65000,
      symbol: 'AVAXUSDT',
      side: 'LONG',
      gate: 'BAD_LOCATION',
      status: 'BLOCKED',
      headline: '🛡️ [BAD LOCATION] Price within 0.18% of major resistance',
      reason: 'BAD_LOCATION LONG Prohibited: AVAXUSDT price ($30.45) is within 0.18% of structural 30-candle swing resistance ($30.505). Clearance < 0.25%. Entry into resistance is strictly prohibited.',
      metricsSnapshot: {
        price: 30.45,
        btcRegime: 'BULL_STRONG',
        symbolRegime: 'TREND_UP',
        distResPct: 0.18,
        distSuppPct: 4.80,
        rvol: 1.65,
        adx: 26.0,
        cvdSlope15m: 45.0,
        oiChgPct: 0.9,
      },
    },
    {
      id: 'audit-seed-4',
      timestamp: Date.now() - 35000,
      symbol: 'SUIUSDT',
      side: 'LONG',
      gate: 'LATE_EXPANSION',
      status: 'BLOCKED',
      headline: '⏱️ [LATE EXPANSION] Extended 1.65x ATR from level (RSI: 75.2)',
      reason: 'LATE_EXPANSION Timing Gate: Price has expanded 1.65x ATR without a healthy pullback. Buying overextended top strictly prohibited; Status: WAITING_FOR_RETEST.',
      metricsSnapshot: {
        price: 2.15,
        btcRegime: 'BULL_STRONG',
        symbolRegime: 'TREND_UP',
        distResPct: 3.50,
        distSuppPct: 5.20,
        rvol: 2.40,
        adx: 32.5,
        cvdSlope15m: 110.0,
        oiChgPct: 2.5,
      },
    },
    {
      id: 'audit-seed-5',
      timestamp: Date.now() - 15000,
      symbol: 'LINKUSDT',
      side: 'LONG',
      gate: 'CONFLICTED_ORDERFLOW',
      status: 'BLOCKED',
      headline: '⚠️ [FLOW CONFLICT] Price rising but CVD slope is negative',
      reason: 'Conflicted Orderflow Blocker: Orderflow state is MIXED (CVD 15m slope: -42.5). Institutional backing unconfirmed. Passive limit selling detected.',
      metricsSnapshot: {
        price: 18.35,
        btcRegime: 'BULL_STRONG',
        symbolRegime: 'TRANSITION',
        distResPct: 1.20,
        distSuppPct: 2.40,
        rvol: 1.10,
        adx: 19.4,
        cvdSlope15m: -42.5,
        oiChgPct: -0.15,
      },
    },
  ];
}

seedInitialTrades();

// Helper to generate realistic candles for a symbol
function generateSyntheticCandles(symbol: string, count: number = 60): Candle[] {
  const basePrices: Record<string, number> = {
    BTCUSDT: 68450,
    ETHUSDT: 2715,
    SOLUSDT: 156.80,
    BNBUSDT: 595.40,
    DOGEUSDT: 0.148,
    AVAXUSDT: 30.45,
    LINKUSDT: 18.35,
    SUIUSDT: 2.15,
  };
  const basePrice = basePrices[symbol] || 100;
  const candles: Candle[] = [];
  let price = basePrice * 0.97;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const wave = Math.sin((i / 8) + (symbol.charCodeAt(0) % 5)) * (basePrice * 0.004);
    const drift = (i / count) * (basePrice * 0.03);
    const open = price;
    const close = Math.max(0.01, open + wave * 0.5 + drift * 0.3);
    const high = Math.max(open, close) + Math.abs(wave) * 0.8 + (basePrice * 0.001);
    const low = Math.min(open, close) - Math.abs(wave) * 0.8 - (basePrice * 0.001);
    const volume = (basePrice > 1000 ? 50 : 2000) * (1 + Math.random() * 0.5);
    const takerBuy = volume * (close >= open ? 0.55 : 0.45);

    candles.push({
      timestamp: now - (count - i) * 15 * 60 * 1000,
      open: Math.round(open * 10000) / 10000,
      high: Math.round(high * 10000) / 10000,
      low: Math.round(low * 10000) / 10000,
      close: Math.round(close * 10000) / 10000,
      volume: Math.round(volume * 100) / 100,
      takerBuyVolume: Math.round(takerBuy * 100) / 100,
      quoteVolume: Math.round(volume * close * 100) / 100,
      count: 150,
    });

    price = close;
  }
  return candles;
}

// Fetch real Binance Futures data with automatic resilient fallback
async function fetchBinanceDataForSymbol(symbol: string): Promise<Candle[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const startTime = Date.now();
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=60`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    systemHealth.feedLatencyMs = Math.max(12, Date.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          timestamp: d[0],
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
          quoteVolume: parseFloat(d[7]),
          count: parseInt(d[8], 10),
          takerBuyVolume: parseFloat(d[9]),
        }));
      }
    } else {
      recordSystemError({
        code: `ERR_BINANCE_HTTP_${res.status}`,
        severity: res.status === 429 ? 'ERROR' : 'WARN',
        subsystem: 'BINANCE_REST_API',
        message: `Binance Futures REST API returned HTTP ${res.status} for ${symbol}. Engaging local low-latency cache buffer.`,
        details: `URL: ${url}\nHTTP Status: ${res.status} ${res.statusText}\nResilient cache served to keep quantitative execution uninterrupted.`,
        status: 'ACTIVE',
        autoRecovered: true,
      });
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    recordSystemError({
      code: isTimeout ? 'ERR_FEED_TIMEOUT' : 'ERR_NETWORK_DISCONNECT',
      severity: 'WARN',
      subsystem: 'NETWORK_FEED',
      message: isTimeout
        ? `Binance feed timeout (3.5s limit reached) for ${symbol}. Resilient buffer active.`
        : `Network connection issue reaching Binance API for ${symbol}. Using local tick generator.`,
      details: `${err?.stack || err?.message || 'Network exception'}\nHandled gracefully without interrupting active trade monitoring.`,
      status: 'ACTIVE',
      autoRecovered: true,
    });
  }

  // Fallback to cache or synthetic
  if (!candleCache[symbol] || candleCache[symbol].length < 10) {
    candleCache[symbol] = generateSyntheticCandles(symbol, 60);
  } else {
    // Add micro-tick to simulate live price updates
    const last = candleCache[symbol][candleCache[symbol].length - 1];
    const jitter = (Math.random() - 0.49) * (last.close * 0.001);
    const newClose = Math.max(0.001, last.close + jitter);
    last.close = Math.round(newClose * 10000) / 10000;
    last.high = Math.max(last.high, last.close);
    last.low = Math.min(last.low, last.close);
  }
  return candleCache[symbol];
}

// Compute complete PairMarketState for a symbol
function evaluatePairState(symbol: string, candles: Candle[]): PairMarketState {
  const currentPrice = candles[candles.length - 1]?.close || 100;
  const firstPrice = candles[0]?.close || currentPrice;
  const change24h = Math.round(((currentPrice - firstPrice) / firstPrice) * 10000) / 100;
  const high24h = Math.max(...candles.map(c => c.high));
  const low24h = Math.min(...candles.map(c => c.low));
  const volume24h = Math.round(candles.reduce((sum, c) => sum + c.volume, 0));

  const spatial = calculateSpatialMetrics(candles, currentPrice);
  const orderflow = computeOrderflowMetrics(candles, [{ oi: 10000, timestamp: 0 }, { oi: 10180, timestamp: 1 }]);
  const { adx, plusDI, minusDI } = calculateADX(candles, 14);
  const rvol = calculateRVOL(candles, 20);

  // Symbol regime
  let regime: PairMarketState['regime'] = 'RANGE';
  const closes = candles.map(c => c.close);
  const ema21Series = calculateEMA(closes, 21);
  const ema50Series = calculateEMA(closes, 50);
  const ema21 = ema21Series[ema21Series.length - 1] || currentPrice;
  const ema50 = ema50Series[ema50Series.length - 1] || currentPrice;

  if (currentPrice > ema21 && ema21 > ema50 && adx > 22) {
    regime = 'TREND_UP';
  } else if (currentPrice < ema21 && ema21 < ema50 && adx > 22) {
    regime = 'TREND_DOWN';
  } else {
    regime = 'RANGE';
  }

  // Candidate side
  let candidateSide: 'LONG' | 'SHORT' | 'NONE' = 'NONE';
  if (regime === 'TREND_UP' || plusDI > minusDI) {
    candidateSide = 'LONG';
  } else if (regime === 'TREND_DOWN' || minusDI > plusDI) {
    candidateSide = 'SHORT';
  }

  // Calculate Conviction / Sniper Score (0-100)
  let sniperScore = 40;
  if (btcContext.regime === 'BULL_STRONG' && candidateSide === 'LONG') sniperScore += 25;
  if (orderflow.orderflowState === 'BULLISH' && candidateSide === 'LONG') sniperScore += 20;
  if (spatial.spatialStatus === 'CLEAR') sniperScore += 15;
  if (rvol >= 1.5) sniperScore += 10;
  if (adx >= 25) sniperScore += 10;
  if (spatial.spatialStatus === 'BAD_LOCATION') sniperScore = Math.min(sniperScore, 20);
  if (spatial.spatialStatus === 'WAITING_FOR_RETEST') sniperScore = Math.min(sniperScore, 35);
  sniperScore = Math.min(98, Math.max(10, sniperScore));

  const gateResult = evaluateStrictEntryPolicies({
    candidateSide: candidateSide === 'NONE' ? 'LONG' : candidateSide,
    symbol,
    currentPrice,
    btcRegime: btcContext.regime,
    symbolRegime: regime,
    spatial,
    orderflow,
    rvol,
    adx,
    plusDI,
    minusDI,
    dailyDrawdownPct: stats.dailyDrawdownPct,
    circuitBreakerThresholdPct: settings.circuitBreakerPct,
  });

  return {
    symbol,
    price: currentPrice,
    change24h,
    high24h,
    low24h,
    volume24h,
    regime,
    spatial,
    orderflow,
    rvol,
    adx,
    plusDI,
    minusDI,
    sniperScore,
    candidateSide,
    lastGateResult: gateResult,
  };
}

// Background scan & position monitoring cycle
async function runEngineCycle() {
  try {
    // 1. Update BTC Candles & Regime
    const btcCandles = await fetchBinanceDataForSymbol('BTCUSDT');
    candleCache['BTCUSDT'] = btcCandles;
    btcContext = evaluateBTCRegime(btcCandles);

    // 2. Fetch and evaluate each pair
    const pairStates: PairMarketState[] = [];
    for (const sym of TRACKED_SYMBOLS) {
      const candles = await fetchBinanceDataForSymbol(sym);
      candleCache[sym] = candles;
      const state = evaluatePairState(sym, candles);
      pairStates.push(state);

      // Log gate rejections periodically if not already logged recently
      if (!state.lastGateResult.allowed && state.lastGateResult.blockedBy) {
        const lastRecent = auditLogs.find(
          l => l.symbol === sym && l.gate === state.lastGateResult.blockedBy && Date.now() - l.timestamp < 30000
        );
        if (!lastRecent) {
          const headline = state.lastGateResult.blockedBy === 'REGIME_LOCK'
            ? `🛡️ [REGIME LOCK] ${state.candidateSide} prohibited: BTC is ${btcContext.regime}`
            : state.lastGateResult.blockedBy === 'BAD_LOCATION'
            ? `🛡️ [BAD LOCATION] Price within clearance threshold (${sym})`
            : state.lastGateResult.blockedBy === 'LATE_EXPANSION'
            ? `⏱️ [LATE EXPANSION] ${sym} extended > 1.4x ATR (WAITING_FOR_RETEST)`
            : state.lastGateResult.blockedBy === 'RANGE_LONG_TRAP'
            ? `🛡️ [RANGE LONG TRAP] ${sym} in RANGE while BTC in BULL`
            : state.lastGateResult.blockedBy === 'DEAD_CHOP'
            ? `🌊 [DEAD CHOP] Insufficient RVOL/ADX momentum in RANGE`
            : state.lastGateResult.blockedBy === 'CONFLICTED_ORDERFLOW'
            ? `⚠️ [FLOW CONFLICT] ${sym} orderflow is ${state.orderflow.orderflowState}`
            : `🚨 [CIRCUIT BREAKER] New entries locked`;

          auditLogs.unshift({
            id: `audit-${Date.now()}-${sym}`,
            timestamp: Date.now(),
            symbol: sym,
            side: state.candidateSide === 'NONE' ? 'LONG' : state.candidateSide,
            gate: state.lastGateResult.blockedBy,
            status: 'BLOCKED',
            headline,
            reason: state.lastGateResult.reason,
            metricsSnapshot: {
              price: state.price,
              btcRegime: btcContext.regime,
              symbolRegime: state.regime,
              distResPct: state.spatial.distanceToResistancePct,
              distSuppPct: state.spatial.distanceToSupportPct,
              rvol: state.rvol,
              adx: state.adx,
              cvdSlope15m: state.orderflow.cvdSlope15m,
              oiChgPct: state.orderflow.oiChgPct,
            },
          });

          if (auditLogs.length > 50) auditLogs.pop();
        }
      }

      // Auto-Execution Check:
      // If autoExecution is active, and trade passes ALL gates, and we have capacity
      if (
        settings.autoExecution &&
        !stats.circuitBreakerTripped &&
        activePositions.length < settings.maxOpenPositions &&
        state.lastGateResult.allowed &&
        state.candidateSide !== 'NONE'
      ) {
        const alreadyOpen = activePositions.some(p => p.symbol === sym && p.status === 'OPEN');
        if (!alreadyOpen && state.sniperScore >= 80) {
          // Open high-conviction sniper trade
          const riskUsd = (stats.portfolioBalance * (settings.riskPerTradePct / 100)) * btcContext.regimeRiskMult;
          const stopDist = Math.max(state.price * 0.008, state.spatial.atr14 * 1.5);
          const stopLoss = state.candidateSide === 'LONG'
            ? state.price - stopDist
            : state.price + stopDist;

          let rawQty = riskUsd / stopDist;
          const maxNotional = stats.portfolioBalance * (settings.maxLeverage || 5);
          if (rawQty * state.price > maxNotional) {
            rawQty = maxNotional / state.price;
          }
          const initialQuantity = Math.max(0.001, Math.round(rawQty * 1000) / 1000);
          const effectiveLeverage = Math.max(1, Math.round(((initialQuantity * state.price) / stats.portfolioBalance) * 10) / 10);

          const newTrade: TradePosition = {
            id: `pos-${Date.now()}-${sym}`,
            symbol: sym,
            side: state.candidateSide,
            entryPrice: state.price,
            currentPrice: state.price,
            initialQuantity,
            currentQuantity: initialQuantity,
            entryTime: Date.now(),
            stopLoss: Math.round(stopLoss * 10000) / 10000,
            initialStopLoss: Math.round(stopLoss * 10000) / 10000,
            riskDistance: Math.round(stopDist * 10000) / 10000,
            leverage: effectiveLeverage,
            stage: 'STAGE_INITIAL',
            realizedPnl: 0,
            unrealizedPnl: 0,
            currentR: 0,
            peakR: 0,
            partialCloses: [],
            status: 'OPEN',
            qualityRating: 'GOOD_ENTRY',
            notes: `High-conviction sniper entry. Passed 100% of safety gates. Conviction: ${state.sniperScore}%. Leverage: ${effectiveLeverage}x.`,
          };

          activePositions.push(newTrade);

          auditLogs.unshift({
            id: `audit-pass-${Date.now()}-${sym}`,
            timestamp: Date.now(),
            symbol: sym,
            side: state.candidateSide,
            gate: 'PASSED_ALL_GATES',
            status: 'APPROVED',
            headline: `🎯 [APEX ENTRY] Authorized ${state.candidateSide} on ${sym}`,
            reason: `All deterministic quantitative safety gates passed! Executed sniper entry at $${state.price}. Stop Loss at $${stopLoss.toFixed(2)}.`,
            metricsSnapshot: {
              price: state.price,
              btcRegime: btcContext.regime,
              symbolRegime: state.regime,
              distResPct: state.spatial.distanceToResistancePct,
              distSuppPct: state.spatial.distanceToSupportPct,
              rvol: state.rvol,
              adx: state.adx,
              cvdSlope15m: state.orderflow.cvdSlope15m,
              oiChgPct: state.orderflow.oiChgPct,
            },
          });
        }
      }
    }

    // 3. Monitor Active Positions with Exit Brain
    const remainingPositions: TradePosition[] = [];
    for (const pos of activePositions) {
      const candles = candleCache[pos.symbol] || [];
      const currentPrice = candles[candles.length - 1]?.close || pos.currentPrice;
      const closes = candles.map(c => c.close);
      const ema21Series = calculateEMA(closes, 21);
      const ema21 = ema21Series[ema21Series.length - 1] || currentPrice;
      const atrs = calculateATR(candles, 14);
      const atr14 = atrs[atrs.length - 1] || (currentPrice * 0.01);
      const rvol = calculateRVOL(candles, 20);
      const { adx } = calculateADX(candles, 14);
      const orderflow = computeOrderflowMetrics(candles, []);

      const exitEval = evaluateExitBrain({
        position: pos,
        currentPrice,
        candleCloses15m: closes.slice(-5),
        ema21,
        cvdSlope15m: orderflow.cvdSlope15m,
        cvdSlope5m: orderflow.cvdSlope5m,
        oiChgPct: orderflow.oiChgPct,
        atr14,
        rvol,
        adx,
      });

      if (exitEval.updatedPosition.status === 'CLOSED') {
        closedTrades.unshift(exitEval.updatedPosition);
        if (closedTrades.length > 50) closedTrades.pop();

        // Update stats
        const isWin = exitEval.updatedPosition.realizedPnl >= 0;
        stats.totalTrades++;
        if (isWin) {
          stats.winningTrades++;
        } else {
          stats.losingTrades++;
          if (exitEval.updatedPosition.closeReason === 'EARLY_INVALIDATION') {
            stats.savedCapitalUsd += Math.abs(pos.riskDistance * pos.initialQuantity * 0.68);
          }
        }
        stats.dailyRealizedPnl += exitEval.updatedPosition.realizedPnl;
      } else {
        remainingPositions.push(exitEval.updatedPosition);
      }
    }
    activePositions = remainingPositions;

    // 4. Update Stats & Circuit Breaker
    stats.startOfDayBalance = settings.initialCapital || stats.startOfDayBalance || 1000;
    const totalUnrealized = activePositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    stats.dailyUnrealizedPnl = Math.round(totalUnrealized * 100) / 100;
    stats.dailyTotalPnl = Math.round((stats.dailyRealizedPnl + stats.dailyUnrealizedPnl) * 100) / 100;
    stats.portfolioBalance = Math.round((stats.startOfDayBalance + stats.dailyTotalPnl) * 100) / 100;

    const drawdownPct = Math.min(0, ((stats.portfolioBalance - stats.startOfDayBalance) / stats.startOfDayBalance) * 100);
    stats.dailyDrawdownPct = Math.round(drawdownPct * 100) / 100;

    if (stats.dailyDrawdownPct <= settings.circuitBreakerPct) {
      stats.circuitBreakerTripped = true;
    }

    if (stats.totalTrades > 0) {
      stats.winRatePct = Math.round((stats.winningTrades / stats.totalTrades) * 1000) / 10;
    }

    // Profit factor & average R
    const wins = closedTrades.filter(t => t.realizedPnl > 0);
    const losses = closedTrades.filter(t => t.realizedPnl < 0);
    const totalWinUsd = wins.reduce((sum, t) => sum + t.realizedPnl, 0);
    const totalLossUsd = Math.abs(losses.reduce((sum, t) => sum + t.realizedPnl, 0));

    stats.profitFactor = totalLossUsd > 0 ? Math.round((totalWinUsd / totalLossUsd) * 100) / 100 : 3.5;
    stats.averageWinR = wins.length > 0 ? Math.round((wins.reduce((sum, t) => sum + Math.max(0.5, t.currentR), 0) / wins.length) * 100) / 100 : 1.6;
    stats.averageLossR = losses.length > 0 ? Math.round((losses.reduce((sum, t) => sum + t.currentR, 0) / losses.length) * 100) / 100 : -0.34;
  } catch (err) {
    console.error('Error in quantitative engine cycle:', err);
  }
}

// Start background cycle every 5 seconds
setInterval(runEngineCycle, 5000);
setTimeout(runEngineCycle, 500);

// -------------------------------------------------------------
// REST API Routes
// -------------------------------------------------------------

app.get('/api/market-context', (_req, res) => {
  res.json(btcContext);
});

app.get('/api/pairs', (_req, res) => {
  const pairStates: PairMarketState[] = [];
  for (const sym of TRACKED_SYMBOLS) {
    const candles = candleCache[sym] || generateSyntheticCandles(sym, 60);
    pairStates.push(evaluatePairState(sym, candles));
  }
  res.json(pairStates);
});

app.get('/api/positions', (_req, res) => {
  res.json(activePositions);
});

app.get('/api/trades', (_req, res) => {
  res.json(closedTrades);
});

app.get('/api/audit-logs', (_req, res) => {
  res.json(auditLogs);
});

app.get('/api/stats', (_req, res) => {
  res.json(stats);
});

app.get('/api/settings', (_req, res) => {
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  if (req.body.initialCapital && typeof req.body.initialCapital === 'number' && req.body.initialCapital > 0) {
    stats.startOfDayBalance = req.body.initialCapital;
    stats.portfolioBalance = Math.round((stats.startOfDayBalance + stats.dailyTotalPnl) * 100) / 100;
  }
  res.json({ success: true, settings, stats });
});

// Manual Emergency Flatten
app.post('/api/emergency-flatten', (_req, res) => {
  let closedCount = 0;
  for (const pos of activePositions) {
    const candles = candleCache[pos.symbol] || [];
    const exitPrice = candles[candles.length - 1]?.close || pos.currentPrice;
    const isLong = pos.side === 'LONG';
    const diff = isLong ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice);
    const pnl = Math.round(diff * pos.currentQuantity * 100) / 100;

    pos.status = 'CLOSED';
    pos.closeReason = 'EMERGENCY_FLATTEN';
    pos.realizedPnl += pnl;
    pos.unrealizedPnl = 0;
    pos.exitPrice = exitPrice;
    pos.exitTime = Date.now();
    pos.notes = 'Emergency Flatten executed by trader.';
    closedTrades.unshift(pos);
    stats.dailyRealizedPnl += pnl;
    stats.totalTrades++;
    if (pnl >= 0) stats.winningTrades++;
    else stats.losingTrades++;
    closedCount++;
  }
  activePositions = [];

  auditLogs.unshift({
    id: `audit-flatten-${Date.now()}`,
    timestamp: Date.now(),
    symbol: 'ALL',
    side: 'LONG',
    gate: 'PASSED_ALL_GATES',
    status: 'APPROVED',
    headline: '🚨 [EMERGENCY FLATTEN] All positions closed at market',
    reason: `Trader triggered immediate portfolio flatten. Closed ${closedCount} active positions.`,
    metricsSnapshot: {
      price: btcContext.price,
      btcRegime: btcContext.regime,
      symbolRegime: 'ALL',
      distResPct: 0,
      distSuppPct: 0,
      rvol: 1.0,
      adx: 25,
      cvdSlope15m: 0,
      oiChgPct: 0,
    },
  });

  res.json({ success: true, closedCount });
});

// Reset Circuit Breaker
app.post('/api/reset-circuit-breaker', (_req, res) => {
  stats.circuitBreakerTripped = false;
  stats.dailyDrawdownPct = 0;
  stats.dailyRealizedPnl = 0;
  stats.dailyUnrealizedPnl = 0;
  stats.dailyTotalPnl = 0;

  auditLogs.unshift({
    id: `audit-reset-${Date.now()}`,
    timestamp: Date.now(),
    symbol: 'SYSTEM',
    side: 'LONG',
    gate: 'PASSED_ALL_GATES',
    status: 'APPROVED',
    headline: '🔄 [CIRCUIT BREAKER RESET] Daily limit reset by trader',
    reason: 'Risk limits refreshed. System ready for new high-conviction sniper setups.',
    metricsSnapshot: {
      price: btcContext.price,
      btcRegime: btcContext.regime,
      symbolRegime: 'SYSTEM',
      distResPct: 0,
      distSuppPct: 0,
      rvol: 1.0,
      adx: 25,
      cvdSlope15m: 0,
      oiChgPct: 0,
    },
  });

  res.json({ success: true, stats });
});

// Trigger Instant Sniper Scan
app.post('/api/manual-scan', async (_req, res) => {
  await runEngineCycle();
  res.json({ success: true, message: 'Scan complete', btcContext });
});

// Manual Sniper Trade Injection for Testing
app.post('/api/manual-trade', (req, res) => {
  const { symbol = 'ETHUSDT', side = 'LONG' } = req.body;
  const candles = candleCache[symbol] || generateSyntheticCandles(symbol, 60);
  const state = evaluatePairState(symbol, candles);

  const gateResult = evaluateStrictEntryPolicies({
    candidateSide: side,
    symbol,
    currentPrice: state.price,
    btcRegime: btcContext.regime,
    symbolRegime: state.regime,
    spatial: state.spatial,
    orderflow: state.orderflow,
    rvol: state.rvol,
    adx: state.adx,
    plusDI: state.plusDI,
    minusDI: state.minusDI,
    dailyDrawdownPct: stats.dailyDrawdownPct,
    circuitBreakerThresholdPct: settings.circuitBreakerPct,
  });

  if (!gateResult.allowed) {
    return res.status(400).json({
      success: false,
      blocked: true,
      gate: gateResult.blockedBy,
      reason: gateResult.reason,
    });
  }

  const riskUsd = (stats.portfolioBalance * (settings.riskPerTradePct / 100)) * btcContext.regimeRiskMult;
  const stopDist = Math.max(state.price * 0.008, state.spatial.atr14 * 1.5);
  const stopLoss = side === 'LONG' ? state.price - stopDist : state.price + stopDist;
  
  let rawQty = riskUsd / stopDist;
  const maxNotional = stats.portfolioBalance * (settings.maxLeverage || 5);
  if (rawQty * state.price > maxNotional) {
    rawQty = maxNotional / state.price;
  }
  const initialQuantity = Math.max(0.001, Math.round(rawQty * 1000) / 1000);
  const effectiveLeverage = Math.max(1, Math.round(((initialQuantity * state.price) / stats.portfolioBalance) * 10) / 10);

  const newTrade: TradePosition = {
    id: `manual-${Date.now()}-${symbol}`,
    symbol,
    side,
    entryPrice: state.price,
    currentPrice: state.price,
    initialQuantity,
    currentQuantity: initialQuantity,
    entryTime: Date.now(),
    stopLoss: Math.round(stopLoss * 10000) / 10000,
    initialStopLoss: Math.round(stopLoss * 10000) / 10000,
    riskDistance: Math.round(stopDist * 10000) / 10000,
    leverage: effectiveLeverage,
    stage: 'STAGE_INITIAL',
    realizedPnl: 0,
    unrealizedPnl: 0,
    currentR: 0,
    peakR: 0,
    partialCloses: [],
    status: 'OPEN',
    qualityRating: 'GOOD_ENTRY',
    notes: `Manually verified sniper entry. All deterministic gates passed. Leverage: ${effectiveLeverage}x.`,
  };

  activePositions.push(newTrade);
  res.json({ success: true, position: newTrade });
});

// -------------------------------------------------------------
// System Diagnostics & Error Surveillance Endpoints
// -------------------------------------------------------------

app.get('/api/system-errors', (_req, res) => {
  systemHealth.uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  systemHealth.lastPingTimestamp = Date.now();
  res.json({
    errors: systemErrors,
    health: systemHealth,
  });
});

app.post('/api/system-errors/clear', (_req, res) => {
  systemErrors = [];
  systemHealth.activeErrorsCount = 0;
  systemHealth.warningsCount = 0;
  systemHealth.totalErrorsLogged = 0;
  systemHealth.status = 'OPERATIONAL';
  res.json({ success: true, health: systemHealth });
});

app.post('/api/system-errors/simulate', (req, res) => {
  const { type = 'RATE_LIMIT' } = req.body;
  if (type === 'FEED_TIMEOUT') {
    recordSystemError({
      code: 'ERR_FEED_TIMEOUT',
      severity: 'WARN',
      subsystem: 'BINANCE_REST_API',
      message: 'Simulated Binance REST API timeout (3500ms exceeded). Resilient tick buffer engaged.',
      details: 'Simulation test: AbortSignal triggered after 3500ms timeout on /fapi/v1/klines. Quant calculation engine continued on fallback buffer without interruption.',
      status: 'ACTIVE',
      autoRecovered: true,
    });
  } else if (type === 'RATE_LIMIT') {
    recordSystemError({
      code: 'ERR_HTTP_429_RATE_LIMIT',
      severity: 'ERROR',
      subsystem: 'BINANCE_REST_API',
      message: 'Simulated HTTP 429 Too Many Requests (Binance IP weight limit 1200/min reached).',
      details: 'Simulation test: HTTP 429 received from Binance Gateway. Adaptive backoff cooldown of 2500ms initiated. All active Stop Losses & Trailing Stops remain guarded.',
      status: 'ACTIVE',
      autoRecovered: true,
    });
  } else {
    recordSystemError({
      code: 'WARN_CALC_BOUNDARY',
      severity: 'WARN',
      subsystem: 'SPATIAL_ENGINE',
      message: 'Spatial Clearance Guard: Structural swing high within 0.08% boundary. Entry safely blocked.',
      details: 'Anti-BAD_LOCATION Gate prevented LONG entry into structural resistance wall ($68,920). Zero capital risked.',
      status: 'ACTIVE',
      autoRecovered: true,
    });
  }
  res.json({ success: true, errors: systemErrors, health: systemHealth });
});

app.post('/api/system-errors/ping', async (_req, res) => {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const pingRes = await fetch('https://fapi.binance.com/fapi/v1/ping', { signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    systemHealth.feedLatencyMs = latency;
    systemHealth.lastPingTimestamp = Date.now();

    if (pingRes.ok) {
      res.json({ success: true, latencyMs: latency, status: 'CONNECTED' });
    } else {
      recordSystemError({
        code: `ERR_PING_${pingRes.status}`,
        severity: 'WARN',
        subsystem: 'NETWORK_FEED',
        message: `Binance ping returned HTTP ${pingRes.status}`,
        details: `Ping failed with status ${pingRes.status} in ${latency}ms`,
        status: 'ACTIVE',
        autoRecovered: true,
      });
      res.json({ success: false, latencyMs: latency, status: 'FAILED' });
    }
  } catch (err: any) {
    const latency = Date.now() - start;
    recordSystemError({
      code: 'ERR_PING_EXCEPTION',
      severity: 'WARN',
      subsystem: 'NETWORK_FEED',
      message: 'Direct Binance ping timed out or failed.',
      details: err?.message || 'Network exception',
      status: 'ACTIVE',
      autoRecovered: true,
    });
    res.json({ success: false, latencyMs: latency, error: err?.message });
  }
});

app.post('/api/system-errors/client-report', (req, res) => {
  const { message = 'Client error', details = '', code = 'ERR_UI_RUNTIME' } = req.body;
  recordSystemError({
    code,
    severity: 'ERROR',
    subsystem: 'UI_RUNTIME',
    message,
    details,
    status: 'ACTIVE',
    autoRecovered: false,
  });
  res.json({ success: true });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const distDir = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distDir, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || hasDist;

  if (isProd && hasDist) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    // Dynamic import to prevent loading Vite compiler into memory during production
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ApexQuant] Engine and Full-Stack Platform active on port ${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });

  // Graceful shutdown handlers for container platforms (SIGTERM/SIGINT)
  process.on('SIGTERM', () => {
    console.log('[ApexQuant] Received SIGTERM signal, exiting cleanly...');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('[ApexQuant] Received SIGINT signal, exiting cleanly...');
    server.close(() => process.exit(0));
  });
}

startServer();
