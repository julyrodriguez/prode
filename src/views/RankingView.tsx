"use client";
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LEAGUES } from '../components/layout/AppLayout';
import { createPortal } from 'react-dom';
import RankEvolutionChart from '../components/RankEvolutionChart';

interface RankingEntry {
  userId: string;
  name: string;
  correctTendencies: number;
  exactResults: number;
  totalPoints: number;
  tournamentName: string;
  avatarUrl?: string;
}

const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };

const PRODE_USER_IDS = new Set([
  'mDpYgQIEtCVIF8pdQ0HYHWiAyJV2',
  'ZIM8X38poYUZicf38gGzFsj8Tis1',
  'vtiJxm0gJFgpyv74p6wnLnYuSyC3',
  'vNEg4qrr9vQFDYeLt7tFJQ2GXl13',
  'ryCAlOASuTM7BiMQ8VJUfgnCJtt1',
  'jTnexEDtihPrcP1r1dmFm4CFD0z2',
  'POYvW930tTUZZEnfNcIIy8O67692',
  'pffqgeno1jSwZMLws4h7sWmzjEj2',
  'IS6Ap0JmN9OVoGBbvoPCQSIU0xU2',
  'CPJ15xjLbaMJmiEc7fChoFUiDMw2',
  'aayngHYHpsNaw66u8FjG9RvF7Vk1'
]);

function getResult(pred: any): 'exact' | 'tendency' | 'wrong' {
  const { miPronosticoLocal: pl, miPronosticoVisita: pv, golesRealesLocal: gl, golesRealesVisita: gv } = pred;
  if (pl === gl && pv === gv) return 'exact';
  const predSign = pl > pv ? 1 : pl < pv ? -1 : 0;
  const realSign = gl > gv ? 1 : gl < gv ? -1 : 0;
  return predSign === realSign ? 'tendency' : 'wrong';
}

function getPointsForPrediction(
  pred: any,
  match: any | undefined,
  tournamentId: number,
  result: 'exact' | 'tendency' | 'wrong'
): number {
  if (result === 'wrong') return 0;

  // Multiplicador x2 para partidos de Argentina
  const local = (pred.equipoLocal || match?.homeTeam?.name || match?.home_team?.name || '').toLowerCase();
  const visita = (pred.equipoVisita || match?.awayTeam?.name || match?.away_team?.name || '').toLowerCase();
  const esArgentina = local.includes('argentina') || visita.includes('argentina');
  const multiplier = esArgentina ? 2 : 1;

  if (tournamentId === 16) {
    const stage = (match?.stage || match?.round_name || '').toLowerCase();
    const torneo = (pred.torneo || match?.tournament_name || '').toLowerCase();

    // Group stage detection
    const isGroup = torneo.includes('group') || torneo.includes('grupo') || stage.includes('fecha') || stage.includes('group');

    if (isGroup) {
      return (result === 'exact' ? 4 : 2) * multiplier;
    }

    // Knockout phases
    const is16avosTo4tos = 
      stage.includes('32') || 
      stage.includes('16') || 
      stage.includes('octav') || 
      stage.includes('dieciseis') || 
      stage.includes('16av') || 
      stage.includes('quarter') || 
      stage.includes('cuart');

    if (is16avosTo4tos) {
      return (result === 'exact' ? 8 : 4) * multiplier;
    }

    const isSemi = stage.includes('semi');
    if (isSemi) {
      return (result === 'exact' ? 14 : 7) * multiplier;
    }

    const isFinal = stage.includes('final');
    if (isFinal) {
      return (result === 'exact' ? 20 : 10) * multiplier;
    }

    return (result === 'exact' ? 4 : 2) * multiplier;
  }

  return (result === 'exact' ? 6 : 3) * multiplier;
}

export default function RankingView() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const router = useRouter();

  // Get valid leagues with a tournamentId
  const validLeagues = LEAGUES.filter(l => l.tournamentId !== null);
  const [selectedLeague, setSelectedLeague] = useState(validLeagues[0]);

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Lock body scroll when rules modal is open
  useEffect(() => {
    if (showRulesModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showRulesModal]);

  const [rankingTab, setRankingTab] = useState<'prode' | 'stats' | 'evolution'>('prode');
  const [navigatingUserId, setNavigatingUserId] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<Record<string, {
    exact: number;
    tendency: number;
    wrong: number;
    totalPreds: number;
    pointsPerMatch: number;
    hitRate: number;
  }>>({});
  const [predictionsData, setPredictionsData] = useState<Record<string, any[]>>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const rankingHistory = useMemo(() => {
    if (ranking.length === 0 || Object.keys(predictionsData).length === 0) return [];

    const activeRanking = ranking.filter((entry) => PRODE_USER_IDS.has(entry.userId));

    // 1. Gather all unique matches from all users' predictions
    const matchMap = new Map<number, { matchId: number; fechaUnix: number; equipoLocal: string; equipoVisita: string; stage?: string }>();
    
    Object.entries(predictionsData).forEach(([userId, preds]) => {
      preds.forEach(p => {
        if (!matchMap.has(p.matchId)) {
          matchMap.set(p.matchId, {
            matchId: p.matchId,
            fechaUnix: p.fechaUnix,
            equipoLocal: p.equipoLocal,
            equipoVisita: p.equipoVisita,
            stage: p.torneo,
          });
        }
      });
    });

    // Sort matches chronologically
    const sortedMatches = Array.from(matchMap.values()).sort((a, b) => a.fechaUnix - b.fechaUnix);

    if (sortedMatches.length === 0) return [];

    // Create lookup of matches from matches list to resolve stages if needed (for tournamentId 16)
    const allMatchesMap = new Map<number, any>();
    matches.forEach(m => {
      const mId = m.id !== undefined ? m.id : m._id;
      if (mId !== undefined) {
        allMatchesMap.set(mId, m);
      }
    });

    // For each user, index their predictions by matchId for O(1) lookup
    const userPredsMap = new Map<string, Map<number, any>>();
    Object.entries(predictionsData).forEach(([userId, preds]) => {
      const pMap = new Map<number, any>();
      preds.forEach(p => {
        pMap.set(p.matchId, p);
      });
      userPredsMap.set(userId, pMap);
    });

    // Initialize state for each user
    const userStates = activeRanking.map(user => ({
      userId: user.userId,
      name: user.name,
      points: 0,
      exacts: 0,
      tendencies: 0,
    }));

    const steps: any[] = [];

    // Initial step (Step 0) - sorted alphabetically
    const initialRanked = [...userStates].sort((a, b) => a.name.localeCompare(b.name));
    const initialPositions: Record<string, number> = {};
    initialRanked.forEach((u, index) => {
      initialPositions[u.userId] = index + 1;
    });
    
    steps.push({
      match: null,
      rankings: initialRanked.map((u, index) => ({
        userId: u.userId,
        name: u.name,
        points: 0,
        position: index + 1,
      })),
      positionsMap: initialPositions,
    });

    // Loop through matches
    sortedMatches.forEach((matchInfo, matchIdx) => {
      userStates.forEach(userState => {
        const uPredMap = userPredsMap.get(userState.userId);
        if (uPredMap) {
          const pred = uPredMap.get(matchInfo.matchId);
          if (pred) {
            const result = getResult(pred);
            const matchDetail = allMatchesMap.get(matchInfo.matchId);
            const points = getPointsForPrediction(pred, matchDetail, selectedLeague.tournamentId, result);
            userState.points += points;
            if (result === 'exact') {
              userState.exacts += 1;
            } else if (result === 'tendency') {
              userState.tendencies += 1;
            }
          }
        }
      });

      // Sort users by points at this step
      const ranked = [...userStates].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.exacts !== a.exacts) return b.exacts - a.exacts;
        if (b.tendencies !== a.tendencies) return b.tendencies - a.tendencies;
        return a.name.localeCompare(b.name);
      });

      const positionsMap: Record<string, number> = {};
      ranked.forEach((u, index) => {
        positionsMap[u.userId] = index + 1;
      });

      steps.push({
        match: matchInfo,
        rankings: ranked.map((u, index) => ({
          userId: u.userId,
          name: u.name,
          points: u.points,
          position: index + 1,
        })),
        positionsMap,
      });
    });

    return steps;
  }, [ranking, predictionsData, matches, selectedLeague.tournamentId]);

  useEffect(() => {
    const fetchRanking = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(
          `https://apivacas.jariel.com.ar/api/ranking/${selectedLeague.tournamentId}`
        );
        if (!res.ok) throw new Error('No se pudo cargar el ranking');
        const data: RankingEntry[] = await res.json();
        setRanking(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (showLoading) {
          setError(e.message);
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    };
    fetchRanking(true);
    const interval = setInterval(() => fetchRanking(false), 60000); // 1 minuto
    return () => clearInterval(interval);
  }, [selectedLeague.tournamentId]);

  useEffect(() => {
    // Clear stats when tournament changes
    setStatsData({});
    setPredictionsData({});
  }, [selectedLeague.tournamentId]);

  useEffect(() => {
    if ((rankingTab !== 'stats' && rankingTab !== 'evolution') || matches.length > 0) return;
    
    const fetchMatches = async () => {
      try {
        const res = await fetch('https://apivacas.jariel.com.ar/api/matches/all');
        if (res.ok) {
          const data = await res.json();
          setMatches(data);
        }
      } catch (e) {
        console.error("Error fetching matches:", e);
      }
    };
    fetchMatches();
  }, [rankingTab, matches.length]);

  useEffect(() => {
    if ((rankingTab !== 'stats' && rankingTab !== 'evolution') || !selectedLeague.tournamentId || ranking.length === 0) return;
    
    const prodeEntries = ranking.filter(entry => PRODE_USER_IDS.has(entry.userId));
    if (prodeEntries.length === 0) return;
    
    const hasAllStats = prodeEntries.every(entry => statsData[entry.userId] !== undefined);
    if (hasAllStats) return;

    let isMounted = true;
    const fetchAllStats = async () => {
      setLoadingStats(true);
      try {
        const statsMap: Record<string, any> = {};
        const predictionsMap: Record<string, any[]> = {};
        await Promise.all(
          prodeEntries.map(async (entry) => {
            try {
              const res = await fetch(
                `https://apivacas.jariel.com.ar/api/predictions/user/${entry.userId}/tournament/${selectedLeague.tournamentId}`
              );
              if (res.ok) {
                const data: any[] = await res.json();
                const evaluated = data.filter((p) => p.estadoProde === 'evaluated');
                
                const exact = evaluated.filter(p => {
                  const { miPronosticoLocal: pl, miPronosticoVisita: pv, golesRealesLocal: gl, golesRealesVisita: gv } = p;
                  return pl === gl && pv === gv;
                }).length;

                const tendency = evaluated.filter(p => {
                  const { miPronosticoLocal: pl, miPronosticoVisita: pv, golesRealesLocal: gl, golesRealesVisita: gv } = p;
                  if (pl === gl && pv === gv) return false;
                  const predSign = pl > pv ? 1 : pl < pv ? -1 : 0;
                  const realSign = gl > gv ? 1 : gl < gv ? -1 : 0;
                  return predSign === realSign;
                }).length;

                const totalPreds = evaluated.length;
                const wrong = totalPreds - exact - tendency;
                
                statsMap[entry.userId] = {
                  exact,
                  tendency,
                  wrong,
                  totalPreds,
                  pointsPerMatch: totalPreds ? (entry.totalPoints / totalPreds) : 0,
                  hitRate: totalPreds ? Math.round(((exact + tendency) / totalPreds) * 100) : 0,
                };
                predictionsMap[entry.userId] = evaluated;
              }
            } catch (err) {
              console.error(`Error fetching stats for user ${entry.userId}:`, err);
            }
          })
        );
        if (isMounted) {
          setStatsData(prev => ({ ...prev, ...statsMap }));
          setPredictionsData(prev => ({ ...prev, ...predictionsMap }));
        }
      } catch (err) {
        console.error("Error fetching all stats:", err);
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    };

    fetchAllStats();

    return () => {
      isMounted = false;
    };
  }, [rankingTab, selectedLeague.tournamentId, ranking]);

  const activeRanking = ranking.filter((entry) => PRODE_USER_IDS.has(entry.userId));

  const myEntry = user ? activeRanking.find((r) => r.userId === user.uid) : null;
  const myPos = myEntry ? activeRanking.indexOf(myEntry) : -1;

  return (
    <div className="w-full flex flex-col gap-6 pb-10 animate-fade-in">

      {/* ── Cabecera ── */}
      <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-amber-500/8 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/8 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
              🏆 Ranking
            </h1>
            <p className="text-slate-400 font-medium mt-1">
              Participantes clasificados — {activeRanking.length} participantes
            </p>
          </div>

          {/* Mi posición */}
          {myEntry && (
            <div className="flex items-center gap-4 bg-black/40 border border-amber-500/20 px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.08)]">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Mi posición</span>
                <span className="text-3xl font-black text-white">#{myPos + 1}</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Puntos</span>
                <span className="text-3xl font-black text-amber-400">{myEntry.totalPoints}</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Exactos</span>
                <span className="text-3xl font-black text-emerald-400">{myEntry.exactResults}</span>
              </div>
              {selectedLeague.id === 'mundial' && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <button
                    onClick={() => setShowRulesModal(true)}
                    className="flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all text-amber-400 hover:text-amber-300 px-1 cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest">Reglas</span>
                    <span className="text-xl mt-0.5">📜</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Selector de Torneo ── */}
      <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1 gap-1 overflow-x-auto no-scrollbar max-w-full">
        {validLeagues.map((league) => {
          const isActive = selectedLeague.id === league.id;
          return (
            <button
              key={league.id}
              onClick={() => setSelectedLeague(league)}
              className={`
                flex-1 min-w-max px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                ${isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
              `}
            >
              <span className="mr-2">{league.icon}</span>
              {league.name}
            </button>
          );
        })}
      </div>

      {/* ── Estado de carga/error ── */}
      {loading && (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-medium">Cargando ranking...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400 font-bold">
          {error}
        </div>
      )}

      {/* ── Tabla ── */}
      {!loading && !error && ranking.length > 0 && (
        <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-inner mb-4 w-full">
          <button
            onClick={() => setRankingTab('prode')}
            className={`flex-1 text-center px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
              rankingTab === 'prode'
                ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            PRODE
          </button>
          <button
            onClick={() => setRankingTab('stats')}
            className={`flex-1 text-center px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
              rankingTab === 'stats'
                ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            ESTADÍSTICAS
          </button>
          <button
            onClick={() => setRankingTab('evolution')}
            className={`flex-1 text-center px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
              rankingTab === 'evolution'
                ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            EVOLUCIÓN
          </button>
        </div>
      )}

      {/* ── Podio de Ganadores Showcase ── */}
      {!loading && !error && rankingTab === 'prode' && activeRanking.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
          
          {/* 1ER PUESTO (GOLD) */}
          {activeRanking[0] && (
            <div 
              onClick={() => {
                setNavigatingUserId(activeRanking[0].userId);
                router.push(`/predictions/${activeRanking[0].userId}?tournamentId=${selectedLeague.tournamentId}&tournamentName=${encodeURIComponent(selectedLeague.name)}`);
              }}
              className={`relative overflow-hidden border rounded-3xl py-2 px-3 flex items-center gap-3.5 cursor-pointer transition-all duration-300 group hover:scale-[1.02] ${
                isDark 
                  ? 'bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-slate-950/80 border-amber-500/40 shadow-[0_8px_24px_rgba(245,158,11,0.1)] hover:border-amber-500/60' 
                  : 'bg-gradient-to-br from-amber-500/10 via-white to-white border-amber-500/30 shadow-[0_8px_16px_rgba(245,158,11,0.05)] hover:border-amber-500/50'
              }`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
              <div className="absolute top-0 left-0 bg-amber-500 text-black font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-br-xl shadow-sm flex items-center gap-1 z-15">
                <span>👑</span> <span>1º PUESTO</span>
              </div>
              
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-[2px] shadow-[0_0_10px_rgba(245,158,11,0.25)] shrink-0 mt-2">
                <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                  <span className={`absolute z-0 text-sm font-black ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>{activeRanking[0].name?.slice(0, 1).toUpperCase()}</span>
                  <img
                    src={`https://apivacas.jariel.com.ar/users/${activeRanking[0].userId}.webp`}
                    alt={activeRanking[0].name}
                    className="w-full h-full object-cover relative z-10"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 mt-2">
                <h4 className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-amber-450' : 'text-amber-600'}`}>Puntero del Prode</h4>
                <span className={`block font-black text-[15px] truncate transition-colors leading-tight ${isDark ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-amber-600'}`}>
                  {activeRanking[0].name}
                </span>
                <div className={`flex items-center gap-2 mt-0.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span><b className={isDark ? '' : 'text-slate-800'}>{activeRanking[0].totalPoints}</b> PTS</span>
                  <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>·</span>
                  <span><b className={isDark ? '' : 'text-slate-800'}>{activeRanking[0].exactResults}</b> exactos</span>
                </div>
              </div>
              
              <div className="text-right shrink-0 pr-1 mt-2">
                <span className="text-2xl filter drop-shadow-md">🏆</span>
              </div>
            </div>
          )}

          {/* 2DO PUESTO (SILVER) */}
          {activeRanking[1] && (
            <div 
              onClick={() => {
                setNavigatingUserId(activeRanking[1].userId);
                router.push(`/predictions/${activeRanking[1].userId}?tournamentId=${selectedLeague.tournamentId}&tournamentName=${encodeURIComponent(selectedLeague.name)}`);
              }}
              className={`relative overflow-hidden border rounded-3xl py-2 px-3 flex items-center gap-3.5 cursor-pointer transition-all duration-300 group hover:scale-[1.02] ${
                isDark 
                  ? 'bg-gradient-to-br from-slate-400/10 via-slate-900/60 to-slate-950/80 border-slate-400/30 shadow-[0_8px_24px_rgba(148,163,184,0.06)] hover:border-slate-400/50' 
                  : 'bg-gradient-to-br from-slate-400/10 via-white to-white border-slate-300 shadow-[0_8px_16px_rgba(148,163,184,0.03)] hover:border-slate-400/40'
              }`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-slate-400/5 rounded-full blur-xl pointer-events-none group-hover:bg-slate-400/15 transition-all" />
              <div className="absolute top-0 left-0 bg-slate-500 text-white font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-br-xl shadow-sm flex items-center gap-1 z-15">
                <span>🥈</span> <span>2º PUESTO</span>
              </div>
              
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 p-[2px] shadow-[0_0_10px_rgba(148,163,184,0.15)] shrink-0 mt-2">
                <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                  <span className={`absolute z-0 text-sm font-black ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>{activeRanking[1].name?.slice(0, 1).toUpperCase()}</span>
                  <img
                    src={`https://apivacas.jariel.com.ar/users/${activeRanking[1].userId}.webp`}
                    alt={activeRanking[1].name}
                    className="w-full h-full object-cover relative z-10"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 mt-2">
                <h4 className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Escolta</h4>
                <span className={`block font-black text-[15px] truncate transition-colors leading-tight ${isDark ? 'text-white group-hover:text-slate-350' : 'text-slate-900 group-hover:text-slate-600'}`}>
                  {activeRanking[1].name}
                </span>
                <div className={`flex items-center gap-2 mt-0.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span><b className={isDark ? '' : 'text-slate-800'}>{activeRanking[1].totalPoints}</b> PTS</span>
                  <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>·</span>
                  <span><b className={isDark ? '' : 'text-slate-800'}>{activeRanking[1].exactResults}</b> exactos</span>
                </div>
              </div>

              <div className="text-right shrink-0 pr-1 mt-2">
                <span className="text-2xl filter drop-shadow-md">🥈</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Tabla ── */}
      {!loading && !error && ranking.length > 0 && rankingTab !== 'evolution' && (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden shadow-lg">

          {/* Header de columnas */}
          {rankingTab === 'stats' ? (
            <div className="grid grid-cols-[36px_1fr_60px_60px_100px] md:grid-cols-[48px_1fr_90px_90px_200px] items-center px-3 md:px-6 py-3 border-b border-white/5 bg-black/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">#</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Jugador</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Pts/Part</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Eficacia</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-left">Distribución</span>
            </div>
          ) : (
            <div className="grid grid-cols-[36px_1fr_42px_42px_40px] md:grid-cols-[48px_1fr_80px_80px_80px] items-center px-3 md:px-6 py-3 border-b border-white/5 bg-black/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">#</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Jugador</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Tends</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Exacts</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Pts</span>
            </div>
          )}

          {/* Filas */}
          <div className="divide-y divide-white/[0.03]">
            {rankingTab === 'stats' && loadingStats ? (
              <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Calculando estadísticas de los jugadores...</span>
              </div>
            ) : rankingTab === 'stats' ? (
              activeRanking.map((entry, idx) => {
                const isMe = user && entry.userId === user.uid;
                const isLastTwo = activeRanking.length > 2 && idx >= activeRanking.length - 2;
                const rowPadding = 'py-1';
                const rowBg = isLastTwo
                  ? (isMe
                    ? 'bg-red-500/[0.08] border-l-2 border-red-500/50 hover:bg-red-500/[0.12]'
                    : 'bg-red-500/[0.03] border-l-2 border-red-500/20 hover:bg-red-500/[0.06]')
                  : isMe
                    ? 'bg-amber-500/[0.06] border-l-2 border-amber-500/50 hover:bg-amber-500/[0.10]'
                    : 'hover:bg-white/[0.04]';
                const avatarSize = 'w-7 h-7';
                const initialsTextSize = 'text-[10px]';
                const avatarBgClass = isMe
                  ? (isLastTwo ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-amber-500/20 border-amber-500/40 text-amber-300')
                  : isLastTwo
                    ? 'bg-red-500/10 border-red-500/20 text-red-400/90'
                    : 'bg-white/5 border-white/10 text-slate-400';
                const nameTextClass = isLastTwo
                  ? `font-bold text-sm text-red-400 ${isMe ? 'underline decoration-red-500/50' : ''}`
                  : `font-bold text-sm ${isMe ? 'text-amber-300' : 'text-slate-200'}`;

                const userStats = statsData[entry.userId];

                return (
                  <div
                    key={entry.userId}
                    onClick={() => {
                      setNavigatingUserId(entry.userId);
                      router.push(`/predictions/${entry.userId}?tournamentId=${selectedLeague.tournamentId}&tournamentName=${encodeURIComponent(selectedLeague.name)}`);
                    }}
                    className={`grid grid-cols-[36px_1fr_60px_60px_100px] md:grid-cols-[48px_1fr_90px_90px_200px] items-center px-3 md:px-6 cursor-pointer transition-colors duration-75 ${rowPadding} ${rowBg}`}
                  >
                    {/* Posición */}
                    <div className="flex items-center justify-center">
                      {isLastTwo ? (
                        <span className="text-sm font-black filter drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">💀</span>
                      ) : (
                        <span className={`text-sm font-black ${isMe ? 'text-amber-400' : 'text-slate-500'}`}>
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Nombre e Imagen */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`relative rounded-full flex items-center justify-center font-black shrink-0 border overflow-hidden ${avatarSize} ${avatarBgClass}`}>
                        <span className={`absolute z-0 ${initialsTextSize}`}>{entry.name?.slice(0, 1).toUpperCase() || '?'}</span>
                        <img
                          src={`https://apivacas.jariel.com.ar/users/${entry.userId}.webp`}
                          alt={entry.name}
                          className="w-full h-full object-cover relative z-10"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`truncate ${nameTextClass}`}>
                          {entry.name || 'Desconocido'}
                          {isMe && <span className="ml-2 text-[10px] font-semibold text-amber-400/70">(vos)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Puntos / Partido */}
                    <div className="text-center">
                      {userStats ? (
                        <span className={`text-sm font-black ${isLastTwo ? 'text-red-400/80' : 'text-white'}`}>
                          {userStats.pointsPerMatch.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-500">--</span>
                      )}
                    </div>

                    {/* Eficacia */}
                    <div className="text-center">
                      {userStats ? (
                        <span className={`text-sm font-black ${isLastTwo ? 'text-red-400' : 'text-emerald-400'}`}>
                          {userStats.hitRate}%
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-500">--</span>
                      )}
                    </div>

                    {/* Distribución */}
                    <div className="flex items-center min-w-0 pr-1">
                      {userStats ? (
                        <div className="flex flex-col gap-1 w-full">
                          <div className="w-full h-2.5 bg-slate-950/80 rounded-full overflow-hidden flex border border-white/5 p-[1px]">
                            {userStats.exact > 0 && (
                              <div
                                style={{ width: `${(userStats.exact / userStats.totalPreds) * 100}%` }}
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 first:rounded-l-full"
                                title={`Exactos: ${userStats.exact}`}
                              />
                            )}
                            {userStats.tendency > 0 && (
                              <div
                                style={{ width: `${(userStats.tendency / userStats.totalPreds) * 100}%` }}
                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 first:rounded-l-full"
                                title={`Tendencia: ${userStats.tendency}`}
                              />
                            )}
                            {userStats.wrong > 0 && (
                              <div
                                style={{ width: `${(userStats.wrong / userStats.totalPreds) * 100}%` }}
                                className="h-full bg-gradient-to-r from-slate-600 to-slate-750 last:rounded-r-full"
                                title={`Errados: ${userStats.wrong}`}
                              />
                            )}
                          </div>
                          <div className="hidden md:flex justify-between text-[8px] text-slate-455 font-bold px-0.5 leading-none">
                            <span className="text-emerald-400/95">{userStats.exact} Ex.</span>
                            <span className="text-amber-400/95">{userStats.tendency} Ten.</span>
                            <span className="text-slate-500">{userStats.wrong} Er.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-2 bg-white/5 rounded-full animate-pulse" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : activeRanking.length <= 2 ? (
              <div className="p-8 text-center text-slate-500 italic font-medium">No hay más participantes en esta tabla.</div>
            ) : (
              activeRanking.slice(2).map((entry, sliceIdx) => {
                const idx = sliceIdx + 2;
                const isMe = user && entry.userId === user.uid;
                const isMundial = selectedLeague.id === 'mundial';
                const isTop3 = idx < 3;
                const isLastTwo = activeRanking.length > 2 && idx >= activeRanking.length - 2;
                const medal = isMundial
                  ? (idx === 0 ? '🥇' : idx === 1 ? '🥈' : undefined)
                  : MEDAL[idx];

                const rowPadding = idx === 0
                  ? 'py-4 md:py-6'
                  : (isMundial && idx === 1)
                    ? 'py-3 md:py-4'
                    : 'py-1';

                const rowBg = isLastTwo
                  ? (isMe
                    ? 'bg-red-500/[0.08] border-l-2 border-red-500/50 hover:bg-red-500/[0.12]'
                    : 'bg-red-500/[0.03] border-l-2 border-red-500/20 hover:bg-red-500/[0.06]')
                  : idx === 0
                    ? (isMe
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-l-4 border-amber-500 hover:from-amber-500/25 hover:to-amber-500/10'
                      : 'bg-gradient-to-r from-amber-500/10 to-amber-500/[0.02] border-l-4 border-amber-500/50 hover:from-amber-500/15 hover:to-amber-500/[0.05]')
                    : isMe
                      ? 'bg-amber-500/[0.06] border-l-2 border-amber-500/50 hover:bg-amber-500/[0.10]'
                      : (isMundial && idx === 1)
                        ? 'bg-slate-500/[0.02] border-l-2 border-slate-400/20 hover:bg-slate-500/[0.05]'
                        : 'hover:bg-white/[0.04]';

                const medalSize = idx === 0
                  ? 'text-3xl md:text-4xl'
                  : (isMundial && idx === 1)
                    ? 'text-xl md:text-2xl'
                    : 'text-xl';

                const avatarSize = idx === 0
                  ? 'w-12 h-12 md:w-24 md:h-24 shadow-[0_0_20px_rgba(245,158,11,0.2)] border-amber-400/40'
                  : (isMundial && idx === 1)
                    ? 'w-10 h-10 md:w-11 md:h-11'
                    : 'w-7 h-7';

                const initialsTextSize = idx === 0
                  ? 'text-xl md:text-4xl'
                  : (isMundial && idx === 1)
                    ? 'text-sm md:text-base'
                    : 'text-[10px]';

                const avatarBgClass = isMe
                  ? (isLastTwo ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-amber-500/20 border-amber-500/40 text-amber-300')
                  : (isMundial && idx === 0)
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : (isMundial && idx === 1)
                      ? 'bg-slate-500/20 border-slate-500/30 text-slate-300'
                      : isLastTwo
                        ? 'bg-red-500/10 border-red-500/20 text-red-400/90'
                        : isTop3 && !isMundial
                          ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-slate-400';

                const nameTextClass = idx === 0
                  ? 'text-base md:text-2xl font-black text-amber-300'
                  : (isMundial && idx === 1)
                    ? 'text-sm md:text-base font-extrabold text-slate-200'
                    : isLastTwo
                      ? `font-bold text-sm text-red-400 ${isMe ? 'underline decoration-red-500/50' : ''}`
                      : `font-bold text-sm ${isMe ? 'text-amber-300' : 'text-slate-200'}`;

                const pointsClass = idx === 0
                  ? 'text-xl md:text-3xl font-black text-amber-400'
                  : (isMundial && idx === 1)
                    ? 'text-base md:text-lg font-black text-slate-200'
                    : `text-base font-black ${isMe ? 'text-amber-400' : (idx < 3) ? 'text-white' : 'text-slate-300'}`;

                return (
                  <div
                    key={entry.userId}
                    onClick={() => {
                      setNavigatingUserId(entry.userId);
                      router.push(`/predictions/${entry.userId}?tournamentId=${selectedLeague.tournamentId}&tournamentName=${encodeURIComponent(selectedLeague.name)}`);
                    }}
                    className={`grid grid-cols-[36px_1fr_42px_42px_40px] md:grid-cols-[48px_1fr_80px_80px_80px] items-center px-3 md:px-6 cursor-pointer transition-colors duration-75 ${rowPadding} ${rowBg}`}
                  >
                    {/* Posición */}
                    <div className="flex items-center justify-center">
                      {isLastTwo ? (
                        <span className="text-sm md:text-base inline-block text-center filter drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">💀</span>
                      ) : medal ? (
                        <span className={medalSize}>{medal}</span>
                      ) : (
                        <span className={`text-sm font-black ${isMe ? 'text-amber-400' : 'text-slate-500'}`}>{idx + 1}</span>
                      )}
                    </div>

                    {/* Nombre e Imagen */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className={`relative rounded-full flex items-center justify-center font-black shrink-0 border overflow-hidden ${avatarSize} ${avatarBgClass}`}>
                        <span className={`absolute z-0 ${initialsTextSize}`}>{entry.name?.slice(0, 1).toUpperCase() || '?'}</span>
                        <img
                          src={`https://apivacas.jariel.com.ar/users/${entry.userId}.webp`}
                          alt={entry.name}
                          className="w-full h-full object-cover relative z-10"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <span className={`truncate ${nameTextClass}`}>
                        {entry.name || 'Desconocido'}
                        {isMe && <span className="ml-2 text-[10px] font-semibold text-amber-400/70">(vos)</span>}
                      </span>
                    </div>

                    {/* Tendencias correctas */}
                    <div className="text-center">
                      <span className={`text-sm font-bold ${isLastTwo ? 'text-red-400/70' : 'text-slate-300'}`}>
                        {Math.max(0, entry.correctTendencies - entry.exactResults)}
                      </span>
                    </div>

                    {/* Resultados exactos */}
                    <div className="text-center">
                      <span className={`text-sm font-bold ${isLastTwo ? 'text-red-400/60' : entry.exactResults > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {entry.exactResults}
                      </span>
                    </div>

                    {/* Puntos */}
                    <div className="text-right">
                      <span className={isLastTwo ? 'text-base font-black text-red-500' : pointsClass}>
                        {entry.totalPoints}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Leyenda de puntos */}
          {rankingTab === 'stats' ? (
            <div className="flex flex-wrap gap-4 px-6 py-4 border-t border-white/5 bg-black/10">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span><strong className="text-slate-350">Exactos</strong> (Marcador idéntico)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span><strong className="text-slate-350">Tendencia</strong> (Ganador/empate correcto)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span><strong className="text-slate-350">Errados</strong> (Predicción incorrecta)</span>
              </div>
            </div>
          ) : selectedLeague.id !== 'mundial' && (
            <div className="flex flex-wrap gap-4 px-6 py-4 border-t border-white/5 bg-black/10">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span><strong className="text-slate-300">Resultado exacto</strong> = 6 pts</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span><strong className="text-slate-300">Tendencia correcta</strong> = 3 pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Evolution Chart Tab ── */}
      {!loading && !error && ranking.length > 0 && rankingTab === 'evolution' && (
        loadingStats ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3 bg-white/[0.02] border border-white/5 rounded-[2rem]">
            <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Calculando evolución de posiciones...</span>
          </div>
        ) : (
          <RankEvolutionChart
            history={rankingHistory}
            users={activeRanking}
            activeUserId={user?.uid}
          />
        )
      )}

      {/* Sin datos */}
      {!loading && !error && ranking.length === 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-12 flex flex-col items-center gap-4 text-slate-400">
          <div className="text-5xl opacity-30">🏆</div>
          <p className="text-sm font-medium text-center">
            Todavía no hay posiciones para {selectedLeague.name}.<br />
            ¡Sé el primero en hacer tus predicciones!
          </p>
        </div>
      )}

      {/* ── Modal de Reglas Mundial ── */}
      {showRulesModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-modal-fade-in">
          {/* Card */}
          <div className="relative w-full max-w-md bg-[#0b1015] border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl flex flex-col gap-6 animate-modal-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer animate-none!"
            >
              ✕
            </button>

            {/* Header */}
            <div className="text-center">
              <span className="text-4xl">🌍</span>
              <h3 className="text-xl font-black text-white mt-2">Reglas del Mundial</h3>
              <p className="text-xs text-slate-400 mt-1">Puntos otorgados por cada predicción correcta</p>
            </div>

            {/* Content: Phases Table */}
            <div className="flex flex-col gap-4">
              <div className="bg-black/25 rounded-2xl border border-white/5 overflow-hidden">
                <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-2 bg-black/40 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Fase</span>
                  <span className="text-center">Resultado</span>
                  <span className="text-center">Exacto</span>
                </div>
                <div className="divide-y divide-white/[0.03] text-sm">
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">Grupos</span>
                    <span className="text-center font-bold text-indigo-400">2 pts</span>
                    <span className="text-center font-bold text-emerald-400">4 pts</span>
                  </div>
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">16avos a Cuartos</span>
                    <span className="text-center font-bold text-indigo-400">4 pts</span>
                    <span className="text-center font-bold text-emerald-400">8 pts</span>
                  </div>
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">Semifinal</span>
                    <span className="text-center font-bold text-indigo-400">7 pts</span>
                    <span className="text-center font-bold text-emerald-400">14 pts</span>
                  </div>
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">Final</span>
                    <span className="text-center font-bold text-indigo-400">10 pts</span>
                    <span className="text-center font-bold text-emerald-400">20 pts</span>
                  </div>
                </div>
              </div>

              {/* Special Rule for Argentina */}
              <div className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-3.5 flex items-center gap-3 shadow-inner shadow-amber-500/5">
                <span className="text-xl">🇦🇷</span>
                <p className="text-xs text-amber-300 font-semibold leading-normal">
                  <strong className="font-black">Multiplicador Especial:</strong> Todos los partidos de <span className="font-black text-white">Argentina</span> (sin importar la fase) duplican sus puntos (<strong className="font-black">x2</strong>).
                </p>
              </div>

              {/* Podium section */}
              <div className="bg-black/25 rounded-2xl border border-white/5 p-4 flex flex-col gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Predicción del Podio</span>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>🥇</span>
                    <span className="font-semibold text-slate-300">Campeón</span>
                  </div>
                  <span className="font-extrabold text-amber-400">40 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>🥈</span>
                    <span className="font-semibold text-slate-300">Subcampeón</span>
                  </div>
                  <span className="font-extrabold text-slate-400">25 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>🥉</span>
                    <span className="font-semibold text-slate-300">Tercer Puesto</span>
                  </div>
                  <span className="font-extrabold text-amber-600">20 pts</span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-black font-black rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Entendido
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Glassmorphic Page Loading Overlay ── */}
      {navigatingUserId && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 transition-all duration-300">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-indigo-500 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-xl">🔮</span>
          </div>
          <p className="text-white font-black text-sm uppercase tracking-widest animate-pulse">
            Cargando predicciones de {activeRanking.find(r => r.userId === navigatingUserId)?.name || 'usuario'}...
          </p>
        </div>,
        document.body
      )}
    </div>
  );
}
