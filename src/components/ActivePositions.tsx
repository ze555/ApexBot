import React from 'react';
import { Crosshair, Lock, ArrowUpRight, ArrowDownRight, ShieldCheck, Zap, Activity } from 'lucide-react';
import { TradePosition } from '../types/quant';

interface ActivePositionsProps {
  positions: TradePosition[];
}

export const ActivePositions: React.FC<ActivePositionsProps> = ({ positions }) => {
  const getStageBadge = (stage: TradePosition['stage']) => {
    switch (stage) {
      case 'STAGE_INITIAL':
        return {
          label: 'STAGE 1: SCOUTING ENTRY',
          desc: 'Full size open. Early invalidation guard armed at -0.30R.',
          color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        };
      case 'STAGE_TP1_LOCKED':
        return {
          label: 'TP1 SECURED: BREAKEVEN LOCKED',
          desc: '40% banked at +0.75R. SL at +0.20R guaranteed risk-free floor!',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'STAGE_TP2_EXPANDED':
        return {
          label: 'TP2 SECURED: PROFIT FLOOR +0.75R',
          desc: '75% banked. SL moved to +0.75R profit floor. 25% runner active.',
          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        };
      case 'STAGE_RUNNER_TRAILING':
        return {
          label: 'STAGE 3: RUNNER ADAPTIVE ATR TRAIL',
          desc: 'Trailing remaining 25% using dynamic volatility ATR stop.',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
    }
  };

  // Convert R-multiple to horizontal percentage for gauge (-1.0R to +3.5R)
  const calculateRGaugePct = (currentR: number) => {
    const minR = -1.0;
    const maxR = 3.5;
    const clamped = Math.max(minR, Math.min(maxR, currentR));
    return ((clamped - minR) / (maxR - minR)) * 100;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Crosshair className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              ACTIVE SNIPER POSITIONS
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                {positions.length} ACTIVE
              </span>
            </h2>
            <p className="text-xs text-slate-400">Tick-by-Tick Mark-to-Market with Dynamic Multi-Stage Exits</p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-slate-400 block font-mono uppercase">Total Active Unrealized</span>
          <span className="font-mono font-bold text-sm text-emerald-400">
            +${positions.reduce((sum, p) => sum + p.unrealizedPnl, 0).toFixed(2)}
          </span>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
          <p className="text-sm font-medium text-slate-400">No active positions open.</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Apex Sniper Engine is continuously scanning pairs. Entries only trigger when 100% of institutional gates align.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {positions.map((pos) => {
            const stageInfo = getStageBadge(pos.stage);
            const isLong = pos.side === 'LONG';
            const gaugePct = calculateRGaugePct(pos.currentR);
            const totalTradePnl = pos.realizedPnl + pos.unrealizedPnl;

            return (
              <div
                key={pos.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700 shadow-md"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-base font-mono text-white">{pos.symbol}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                      isLong ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {pos.side}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 shadow-sm">
                      {pos.leverage || 2.5}x LEVERAGE
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${stageInfo.color}`}>
                      {stageInfo.label}
                    </span>
                  </div>

                  {/* Mark-to-Market PnL & R Multiple */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">Current R-Multiple</span>
                      <span className={`font-mono font-bold text-sm ${pos.currentR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pos.currentR >= 0 ? '+' : ''}{pos.currentR.toFixed(2)}R
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">Total Trade PnL</span>
                      <span className={`font-mono font-bold text-base ${totalTradePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalTradePnl >= 0 ? '+' : ''}${totalTradePnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price & Quantity Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-xs font-mono">
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">Entry Price</span>
                    <span className="font-bold text-white">${pos.entryPrice.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">Mark Price</span>
                    <span className="font-bold text-cyan-300">${pos.currentPrice.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">Active Stop Loss</span>
                    <span className={`font-bold flex items-center gap-1 ${pos.stage !== 'STAGE_INITIAL' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {pos.stage !== 'STAGE_INITIAL' && <Lock className="h-3 w-3" />}
                      ${pos.stopLoss.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2">
                    <span className="text-[10px] text-slate-400 block">Quantity Remaining</span>
                    <span className="font-bold text-slate-200">
                      {pos.currentQuantity.toFixed(2)} / {pos.initialQuantity.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Visual R-Multiple Target Gauge */}
                <div className="mt-3 bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                    <span>MULTI-STAGE R TARGET GAUGE</span>
                    <span className="text-slate-300">Peak R: <strong className="text-cyan-400">+{pos.peakR.toFixed(2)}R</strong></span>
                  </div>

                  {/* Horizontal Gauge Bar */}
                  <div className="relative h-4 bg-slate-800 rounded-full overflow-visible my-2">
                    {/* Zone markers */}
                    {/* Early Invalidation zone (-0.30R to -0.35R) */}
                    <div 
                      className="absolute top-0 bottom-0 bg-amber-500/30 border-r border-amber-500/80" 
                      style={{ left: `${calculateRGaugePct(-0.35)}%`, width: `${calculateRGaugePct(-0.30) - calculateRGaugePct(-0.35)}%` }}
                      title="Early Invalidation Cut Zone (-0.30R to -0.35R)"
                    />
                    {/* Breakeven floor (+0.20R) */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-10" 
                      style={{ left: `${calculateRGaugePct(0.20)}%` }}
                      title="Guaranteed Risk-Free Floor (+0.20R)"
                    />
                    {/* TP1 (+0.75R) */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10" 
                      style={{ left: `${calculateRGaugePct(0.75)}%` }}
                      title="TP1 (+0.75R) - 40% Closed"
                    />
                    {/* TP2 (+1.80R) */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 z-10" 
                      style={{ left: `${calculateRGaugePct(1.80)}%` }}
                      title="TP2 (+1.80R) - 35% Closed"
                    />
                    {/* Runner (+3.5R) */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10" 
                      style={{ left: `${calculateRGaugePct(3.50)}%` }}
                      title="Runner Stage (+3.50R)"
                    />

                    {/* Active Needle Indicator */}
                    <div
                      className="absolute -top-1.5 bottom-0 w-3 h-7 bg-white rounded shadow-lg shadow-white/40 transform -translate-x-1/2 z-20 border border-slate-900 transition-all duration-300"
                      style={{ left: `${gaugePct}%` }}
                    />
                  </div>

                  {/* Labels under the gauge */}
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                    <span className="text-rose-400 font-semibold">-1.0R (Full SL)</span>
                    <span className="text-amber-400 font-semibold">-0.30R (Early Cut)</span>
                    <span className="text-slate-400">0.0R</span>
                    <span className="text-emerald-400 font-semibold">+0.20R (BE Lock)</span>
                    <span className="text-cyan-400 font-semibold">+0.75R (TP1 40%)</span>
                    <span className="text-indigo-400 font-semibold">+1.80R (TP2 35%)</span>
                    <span className="text-amber-400 font-semibold">+3.5R (Runner)</span>
                  </div>
                </div>

                {/* Partial Closes Log or Protection Note */}
                <div className="mt-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {pos.stage !== 'STAGE_INITIAL' ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Zap className="h-4 w-4 text-cyan-400 shrink-0" />
                    )}
                    <span className="text-slate-300 font-medium">{stageInfo.desc}</span>
                  </div>
                  {pos.partialCloses.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      {pos.partialCloses.map((pc, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                          {pc.stage}: +${pc.pnlUsd} (+{pc.pnlR}R)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
