import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBetting, type BetMarket, type BetSelection } from '../context/BettingContext';
import { useAuth } from '../context/AuthContext';
import BetSlip from '../components/BetSlip';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface MatchOdds {
  full_time?: { home?: number; draw?: number; away?: number };
  double_chance?: { home_draw?: number; draw_away?: number; home_away?: number };
  draw_no_bet?: { home?: number; away?: number };
  btts?: { yes?: number; no?: number };
}

interface Match {
  id: number;
  _id?: number | string;
  homeTeam?: { name: string; id?: number };
  awayTeam?: { name: string; id?: number };
  home_team?: { name: string; id?: number };
  away_team?: { name: string; id?: number };
  startTimestamp?: number;
  tournament?: { name?: string };
  tournament_name?: string;
  round_name?: string;
  status?: string | { type?: string; description?: string };
  homeScore?: { current?: number };
  awayScore?: { current?: number };
  odds?: MatchOdds;
}

type Tab = 'apuestas' | 'historial' | 'pendientes' | 'tabla';

/* ─── Helper ─────────────────────────────────────────────────────────────── */


function getTeamName(match: Match, t: 'home' | 'away') {
  const a = t === 'home' ? match.homeTeam : match.awayTeam;
  const b = t === 'home' ? match.home_team : match.away_team;
  return a?.name || b?.name || (t === 'home' ? 'Local' : 'Visitante');
}
function getTeamId(match: Match, t: 'home' | 'away') {
  const a = t === 'home' ? match.homeTeam : match.awayTeam;
  const b = t === 'home' ? match.home_team : match.away_team;
  return a?.id || b?.id;
}
function getTeamLogo(id?: number) {
  if (!id) return null;
  return `https://apivacas.jariel.com.ar/escudos/${id}.png`;
}
function matchLabel(match: Match) {
  return `${getTeamName(match, 'home')} vs ${getTeamName(match, 'away')}`;
}
function isMatchStarted(match: Match) {
  const startMs = (match.startTimestamp || 0) * 1000;
  if (typeof match.status === 'object' && match.status?.type === 'inprogress') return true;
  if (typeof match.status === 'object' && match.status?.type === 'finished') return true;
  if (startMs > 0 && startMs < Date.now()) return true;
  return false;
}

/* ─── OddsButton ─────────────────────────────────────────────────────────── */

function OddsButton({
  match,
  market,
  selection,
  odds,
  label,
  miniLabel,
  colorClass,
}: {
  match: Match;
  market: BetMarket;
  selection: string;
  odds: number;
  label: string;
  miniLabel: string;
  colorClass: string;
}) {
  const { addSelection, hasSelection, hasConflict } = useBetting();

  const selected = hasSelection(match.id, market, selection);
  const conflict = hasConflict(match.id, market, selection);
  const started = isMatchStarted(match);

  if (started) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 bg-white/[0.02] border border-white/[0.05] rounded-xl py-2 opacity-40 cursor-not-allowed">
        <span className="text-[9px] text-slate-600 font-bold">{miniLabel}</span>
        <span className="text-xs font-black text-slate-600">{odds.toFixed(2)}</span>
      </div>
    );
  }

  const handleClick = () => {
    const sel: BetSelection = {
      matchId: match.id,
      matchLabel: matchLabel(match),
      homeTeam: getTeamName(match, 'home'),
      awayTeam: getTeamName(match, 'away'),
      market,
      selection,
      selectionLabel: label,
      odds,
    };
    addSelection(sel);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex flex-col items-center justify-center flex-1 rounded-xl py-2 transition-all duration-150
        border font-black text-sm
        ${selected
          ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.5)] scale-[1.04]'
          : conflict
            ? 'bg-white/[0.02] border-white/[0.05] text-slate-600 opacity-40 cursor-not-allowed'
            : `bg-white/[0.04] border-white/[0.07] hover:border-amber-500/40 hover:bg-amber-500/10 hover:scale-[1.03] ${colorClass}`
        }
      `}
      disabled={conflict}
      aria-pressed={selected}
    >
      <span className={`text-[9px] font-bold ${selected ? 'text-black/70' : 'text-slate-500'}`}>{miniLabel}</span>
      <span>{odds.toFixed(2)}</span>
    </button>
  );
}

/* ─── MatchBettingCard ───────────────────────────────────────────────────── */

function MatchBettingCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false);
  const odds = match.odds;
  const ft = odds?.full_time;
  const started = isMatchStarted(match);

  const hName = getTeamName(match, 'home');
  const aName = getTeamName(match, 'away');
  const hLogo = getTeamLogo(getTeamId(match, 'home'));
  const aLogo = getTeamLogo(getTeamId(match, 'away'));

  const timeLabel = match.startTimestamp
    ? new Date(match.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className={`bg-[#0b1015]/80 border rounded-2xl overflow-hidden transition-all ${started ? 'border-white/[0.04]' : 'border-white/[0.07] hover:border-amber-500/20'}`}>
      {/* Match Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
        <div className="flex flex-col items-center min-w-[48px]">
          {started ? (
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Finalizado</span>
          ) : (
            <>
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">HOY</span>
              <span className="text-xs font-black text-white">{timeLabel}</span>
            </>
          )}
        </div>
        <div className="flex-1 flex items-center justify-between gap-2">
          {/* Home */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            <span className="text-white font-bold text-xs sm:text-sm line-clamp-2 text-right leading-tight">{hName}</span>
            <div className="w-7 h-7 shrink-0">
              {hLogo ? (
                <img src={hLogo} alt={hName} className="w-full h-full object-contain" onError={e => (e.currentTarget.style.opacity = '0')} />
              ) : (
                <div className="w-full h-full rounded-full bg-white/5" />
              )}
            </div>
          </div>
          <span className="text-slate-500 font-black text-xs shrink-0">VS</span>
          {/* Away */}
          <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
            <div className="w-7 h-7 shrink-0">
              {aLogo ? (
                <img src={aLogo} alt={aName} className="w-full h-full object-contain" onError={e => (e.currentTarget.style.opacity = '0')} />
              ) : (
                <div className="w-full h-full rounded-full bg-white/5" />
              )}
            </div>
            <span className="text-white font-bold text-xs sm:text-sm line-clamp-2 leading-tight">{aName}</span>
          </div>
        </div>
        {match.round_name && (
          <span className="text-[9px] text-slate-600 font-bold shrink-0 hidden sm:block">{match.round_name}</span>
        )}
      </div>

      {/* 1X2 Main Odds */}
      {ft && (ft.home != null || ft.draw != null || ft.away != null) && (
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Resultado Final · 1X2</span>
          </div>
          <div className="flex gap-1.5">
            {ft.home != null && (
              <OddsButton match={match} market="full_time" selection="home" odds={ft.home} label={`1 · ${hName.split(' ')[0]}`} miniLabel="1" colorClass="text-emerald-400" />
            )}
            {ft.draw != null && (
              <OddsButton match={match} market="full_time" selection="draw" odds={ft.draw} label="Empate" miniLabel="X" colorClass="text-slate-300" />
            )}
            {ft.away != null && (
              <OddsButton match={match} market="full_time" selection="away" odds={ft.away} label={`2 · ${aName.split(' ')[0]}`} miniLabel="2" colorClass="text-indigo-400" />
            )}
          </div>
        </div>
      )}

      {/* Extra markets toggle */}
      {(odds?.double_chance || odds?.draw_no_bet || odds?.btts) && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 text-[10px] text-slate-600 hover:text-slate-400 font-bold uppercase tracking-wider transition-colors border-t border-white/[0.04] hover:bg-white/[0.02]"
          >
            <span>{expanded ? '▲' : '▼'}</span>
            <span>{expanded ? 'Menos mercados' : 'Más mercados'}</span>
          </button>

          {expanded && (
            <div className="flex flex-col gap-0 border-t border-white/[0.04]">
              {/* Double Chance */}
              {odds?.double_chance && (
                <div className="px-3 py-2.5 border-b border-white/[0.03]">
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Doble Chance</span>
                  </div>
                  <div className="flex gap-1.5">
                    {odds.double_chance.home_draw != null && (
                      <OddsButton match={match} market="double_chance" selection="home_draw" odds={odds.double_chance.home_draw} label="1X" miniLabel="1X" colorClass="text-amber-400" />
                    )}
                    {odds.double_chance.draw_away != null && (
                      <OddsButton match={match} market="double_chance" selection="draw_away" odds={odds.double_chance.draw_away} label="X2" miniLabel="X2" colorClass="text-amber-400" />
                    )}
                    {odds.double_chance.home_away != null && (
                      <OddsButton match={match} market="double_chance" selection="home_away" odds={odds.double_chance.home_away} label="12" miniLabel="12" colorClass="text-amber-400" />
                    )}
                  </div>
                </div>
              )}

              {/* Draw No Bet */}
              {odds?.draw_no_bet && (
                <div className="px-3 py-2.5 border-b border-white/[0.03]">
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600">Draw No Bet</span>
                  </div>
                  <div className="flex gap-1.5">
                    {odds.draw_no_bet.home != null && (
                      <OddsButton match={match} market="draw_no_bet" selection="home" odds={odds.draw_no_bet.home} label={`DNB · ${hName.split(' ')[0]}`} miniLabel="1" colorClass="text-cyan-400" />
                    )}
                    {odds.draw_no_bet.away != null && (
                      <OddsButton match={match} market="draw_no_bet" selection="away" odds={odds.draw_no_bet.away} label={`DNB · ${aName.split(' ')[0]}`} miniLabel="2" colorClass="text-cyan-400" />
                    )}
                  </div>
                </div>
              )}

              {/* BTTS */}
              {odds?.btts && (
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-600">Ambos Anotan</span>
                  </div>
                  <div className="flex gap-1.5">
                    {odds.btts.yes != null && (
                      <OddsButton match={match} market="btts" selection="yes" odds={odds.btts.yes} label="Ambos Anotan: Sí" miniLabel="Sí" colorClass="text-purple-400" />
                    )}
                    {odds.btts.no != null && (
                      <OddsButton match={match} market="btts" selection="no" odds={odds.btts.no} label="Ambos Anotan: No" miniLabel="No" colorClass="text-purple-400" />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* No odds available */}
      {!odds?.full_time && !odds?.double_chance && !odds?.draw_no_bet && !odds?.btts && (
        <div className="px-4 py-3 text-center text-slate-700 text-xs font-bold">
          Sin cuotas disponibles
        </div>
      )}
    </div>
  );
}

/* ─── Main View ──────────────────────────────────────────────────────────── */

export default function JarielBetView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as Tab) || 'apuestas';
  const setActiveTab = (t: Tab) => setSearchParams({ tab: t });
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const { userBalance, isBalanceLoading, refreshBalance, selections, betslipOpen } = useBetting();
  
  // Calculate dynamic padding to avoid overlap with the betslip
  // Each selection adds height to the slip when open
  const dynamicPadding = betslipOpen 
    ? Math.min(600, 300 + selections.length * 85) 
    : (selections.length > 0 ? 180 : 100);

  // Refresh balance every time user enters JarielBet
  useEffect(() => {
    refreshBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [navDirection, setNavDirection] = useState(1);
  const [jumpNotice, setJumpNotice] = useState<string | null>(null);

  const fetchMatches = useCallback(async (date: string, dir: number = 1, showLoading = true) => {
    if (showLoading) { setLoading(true); setError(null); }
    try {
      const url = new URL('https://apivacas.jariel.com.ar/api/matches/optimized');
      url.searchParams.set('date', date);
      url.searchParams.set('direction', dir.toString());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Error al obtener partidos');
      const data = await res.json();
      let events: Match[] = [];
      if (data?.matches !== undefined) {
        events = data.matches;
        // Si la API saltó a una fecha distinta, actualizamos el estado
        const jumpedFlag = data.metadata?.jumpedToFuture || data.metadata?.jumpedToPast;
        if (jumpedFlag && data.metadata?.newDate && date !== data.metadata.newDate) {
          const msg = dir > 0 
            ? "No había partidos programados para esta fecha, saltando al próximo día disponible."
            : "No había partidos programados, regresando al día con actividad previa.";
          setJumpNotice(msg);
          setTimeout(() => setJumpNotice(null), 4000);
          setSelectedDate(data.metadata.newDate);
          return;
        }
      } else {
        events = Array.isArray(data) ? data : (data.events || data.data || []);
      }
      // Normalize id (API can return either `id` or `_id`)
      events = (events as any[]).map((e: any) => ({ ...e, id: e.id || e._id }));
      // Only show matches that HAVE odds
      const withOdds = events.filter(m => m.odds && (m.odds.full_time || m.odds.double_chance || m.odds.draw_no_bet || m.odds.btts));
      setMatches(withOdds);
    } catch (e: any) {
      if (showLoading) setError(e.message || 'Error de conexión');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches(selectedDate, navDirection, true);
  }, [fetchMatches, selectedDate, navDirection]);

  // Grouped
  const grouped = matches.reduce((acc, m) => {
    const key = m.tournament?.name || m.tournament_name || 'Otros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, Match[]>);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setNavDirection(-1);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };
  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setNavDirection(1);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const stats = userBalance?.betting_stats;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'apuestas', label: 'Apuestas', icon: '🎰' },
    { id: 'historial', label: 'Historial', icon: '📋' },
    { id: 'pendientes', label: 'Pendientes', icon: '⏳' },
    { id: 'tabla', label: 'Tabla', icon: '🏆' },
  ];

  return (
    <div 
      className="w-full flex flex-col gap-6"
      style={{ paddingBottom: `${dynamicPadding}px` }}
    >

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0d00] via-[#0d0d0d] to-[#0b1015] border border-amber-500/20 rounded-[2rem] p-6 lg:p-8 shadow-[0_20px_60px_rgba(245,158,11,0.1)]">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-30%] right-[-10%] w-[60%] h-[200%] bg-amber-500/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-600/10 rounded-full blur-[60px]" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(245,158,11,0.4)]">
              🎰
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 leading-tight">
                JarielBet
              </h1>
              <p className="text-amber-600 font-bold text-sm mt-0.5">Casa de Apuestas Oficial · Dinero Ficticio</p>
            </div>
          </div>

          {/* Balance Card */}
          <div className="w-full md:w-auto md:ml-auto flex justify-center items-center gap-3">
            <div className="bg-black/40 border border-amber-500/20 rounded-2xl px-5 py-3 flex flex-col items-center min-w-[140px]">
              <span className="text-[10px] text-amber-600 font-black uppercase tracking-widest">Balance</span>
              {isBalanceLoading ? (
                <div className="mt-1 w-24 h-7 bg-amber-500/10 rounded-lg animate-pulse" />
              ) : (
                <span className="text-2xl font-black text-amber-400 leading-tight">
                  ${userBalance != null ? userBalance.balance.toLocaleString('es-AR') : '—'}
                </span>
              )}
            </div>
            {stats && (
              <div className="hidden md:grid grid-cols-2 gap-2">
                <StatMini label="Apostadas" value={stats.total_bets_placed} />
                <StatMini label="Ganadas" value={stats.bets_won} color="text-emerald-400" />
                <StatMini label="Apostado $" value={`$${(stats.total_wagered ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`} />
              </div>
            )}
          </div>
        </div>

        {/* Tabs - Hidden on mobile, as they are now in the bottom nav */}
        <div className="relative z-10 mt-6 hidden md:flex overflow-x-auto no-scrollbar bg-black/30 border border-white/[0.05] rounded-2xl p-1 w-full sm:w-fit">
          <div className="flex gap-1 min-w-full sm:min-w-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[13px] sm:text-sm font-bold transition-all whitespace-nowrap flex-1 sm:flex-none
                  ${activeTab === tab.id
                    ? 'bg-amber-500 text-black shadow-[0_4px_15px_rgba(245,158,11,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'apuestas' && selections.length > 0 && (
                  <span className="bg-black/20 text-black font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {selections.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      {activeTab === 'apuestas' && (
        <div className="flex flex-col gap-6">
          {/* Jump Notice Alert */}
          {jumpNotice && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="text-xl">ℹ️</span>
              <p className="text-sm font-bold">{jumpNotice}</p>
            </div>
          )}

          {/* Date Navigator */}
          <div className="flex items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3">
            <button
              onClick={handlePrevDay}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              ‹
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-amber-400 font-black uppercase tracking-widest">Fecha</span>
              <span className="text-sm font-black text-white capitalize">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' })}
              </span>
            </div>
            <button
              onClick={handleNextDay}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              ›
            </button>
          </div>

          {/* Matches */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              <span className="text-amber-600 font-bold text-sm">Cargando cuotas...</span>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
              <span className="text-red-400 font-bold">{error}</span>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4 opacity-30">🚫</div>
              <p className="text-slate-500 font-bold">No hay partidos con cuotas disponibles para este día</p>
              <p className="text-slate-700 text-sm mt-1">Navegá a otra fecha o volvé más tarde</p>
            </div>
          ) : (
            Object.entries(grouped).map(([tournament, tMatches]) => (
              <section key={tournament} className="flex flex-col gap-3">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-sm font-black text-amber-400/80">⚽ {tournament}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-amber-500/20 to-transparent" />
                  <span className="text-[10px] text-slate-600 font-bold">{tMatches.length} partidos</span>
                </div>
                {tMatches.map(m => (
                  <MatchBettingCard key={m.id} match={m} />
                ))}
              </section>
            ))
          )}
        </div>
      )}

      {activeTab === 'historial' && (
        <HistorialTab />
      )}

      {activeTab === 'pendientes' && (
        <PendientesTab />
      )}

      {activeTab === 'tabla' && (
        <TablaTab />
      )}

      {/* Betslip siempre disponible */}
      <BetSlip />
    </div>
  );
}

function StatMini({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-black/30 border border-white/[0.06] rounded-xl px-3 py-1.5 flex flex-col items-center min-w-[72px]">
      <span className={`font-black text-sm ${color}`}>{value}</span>
      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ─── Types: Resolved Bets ───────────────────────────────────────────────── */

interface ResolvedLeg {
  matchId: number;
  home_team_name?: string;
  away_team_name?: string;
  market: string;
  selection: string;
  odds: number;
  status: 'won' | 'lost' | 'pending';
}

interface ResolvedBet {
  _id: string | { $oid: string };
  userId: string | {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  type: 'single' | 'multi' | 'combo';
  legs: ResolvedLeg[];
  wager: number;
  total_odds: number;
  potential_win: number;
  status: 'won' | 'lost' | 'pending';
  createdAt: string | { $date: string };
  resolvedAt?: string | { $date: string };
}

function resolveDateStr(d: string | { $date: string } | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') return d;
  return d.$date || '';
}
function resolveBetId(id: string | { $oid: string }): string {
  if (typeof id === 'string') return id;
  return id.$oid;
}

function formatDateNav(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'short',
  });
}
function stepDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

/* ─── ResolvedBetCard ────────────────────────────────────────────────────── */

function ResolvedBetCard({ bet }: { bet: ResolvedBet }) {
  const isWon = bet.status === 'won';
  const isLost = bet.status === 'lost';

  const borderColor = isWon ? 'border-emerald-500/30' : isLost ? 'border-red-500/20' : 'border-amber-500/20';
  const badgeBg = isWon ? 'bg-emerald-500/20 text-emerald-400' : isLost ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400';
  const badgeLabel = isWon ? '✓ Ganada' : isLost ? '✗ Perdida' : '⏳ Pendiente';

  const createdDate = resolveDateStr(bet.createdAt);
  const timeLabel = createdDate
    ? new Date(createdDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const profit = isWon ? bet.potential_win - bet.wager : isLost ? -bet.wager : 0;

  // Handle userId as object
  const userInfo = typeof bet.userId === 'object' ? bet.userId : null;
  const userName = userInfo?.name || 'Usuario';
  const userAvatar = userInfo?.avatarUrl
    ? (userInfo.avatarUrl.startsWith('http') ? userInfo.avatarUrl : `https://apivacas.jariel.com.ar${userInfo.avatarUrl}`)
    : null;

  return (
    <div className={`bg-[#0b1015]/80 border ${borderColor} rounded-2xl overflow-hidden`}>
      {/* User info if available */}
      {userInfo && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.03] bg-white/[0.01]">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-white/5 border border-white/10">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" onError={e => e.currentTarget.style.display = 'none'} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/40">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-[11px] font-black text-amber-500/90">{userName}</span>
        </div>
      )}

      {/* Header */}
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

      {/* Legs */}
      <div className="flex flex-col divide-y divide-white/[0.03]">
        {bet.legs.map((leg, i) => {
          const legWon = leg.status === 'won';
          const legLost = leg.status === 'lost';
          return (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex flex-col min-w-0">
                {(leg.home_team_name || leg.away_team_name) && (
                  <span className="text-[10px] text-amber-500/80 font-black line-clamp-2 leading-tight mb-0.5">
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
                <span className={`text-[11px] font-black ${legWon ? 'text-emerald-400' : legLost ? 'text-red-400' : 'text-slate-500'
                  }`}>
                  {legWon ? '✓' : legLost ? '✗' : '?'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.015]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Apostado</span>
            <span className="text-xs font-black text-white">${bet.wager.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Cuota Total</span>
            <span className="text-xs font-black text-amber-400">{bet.total_odds.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Potencial</span>
            <span className="text-xs font-black text-slate-400">${bet.potential_win.toLocaleString('es-AR')}</span>
          </div>
        </div>
        {(isWon || isLost) && (
          <div className={`flex flex-col items-end`}>
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
              {isWon ? 'Ganancia' : 'Pérdida'}
            </span>
            <span className={`text-sm font-black ${isWon ? 'text-emerald-400' : 'text-red-400'}`}>
              {isWon ? '+' : ''}${profit.toLocaleString('es-AR')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── HistorialTab ───────────────────────────────────────────────────────── */

function HistorialTab() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr);
  const [bets, setBets] = useState<ResolvedBet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBets = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://apivacas.jariel.com.ar/api/bets/resolved/all?date=${d}`
      );
      if (!res.ok) throw new Error('Error al obtener historial');
      const data = await res.json();
      setBets(Array.isArray(data) ? data : (data.bets || []));
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { fetchBets(date); }, [fetchBets, date]);

  /* Daily summary */
  const won = bets.filter(b => b.status === 'won').length;
  const lost = bets.filter(b => b.status === 'lost').length;


  const isToday = date === todayStr();

  return (
    <div className="flex flex-col gap-4">
      {/* Date Navigator */}
      <div className="flex items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3">
        <button
          onClick={() => setDate(d => stepDate(d, -1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-lg"
        >
          ‹
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-amber-400 font-black uppercase tracking-widest">Historial</span>
          <span className="text-sm font-black text-white capitalize">{formatDateNav(date)}</span>
          {isToday && <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Hoy</span>}
        </div>
        <button
          onClick={() => setDate(d => stepDate(d, 1))}
          disabled={isToday}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all text-lg ${isToday ? 'opacity-30 cursor-not-allowed bg-white/5 text-slate-600' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
        >
          ›
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-amber-600 font-bold text-sm">Cargando historial...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <span className="text-red-400 font-bold">{error}</span>
        </div>
      )}

      {/* No user */}
      {!user && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white/[0.02] border border-white/[0.05] rounded-3xl">
          <div className="text-5xl opacity-20">🔒</div>
          <p className="text-slate-500 font-bold">Necesitás iniciar sesión para ver tu historial</p>
        </div>
      )}

      {/* Summary banner (solo si hay apuestas) */}
      {!loading && !error && bets.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <StatMini label="Apostadas" value={bets.length} />
          <StatMini label="Ganadas" value={won} color="text-emerald-400" />
          <StatMini label="Perdidas" value={lost} color="text-red-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && user && bets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/[0.02] border border-white/[0.05] rounded-3xl">
          <div className="text-5xl opacity-20">📋</div>
          <div className="text-center">
            <h3 className="text-white font-black text-lg">Sin apuestas este día</h3>
            <p className="text-slate-600 text-sm mt-1">No hay apuestas resueltas para {formatDateNav(date)}</p>
          </div>
        </div>
      )}

      {/* Bet list */}
      {!loading && !error && bets.length > 0 && (
        <div className="flex flex-col gap-3">
          {bets.map(bet => (
            <ResolvedBetCard key={resolveBetId(bet._id)} bet={bet} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── PendientesTab ──────────────────────────────────────────────────────── */

function PendientesTab() {
  const [bets, setBets] = useState<ResolvedBet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://apivacas.jariel.com.ar/api/bets/pending/all`
      );
      if (!res.ok) throw new Error('Error al obtener pendientes');
      const data = await res.json();
      setBets(Array.isArray(data) ? data : (data.bets || []));
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBets(); }, [fetchBets]);

  /* stats */


  return (
    <div className="flex flex-col gap-4">
      {/* Header Banner */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-6 py-4 flex flex-col items-center">
        <span className="text-xs text-amber-500 font-black uppercase tracking-[0.2em] mb-1">Apuestas Pendientes</span>
        <span className="text-slate-500 font-bold text-[10px] uppercase">Lista global de apuestas por resolver</span>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-amber-600 font-bold text-sm">Cargando pendientes...</span>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <span className="text-red-400 font-bold">{error}</span>
        </div>
      )}



      {/* Empty state */}
      {!loading && !error && bets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/[0.02] border border-white/[0.05] rounded-3xl">
          <div className="text-5xl opacity-20">⏳</div>
          <div className="text-center">
            <h3 className="text-white font-black text-lg">Sin apuestas pendientes</h3>
            <p className="text-slate-600 text-sm mt-1">No hay apuestas globales por resolver en este momento</p>
          </div>
        </div>
      )}

      {/* Bet list */}
      {!loading && !error && bets.length > 0 && (
        <div className="flex flex-col gap-3">
          {bets.map(bet => (
            <ResolvedBetCard key={resolveBetId(bet._id)} bet={bet} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── TablaTab ──────────────────────────────────────────────────────────── */

interface JarielUser {
  _id: string;
  name: string;
  avatarUrl: string;
  balance: number;
  initial_balance: number;
  betting_stats: {
    bets_lost: number;
    bets_won: number;
    total_bets_placed: number;
    total_earned: number;
    total_wagered: number;
  };
}

function TablaTab() {
  const [users, setUsers] = useState<JarielUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch('https://apivacas.jariel.com.ar/api/users');
        if (!res.ok) throw new Error('Error al cargar la tabla');
        const data = await res.json();
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) =>
          (b.betting_stats?.total_earned || 0) - (a.betting_stats?.total_earned || 0)
        );
        setUsers(sorted);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      <span className="text-amber-600 font-bold">Cargando posiciones...</span>
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center text-red-400 font-bold">
      {error}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden shadow-lg">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_45px_45px_65px] md:grid-cols-[48px_1fr_60px_60px_80px] items-center px-4 py-3 border-b border-white/5 bg-black/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">#</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Jugador</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 text-center">W</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-500 text-center">L</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 text-right">% ROI</span>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/[0.03]">
          {users.map((u, idx) => {
            const isMe = currentUser?.uid === u._id;
            const stats = u.betting_stats || { bets_won: 0, bets_lost: 0, total_earned: 0 };
            const roi = (u.initial_balance || 0) > 0
              ? ((u.balance * 100) / u.initial_balance) - 100
              : 0;

            return (
              <div
                key={u._id}
                onClick={() => navigate(`/jarielbet/user/${u._id}`)}
                className={`grid grid-cols-[40px_1fr_45px_45px_65px] md:grid-cols-[48px_1fr_60px_60px_80px] items-center px-4 py-3.5 transition-colors cursor-pointer ${isMe ? 'bg-amber-500/[0.06] border-l-2 border-amber-500/50 hover:bg-amber-500/[0.10]' : 'hover:bg-white/[0.04]'
                  }`}
              >
                <div className="flex items-center justify-center">
                  <span className={`text-[11px] font-black ${idx < 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                </div>

                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                    <img
                      src={u.avatarUrl?.startsWith('http') ? u.avatarUrl : `https://apivacas.jariel.com.ar${u.avatarUrl || '/default-avatar.png'}`}
                      alt={u.name}
                      className="w-full h-full object-cover relative z-10"
                      onError={e => e.currentTarget.style.display = 'none'}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/20 z-0">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span className={`text-sm font-bold truncate ${isMe ? 'text-amber-300' : 'text-slate-200'}`}>
                    {u.name}
                  </span>
                </div>

                <span className="text-sm font-black text-emerald-400 text-center">{stats.bets_won}</span>
                <span className="text-sm font-black text-red-400 text-center">{stats.bets_lost}</span>

                <div className="text-right flex flex-col">
                  <span className={`text-sm font-black ${roi > 0 ? 'text-emerald-400' : roi < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase">
                    ${(stats.total_earned || 0).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
