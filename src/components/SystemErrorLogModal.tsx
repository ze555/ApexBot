import React, { useState } from 'react';
import {
  X,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Terminal,
  Trash2,
  Copy,
  RefreshCw,
  Search,
  Wifi,
  Cpu,
  ShieldAlert,
  Bug,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SystemErrorLog, SystemHealthState, ErrorSeverity } from '../types/quant';

interface SystemErrorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: SystemErrorLog[];
  health: SystemHealthState;
  onClearErrors: () => void;
  onSimulateError: (type: 'RATE_LIMIT' | 'FEED_TIMEOUT' | 'CALC_GUARD') => void;
  onPingFeed: () => void;
  isPinging: boolean;
}

export const SystemErrorLogModal: React.FC<SystemErrorLogModalProps> = ({
  isOpen,
  onClose,
  errors,
  health,
  onClearErrors,
  onSimulateError,
  onPingFeed,
  isPinging,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filteredErrors = errors.filter((err) => {
    if (filterSeverity === 'CRITICAL' && err.severity !== 'FATAL' && err.severity !== 'ERROR') return false;
    if (filterSeverity === 'WARN' && err.severity !== 'WARN') return false;
    if (filterSeverity === 'RECOVERED' && !err.autoRecovered) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        err.code.toLowerCase().includes(q) ||
        err.message.toLowerCase().includes(q) ||
        err.subsystem.toLowerCase().includes(q) ||
        (err.details && err.details.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCopyDiagnosticReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      systemHealth: health,
      totalErrors: errors.length,
      errors: errors,
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getSeverityBadge = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'FATAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 shadow-sm shadow-rose-900/40">
            <AlertOctagon className="h-3 w-3 text-rose-400" />
            FATAL
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-300 border border-red-500/40 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-red-400" />
            ERROR
          </span>
        );
      case 'WARN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            WARN
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
            <Info className="h-3 w-3 text-cyan-400" />
            INFO
          </span>
        );
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col text-slate-200 shadow-2xl relative my-auto overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 shrink-0 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              health.activeErrorsCount > 0 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  SYSTEM ERROR & DIAGNOSTICS HUB
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-sans font-semibold bg-slate-800 text-slate-300 border border-slate-700" dir="rtl" style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}>
                  سجل أخطاء وتشخيص النظام
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Institutional runtime error surveillance, API feed diagnostics & recovery ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Real-time Subsystem Health Monitor Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 p-4 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Overall System State</span>
              <span className={`font-bold flex items-center gap-1.5 mt-0.5 ${
                health.status === 'OPERATIONAL'
                  ? 'text-emerald-400'
                  : health.status === 'DEGRADED'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                <span className={`h-2 w-2 rounded-full ${health.status === 'OPERATIONAL' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                {health.status}
              </span>
            </div>
            <Cpu className="h-4 w-4 text-slate-500" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Feed Latency</span>
              <span className="font-bold text-cyan-300 mt-0.5 block">
                {health.feedLatencyMs} ms
              </span>
            </div>
            <Wifi className="h-4 w-4 text-cyan-500/70" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Active / Unresolved</span>
              <span className={`font-bold mt-0.5 block ${health.activeErrorsCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {health.activeErrorsCount} error{health.activeErrorsCount === 1 ? '' : 's'}
              </span>
            </div>
            <ShieldAlert className={`h-4 w-4 ${health.activeErrorsCount > 0 ? 'text-rose-400' : 'text-slate-600'}`} />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Total Captured</span>
              <span className="font-bold text-slate-300 mt-0.5 block">
                {health.totalErrorsLogged} logs
              </span>
            </div>
            <Bug className="h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800/80 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-mono mr-1">Filter:</span>
            {[
              { id: 'ALL', label: `ALL (${errors.length})` },
              { id: 'CRITICAL', label: `CRITICAL (${errors.filter(e => e.severity === 'FATAL' || e.severity === 'ERROR').length})` },
              { id: 'WARN', label: `WARNINGS (${errors.filter(e => e.severity === 'WARN').length})` },
              { id: 'RECOVERED', label: `AUTO-RECOVERED (${errors.filter(e => e.autoRecovered).length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterSeverity(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer border ${
                  filterSeverity === f.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search error code or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-52 sm:w-64 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Error Log Stream */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-2.5 text-xs font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {filteredErrors.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center mb-3 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                NO CRITICAL ERRORS ACTIVE
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-sans">
                لا توجد أخطاء حرجة مسجلة حالياً. جميع آليات النظام واتصالات منصة Binance Futures تعمل بكفاءة وبدون تعليق.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onSimulateError('RATE_LIMIT')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer border border-slate-700 flex items-center gap-1.5"
                >
                  <Bug className="h-3.5 w-3.5 text-amber-400" />
                  <span>محاكاة خطأ تجريبي (Test Error)</span>
                </button>
              </div>
            </div>
          ) : (
            filteredErrors.map((err) => {
              const isExpanded = expandedId === err.id;
              return (
                <div
                  key={err.id}
                  className={`rounded-xl border transition-all ${
                    err.severity === 'FATAL'
                      ? 'bg-rose-950/20 border-rose-800/60'
                      : err.severity === 'ERROR'
                      ? 'bg-red-950/15 border-red-800/50'
                      : err.severity === 'WARN'
                      ? 'bg-amber-950/15 border-amber-800/40'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : err.id)}
                    className="p-3.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-white/[0.02]"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{getSeverityBadge(err.severity)}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white font-mono text-xs">
                            {err.code}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
                            {err.subsystem}
                          </span>
                          {err.autoRecovered && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              AUTO-RECOVERED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 font-sans leading-relaxed">
                          {err.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-slate-400 font-mono shrink-0 pl-7 sm:pl-0">
                      <div className="text-right">
                        <div>{formatTime(err.timestamp)}</div>
                        <div className="text-[10px] text-slate-500">{timeAgo(err.timestamp)}</div>
                      </div>
                      <div className="p-1 rounded bg-slate-800/60 text-slate-400">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Technical Diagnostics Drawer */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-950/60 rounded-b-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                        <span className="text-cyan-400 font-bold uppercase tracking-wider">Technical Diagnostic Trace & Payload:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(JSON.stringify(err, null, 2));
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copy Trace</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-black/80 border border-slate-800 text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                        {err.details || `ID: ${err.id}\nTimestamp: ${new Date(err.timestamp).toISOString()}\nStatus: ${err.status}\nAutoRecovered: ${err.autoRecovered ?? false}\nSubsystem: ${err.subsystem}`}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 border-t border-slate-800 shrink-0 bg-slate-950 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Simulation Options */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
              <span className="text-[10px] text-slate-400 font-mono">Simulate Error:</span>
              <button
                type="button"
                onClick={() => onSimulateError('FEED_TIMEOUT')}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer border border-slate-700"
                title="Simulate a 3.5s feed timeout with graceful cache recovery"
              >
                API Timeout
              </button>
              <button
                type="button"
                onClick={() => onSimulateError('RATE_LIMIT')}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-rose-300 cursor-pointer border border-slate-700"
                title="Simulate HTTP 429 rate limit guard"
              >
                Rate Limit 429
              </button>
              <button
                type="button"
                onClick={() => onSimulateError('CALC_GUARD')}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer border border-slate-700"
                title="Simulate spatial calculation boundary check"
              >
                Calc Guard
              </button>
            </div>

            {/* Test Ping */}
            <button
              type="button"
              onClick={onPingFeed}
              disabled={isPinging}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Ping Binance Feed</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDiagnosticReport}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copied ? 'Copied JSON!' : 'Copy Diagnostic Report'}</span>
            </button>

            {errors.length > 0 && (
              <button
                type="button"
                onClick={onClearErrors}
                className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer border border-rose-800/60 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Logs</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
