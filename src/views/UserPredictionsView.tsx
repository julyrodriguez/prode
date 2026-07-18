"use client";
import { useEffect, useState, useContext } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Star, Award, X, Calendar, Clock, TrendingUp, Zap, HelpCircle } from 'lucide-react';
import { DashboardContext } from '../app/(dashboard)/layout';
import { useTheme } from '../context/ThemeContext';

interface Prediction {
  _id: string;
  matchId: number;
  miPronosticoLocal: number;
  miPronosticoVisita: number;
  estadoProde: string;
  torneo: string;
  fechaUnix: number;
  estadoPartido: { code: number; description: string; type: string };
  equipoLocal: string;
  equipoVisita: string;
  golesRealesLocal: number;
  golesRealesVisita: number;
  stage?: string;
  round_name?: string;
  pointsEarned?: number | null;
}

function getResult(
  pred: Prediction,
  match?: any,
  tournamentId?: number
): 'exact' | 'tendency' | 'wrong' {
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

function getPointsForPrediction(
  pred: Prediction,
  match: any | undefined,
  tournamentId: number,
  result: 'exact' | 'tendency' | 'wrong'
): number {
  if (result === 'wrong') return 0;

  let basePoints = 0;

  if (tournamentId === 16) {
    // Mundial (tournamentId 16) rules:
    let stage = (match?.stage || match?.round_name || pred.stage || pred.round_name || '').toLowerCase();
    const matchId = match?.id || match?._id || pred?.matchId || (pred as any)?.match_id;
    const isTercerPuesto = 
      matchId === 1775853465 ||
      ((match?.homeTeam?.name || match?.home_team?.name || pred?.equipoLocal || '').toLowerCase().includes('france') ||
       (match?.homeTeam?.name || match?.home_team?.name || pred?.equipoLocal || '').toLowerCase().includes('francia')) &&
      ((match?.awayTeam?.name || match?.away_team?.name || pred?.equipoVisita || '').toLowerCase().includes('england') ||
       (match?.awayTeam?.name || match?.away_team?.name || pred?.equipoVisita || '').toLowerCase().includes('inglaterra'));
       
    if (isTercerPuesto) {
      stage = 'tercer puesto';
      basePoints = result === 'exact' ? 18 : 9;
    } else {
      const torneo = (pred.torneo || match?.tournament_name || '').toLowerCase();

      // Group stage detection:
      const isGroup = torneo.includes('group') || torneo.includes('grupo') || stage.includes('fecha') || stage.includes('group');

      if (isGroup) {
        basePoints = result === 'exact' ? 4 : 2;
      } else {
      // Knockout phases:
      const isCuartos = stage.includes('quarter') || stage.includes('cuart');
      const is16avosToOctavos = 
        stage.includes('32') || 
        stage.includes('16') || 
        stage.includes('octav') || 
        stage.includes('dieciseis') || 
        stage.includes('16av');

      if (isCuartos) {
        basePoints = result === 'exact' ? 12 : 6;
      } else if (is16avosToOctavos) {
        basePoints = result === 'exact' ? 8 : 4;
      } else {
        const isSemi = stage.includes('semi');
        if (isSemi) {
          basePoints = result === 'exact' ? 16 : 8;
        } else {
          const isFinal = stage.includes('final');
          if (isFinal) {
            basePoints = result === 'exact' ? 20 : 10;
          } else {
            // Default fallback for Mundial (Group rules)
            basePoints = result === 'exact' ? 4 : 2;
          }
        }
      }
    }
    }
  } else {
    // Fallback for standard tournaments:
    basePoints = result === 'exact' ? 6 : 3;
  }

  const equipoLocal = (pred.equipoLocal || '').toLowerCase();
  const equipoVisita = (pred.equipoVisita || '').toLowerCase();
  const esArgentina = equipoLocal.includes('argentina') || equipoVisita.includes('argentina');

  if (esArgentina) {
    return basePoints * 2;
  }

  return basePoints;
}

const getResultConfig = (isDark: boolean) => ({
  exact: {
    label: 'Exacto',
    icon: '🏆',
    color: isDark ? 'text-emerald-400' : 'text-emerald-605',
    bg: isDark
      ? 'bg-gradient-to-br from-emerald-500/10 via-slate-900/50 to-slate-950/60'
      : 'bg-gradient-to-br from-emerald-500/10 via-emerald-50/30 to-emerald-100/20',
    border: isDark ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-emerald-500/20 hover:border-emerald-500/40',
    pill: isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    glow: isDark ? 'shadow-[0_0_25px_rgba(16,185,129,0.12)]' : 'shadow-sm',
    barBg: 'bg-emerald-500'
  },
  tendency: {
    label: 'Tendencia',
    icon: '✨',
    color: isDark ? 'text-amber-400' : 'text-amber-605',
    bg: isDark
      ? 'bg-gradient-to-br from-amber-500/10 via-slate-900/50 to-slate-950/60'
      : 'bg-gradient-to-br from-amber-500/10 via-amber-50/30 to-amber-100/20',
    border: isDark ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-amber-500/20 hover:border-amber-500/40',
    pill: isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700',
    glow: isDark ? 'shadow-[0_0_25px_rgba(245,158,11,0.12)]' : 'shadow-sm',
    barBg: 'bg-amber-500'
  },
  wrong: {
    label: 'Errado',
    icon: '❌',
    color: isDark ? 'text-slate-400' : 'text-slate-500',
    bg: isDark
      ? 'bg-gradient-to-br from-slate-900/60 via-slate-950/70 to-slate-950/80'
      : 'bg-gradient-to-br from-slate-50 via-slate-100/50 to-slate-100/20',
    border: isDark ? 'border-slate-800 hover:border-slate-700/50' : 'border-slate-200 hover:border-slate-300',
    pill: isDark ? 'bg-slate-800/60 border-slate-700/55 text-slate-400' : 'bg-slate-200/60 border-slate-300 text-slate-500',
    glow: 'shadow-none',
    barBg: 'bg-slate-700'
  },
});

const getCountryEmoji = (countryName: string): string => {
  if (!countryName) return '🏳️';
  const name = countryName.toLowerCase().trim();
  if (name.includes('argentina')) return '🇦🇷';
  if (name.includes('brasil') || name.includes('brazil')) return '🇧🇷';
  if (name.includes('francia') || name.includes('france')) return '🇫🇷';
  if (name.includes('alemania') || name.includes('germany')) return '🇩🇪';
  if (name.includes('españa') || name.includes('spain')) return '🇪🇸';
  if (name.includes('inglaterra') || name.includes('england')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (name.includes('uruguay')) return '🇺🇾';
  if (name.includes('portugal')) return '🇵🇹';
  if (name.includes('italia') || name.includes('italy')) return '🇮🇹';
  if (name.includes('paises bajos') || name.includes('países bajos') || name.includes('holanda') || name.includes('netherlands')) return '🇳🇱';
  if (name.includes('croacia') || name.includes('croatia')) return '🇭🇷';
  if (name.includes('belgica') || name.includes('bélgica') || name.includes('belgium')) return '🇧🇪';
  if (name.includes('marruecos') || name.includes('morocco')) return '🇲🇦';
  if (name.includes('estados unidos') || name.includes('usa') || name.includes('united states')) return '🇺🇸';
  if (name.includes('mexico') || name.includes('méxico')) return '🇲🇽';
  if (name.includes('colombia')) return '🇨🇴';
  if (name.includes('chile')) return '🇨🇱';
  if (name.includes('ecuador')) return '🇪🇨';
  if (name.includes('japon') || name.includes('japón') || name.includes('japan')) return '🇯🇵';
  if (name.includes('corea') || name.includes('korea')) return '🇰🇷';
  if (name.includes('senegal')) return '🇸🇳';
  if (name.includes('camerun') || name.includes('camerún') || name.includes('cameroon')) return '🇨🇲';
  if (name.includes('canada') || name.includes('canadá')) return '🇨🇦';
  if (name.includes('qatar') || name.includes('katar')) return '🇶🇦';
  if (name.includes('saudi') || name.includes('arabia')) return '🇸🇦';
  if (name.includes('suiza') || name.includes('switzerland')) return '🇨🇭';
  if (name.includes('dinamarca') || name.includes('denmark')) return '🇩🇰';
  if (name.includes('polonia') || name.includes('poland')) return '🇵🇱';
  if (name.includes('serbia')) return '🇷🇸';
  if (name.includes('ghana')) return '🇬🇭';
  if (name.includes('gales') || name.includes('wales')) return '🏴󠁧󠁢uí󠁿';
  if (name.includes('tunez') || name.includes('túnez') || name.includes('tunisia')) return '🇹🇳';
  return '🏳️';
};

const getTeamLogo = (match: any, team: 'home' | 'away') => {
  if (!match) return null;
  const teamObj = team === 'home' ? match.homeTeam : match.awayTeam;
  const altTeamObj = team === 'home' ? match.home_team : match.away_team;
  const teamId = teamObj?.id || altTeamObj?.id;
  if (teamId) return `/escudos/${teamId}.png`;
  const logoUrl = teamObj?.logoUrl || altTeamObj?.logoUrl || null;
  return logoUrl?.startsWith('/') ? `https://apivacas.jariel.com.ar/api${logoUrl}` : logoUrl;
};

import SharedTeamLogo from '../components/TeamLogo';

function TeamLogo({ url, name }: { url?: string | null; name: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className={`w-8 h-8 sm:w-10 h-10 flex items-center justify-center rounded-xl border shrink-0 shadow-md transition-colors ${
      isDark ? 'bg-slate-900/40 border-white/5' : 'bg-slate-100 border-slate-205'
    }`}>
      <SharedTeamLogo logoUrl={url} teamName={name} className="w-6 h-6 sm:w-8 h-8" />
    </div>
  );
}

const sanitizeMatch = (m: any): any => {
  if (!m) return m;
  const matchId = (m as any).id || (m as any)._id;
  const homeName = ((m as any).homeTeam?.name || (m as any).home_team?.name || '').toLowerCase();
  const awayName = ((m as any).awayTeam?.name || (m as any).away_team?.name || '').toLowerCase();
  const isTercerPuesto = 
    matchId === 1775853465 || 
    ((homeName.includes('france') || homeName.includes('francia')) && 
     (awayName.includes('england') || awayName.includes('inglaterra')));
  
  if (isTercerPuesto) {
    return {
      ...m,
      round_name: 'Tercer puesto',
      stage: 'Tercer puesto'
    };
  }
  return m;
};

const isChampionPossible = (countryName: string | undefined | null) => {
  if (!countryName) return true;
  const name = countryName.trim().toLowerCase();
  if (name === 'sin elegir' || name === '—' || name === '') return true;
  return name === 'argentina' || name === 'españa' || name === 'espana';
};

const isRunnerUpPossible = (countryName: string | undefined | null) => {
  if (!countryName) return true;
  const name = countryName.trim().toLowerCase();
  if (name === 'sin elegir' || name === '—' || name === '') return true;
  return name === 'argentina' || name === 'españa' || name === 'espana';
};

const isThirdPlacePossible = (countryName: string | undefined | null) => {
  if (!countryName) return true;
  const name = countryName.trim().toLowerCase();
  if (name === 'sin elegir' || name === '—' || name === '') return true;
  return name === 'inglaterra' || name === 'england';
};

export default function UserPredictionsView({ userId: propUserId }: { userId?: string } = {}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const resultConfig = getResultConfig(isDark);
  const params = useParams<any>();
  const rawUserId = propUserId || params?.userId || params?.userid;
  const userId = (rawUserId && rawUserId !== 'undefined' && rawUserId !== 'null') ? rawUserId : undefined;
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTournamentId = searchParams.get('tournamentId');
  
  let stateTournamentId: number | undefined = undefined;
  if (rawTournamentId && rawTournamentId !== 'null' && rawTournamentId !== 'undefined') {
    const parsed = parseInt(rawTournamentId, 10);
    if (!isNaN(parsed)) {
      stateTournamentId = parsed;
    }
  }
  const stateTournamentName = searchParams.get('tournamentName') || undefined;
  
  const tournament = {
    tournamentId: stateTournamentId !== undefined ? stateTournamentId : 155,
    name: stateTournamentName || 'General'
  };

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [podium, setPodium] = useState<{ champion: string; runnerUp: string; thirdPlace: string } | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(undefined);
  
  // Custom filters
  const [filter, setFilter] = useState<'all' | 'exact' | 'tendency' | 'wrong'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const outletContext = useContext(DashboardContext);
  const setOverriddenLeagueId = outletContext?.setOverriddenLeagueId;

  // Sync active league with background layout
  useEffect(() => {
    if (setOverriddenLeagueId) {
      if (tournament.tournamentId === 16) {
        setOverriddenLeagueId('mundial');
      } else if (tournament.tournamentId === 155) {
        setOverriddenLeagueId('liga-arg');
      } else if (tournament.tournamentId === 325) {
        setOverriddenLeagueId('brasileirao');
      }
    }
    return () => {
      if (setOverriddenLeagueId) {
        setOverriddenLeagueId(null);
      }
    };
  }, [tournament.tournamentId, setOverriddenLeagueId]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch('https://apivacas.jariel.com.ar/api/matches/all');
        if (res.ok) {
          const data = await res.json();
          setMatches(Array.isArray(data) ? data.map(sanitizeMatch) : data);
        }
      } catch (e) {
        console.error("Error fetching matches:", e);
      }
    };
    fetchMatches();
  }, []);

  // Check if podium prediction should be blurred (until June 12, 2026 00:00:00 GMT-3)
  const isBlurred = Date.now() < new Date('2026-06-12T00:00:00-03:00').getTime();

  useEffect(() => {
    if (!resolvedUserId || tournament.tournamentId !== 16) return;
    const fetchPodium = async () => {
      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/mundial/predictions/${resolvedUserId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setPodium({
              champion: json.data.champion,
              runnerUp: json.data.runnerUp,
              thirdPlace: json.data.thirdPlace
            });
          }
        }
      } catch (e) {
        console.error("Error fetching podium predictions:", e);
      }
    };
    fetchPodium();
  }, [resolvedUserId, tournament.tournamentId]);

  useEffect(() => {
    if (!resolvedUserId) {
      if (userId === undefined) {
        setError('No se especificó un identificador de usuario válido.');
        setLoading(false);
      }
      return;
    }
    const fetch_ = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://apivacas.jariel.com.ar/api/predictions/user/${resolvedUserId}/tournament/${tournament.tournamentId}`
        );
        if (!res.ok) throw new Error('No se pudieron cargar las predicciones');
        const data: Prediction[] = await res.json();
        const evaluated = data.filter((p) => p.estadoProde === 'evaluated');
        evaluated.sort((a, b) => b.fechaUnix - a.fechaUnix);
        setPredictions(evaluated);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [resolvedUserId, tournament.tournamentId]);

  // Fetch name of user and resolve dynamic user ID case-insensitively
  useEffect(() => {
    if (!userId) return;
    const getUserName = async () => {
      let foundUserId = userId;
      
      try {
        const resUsers = await fetch('https://apivacas.jariel.com.ar/api/users');
        if (resUsers.ok) {
          const users = await resUsers.json();
          if (Array.isArray(users)) {
            const found = users.find((u: any) => u._id && u._id.toLowerCase() === userId.toLowerCase());
            if (found) {
              setUserName(found.name);
              setResolvedUserId(found._id);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Error fetching global users list:", e);
      }

      // Fallback ranking
      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/ranking/${tournament.tournamentId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const found = data.find((r: any) => r.userId && r.userId.toLowerCase() === userId.toLowerCase());
            if (found) {
              setUserName(found.name);
              setResolvedUserId(found.userId);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Error fetching ranking fallback:", e);
      }

      setResolvedUserId(foundUserId);
    };
    getUserName();
  }, [userId, tournament.tournamentId]);

  // Create lookup map for matches
  const matchesMap = new Map<number, any>();
  matches.forEach((m) => {
    const mId = m.id !== undefined ? m.id : m._id;
    if (mId !== undefined) {
      matchesMap.set(Number(mId), m);
    }
  });

  // Calculate statistics
  const totals = predictions.reduce(
    (acc, p) => {
      const match = matchesMap.get(Number(p.matchId));
      const r = getResult(p, match, tournament.tournamentId);
      acc[r]++;
      const pts = (p.pointsEarned !== undefined && p.pointsEarned !== null)
        ? p.pointsEarned
        : getPointsForPrediction(p, match, tournament.tournamentId, r);
      acc.pts += pts;
      return acc;
    },
    { exact: 0, tendency: 0, wrong: 0, pts: 0 }
  );

  const totalPreds = predictions.length;
  const exactPercent = totalPreds ? Math.round((totals.exact / totalPreds) * 100) : 0;
  const tendencyPercent = totalPreds ? Math.round((totals.tendency / totalPreds) * 100) : 0;
  const wrongPercent = totalPreds ? Math.round((totals.wrong / totalPreds) * 100) : 0;
  const hitRate = totalPreds ? Math.round(((totals.exact + totals.tendency) / totalPreds) * 100) : 0;

  // Apply filters and searches
  const filteredPredictions = predictions.filter(pred => {
    const match = matchesMap.get(Number(pred.matchId));
    const matchesFilter = filter === 'all' || getResult(pred, match, tournament.tournamentId) === filter;
    const matchesSearch = searchQuery === '' || 
      pred.equipoLocal.toLowerCase().includes(searchQuery.toLowerCase()) || 
      pred.equipoVisita.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pred.torneo && pred.torneo.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-6 pb-12 animate-fade-in">

      {/* Button: Return */}
      <button
        onClick={() => router.back()}
        className={`self-start flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 border active:scale-95 shadow-lg backdrop-blur-md group cursor-pointer ${
          isDark
            ? 'text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20'
            : 'text-slate-750 hover:text-slate-950 bg-white/85 hover:bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
        <span className="font-bold text-sm">Volver al Ranking</span>
      </button>

      {/* ── Cabecera (Stats Dashboard & Profiles) ── */}
      <div className={`relative border rounded-[2.5rem] p-6 lg:p-8 overflow-hidden transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
          : 'bg-white backdrop-blur-2xl border-slate-200 shadow-[0_15px_30px_rgba(0,0,0,0.05)]'
      }`}>
        <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-500 p-[3px] shadow-[0_0_20px_rgba(99,102,241,0.2)] shrink-0 group">
                <div className={`w-full h-full rounded-[1.8rem] flex items-center justify-center overflow-hidden relative border ${
                  isDark ? 'bg-gradient-to-br from-slate-950 to-slate-900 border-white/10' : 'bg-gradient-to-br from-slate-100 to-white border-slate-205'
                }`}>
                  <span className={`absolute z-0 text-3xl font-black ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {userName?.slice(0, 2).toUpperCase() || '?'}
                  </span>
                  <img
                    src={`https://apivacas.jariel.com.ar/users/${resolvedUserId || userId}.webp`}
                    alt="Avatar"
                    className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className={`text-3xl lg:text-4xl font-black tracking-tight drop-shadow-md ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {userName || 'Usuario'}
                  </h1>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${
                    isDark ? 'text-indigo-400 bg-indigo-400/10 border border-indigo-400/20' : 'text-indigo-600 bg-indigo-50 border border-indigo-150'
                  }`}>
                    Prode Perfil
                  </span>
                </div>
                <p className={`text-sm font-semibold mt-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Evaluando: {tournament.name}
                </p>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            {!loading && totalPreds > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                {[
                  { label: 'Puntos', value: totals.pts, color: isDark ? 'text-amber-400' : 'text-amber-600', bg: isDark ? 'from-amber-500/15 via-amber-500/5 to-transparent' : 'from-amber-500/10 via-amber-500/5 to-transparent', border: isDark ? 'border-amber-500/20' : 'border-amber-500/30', icon: <Trophy className="w-4 h-4 text-amber-500" /> },
                  { label: 'Exactos', value: totals.exact, color: isDark ? 'text-emerald-400' : 'text-emerald-600', bg: isDark ? 'from-emerald-500/15 via-emerald-500/5 to-transparent' : 'from-emerald-500/10 via-emerald-500/5 to-transparent', border: isDark ? 'border-emerald-500/20' : 'border-emerald-500/30', icon: <Award className="w-4 h-4 text-emerald-500" /> },
                  { label: 'Tendencias', value: totals.tendency, color: isDark ? 'text-indigo-400' : 'text-indigo-650', bg: isDark ? 'from-indigo-500/15 via-indigo-500/5 to-transparent' : 'from-indigo-500/10 via-indigo-500/5 to-transparent', border: isDark ? 'border-indigo-500/20' : 'border-indigo-500/30', icon: <Star className="w-4 h-4 text-indigo-500" /> },
                  { label: 'Errados', value: totals.wrong, color: isDark ? 'text-slate-400' : 'text-slate-500', bg: isDark ? 'from-slate-800/15 via-slate-800/5 to-transparent' : 'from-slate-200/50 via-slate-100/30 to-transparent', border: isDark ? 'border-slate-800' : 'border-slate-300', icon: <X className="w-4 h-4 text-slate-500" /> },
                ].map((s) => (
                  <div key={s.label} className={`relative flex flex-col justify-between bg-gradient-to-b ${s.bg} border ${s.border} rounded-2xl p-4 min-w-[110px] shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</span>
                      {s.icon}
                    </div>
                    <span className={`text-3xl font-black ${s.color} mt-1 leading-none`}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stacked Breakdown Chart */}
          {!loading && totalPreds > 0 && (
            <>
              <div className={`w-full h-px my-2 ${isDark ? 'bg-white/10' : 'bg-slate-205'}`} />
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
                <div className="flex flex-col gap-2 w-full">
                  <div className={`flex justify-between text-xs font-bold px-1 ${isDark ? 'text-slate-450' : 'text-slate-600'}`}>
                    <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Distribución de Aciertos</span>
                    <span className={`font-extrabold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{hitRate}% Eficacia de Acierto</span>
                  </div>
                  <div className={`w-full h-3.5 rounded-full overflow-hidden flex p-[2px] ${isDark ? 'bg-slate-950/80 border border-white/5' : 'bg-slate-100 border border-slate-200'}`}>
                    {totals.exact > 0 && (
                      <div
                        style={{ width: `${exactPercent}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 first:rounded-l-full"
                        title={`Exactos: ${totals.exact} (${exactPercent}%)`}
                      />
                    )}
                    {totals.tendency > 0 && (
                      <div
                        style={{ width: `${tendencyPercent}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 first:rounded-l-full"
                        title={`Tendencia: ${totals.tendency} (${tendencyPercent}%)`}
                      />
                    )}
                    {totals.wrong > 0 && (
                      <div
                        style={{ width: `${wrongPercent}%` }}
                        className={`h-full bg-gradient-to-r transition-all duration-500 last:rounded-r-full ${
                          isDark ? 'from-slate-650 to-slate-750' : 'from-slate-300 to-slate-400'
                        }`}
                        title={`Errados: ${totals.wrong} (${wrongPercent}%)`}
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1 px-1">
                    <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Exactos: <b className={isDark ? 'text-slate-200' : 'text-slate-750'}>{totals.exact}</b> ({exactPercent}%)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Tendencia: <b className={isDark ? 'text-slate-200' : 'text-slate-755'}>{totals.tendency}</b> ({tendencyPercent}%)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                      <span>Errados: <b className={isDark ? 'text-slate-200' : 'text-slate-750'}>{totals.wrong}</b> ({wrongPercent}%)</span>
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-6 shrink-0 self-end lg:self-center divide-x ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
                  <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Puntos / Partido</span>
                    <span className={`text-xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {totalPreds ? (totals.pts / totalPreds).toFixed(1) : '0'} <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>pts</span>
                    </span>
                  </div>
                  <div className="flex flex-col pl-6">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Evaluados</span>
                    <span className={`text-xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalPreds}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Podio Mundial (Pedestal 3D Layout) ── */}
      {!loading && !error && tournament.tournamentId === 16 && podium && (
        <div className={`border rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col gap-6 transition-all duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-slate-900/60 to-slate-950/80 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]'
            : 'bg-white border-slate-200 shadow-[0_15px_30px_rgba(0,0,0,0.05)]'
        }`}>
          <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
            <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
            <div>
              <h2 className={`text-xl font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Predicción del Podio</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Predicción final del podio elegida por el usuario</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-end justify-center gap-6 max-w-4xl mx-auto pt-6 pb-2 w-full">
            
            {/* 2DO PUESTO (SILVER) */}
            <div className="flex-1 order-2 md:order-1 flex flex-col items-center">
              <div className={`w-full backdrop-blur-md border rounded-3xl p-5 flex flex-col items-center relative overflow-hidden group transition-all duration-300 hover:scale-[1.03] md:h-52 justify-center ${
                isDark
                  ? 'bg-slate-900/40 border-slate-455/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-slate-400/40'
                  : 'bg-slate-50 border-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.03)] hover:border-slate-350'
              }`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-300" />
                <span className="text-3xl filter drop-shadow-md mb-2">🥈</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Subcampeón</span>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-2xl" aria-hidden="true">
                    {isBlurred ? '🔒' : getCountryEmoji(podium.runnerUp)}
                  </span>
                  {isBlurred ? (
                    <>
                      <span className="sr-only">Pronóstico oculto</span>
                      <span className={`text-base font-black blur-md select-none ${isDark ? 'text-white' : 'text-slate-800'}`} aria-hidden="true">
                        ••••••••
                      </span>
                    </>
                  ) : (
                    <span className={`text-base font-black ${isRunnerUpPossible(podium.runnerUp) ? (isDark ? 'text-white' : 'text-slate-800') : 'line-through text-slate-500 decoration-red-500/80 decoration-2'}`}>
                      {podium.runnerUp || 'Sin elegir'}
                    </span>
                  )}
                </div>
              </div>
              <div className={`hidden md:flex w-24 h-12 border-x border-t rounded-t-xl items-center justify-center mt-3 shadow-inner ${
                isDark ? 'bg-slate-800/40 border-slate-700/30' : 'bg-slate-200/50 border-slate-300'
              }`}>
                <span className={`text-lg font-black ${isDark ? 'text-slate-455/60' : 'text-slate-400'}`}>2</span>
              </div>
            </div>

            {/* 1ER PUESTO (GOLD) */}
            <div className="flex-1 order-1 md:order-2 flex flex-col items-center">
              <div className={`w-full backdrop-blur-md rounded-3xl p-6 flex flex-col items-center relative overflow-hidden group transition-all duration-300 hover:scale-[1.05] md:h-60 justify-center border ${
                isDark
                  ? 'bg-slate-900/50 border-amber-500/30 shadow-[0_15px_40px_rgba(245,158,11,0.15)] hover:border-amber-500/50'
                  : 'bg-amber-500/5 border-amber-500/25 shadow-[0_10px_25px_rgba(245,158,11,0.05)] hover:border-amber-500/40'
              }`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-300" />
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-500" />
                
                <span className="text-4xl filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] mb-2 animate-bounce">🏆</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Campeón</span>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-3xl" aria-hidden="true">
                    {isBlurred ? '🔒' : getCountryEmoji(podium.champion)}
                  </span>
                  {isBlurred ? (
                    <>
                      <span className="sr-only">Pronóstico oculto</span>
                      <span className={`text-lg font-black blur-md select-none ${isDark ? 'text-white' : 'text-slate-800'}`} aria-hidden="true">
                        ••••••••
                      </span>
                    </>
                  ) : (
                    <span className={`text-lg font-black ${isChampionPossible(podium.champion) ? (isDark ? 'text-white' : 'text-slate-800') : 'line-through text-slate-500 decoration-red-500/80 decoration-2'}`}>
                      {podium.champion || 'Sin elegir'}
                    </span>
                  )}
                </div>
              </div>
              <div className={`hidden md:flex w-28 h-20 border-x border-t rounded-t-2xl items-center justify-center mt-3 shadow-inner ${
                isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-500/15 border-amber-500/20'
              }`}>
                <span className={`text-2xl font-black ${isDark ? 'text-amber-500/60' : 'text-amber-600/70'}`}>1</span>
              </div>
            </div>

            {/* 3ER PUESTO (BRONZE) */}
            <div className="flex-1 order-3 md:order-3 flex flex-col items-center">
              <div className={`w-full backdrop-blur-md border rounded-3xl p-5 flex flex-col items-center relative overflow-hidden group transition-all duration-300 hover:scale-[1.03] md:h-44 justify-center ${
                isDark
                  ? 'bg-slate-900/40 border-amber-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-amber-700/40'
                  : 'bg-amber-700/5 border-amber-700/15 shadow-[0_8px_20px_rgba(0,0,0,0.03)] hover:border-amber-700/30'
              }`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-700 to-amber-600" />
                <span className="text-3xl filter drop-shadow-md mb-2">🥉</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-amber-600' : 'text-amber-700'}`}>Tercer Puesto</span>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-2xl" aria-hidden="true">
                    {isBlurred ? '🔒' : getCountryEmoji(podium.thirdPlace)}
                  </span>
                  {isBlurred ? (
                    <>
                      <span className="sr-only">Pronóstico oculto</span>
                      <span className={`text-base font-black blur-md select-none ${isDark ? 'text-white' : 'text-slate-800'}`} aria-hidden="true">
                        ••••••••
                      </span>
                    </>
                  ) : (
                    <span className={`text-base font-black ${isThirdPlacePossible(podium.thirdPlace) ? (isDark ? 'text-white' : 'text-slate-800') : 'line-through text-slate-500 decoration-red-500/80 decoration-2'}`}>
                      {podium.thirdPlace || 'Sin elegir'}
                    </span>
                  )}
                </div>
              </div>
              <div className={`hidden md:flex w-24 h-8 border-x border-t rounded-t-xl items-center justify-center mt-3 shadow-inner ${
                isDark ? 'bg-slate-800/20 border-slate-700/20' : 'bg-amber-700/10 border-amber-700/15'
              }`}>
                <span className={`text-base font-black ${isDark ? 'text-slate-550/50' : 'text-slate-400'}`}>3</span>
              </div>
            </div>

          </div>

          {isBlurred && (
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center mt-2 flex items-center justify-center gap-1">
              <span>🔒</span>
              <span>Las predicciones del podio se revelarán el 12 de Junio de 2026.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Loading Spinner ── */}
      {loading && (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-indigo-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-semibold">Cargando predicciones...</span>
        </div>
      )}

      {/* ── Error Indicator ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400 font-bold">
          {error}
        </div>
      )}

      {/* ── Controles de Búsqueda y Filtro ── */}
      {!loading && !error && predictions.length > 0 && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl border rounded-3xl p-4 shadow-lg transition-all duration-300 ${
          isDark ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200'
        }`}>
          {/* Filter Tabs */}
          <div className={`flex flex-wrap items-center gap-1.5 p-1 border rounded-2xl w-full sm:w-auto transition-all duration-300 ${
            isDark ? 'bg-slate-950/60 border-white/5' : 'bg-slate-100/80 border-slate-205'
          }`}>
            {[
              { id: 'all', label: 'Todos', count: totalPreds, color: isDark ? 'hover:text-indigo-300' : 'hover:text-indigo-650', activeClass: isDark ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-205 text-indigo-700' },
              { id: 'exact', label: 'Exactos', count: totals.exact, color: isDark ? 'hover:text-emerald-400' : 'hover:text-emerald-650', activeClass: isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-emerald-50 border-emerald-205 text-emerald-700 shadow-sm' },
              { id: 'tendency', label: 'Tendencias', count: totals.tendency, color: isDark ? 'hover:text-amber-400' : 'hover:text-amber-655', activeClass: isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-amber-50 border-amber-205 text-amber-700 shadow-sm' },
              { id: 'wrong', label: 'Errados', count: totals.wrong, color: isDark ? 'hover:text-slate-400' : 'hover:text-slate-600', activeClass: isDark ? 'bg-slate-800 border-slate-700/50 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-600' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border cursor-pointer ${
                  filter === tab.id
                    ? tab.activeClass
                    : `text-slate-450 border-transparent ${tab.color} hover:bg-white/5`
                }`}
              >
                {tab.label} <span className="ml-0.5 opacity-60 font-medium">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Buscar equipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-2xl py-2 px-4 pl-10 text-xs font-bold transition-all duration-350 shadow-inner focus:outline-none ${
                isDark
                  ? 'bg-slate-950/60 border-white/5 text-white placeholder-slate-500 focus:border-indigo-500/50'
                  : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400'
              }`}
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer text-xs ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Lista de predicciones ── */}
      {!loading && !error && predictions.length > 0 && (
        <>
          {filteredPredictions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              {filteredPredictions.map((pred) => {
                const match = matchesMap.get(Number(pred.matchId));
                const result = getResult(pred, match, tournament.tournamentId);
                const cfg = resultConfig[result];
                const hLogo = getTeamLogo(match, 'home');
                const aLogo = getTeamLogo(match, 'away');
                const ptsObtenidos = (pred.pointsEarned !== undefined && pred.pointsEarned !== null)
                  ? pred.pointsEarned
                  : getPointsForPrediction(pred, match, tournament.tournamentId, result);
                
                const date = new Date(pred.fechaUnix * 1000);
                const dateStr = date.toLocaleDateString('es-ES', {
                  weekday: 'short', day: 'numeric', month: 'short',
                });
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const equipoLocal = (pred.equipoLocal || '').toLowerCase();
                const equipoVisita = (pred.equipoVisita || '').toLowerCase();
                const esArgentina = equipoLocal.includes('argentina') || equipoVisita.includes('argentina');

                return (
                  <div
                    key={pred._id}
                    className={`relative overflow-hidden ${
                      esArgentina
                        ? (isDark
                            ? 'bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-slate-950/70 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
                            : 'bg-gradient-to-br from-amber-500/10 via-amber-50/20 to-sky-100/40 border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                          )
                        : cfg.bg + ' border ' + cfg.border + ' ' + cfg.glow
                    } rounded-3xl p-5 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-2xl`}
                  >
                    {/* Left vertical border color indicator */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${esArgentina ? 'bg-amber-500' : cfg.barBg}`} />

                    {/* Card Header: stage and date */}
                    <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-550'}`}>
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{dateStr}</span>
                        <span className="text-slate-505">·</span>
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{timeStr}</span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        esArgentina 
                          ? (isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-205 text-amber-700') 
                          : cfg.pill
                      } shadow-sm`}>
                        <span>{cfg.icon}</span>
                        <span>+{ptsObtenidos} PTS {esArgentina && '(x2)'}</span>
                      </span>
                    </div>

                    {/* Team logos and scores */}
                    <div className="flex items-center justify-between gap-4 my-1">
                      {/* Home Team */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <TeamLogo url={hLogo} name={pred.equipoLocal} />
                        <span className={`font-extrabold text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {pred.equipoLocal}
                        </span>
                      </div>

                      {/* Score display widget */}
                      <div className={`shrink-0 flex flex-col items-center justify-center rounded-2xl border p-2 px-3 shadow-inner min-w-[90px] ${
                        isDark ? 'bg-slate-950/80 border-white/5' : 'bg-slate-100/80 border-slate-205'
                      }`}>
                        <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-450'}`}>REAL</span>
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{pred.golesRealesLocal}</span>
                          <span className={`text-[10px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>:</span>
                          <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{pred.golesRealesVisita}</span>
                        </div>
                        <div className={`w-full h-[1px] my-1.5 ${isDark ? 'bg-white/5' : 'bg-slate-200'}`} />
                        <span className={`text-[7px] font-black ${cfg.color} uppercase tracking-widest mb-0.5`}>PRONÓSTICO</span>
                        <span className={`text-xs font-black tracking-wider ${cfg.color}`}>
                          {pred.miPronosticoLocal} - {pred.miPronosticoVisita}
                        </span>
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
                        <span className={`font-extrabold text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {pred.equipoVisita}
                        </span>
                        <TeamLogo url={aLogo} name={pred.equipoVisita} />
                      </div>
                    </div>

                    {/* Card Footer: League and Result label */}
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className={`${isDark ? 'text-indigo-400' : 'text-indigo-650'} font-extrabold uppercase tracking-wider flex items-center gap-2`}>
                        <span>{pred.torneo || tournament.name}</span>
                        {esArgentina && (
                          <span className="bg-amber-500/25 text-amber-400 border border-amber-500/35 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase animate-pulse">
                            💥 X2 Puntos
                          </span>
                        )}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        esArgentina 
                          ? (isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-205 text-amber-705') 
                          : cfg.pill
                      }`}>
                        {cfg.label}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`border rounded-[2rem] p-12 flex flex-col items-center gap-4 text-center ${
              isDark ? 'bg-white/[0.02] border-white/5 text-slate-400' : 'bg-slate-100 border-slate-205 text-slate-600'
            }`}>
              <span className="text-4xl">🔍</span>
              <p className="text-sm font-medium">
                No se encontraron predicciones que coincidan con la búsqueda o el filtro.
              </p>
              <button
                onClick={() => { setFilter('all'); setSearchQuery(''); }}
                className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Limpiar Filtros
              </button>
            </div>
          )}
        </>
      )}

      {!loading && !error && predictions.length === 0 && (
        <div className={`border rounded-[2rem] p-12 flex flex-col items-center gap-4 ${
          isDark ? 'bg-white/[0.02] border-white/5 text-slate-400' : 'bg-slate-100 border-slate-205 text-slate-650'
        }`}>
          <div className="text-5xl opacity-35">🔮</div>
          <p className="text-sm font-medium text-center">
            No hay predicciones evaluadas para {tournament.name} todavía.
          </p>
        </div>
      )}
    </div>
  );
}
