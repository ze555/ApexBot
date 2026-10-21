import React, { useState } from 'react';
import { X, Sliders, Shield, Zap, Save } from 'lucide-react';
import { PlatformSettings } from '../types/quant';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlatformSettings;
  onSaveSettings: (settings: PlatformSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [form, setForm] = useState<PlatformSettings>({ ...settings });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">QUANTITATIVE PLATFORM SETTINGS</h2>
            <p className="text-xs text-slate-400">Risk Allocation & Execution Governance Parameters</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs font-mono">
          {/* Virtual Capital Control */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="font-bold text-white text-sm block">Virtual Trading Capital</span>
                <span className="text-xs text-cyan-400 block mt-0.5">Initial Paper Account Balance (Default: $1,000)</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="50"
                  max="1000000"
                  step="50"
                  value={form.initialCapital || 1000}
                  onChange={(e) => setForm({ ...form, initialCapital: Math.max(50, parseFloat(e.target.value) || 1000) })}
                  className="w-24 bg-transparent font-bold text-sm text-cyan-300 focus:outline-none text-right font-mono"
                />
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 mr-1">Presets:</span>
              {[500, 1000, 2500, 5000, 10000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setForm({ ...form, initialCapital: preset })}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
                    (form.initialCapital || 1000) === preset
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  ${preset.toLocaleString()}{preset === 1000 ? ' (Default)' : ''}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              Base paper balance. Risk per trade (1% of ${(form.initialCapital || 1000).toLocaleString()} = ${((form.initialCapital || 1000) * (form.riskPerTradePct / 100)).toFixed(2)}) scales dynamically.
            </p>
          </div>

          {/* Auto Execution */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <span className="font-bold text-white block">Auto Sniper Execution</span>
              <span className="text-[11px] text-slate-400">Automatically open trade when all gates pass</span>
            </div>
            <input
              type="checkbox"
              checked={form.autoExecution}
              onChange={(e) => setForm({ ...form, autoExecution: e.target.checked })}
              className="h-5 w-5 rounded accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Simulation Mode */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <span className="font-bold text-white block">Institutional Simulation Mode</span>
              <span className="text-[11px] text-slate-400">Paper trade with real Binance tick data & math</span>
            </div>
            <input
              type="checkbox"
              checked={form.simulationMode}
              onChange={(e) => setForm({ ...form, simulationMode: e.target.checked })}
              className="h-5 w-5 rounded accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Risk Per Trade */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Risk Per Trade Allocation (%):</span>
              <span className="font-bold text-cyan-400">{form.riskPerTradePct}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.25"
              value={form.riskPerTradePct}
              onChange={(e) => setForm({ ...form, riskPerTradePct: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">
              Choppy regimes automatically reduce this by 50% (0.50x regime multiplier).
            </span>
          </div>

          {/* Maximum Leverage Cap */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <div>
                <span className="text-white font-bold block">Institutional Leverage Cap (الرافعة المالية القصوى)</span>
                <span className="text-[11px] text-slate-400">Controls maximum notional exposure per trade</span>
              </div>
              <span className="font-bold text-sm font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {form.maxLeverage || 5}x MAX
              </span>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 flex-wrap my-2">
              {[1, 2, 3, 5, 10, 20].map((lev) => (
                <button
                  key={lev}
                  type="button"
                  onClick={() => setForm({ ...form, maxLeverage: lev })}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
                    (form.maxLeverage || 5) === lev
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {lev}x{lev === 5 ? ' (Recommended)' : lev === 1 ? ' (Spot)' : ''}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Institutional quantitative sizing computes effective leverage based on your exact Stop Loss distance so you never lose more than {form.riskPerTradePct}% ($10 on $1,000). The leverage cap ensures total position size never exceeds {form.maxLeverage || 5}x of your account balance.
            </p>
          </div>

          {/* Daily Circuit Breaker Threshold */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Daily Circuit Breaker Freeze Threshold:</span>
              <span className="font-bold text-rose-400">{form.circuitBreakerPct}%</span>
            </div>
            <input
              type="range"
              min="-5.0"
              max="-1.5"
              step="0.5"
              value={form.circuitBreakerPct}
              onChange={(e) => setForm({ ...form, circuitBreakerPct: parseFloat(e.target.value) })}
              className="w-full accent-rose-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">
              If daily portfolio drawdown hits this level, all new entries are frozen for 24h.
            </span>
          </div>

          {/* Max Open Positions */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Max Concurrent Positions:</span>
              <span className="font-bold text-white">{form.maxOpenPositions}</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={form.maxOpenPositions}
              onChange={(e) => setForm({ ...form, maxOpenPositions: parseInt(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Save className="h-4 w-4" />
              <span>Save Parameters</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
