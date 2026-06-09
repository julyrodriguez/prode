import { useState } from 'react';
import { useBetting, type BetMarket } from '../context/BettingContext';

const PRESETS = [5000, 10000, 20000, 50000];

export default function BetSlip() {
  const {
    selections,
    removeSelection,
    clearSlip,
    wager,
    setWager,
    totalOdds,
    potentialWin,
    betslipOpen,
    setBetslipOpen,
    userBalance,
    submitBet,
    isSubmitting,
  } = useBetting();

  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [customWager, setCustomWager] = useState('');

  const count = selections.length;
  if (count === 0 && !betslipOpen) return null;

  const isCombo = count > 1;
  const balance = userBalance?.balance ?? null;
  const notEnoughBalance = balance !== null && wager > balance;

  const handleSubmit = async () => {
    const result = await submitBet();
    setToast({ ok: result.ok, msg: result.message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleWagerPreset = (v: number) => {
    setWager(v);
    setCustomWager('');
  };

  const handleCustomWager = (val: string) => {
    setCustomWager(val);
    if (val === '') {
      setWager(0);
      return;
    }
    const n = parseFloat(val);
    if (!isNaN(n)) setWager(n);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!betslipOpen && count > 0 && (
        <button
          onClick={() => setBetslipOpen(true)}
          className="fixed bottom-24 md:bottom-6 right-4 z-[70] flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.5)] transition-all hover:scale-105 active:scale-95"
        >
          <span className="text-xl">🎰</span>
          <span className="text-sm">Apuesta</span>
          <span className="bg-black/20 text-black font-black text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {count}
          </span>
        </button>
      )}

      {/* Betslip Panel */}
      {betslipOpen && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-[70] w-full md:w-[380px] flex flex-col max-h-[90vh] md:max-h-[85vh]">
          <div className="bg-[#0d1117] border border-amber-500/30 md:rounded-3xl rounded-t-3xl shadow-[0_0_60px_rgba(245,158,11,0.15)] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-amber-500/10 to-transparent shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎰</span>
                <div>
                  <h3 className="text-white font-black text-base leading-tight">JarielBet</h3>
                  <p className="text-amber-400 text-xs font-bold">
                    {isCombo ? `COMBINADA (${count} selecciones)` : 'APUESTA SIMPLE'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <button
                    onClick={clearSlip}
                    className="text-[10px] text-slate-500 hover:text-red-400 font-bold uppercase tracking-wider transition-colors px-2 py-1 border border-white/10 rounded-lg hover:border-red-500/30"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={() => setBetslipOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Minimizar"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Selections List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {count === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <div className="text-4xl mb-3 opacity-40">🎯</div>
                  <p className="font-bold text-sm">Hacé clic en una cuota para apostar</p>
                  <p className="text-xs mt-1 text-slate-600">Podés combinar hasta múltiples partidos</p>
                </div>
              ) : (
                selections.map((sel) => (
                  <div
                    key={`${sel.matchId}-${sel.market}-${sel.selection}`}
                    className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-3 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-black truncate">{sel.matchLabel}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          {marketLabel(sel.market)}
                        </span>
                        <span className="text-amber-400 text-xs font-black">{sel.selectionLabel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-amber-400 font-black text-sm bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                        {sel.odds.toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeSelection(sel.matchId, sel.market, sel.selection)}
                        className="text-slate-600 hover:text-red-400 transition-colors text-sm font-bold w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-500/10"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom: Wager + Summary + Submit */}
            {count > 0 && (
              <div className="border-t border-white/[0.06] px-4 py-4 flex flex-col gap-4 shrink-0 bg-black/20">

                {/* Balance */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">Tu saldo</span>
                <span className={`font-black ${notEnoughBalance ? 'text-red-400' : 'text-emerald-400'}`}>
                    {balance !== null ? `$${balance.toLocaleString('es-AR')}` : '—'}
                  </span>
                </div>

                {/* Wager Presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Monto a apostar</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESETS.map(p => (
                      <button
                        key={p}
                        onClick={() => handleWagerPreset(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                          wager === p && customWager === ''
                            ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'bg-white/[0.05] text-slate-400 hover:bg-white/10 hover:text-white border border-white/[0.07]'
                        }`}
                      >
                        ${p.toLocaleString('es-AR')}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2">
                    <span className="text-slate-500 font-bold text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      value={customWager !== '' ? customWager : (wager > 0 ? wager : '')}
                      onChange={e => handleCustomWager(e.target.value)}
                      className="flex-1 bg-transparent text-white font-black text-sm outline-none placeholder:text-slate-700"
                      placeholder="Otro monto..."
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-br from-amber-500/[0.08] to-transparent border border-amber-500/20 rounded-2xl px-4 py-3 flex flex-col gap-2">
                  {isCombo && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Cuota combinada</span>
                      <span className="text-amber-400 font-black">{totalOdds.toFixed(2)}x</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm font-bold">Ganancia potencial</span>
                    <span className="text-amber-400 font-black text-lg">
                      ${potentialWin.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                {notEnoughBalance ? (
                  <div className="text-center bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                    <p className="text-red-400 text-xs font-bold">Saldo insuficiente para esta apuesta</p>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || wager < 1}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3.5 rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                        Confirmando...
                      </>
                    ) : (
                      <>🎰 Confirmar Apuesta</>
                    )}
                  </button>
                )}

                {/* Toast */}
                {toast && (
                  <div className={`text-center rounded-2xl px-4 py-3 text-xs font-bold border transition-all ${
                    toast.ok
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {toast.ok ? '✅' : '⚠️'} {toast.msg}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function marketLabel(market: BetMarket): string {
  switch (market) {
    case 'full_time': return '1X2';
    case 'double_chance': return 'Doble Chance';
    case 'draw_no_bet': return 'DNB';
    case 'btts': return 'Ambos Anotan';
  }
}
