"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { prefetchMatches } from '../lib/matchCache';
import { useAuth } from '../context/AuthContext';
import TeamForm from '../components/TeamForm';
import CS2MatchesSection from '../components/CS2MatchesSection';
import { Bell } from 'lucide-react';
import { toggleMatchNotification, toggleCompetitionNotification, getUserNotificationPreferences } from '../lib/notifications';
import TeamRedCards from '../components/TeamRedCards';
import MatchGoalsCollapsible from '../components/MatchGoalsCollapsible';
import MatchSkeleton from '../components/MatchSkeleton';
import TeamLogo from '../components/TeamLogo';
import DatePicker from '../components/DatePicker';

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

const getMatchesListCache = (date: string, direction: number, viewMode: 'day' | 'week', isPredictionMode: boolean): any[] | null => {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (!w.__matchesListCache) w.__matchesListCache = {};
  const cacheKey = `${date}_${direction}_${viewMode}_${isPredictionMode}`;
  const entry = w.__matchesListCache[cacheKey];
  if (!entry) return null;
  if (Date.now() - entry.at > 30000) return null; // 30s TTL
  return entry.data;
};

const setMatchesListCache = (date: string, direction: number, viewMode: 'day' | 'week', isPredictionMode: boolean, data: any[]) => {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (!w.__matchesListCache) w.__matchesListCache = {};
  const cacheKey = `${date}_${direction}_${viewMode}_${isPredictionMode}`;
  w.__matchesListCache[cacheKey] = { data, at: Date.now() };
};

const getPredictionsCache = (userId: string): Record<number, { home: string, away: string }> | null => {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (!w.__predictionsCache) w.__predictionsCache = {};
  const entry = w.__predictionsCache[userId];
  if (!entry) return null;
  if (Date.now() - entry.at > 60000) return null; // 60s TTL
  return entry.data;
};

const setPredictionsCache = (userId: string, data: Record<number, { home: string, away: string }>) => {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (!w.__predictionsCache) w.__predictionsCache = {};
  w.__predictionsCache[userId] = { data, at: Date.now() };
};

export default function MatchesView({ isPredictionMode = false }: { isPredictionMode?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [searchDirection, setSearchDirection] = useState<1 | -1>(1);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const [allMatches, setAllMatches] = useState<Match[]>(() => {
    const cached = getMatchesListCache(selectedDate, searchDirection, 'day', isPredictionMode);
    return cached || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = getMatchesListCache(selectedDate, searchDirection, 'day', isPredictionMode);
    return !cached;
  });
  const [error, setError] = useState<string | null>(null);
  const [jumpMsg, setJumpMsg] = useState<string | null>(null);
  const [localPredictions, setLocalPredictions] = useState<Record<number, { home: string, away: string }>>(() => {
    if (user) {
      const cached = getPredictionsCache(user.uid);
      if (cached) return cached;
    }
    return {};
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [redirectingMatchId, setRedirectingMatchId] = useState<number | null>(null);
  const [notifiedMatches, setNotifiedMatches] = useState<number[]>([]);
  const [notifiedCompetitions, setNotifiedCompetitions] = useState<number[]>([]);

  useEffect(() => {
    setRedirectingMatchId(null);
  }, [pathname]);

  useEffect(() => {
    if (user) {
      getUserNotificationPreferences(user.uid).then((prefs) => {
        setNotifiedMatches(prefs.notifiedMatches || []);
        setNotifiedCompetitions(prefs.notifiedCompetitions || []);
      });
    }
  }, [user]);

  const handleToggleMatchNotification = async (matchId: number) => {
    if (!user) return;
    const active = await toggleMatchNotification(user.uid, matchId);
    setNotifiedMatches(prev => 
      active ? [...prev, matchId] : prev.filter(id => id !== matchId)
    );
  };

  const handleToggleCompetitionNotification = async (competitionId: number) => {
    if (!user) return;
    const active = await toggleCompetitionNotification(user.uid, competitionId);
    setNotifiedCompetitions(prev => 
      active ? [...prev, competitionId] : prev.filter(id => id !== competitionId)
    );
  };

  // Filtros de "En vivo" y collapsible de competencias
  const [showOnlyLive, setShowOnlyLive] = useState(false);
  const [collapsedTournaments, setCollapsedTournaments] = useState<Record<string, boolean>>({});

  const toggleTournament = (tournamentName: string) => {
    setCollapsedTournaments(prev => ({
      ...prev,
      [tournamentName]: !prev[tournamentName]
    }));
  };

  useEffect(() => {
    setCollapsedTournaments({});
  }, [selectedDate]);

  useEffect(() => {
    const fetchMatchesAndPredictions = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
        setError(null);
        setAllMatches([]); // Clear matches to trigger skeleton immediately
      }
      try {
        let events: Match[] = [];

        if (viewMode === 'day') {
          const url = new URL('https://apivacas.jariel.com.ar/api/matches/optimized');
          url.searchParams.append('date', selectedDate);
          url.searchParams.append('direction', String(searchDirection));

          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error('No se pudieron obtener los partidos.');
          }

          const data = await response.json();
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
        } else {
          // viewMode === 'week'
          const fetchPromises = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(selectedDate + 'T12:00:00');
            d.setDate(d.getDate() + i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            const url = new URL('https://apivacas.jariel.com.ar/api/matches/optimized');
            url.searchParams.append('date', dateStr);
            url.searchParams.append('direction', '1');
            fetchPromises.push(
              fetch(url.toString())
                .then(async r => {
                  if (!r.ok) return { dateStr, data: null };
                  const data = await r.json();
                  return { dateStr, data };
                })
                .catch(() => ({ dateStr, data: null }))
            );
          }
          const results = await Promise.all(fetchPromises);
          const allWeekMatchesMap = new Map<number, Match>();
          results.forEach(({ dateStr, data }) => {
            if (!data) return;
            const dayMatches: Match[] = data.matches !== undefined
              ? data.matches
              : (Array.isArray(data) ? data : (data.events || data.data || []));
            
            dayMatches.forEach(m => {
              const id = m.id || (m as any)._id;
              if (id != null) {
                if (m.startTimestamp) {
                  const matchDate = new Date(m.startTimestamp * 1000);
                  const matchDateStr = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}-${String(matchDate.getDate()).padStart(2, '0')}`;
                  if (matchDateStr !== dateStr) {
                    return;
                  }
                }
                allWeekMatchesMap.set(Number(id), m);
              }
            });
          });
          events = Array.from(allWeekMatchesMap.values());
          events.sort((a, b) => (a.startTimestamp || 0) - (b.startTimestamp || 0));
        }

        events = events.map((e: any) => ({ ...e, id: e.id || e._id }));

        // Deduplicar partidos por ID
        const seenIds = new Set<number>();
        events = events.filter(e => {
          if (!e.id) return true;
          const numId = Number(e.id);
          if (seenIds.has(numId)) return false;
          seenIds.add(numId);
          return true;
        });

        setAllMatches(events);
        setMatchesListCache(selectedDate, searchDirection, viewMode, isPredictionMode, events);

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
              setPredictionsCache(user.uid, predMap);
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

    const cached = getMatchesListCache(selectedDate, searchDirection, viewMode, isPredictionMode);
    const hasCache = !!cached;
    if (cached) {
      setAllMatches(cached);
      setLoading(false);
      if (user) {
        const cachedPreds = getPredictionsCache(user.uid);
        if (cachedPreds) {
          setLocalPredictions(cachedPreds);
        }
      }
    }

    fetchMatchesAndPredictions(!hasCache);
    const interval = setInterval(() => fetchMatchesAndPredictions(false), 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [user, selectedDate, searchDirection, viewMode]);

  // Prefetch de detalles: apenas cargan los partidos, los bajamos en background
  useEffect(() => {
    if (allMatches.length === 0) return;
    const ids = allMatches.map(m => m.id);
    const cancel = prefetchMatches(ids);
    return cancel;
  }, [allMatches]);

  const parseMatchStatus = (match: Match) => {
    const startMs = (match.startTimestamp || 0) * 1000;
    const isPastTime = startMs > 0 && startMs < Date.now();
    const isOverTwoHours = startMs > 0 && (Date.now() - startMs) > 120 * 60 * 1000; // 2 horas

    // 1. Si status es un string
    if (typeof match.status === 'string') {
      const statusStr = match.status.toLowerCase();
      if (statusStr === 'notstarted') return { isLive: false, hasStarted: false, label: 'Pendiente' };
      if (statusStr === 'inprogress' || statusStr === 'live') return { isLive: true, hasStarted: true, label: 'EN VIVO' };
      if (statusStr === 'finished' || statusStr === 'ended') return { isLive: false, hasStarted: true, label: 'Finalizado' };
      if (statusStr === 'canceled') return { isLive: false, hasStarted: false, label: 'Cancelado' };
      if (statusStr === 'postponed') return { isLive: false, hasStarted: false, label: 'Postergado' };
    }

    // 2. Si status es un objeto
    if (typeof match.status === 'object' && match.status !== null) {
      const type = match.status.type?.toLowerCase();
      const desc = match.status.description?.toLowerCase();

      if (type === 'notstarted') {
        if (desc === 'fro') {
          if (isPastTime) {
            if (isOverTwoHours) {
              return { isLive: false, hasStarted: true, label: 'Finalizado (A confirmar)' };
            }
            return { isLive: false, hasStarted: true, label: 'En juego (Sin vivo)' };
          }
          return { isLive: false, hasStarted: false, label: 'Solo Result. Final' };
        }
        return { isLive: false, hasStarted: false, label: 'Pendiente' };
      }

      if (type === 'inprogress' || type === 'live') {
        return { isLive: true, hasStarted: true, label: match.status.description || 'EN VIVO' };
      }
      if (type === 'finished' || type === 'ended') {
        const isPenalties = desc === 'ap' || desc?.includes('pen');
        return { isLive: false, hasStarted: true, label: 'Finalizado', isPenalties };
      }
      if (type === 'canceled') return { isLive: false, hasStarted: false, label: 'Cancelado' };
      if (type === 'postponed') return { isLive: false, hasStarted: false, label: 'Postergado' };
    }

    // 3. Fallback basado en tiempo
    if (isPastTime) {
      if (isOverTwoHours) {
        return { isLive: false, hasStarted: true, label: 'Finalizado (A confirmar)' };
      }
      return { isLive: true, hasStarted: true, label: 'EN JUEGO' };
    }

    return { isLive: false, hasStarted: false, label: 'Pendiente' };
  };

  const getMatchTime = (match: Match) => {
    if (typeof match.status === 'object' && match.status?.minute) {
      return match.status.minute;
    }
    const statusDesc = typeof match.status === 'object' ? match.status?.description?.toLowerCase() : match.status?.toLowerCase();

    if (statusDesc?.includes('halftime') || statusDesc === 'ht' || statusDesc === 'pause') return 'ET';

    if (statusDesc?.includes('1st') || statusDesc?.includes('first')) {
      return 'PRIMER TIEMPO';
    }
    if (statusDesc?.includes('2nd') || statusDesc?.includes('second')) {
      return 'SEGUNDO TIEMPO';
    }
    if (statusDesc === 'ap' || statusDesc?.includes('pen')) return 'PENALES';
    if (statusDesc === 'aet' || statusDesc?.includes('extra')) return 'TIEMPO EXTRA';

    const original = typeof match.status === 'object' ? match.status?.description : match.status;
    if (!original) return 'EN VIVO';
    const origStr = String(original).trim();
    if (['inprogress', 'in_progress', 'live'].includes(origStr.toLowerCase())) {
      return 'EN VIVO';
    }
    return origStr.toUpperCase();
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
    if (teamId) return `/escudos/${teamId}.png`;
    const logoUrl = teamObj?.logoUrl || altTeamObj?.logoUrl || null;
    return logoUrl?.startsWith('/') ? `https://apivacas.jariel.com.ar/api${logoUrl}` : logoUrl;
  };


  const handlePrevDay = () => {
    setSearchDirection(-1);
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setAllMatches([]); // Clear matches immediately to trigger skeleton
    setLoading(true); // Set loading synchronously to prevent flashing empty message
  };

  const handleNextDay = () => {
    setSearchDirection(1);
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setAllMatches([]); // Clear matches immediately to trigger skeleton
    setLoading(true); // Set loading synchronously to prevent flashing empty message
  };

  const liveMatches = allMatches.filter(m => parseMatchStatus(m).isLive);
  const liveMatchesCount = liveMatches.length;

  const matchesToDisplay = showOnlyLive ? liveMatches : allMatches;

  const groupedMatches = matchesToDisplay.reduce((acc, match) => {
    let tName = match.tournament?.name || match.tournament_name || 'Otros Torneos';
    
    // Agrupar todos los partidos del mundial en una única sección
    const isWorldCup = match.tournament?.id === 16 ||
                       tName.toLowerCase().includes('copa mundial') ||
                       tName.toLowerCase().includes('world cup') ||
                       (tName.toLowerCase().includes('mundial') && !tName.toLowerCase().includes('clubes'));
                       
    if (isWorldCup) {
      // Extraer el grupo o fase si está presente, por ej. "Copa Mundial de la FIFA, Grupo A" -> "Grupo A"
      let groupLabel = '';
      const parts = tName.split(',');
      if (parts.length > 1) {
        groupLabel = parts[parts.length - 1].trim();
      } else {
        const matchGroup = tName.match(/(Grupo\s+[A-H]|Group\s+[A-H])/i);
        if (matchGroup) {
          groupLabel = matchGroup[0];
        }
      }
      
      (match as any).worldCupGroupLabel = groupLabel;
      tName = 'Copa Mundial de la FIFA';
    }
    
    if (!acc[tName]) acc[tName] = [];
    acc[tName].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const handleCardClick = (id: number) => {
    router.push(`/match/${id}`);
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
          if (!m.startTimestamp || (m.startTimestamp - 600) <= now) return false; // anti-trampa (10 minutos antes)
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
            <strong className="font-black">Regla:</strong> Los pronósticos se bloquean automáticamente <strong className="font-black">10 minutos antes</strong> del comienzo del partido.
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
      <div className="relative z-30 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col text-center md:text-left">
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400">
            Central de Partidos
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Todos los encuentros disponibles</p>
        </div>

        {/* Navegador de Fecha */}
        {selectedDate && (
          <div className="flex items-center gap-2 md:gap-3 bg-black/40 px-3 py-2 rounded-2xl border border-white/5 relative">
            <button
              onClick={() => {
                setAllMatches([]);
                setLoading(true);
                setViewMode(prev => prev === 'day' ? 'week' : 'day');
              }}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 hover:border-emerald-500/30 transition-all flex items-center gap-1 active:scale-95 transform shrink-0 select-none cursor-pointer"
            >
              {viewMode === 'day' ? (
                <>📅 Semana</>
              ) : (
                <>📆 Día</>
              )}
            </button>

            <div className="w-px h-6 bg-white/10 shrink-0" />

            <button
              onClick={handlePrevDay}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300 font-bold cursor-pointer"
            >
              <span>&lt;</span>
            </button>

            <DatePicker
              selectedDate={selectedDate}
              viewMode={viewMode}
              onChange={(date) => {
                setSelectedDate(date);
                setAllMatches([]);
                setLoading(true);
              }}
            />

            <button
              onClick={handleNextDay}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300 font-bold cursor-pointer"
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
        <div className={`transition-opacity duration-150 flex flex-col gap-8 ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          
          {/* Selector de Filtro (Todos / En Vivo) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-white/5 select-none shrink-0">
              <button
                onClick={() => setShowOnlyLive(false)}
                className={`px-5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                  !showOnlyLive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 text-white shadow-lg shadow-emerald-950/10'
                    : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
                }`}
              >
                <span>🏟️</span> Todos
                <span className="bg-white/10 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {allMatches.length}
                </span>
              </button>

              <button
                onClick={() => setShowOnlyLive(true)}
                className={`px-5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 flex items-center gap-2 relative cursor-pointer ${
                  showOnlyLive
                    ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-white shadow-lg shadow-red-950/10'
                    : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
                }`}
              >
                {liveMatchesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
                <span>🔴</span> En Vivo
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  liveMatchesCount > 0 
                    ? 'bg-red-500/25 text-red-400 border border-red-500/30' 
                    : 'bg-white/10 text-slate-300'
                }`}>
                  {liveMatchesCount}
                </span>
              </button>
            </div>
            
            <div className="text-[11px] md:text-xs text-slate-400 font-medium text-center sm:text-right hidden sm:block">
              {showOnlyLive ? 'Mostrando sólo partidos en juego actualmente' : 'Mostrando todos los partidos de la fecha'}
            </div>
          </div>

          {loading && Object.keys(groupedMatches).length === 0 ? (
            <MatchSkeleton />
          ) : Object.keys(groupedMatches).length === 0 ? (
            <div className="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 flex flex-col justify-center items-center text-center">
              <div className="text-5xl mb-4 opacity-50">{showOnlyLive ? '🔴' : '🏟️'}</div>
              <span className="text-slate-400 text-lg font-medium">
                {showOnlyLive 
                  ? 'No hay partidos en vivo en este momento.' 
                  : 'No hay actividad deportiva para la fecha seleccionada.'}
              </span>
            </div>
          ) : (
            Object.entries(groupedMatches).map(([tournamentName, tMatches]) => {
              const isCollapsed = !!collapsedTournaments[tournamentName];
              return (
                <section key={tournamentName} className="flex flex-col gap-4">

                  {/* Section Header (Collapsible) */}
                  <div 
                    onClick={() => toggleTournament(tournamentName)}
                    className="flex items-center justify-between gap-4 px-3 py-2 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/0 hover:border-white/5 cursor-pointer transition-all duration-200 group/header select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-800 to-indigo-900 border border-white/10 flex items-center justify-center text-[10px] shadow-inner group-hover/header:from-indigo-950 group-hover/header:to-slate-800 transition-all duration-300">
                        ⚽
                      </span>
                      <h2 className="text-sm md:text-base font-bold tracking-wide text-slate-100 group-hover/header:text-emerald-400 transition-colors">
                        {tournamentName}
                      </h2>
                      <span className="text-[10px] md:text-xs bg-white/5 border border-white/5 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                        {tMatches.length} {tMatches.length === 1 ? 'partido' : 'partidos'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="hidden md:block h-px w-24 bg-gradient-to-r from-white/10 to-transparent"></div>
                      {user && tMatches[0]?.tournament?.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCompetitionNotification(tMatches[0].tournament.id!);
                          }}
                          className={`p-1.5 rounded-xl transition-all duration-150 cursor-pointer ${
                            notifiedCompetitions.includes(tMatches[0].tournament.id)
                              ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                          }`}
                          title={
                            notifiedCompetitions.includes(tMatches[0].tournament.id)
                              ? 'Notificaciones activadas para este torneo'
                              : 'Activar notificaciones para este torneo'
                          }
                        >
                          <Bell className={`h-3.5 w-3.5 ${notifiedCompetitions.includes(tMatches[0].tournament.id) ? 'fill-yellow-400' : ''}`} />
                        </button>
                      )}
                      <span className={`text-slate-400 group-hover/header:text-emerald-400 transition-transform duration-300 text-[10px] transform ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}>
                        {isCollapsed ? '▶' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Bento Grid para los Partidos - Collapsible */}
                  {!isCollapsed && (
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
                    const tenMinutesBefore = match.startTimestamp ? match.startTimestamp - 600 : null;
                    const isLocked = status.isLive || (tenMinutesBefore !== null && now >= tenMinutesBefore);
                    const canPredict = isPredictionMode && !status.hasStarted && !isLocked && !!user;
                    const hasPrediction = !!(localPredictions[match.id]?.home !== undefined && localPredictions[match.id]?.away !== undefined);
                    const isArgentina = hName.toLowerCase().includes('argentina') || aName.toLowerCase().includes('argentina');
                    const showGoldStyle = isArgentina;
                    const liveTime = status.isLive ? getMatchTime(match) : null;
                    const isRedirecting = redirectingMatchId === match.id;

                    return (
                      <div
                        key={match.id || idx}
                        className={`group grid grid-cols-[60px_1fr] md:grid-cols-[80px_1fr] items-stretch border-b border-white/5 last:border-0 relative cursor-pointer transition-all duration-300 active:scale-[0.98] ${
                          showGoldStyle
                            ? 'bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.02] to-transparent border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:bg-amber-500/[0.12] hover:border-amber-500/50'
                            : status.isLive
                              ? 'bg-red-500/[0.02] hover:bg-red-500/[0.05]'
                              : 'hover:bg-white/[0.03]'
                        } ${isRedirecting ? 'scale-[0.97] opacity-60 pointer-events-none animate-pulse' : ''}`}
                        onClick={() => {
                          setRedirectingMatchId(match.id);
                          handleCardClick(match.id);
                        }}
                      >
                        {/* Columna Izquierda: Logo Torneo y Tiempo */}
                        <div className="row-span-2 flex flex-col items-center justify-center border-r border-white/5 py-2 px-1">
                          <div className="w-4 h-4 md:w-5 md:h-5 mb-1 opacity-80 flex items-center justify-center overflow-hidden shrink-0">
                            {isRedirecting ? (
                              <div className="animate-spin w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent" />
                            ) : (
                              <img
                                src={match.tournament?.category?.flag === 'world' ? '/football2.png' : match.tournament?.category?.flag ? `https://img.icons8.com/color/48/000000/${match.tournament.category.flag}.png` : '/football2.png'}
                                alt="torneo"
                                className="w-full h-full object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/football2.png' }}
                              />
                            )}
                          </div>
                          {viewMode === 'week' && match.startTimestamp && (
                            <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider text-center leading-none mb-1">
                              {new Date(match.startTimestamp * 1000).toLocaleDateString('es-ES', {
                                weekday: 'short', day: '2-digit'
                              }).replace('.', '')}
                            </span>
                          )}
                          {status.isLive ? (
                            <span className="text-red-500 text-[9px] md:text-[11px] font-black animate-pulse drop-shadow-[0_0_4px_rgba(239,68,68,0.5)] text-center leading-tight break-words">
                              {liveTime || "VIVO"}
                            </span>
                          ) : status.hasStarted ? (
                            <span className="text-slate-500 text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-center leading-tight break-words">{status.label}</span>
                          ) : (
                            <span className="text-slate-300 text-[10px] md:text-xs font-bold text-center leading-tight break-words">
                              {match.startTimestamp
                                ? new Date(match.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : status.label}
                            </span>
                          )}
                        </div>

                        {/* Columna Derecha: Equipos, Score y Prode */}
                        <div className="flex flex-col py-1.5 pl-2 pr-10 md:pl-3 md:pr-12 justify-center relative">
                          {user && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMatchNotification(match.id);
                              }}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                                notifiedMatches.includes(match.id)
                                  ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                              }`}
                              title={
                                notifiedMatches.includes(match.id)
                                  ? 'Notificaciones activadas para este partido'
                                  : 'Activar notificaciones para este partido'
                              }
                            >
                              <Bell className={`h-4 w-4 ${notifiedMatches.includes(match.id) ? 'fill-yellow-400' : ''}`} />
                            </button>
                          )}
                          {(match.round_name || (match as any).worldCupGroupLabel || (showGoldStyle && isPredictionMode)) && (
                            <div className="w-full text-center text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1 opacity-80 flex items-center justify-center gap-1.5">
                              {match.round_name && <span>{match.round_name}</span>}
                              {(match as any).worldCupGroupLabel && <span>{(match as any).worldCupGroupLabel}</span>}
                              {showGoldStyle && isPredictionMode && (
                                <span className="bg-amber-500/25 text-amber-400 border border-amber-500/35 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest animate-pulse">
                                  💥 X2 PUNTOS
                                </span>
                              )}
                            </div>
                          )}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 md:gap-3">

                            {/* HOME TEAM */}
                            <div className="flex items-center justify-end gap-2 md:gap-3 text-right bg-transparent border-0 min-w-0">
                              <div className="flex flex-col items-end justify-center min-w-0">
                                <div className="relative inline-block">
                                  <TeamRedCards matchId={match.id} hasStarted={status.hasStarted} isLive={status.isLive} isHome={true} />
                                  <span className={`font-bold text-xs sm:text-[13px] md:text-sm leading-tight line-clamp-2 ${hName.toLowerCase().includes('argentina') ? 'bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-slate-100'}`}>{hName}</span>
                                </div>
                                <div className="mt-1">
                                  <TeamForm teamId={hId} align="left" />
                                </div>
                              </div>
                              <div className="shrink-0 w-5.5 h-5.5 md:w-7 md:h-7 flex items-center justify-center">
                                <TeamLogo logoUrl={hLogo} teamName={hName} className="w-full h-full" />
                              </div>
                            </div>

                            {/* CENTER SECTION */}
                            <div className="flex flex-col items-center justify-center">

                              {isPredictionMode && !status.hasStarted && !isLocked && !canPredict && (
                                <div className="text-amber-500/80 text-[8px] uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                                  🔒 Bloqueado
                                </div>
                              )}

                              {canPredict ? (
                                // PREDICTION INPUTS
                                <div className="flex items-center gap-1 md:gap-2" onClick={(e) => e.stopPropagation()}>
                                  {/* HOME INPUT */}
                                  <div className="flex items-center bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden group/input hover:border-emerald-500/40 transition-colors">
                                    <button onClick={(e) => { e.stopPropagation(); stepScore(match.id, 'home', -1); }} className="w-5 h-6 sm:w-6 sm:h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs sm:text-sm font-black transition-colors select-none">−</button>
                                    <input
                                      type="text" inputMode="numeric" pattern="[0-9]*"
                                      value={localPredictions[match.id]?.home ?? ''}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="0"
                                      onChange={e => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id] ?? { away: '' }, home: e.target.value.replace(/\D/g, '').slice(0, 2) } }))}
                                      className="w-5 h-6 sm:w-6.5 sm:h-7 bg-transparent text-center font-black text-xs sm:text-sm text-emerald-400 outline-none transition-all placeholder:text-slate-700 p-0 m-0"
                                    />
                                    <button onClick={(e) => { e.stopPropagation(); stepScore(match.id, 'home', 1); }} className="w-5 h-6 sm:w-6 sm:h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs sm:text-sm font-black transition-colors select-none">+</button>
                                  </div>

                                  <span className="text-slate-600 font-bold text-xs">-</span>

                                  {/* AWAY INPUT */}
                                  <div className="flex items-center bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden group/input hover:border-emerald-500/40 transition-colors">
                                    <button onClick={(e) => { e.stopPropagation(); stepScore(match.id, 'away', -1); }} className="w-5 h-6 sm:w-6 sm:h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs sm:text-sm font-black transition-colors select-none">−</button>
                                    <input
                                      type="text" inputMode="numeric" pattern="[0-9]*"
                                      value={localPredictions[match.id]?.away ?? ''}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="0"
                                      onChange={e => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id] ?? { home: '' }, away: e.target.value.replace(/\D/g, '').slice(0, 2) } }))}
                                      className="w-5 h-6 sm:w-6.5 sm:h-7 bg-transparent text-center font-black text-xs sm:text-sm text-emerald-400 outline-none transition-all placeholder:text-slate-700 p-0 m-0"
                                    />
                                    <button onClick={(e) => { e.stopPropagation(); stepScore(match.id, 'away', 1); }} className="w-5 h-6 sm:w-6 sm:h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs sm:text-sm font-black transition-colors select-none">+</button>
                                  </div>
                                </div>
                              ) : status.hasStarted && (hScore !== null || aScore !== null) ? (
                                // LIVE OR FINISHED SCORES
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className={`flex items-center gap-1.5 md:gap-2 px-1.5 py-0.5 rounded ${status.isLive ? 'bg-red-500/[0.08] border border-red-500/20' : 'bg-black/30 border border-white/5'}`}>
                                    <span className={`text-sm md:text-[15px] font-black ${status.isLive ? 'text-red-500' : 'text-slate-100'}`}>{hScore ?? 0}</span>
                                    <span className={`text-[10px] md:text-xs ${status.isLive ? 'text-red-500/50' : 'text-slate-500'}`}>-</span>
                                    <span className={`text-sm md:text-[15px] font-black ${status.isLive ? 'text-red-500' : 'text-slate-100'}`}>{aScore ?? 0}</span>
                                  </div>
                                  {(status as any).isPenalties && (
                                    <PenaltyScoreDisplay matchId={match.id} />
                                  )}
                                </div>
                              ) : (
                                // PENDING NO PREDICTION MODE
                                <div className="flex items-center gap-1.5 md:gap-2 px-1.5 py-0.5">
                                  <span className="text-sm md:text-[15px] font-black text-slate-500">-</span>
                                  <span className="text-[10px] md:text-xs text-slate-600">-</span>
                                  <span className="text-sm md:text-[15px] font-black text-slate-500">-</span>
                                </div>
                              )}

                              {/* MY PREDICTION IF MATCH HAS STARTED */}
                              {isPredictionMode && status.hasStarted && hasPrediction && (
                                <div className="mt-1 flex items-center justify-center gap-1.5 px-2 py-[2px] bg-black/40 border border-white/5 rounded-full">
                                  <span className="text-[7.5px] md:text-[8px] uppercase font-bold tracking-widest text-slate-500">Mi prode</span>
                                  <span className="text-[9px] md:text-[10px] font-black text-emerald-400/90 tracking-widest">
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
                              <div className="shrink-0 w-5.5 h-5.5 md:w-7 md:h-7 flex items-center justify-center">
                                <TeamLogo logoUrl={aLogo} teamName={aName} className="w-full h-full" />
                              </div>
                              <div className="flex flex-col items-start justify-center min-w-0">
                                <div className="relative inline-block">
                                  <TeamRedCards matchId={match.id} hasStarted={status.hasStarted} isLive={status.isLive} isHome={false} />
                                  <span className={`font-bold text-xs sm:text-[13px] md:text-sm leading-tight line-clamp-2 ${aName.toLowerCase().includes('argentina') ? 'bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-slate-100'}`}>{aName}</span>
                                </div>
                                <div className="mt-1">
                                  <TeamForm teamId={aId} align="right" />
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                        {/* Goles colapsables debajo de cada partido */}
                        <div className="col-start-2" onClick={e => e.stopPropagation()}>
                          <MatchGoalsCollapsible matchId={match.id} hasStarted={status.hasStarted} />
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          }))}
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
