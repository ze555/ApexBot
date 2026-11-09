import React, { useState } from 'react';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Compass,
  Zap,
  ShieldCheck,
  Radio,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  CheckCircle,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
} from 'lucide-react';
import { MarketScanReport, ExplosiveOpportunity } from '../types/quant';

interface ExplosiveMarketRadarProps {
  report: MarketScanReport | null;
  isLoading: boolean;
  onRefreshScan: () => void;
  onTrackSymbol: (symbol: string, action: 'track' | 'untrack') => void;
  onToggleAutoRotate: (enabled: boolean) => void;
  onTriggerTestTrade: (symbol: string, side: 'LONG' | 'SHORT') => void;
  isTriggering: boolean;
}

export const ExplosiveMarketRadar: React.FC<ExplosiveMarketRadarProps> = ({
  report,
  isLoading,
  onRefreshScan,
  onTrackSymbol,
  onToggleAutoRotate,
  onTriggerTestTrade,
  isTriggering,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LONGS' | 'SHORTS'>('ALL');

  if (!report) {
    return null;
  }

  const {
    lastScannedAt,
    totalFuturesScanned,
    liquidPairsCount,
    topLongs,
    topShorts,
    marketBreadth,
    autoRotateExplosivePairs,
    activeTrackedCount,
  } = report;

  const secondsAgo = Math.max(1, Math.round((Date.now() - lastScannedAt) / 1000));
  const totalExplosive = topLongs.length + topShorts.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-200 transition-all">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <Flame className="h-5 w-5 animate-pulse text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
                BINANCE FULL-MARKET EXPLOSIVE RADAR
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/80 font-bold">
                  رادار العملات الانفجارية
                </span>
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {totalFuturesScanned > 0 ? `${totalFuturesScanned} PAIRS` : '750+ FUTURES'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {liquidPairsCount} LIQUID (&gt;$15M)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              كشف العملات في بداية الحركة الانفجارية (Early Origin Breakout / Breakdown) قبل أن تتضخم الحركة
            </p>
          </div>
        </div>

        {/* Controls & Metrics */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Market Breadth Indicator */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Breadth:</span>
            <span className="text-emerald-400 font-bold">{marketBreadth.advancersCount}▲</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400 font-bold">{marketBreadth.declinersCount}▼</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                marketBreadth.overallBias === 'BULLISH_DOMINANCE'
                  ? 'bg-emerald-950 text-emerald-300'
                  : marketBreadth.overallBias === 'BEARISH_DOMINANCE'
                  ? 'bg-rose-950 text-rose-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {marketBreadth.overallBias === 'BULLISH_DOMINANCE' ? 'BULL DOM' : marketBreadth.overallBias === 'BEARISH_DOMINANCE' ? 'BEAR DOM' : 'BALANCED'}
            </span>
          </div>

          {/* Auto-Rotate Toggle Switch */}
          <button
            type="button"
            onClick={() => onToggleAutoRotate(!autoRotateExplosivePairs)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors ${
              autoRotateExplosivePairs
                ? 'bg-amber-950/40 border-amber-600/80 text-amber-300 shadow-sm shadow-amber-500/10'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="توجيه المحرك تلقائياً لقنص العملات الأكثر انفجاراً في السوق"
          >
            <Zap className={`h-3.5 w-3.5 ${autoRotateExplosivePairs ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Auto-Route Sniper:</span>
            <span className="font-bold">{autoRotateExplosivePairs ? 'ON' : 'OFF'}</span>
          </button>

          {/* Refresh Manual Scan Button */}
          <button
            type="button"
            onClick={onRefreshScan}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            title="فحص فوري لكامل أزواج بايننس فيوتشرز"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Scan Market</span>
            <span className="text-[10px] text-cyan-400">({secondsAgo}s)</span>
          </button>

          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono transition-colors"
            aria-label={isCollapsed ? 'Expand Radar' : 'Collapse Radar'}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4 text-cyan-400" /> : <ChevronUp className="h-4 w-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Collapsed Summary */}
      {isCollapsed && (
        <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {topLongs.length} Early Longs ({topLongs[0]?.symbol || 'N/A'})
            </span>
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" />
              {topShorts.length} Early Shorts ({topShorts[0]?.symbol || 'N/A'})
            </span>
            <span className="text-slate-500 hidden sm:inline">
              | {activeTrackedCount} عملات مراقبة نشطة في محرك القنص
            </span>
          </div>
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-cyan-400 hover:text-cyan-300 underline text-xs cursor-pointer"
          >
            عرض التفاصيل / Expand
          </button>
        </div>
      )}

      {/* Expanded Detailed Grid */}
      {!isCollapsed && (
        <div className="mt-4 space-y-4">
          {/* Sub-Tabs: Filter Longs / Shorts / All */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Opportunities ({totalExplosive})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('LONGS')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'LONGS'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Early Longs ({topLongs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SHORTS')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'SHORTS'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                Early Shorts ({topShorts.length})
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
              <span className="text-amber-400 font-semibold">المعيار الذهبي:</span> التركيز على مرحلة{' '}
              <span className="text-emerald-300 font-bold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800">
                EARLY_ORIGIN
              </span>{' '}
              لتجنب الشراء في القمة أو البيع في القاع
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Longs Column */}
            {(activeTab === 'ALL' || activeTab === 'LONGS') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400 px-1">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    🚀 TOP EARLY BULLISH IMPULSES (بداية انفجار صاعد)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Breakout from 24h High with Vol Surge
                  </span>
                </div>

                {topLongs.length === 0 ? (
                  <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-500 font-mono">
                    لا توجد عملات صاعدة في مرحلة البداية الآمنة حالياً (السوق يصحح أو في منطقة حياد).
                  </div>
                ) : (
                  topLongs.map((item) => (
                    <OpportunityCard
                      key={item.symbol}
                      item={item}
                      onTrackSymbol={onTrackSymbol}
                      onTriggerTestTrade={onTriggerTestTrade}
                      isTriggering={isTriggering}
                    />
                  ))
                )}
              </div>
            )}

            {/* Shorts Column */}
            {(activeTab === 'ALL' || activeTab === 'SHORTS') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-400 px-1">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="h-4 w-4" />
                    🩸 TOP EARLY BEARISH BREAKDOWNS (بداية انهيار هابط)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Breakdown from 24h Low with Sell Pressure
                  </span>
                </div>

                {topShorts.length === 0 ? (
                  <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-500 font-mono">
                    لا توجد عملات هابطة في مرحلة البداية الآمنة حالياً.
                  </div>
                ) : (
                  topShorts.map((item) => (
                    <OpportunityCard
                      key={item.symbol}
                      item={item}
                      onTrackSymbol={onTrackSymbol}
                      onTriggerTestTrade={onTriggerTestTrade}
                      isTriggering={isTriggering}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface OpportunityCardProps {
  item: ExplosiveOpportunity;
  onTrackSymbol: (symbol: string, action: 'track' | 'untrack') => void;
  onTriggerTestTrade: (symbol: string, side: 'LONG' | 'SHORT') => void;
  isTriggering: boolean;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({
  item,
  onTrackSymbol,
  onTriggerTestTrade,
  isTriggering,
}) => {
  const isLong = item.direction === 'LONG';
  const isEarly = item.impulseStage === 'EARLY_ORIGIN';

  return (
    <div
      className={`bg-slate-950/80 border rounded-xl p-3.5 transition-all hover:border-slate-700 shadow-md ${
        isEarly
          ? isLong
            ? 'border-emerald-500/40 bg-slate-900/90 ring-1 ring-emerald-500/20'
            : 'border-rose-500/40 bg-slate-900/90 ring-1 ring-rose-500/20'
          : 'border-slate-800'
      }`}
    >
      {/* Top Row: Symbol, Price, Velocity & Stage */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-base text-white">{item.symbol}</span>
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                item.change24h >= 0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {item.change24h >= 0 ? '+' : ''}
              {item.change24h}%
            </span>
            {/* Impulse Stage Badge */}
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                isEarly
                  ? 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse'
                  : item.impulseStage === 'EXPANDING'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isEarly ? '⚡ بداية الحركة (EARLY)' : item.impulseStage}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 font-mono text-xs text-slate-400">
            <span className="text-cyan-300 font-bold text-sm">
              ${item.price >= 10 ? item.price.toLocaleString() : item.price}
            </span>
            <span>Vol: ${(item.quoteVolume24h / 1e6).toFixed(1)}M USDT</span>
          </div>
        </div>

        {/* Velocity Gauge */}
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-mono">Velocity Score</span>
          <span
            className={`font-mono font-bold text-base ${
              item.velocityScore >= 85
                ? 'text-amber-400'
                : item.velocityScore >= 70
                ? 'text-emerald-400'
                : 'text-cyan-400'
            }`}
          >
            {item.velocityScore}/100
          </span>
        </div>
      </div>

      {/* 24h Range Bar & Location */}
      <div className="mt-2.5 bg-slate-900/90 border border-slate-800/80 rounded-lg p-2 font-mono text-[11px]">
        <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
          <span>24h Range Position:</span>
          <span className={isLong ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {item.rangeLocationPct}% of range ({isLong ? 'Near Highs' : 'Near Lows'})
          </span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden flex">
          <div
            className={`h-full rounded-full transition-all ${
              isLong ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-gradient-to-r from-rose-500 to-orange-400'
            }`}
            style={{ width: `${Math.max(5, Math.min(100, item.rangeLocationPct))}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 mt-1">
          <span>Low: ${item.low24h}</span>
          <span>High: ${item.high24h}</span>
        </div>
      </div>

      {/* Algorithmic Reason */}
      <p className="mt-2 text-xs text-slate-300 font-sans leading-relaxed bg-slate-900/60 border border-slate-800/60 rounded-lg p-2">
        <span className="text-amber-400 font-semibold font-mono text-[11px] block mb-0.5">
          تشخيص الزخم والسيولة:
        </span>
        {item.reason}
      </p>

      {/* Execution Targets */}
      <div className="grid grid-cols-3 gap-1.5 mt-2 text-center font-mono text-[11px]">
        <div className="bg-slate-900/70 border border-slate-800 rounded p-1">
          <span className="text-[9px] text-slate-500 block">Entry Rec</span>
          <span className="text-white font-bold">${item.recommendedEntryPrice}</span>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded p-1">
          <span className="text-[9px] text-slate-500 block">Stop Loss (1.5%)</span>
          <span className="text-rose-400 font-bold">${item.suggestedStopLoss}</span>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded p-1">
          <span className="text-[9px] text-slate-500 block">Take Profit (3.5%)</span>
          <span className="text-emerald-400 font-bold">${item.suggestedTakeProfit}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onTrackSymbol(item.symbol, item.isTracked ? 'untrack' : 'track')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
            item.isTracked
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
              : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
          }`}
          title={item.isTracked ? 'إزالة من المراقبة النشطة' : 'إضافة العملة للمراقبة والقنص النشط'}
        >
          {item.isTracked ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>Tracked in Sniper / قيد المراقبة</span>
            </>
          ) : (
            <>
              <PlusCircle className="h-3.5 w-3.5 text-cyan-400" />
              <span>Track in Sniper / تتبع وقنص</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTriggerTestTrade(item.symbol, item.direction)}
          disabled={isTriggering}
          className={`py-1.5 px-3 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer disabled:opacity-50 ${
            isLong
              ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
              : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border-rose-800'
          }`}
          title={`اختبار تنفيذ صفقة ${item.direction} فورية`}
        >
          {isLong ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          <span>Test {item.direction}</span>
        </button>
      </div>
    </div>
  );
};
