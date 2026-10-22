import React from 'react';
import {
  Shield,
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sliders,
  HelpCircle,
  Play,
  Pause,
} from 'lucide-react';
import { BTCContext, PlatformStats, PlatformSettings } from '../types/quant';

interface HeaderProps {
  btcContext: BTCContext;
  stats: PlatformStats;
  settings: PlatformSettings;
  onUpdateSettings: (newSettings: Partial<PlatformSettings>) => void;
  onEmergencyFlatten: () => void;
  onOpenSettings: () => void;
  onOpenExpectancy: () => void;
  onManualScan: () => void;
  onResetCircuitBreaker: () => void;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  btcContext,
  stats,
  settings,
  onUpdateSettings,
  onEmergencyFlatten,
  onOpenSettings,
  onOpenExpectancy,
  onManualScan,
  onResetCircuitBreaker,
  isScanning,
}) => {
  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'BULL_STRONG':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'BULL_WEAK':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'BEAR_STRONG':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'BEAR_WEAK':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-3 sticky top-0 z-30 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Brand & Status */}
        <div className="flex items-center justify-between lg:justify-start gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wide text-white">APEX<span className="text-cyan-400">QUANT</span></span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                  SNIPER v4.2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Institutional Quantitative Engine & Deep Reasoning</p>
            </div>
          </div>

          {/* Engine status indicator */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">
            <span className={`h-2 w-2 rounded-full ${stats.circuitBreakerTripped ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400 animate-ping'}`} />
            <span className="text-slate-300 font-mono text-[11px]">
              {stats.circuitBreakerTripped ? 'CIRCUIT TRIPPED' : 'LIVE 5s MARK-TO-MARKET'}
            </span>
          </div>
        </div>

        {/* Real-time BTC Compass Ticker */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs">
          {/* BTC Price & Regime */}
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2.5">
            <span className="text-slate-400 font-mono font-medium">BTC/USDT</span>
            <span className="font-mono font-bold text-sm text-white">
              ${btcContext.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className={`text-[11px] font-mono px-1 rounded ${btcContext.change24h >= 0 ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'}`}>
              {btcContext.change24h >= 0 ? '+' : ''}{btcContext.change24h}%
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getRegimeColor(btcContext.regime)}`}>
              {btcContext.regime}
            </span>
          </div>

          {/* Virtual Capital Badge (Default $1,000, Editable) */}
          <div 
            onClick={onOpenSettings}
            className="bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
            title="Click to edit virtual trading capital in Settings / اضغط لتعديل رأس المال الافتراضي"
          >
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-mono flex items-center gap-1">
                <span>VIRTUAL CAPITAL</span>
                <span className="text-cyan-400 text-[9px]">✎</span>
              </span>
              <span className="font-mono font-bold text-xs text-white">
                ${stats.portfolioBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              ${(settings.initialCapital || 1000).toLocaleString()} base
            </span>
          </div>

          {/* 24h PnL & Win Rate (3:1 Edge Highlight) */}
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Today PnL</span>
              <span className={`font-mono font-bold text-xs ${stats.dailyTotalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.dailyTotalPnl >= 0 ? '+' : ''}${stats.dailyTotalPnl.toFixed(2)}
              </span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Win Ratio</span>
              <span className="font-mono font-bold text-xs text-cyan-400 flex items-center gap-1">
                {stats.winRatePct}% <span className="text-[10px] text-slate-400">({stats.winningTrades}W/{stats.losingTrades}L)</span>
              </span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Expectancy</span>
              <span className="font-mono font-bold text-xs text-amber-400">
                {stats.profitFactor}x PF
              </span>
            </div>
          </div>

          {/* Circuit Breaker Status */}
          <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-mono ${
            stats.circuitBreakerTripped 
              ? 'bg-rose-950/40 text-rose-300 border-rose-800' 
              : 'bg-slate-950/70 text-slate-300 border-slate-800'
          }`}>
            <Shield className={`h-3.5 w-3.5 ${stats.circuitBreakerTripped ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
            <span>
              {stats.circuitBreakerTripped 
                ? 'CIRCUIT TRIPPED (-3%)' 
                : `SHIELD (${stats.dailyDrawdownPct.toFixed(2)}% / ${settings.circuitBreakerPct}%)`}
            </span>
            {stats.circuitBreakerTripped && (
              <button
                onClick={onResetCircuitBreaker}
                className="ml-1 text-[10px] px-1.5 py-0.5 bg-rose-800 hover:bg-rose-700 text-white rounded cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Interactive Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <button
            onClick={() => onUpdateSettings({ autoExecution: !settings.autoExecution })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
              settings.autoExecution
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {settings.autoExecution ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{settings.autoExecution ? 'AUTO SNIPER: ON' : 'AUTO SNIPER: OFF'}</span>
          </button>

          {/* Manual Scan */}
          <button
            onClick={onManualScan}
            disabled={isScanning}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
            title="Scan pairs now"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Scan</span>
          </button>

          {/* 3:1 Math Explainer */}
          <button
            onClick={onOpenExpectancy}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
            title="3:1 Quantitative Win/Loss Mathematical Edge"
          >
            <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline font-mono">3:1 Math Edge</span>
          </button>

          {/* Active Leverage Cap Badge */}
          <button
            onClick={onOpenSettings}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-800 text-indigo-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Institutional Leverage Cap (Click to adjust in Settings) / اضغط لتعديل الرافعة المالية"
          >
            <span className="text-[10px] text-indigo-400 font-mono hidden sm:inline">MAX</span>
            <span>{settings.maxLeverage || 5}x LEV</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
            title="Platform Settings"
          >
            <Sliders className="h-4 w-4" />
          </button>

          {/* Emergency Flatten */}
          <button
            onClick={onEmergencyFlatten}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-rose-100 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
            title="Close all positions at market price"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            <span>FLATTEN</span>
          </button>
        </div>
      </div>
    </header>
  );
};
