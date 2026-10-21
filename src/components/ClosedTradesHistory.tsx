import React from 'react';
import { History, Award, Shield, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { TradePosition, PlatformStats } from '../types/quant';

interface ClosedTradesHistoryProps {
  trades: TradePosition[];
  stats: PlatformStats;
}

export const ClosedTradesHistory: React.FC<ClosedTradesHistoryProps> = ({ trades, stats }) => {
  const getReasonBadge = (reason?: string) => {
    switch (reason) {
      case 'RUNNER_TRAIL':
        return {
          label: 'RUNNER TRAIL (MAX EXTENSION)',
          color: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        };
      case 'EXHAUSTION_EXIT':
        return {
          label: 'CVD EXHAUSTION (PEAK TOP CATCHER)',
          color: 'bg-cyan-950 text-cyan-300 border-cyan-800',
        };
      case 'TP1_SL':
        return {
          label: 'TP1 + BREAKEVEN FLOOR (+0.20R)',
          color: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        };
      case 'TP2_SL':
        return {
          label: 'TP2 + PROFIT FLOOR (+0.75R)',
          color: 'bg-indigo-950 text-indigo-300 border-indigo-800',
        };
      case 'EARLY_INVALIDATION':
        return {
          label: 'SMART EARLY INVALIDATION CUT (-0.30R)',
          color: 'bg-amber-950 text-amber-300 border-amber-800',
        };
      case 'EMERGENCY_FLATTEN':
        return {
          label: 'EMERGENCY FLATTEN',
          color: 'bg-rose-950 text-rose-300 border-rose-800',
        };
      default:
        return {
          label: 'FULL STOP LOSS (-1.0R)',
          color: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              CLOSED TRADES PERFORMANCE LEDGER
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {trades.length} SETTLED
              </span>
            </h2>
            <p className="text-xs text-slate-400">Institutional Execution Audit & Expectancy Verification</p>
          </div>
        </div>

        {/* Expectancy Metrics Summary */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded">
            <span className="text-[10px] text-slate-400 block">Avg Win / Loss</span>
            <span className="font-bold text-emerald-400">
              +{stats.averageWinR}R <span className="text-slate-400">/</span> <span className="text-rose-400">{stats.averageLossR}R</span>
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded">
            <span className="text-[10px] text-slate-400 block">Capital Saved by Early Cuts</span>
            <span className="font-bold text-cyan-400">+${stats.savedCapitalUsd.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400">
              <th className="pb-2 font-medium">PAIR & SIDE</th>
              <th className="pb-2 font-medium">ENTRY / EXIT</th>
              <th className="pb-2 font-medium">REALIZED PNL</th>
              <th className="pb-2 font-medium">R-MULTIPLE</th>
              <th className="pb-2 font-medium">EXIT MECHANISM</th>
              <th className="pb-2 font-medium">QUALITY RATING</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {trades.map((trade) => {
              const isWin = trade.realizedPnl >= 0;
              const reason = getReasonBadge(trade.closeReason);
              const isLong = trade.side === 'LONG';

              return (
                <tr key={trade.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{trade.symbol}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isLong ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {trade.side}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {trade.exitTime ? new Date(trade.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </span>
                  </td>

                  <td className="py-3 text-slate-300">
                    <div>Entry: ${trade.entryPrice.toLocaleString()}</div>
                    <div className="text-slate-400">Exit: ${trade.exitPrice?.toLocaleString() || trade.currentPrice.toLocaleString()}</div>
                  </td>

                  <td className="py-3">
                    <span className={`font-bold text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}${trade.realizedPnl.toFixed(2)}
                    </span>
                  </td>

                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      trade.currentR >= 0 ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-amber-950/60 text-amber-300 border-amber-800'
                    }`}>
                      {trade.currentR >= 0 ? '+' : ''}{trade.currentR.toFixed(2)}R
                    </span>
                  </td>

                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${reason.color}`}>
                      {reason.label}
                    </span>
                    {trade.notes && (
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs truncate" title={trade.notes}>
                        {trade.notes}
                      </p>
                    )}
                  </td>

                  <td className="py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                      trade.qualityRating === 'EXEMPLARY_SNIPER'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : trade.qualityRating === 'DISCIPLINED_EARLY_CUT'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {trade.qualityRating.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
