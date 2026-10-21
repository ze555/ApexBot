import { Candle, SpatialMetrics, OrderflowMetrics, OIClassification, OrderflowBias } from '../types/quant';

/**
 * Exponential Moving Average
 */
export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  if (values.length < period) {
    const sum = values.reduce((acc, v) => acc + v, 0);
    return values.map(() => sum / values.length);
  }

  const k = 2 / (period + 1);
  const ema: number[] = new Array(values.length);
  
  // Seed with simple moving average
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  ema[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }

  // Backfill initial elements with SMA seed for index safety
  for (let i = 0; i < period - 1; i++) {
    ema[i] = ema[period - 1];
  }

  return ema;
}

/**
 * Simple Moving Average
 */
export function calculateSMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-period);
  const sum = slice.reduce((acc, v) => acc + v, 0);
  return sum / slice.length;
}

/**
 * Average True Range (ATR 14)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  if (candles.length === 0) return [];
  const trueRanges: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trueRanges.push(tr);
  }

  return calculateEMA(trueRanges, period);
}

/**
 * Relative Strength Index (RSI 14)
 */
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

/**
 * Average Directional Index (ADX 14) with +DI and -DI
 */
export function calculateADX(candles: Candle[], period: number = 14): { adx: number; plusDI: number; minusDI: number } {
  if (candles.length < period * 2) {
    return { adx: 20, plusDI: 20, minusDI: 20 };
  }

  const trValues: number[] = [];
  const dmPlusValues: number[] = [];
  const dmMinusValues: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];

    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    trValues.push(tr);

    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;

    if (upMove > downMove && upMove > 0) {
      dmPlusValues.push(upMove);
    } else {
      dmPlusValues.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      dmMinusValues.push(downMove);
    } else {
      dmMinusValues.push(0);
    }
  }

  const trSmoothed = calculateEMA(trValues, period);
  const plusSmoothed = calculateEMA(dmPlusValues, period);
  const minusSmoothed = calculateEMA(dmMinusValues, period);

  const dxValues: number[] = [];
  const len = trValues.length;

  for (let i = 0; i < len; i++) {
    const tr = trSmoothed[i] || 1;
    const pDI = ((plusSmoothed[i] || 0) / tr) * 100;
    const mDI = ((minusSmoothed[i] || 0) / tr) * 100;
    const sum = pDI + mDI;
    const diff = Math.abs(pDI - mDI);
    const dx = sum > 0 ? (diff / sum) * 100 : 0;
    dxValues.push(dx);
  }

  const adxValues = calculateEMA(dxValues, period);
  const lastIndex = len - 1;
  const currentTr = trSmoothed[lastIndex] || 1;
  const currentPlusDI = ((plusSmoothed[lastIndex] || 0) / currentTr) * 100;
  const currentMinusDI = ((minusSmoothed[lastIndex] || 0) / currentTr) * 100;
  const currentAdx = adxValues[lastIndex] || 20;

  return {
    adx: Math.round(currentAdx * 100) / 100,
    plusDI: Math.round(currentPlusDI * 100) / 100,
    minusDI: Math.round(currentMinusDI * 100) / 100,
  };
}

/**
 * Relative Volume (RVOL) = current candle volume / 20-period average volume
 */
export function calculateRVOL(candles: Candle[], period: number = 20): number {
  if (candles.length === 0) return 1.0;
  const currentVolume = candles[candles.length - 1].volume;
  const priorCandles = candles.slice(-period - 1, -1);
  if (priorCandles.length === 0) return 1.0;
  const avgVolume = priorCandles.reduce((sum, c) => sum + c.volume, 0) / priorCandles.length;
  if (avgVolume === 0) return 1.0;
  return Math.round((currentVolume / avgVolume) * 100) / 100;
}

/**
 * Linear regression slope of an array of numbers
 */
export function calculateLinearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return Number.isFinite(slope) ? Math.round(slope * 100) / 100 : 0;
}

/**
 * Cumulative Volume Delta (CVD) calculation
 * Uses takerBuyVolume vs (volume - takerBuyVolume) for delta
 */
export function calculateCVD(candles: Candle[]): number[] {
  const cvd: number[] = [];
  let runningDelta = 0;
  for (const c of candles) {
    const takerBuy = c.takerBuyVolume ?? (c.volume * 0.5);
    const takerSell = Math.max(0, c.volume - takerBuy);
    const delta = takerBuy - takerSell;
    runningDelta += delta;
    cvd.push(runningDelta);
  }
  return cvd;
}

/**
 * Spatial Location & Clearance Engine (Anti-BAD_LOCATION)
 * On the 30 most recent 15m candles:
 * nearestResistance = Max high of prior structural swing highs
 * nearestSupport = Min low of prior structural swing lows
 * distanceToResistancePct = (nearestResistance - currentPrice) / currentPrice
 * distanceToSupportPct = (currentPrice - nearestSupport) / currentPrice
 */
export function calculateSpatialMetrics(
  candles15m: Candle[],
  currentPrice: number
): SpatialMetrics {
  const windowCandles = candles15m.slice(-30);
  if (windowCandles.length < 5) {
    return {
      nearestResistance: currentPrice * 1.02,
      nearestSupport: currentPrice * 0.98,
      distanceToResistancePct: 2.0,
      distanceToSupportPct: 2.0,
      isAtResistance: false,
      isAtSupport: false,
      isLateExpansion: false,
      expansionAtrMult: 0,
      rsi: 50,
      atr14: currentPrice * 0.01,
      spatialStatus: 'CLEAR',
    };
  }

  // Find structural swing highs and lows in the 30-candle window
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = 1; i < windowCandles.length - 1; i++) {
    const prev = windowCandles[i - 1];
    const curr = windowCandles[i];
    const next = windowCandles[i + 1];

    if (curr.high >= prev.high && curr.high >= next.high) {
      swingHighs.push(curr.high);
    }
    if (curr.low <= prev.low && curr.low <= next.low) {
      swingLows.push(curr.low);
    }
  }

  // If no localized swing points, use highest high and lowest low of the window
  const nearestResistance = swingHighs.length > 0 
    ? Math.max(...swingHighs) 
    : Math.max(...windowCandles.map(c => c.high));

  const nearestSupport = swingLows.length > 0 
    ? Math.min(...swingLows) 
    : Math.min(...windowCandles.map(c => c.low));

  // Compute percentage distances
  const distanceToResistancePct = Math.max(0, ((nearestResistance - currentPrice) / currentPrice) * 100);
  const distanceToSupportPct = Math.max(0, ((currentPrice - nearestSupport) / currentPrice) * 100);

  // BAD_LOCATION Gate threshold: < 0.25%
  const isAtResistance = distanceToResistancePct < 0.25;
  const isAtSupport = distanceToSupportPct < 0.25;

  // ATR and RSI for Timing Gate (Late Expansion)
  const atrs = calculateATR(windowCandles, 14);
  const atr14 = atrs.length > 0 ? atrs[atrs.length - 1] : currentPrice * 0.008;
  const closes = windowCandles.map(c => c.close);
  const rsi = calculateRSI(closes, 14);

  // Late expansion check: price expanded > 1.4x ATR from support/resistance or RSI > 72 (overextended long) or RSI < 28 (overextended short)
  const expansionDistanceFromSupp = currentPrice - nearestSupport;
  const expansionAtrMult = atr14 > 0 ? expansionDistanceFromSupp / atr14 : 0;
  const isLateExpansion = expansionAtrMult > 1.4 || rsi > 72 || rsi < 28;

  let spatialStatus: SpatialMetrics['spatialStatus'] = 'CLEAR';
  if (isAtResistance || isAtSupport) {
    spatialStatus = 'BAD_LOCATION';
  } else if (isLateExpansion) {
    spatialStatus = 'WAITING_FOR_RETEST';
  }

  return {
    nearestResistance: Math.round(nearestResistance * 10000) / 10000,
    nearestSupport: Math.round(nearestSupport * 10000) / 10000,
    distanceToResistancePct: Math.round(distanceToResistancePct * 1000) / 1000,
    distanceToSupportPct: Math.round(distanceToSupportPct * 1000) / 1000,
    isAtResistance,
    isAtSupport,
    isLateExpansion,
    expansionAtrMult: Math.round(expansionAtrMult * 100) / 100,
    rsi: Math.round(rsi * 10) / 10,
    atr14: Math.round(atr14 * 10000) / 10000,
    spatialStatus,
    retestTargetLevel: isLateExpansion ? (expansionAtrMult > 1.4 ? nearestSupport + (atr14 * 0.5) : undefined) : undefined,
  };
}

/**
 * Orderflow Metrics computation
 * Evaluates CVD slopes, Open Interest classification, taker ratios
 */
export function computeOrderflowMetrics(
  candles: Candle[],
  openInterestHistory: { oi: number; timestamp: number }[],
  fundingRate: number = 0.0001
): OrderflowMetrics {
  const cvd = calculateCVD(candles);
  
  // Slopes for 5m (last 5 bars), 15m (last 15 bars), 4h (last 40 bars)
  const cvdSlope5m = cvd.length >= 5 ? calculateLinearSlope(cvd.slice(-5)) : 0;
  const cvdSlope15m = cvd.length >= 15 ? calculateLinearSlope(cvd.slice(-15)) : 0;
  const cvdSlope4h = cvd.length >= 40 ? calculateLinearSlope(cvd.slice(-40)) : 0;

  // Open Interest change
  let oiChgPct = 0;
  if (openInterestHistory.length >= 2) {
    const firstOI = openInterestHistory[0].oi;
    const latestOI = openInterestHistory[openInterestHistory.length - 1].oi;
    if (firstOI > 0) {
      oiChgPct = ((latestOI - firstOI) / firstOI) * 100;
    }
  }

  // Price direction over same window
  const firstPrice = candles.length > 10 ? candles[candles.length - 10].close : candles[0]?.close || 1;
  const lastPrice = candles[candles.length - 1]?.close || 1;
  const priceUp = lastPrice >= firstPrice;

  // Institutional OI Classification
  let oiClassification: OIClassification = 'NEUTRAL';
  if (priceUp && oiChgPct > 0.05) {
    oiClassification = 'TRUE_ACCUMULATION'; // Price up + OI up
  } else if (priceUp && oiChgPct < -0.05) {
    oiClassification = 'SHORT_COVERING';    // Price up + OI down
  } else if (!priceUp && oiChgPct > 0.05) {
    oiClassification = 'AGGRESSIVE_DISTRIBUTION'; // Price down + OI up
  } else if (!priceUp && oiChgPct < -0.05) {
    oiClassification = 'LONG_LIQUIDATION';  // Price down + OI down
  }

  // Taker buy/sell ratio on recent 10 bars
  const recent10 = candles.slice(-10);
  const totalTakerBuy = recent10.reduce((sum, c) => sum + (c.takerBuyVolume || c.volume * 0.5), 0);
  const totalTakerSell = recent10.reduce((sum, c) => sum + Math.max(0, c.volume - (c.takerBuyVolume || c.volume * 0.5)), 0);
  const takerBuySellRatio = totalTakerSell > 0 ? totalTakerBuy / totalTakerSell : 1.0;

  // Orderflow State & Persistence
  let orderflowState: OrderflowBias = 'MIXED';
  let flowPersistence: OrderflowMetrics['flowPersistence'] = 'MODERATE';

  if (cvdSlope15m > 30 && cvdSlope5m > 0 && takerBuySellRatio > 1.05) {
    orderflowState = 'BULLISH';
    flowPersistence = (cvdSlope4h >= 0 && oiClassification === 'TRUE_ACCUMULATION') 
      ? 'HIGH_CONVICTION' 
      : 'MODERATE';
  } else if (cvdSlope15m < -30 && cvdSlope5m < 0 && takerBuySellRatio < 0.95) {
    orderflowState = 'BEARISH';
    flowPersistence = (cvdSlope4h <= 0 && oiClassification === 'AGGRESSIVE_DISTRIBUTION')
      ? 'HIGH_CONVICTION'
      : 'MODERATE';
  } else {
    orderflowState = 'MIXED';
    flowPersistence = 'CONFLICTED';
  }

  return {
    cvdSlope5m: Math.round(cvdSlope5m * 100) / 100,
    cvdSlope15m: Math.round(cvdSlope15m * 100) / 100,
    cvdSlope4h: Math.round(cvdSlope4h * 100) / 100,
    oiChgPct: Math.round(oiChgPct * 1000) / 1000,
    oiClassification,
    takerBuySellRatio: Math.round(takerBuySellRatio * 100) / 100,
    fundingRate: Math.round(fundingRate * 1000000) / 1000000,
    orderflowState,
    flowPersistence,
  };
}
