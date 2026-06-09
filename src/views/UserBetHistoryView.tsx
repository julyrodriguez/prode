import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/* ─── Types (Re-defined for self-containment) ────────────────────────────── */

interface ResolvedLeg {
  matchId: number;
  home_team_name?: string;
  away_team_name?: string;
  market: string;
  selection: string;
  odds: number;
  status: 'won' | 'lost' | 'pending';
}

interface UserInfo {
  _id: string;
  name: string;
  avatarUrl?: string;
}

interface ResolvedBet {
  _id: string | { $oid: string };
  userId: string | UserInfo;
  type: 'single' | 'multi' | 'combo';
  legs: ResolvedLeg[];
  wager: number;
  total_odds: number;
  potential_win: number;
  status: 'won' | 'lost' | 'pending';
  createdAt: string | { $date: string };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function resolveDateStr(d: any): string {
  if (!d) return '';
  if (typeof d === 'string') return d;
  return d.$date || '';
}

function resolveBetId(id: any): string {
  if (typeof id === 'string') return id;
  return id?.$oid || '';
}

function marketLabel(market: string): string {
  const map: Record<string, string> = {
    full_time: 'Resultado Final',
    double_chance: 'Doble Chance',
    draw_no_bet: 'Draw No Bet',
    btts: 'Ambos Anotan',
  };
  return map[market] || market;
}

function selectionLabel(selection: string): string {
  const map: Record<string, string> = {
    home: 'Local (1)', draw: 'Empate (X)', away: 'Visitante (2)',
    home_draw: '1X', draw_away: 'X2', home_away: '12',
    yes: 'Sí', no: 'No',
  };
  return map[selection] || selection;
}

/* ─── Shared Card Component ──────────────────────────────────────────────── */

function UserBetCard({ bet }: { bet: ResolvedBet }) {
  const isWon = bet.status === 'won';
  const isLost = bet.status === 'lost';

  const borderColor = isWon ? 'border-emerald-500/30' : isLost ? 'border-red-500/20' : 'border-amber-500/20';
  const badgeBg = isWon ? 'bg-emerald-500/20 text-emerald-400' : isLost ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400';
  const badgeLabel = isWon ? '✓ Ganada' : isLost ? '✗ Perdida' : '⏳ Pendiente';

  const createdDate = resolveDateStr(bet.createdAt);
  const timeLabel = createdDate
    ? new Date(createdDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + ' ' +
    new Date(createdDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className={`bg-[#0b1015]/80 border ${borderColor} rounded-2xl overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${badgeBg}`}>
            {badgeLabel}
          </span>
          <span className="text-[10px] text-slate-600 font-bold uppercase">
            {bet.type === 'multi' || bet.type === 'combo' ? `Combinada · ${bet.legs.length} selec.` : 'Simple'}
          </span>
        </div>
        <span className="text-[10px] text-slate-600 font-bold">{timeLabel}</span>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.03]">
        {bet.legs.map((leg, i) => {
          const legWon = leg.status === 'won';
          const legLost = leg.status === 'lost';

          return (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex flex-col min-w-0">
                {(leg.home_team_name || leg.away_team_name) && (
                  <span className="text-[10px] text-amber-500/80 font-black truncate mb-0.5">
                    {leg.home_team_name || '—'} vs {leg.away_team_name || '—'}
                  </span>
                )}
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                  {marketLabel(leg.market)}
                </span>
                <span className="text-xs text-white font-bold truncate">
                  {selectionLabel(leg.selection)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black text-amber-400">{leg.odds.toFixed(2)}</span>
                <span className={`text-[11px] font-black ${legWon ? 'text-emerald-400' : legLost ? 'text-red-400' : 'text-amber-400'
                  }`}>
                  {legWon ? '✓' : legLost ? '✗' : '⏳'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.015]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Apostado</span>
            <span className="text-xs font-black text-white">${bet.wager.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Potencial</span>
            <span className="text-xs font-black text-slate-400">${bet.potential_win.toLocaleString('es-AR')}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Cuota</span>
          <span className="text-xs font-black text-amber-400">{bet.total_odds.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main View ──────────────────────────────────────────────────────────── */

export default function UserBetHistoryView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [bets, setBets] = useState<ResolvedBet[]>([]);
  const [targetUser, setTargetUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Fetch Bets
      const resBets = await fetch(`https://apivacas.jariel.com.ar/api/bets/me/${userId}`);
      if (!resBets.ok) throw new Error('No se pudieron cargar las apuestas');
      const betsData = await resBets.json();
      setBets(Array.isArray(betsData) ? betsData : []);

      // 2. Fetch User Info (to get name and avatar)
      const resUser = await fetch(`https://apivacas.jariel.com.ar/api/${userId}`);
      if (resUser.ok) {
        setTargetUser(await resUser.json());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
        >
          ‹
        </button>
        <div>
          <h1 className="text-xl font-black italic">HISTORIAL <span className="text-amber-500">USER</span></h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Apuestas realizadas por el usuario</p>
        </div>
      </div>

      {/* User Banner */}
      {targetUser && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-4 flex items-center gap-4 mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -mr-10 -mt-10" />
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
            <img
              src={targetUser.avatarUrl?.startsWith('http') ? targetUser.avatarUrl : `https://apivacas.jariel.com.ar${targetUser.avatarUrl}`}
              alt={targetUser.name}
              className="w-full h-full object-cover"
              onError={e => e.currentTarget.style.display = 'none'}
            />
            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-500/30">
              {targetUser.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em]">Perfil Jugador</span>
            <h2 className="text-2xl font-black text-white">{targetUser.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{bets.length} Apuestas</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                {bets.filter(b => b.status === 'won').length} Win
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-amber-600 font-bold">Consultando historial...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center text-red-400 font-bold">
          {error}
        </div>
      ) : bets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/[0.02] border border-white/[0.05] rounded-3xl">
          <div className="text-6xl opacity-20">📋</div>
          <p className="text-slate-500 font-bold">No registra apuestas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bets.map(bet => (
            <UserBetCard key={resolveBetId(bet._id)} bet={bet} />
          ))}
        </div>
      )}
    </div>
  );
}
