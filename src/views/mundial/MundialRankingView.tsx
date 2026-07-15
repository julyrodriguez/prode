"use client";
import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { DashboardContext } from '../../app/(dashboard)/layout';
import { LEAGUES } from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import RankEvolutionChart from '../../components/RankEvolutionChart';
import { Eye } from 'lucide-react';

type LeagueType = typeof LEAGUES[number];

interface RankingEntry {
  userId: string;
  name: string;
  correctTendencies: number;
  exactResults: number;
  totalPoints: number;
  tournamentName: string;
  avatarUrl?: string;
  podiumPointsSimulated?: number;
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

function getResult(pred: any, match?: any, tournamentId?: number): 'exact' | 'tendency' | 'wrong' {
  if (pred.pointsEarned !== undefined && pred.pointsEarned !== null) {
    if (pred.pointsEarned === 0) return 'wrong';
    const exactPts = getPointsForPrediction(pred, match, tournamentId || 16, 'exact');
    if (pred.pointsEarned === exactPts) return 'exact';
    return 'tendency';
  }

  const { miPronosticoLocal: pl, miPronosticoVisita: pv, golesRealesLocal: gl, golesRealesVisita: gv } = pred;
  if (pl === gl && pv === gv) return 'exact';
  const predSign = pl > pv ? 1 : pl < pv ? -1 : 0;
  const realSign = gl > gv ? 1 : gl < gv ? -1 : 0;
  return predSign === realSign ? 'tendency' : 'wrong';
}

const parseMatchStatus = (match: any) => {
  if (!match || !match.status) return { isLive: false, hasStarted: false, label: 'Pendiente' };
  if (match.status === 'notstarted') return { isLive: false, hasStarted: false, label: 'Pendiente' };
  if (typeof match.status === 'object' && match.status !== null) {
    if (match.status.type === 'notstarted' && match.status.description === 'FRO') {
      return { isLive: false, hasStarted: false, label: 'Pendiente' };
    }
    if (match.status.type === 'inprogress') return { isLive: true, hasStarted: true, label: match.status.description || 'EN VIVO' };
    if (match.status.type === 'finished') {
      const isPenalties = match.status.description === 'AP';
      return { isLive: false, hasStarted: true, label: 'Finalizado', isPenalties };
    }
    if (match.status.type === 'canceled') return { isLive: false, hasStarted: false, label: 'Cancelado' };
  }
  const statusDesc = typeof match.status === 'object' ? match.status?.description?.toLowerCase() : match.status?.toLowerCase();
  if (statusDesc?.includes('halftime') || statusDesc === 'ht' || statusDesc === 'pause') return { isLive: true, hasStarted: true, label: 'ET' };
  if (statusDesc?.includes('1st') || statusDesc?.includes('first')) return { isLive: true, hasStarted: true, label: '1T' };
  if (statusDesc?.includes('2nd') || statusDesc?.includes('second')) return { isLive: true, hasStarted: true, label: '2T' };
  if (statusDesc === 'aet' || statusDesc?.includes('extra')) return { isLive: true, hasStarted: true, label: 'TS' };
  if (statusDesc === 'ap' || statusDesc?.includes('pen')) return { isLive: true, hasStarted: true, label: 'PEN' };
  
  return { isLive: false, hasStarted: true, label: 'Finalizado' };
};

const getScore = (match: any, team: 'home' | 'away') => {
  if (!match) return null;
  const scoreObj = team === 'home' ? match.homeScore : match.awayScore;
  const teamObj = team === 'home' ? match.homeTeam : match.awayTeam;
  const altTeamObj = team === 'home' ? match.home_team : match.away_team;
  if (scoreObj?.current !== undefined) return scoreObj.current;
  if (teamObj?.score !== undefined) return teamObj.score;
  if (altTeamObj?.score !== undefined) return altTeamObj.score;
  return null;
};

function getPredictionResult(pred: any, match: any): 'exact' | 'tendency' | 'wrong' | null {
  const pl = pred.miPronosticoLocal;
  const pv = pred.miPronosticoVisita;
  
  if (pl === undefined || pv === undefined || pl === null || pv === null) return null;
  
  let gl = pred.golesRealesLocal;
  let gv = pred.golesRealesVisita;
  
  if (pred.estadoProde !== 'evaluated' && match) {
    const status = parseMatchStatus(match);
    if (status.hasStarted) {
      const liveGl = getScore(match, 'home');
      const liveGv = getScore(match, 'away');
      if (liveGl !== null && liveGv !== null) {
        gl = liveGl;
        gv = liveGv;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  
  if (gl === null || gv === null || gl === undefined || gv === undefined) return null;
  
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

  const local = (pred.equipoLocal || match?.homeTeam?.name || match?.home_team?.name || '').toLowerCase();
  const visita = (pred.equipoVisita || match?.awayTeam?.name || match?.away_team?.name || '').toLowerCase();
  const esArgentina = local.includes('argentina') || visita.includes('argentina');
  let multiplier = esArgentina ? 2 : 1;

  if (tournamentId === 16) {
    const roundName = (
      match?.roundInfo?.name || 
      match?.roundInfo?.slug || 
      match?.round_name || 
      match?.stage || 
      pred?.stage ||
      pred?.round_name ||
      ""
    ).toLowerCase();

    // 1. FINAL
    if (roundName.includes('final') && !roundName.includes('semi') && !roundName.includes('quarter') && !roundName.includes('cuart') && !roundName.includes('eighth') && !roundName.includes('octav') && !roundName.includes('16')) {
      return (result === 'exact' ? 20 : 10) * multiplier;
    }
    // 2. SEMIFINAL
    else if (roundName.includes('semi')) {
      return (result === 'exact' ? 16 : 8) * multiplier;
    }
    // 3. CUARTOS (12 exacto, 6 tendencia)
    else if (roundName.includes('quarter') || roundName.includes('cuart')) {
      return (result === 'exact' ? 12 : 6) * multiplier;
    }
    // 4. Octavos (16avos, Round of 16, Eighth finals, Octavos, Dieciseisavos)
    else if (roundName.includes('16') || roundName.includes('eighth') || roundName.includes('round of 16') || roundName.includes('octav') || roundName.includes('dieciseis')) {
      return (result === 'exact' ? 8 : 4) * multiplier;
    }
    // 5. FASE DE GRUPOS (4 puntos exacto, 2 puntos tendencia)
    else {
      return (result === 'exact' ? 4 : 2) * multiplier;
    }
  }

  // Lógica para otros torneos
  let puntosBase = result === 'exact' ? 6 : 3;
  let mult = 1;
  const matchTorneoName = (match?.tournament_name || match?.tournament?.name || '').toLowerCase();
  if (matchTorneoName === "liga profesional de fútbol, apertura playoffs") {
    const roundName = (
      match?.roundInfo?.name || 
      match?.roundInfo?.slug || 
      match?.round_name || 
      match?.stage || 
      ""
    ).toLowerCase();
    if (roundName.includes('final')) mult = 3;
  }

  return puntosBase * mult * multiplier;
}

export default function MundialRankingView() {
  const leagueId = 'mundial';
  const activeLeague = LEAGUES.find(l => l.id === leagueId) || LEAGUES[0];
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const router = useRouter();

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isCensoredUnlocked, setIsCensoredUnlocked] = useState(false);
  const [showCensorConfirmModal, setShowCensorConfirmModal] = useState(false);

  // Estados para simulación del podio del Mundial
  const [simulatedPodium, setSimulatedPodium] = useState<{
    champion: string;
    runnerUp: string;
    thirdPlace: string;
  }>({
    champion: '',
    runnerUp: '',
    thirdPlace: '',
  });

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
  const [podiumPredictions, setPodiumPredictions] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
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
  const [showLivePoints, setShowLivePoints] = useState(false);

  const tournamentId = activeLeague.tournamentId;

  const rankingHistory = useMemo(() => {
    if (ranking.length === 0 || Object.keys(predictionsData).length === 0 || !tournamentId) return [];

    const activeRanking = ranking.filter((entry) => PRODE_USER_IDS.has(entry.userId));

    // 1. Gather all unique matches from all users' predictions
    const matchMap = new Map<number, { matchId: number; fechaUnix: number; equipoLocal: string; equipoVisita: string; stage?: string }>();
    
    Object.entries(predictionsData).forEach(([userId, preds]) => {
      // ONLY use evaluated predictions for the historical rank evolution chart
      const evaluatedPreds = preds.filter(p => p.estadoProde === 'evaluated');
      evaluatedPreds.forEach(p => {
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
        allMatchesMap.set(Number(mId), m);
      }
    });

    // For each user, index their predictions by matchId for O(1) lookup
    const userPredsMap = new Map<string, Map<number, any>>();
    Object.entries(predictionsData).forEach(([userId, preds]) => {
      const pMap = new Map<number, any>();
      // Filter to only evaluated predictions for history
      const evaluatedPreds = preds.filter(p => p.estadoProde === 'evaluated');
      evaluatedPreds.forEach(p => {
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
          const pred = uPredMap.get(Number(matchInfo.matchId));
          if (pred) {
            const matchDetail = allMatchesMap.get(Number(matchInfo.matchId));
            const result = getResult(pred, matchDetail, tournamentId);
            const points = getPointsForPrediction(pred, matchDetail, tournamentId, result);
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
  }, [ranking, predictionsData, matches, tournamentId]);

  // Helper: cambio de posición vs. último partido jugado (o vs. oficial en vivo)
  const getPosChangeFor = (userId: string, currentPosIdx: number): number => {
    if (showLivePoints) {
      const officialIdx = activeRanking.findIndex(r => r.userId === userId);
      if (officialIdx === -1) return 0;
      return officialIdx - currentPosIdx;
    }
    const lastIdx = rankingHistory.length - 1;
    if (lastIdx <= 0) return 0;
    const prev = rankingHistory[lastIdx - 1].positionsMap[userId];
    const cur  = rankingHistory[lastIdx].positionsMap[userId];
    if (prev === undefined || cur === undefined) return 0;
    return prev - cur;
  };

  useEffect(() => {
    if (activeLeague.id !== 'mundial') return;
    
    let isMounted = true;
    const fetchPodiumPredictions = async () => {
      setLoadingPredictions(true);
      try {
        const response = await fetch('https://apivacas.jariel.com.ar/api/mundial/predictions');
        if (!response.ok) throw new Error('Error al obtener predicciones');
        const json = await response.json();
        if (isMounted && json.success) {
          setPodiumPredictions(json.data || []);
        }
      } catch (err) {
        console.error("Error fetching podium predictions:", err);
      } finally {
        if (isMounted) setLoadingPredictions(false);
      }
    };
    
    fetchPodiumPredictions();
    
    return () => {
      isMounted = false;
    };
  }, [activeLeague.id]);

  useEffect(() => {
    if (!tournamentId) return;
    const fetchRanking = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/ranking/${tournamentId}`);
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
  }, [tournamentId]);

  useEffect(() => {
    // Clear stats when tournament changes
    setStatsData({});
    setPredictionsData({});
  }, [tournamentId]);

  useEffect(() => {
    if (matches.length > 0) return;
    
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
  }, [matches.length]);

  useEffect(() => {
    if (!tournamentId || ranking.length === 0) return;
    
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
                `https://apivacas.jariel.com.ar/api/predictions/user/${entry.userId}/tournament/${tournamentId}`
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
                predictionsMap[entry.userId] = data;
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
  }, [tournamentId, ranking]);

  const activeRanking = ranking.filter((entry) => PRODE_USER_IDS.has(entry.userId));

  const liveRanking = useMemo(() => {
    if (!showLivePoints || ranking.length === 0 || matches.length === 0) {
      return activeRanking;
    }
    
    // Find all matches that are currently live (inprogress)
    const liveMatches = matches.filter(m => {
      const status = parseMatchStatus(m);
      return status.isLive;
    });

    if (liveMatches.length === 0) {
      return activeRanking;
    }

    const liveMatchesMap = new Map<number, any>();
    liveMatches.forEach(m => {
      const mId = m.id !== undefined ? m.id : m._id;
      if (mId !== undefined) {
        liveMatchesMap.set(Number(mId), m);
      }
    });

    const updatedEntries = activeRanking.map(entry => {
      const preds = predictionsData[entry.userId] || [];
      
      let extraPoints = 0;
      let extraExacts = 0;
      let extraTendencies = 0;

      preds.forEach(pred => {
        const match = liveMatchesMap.get(Number(pred.matchId));
        if (match) {
          const result = getPredictionResult(pred, match);
          if (result && result !== 'wrong') {
            const points = getPointsForPrediction(pred, match, tournamentId, result);
            extraPoints += points;
            if (result === 'exact') {
              extraExacts += 1;
              extraTendencies += 1;
            } else if (result === 'tendency') {
              extraTendencies += 1;
            }
          }
        }
      });

      return {
        ...entry,
        totalPoints: entry.totalPoints + extraPoints,
        exactResults: entry.exactResults + extraExacts,
        correctTendencies: entry.correctTendencies + extraTendencies,
      };
    });

    return [...updatedEntries].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactResults !== a.exactResults) return b.exactResults - a.exactResults;
      if (b.correctTendencies !== a.correctTendencies) return b.correctTendencies - a.correctTendencies;
      return a.name.localeCompare(b.name);
    });

  }, [showLivePoints, ranking, predictionsData, matches, tournamentId, activeRanking]);

  const liveStatsData = useMemo(() => {
    if (!showLivePoints || Object.keys(predictionsData).length === 0 || matches.length === 0) {
      return statsData;
    }

    const liveMatches = matches.filter(m => {
      const status = parseMatchStatus(m);
      return status.isLive;
    });

    if (liveMatches.length === 0) {
      return statsData;
    }

    const liveMatchesMap = new Map<number, any>();
    liveMatches.forEach(m => {
      const mId = m.id !== undefined ? m.id : m._id;
      if (mId !== undefined) {
        liveMatchesMap.set(Number(mId), m);
      }
    });

    const calculatedStats: Record<string, any> = {};

    Object.entries(statsData).forEach(([userId, officialStats]) => {
      const preds = predictionsData[userId] || [];
      
      let extraExact = 0;
      let extraTendency = 0;
      let extraWrong = 0;
      let extraPoints = 0;
      let extraPreds = 0;

      preds.forEach(pred => {
        const match = liveMatchesMap.get(Number(pred.matchId));
        if (match) {
          const result = getPredictionResult(pred, match);
          if (result) {
            extraPreds += 1;
            const points = getPointsForPrediction(pred, match, tournamentId, result);
            extraPoints += points;
            
            if (result === 'exact') {
              extraExact += 1;
            } else if (result === 'tendency') {
              extraTendency += 1;
            } else {
              extraWrong += 1;
            }
          }
        }
      });

      const totalPreds = officialStats.totalPreds + extraPreds;
      const exact = officialStats.exact + extraExact;
      const tendency = officialStats.tendency + extraTendency;
      const wrong = officialStats.wrong + extraWrong;

      const userRankingEntry = activeRanking.find(r => r.userId === userId);
      const officialPoints = userRankingEntry ? userRankingEntry.totalPoints : 0;
      const livePoints = officialPoints + extraPoints;

      calculatedStats[userId] = {
        exact,
        tendency,
        wrong,
        totalPreds,
        pointsPerMatch: totalPreds ? (livePoints / totalPreds) : 0,
        hitRate: totalPreds ? Math.round(((exact + tendency) / totalPreds) * 100) : 0,
      };
    });

    return calculatedStats;
  }, [showLivePoints, predictionsData, matches, statsData, tournamentId, activeRanking]);

  // Helper to normalize team names for robust comparison
  const normalizeTeamName = (name: string): string => {
    if (!name) return '';
    let n = name.trim().toLowerCase();
    if (n === 'espana' || n === 'españa') return 'españa';
    if (n === 'argentina') return 'argentina';
    if (n === 'francia') return 'francia';
    if (n === 'inglaterra') return 'inglaterra';
    return n;
  };

  // List of teams for simulating podium (restricted to Argentina, España, Francia, Inglaterra)
  const worldCupTeamsList = ['Argentina', 'España', 'Francia', 'Inglaterra'];

  const displayRanking = useMemo(() => {
    const baseRanking = showLivePoints ? liveRanking : activeRanking;
    
    if (activeLeague.id !== 'mundial' || (!simulatedPodium.champion && !simulatedPodium.runnerUp && !simulatedPodium.thirdPlace)) {
      return baseRanking;
    }

    const simulatedEntries = baseRanking.map(entry => {
      const userPred = podiumPredictions.find(p => p.userId === entry.userId || p.user_id === entry.userId);
      let extraPoints = 0;
      
      if (userPred) {
        const userChamp = normalizeTeamName(userPred.champion || '');
        const userRunner = normalizeTeamName(userPred.runnerUp || '');
        const userThird = normalizeTeamName(userPred.thirdPlace || '');
        
        const simChamp = normalizeTeamName(simulatedPodium.champion);
        const simRunner = normalizeTeamName(simulatedPodium.runnerUp);
        const simThird = normalizeTeamName(simulatedPodium.thirdPlace);

        if (simChamp && userChamp === simChamp) {
          extraPoints += 40;
        }
        if (simRunner && userRunner === simRunner) {
          extraPoints += 25;
        }
        if (simThird && userThird === simThird) {
          extraPoints += 20;
        }
      }

      return {
        ...entry,
        totalPoints: entry.totalPoints + extraPoints,
        podiumPointsSimulated: extraPoints,
      };
    });

    return [...simulatedEntries].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactResults !== a.exactResults) return b.exactResults - a.exactResults;
      if (b.correctTendencies !== a.correctTendencies) return b.correctTendencies - a.correctTendencies;
      return a.name.localeCompare(b.name);
    });
  }, [showLivePoints, liveRanking, activeRanking, simulatedPodium, podiumPredictions, activeLeague.id]);

  const displayStatsData = showLivePoints ? liveStatsData : statsData;

  const myEntry = user ? displayRanking.find((r) => r.userId === user.uid) : null;
  const myPos = myEntry ? displayRanking.indexOf(myEntry) : -1;

  if (!tournamentId) {
    return (
      <div className="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-12 flex flex-col items-center gap-4 text-slate-400">
        <div className="text-5xl opacity-30">🏆</div>
        <p className="text-sm font-medium text-center">Seleccioná una liga para ver el ranking.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">

      {/* Header */}
      <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-amber-500/8 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/8 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
              🏆 Posiciones del Prode
            </h1>
            <p className="text-slate-400 font-medium mt-1">
              {activeLeague.name} — {displayRanking.length} participantes
            </p>
          </div>

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
              {activeLeague.id === 'mundial' && (
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

      {/* ── Carteles SE BUSCA ── */}
      {!loading && !error && ranking.length > 0 && (() => {
        const lastUser = activeRanking.length > 0 ? activeRanking[activeRanking.length - 1] : null;
        if (!lastUser) return null;

        const WantedCard = ({
          entry,
          debt,
          subtitle,
          rewardText,
          rewardPoints,
          accent,
        }: {
          entry: RankingEntry | undefined;
          debt: string;
          subtitle: string;
          rewardText: string;
          rewardPoints?: string;
          accent: string;
        }) => {
          if (!entry) return null;
          const isCensored = entry.userId === 'POYvW930tTUZZEnfNcIIy8O67692' && !isCensoredUnlocked;
          return (
            <div
              className={`relative flex flex-col items-center gap-0 overflow-hidden rounded-2xl border-4 transition-all duration-300 ${
                isCensored ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'
              }`}
              style={{
                background: 'linear-gradient(160deg,#2a1a00 0%,#1a1000 60%,#0d0800 100%)',
                borderColor: accent,
                boxShadow: `0 0 40px ${accent}55, 0 0 0 2px #000 inset`,
                fontFamily: "'Georgia', serif",
              }}
            >
              {/* Torn paper texture top */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px)',
              }} />

              {/* Header ribbon */}
              <div
                className="w-full flex flex-col items-center text-center py-2 px-3 relative z-10"
                style={{ background: accent, color: '#000' }}
              >
                <span className="block w-full text-center text-[8px] font-black uppercase tracking-[0.35em] opacity-70">— Prode del Mundial —</span>
                <span className="block w-full text-center text-xl font-black uppercase tracking-[0.2em] leading-none">⚠ SE BUSCA ⚠</span>
              </div>

              {/* Photo */}
              <div className="relative z-10 mt-3 mb-2">
                <div
                  className="w-20 h-20 rounded-none overflow-hidden"
                  style={{
                    border: `3px solid ${accent}`,
                    boxShadow: `0 0 20px ${accent}66`,
                    imageRendering: 'pixelated',
                    filter: 'sepia(30%) contrast(1.1)',
                  }}
                >
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                    <span className="absolute z-0 text-4xl font-black text-slate-700 select-none">
                      {entry.name?.slice(0, 1).toUpperCase()}
                    </span>
                    <img
                      src={`https://apivacas.jariel.com.ar/users/${entry.userId}.webp`}
                      alt={entry.name}
                      className="w-full h-full object-cover relative z-10"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="relative z-10 px-3 text-center">
                <div className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: accent }}>
                  {subtitle}
                </div>
                <div className="inline-flex items-center justify-center gap-1.5 w-full max-w-[140px]">
                  <div className={`text-base font-black text-amber-100 uppercase tracking-wide leading-tight truncate ${isCensored ? 'blur-[5px] select-none' : ''}`}>
                    {entry.name}
                  </div>
                  {isCensored && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowCensorConfirmModal(true);
                      }}
                      className="inline-flex items-center justify-center p-0.5 rounded bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer active:scale-95 transition-all shrink-0"
                      title="Desbloquear nombre"
                    >
                      <Eye size={10} />
                    </button>
                  )}
                </div>
              </div>

              {/* Separator */}
              <div className="w-3/4 my-2 border-t border-dashed" style={{ borderColor: `${accent}66` }} />

              {/* Debt */}
              <div className="relative z-10 text-center px-3 pb-1">
                <div className="text-[7px] uppercase tracking-widest text-amber-300/70 mb-0.5">Deuda pendiente</div>
                <div
                  className="text-2xl font-black leading-none"
                  style={{ color: accent, textShadow: `0 0 15px ${accent}` }}
                >
                  {debt}
                </div>
                <div className="text-[7px] text-amber-300/60 mt-0.5">pesos argentinos</div>
              </div>

              {/* Separator */}
              <div className="w-3/4 my-2 border-t border-dashed" style={{ borderColor: `${accent}66` }} />

              {/* Reward */}
              <div
                className="relative z-10 w-full flex flex-col items-center py-2 px-3 text-center"
                style={{ background: `${accent}22` }}
              >
                <div className="text-[7px] uppercase tracking-[0.25em] mb-1" style={{ color: accent }}>
                  Recompensa
                </div>
                <div className="text-[12px] font-black text-amber-100 uppercase leading-tight tracking-wider">
                  {rewardText}
                </div>
                {rewardPoints && (
                  <div className="text-[10px] font-black uppercase leading-tight mt-0.5" style={{ color: accent }}>
                    {rewardPoints}
                  </div>
                )}
              </div>

              {/* Bottom stars decoration */}
              <div className="relative z-10 py-1.5 text-center" style={{ color: accent }}>
                <span className="text-[10px] tracking-widest">★ ★ ★ ★ ★</span>
              </div>
            </div>
          );
        };

        return (
          <div className="flex justify-center mb-4 w-full">
            <div className="w-full max-w-[180px]">
              <WantedCard
                entry={lastUser}
                debt="$10.000"
                subtitle="Último del Ranking"
                rewardText="Vivo o Muerto"
                rewardPoints="🎯 10 Puntos"
                accent="#ef4444"
              />
            </div>
          </div>
        );
      })()}

      {/* Tildar/Destildar simulación en vivo */}
      {!loading && !error && ranking.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl backdrop-blur-md mb-2">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className={`w-3.5 h-3.5 rounded-full ${showLivePoints ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
              {showLivePoints && (
                <span className="absolute w-3.5 h-3.5 rounded-full bg-red-500 animate-ping opacity-75" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-200 flex items-center gap-1.5">
                Simular Resultados En Vivo {showLivePoints && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider animate-pulse">L I V E</span>}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Suma los puntos de partidos en juego como si terminaran con el marcador actual
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLivePoints(!showLivePoints)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 border flex items-center gap-2 cursor-pointer ${
              showLivePoints
                ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:bg-red-500/20'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {showLivePoints ? '🟢 ACTIVADO' : '⚪ DESACTIVADO'}
          </button>
        </div>
      )}

      {/* ── Simulador de Podio Final (Mundial) ── */}
      {!loading && !error && ranking.length > 0 && activeLeague.id === 'mundial' && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/5 via-white/[0.01] to-white/[0.02] border border-white/10 rounded-[2rem] p-5 backdrop-blur-xl shadow-xl flex flex-col gap-4 mb-2">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                <span>🎭</span> Simular Podio Final del Mundial
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Elegí las posiciones reales del mundial para proyectar los puntos de podio (+40 pts, +25 pts, +20 pts)
              </p>
            </div>
            {(simulatedPodium.champion || simulatedPodium.runnerUp || simulatedPodium.thirdPlace) && (
              <button
                onClick={() => setSimulatedPodium({ champion: '', runnerUp: '', thirdPlace: '' })}
                className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-[10px] font-black rounded-xl transition-all cursor-pointer"
              >
                Limpiar Simulación
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Campeón Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                🥇 1º Puesto (Campeón)
              </label>
              <select
                value={simulatedPodium.champion}
                onChange={(e) => setSimulatedPodium(prev => ({ ...prev, champion: e.target.value }))}
                className="w-full bg-slate-900/60 border border-white/15 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- Seleccionar país --</option>
                {worldCupTeamsList.map(team => {
                  const isSelectedElsewhere = team === simulatedPodium.runnerUp || team === simulatedPodium.thirdPlace;
                  return (
                    <option key={team} value={team} disabled={isSelectedElsewhere} className="bg-slate-900 text-white">
                      {team}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Subcampeón Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                🥈 2º Puesto (Subcampeón)
              </label>
              <select
                value={simulatedPodium.runnerUp}
                onChange={(e) => setSimulatedPodium(prev => ({ ...prev, runnerUp: e.target.value }))}
                className="w-full bg-slate-900/60 border border-white/15 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-500 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- Seleccionar país --</option>
                {worldCupTeamsList.map(team => {
                  const isSelectedElsewhere = team === simulatedPodium.champion || team === simulatedPodium.thirdPlace;
                  return (
                    <option key={team} value={team} disabled={isSelectedElsewhere} className="bg-slate-900 text-white">
                      {team}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Tercer Puesto Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                🥉 3º Puesto (Tercero)
              </label>
              <select
                value={simulatedPodium.thirdPlace}
                onChange={(e) => setSimulatedPodium(prev => ({ ...prev, thirdPlace: e.target.value }))}
                className="w-full bg-slate-900/60 border border-white/15 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-700 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- Seleccionar país --</option>
                {worldCupTeamsList.map(team => {
                  const isSelectedElsewhere = team === simulatedPodium.champion || team === simulatedPodium.runnerUp;
                  return (
                    <option key={team} value={team} disabled={isSelectedElsewhere} className="bg-slate-900 text-white">
                      {team}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      {loadingStats && showLivePoints && (
        <div className="w-full flex items-center justify-center gap-2 py-3.5 text-xs text-amber-400 font-black animate-pulse bg-amber-500/5 border border-amber-500/15 rounded-2xl mb-2">
          <div className="animate-spin w-3 h-3 rounded-full border-t border-amber-400 border-r border-transparent" />
          <span>Calculando posiciones en vivo con pronósticos en tiempo real...</span>
        </div>
      )}

      {/* ── Podio de Ganadores Showcase ── */}
      {!loading && !error && rankingTab === 'prode' && displayRanking.length >= 2 && (
        activeLeague.id === 'mundial' ? (
          <div className="flex flex-col gap-4 mb-2">
            {/* 1ER PUESTO (GOLD) - Messi lifting cup card */}
            {displayRanking[0] && (() => {
              const isCensored = displayRanking[0].userId === 'POYvW930tTUZZEnfNcIIy8O67692' && !isCensoredUnlocked;
              return (
                <div 
                  onClick={() => {
                    if (isCensored) return;
                    setNavigatingUserId(displayRanking[0].userId);
                    router.push(`/predictions/${displayRanking[0].userId}?tournamentId=${activeLeague.tournamentId}&tournamentName=${encodeURIComponent(activeLeague.name)}`);
                  }}
                  className={`relative overflow-hidden border rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 transition-all duration-300 group ${
                    isCensored 
                      ? 'cursor-default bg-gradient-to-br from-amber-500/20 via-slate-900/70 to-slate-950/90 border-amber-500/50 shadow-[0_12px_36px_rgba(245,158,11,0.2)]' 
                      : 'cursor-pointer hover:scale-[1.01] bg-gradient-to-br from-amber-500/20 via-slate-900/70 to-slate-950/90 border-amber-500/50 hover:border-amber-500/75 shadow-[0_12px_36px_rgba(245,158,11,0.2)]'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
                  <div className="absolute -top-1 -left-1 bg-amber-500 text-black font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-br-2xl shadow-md flex items-center gap-1.5 z-20">
                    <span>👑</span> <span>1º PUESTO - LÍDER</span>
                    {(() => { const c = getPosChangeFor(displayRanking[0].userId, 0); return c > 0 ? <span className="text-black font-black text-[9px]">▲{c}</span> : c < 0 ? <span className="text-black font-black text-[9px]">▼{Math.abs(c)}</span> : <span className="text-black/50 font-extrabold text-[9px]">•</span>; })()}
                  </div>

                  {/* Photo of Messi lifting the cup with user avatar overlay */}
                  <div className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden border-4 border-amber-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-hover:border-amber-500/60 transition-all shrink-0 mx-auto md:mx-0">
                    <img 
                      src="/messi_copa.jpg" 
                      alt="Messi levantando la copa" 
                      className="w-full h-full object-cover"
                    />
                    <div 
                      className={`absolute rounded-full overflow-hidden border-2 border-white bg-slate-950 shadow-md transition-all duration-300 ${isCensored ? 'blur-[5px] select-none' : ''}`}
                      style={{
                        left: '50.1%',
                        top: '38.8%',
                        width: '11.8%',
                        height: '11.8%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <img 
                        src={`https://apivacas.jariel.com.ar/users/${displayRanking[0].userId}.webp`}
                        alt={displayRanking[0].name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = 'https://apivacas.jariel.com.ar/default-avatar.png'; }}
                      />
                    </div>
                  </div>

                  {/* Username below/side */}
                  <div className="flex-1 flex flex-col justify-center items-center md:items-start text-center md:text-left min-w-0">
                    <h4 className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Puntero del Prode</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`block font-black text-2xl md:text-3xl leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-100 to-amber-300 truncate ${isCensored ? 'blur-[5px] select-none' : ''}`}>
                        {displayRanking[0].name}
                      </span>
                      {isCensored && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setShowCensorConfirmModal(true);
                          }}
                          className="inline-flex items-center justify-center p-1 rounded-md bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer active:scale-95 transition-all shrink-0"
                          title="Desbloquear nombre"
                        >
                          <Eye size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold text-slate-350">
                      <div className="bg-black/30 px-3.5 py-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase text-slate-500 block">Puntos</span>
                        <span className="text-lg font-black text-amber-400">{displayRanking[0].totalPoints} pts</span>
                      </div>
                      <div className="bg-black/30 px-3.5 py-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase text-slate-500 block">Exactos</span>
                        <span className="text-lg font-black text-emerald-400">{displayRanking[0].exactResults} ex.</span>
                      </div>
                      {displayRanking[0].podiumPointsSimulated !== undefined && displayRanking[0].podiumPointsSimulated > 0 && (
                        <div className="bg-amber-500/10 px-3.5 py-2 rounded-xl border border-amber-500/20 flex flex-col justify-center">
                          <span className="text-[10px] uppercase text-amber-400 block">Simulación Podio</span>
                          <span className="text-sm font-black text-amber-300">+{displayRanking[0].podiumPointsSimulated} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2DO Y 3ER PUESTO (SILVER AND BRONZE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 2DO PUESTO */}
              {displayRanking[1] && (() => {
                const isCensored = displayRanking[1].userId === 'POYvW930tTUZZEnfNcIIy8O67692' && !isCensoredUnlocked;
                return (
                  <div 
                    onClick={() => {
                      if (isCensored) return;
                      setNavigatingUserId(displayRanking[1].userId);
                      router.push(`/predictions/${displayRanking[1].userId}?tournamentId=${activeLeague.tournamentId}&tournamentName=${encodeURIComponent(activeLeague.name)}`);
                    }}
                    className={`relative overflow-hidden border rounded-3xl pt-5 pb-2.5 px-4 flex items-center gap-4 transition-all duration-300 group ${
                      isCensored
                        ? `cursor-default ${isDark ? 'bg-gradient-to-br from-slate-400/10 via-slate-900/60 to-slate-950/80 border-slate-400/30 shadow-[0_8px_24px_rgba(148,163,184,0.06)]' : 'bg-gradient-to-br from-slate-400/10 via-white to-white border-slate-300 shadow-[0_8px_16px_rgba(148,163,184,0.03)]'}`
                        : `cursor-pointer hover:scale-[1.02] ${isDark ? 'bg-gradient-to-br from-slate-400/10 via-slate-900/60 to-slate-950/80 border-slate-400/30 shadow-[0_8px_24px_rgba(148,163,184,0.06)] hover:border-slate-400/50' : 'bg-gradient-to-br from-slate-400/10 via-white to-white border-slate-300 shadow-[0_8px_16px_rgba(148,163,184,0.03)] hover:border-slate-400/40'}`
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-slate-400/5 rounded-full blur-xl pointer-events-none group-hover:bg-slate-400/15 transition-all" />
                    <div className="absolute -top-1 -left-1 bg-slate-500 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-br-2xl shadow-md flex items-center gap-1.5 z-20">
                      <span>🥈</span> <span>2º PUESTO</span>
                      {(() => { const c = getPosChangeFor(displayRanking[1].userId, 1); return c > 0 ? <span className="text-emerald-350 font-black text-[9px]">▲{c}</span> : c < 0 ? <span className="text-red-350 font-black text-[9px]">▼{Math.abs(c)}</span> : <span className="text-white/40 font-extrabold text-[9px]">•</span>; })()}
                    </div>
                    
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 p-[2.5px] shadow-[0_0_10px_rgba(148,163,184,0.15)] shrink-0">
                      <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                        <span className={`absolute z-0 text-base font-black ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>{displayRanking[1].name?.slice(0, 1).toUpperCase()}</span>
                        <img
                          src={`https://apivacas.jariel.com.ar/users/${displayRanking[1].userId}.webp`}
                          alt={displayRanking[1].name}
                          className="w-full h-full object-cover relative z-10"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Escolta</h4>
                      <span className="inline-flex items-center gap-1.5 leading-tight">
                        <span className={`block font-black text-base truncate transition-colors leading-tight ${isDark ? 'text-white group-hover:text-slate-350' : 'text-slate-900 group-hover:text-slate-650'} ${isCensored ? 'blur-[5px] select-none' : ''}`}>
                          {displayRanking[1].name}
                        </span>
                        {isCensored && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setShowCensorConfirmModal(true);
                            }}
                            className="inline-flex items-center justify-center p-1 rounded-md bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer active:scale-95 transition-all shrink-0"
                            title="Desbloquear nombre"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                      </span>
                      <div className={`flex items-center gap-3 mt-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span><b className={isDark ? '' : 'text-slate-800'}>{displayRanking[1].totalPoints}</b> PTS</span>
                        <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>·</span>
                        <span><b className={isDark ? '' : 'text-slate-800'}>{displayRanking[1].exactResults}</b> exactos</span>
                      </div>
                      {displayRanking[1].podiumPointsSimulated !== undefined && displayRanking[1].podiumPointsSimulated > 0 && (
                        <span className="text-[9px] font-bold text-amber-400 block mt-0.5">
                          🎁 Simulación: +{displayRanking[1].podiumPointsSimulated} pts
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0 pr-1">
                      <span className="text-2xl filter drop-shadow-md">🥈</span>
                    </div>
                  </div>
                );
              })()}

              {/* 3ER PUESTO */}
              {displayRanking[2] && (() => {
                const isCensored = displayRanking[2].userId === 'POYvW930tTUZZEnfNcIIy8O67692' && !isCensoredUnlocked;
                return (
                  <div 
                    onClick={() => {
                      if (isCensored) return;
                      setNavigatingUserId(displayRanking[2].userId);
                      router.push(`/predictions/${displayRanking[2].userId}?tournamentId=${activeLeague.tournamentId}&tournamentName=${encodeURIComponent(activeLeague.name)}`);
                    }}
                    className={`relative overflow-hidden border rounded-3xl pt-5 pb-2.5 px-4 flex items-center gap-4 transition-all duration-300 group ${
                      isCensored
                        ? `cursor-default ${isDark ? 'bg-gradient-to-br from-amber-700/10 via-slate-900/60 to-slate-950/80 border-amber-700/30 shadow-[0_8px_24px_rgba(180,83,9,0.06)]' : 'bg-gradient-to-br from-amber-700/10 via-white to-white border-amber-700/30 shadow-[0_8px_16px_rgba(180,83,9,0.03)]'}`
                        : `cursor-pointer hover:scale-[1.02] ${isDark ? 'bg-gradient-to-br from-amber-700/10 via-slate-900/60 to-slate-950/80 border-amber-700/30 shadow-[0_8px_24px_rgba(180,83,9,0.06)] hover:border-amber-700/50' : 'bg-gradient-to-br from-amber-700/10 via-white to-white border-amber-700/30 shadow-[0_8px_16px_rgba(180,83,9,0.03)] hover:border-amber-700/40'}`
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-700/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-700/15 transition-all" />
                    <div className="absolute -top-1 -left-1 bg-amber-700 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-br-2xl shadow-md flex items-center gap-1.5 z-20">
                      <span>🥉</span> <span>3º PUESTO</span>
                      {(() => { const c = getPosChangeFor(displayRanking[2].userId, 2); return c > 0 ? <span className="text-emerald-350 font-black text-[9px]">▲{c}</span> : c < 0 ? <span className="text-red-350 font-black text-[9px]">▼{Math.abs(c)}</span> : <span className="text-white/40 font-extrabold text-[9px]">•</span>; })()}
                    </div>
                    
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 p-[2.5px] shadow-[0_0_10px_rgba(180,83,9,0.15)] shrink-0">
                      <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                        <span className={`absolute z-0 text-base font-black ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>{displayRanking[2].name?.slice(0, 1).toUpperCase()}</span>
                        <img
                          src={`https://apivacas.jariel.com.ar/users/${displayRanking[2].userId}.webp`}
                          alt={displayRanking[2].name}
                          className="w-full h-full object-cover relative z-10"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-amber-600/80' : 'text-amber-700'}`}>Tercero</h4>
                      <span className="inline-flex items-center gap-1.5 leading-tight">
                        <span className={`block font-black text-base truncate transition-colors leading-tight ${isDark ? 'text-white group-hover:text-amber-200' : 'text-slate-900 group-hover:text-amber-700'} ${isCensored ? 'blur-[5px] select-none' : ''}`}>
                          {displayRanking[2].name}
                        </span>
                        {isCensored && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setShowCensorConfirmModal(true);
                            }}
                            className="inline-flex items-center justify-center p-1 rounded-md bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer active:scale-95 transition-all shrink-0"
                            title="Desbloquear nombre"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                      </span>
                      <div className={`flex items-center gap-3 mt-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span><b className={isDark ? '' : 'text-slate-800'}>{displayRanking[2].totalPoints}</b> PTS</span>
                        <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>·</span>
                        <span><b className={isDark ? '' : 'text-slate-800'}>{displayRanking[2].exactResults}</b> exactos</span>
                      </div>
                      {displayRanking[2].podiumPointsSimulated !== undefined && displayRanking[2].podiumPointsSimulated > 0 && (
                        <span className="text-[9px] font-bold text-amber-400 block mt-0.5">
                          🎁 Simulación: +{displayRanking[2].podiumPointsSimulated} pts
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0 pr-1">
                      <span className="text-2xl filter drop-shadow-md">🥉</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            
            {/* 1ER PUESTO (GOLD) */}
            {displayRanking[0] && (() => {
              const isCensored = displayRanking[0].userId === 'POYvW930tTUZZEnfNcIIy8O67692' && !isCensoredUnlocked;
              return (
                <div 
                  onClick={() => {
                    if (isCensored) return;
                    setNavigatingUserId(displayRanking[0].userId);
                    router.push(`/predictions/${displayRanking[0].userId}?tournamentId=${activeLeague.tournamentId}&tournamentName=${encodeURIComponent(activeLeague.name)}`);
                  }}
                  className={`relative overflow-hidden border rounded-3xl pt-5 pb-2.5 px-4 flex items-center gap-4 transition-all duration-300 group ${
                    isCensored 
                      ? 'cursor-default bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-slate-950/80 border-amber-500/40 shadow-[0_8px_24px_rgba(245,158,11,0.1)]' 
                      : 'cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-slate-950/80 border-amber-500/40 shadow-[0_8px_24px_rgba(245,158,11,0.1)] hover:border-amber-500/60'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
                  <div className="absolute -top-1 -left-1 bg-amber-500 text-black font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-br-2xl shadow-md flex items-center gap-1.5 z-20">
                    <span>👑</span> <span>1º PUESTO</span>
                    {(() => { const c = getPosChangeFor(displayRanking[0].userId, 0); return c > 0 ? <span className="text-black font-black text-[9px]">▲{c}</span> : c < 0 ? <span className="text-black font-black text-[9px]">▼{Math.abs(c)}</span> : <span className="text-black/50 font-extrabold text-[9px]">•</span>; })()}
                  </div>
                  
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-[2.5px] shadow-[0_0_10px_rgba(245,158,11,0.25)] shrink-0">
                    <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                      <span className={`absolute z-0 text-base font-black ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>{displayRanking[0].name?.slice(0, 1).toUpperCase()}</span>
                      <img
                        src={`https://apivacas.jariel.com.ar/users/${displayRanking[0].userId}.webp`}
                        alt={displayRanking[0].name}
                        className="w-full h-full object-cover relative z-10"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-amber-450' : 'text-amber-600'}`}>Puntero del Prode</h4>
                    <span className="inline-flex items-center gap-1.5 leading-tight">
                      <span className={`block font-black text-base truncate transition-colors ${isDark ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-amber-600'} ${isCensored ? 'blur-[5px] select-none' : ''}`}>
                        {displayRanking[0].name}
                      </span>
                      {isCensored && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setShowCensorConfirmModal(true);
                          }}
                          className="inline-flex items-center justify-center p-1 rounded-md bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer active:scale-95 transition-all shrink-0"
                          title="Desbloquear nombre"
                        >
                          <Eye size={12} />
                        </button>
                      )}
                    </span>
                    <div className={`flex items-center gap-3 mt-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span><b className={isDark ? '' : 'text-slate-800'}>{displayRanking[0].totalPoints}</b> PTS</span>
                      <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>·</span>
                      <span><b className={isDark ? '' : 'text-slate-800'}>{displayRanking[0].exactResults}</b> exactos</span>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 pr-1">
                    <span className="text-2xl filter drop-shadow-md">🏆</span>
                  </div>
                </div>
              );
            })()}

            {/* 2DO PUESTO (SILVER) */}
            {displayRanking[1] && (() => {
              const isCensored = displayRanking[1].userId === 'POYvW930tTUZZEnfNcIIy8O67692' && !isCensoredUnlocked;
              return (
                <div 
                  onClick={() => {
                    if (isCensored) return;
                    setNavigatingUserId(displayRanking[1].userId);
                    router.push(`/predictions/${displayRanking[1].userId}?tournamentId=${activeLeague.tournamentId}&tournamentName=${encodeURIComponent(activeLeague.name)}`);
                  }}
                  className={`relative overflow-hidden border rounded-3xl pt-5 pb-2.5 px-4 flex items-center gap-4 transition-all duration-300 group ${
                    isCensored
                      ? `cursor-default ${isDark ? 'bg-gradient-to-br from-slate-400/10 via-slate-900/60 to-slate-950/80 border-slate-400/30 shadow-[0_8px_24px_rgba(148,163,184,0.06)]' : 'bg-gradient-to-br from-slate-400/10 via-white to-white border-slate-300 shadow-[0_8px_16px_rgba(148,163,184,0.03)]'}`
                      : `cursor-pointer hover:scale-[1.02] ${isDark ? 'bg-gradient-to-br from-slate-400/10 via-slate-900/60 to-slate-950/80 border-slate-400/30 shadow-[0_8px_24px_rgba(148,163,184,0.06)] hover:border-slate-400/50' : 'bg-gradient-to-br from-slate-400/10 via-white to-white border-slate-300 shadow-[0_8px_16px_rgba(148,163,184,0.03)] hover:border-slate-400/40'}`
                  }`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-slate-400/5 rounded-full blur-xl pointer-events-none group-hover:bg-slate-400/15 transition-all" />
                  <div className="absolute -top-1 -left-1 bg-slate-500 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-br-2xl shadow-md flex items-center gap-1.5 z-20">
                    <span>🥈</span> <span>2º PUESTO</span>
                    {(() => { const c = getPosChangeFor(displayRanking[1].userId, 1); return c > 0 ? <span className="text-emerald-300 font-black text-[9px]">▲{c}</span> : c < 0 ? <span className="text-red-300 font-black text-[9px]">▼{Math.abs(c)}</span> : <span className="text-white/40 font-extrabold text-[9px]">•</span>; })()}
                  </div>
                  
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 p-[2.5px] shadow-[0_0_10px_rgba(148,163,184,0.15)] shrink-0">
                    <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                      <span className={`absolute z-0 text-base font-black ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>{displayRanking[1].name?.slice(0, 1).toUpperCase()}</span>
                      <img
                        src={`https://apivacas.jariel.com.ar/users/${displayRanking[1].userId}.webp`}
                        alt={displayRanking[1].name}
                        className="w-full h-full object-cover relative z-10"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Escolta</h4>
                    <span className="inline-flex items-center gap-1.5 leading-tight">
                      <span className={`block font-black text-base truncate transition-colors leading-tight ${isDark ? 'text-white group-hover:text-slate-350' : 'text-slate-900 group-hover:text-slate-600'} ${isCensored ? 'blur-[5px] select-none' : ''}`}>
                        {displayRanking[1].name}
                      </span>
                      {isCensored && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setShowCensorConfirmModal(true);
                          }}
                          className="inline-flex items-center justify-center p-1 rounded-md bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer active:scale-95 transition-all shrink-0"
                          title="Desbloquear nombre"
                        >
                          <Eye size={12} />
                        </button>
                      )}
                    </span>
                    <div className={`flex items-center gap-3 mt-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span><b className={isDark ? '' : 'text-slate-800'}>{displayRanking[1].totalPoints}</b> PTS</span>
                      <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>·</span>
                      <span><b className={isDark ? '' : 'text-slate-800'}>{displayRanking[1].exactResults}</b> exactos</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pr-1">
                    <span className="text-2xl filter drop-shadow-md">🥈</span>
                  </div>
                </div>
              );
            })()}

          </div>
        )
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
            <div className="grid grid-cols-[56px_1fr_42px_42px_40px] md:grid-cols-[64px_1fr_80px_80px_80px] items-center px-3 md:px-6 py-3 border-b border-white/5 bg-black/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1 md:pl-2 w-6 text-center">#</span>
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
              displayRanking.map((entry, idx) => {
                const isMe = user && entry.userId === user.uid;
                const isLast = displayRanking.length > 2 && idx === displayRanking.length - 1;
                const rowPadding = 'py-1';
                const rowBg = isLast
                  ? (isMe
                    ? 'bg-red-500/[0.08] border-l-2 border-red-500/50 hover:bg-red-500/[0.12]'
                    : 'bg-red-500/[0.03] border-l-2 border-red-500/20 hover:bg-red-500/[0.06]')
                  : isMe
                    ? 'bg-amber-500/[0.06] border-l-2 border-amber-500/50 hover:bg-amber-500/[0.10]'
                    : 'hover:bg-white/[0.04]';
                const avatarSize = 'w-7 h-7';
                const initialsTextSize = 'text-[10px]';
                const avatarBgClass = isMe
                  ? (isLast ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-amber-500/20 border-amber-500/40 text-amber-300')
                  : isLast
                    ? 'bg-red-500/10 border-red-500/20 text-red-400/90'
                    : 'bg-white/5 border-white/10 text-slate-400';
                const nameTextClass = isLast
                  ? `font-bold text-sm text-red-400 ${isMe ? 'underline decoration-red-500/50' : ''}`
                  : `font-bold text-sm ${isMe ? 'text-amber-300' : 'text-slate-200'}`;

                const userStats = displayStatsData[entry.userId];

                const isCensored = entry.userId === 'POYvW930tTUZZEnfNcIIy8O67692' && !isCensoredUnlocked;
                return (
                  <div
                    key={entry.userId}
                    onClick={() => {
                      if (isCensored) return;
                      setNavigatingUserId(entry.userId);
                      router.push(`/predictions/${entry.userId}?tournamentId=${activeLeague.tournamentId}&tournamentName=${encodeURIComponent(activeLeague.name)}`);
                    }}
                    className={`grid grid-cols-[36px_1fr_60px_60px_100px] md:grid-cols-[48px_1fr_90px_90px_200px] items-center px-3 md:px-6 transition-colors duration-75 ${rowPadding} ${rowBg} ${isCensored ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {/* Posición */}
                    <div className="flex items-center justify-center">
                      {isLast ? (
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
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <span className={`truncate ${nameTextClass} ${isCensored ? 'blur-[5px] select-none' : ''}`}>
                            {entry.name || 'Desconocido'}
                          </span>
                          {isMe && <span className="ml-2 text-[10px] font-semibold text-amber-400/70 shrink-0">(vos)</span>}
                          {isCensored && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setShowCensorConfirmModal(true);
                              }}
                              className="inline-flex items-center justify-center p-0.5 rounded bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer active:scale-95 transition-all shrink-0"
                              title="Desbloquear nombre"
                            >
                              <Eye size={10} />
                            </button>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Puntos / Partido */}
                    <div className="text-center">
                      {userStats ? (
                        <span className={`text-sm font-black ${isLast ? 'text-red-400/80' : 'text-white'}`}>
                          {userStats.pointsPerMatch.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-500">--</span>
                      )}
                    </div>

                    {/* Eficacia */}
                    <div className="text-center">
                      {userStats ? (
                        <span className={`text-sm font-black ${isLast ? 'text-red-400' : 'text-emerald-400'}`}>
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
            ) : displayRanking.length <= (activeLeague.id === 'mundial' ? 3 : 2) ? (
              <div className="p-8 text-center text-slate-500 italic">No hay más participantes en esta tabla.</div>
            ) : (
              displayRanking.slice(activeLeague.id === 'mundial' ? 3 : 2).map((entry, sliceIdx) => {
                const idx = sliceIdx + (activeLeague.id === 'mundial' ? 3 : 2);
                const isMe = user && entry.userId === user.uid;
                const isMundial = activeLeague.id === 'mundial';
                const isTop3 = idx < 3;
                const isLast = displayRanking.length > 2 && idx === displayRanking.length - 1;
                const medal = isMundial
                  ? (idx === 0 ? '🥇' : idx === 1 ? '🥈' : undefined)
                  : MEDAL[idx];

                const rowPadding = idx === 0
                  ? 'py-4 md:py-6'
                  : (isMundial && idx === 1)
                    ? 'py-3 md:py-4'
                    : 'py-1';

                const rowBg = isLast
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
                  ? (isLast ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-amber-500/20 border-amber-500/40 text-amber-300')
                  : (isMundial && idx === 0)
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : (isMundial && idx === 1)
                      ? 'bg-slate-500/20 border-slate-500/30 text-slate-300'
                      : isLast
                        ? 'bg-red-500/10 border-red-500/20 text-red-400/90'
                        : isTop3 && !isMundial
                          ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-slate-400';

                const nameTextClass = idx === 0
                  ? 'text-base md:text-2xl font-black text-amber-300'
                  : (isMundial && idx === 1)
                    ? 'text-sm md:text-base font-extrabold text-slate-200'
                    : isLast
                      ? `font-bold text-sm text-red-400 ${isMe ? 'underline decoration-red-500/50' : ''}`
                      : `font-bold text-sm ${isMe ? 'text-amber-300' : 'text-slate-200'}`;

                const pointsClass = idx === 0
                  ? 'text-xl md:text-3xl font-black text-amber-400'
                  : (isMundial && idx === 1)
                    ? 'text-base md:text-lg font-black text-slate-200'
                    : `text-base font-black ${isMe ? 'text-amber-400' : 'text-slate-300'}`;

                const isCensored = entry.userId === 'POYvW930tTUZZEnfNcIIy8O67692' && !isCensoredUnlocked;
                return (
                  <div
                    key={entry.userId}
                    onClick={() => {
                      if (isCensored) return;
                      setNavigatingUserId(entry.userId);
                      router.push(`/predictions/${entry.userId}?tournamentId=${activeLeague.tournamentId}&tournamentName=${encodeURIComponent(activeLeague.name)}`);
                    }}
                    className={`grid grid-cols-[56px_1fr_42px_42px_40px] md:grid-cols-[64px_1fr_80px_80px_80px] items-center px-3 md:px-6 transition-colors duration-75 ${rowPadding} ${rowBg} ${isCensored ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-start gap-1 md:gap-1.5 pl-1 md:pl-2">
                      {isLast ? (
                        <span className="text-sm md:text-base inline-block w-6 text-center shrink-0 filter drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">💀</span>
                      ) : medal ? (
                        <span className={`${medalSize} inline-block w-6 text-center shrink-0`}>{medal}</span>
                      ) : (
                        <span className={`text-sm font-black w-6 text-center shrink-0 ${isMe ? 'text-amber-400' : 'text-slate-500'}`}>{idx + 1}</span>
                      )}
                      {(() => {
                        const posChange = getPosChangeFor(entry.userId, idx);
                        return posChange > 0
                          ? <span className="inline-block text-emerald-400 font-black text-[9px] leading-none shrink-0">▲{posChange}</span>
                          : posChange < 0
                            ? <span className="inline-block text-red-400 font-black text-[9px] leading-none shrink-0">▼{Math.abs(posChange)}</span>
                            : <span className="inline-block text-slate-600 font-extrabold text-[9px] leading-none shrink-0">•</span>;
                      })()}
                    </div>

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
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <span className={`truncate ${nameTextClass} ${isCensored ? 'blur-[5px] select-none' : ''}`}>
                          {entry.name || 'Desconocido'}
                        </span>
                        {isMe && <span className="ml-2 text-[10px] font-semibold text-amber-400/70 shrink-0">(vos)</span>}
                        {isCensored && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setShowCensorConfirmModal(true);
                            }}
                            className="inline-flex items-center justify-center p-0.5 rounded bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer active:scale-95 transition-all shrink-0"
                            title="Desbloquear nombre"
                          >
                            <Eye size={10} />
                          </button>
                        )}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className={`text-sm font-bold ${isLast ? 'text-red-400/70' : 'text-slate-300'}`}>
                        {Math.max(0, entry.correctTendencies - entry.exactResults)}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className={`text-sm font-bold ${isLast ? 'text-red-400/60' : entry.exactResults > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {entry.exactResults}
                      </span>
                    </div>

                    <div className="text-right flex items-center justify-end gap-1.5">
                      {entry.podiumPointsSimulated !== undefined && entry.podiumPointsSimulated > 0 && (
                        <span className="text-[10px] font-black text-amber-400" title={`Puntos de podio simulados: +${entry.podiumPointsSimulated}`}>
                          (+{entry.podiumPointsSimulated})
                        </span>
                      )}
                      <span className={isLast ? 'text-base font-black text-red-500' : pointsClass}>
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
                <div className="w-2.5 h-2.5 rounded-full bg-slate-650" />
                <span><strong className="text-slate-350">Errados</strong> (Predicción incorrecta)</span>
              </div>
            </div>
          ) : activeLeague.id !== 'mundial' && (
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

      {!loading && !error && ranking.length === 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-12 flex flex-col items-center gap-4 text-slate-400">
          <div className="text-5xl opacity-30">🏆</div>
          <p className="text-sm font-medium text-center">
            Todavía no hay posiciones para {activeLeague.name}.<br />
            ¡Sé el primero en hacer tus predicciones!
          </p>
        </div>
      )}

      {activeLeague.id === 'mundial' && rankingTab === 'prode' && !loading && !error && (
        <div className="flex flex-col gap-6 mt-8">
          <div className="flex items-center pl-2">
            <div className="w-1.5 h-6 bg-amber-400 rounded-full mr-3 shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-200">
              🏆 Pronósticos de Podio del Mundial
            </h3>
          </div>
          
          {loadingPredictions ? (
            <div className="flex justify-center items-center py-12 bg-white/[0.02] border border-white/5 rounded-[2rem]">
              <div className="animate-spin w-6 h-6 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent mr-3" />
              <span className="text-slate-400 text-sm font-medium">Cargando pronósticos...</span>
            </div>
          ) : podiumPredictions.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-center text-slate-500 text-sm font-medium">
              Nadie ha realizado su pronóstico de podio aún.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {Date.now() < new Date('2026-06-12T00:00:00-03:00').getTime() && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-amber-300 text-xs font-semibold">
                  <span>🔒</span>
                  <span>Los pronósticos de los rivales están ocultos hasta el inicio del mundial (12 de Junio a las 00:00 hs GMT-3). Podés ver quiénes ya completaron el suyo.</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {podiumPredictions.map((pred) => {
                  const isUserBlurred = Date.now() < new Date('2026-06-12T00:00:00-03:00').getTime();
                  const isCensored = (pred.userId === 'POYvW930tTUZZEnfNcIIy8O67692' || pred.user_id === 'POYvW930tTUZZEnfNcIIy8O67692') && !isCensoredUnlocked;
                  return (
                    <div key={pred._id} className="relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-3xl p-5 transition-all duration-150 flex flex-col gap-4 shadow-lg backdrop-blur-sm group">
                      {/* User Info */}
                      <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                        <img 
                          src={pred.avatarUrl ? (pred.avatarUrl.startsWith('http') ? pred.avatarUrl : `https://apivacas.jariel.com.ar${pred.avatarUrl}`) : 'https://apivacas.jariel.com.ar/default-avatar.png'} 
                          alt={pred.userName}
                          className="w-9 h-9 rounded-full border border-white/10 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://apivacas.jariel.com.ar/default-avatar.png' }}
                        />
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`font-bold text-slate-200 group-hover:text-white transition-colors text-sm ${isCensored ? 'blur-[5px] select-none' : ''}`}>{pred.userName}</span>
                            {isCensored && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setShowCensorConfirmModal(true);
                                }}
                                className="inline-flex items-center justify-center p-0.5 rounded bg-white/10 hover:bg-white/20 text-amber-400 cursor-pointer active:scale-95 transition-all shrink-0"
                                title="Desbloquear nombre"
                              >
                                <Eye size={10} />
                              </button>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-555 font-medium">Completado</span>
                        </div>
                      </div>
                      
                      {/* Podio */}
                      <div className="flex flex-col gap-2">
                        {/* Campeón */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-amber-400 font-bold font-black">
                            <span>🥇</span>
                            <span>Campeón:</span>
                          </div>
                          {isUserBlurred ? (
                            <>
                              <span className="sr-only">Pronóstico oculto</span>
                              <span className="font-extrabold text-slate-350 blur-md select-none" aria-hidden="true">
                                ••••••••
                              </span>
                            </>
                          ) : (
                            <span className="font-extrabold text-slate-300">
                              {pred.champion}
                            </span>
                          )}
                        </div>
                        {/* Subcampeón */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-slate-400 font-bold font-black">
                            <span>🥈</span>
                            <span>Subcampeón:</span>
                          </div>
                          {isUserBlurred ? (
                            <>
                              <span className="sr-only">Pronóstico oculto</span>
                              <span className="font-extrabold text-slate-350 blur-md select-none" aria-hidden="true">
                                ••••••••
                              </span>
                            </>
                          ) : (
                            <span className="font-extrabold text-slate-300">
                              {pred.runnerUp}
                            </span>
                          )}
                        </div>
                        {/* Tercero */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-amber-600 font-bold font-black">
                            <span>🥉</span>
                            <span>Tercer Puesto:</span>
                          </div>
                          {isUserBlurred ? (
                            <>
                              <span className="sr-only">Pronóstico oculto</span>
                              <span className="font-extrabold text-slate-350 blur-md select-none" aria-hidden="true">
                                ••••••••
                              </span>
                            </>
                          ) : (
                            <span className="font-extrabold text-slate-300">
                              {pred.thirdPlace}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                    <span className="font-semibold text-slate-300">16avos a Octavos</span>
                    <span className="text-center font-bold text-indigo-400">4 pts</span>
                    <span className="text-center font-bold text-emerald-400">8 pts</span>
                  </div>
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">Cuartos</span>
                    <span className="text-center font-bold text-indigo-400">6 pts</span>
                    <span className="text-center font-bold text-emerald-400">12 pts</span>
                  </div>
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">Semifinal</span>
                    <span className="text-center font-bold text-indigo-400">8 pts</span>
                    <span className="text-center font-bold text-emerald-400">16 pts</span>
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
                <p className="text-xs text-amber-350 font-semibold leading-normal">
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
            Cargando predicciones de {displayRanking.find(r => r.userId === navigatingUserId)?.name || 'usuario'}...
          </p>
        </div>,
        document.body
      )}

      {/* ── Modal de Confirmación de Censura ── */}
      {showCensorConfirmModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-modal-fade-in">
          <div className="relative w-full max-w-sm bg-[#0b1015] border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col items-center gap-5 text-center animate-modal-scale-in">
            <span className="text-4xl">👁️</span>
            <div>
              <h3 className="text-lg font-black text-white">Desbloquear imagen sensible</h3>
              <p className="text-xs text-slate-400 mt-2 leading-normal">
                Vas a desbloquear imagen sensible. ¿Estás seguro de que querés ver el nombre del usuario?
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setShowCensorConfirmModal(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-350 hover:text-white font-bold rounded-2xl transition-all cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsCensoredUnlocked(true);
                  setShowCensorConfirmModal(false);
                }}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-black font-black rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 text-xs"
              >
                Desbloquear
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
