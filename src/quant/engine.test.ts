import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBTCRegime,
  evaluateStrictEntryPolicies,
  evaluateExitBrain,
} from './engine';
import {
  calculateSpatialMetrics,
  computeOrderflowMetrics,
  calculateEMA,
  calculateRSI,
  calculateRVOL,
} from './indicators';
import { Candle, TradePosition, SpatialMetrics, OrderflowMetrics } from '../types/quant';

function createMockCandles(count: number, basePrice: number, trendPct: number = 0): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const change = (trendPct / count) * basePrice + (Math.sin(i / 3) * (basePrice * 0.002));
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + basePrice * 0.003;
    const low = Math.min(open, close) - basePrice * 0.003;
    const volume = 100 + Math.random() * 50;
    const takerBuyVolume = volume * (change >= 0 ? 0.6 : 0.4);

    candles.push({
      timestamp: now - (count - i) * 15 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume,
      takerBuyVolume,
      quoteVolume: volume * close,
      count: 100,
    });

    price = close;
  }
  return candles;
}

test('1. Indicator Calculations: EMA, RSI, RVOL', () => {
  const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const ema5 = calculateEMA(prices, 5);
  assert.equal(ema5.length, prices.length);
  assert.ok(ema5[ema5.length - 1] > 15, 'EMA should track upward trend');

  const closes = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128];
  const rsi = calculateRSI(closes, 14);
  assert.ok(rsi > 70, 'Consistent uptrend should produce high RSI');

  const candles = createMockCandles(30, 100);
  candles[candles.length - 1].volume = 500; // 5x average
  const rvol = calculateRVOL(candles, 20);
  assert.ok(rvol >= 2.0, 'RVOL should detect explosive volume');
});

test('2. Spatial Clearance & Anti-BAD_LOCATION Detection', () => {
  const candles = createMockCandles(35, 60000);
  // Set current price very close to resistance (< 0.25%)
  const maxHigh = Math.max(...candles.slice(-30).map(c => c.high));
  const currentPriceNearRes = maxHigh * 0.9985; // 0.15% away from resistance
  
  const spatial = calculateSpatialMetrics(candles, currentPriceNearRes);
  assert.equal(spatial.isAtResistance, true, 'Should detect price within 0.25% of resistance');
  assert.equal(spatial.spatialStatus, 'BAD_LOCATION');

  // Test wide clearance
  const midPrice = (spatial.nearestResistance + spatial.nearestSupport) / 2;
  const spatialClear = calculateSpatialMetrics(candles, midPrice);
  assert.equal(spatialClear.isAtResistance, false);
  assert.equal(spatialClear.isAtSupport, false);
});

test('3. Strict Absolute Entry Policies: Absolute Trend Regime Alignment', () => {
  const mockSpatial: SpatialMetrics = {
    nearestResistance: 105,
    nearestSupport: 95,
    distanceToResistancePct: 2.0,
    distanceToSupportPct: 2.0,
    isAtResistance: false,
    isAtSupport: false,
    isLateExpansion: false,
    expansionAtrMult: 0.5,
    rsi: 52,
    atr14: 1.0,
    spatialStatus: 'CLEAR',
  };

  const mockOrderflow: OrderflowMetrics = {
    cvdSlope5m: 50,
    cvdSlope15m: 100,
    cvdSlope4h: 120,
    oiChgPct: 1.5,
    oiClassification: 'TRUE_ACCUMULATION',
    takerBuySellRatio: 1.2,
    fundingRate: 0.0001,
    orderflowState: 'BULLISH',
    flowPersistence: 'HIGH_CONVICTION',
  };

  // Rule: Strict Bull Blocker: Prohibit 100% of SHORT trades when BTC is BULL_STRONG or BULL_WEAK
  const shortUnderBull = evaluateStrictEntryPolicies({
    candidateSide: 'SHORT',
    symbol: 'ETHUSDT',
    currentPrice: 3000,
    btcRegime: 'BULL_STRONG',
    symbolRegime: 'TREND_UP',
    spatial: mockSpatial,
    orderflow: { ...mockOrderflow, orderflowState: 'BEARISH' },
    rvol: 1.5,
    adx: 28,
    plusDI: 15,
    minusDI: 30,
    dailyDrawdownPct: 0,
  });
  assert.equal(shortUnderBull.allowed, false);
  assert.equal(shortUnderBull.blockedBy, 'REGIME_LOCK');
  assert.match(shortUnderBull.reason, /Strict Bull Blocker Active/);

  // Rule: Strict Bear Blocker: Prohibit 100% of LONG trades when BTC is BEAR_STRONG or BEAR_WEAK
  const longUnderBear = evaluateStrictEntryPolicies({
    candidateSide: 'LONG',
    symbol: 'SOLUSDT',
    currentPrice: 150,
    btcRegime: 'BEAR_STRONG',
    symbolRegime: 'TREND_DOWN',
    spatial: mockSpatial,
    orderflow: mockOrderflow,
    rvol: 1.5,
    adx: 28,
    plusDI: 30,
    minusDI: 15,
    dailyDrawdownPct: 0,
  });
  assert.equal(longUnderBear.allowed, false);
  assert.equal(longUnderBear.blockedBy, 'REGIME_LOCK');
  assert.match(longUnderBear.reason, /Strict Bear Blocker Active/);
});

test('4. Strict Absolute Entry Policies: Anti-BAD_LOCATION & Timing Gate', () => {
  const badLocationSpatial: SpatialMetrics = {
    nearestResistance: 100,
    nearestSupport: 90,
    distanceToResistancePct: 0.15, // < 0.25%
    distanceToSupportPct: 5.0,
    isAtResistance: true,
    isAtSupport: false,
    isLateExpansion: false,
    expansionAtrMult: 0.5,
    rsi: 55,
    atr14: 1.0,
    spatialStatus: 'BAD_LOCATION',
  };

  const goodOrderflow: OrderflowMetrics = {
    cvdSlope5m: 50,
    cvdSlope15m: 100,
    cvdSlope4h: 120,
    oiChgPct: 1.5,
    oiClassification: 'TRUE_ACCUMULATION',
    takerBuySellRatio: 1.2,
    fundingRate: 0.0001,
    orderflowState: 'BULLISH',
    flowPersistence: 'HIGH_CONVICTION',
  };

  const badLocationResult = evaluateStrictEntryPolicies({
    candidateSide: 'LONG',
    symbol: 'BTCUSDT',
    currentPrice: 99.85,
    btcRegime: 'BULL_STRONG',
    symbolRegime: 'TREND_UP',
    spatial: badLocationSpatial,
    orderflow: goodOrderflow,
    rvol: 1.5,
    adx: 28,
    plusDI: 30,
    minusDI: 15,
    dailyDrawdownPct: 0,
  });
  assert.equal(badLocationResult.allowed, false);
  assert.equal(badLocationResult.blockedBy, 'BAD_LOCATION');

  // Timing Gate: Late Expansion
  const lateExpansionSpatial: SpatialMetrics = {
    nearestResistance: 120,
    nearestSupport: 90,
    distanceToResistancePct: 8.0,
    distanceToSupportPct: 8.0,
    isAtResistance: false,
    isAtSupport: false,
    isLateExpansion: true,
    expansionAtrMult: 1.6, // > 1.4x ATR
    rsi: 76, // > 72
    atr14: 1.0,
    spatialStatus: 'WAITING_FOR_RETEST',
  };

  const lateExpansionResult = evaluateStrictEntryPolicies({
    candidateSide: 'LONG',
    symbol: 'BTCUSDT',
    currentPrice: 105,
    btcRegime: 'BULL_STRONG',
    symbolRegime: 'TREND_UP',
    spatial: lateExpansionSpatial,
    orderflow: goodOrderflow,
    rvol: 1.5,
    adx: 28,
    plusDI: 30,
    minusDI: 15,
    dailyDrawdownPct: 0,
  });
  assert.equal(lateExpansionResult.allowed, false);
  assert.equal(lateExpansionResult.blockedBy, 'LATE_EXPANSION');
});

test('5. Strict Absolute Entry Policies: RANGE Long Trap & Dead Chop Filter', () => {
  const clearSpatial: SpatialMetrics = {
    nearestResistance: 120,
    nearestSupport: 90,
    distanceToResistancePct: 5.0,
    distanceToSupportPct: 5.0,
    isAtResistance: false,
    isAtSupport: false,
    isLateExpansion: false,
    expansionAtrMult: 0.5,
    rsi: 50,
    atr14: 1.0,
    spatialStatus: 'CLEAR',
  };

  const goodOrderflow: OrderflowMetrics = {
    cvdSlope5m: 50,
    cvdSlope15m: 100,
    cvdSlope4h: 120,
    oiChgPct: 1.5,
    oiClassification: 'TRUE_ACCUMULATION',
    takerBuySellRatio: 1.2,
    fundingRate: 0.0001,
    orderflowState: 'BULLISH',
    flowPersistence: 'HIGH_CONVICTION',
  };

  // Rule: Altcoin in RANGE while BTC in BULL -> RANGE Long Trap Blocker
  const altcoinRangeTrap = evaluateStrictEntryPolicies({
    candidateSide: 'LONG',
    symbol: 'DOGEUSDT',
    currentPrice: 0.15,
    btcRegime: 'BULL_STRONG',
    symbolRegime: 'RANGE',
    spatial: clearSpatial,
    orderflow: goodOrderflow,
    rvol: 1.1,
    adx: 18,
    plusDI: 20,
    minusDI: 18,
    dailyDrawdownPct: 0,
  });
  assert.equal(altcoinRangeTrap.allowed, false);
  assert.equal(altcoinRangeTrap.blockedBy, 'RANGE_LONG_TRAP');

  // Rule: Dead Chop Filter in RANGE when BTC is RANGE: requires RVOL >= 2.0 AND ADX >= 22
  const deadChop = evaluateStrictEntryPolicies({
    candidateSide: 'LONG',
    symbol: 'BTCUSDT',
    currentPrice: 65000,
    btcRegime: 'RANGE',
    symbolRegime: 'RANGE',
    spatial: clearSpatial,
    orderflow: goodOrderflow,
    rvol: 1.3, // Not >= 2.0
    adx: 18,   // Not >= 22
    plusDI: 20,
    minusDI: 18,
    dailyDrawdownPct: 0,
  });
  assert.equal(deadChop.allowed, false);
  assert.equal(deadChop.blockedBy, 'DEAD_CHOP');
});

test('6. Daily Circuit Breaker Gate', () => {
  const clearSpatial: SpatialMetrics = {
    nearestResistance: 120,
    nearestSupport: 90,
    distanceToResistancePct: 5.0,
    distanceToSupportPct: 5.0,
    isAtResistance: false,
    isAtSupport: false,
    isLateExpansion: false,
    expansionAtrMult: 0.5,
    rsi: 50,
    atr14: 1.0,
    spatialStatus: 'CLEAR',
  };

  const goodOrderflow: OrderflowMetrics = {
    cvdSlope5m: 50,
    cvdSlope15m: 100,
    cvdSlope4h: 120,
    oiChgPct: 1.5,
    oiClassification: 'TRUE_ACCUMULATION',
    takerBuySellRatio: 1.2,
    fundingRate: 0.0001,
    orderflowState: 'BULLISH',
    flowPersistence: 'HIGH_CONVICTION',
  };

  const breakerTripped = evaluateStrictEntryPolicies({
    candidateSide: 'LONG',
    symbol: 'BTCUSDT',
    currentPrice: 65000,
    btcRegime: 'BULL_STRONG',
    symbolRegime: 'TREND_UP',
    spatial: clearSpatial,
    orderflow: goodOrderflow,
    rvol: 2.2,
    adx: 30,
    plusDI: 28,
    minusDI: 14,
    dailyDrawdownPct: -3.2, // Tripped!
    circuitBreakerThresholdPct: -3.0,
  });
  assert.equal(breakerTripped.allowed, false);
  assert.equal(breakerTripped.blockedBy, 'CIRCUIT_BREAKER');
});

test('7. Smart Multi-Stage Exit Engine: TP1, Breakeven Lock, TP2, Early Invalidation', () => {
  const initialPosition: TradePosition = {
    id: 'test-1',
    symbol: 'BTCUSDT',
    side: 'LONG',
    entryPrice: 60000,
    currentPrice: 60000,
    initialQuantity: 1.0,
    currentQuantity: 1.0,
    entryTime: Date.now() - 3600000,
    stopLoss: 59000, // 1000 risk distance (1.0R = $1000)
    initialStopLoss: 59000,
    riskDistance: 1000,
    stage: 'STAGE_INITIAL',
    realizedPnl: 0,
    unrealizedPnl: 0,
    currentR: 0,
    peakR: 0,
    partialCloses: [],
    status: 'OPEN',
    qualityRating: 'GOOD_ENTRY',
  };

  // Test TP1: at +0.75R (price = 60750)
  const tp1Result = evaluateExitBrain({
    position: initialPosition,
    currentPrice: 60750,
    candleCloses15m: [60500, 60750],
    ema21: 60200,
    cvdSlope15m: 50,
    cvdSlope5m: 40,
    oiChgPct: 1.0,
    atr14: 300,
    rvol: 1.5,
    adx: 25,
  });

  assert.equal(tp1Result.actionTaken, 'TP1_HIT');
  assert.equal(tp1Result.updatedPosition.stage, 'STAGE_TP1_LOCKED');
  assert.equal(tp1Result.updatedPosition.currentQuantity, 0.6); // 40% closed
  // SL must be moved to entry + 0.20R = 60000 + 200 = 60200
  assert.equal(tp1Result.updatedPosition.stopLoss, 60200);

  // Test TP2: at +1.80R (price = 61800)
  const tp2Result = evaluateExitBrain({
    position: tp1Result.updatedPosition,
    currentPrice: 61800,
    candleCloses15m: [61500, 61800],
    ema21: 61000,
    cvdSlope15m: 60,
    cvdSlope5m: 50,
    oiChgPct: 1.2,
    atr14: 300,
    rvol: 1.8,
    adx: 28,
  });

  assert.equal(tp2Result.actionTaken, 'TP2_HIT');
  assert.equal(tp2Result.updatedPosition.stage, 'STAGE_TP2_EXPANDED');
  assert.equal(Math.round(tp2Result.updatedPosition.currentQuantity * 100) / 100, 0.25); // 35% more closed -> 25% runner remains
  // SL moved to +0.75R profit floor = 60000 + 750 = 60750
  assert.equal(tp2Result.updatedPosition.stopLoss, 60750);

  // Test Smart Early Loss Mitigation: if slips to -0.32R (price = 59680) with 2 closes below EMA21
  const freshPosition: TradePosition = {
    ...initialPosition,
    id: 'test-early-cut',
  };

  const earlyCutResult = evaluateExitBrain({
    position: freshPosition,
    currentPrice: 59680, // -0.32R
    candleCloses15m: [59800, 59700], // both below EMA21
    ema21: 60100,
    cvdSlope15m: -70, // counter flip
    cvdSlope5m: -90,
    oiChgPct: -0.2,
    atr14: 300,
    rvol: 1.4,
    adx: 20,
  });

  assert.equal(earlyCutResult.actionTaken, 'CLOSED_EARLY_INVALIDATION');
  assert.equal(earlyCutResult.updatedPosition.status, 'CLOSED');
  assert.equal(earlyCutResult.updatedPosition.closeReason, 'EARLY_INVALIDATION');
  assert.equal(earlyCutResult.updatedPosition.qualityRating, 'DISCIPLINED_EARLY_CUT');
  assert.ok(earlyCutResult.updatedPosition.realizedPnl > -350, 'Loss should be limited to ~0.32R instead of -1000 full loss');
});

test('8. Smart CVD & Open Interest Exhaustion Exit (Peak Profit Catcher)', () => {
  const runnerPosition: TradePosition = {
    id: 'test-exhaustion',
    symbol: 'BTCUSDT',
    side: 'LONG',
    entryPrice: 60000,
    currentPrice: 60800, // +0.80R
    initialQuantity: 1.0,
    currentQuantity: 1.0,
    entryTime: Date.now() - 3600000,
    stopLoss: 59000,
    initialStopLoss: 59000,
    riskDistance: 1000,
    stage: 'STAGE_INITIAL',
    realizedPnl: 0,
    unrealizedPnl: 800,
    currentR: 0.8,
    peakR: 0.8,
    partialCloses: [],
    status: 'OPEN',
    qualityRating: 'GOOD_ENTRY',
  };

  // Sharp CVD divergence (slope15 < -100 and slope5 < -80) + contracting OI (< -0.5%)
  const exhaustionResult = evaluateExitBrain({
    position: runnerPosition,
    currentPrice: 60800,
    candleCloses15m: [60700, 60800],
    ema21: 60400,
    cvdSlope15m: -120, // sharp bearish divergence
    cvdSlope5m: -95,
    oiChgPct: -0.8,    // contracting OI
    atr14: 300,
    rvol: 1.5,
    adx: 24,
  });

  assert.equal(exhaustionResult.actionTaken, 'CLOSED_EXHAUSTION');
  assert.equal(exhaustionResult.updatedPosition.status, 'CLOSED');
  assert.equal(exhaustionResult.updatedPosition.closeReason, 'EXHAUSTION_EXIT');
  assert.equal(exhaustionResult.updatedPosition.qualityRating, 'EXEMPLARY_SNIPER');
  assert.ok(exhaustionResult.updatedPosition.realizedPnl > 0, 'Exited with banked top profit');
});
