import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Filter, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { AuditLog } from '../types/quant';

interface ForensicAuditLogProps {
  logs: AuditLog[];
}

export const ForensicAuditLog: React.FC<ForensicAuditLogProps> = ({ logs }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    if (filter === 'APPROVED') return log.status === 'APPROVED';
    if (filter === 'BAD_LOCATION') return log.gate === 'BAD_LOCATION';
    if (filter === 'REGIME_LOCK') return log.gate === 'REGIME_LOCK';
    if (filter === 'FLOW_CONFLICT') return log.gate === 'CONFLICTED_ORDERFLOW';
    return true;
  });

  const getGateBadgeStyle = (gate: string, status: string) => {
    if (status === 'APPROVED') {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
    }
    switch (gate) {
      case 'REGIME_LOCK':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'BAD_LOCATION':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'LATE_EXPANSION':
        return 'bg-orange-950/80 text-orange-300 border-orange-800';
      case 'RANGE_LONG_TRAP':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'DEAD_CHOP':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'CONFLICTED_ORDERFLOW':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              FORENSIC REJECTION AUDIT LOG
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                LIVE GATES FEED
              </span>
            </h2>
            <p className="text-xs text-slate-400">Zero-Exception Deterministic Safety Gate Verification</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {['ALL', 'APPROVED', 'BAD_LOCATION', 'REGIME_LOCK', 'FLOW_CONFLICT'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer border ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed */}
      <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No audit records matching filter "{filter}".
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            const timeAgo = Math.round((Date.now() - log.timestamp) / 1000);
            const timeStr = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;

            return (
              <div
                key={log.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 transition-all hover:border-slate-700"
              >
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">
                      {log.status === 'APPROVED' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-white">{log.symbol}</span>
                        <span className="text-[10px] font-mono px-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {log.side}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${getGateBadgeStyle(log.gate, log.status)}`}>
                          {log.gate}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">{timeStr}</span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 font-medium leading-snug">
                        {log.headline}
                      </p>
                    </div>
                  </div>

                  <button className="text-slate-500 hover:text-slate-300 p-1">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Expanded Forensic Evidence Card */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 bg-slate-900/50 rounded p-2 text-xs">
                    <p className="text-slate-300 text-xs mb-2 leading-relaxed">
                      <strong className="text-cyan-400">Forensic Rule Analysis: </strong>
                      {log.reason}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-950/80 p-2 rounded border border-slate-800">
                      <div>
                        <span className="text-slate-500 block">Asset Price</span>
                        <span className="text-white font-bold">${log.metricsSnapshot.price}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Dist to Resistance</span>
                        <span className={`font-bold ${log.metricsSnapshot.distResPct < 0.25 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {log.metricsSnapshot.distResPct.toFixed(2)}% {log.metricsSnapshot.distResPct < 0.25 ? '⚠️ BLOCK' : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">RVOL / ADX</span>
                        <span className="text-cyan-300 font-bold">
                          {log.metricsSnapshot.rvol.toFixed(2)}x / {log.metricsSnapshot.adx.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">CVD 15m Slope</span>
                        <span className={`font-bold ${log.metricsSnapshot.cvdSlope15m >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {log.metricsSnapshot.cvdSlope15m > 0 ? '+' : ''}{log.metricsSnapshot.cvdSlope15m}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
