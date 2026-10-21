import React from 'react';
import { Compass, TrendingUp, TrendingDown, Layers, Waves, AlertCircle, BarChart3 } from 'lucide-react';
import { BTCContext } from '../types/quant';

interface BTCCompassProps {
  btcContext: BTCContext;
}

export const BTCCompass: React.FC<BTCCompassProps> = ({ btcContext }) => {
  const getOIExplanation = (classification: string) => {
    switch (classification) {
      case 'TRUE_ACCUMULATION':
        return {
          title: 'Whale Accumulation (Institutional Buy)',
          desc: 'Price Up + OI Up: Fresh capital aggressively expanding long exposure.',
          color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
        };
      case 'SHORT_COVERING':
        return {
          title: 'Short Squeeze / Short Covering',
          desc: 'Price Up + OI Down: Trapped shorts capitulating and closing, rather than organic buying.',
          color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80',
        };
      case 'AGGRESSIVE_DISTRIBUTION':
        return {
          title: 'Institutional Distribution (Short Buildup)',
          desc: 'Price Down + OI Up: Heavy institutional short positioning pushing price down.',
          color: 'text-rose-400 bg-rose-950/60 border-rose-800/80',
        };
      case 'LONG_LIQUIDATION':
        return {
          title: 'Cascade Liquidation / Long Flush',
          desc: 'Price Down + OI Down: Overleveraged longs flushed out into orderbook bids.',
          color: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
        };
      default:
        return {
          title: 'Neutral Orderflow',
          desc: 'Balanced passive limit orders and standard liquidity cycling.',
          color: 'text-slate-400 bg-slate-800/60 border-slate-700',
        };
    }
  };

  const oiInfo = getOIExplanation(btcContext.oiClassification);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-200">
      {/* Title & Compass Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              BTC MASTER COMPASS & WHALE ORDERFLOW
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                15m/1h/4h FUSION
              </span>
            </h2>
            <p className="text-xs text-slate-400">Institutional Market Regime Anchor & Macro Trend Governor</p>
          </div>
        </div>

        {/* Dynamic Risk Allocation Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 ${
            btcContext.regimeRiskMult === 1.0 
              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/70' 
              : 'bg-amber-950/50 text-amber-300 border-amber-800/70'
          }`}>
            <span>RISK MULTIPLIER:</span>
            <span className="font-bold text-white">{btcContext.regimeRiskMult.toFixed(2)}x</span>
            <span className="text-[10px] opacity-80">
              ({btcContext.regimeRiskMult === 1.0 ? 'Full Normal Sizing' : '50% Scaled Down Choppy Size'})
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Regime Indicators & Whale Orderflow */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        {/* Metric 1: Structural Moving Averages */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>EMA50 / EMA200 ALIGNMENT</span>
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-bold text-lg text-white">
              ${btcContext.price.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-emerald-400">
              &gt; EMA50 (${btcContext.ema50.toLocaleString()})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>EMA200: <strong className="text-slate-200">${btcContext.ema200.toLocaleString()}</strong></span>
            <span className="text-emerald-400 font-semibold font-mono">
              {btcContext.price > btcContext.ema50 && btcContext.ema50 > btcContext.ema200 ? 'BULL STRUCTURE' : 'TRANSITION'}
            </span>
          </div>
        </div>

        {/* Metric 2: Directional Momentum ADX */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>DIRECTIONAL ADX (14)</span>
            <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono font-bold text-lg ${btcContext.adx >= 25 ? 'text-cyan-400' : 'text-slate-300'}`}>
              {btcContext.adx.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {btcContext.adx >= 25 ? 'STRONG TREND (>25)' : 'WEAK MOMENTUM (<25)'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between font-mono">
            <span className="text-emerald-400">DI+: {btcContext.plusDI.toFixed(1)}</span>
            <span className="text-rose-400">DI-: {btcContext.minusDI.toFixed(1)}</span>
            <span className="text-slate-300">RVOL: {btcContext.rvol.toFixed(2)}x</span>
          </div>
        </div>

        {/* Metric 3: Whale Cumulative Volume Delta (CVD) Slopes */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>WHALE CVD SLOPES (5m/15m/4h)</span>
            <Waves className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center my-1 font-mono">
            <div className="bg-slate-900 border border-slate-800 rounded p-1">
              <span className="text-[10px] text-slate-500 block">5m Slope</span>
              <span className={`text-xs font-bold ${btcContext.cvdSlope5m >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {btcContext.cvdSlope5m > 0 ? '+' : ''}{btcContext.cvdSlope5m}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded p-1">
              <span className="text-[10px] text-slate-500 block">15m Slope</span>
              <span className={`text-xs font-bold ${btcContext.cvdSlope15m >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {btcContext.cvdSlope15m > 0 ? '+' : ''}{btcContext.cvdSlope15m}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded p-1">
              <span className="text-[10px] text-slate-500 block">4h Slope</span>
              <span className={`text-xs font-bold ${btcContext.cvdSlope4h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {btcContext.cvdSlope4h > 0 ? '+' : ''}{btcContext.cvdSlope4h}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Taker Ratio: <strong className="text-cyan-300">{btcContext.takerBuySellRatio}x</strong></span>
            <span>Funding: <strong className="text-slate-300">{(btcContext.fundingRate * 100).toFixed(4)}%</strong></span>
          </div>
        </div>

        {/* Metric 4: Institutional Open Interest (OI) Classification */}
        <div className={`border rounded-lg p-3 ${oiInfo.color}`}>
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="font-bold">OPEN INTEREST (OI) DYNAMICS</span>
            <span className="text-[11px] font-bold">
              {btcContext.oiChgPct >= 0 ? '+' : ''}{btcContext.oiChgPct.toFixed(2)}%
            </span>
          </div>
          <p className="font-bold text-xs mt-1 text-white">{oiInfo.title}</p>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">{oiInfo.desc}</p>
        </div>
      </div>

      {/* Macro Regime Policy Banner */}
      <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300">
            <strong className="text-white">Active Macro Policy: </strong>
            {btcContext.regimeDescription}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
          {btcContext.regime.includes('BULL') && (
            <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
              🚫 STRICT BULL BLOCKER: 100% SHORTS BANNED
            </span>
          )}
          {btcContext.regime.includes('BEAR') && (
            <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
              🚫 STRICT BEAR BLOCKER: 100% LONGS BANNED
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
