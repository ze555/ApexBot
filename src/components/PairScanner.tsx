import React from 'react';
import { Target, Activity, ShieldCheck, AlertOctagon, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
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
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              INSTITUTIONAL UNIVERSE SCANNER
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                8 TOP LIQUID PAIRS
              </span>
            </h2>
            <p className="text-xs text-slate-400">Spatial Clearance & Multi-Factor Conviction Matrix</p>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Clear Location (&gt;0.25%)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Bad Location (&lt;0.25%)
          </span>
        </div>
      </div>

      {/* Grid of monitored pairs */}
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
                pair.sniperScore >= 80 ? 'border-cyan-500/40 shadow-sm shadow-cyan-500/10' : 'border-slate-800'
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
                      pair.sniperScore >= 80 ? 'text-emerald-400' : pair.sniperScore >= 50 ? 'text-cyan-400' : 'text-slate-400'
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
    </div>
  );
};
