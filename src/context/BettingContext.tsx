import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type BetMarket = 'full_time' | 'double_chance' | 'draw_no_bet' | 'btts';
const OUTCOME_MARKETS: BetMarket[] = ['full_time', 'double_chance', 'draw_no_bet'];

export interface BetSelection {
  matchId: number;
  matchLabel: string;
  homeTeam: string;
  awayTeam: string;
  market: BetMarket;
  selection: string;
  selectionLabel: string;
  odds: number;
}

export interface UserBalance {
  balance: number;
  initial_balance?: number;
  betting_stats: {
    total_bets_placed: number;
    bets_won: number;
    bets_lost: number;
    total_wagered: number;
    total_earned: number;
  };
}

interface BettingContextType {
  selections: BetSelection[];
  addSelection: (sel: BetSelection) => void;
  removeSelection: (matchId: number, market: BetMarket, selection: string) => void;
  clearSlip: () => void;
  hasSelection: (matchId: number, market: BetMarket, selection: string) => boolean;
  hasConflict: (matchId: number, market: BetMarket, selection: string) => boolean;
  wager: number;
  setWager: (v: number) => void;
  totalOdds: number;
  potentialWin: number;
  betslipOpen: boolean;
  setBetslipOpen: (v: boolean) => void;
  userBalance: UserBalance | null;
  isBalanceLoading: boolean;
  refreshBalance: () => Promise<void>;
  submitBet: () => Promise<{ ok: boolean; message: string }>;
  isSubmitting: boolean;
}

const BettingContext = createContext<BettingContextType | null>(null);


export function BettingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [wager, setWager] = useState<number>(100);
  const [betslipOpen, setBetslipOpen] = useState(false);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialWin = parseFloat((wager * totalOdds).toFixed(2));

  const refreshBalance = useCallback(async () => {
    if (!user) { setIsBalanceLoading(false); return; }
    setIsBalanceLoading(true);
    try {
      // 1. CORREGIDO: La URL exacta de tu API
      const res = await fetch(`https://apivacas.jariel.com.ar/api/users/${user.uid}`);

      if (res.ok) {
        const data = await res.json(); // Nuestro backend devuelve el objeto directo

        if (data && typeof data === 'object') {
          setUserBalance({
            balance: data.balance ?? 10000,
            betting_stats: data.betting_stats ?? {
              total_bets_placed: 0,
              bets_won: 0,
              bets_lost: 0,
              total_wagered: 0,
              total_earned: 0,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error obteniendo balance:", error);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) refreshBalance();
  }, [user?.uid, refreshBalance]);

  const addSelection = useCallback((sel: BetSelection) => {
    const isFirst = selections.length === 0;
    setSelections(prev => {
      const alreadySelected = prev.some(
        s => s.matchId === sel.matchId && s.market === sel.market && s.selection === sel.selection
      );
      if (alreadySelected) {
        return prev.filter(
          s => !(s.matchId === sel.matchId && s.market === sel.market && s.selection === sel.selection)
        );
      }
      
      // Si el mercado es de resultado (1X2, DC, DNB), eliminamos otros de ese grupo
      const isOutcome = OUTCOME_MARKETS.includes(sel.market);
      const filtered = prev.filter(s => {
        if (s.matchId !== sel.matchId) return true;
        if (isOutcome && OUTCOME_MARKETS.includes(s.market)) return false;
        return s.market !== sel.market;
      });

      return [...filtered, sel];
    });
    if (isFirst) setBetslipOpen(true);
  }, [selections.length]);

  const removeSelection = useCallback((matchId: number, market: BetMarket, selection: string) => {
    setSelections(prev =>
      prev.filter(s => !(s.matchId === matchId && s.market === market && s.selection === selection))
    );
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    setWager(100);
  }, []);

  const hasSelection = useCallback(
    (matchId: number, market: BetMarket, selection: string) =>
      selections.some(s => s.matchId === matchId && s.market === market && s.selection === selection),
    [selections]
  );

  const hasConflict = useCallback(
    (matchId: number, market: BetMarket, selection: string) => {
      const isOutcome = OUTCOME_MARKETS.includes(market);
      
      return selections.some(s => {
        if (s.matchId !== matchId) return false;
        // Conflicto si es la misma categoría (ej: ya tiene un 1X2 y toca otro 1X2)
        if (s.market === market && s.selection !== selection) return true;
        // Conflicto si es del grupo 'Outcome' (ej: ya tiene 1X2 y toca Doble Chance)
        if (isOutcome && OUTCOME_MARKETS.includes(s.market)) return true;
        return false;
      });
    },
    [selections]
  );

  const submitBet = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!user || selections.length === 0) return { ok: false, message: 'Sin selecciones.' };
    if (wager < 1) return { ok: false, message: 'La apuesta mínima es $1.' };
    if (userBalance && wager > userBalance.balance)
      return { ok: false, message: 'Saldo insuficiente.' };

    setIsSubmitting(true);
    try {
      const body = {
        userId: user.uid,
        type: selections.length === 1 ? 'single' : 'combo',
        legs: selections.map(s => ({
          matchId: s.matchId,
          homeTeam: s.homeTeam,
          awayTeam: s.awayTeam,
          market: s.market,
          selection: s.selection,
          odds: s.odds,
        })),
        wager,
        total_odds: parseFloat(totalOdds.toFixed(4)),
        potential_win: potentialWin,
      };

      const res = await fetch('https://apivacas.jariel.com.ar/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && (data.success || data._id || data.bet)) {
        clearSlip();
        await refreshBalance();
        return { ok: true, message: `¡Apuesta confirmada! Ganancia potencial: $${potentialWin.toLocaleString('es-AR')}` };
      }
      return { ok: false, message: data.error || data.message || 'Error al registrar la apuesta.' };
    } catch {
      return { ok: false, message: 'Error de conexión.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [user, selections, wager, totalOdds, potentialWin, userBalance, clearSlip, refreshBalance]);

  return (
    <BettingContext.Provider
      value={{
        selections,
        addSelection,
        removeSelection,
        clearSlip,
        hasSelection,
        hasConflict,
        wager,
        setWager,
        totalOdds,
        potentialWin,
        betslipOpen,
        setBetslipOpen,
        userBalance,
        isBalanceLoading,
        refreshBalance,
        submitBet,
        isSubmitting,
      }}
    >
      {children}
    </BettingContext.Provider>
  );
}

export function useBetting() {
  const ctx = useContext(BettingContext);
  if (!ctx) throw new Error('useBetting must be used within BettingProvider');
  return ctx;
}
