import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TeamForm from '../components/TeamForm';
import CS2MatchesSection from '../components/CS2MatchesSection';

interface MatchOdds {
  full_time?: { home?: number; draw?: number; away?: number };
  double_chance?: { home_draw?: number; draw_away?: number; home_away?: number };
  draw_no_bet?: { home?: number; away?: number };
  btts?: { yes?: number; no?: number };
}

interface Match {
  id: number;
  homeTeam?: { name: string; logoUrl?: string; score?: number; id?: number };
  awayTeam?: { name: string; logoUrl?: string; score?: number; id?: number };
  home_team?: { name: string; logoUrl?: string; score?: number; id?: number };
  away_team?: { name: string; logoUrl?: string; score?: number; id?: number };
  startTimestamp?: number;
  tournament?: { name?: string; id?: number; category?: { flag?: string } };
  tournament_name?: string;
  round_name?: string;
  status?: string | { type?: string; description?: string };
  homeScore?: { current?: number };
  awayScore?: { current?: number };
  odds?: MatchOdds;
}

/* ─ PenaltyScoreDisplay: obtiene y muestra el resultado de los penales ─ */
function PenaltyScoreDisplay({ matchId }: { matchId: number }) {
  const [score, setScore] = useState<{ h: number, a: number } | null>(null);

  useEffect(() => {
    fetch(`https://apivacas.jariel.com.ar/api/matches/detail/${matchId}`)
      .then(r => r.json())
      .then(d => {
        const matchData = d.events ? d.events[0] : d;
        const penInc = matchData?.incidents?.slice().reverse().find((inc: any) => inc.text === 'PEN' && inc.incidentType === 'period');
        if (penInc && penInc.homeScore !== undefined) {
          setScore({ h: penInc.homeScore, a: penInc.awayScore });
        }
      })
      .catch(() => { });
  }, [matchId]);

  if (!score) return <span className="text-emerald-400 font-bold text-[8px] md:text-[9px] uppercase tracking-widest leading-none mt-0.5">PENALES</span>;

  return (
    <span className="text-emerald-400 font-bold text-[8px] md:text-[9px] uppercase tracking-widest leading-none mt-0.5">
      PENALES ({score.h} - {score.a})
    </span>
  );
}

/* ─ OddsRow: cuotas colapsables debajo de cada partido ─ */
function OddsRow({ odds }: { odds: MatchOdds }) {
  const [open, setOpen] = useState(false);
  const ft = odds.full_time;
  if (!ft || (ft.home == null && ft.draw == null && ft.away == null)) return null;

  const fmt = (v?: number) => v != null ? v.toFixed(2) : '—';
  const hasExtra = !!(odds.double_chance || odds.draw_no_bet || odds.btts);

  return (
    <div className="w-full border-t border-white/[0.06] bg-black/25">
      {/* Fila principal: 1X2 + botón expandir */}
      <div className="flex items-stretch w-full">
        <div className="flex items-center gap-1.5 flex-1 px-3 py-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 shrink-0 mr-1 hidden sm:block">1X2</span>
          <div className="flex items-center gap-1.5 flex-1">
            <div className="flex items-center justify-center gap-1 flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg py-1.5">
              <span className="text-[9px] text-slate-500 font-bold">1</span>
              <span className="text-[13px] font-black text-emerald-400">{fmt(ft.home)}</span>
            </div>
            <div className="flex items-center justify-center gap-1 flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg py-1.5">
              <span className="text-[9px] text-slate-500 font-bold">X</span>
              <span className="text-[13px] font-black text-slate-300">{fmt(ft.draw)}</span>
            </div>
            <div className="flex items-center justify-center gap-1 flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg py-1.5">
              <span className="text-[9px] text-slate-500 font-bold">2</span>
              <span className="text-[13px] font-black text-indigo-400">{fmt(ft.away)}</span>
            </div>
          </div>
        </div>
        {hasExtra && (
          <button
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
            className="flex items-center justify-center px-4 border-l border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] active:bg-white/10 transition-colors min-w-[48px] shrink-0"
            aria-label={open ? 'Ocultar más cuotas' : 'Ver más cuotas'}
          >
            <span className="text-[11px] font-bold">{open ? '▲' : '▼'}</span>
          </button>
        )}
      </div>

      {/* Extra cuotas colapsables */}
      {open && (
        <div className="flex flex-col border-t border-white/[0.04]">
          {odds.double_chance && (
            <div className="flex items-center px-3 py-1.5 gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 shrink-0 w-[60px] hidden sm:block">Doble Ch.</span>
              <div className="flex items-center gap-1.5 flex-1">
                {odds.double_chance.home_draw != null && (
                  <div className="flex items-center justify-center gap-1 flex-1 bg-amber-500/[0.07] border border-amber-500/20 rounded-lg py-1.5">
                    <span className="text-[9px] text-slate-500 font-bold">1X</span>
                    <span className="text-xs font-black text-amber-400">{fmt(odds.double_chance.home_draw)}</span>
                  </div>
                )}
                {odds.double_chance.draw_away != null && (
                  <div className="flex items-center justify-center gap-1 flex-1 bg-amber-500/[0.07] border border-amber-500/20 rounded-lg py-1.5">
                    <span className="text-[9px] text-slate-500 font-bold">X2</span>
                    <span className="text-xs font-black text-amber-400">{fmt(odds.double_chance.draw_away)}</span>
                  </div>
                )}
                {odds.double_chance.home_away != null && (
                  <div className="flex items-center justify-center gap-1 flex-1 bg-amber-500/[0.07] border border-amber-500/20 rounded-lg py-1.5">
                    <span className="text-[9px] text-slate-500 font-bold">12</span>
                    <span className="text-xs font-black text-amber-400">{fmt(odds.double_chance.home_away)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {odds.draw_no_bet && (
            <div className="flex items-center px-3 py-1.5 gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 shrink-0 w-[60px] hidden sm:block">DNB</span>
              <div className="flex items-center gap-1.5 flex-1">
                {odds.draw_no_bet.home != null && (
                  <div className="flex items-center justify-center gap-1 flex-1 bg-cyan-500/[0.07] border border-cyan-500/20 rounded-lg py-1.5">
                    <span className="text-[9px] text-slate-500 font-bold">1</span>
                    <span className="text-xs font-black text-cyan-400">{fmt(odds.draw_no_bet.home)}</span>
                  </div>
                )}
                {odds.draw_no_bet.away != null && (
                  <div className="flex items-center justify-center gap-1 flex-1 bg-cyan-500/[0.07] border border-cyan-500/20 rounded-lg py-1.5">
                    <span className="text-[9px] text-slate-500 font-bold">2</span>
                    <span className="text-xs font-black text-cyan-400">{fmt(odds.draw_no_bet.away)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {odds.btts && (
            <div className="flex items-center px-3 py-1.5 gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 shrink-0 w-[60px] hidden sm:block">BTTS</span>
              <div className="flex items-center gap-1.5 flex-1">
                {odds.btts.yes != null && (
                  <div className="flex items-center justify-center gap-1 flex-1 bg-purple-500/[0.07] border border-purple-500/20 rounded-lg py-1.5">
                    <span className="text-[9px] text-slate-500 font-bold">Sí</span>
                    <span className="text-xs font-black text-purple-400">{fmt(odds.btts.yes)}</span>
                  </div>
                )}
                {odds.btts.no != null && (
                  <div className="flex items-center justify-center gap-1 flex-1 bg-purple-500/[0.07] border border-purple-500/20 rounded-lg py-1.5">
                    <span className="text-[9px] text-slate-500 font-bold">No</span>
                    <span className="text-xs font-black text-purple-400">{fmt(odds.btts.no)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchesView({ isPredictionMode = false }: { isPredictionMode?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jumpMsg, setJumpMsg] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [searchDirection, setSearchDirection] = useState<1 | -1>(1);
  const [localPredictions, setLocalPredictions] = useState<Record<number, { home: string, away: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<{ ok: boolean; msg: string } | null>(null);;

  useEffect(() => {
    const fetchMatchesAndPredictions = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      try {
        const url = new URL('https://apivacas.jariel.com.ar/api/matches/optimized');
        url.searchParams.append('date', selectedDate);
        url.searchParams.append('direction', String(searchDirection));

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error('No se pudieron obtener los partidos.');
        }

        const data = await response.json();
        let events: Match[] = [];

        if (data && data.matches !== undefined) {
          events = data.matches;
          if (data.metadata?.jumpedToFuture && data.metadata?.newDate) {
            if (selectedDate !== data.metadata.newDate) {
              setJumpMsg(searchDirection === -1 ? "No había partidos, saltamos a la fecha anterior disponible." : "No había partidos, te mostramos la próxima fecha disponible.");
              setSelectedDate(data.metadata.newDate);
              setTimeout(() => setJumpMsg(null), 8000);
              return;
            }
          }
        } else {
          events = Array.isArray(data) ? data : (data.events || data.data || []);
        }

        events = events.map((e: any) => ({ ...e, id: e.id || e._id }));
        setAllMatches(events);

        if (user) {
          try {
            const predRes = await fetch(`https://apivacas.jariel.com.ar/api/predictions/user/${user.uid}`);
            if (predRes.ok) {
              const pData = await predRes.json();
              const predMap: Record<number, { home: string, away: string }> = {};

              if (Array.isArray(pData)) {
                pData.forEach(p => {
                  const idDelPartido = Number(p.matchId || p.match_id);
                  const golesLocal = p.homeScore !== undefined ? p.homeScore : (p.home_score ?? '');
                  const golesVisita = p.awayScore !== undefined ? p.awayScore : (p.away_score ?? '');

                  predMap[idDelPartido] = {
                    home: String(golesLocal),
                    away: String(golesVisita)
                  };
                });
              }
              if (showLoading) {
                setLocalPredictions(predMap);
              } else {
                setLocalPredictions(prev => {
                  const merged = { ...predMap };
                  Object.keys(prev).forEach(k => { merged[Number(k)] = prev[Number(k)]; });
                  return merged;
                });
              }
            }
          } catch (err) {
            console.error("Error al obtener predicciones", err);
          }
        }


      } catch (err: any) {
        if (showLoading) {
          setError(err.message || 'Error de conexión con el servidor');
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    };

    fetchMatchesAndPredictions(true);
    const interval = setInterval(() => fetchMatchesAndPredictions(false), 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [user, selectedDate, searchDirection]);

  const parseMatchStatus = (match: Match) => {
    const startMs = (match.startTimestamp || 0) * 1000;
    const isPastTime = startMs > 0 && startMs < Date.now();

    if (match.status === 'notstarted') return { isLive: false, hasStarted: false, label: 'Pendiente' };

    if (typeof match.status === 'object' && match.status !== null) {
      if (match.status.type === 'inprogress') return { isLive: true, hasStarted: true, label: match.status.description || 'EN VIVO' };
      if (match.status.type === 'finished') {
        const isPenalties = match.status.description === 'AP';
        return { isLive: false, hasStarted: true, label: 'Finalizado', isPenalties };
      }
      if (match.status.type === 'canceled') return { isLive: false, hasStarted: false, label: 'Cancelado' };
    }

    if (isPastTime) return { isLive: true, hasStarted: true, label: 'EN JUEGO' };

    return { isLive: false, hasStarted: false, label: 'Pendiente' };
  };

  const getMatchTime = (match: Match) => {
    const statusDesc = typeof match.status === 'object' ? match.status?.description?.toLowerCase() : match.status?.toLowerCase();

    if (statusDesc?.includes('halftime') || statusDesc === 'ht' || statusDesc === 'pause') return 'ENTRETIEMPO';

    if (statusDesc?.includes('1st') || statusDesc?.includes('first')) {
      return 'PRIMER TIEMPO';
    }
    if (statusDesc?.includes('2nd') || statusDesc?.includes('second')) {
      return 'SEGUNDO TIEMPO';
    }
    if (statusDesc === 'aet' || statusDesc?.includes('extra')) return 'TIEMPO EXTRA';
    if (statusDesc === 'ap' || statusDesc?.includes('pen')) return 'PENALES';

    const original = typeof match.status === 'object' ? match.status?.description : match.status;
    return original ? String(original).toUpperCase() : 'EN VIVO';
  };

  const getScore = (match: Match, team: 'home' | 'away') => {
    const scoreObj = team === 'home' ? match.homeScore : match.awayScore;
    const teamObj = team === 'home' ? match.homeTeam : match.awayTeam;
    const altTeamObj = team === 'home' ? match.home_team : match.away_team;

    if (scoreObj?.current !== undefined) return scoreObj.current;
    if (teamObj?.score !== undefined) return teamObj.score;
    if (altTeamObj?.score !== undefined) return altTeamObj.score;
    return null;
  };

  const getTeamName = (match: Match, team: 'home' | 'away') => {
    const teamObj = team === 'home' ? match.homeTeam : match.awayTeam;
    const altTeamObj = team === 'home' ? match.home_team : match.away_team;
    return teamObj?.name || altTeamObj?.name || (team === 'home' ? 'Local' : 'Visitante');
  };

  const getTeamLogo = (match: Match, team: 'home' | 'away') => {
    const teamObj = team === 'home' ? match.homeTeam : match.awayTeam;
    const altTeamObj = team === 'home' ? match.home_team : match.away_team;
    const teamId = teamObj?.id || altTeamObj?.id;
    if (teamId) return `https://apivacas.jariel.com.ar/escudos/${teamId}.png`;
    const logoUrl = teamObj?.logoUrl || altTeamObj?.logoUrl || null;
    return logoUrl?.startsWith('/') ? `https://apivacas.jariel.com.ar/api${logoUrl}` : logoUrl;
  };


  const handlePrevDay = () => {
    setSearchDirection(-1);
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const handleNextDay = () => {
    setSearchDirection(1);
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const dailyMatches = allMatches; // El backend ya devuelve filtrado por fecha

  const groupedMatches = dailyMatches.reduce((acc, match) => {
    const tName = match.tournament?.name || match.tournament_name || 'Otros Torneos';
    if (!acc[tName]) acc[tName] = [];
    acc[tName].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const handleCardClick = (id: number) => {
    navigate(`/match/${id}`);
  };

  // ─── Guardar predicciones ──────────────────────────────────────────────────
  const handleSavePredictions = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveToast(null);
    try {
      // Solo mandamos partidos que tienen ambos scores completados Y que no empezaron
      const now = Math.floor(Date.now() / 1000);
      const toSend = allMatches
        .filter(m => {
          const pred = localPredictions[m.id];
          if (!pred || pred.home === '' || pred.away === '') return false;
          if (!m.startTimestamp || m.startTimestamp <= now) return false; // anti-trampa
          return true;
        })
        .map(m => ({
          matchId: m.id,
          homeScore: Number(localPredictions[m.id].home),
          awayScore: Number(localPredictions[m.id].away),
          tournament: m.tournament?.name || m.tournament_name || '',
        }));

      if (toSend.length === 0) {
        setSaveToast({ ok: false, msg: 'No hay predicciones nuevas para guardar.' });
        setTimeout(() => setSaveToast(null), 3000);
        return;
      }

      const res = await fetch('https://apivacas.jariel.com.ar/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, predictions: toSend }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const total = (data.stats?.nuevos ?? 0) + (data.stats?.modificados ?? 0) || toSend.length;
        setSaveToast({ ok: true, msg: `¡${total} pronóstico${total !== 1 ? 's' : ''} guardado${total !== 1 ? 's' : ''} correctamente!` });
      } else {
        setSaveToast({ ok: false, msg: data.error || 'Error al guardar.' });
      }
    } catch (e) {
      setSaveToast({ ok: false, msg: 'Error de conexión.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveToast(null), 4000);
    }
  };

  // ─── Stepper helper ────────────────────────────────────────────────────────
  const stepScore = (matchId: number, side: 'home' | 'away', delta: number) => {
    setLocalPredictions(prev => {
      const cur = prev[matchId] || { home: '0', away: '0' };
      const curVal = parseInt(cur[side] || '0', 10);
      const next = Math.max(0, Math.min(20, curVal + delta));
      return { ...prev, [matchId]: { ...cur, [side]: String(next) } };
    });
  };

  return (
    <div className="w-full flex flex-col gap-8">

      {/* Banner regla de bloqueo — solo en modo predicciones */}
      {isPredictionMode && (
        <div className="flex items-center gap-3 warning-banner border rounded-2xl px-5 py-3">
          <span className="text-lg">🔒</span>
          <p className="text-sm font-semibold">
            <strong className="font-black">Regla:</strong> Los pronósticos se bloquean automáticamente <strong className="font-black">1 hora antes</strong> del comienzo del partido.
          </p>
        </div>
      )}

      {jumpMsg && (
        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl px-5 py-3 animate-pulse">
          <span className="text-xl">⏭️</span>
          <p className="text-indigo-300 text-sm font-bold">
            {jumpMsg}
          </p>
        </div>
      )}

      {/* Cabecera Principal y Navegador de Días */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col text-center md:text-left">
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400">
            Central de Partidos
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Todos los encuentros disponibles</p>
        </div>

        {/* Navegador de Fecha */}
        {selectedDate && (
          <div className="flex items-center gap-4 bg-black/40 px-3 py-2 rounded-2xl border border-white/5">
            <button
              onClick={handlePrevDay}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300 font-bold"
            >
              <span>&lt;</span>
            </button>

            <div className="flex flex-col items-center min-w-[120px]">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-0.5 shadow-sm">FECHA</span>
              <span className="text-sm font-black text-white capitalize shadow-sm">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
            </div>

            <button
              onClick={handleNextDay}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300 font-bold"
            >
              <span>&gt;</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="w-full bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 flex justify-center items-center">
          <span className="text-red-400 font-bold text-lg">{error}</span>
        </div>
      )}

      {!error && (
        <div className={`transition-opacity duration-300 flex flex-col gap-8 ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          {loading && Object.keys(groupedMatches).length === 0 ? (
            <div className="w-full min-h-[300px] flex flex-col justify-center items-center gap-4">
              <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent"></div>
              <span className="text-slate-400 font-medium">Sincronizando central...</span>
            </div>
          ) : Object.keys(groupedMatches).length === 0 ? (
            <div className="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 flex flex-col justify-center items-center text-center">
              <div className="text-5xl mb-4 opacity-50">🏟️</div>
              <span className="text-slate-400 text-lg font-medium">No hay actividad deportiva para la fecha seleccionada.</span>
            </div>
          ) : (
            Object.entries(groupedMatches).map(([tournamentName, tMatches]) => (
              <section key={tournamentName} className="flex flex-col gap-4">

                {/* Section Header */}
                <div className="flex items-center gap-4 px-2">
                  <h2 className="text-lg font-bold tracking-wide text-slate-100 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-800 to-indigo-900 border border-white/10 flex items-center justify-center text-[10px]">⚽</span>
                    {tournamentName}
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>

                {/* Bento Grid para los Partidos - Más compacto */}
                {/* Lista tipo tabla moderna */}
                <div className="flex flex-col bg-[#0b1015]/60 border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                  {tMatches.map((match, idx) => {
                    const status = parseMatchStatus(match);

                    const hScore = getScore(match, 'home');
                    const aScore = getScore(match, 'away');
                    const hName = getTeamName(match, 'home');
                    const aName = getTeamName(match, 'away');
                    const hLogo = getTeamLogo(match, 'home');
                    const aLogo = getTeamLogo(match, 'away');
                    const hId = match.homeTeam?.id || match.home_team?.id;
                    const aId = match.awayTeam?.id || match.away_team?.id;

                    const now = Math.floor(Date.now() / 1000);
                    const oneHourBefore = match.startTimestamp ? match.startTimestamp - 3600 : null;
                    const isLocked = status.isLive || (oneHourBefore !== null && now >= oneHourBefore);
                    const canPredict = isPredictionMode && !status.hasStarted && !isLocked && !!user;
                    const hasPrediction = !!(localPredictions[match.id]?.home !== undefined && localPredictions[match.id]?.away !== undefined);
                    const liveTime = status.isLive ? getMatchTime(match) : null;

                    return (
                      <div
                        key={match.id || idx}
                        className={`group grid grid-cols-[60px_1fr] md:grid-cols-[80px_1fr] items-stretch border-b border-white/5 last:border-0 relative cursor-pointer transition-colors ${status.isLive
                          ? 'bg-red-500/[0.02] hover:bg-red-500/[0.05]'
                          : 'hover:bg-white/[0.03]'
                          }`}
                        onClick={() => handleCardClick(match.id)}
                      >
                        {/* Columna Izquierda: Logo Torneo y Tiempo */}
                        <div className="flex flex-col items-center justify-center border-r border-white/5 py-3 px-1">
                          <div className="w-5 h-5 md:w-6 md:h-6 mb-1.5 opacity-80 flex items-center justify-center overflow-hidden shrink-0">
                            <img
                              src={match.tournament?.category?.flag === 'world' ? 'https://img.icons8.com/color/48/000000/football2.png' : match.tournament?.category?.flag ? `https://img.icons8.com/color/48/000000/${match.tournament.category.flag}.png` : 'https://img.icons8.com/color/48/000000/football2.png'}
                              alt="torneo"
                              className="w-full h-full object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/48/000000/football2.png' }}
                            />
                          </div>
                          {status.isLive ? (
                            <span className="text-red-500 text-[10px] md:text-xs font-black animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.5)] text-center leading-tight break-words">
                              {liveTime || "VIVO"}
                            </span>
                          ) : status.hasStarted ? (
                            <span className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-center leading-tight break-words">{status.label}</span>
                          ) : (
                            <span className="text-slate-300 text-[11px] md:text-sm font-bold text-center leading-tight break-words">
                              {match.startTimestamp
                                ? new Date(match.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : status.label}
                            </span>
                          )}
                        </div>

                        {/* Columna Derecha: Equipos, Score y Prode */}
                        <div className="flex flex-col py-2 px-2 md:px-4 justify-center relative">
                          {match.round_name && (
                            <div className="w-full text-center text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 opacity-80">
                              {match.round_name}
                            </div>
                          )}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 md:gap-4">

                            {/* HOME TEAM */}
                            <div className="flex items-center justify-end gap-2 md:gap-3 text-right bg-transparent border-0 min-w-0">
                              <div className="flex flex-col items-end justify-center min-w-0">
                                <span className="font-bold text-slate-100 text-xs sm:text-sm md:text-[15px] leading-tight line-clamp-2">{hName}</span>
                                <div className="mt-1">
                                  <TeamForm teamId={hId} align="left" />
                                </div>
                              </div>
                              <div className="shrink-0 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
                                {hLogo ? <img src={hLogo} alt={hName} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-white/5 rounded-full" />}
                              </div>
                            </div>

                            {/* CENTER SECTION */}
                            <div className="flex flex-col items-center justify-center">

                              {isPredictionMode && !status.hasStarted && !isLocked && !canPredict && (
                                <div className="text-amber-500/80 text-[9px] uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                                  🔒 Bloqueado
                                </div>
                              )}

                              {canPredict ? (
                                // PREDICTION INPUTS
                                <div className="flex items-center gap-1.5 md:gap-3" onClick={(e) => e.stopPropagation()}>
                                  {/* HOME INPUT */}
                                  <div className="flex items-center bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden group/input hover:border-emerald-500/40 transition-colors">
                                    <button onClick={(e) => { e.stopPropagation(); stepScore(match.id, 'home', -1); }} className="w-6 h-7 sm:w-7 sm:h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs sm:text-sm font-black transition-colors select-none">−</button>
                                    <input
                                      type="text" inputMode="numeric" pattern="[0-9]*"
                                      value={localPredictions[match.id]?.home ?? ''}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="0"
                                      onChange={e => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id] ?? { away: '' }, home: e.target.value.replace(/\D/g, '').slice(0, 2) } }))}
                                      className="w-6 h-7 sm:w-8 sm:h-8 bg-transparent text-center font-black text-sm md:text-base text-emerald-400 outline-none transition-all placeholder:text-slate-700 p-0 m-0"
                                    />
                                    <button onClick={(e) => { e.stopPropagation(); stepScore(match.id, 'home', 1); }} className="w-6 h-7 sm:w-7 sm:h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs sm:text-sm font-black transition-colors select-none">+</button>
                                  </div>

                                  <span className="text-slate-600 font-bold">-</span>

                                  {/* AWAY INPUT */}
                                  <div className="flex items-center bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden group/input hover:border-emerald-500/40 transition-colors">
                                    <button onClick={(e) => { e.stopPropagation(); stepScore(match.id, 'away', -1); }} className="w-6 h-7 sm:w-7 sm:h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs sm:text-sm font-black transition-colors select-none">−</button>
                                    <input
                                      type="text" inputMode="numeric" pattern="[0-9]*"
                                      value={localPredictions[match.id]?.away ?? ''}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="0"
                                      onChange={e => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id] ?? { home: '' }, away: e.target.value.replace(/\D/g, '').slice(0, 2) } }))}
                                      className="w-6 h-7 sm:w-8 sm:h-8 bg-transparent text-center font-black text-sm md:text-base text-emerald-400 outline-none transition-all placeholder:text-slate-700 p-0 m-0"
                                    />
                                    <button onClick={(e) => { e.stopPropagation(); stepScore(match.id, 'away', 1); }} className="w-6 h-7 sm:w-7 sm:h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs sm:text-sm font-black transition-colors select-none">+</button>
                                  </div>
                                </div>
                              ) : status.hasStarted && (hScore !== null || aScore !== null) ? (
                                // LIVE OR FINISHED SCORES
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className={`flex items-center gap-2 md:gap-3 px-2 py-0.5 rounded ${status.isLive ? 'bg-red-500/[0.08] border border-red-500/20' : 'bg-black/30 border border-white/5'}`}>
                                    <span className={`text-base md:text-lg font-black ${status.isLive ? 'text-red-500' : 'text-slate-100'}`}>{hScore ?? 0}</span>
                                    <span className={`text-xs md:text-sm ${status.isLive ? 'text-red-500/50' : 'text-slate-500'}`}>-</span>
                                    <span className={`text-base md:text-lg font-black ${status.isLive ? 'text-red-500' : 'text-slate-100'}`}>{aScore ?? 0}</span>
                                  </div>
                                  {(status as any).isPenalties && (
                                    <PenaltyScoreDisplay matchId={match.id} />
                                  )}
                                </div>
                              ) : (
                                // PENDING NO PREDICTION MODE
                                <div className="flex items-center gap-2 md:gap-3 px-2 py-0.5">
                                  <span className="text-base md:text-lg font-black text-slate-500">-</span>
                                  <span className="text-xs md:text-sm text-slate-600">-</span>
                                  <span className="text-base md:text-lg font-black text-slate-500">-</span>
                                </div>
                              )}

                              {/* MY PREDICTION IF MATCH HAS STARTED */}
                              {isPredictionMode && status.hasStarted && hasPrediction && (
                                <div className="mt-1 flex items-center justify-center gap-1.5 px-2 py-[2px] bg-black/40 border border-white/5 rounded-full">
                                  <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-slate-500">Mi prode</span>
                                  <span className="text-[10px] md:text-[11px] font-black text-emerald-400/90 tracking-widest">
                                    {localPredictions[match.id]?.home}-{localPredictions[match.id]?.away}
                                  </span>
                                </div>
                              )}

                              {/* PRODE TAG HEADER */}
                              {!status.hasStarted && isPredictionMode && !isLocked && canPredict && (
                                <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-emerald-400 text-[8px] md:text-[9px] bg-emerald-400/10 px-1 py-0.5 rounded border border-emerald-400/20 font-bold uppercase tracking-wider">Pronosticar</span>
                                </div>
                              )}

                            </div>

                            {/* AWAY TEAM */}
                            <div className="flex items-center justify-start gap-2 md:gap-3 text-left bg-transparent border-0 min-w-0">
                              <div className="shrink-0 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
                                {aLogo ? <img src={aLogo} alt={aName} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-white/5 rounded-full" />}
                              </div>
                              <div className="flex flex-col items-start justify-center min-w-0">
                                <span className="font-bold text-slate-100 text-xs sm:text-sm md:text-[15px] leading-tight line-clamp-2">{aName}</span>
                                <div className="mt-1">
                                  <TeamForm teamId={aId} align="right" />
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                        {/* Odds row — solo en modo partidos, no predicciones */}
                        {!isPredictionMode && match.odds && (
                          <div className="col-span-2" onClick={e => e.stopPropagation()}>
                            <OddsRow odds={match.odds} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )))}
        </div>
      )}

      {/* ── CS2 Section ── */}
      {!isPredictionMode && <CS2MatchesSection />}

      {/* Spacer para que el cartel de guardar no tape el último partido */}
      {isPredictionMode && <div className="h-32 md:h-24"></div>}

      {/* Toast de feedback */}
      {saveToast && (
        <div className={`fixed bottom-36 md:bottom-28 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl border transition-all ${saveToast.ok
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          : 'bg-red-500/20 border-red-500/40 text-red-300'
          }`}>
          {saveToast.ok ? '✅ ' : '⚠️ '}{saveToast.msg}
        </div>
      )}

      {/* Botón Flotante Guardar */}
      {isPredictionMode && (
        <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleSavePredictions}
            disabled={isSaving}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-black font-black px-8 py-3.5 rounded-full shadow-[0_10px_40px_rgba(16,185,129,0.5)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
          >
            {isSaving ? (
              <><div className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" /> Guardando...</>
            ) : (
              <><span className="text-xl">💾</span> Guardar Predicciones</>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
