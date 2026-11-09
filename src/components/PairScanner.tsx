import React, { useState } from 'react';
import { Target, Activity, ShieldCheck, AlertOctagon, ArrowUpRight, ArrowDownRight, Compass, ChevronDown, ChevronUp } from 'lucide-react';
import { PairMarketState } from '../types/quant';

interface PairScannerProps {
  pairs: PairMarketState[];
  onTriggerTestTrade: (symbol: string, side: 'LONG' | 'SHORT') => void;
  isTriggering: boolean;
}

export const PairScanner: React.FC<PairScannerProps> = ({
  pairs,
  onTriggerTestTrade,
  isTriggering,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const approvedCount = pairs.filter(p => p.lastGateResult.allowed).length;
  const highConvictionCount = pairs.filter(p => p.sniperScore >= 60).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-200 transition-all duration-200">
      {/* Header bar - Clickable to toggle collapse/expand */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 cursor-pointer select-none group"
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              INSTITUTIONAL UNIVERSE SCANNER
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                8 TOP LIQUID PAIRS
              </span>
              {approvedCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse">
                  {approvedCount} AUTHORIZED
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">Spatial Clearance & Multi-Factor Conviction Matrix</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex text-xs text-slate-400 font-mono items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Clear (&gt;0.25%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Bad (&lt;0.25%)
            </span>
          </div>

          {/* Expand/Collapse Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-mono font-medium transition-colors"
            aria-label={isCollapsed ? 'Expand Scanner' : 'Collapse Scanner'}
          >
            {isCollapsed ? (
              <>
                <span>Expand / توسيع</span>
                <ChevronDown className="h-4 w-4 text-cyan-400" />
              </>
            ) : (
              <>
                <span>Collapse / طي</span>
                <ChevronUp className="h-4 w-4 text-cyan-400" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Compact Mini-Bar when Collapsed */}
      {isCollapsed && (
        <div className="mt-3 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {pairs.map((pair) => {
              const isAllowed = pair.lastGateResult.allowed;
              const isHigh = pair.sniperScore >= 60;
              return (
                <div
                  key={pair.symbol}
                  className={`bg-slate-950/80 border rounded-lg p-2 flex flex-col justify-between transition-colors ${
                    isAllowed
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : isHigh
                      ? 'border-cyan-500/40'
                      : 'border-slate-800/80'
                  }`}
                  title={`${pair.symbol}: $${pair.price} | Score: ${pair.sniperScore}% | ${isAllowed ? 'Passed all gates' : pair.lastGateResult.blockedBy}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-white">
                      {pair.symbol.replace('USDT', '')}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isAllowed ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-mono text-[11px] text-cyan-300">
                      ${pair.price >= 1000 ? pair.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : pair.price}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        pair.sniperScore >= 70
                          ? 'text-emerald-400'
                          : pair.sniperScore >= 50
                          ? 'text-cyan-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {pair.sniperScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-right">
            <span className="text-[10px] text-slate-500 font-mono">
              اضغط على "توسيع / Expand" لعرض المقاييس الفضائية الكاملة وتدفق الأوامر
            </span>
          </div>
        </div>
      )}

      {/* Grid of monitored pairs (Only shown when expanded) */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
          {pairs.map((pair) => {
          const isAtRes = pair.spatial.distanceToResistancePct < 0.25;
          const isAtSupp = pair.spatial.distanceToSupportPct < 0.25;
          const isLate = pair.spatial.isLateExpansion;
          const hasGateLock = !pair.lastGateResult.allowed;

          return (
            <div
              key={pair.symbol}
              className={`bg-slate-950/70 border rounded-xl p-3.5 flex flex-col justify-between transition-all hover:border-slate-700 ${
                pair.sniperScore >= 70 && !hasGateLock
                  ? 'border-cyan-500/50 shadow-md shadow-cyan-500/10 bg-slate-900/90 ring-1 ring-cyan-500/30'
                  : pair.sniperScore >= 60
                  ? 'border-slate-700'
                  : 'border-slate-800'
              }`}
            >
              {/* Row 1: Symbol & Price */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base font-mono text-white">{pair.symbol}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        pair.change24h >= 0 ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                      }`}>
                        {pair.change24h >= 0 ? '+' : ''}{pair.change24h}%
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sm text-cyan-300">
                      ${pair.price.toLocaleString()}
                    </span>
                  </div>

                  {/* Conviction Score Pill */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">Sniper Score</span>
                    <span className={`font-mono font-bold text-sm ${
                      pair.sniperScore >= 70 ? 'text-emerald-400' : pair.sniperScore >= 50 ? 'text-cyan-400' : 'text-slate-400'
                    }`}>
                      {pair.sniperScore}%
                    </span>
                  </div>
                </div>

                {/* Spatial Clearance Meter */}
                <div className="mt-3 bg-slate-900/80 border border-slate-800/80 rounded-lg p-2 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>SPATIAL CLEARANCE</span>
                    <span className={`font-bold ${
                      pair.spatial.spatialStatus === 'CLEAR' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {pair.spatial.spatialStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-center mt-1">
                    <div className={`p-1 rounded border ${
                      isAtRes ? 'bg-rose-950/40 text-rose-300 border-rose-800/80' : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}>
                      <span className="text-[9px] text-slate-400 block">Dist to Resist</span>
                      <span className="font-bold">{pair.spatial.distanceToResistancePct.toFixed(2)}%</span>
                    </div>
                    <div className={`p-1 rounded border ${
                      isAtSupp ? 'bg-rose-950/40 text-rose-300 border-rose-800/80' : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}>
                      <span className="text-[9px] text-slate-400 block">Dist to Supp</span>
                      <span className="font-bold">{pair.spatial.distanceToSupportPct.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Technical Indicators: RVOL, ADX, Orderflow */}
                <div className="grid grid-cols-3 gap-1.5 text-center my-2.5 font-mono text-[11px]">
                  <div className="bg-slate-900/70 border border-slate-800 rounded p-1">
                    <span className="text-[9px] text-slate-500 block">RVOL</span>
                    <span className={`font-bold ${pair.rvol >= 2.0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {pair.rvol.toFixed(2)}x
                    </span>
                  </div>
                  <div className="bg-slate-900/70 border border-slate-800 rounded p-1">
                    <span className="text-[9px] text-slate-500 block">ADX(14)</span>
                    <span className={`font-bold ${pair.adx >= 25 ? 'text-cyan-400' : 'text-slate-300'}`}>
                      {pair.adx.toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-slate-900/70 border border-slate-800 rounded p-1">
                    <span className="text-[9px] text-slate-500 block">Flow Bias</span>
                    <span className={`font-bold ${
                      pair.orderflow.orderflowState === 'BULLISH' ? 'text-emerald-400' : pair.orderflow.orderflowState === 'BEARISH' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {pair.orderflow.orderflowState.slice(0, 4)}
                    </span>
                  </div>
                </div>

                {/* Gate Status Pill */}
                <div className="text-[11px]">
                  {hasGateLock ? (
                    <div className="p-1.5 rounded bg-rose-950/40 border border-rose-900 text-rose-300 flex items-center gap-1.5 leading-tight">
                      <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      <span className="truncate" title={pair.lastGateResult.reason}>
                        {pair.lastGateResult.blockedBy}: {pair.lastGateResult.reason}
                      </span>
                    </div>
                  ) : (
                    <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-900 text-emerald-300 flex items-center gap-1.5 leading-tight">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>All Gates Passed: High Conviction Entry Authorized</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action: Test Entry */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-1.5">
                <button
                  onClick={() => onTriggerTestTrade(pair.symbol, 'LONG')}
                  disabled={isTriggering}
                  aria-label={`Test Long ${pair.symbol}`}
                  className="flex-1 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 font-mono text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  <span>Test Long</span>
                </button>
                <button
                  onClick={() => onTriggerTestTrade(pair.symbol, 'SHORT')}
                  disabled={isTriggering}
                  aria-label={`Test Short ${pair.symbol}`}
                  className="flex-1 py-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-mono text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowDownRight className="h-3 w-3" />
                  <span>Test Short</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};

