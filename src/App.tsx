import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BTCCompass } from './components/BTCCompass';
import { ActivePositions } from './components/ActivePositions';
import { PairScanner } from './components/PairScanner';
import { ForensicAuditLog } from './components/ForensicAuditLog';
import { ClosedTradesHistory } from './components/ClosedTradesHistory';
import { ExpectancyMathModal } from './components/ExpectancyMathModal';
import { SettingsModal } from './components/SettingsModal';
import {
  BTCContext,
  PairMarketState,
  TradePosition,
  AuditLog,
  PlatformStats,
  PlatformSettings,
} from './types/quant';

export default function App() {
  const [btcContext, setBtcContext] = useState<BTCContext>({
    price: 68450,
    change24h: 2.45,
    ema50: 67200,
    ema200: 65100,
    adx: 29.4,
    plusDI: 28.2,
    minusDI: 14.1,
    rvol: 1.45,
    regime: 'BULL_STRONG',
    regimeDescription: 'Dominant Institutional Bull Trend (Price > EMA50 > EMA200, ADX > 25). Strict Short Blocker Engaged.',
    regimeRiskMult: 1.0,
    cvdSlope5m: 85.4,
    cvdSlope15m: 142.1,
    cvdSlope4h: 230.8,
    oiChgPct: 2.15,
    oiClassification: 'TRUE_ACCUMULATION',
    takerBuySellRatio: 1.28,
    fundingRate: 0.0001,
    lastUpdated: Date.now(),
  });

  const [pairs, setPairs] = useState<PairMarketState[]>([]);
  const [activePositions, setActivePositions] = useState<TradePosition[]>([]);
  const [closedTrades, setClosedTrades] = useState<TradePosition[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<PlatformStats>({
    portfolioBalance: 1044.90,
    startOfDayBalance: 1000,
    dailyRealizedPnl: 36.50,
    dailyUnrealizedPnl: 8.40,
    dailyTotalPnl: 44.90,
    dailyDrawdownPct: 0,
    circuitBreakerTripped: false,
    circuitBreakerThresholdPct: -3.0,
    totalTrades: 12,
    winningTrades: 9,
    losingTrades: 3,
    winRatePct: 75.0,
    totalRealizedR: 12.85,
    averageWinR: 1.62,
    averageLossR: -0.34,
    profitFactor: 3.85,
    savedCapitalUsd: 48.00,
  });

  const [settings, setSettings] = useState<PlatformSettings>({
    initialCapital: 1000,
    autoExecution: true,
    simulationMode: true,
    riskPerTradePct: 1.0,
    maxLeverage: 5,
    maxOpenPositions: 4,
    scanIntervalSeconds: 5,
    circuitBreakerPct: -3.0,
    trailingStopMultiplier: 1.5,
  });

  const [isExpectancyOpen, setIsExpectancyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 6000);
  };

  // Poll backend endpoints
  const fetchAllData = useCallback(async () => {
    try {
      const [btcRes, pairsRes, posRes, tradesRes, logsRes, statsRes, settingsRes] = await Promise.all([
        fetch('/api/market-context'),
        fetch('/api/pairs'),
        fetch('/api/positions'),
        fetch('/api/trades'),
        fetch('/api/audit-logs'),
        fetch('/api/stats'),
        fetch('/api/settings'),
      ]);

      if (btcRes.ok) setBtcContext(await btcRes.json());
      if (pairsRes.ok) setPairs(await pairsRes.json());
      if (posRes.ok) setActivePositions(await posRes.json());
      if (tradesRes.ok) setClosedTrades(await tradesRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch {
      // Quiet background retry
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Actions
  const handleUpdateSettings = async (newSettings: Partial<PlatformSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        if (data.stats) setStats(data.stats);
        showNotification('Settings updated successfully.', 'success');
        fetchAllData();
      }
    } catch {
      showNotification('Failed to update settings.', 'error');
    }
  };

  const handleEmergencyFlatten = async () => {
    try {
      const res = await fetch('/api/emergency-flatten', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showNotification(`Emergency Flatten Complete: Closed ${data.closedCount} positions.`, 'info');
        fetchAllData();
      }
    } catch {
      showNotification('Emergency Flatten error.', 'error');
    }
  };

  const handleManualScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/manual-scan', { method: 'POST' });
      if (res.ok) {
        showNotification('Scan completed: All universe pairs evaluated against gates.', 'success');
        fetchAllData();
      }
    } catch {
      showNotification('Scan failed.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleResetCircuitBreaker = async () => {
    try {
      const res = await fetch('/api/reset-circuit-breaker', { method: 'POST' });
      if (res.ok) {
        showNotification('Daily Circuit Breaker reset.', 'success');
        fetchAllData();
      }
    } catch {
      showNotification('Failed to reset circuit breaker.', 'error');
    }
  };

  const handleTriggerTestTrade = async (symbol: string, side: 'LONG' | 'SHORT') => {
    setIsTriggering(true);
    try {
      const res = await fetch('/api/manual-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, side }),
      });

      const data = await res.json();
      if (!res.ok || data.blocked) {
        showNotification(`BLOCKED by ${data.gate || 'Safety Gate'}: ${data.reason}`, 'error');
      } else {
        showNotification(`🎯 Authorized & Executed ${side} on ${symbol}! Stop Loss active.`, 'success');
      }
      fetchAllData();
    } catch (err) {
      showNotification('Failed to send trade request.', 'error');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Institutional Header */}
      <Header
        btcContext={btcContext}
        stats={stats}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onEmergencyFlatten={handleEmergencyFlatten}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExpectancy={() => setIsExpectancyOpen(true)}
        onManualScan={handleManualScan}
        onResetCircuitBreaker={handleResetCircuitBreaker}
        isScanning={isScanning}
      />

      {/* Main Trading Terminal Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Toast / Notification Banner */}
        {notification && (
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between shadow-lg transition-all animate-in fade-in ${
            notification.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
              : 'bg-cyan-950/90 text-cyan-200 border-cyan-800'
          }`}>
            <span className="font-semibold">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. BTC Master Compass & Whale Orderflow Engine */}
        <BTCCompass btcContext={btcContext} />

        {/* 2. Active Sniper Positions (Tick-by-Tick Mark-to-Market with Dynamic R-Gauge) */}
        <ActivePositions positions={activePositions} />

        {/* 3. Institutional Universe Scanner (Spatial Clearance & Conviction Matrix) */}
        <PairScanner
          pairs={pairs}
          onTriggerTestTrade={handleTriggerTestTrade}
          isTriggering={isTriggering}
        />

        {/* 4. Split Section: Forensic Rejection Audit Log & Closed Trades Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ForensicAuditLog logs={auditLogs} />
          <ClosedTradesHistory trades={closedTrades} stats={stats} />
        </div>
      </main>

      {/* Modals */}
      <ExpectancyMathModal
        isOpen={isExpectancyOpen}
        onClose={() => setIsExpectancyOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
      />

      {/* Terminal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500 font-mono">
        ApexQuant Institutional Platform • Binance USDT-M Futures Feed • Real-time Deterministic Quantitative Sniper Engine
      </footer>
    </div>
  );
}
