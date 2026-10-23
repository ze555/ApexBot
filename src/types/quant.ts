export type BTCRegime = 'BULL_STRONG' | 'BULL_WEAK' | 'BEAR_STRONG' | 'BEAR_WEAK' | 'RANGE';

export type OrderflowBias = 'BULLISH' | 'BEARISH' | 'MIXED' | 'CONFLICTED';

export type OIClassification = 
  | 'TRUE_ACCUMULATION'       // Price Up + OI Up
  | 'SHORT_COVERING'          // Price Up + OI Down
  | 'AGGRESSIVE_DISTRIBUTION'  // Price Down + OI Up
  | 'LONG_LIQUIDATION'        // Price Down + OI Down
  | 'NEUTRAL';

export type SpatialStatus = 'CLEAR' | 'BAD_LOCATION' | 'WAITING_FOR_RETEST';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyVolume: number;
  quoteVolume: number;
  count: number;
}

export interface BTCContext {
  price: number;
  change24h: number;
  ema50: number;
  ema200: number;
  adx: number;
  plusDI: number;
  minusDI: number;
  rvol: number;
  regime: BTCRegime;
  regimeDescription: string;
  regimeRiskMult: number; // 1.0 for TREND, 0.5 for RANGE/CHOP
  cvdSlope5m: number;
  cvdSlope15m: number;
  cvdSlope4h: number;
  oiChgPct: number;
  oiClassification: OIClassification;
  takerBuySellRatio: number;
  fundingRate: number;
  lastUpdated: number;
}

export interface SpatialMetrics {
  nearestResistance: number;
  nearestSupport: number;
  distanceToResistancePct: number;
  distanceToSupportPct: number;
  isAtResistance: boolean; // < 0.25%
  isAtSupport: boolean;    // < 0.25%
  isLateExpansion: boolean; // > 1.4x ATR from level or RSI > 72 / < 28
  expansionAtrMult: number;
  expansionDownAtrMult?: number;
  rsi: number;
  atr14: number;
  spatialStatus: SpatialStatus;
  retestTargetLevel?: number;
}

export interface OrderflowMetrics {
  cvdSlope5m: number;
  cvdSlope15m: number;
  cvdSlope4h: number;
  oiChgPct: number;
  oiClassification: OIClassification;
  takerBuySellRatio: number;
  fundingRate: number;
  orderflowState: OrderflowBias;
  flowPersistence: 'HIGH_CONVICTION' | 'MODERATE' | 'CONFLICTED';
}

export type RejectionGate =
  | 'REGIME_LOCK'
  | 'BAD_LOCATION'
  | 'LATE_EXPANSION'
  | 'RANGE_LONG_TRAP'
  | 'DEAD_CHOP'
  | 'CONFLICTED_ORDERFLOW'
  | 'CIRCUIT_BREAKER'
  | 'RISK_CAP_EXCEEDED';

export interface GateEvaluation {
  allowed: boolean;
  blockedBy?: RejectionGate;
  reason: string;
  gateDetails: {
    btcRegime?: BTCRegime;
    symbolRegime?: string;
    distanceToResistancePct?: number;
    distanceToSupportPct?: number;
    expansionAtrMult?: number;
    rsi?: number;
    rvol?: number;
    adx?: number;
    plusDI?: number;
    minusDI?: number;
    orderflowState?: OrderflowBias;
    dailyDrawdownPct?: number;
  };
}

export interface TradePosition {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  initialQuantity: number;
  currentQuantity: number;
  entryTime: number;
  stopLoss: number;
  initialStopLoss: number;
  riskDistance: number; // |entryPrice - initialStopLoss|
  leverage?: number; // Effective institutional leverage (e.g. 2x, 3x, 5x)
  stage: 'STAGE_INITIAL' | 'STAGE_TP1_LOCKED' | 'STAGE_TP2_EXPANDED' | 'STAGE_RUNNER_TRAILING';
  realizedPnl: number;
  unrealizedPnl: number;
  currentR: number;
  peakR: number;
  partialCloses: Array<{
    stage: string;
    price: number;
    quantityPct: number;
    pnlUsd: number;
    pnlR: number;
    timestamp: number;
  }>;
  status: 'OPEN' | 'CLOSED';
  closeReason?:
    | 'TP1_SL'
    | 'TP2_SL'
    | 'FULL_SL'
    | 'RUNNER_TRAIL'
    | 'EXHAUSTION_EXIT'
    | 'EARLY_INVALIDATION'
    | 'EMERGENCY_FLATTEN'
    | 'MANUAL_EXIT';
  qualityRating:
    | 'EXEMPLARY_SNIPER'
    | 'GOOD_ENTRY'
    | 'DISCIPLINED_EARLY_CUT'
    | 'BAD_LOCATION'
    | 'FLOW_ERROR';
  exitPrice?: number;
  exitTime?: number;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'LONG' | 'SHORT';
  gate: RejectionGate | 'PASSED_ALL_GATES';
  status: 'BLOCKED' | 'APPROVED';
  headline: string;
  reason: string;
  metricsSnapshot: {
    price: number;
    btcRegime: BTCRegime;
    symbolRegime: string;
    distResPct: number;
    distSuppPct: number;
    rvol: number;
    adx: number;
    cvdSlope15m: number;
    oiChgPct: number;
  };
}

export interface PairMarketState {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  regime: 'TREND_UP' | 'TREND_DOWN' | 'RANGE' | 'TRANSITION';
  spatial: SpatialMetrics;
  orderflow: OrderflowMetrics;
  rvol: number;
  adx: number;
  plusDI: number;
  minusDI: number;
  sniperScore: number; // 0-100 conviction score
  candidateSide: 'LONG' | 'SHORT' | 'NONE';
  lastGateResult: GateEvaluation;
}

export interface PlatformStats {
  portfolioBalance: number;
  startOfDayBalance: number;
  dailyRealizedPnl: number;
  dailyUnrealizedPnl: number;
  dailyTotalPnl: number;
  dailyDrawdownPct: number;
  circuitBreakerTripped: boolean;
  circuitBreakerThresholdPct: number; // -3.0%
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  totalRealizedR: number;
  averageWinR: number;
  averageLossR: number;
  profitFactor: number;
  savedCapitalUsd: number; // capital saved by early invalidation cuts
}

export interface PlatformSettings {
  initialCapital: number; // Virtual paper trading capital (default $1,000, editable)
  autoExecution: boolean;
  simulationMode: boolean;
  riskPerTradePct: number; // 0.5% - 2.5%
  maxLeverage: number; // Institutional leverage cap (default 5x, range 1x to 20x)
  maxOpenPositions: number;
  scanIntervalSeconds: number;
  circuitBreakerPct: number; // e.g. -3.0%
  trailingStopMultiplier: number;
}

export type ErrorSeverity = 'FATAL' | 'ERROR' | 'WARN' | 'INFO';

export type SubsystemType =
  | 'BINANCE_REST_API'
  | 'BINANCE_WS'
  | 'QUANT_ENGINE'
  | 'ORDERFLOW_CALCULATOR'
  | 'SPATIAL_ENGINE'
  | 'NETWORK_FEED'
  | 'SYSTEM_GUARD'
  | 'UI_RUNTIME';

export interface SystemErrorLog {
  id: string;
  timestamp: number;
  code: string;
  severity: ErrorSeverity;
  subsystem: SubsystemType;
  message: string;
  details?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'SUPPRESSED';
  retryCount?: number;
  autoRecovered?: boolean;
}

export interface SystemHealthState {
  status: 'OPERATIONAL' | 'DEGRADED' | 'WARNING' | 'CRITICAL';
  feedLatencyMs: number;
  lastPingTimestamp: number;
  activeErrorsCount: number;
  warningsCount: number;
  totalErrorsLogged: number;
  uptimeSeconds: number;
}
