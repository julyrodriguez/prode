"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Star, Award, X, Calendar, Clock, TrendingUp, Zap, HelpCircle } from 'lucide-react';

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
}

function getResult(pred: Prediction): 'exact' | 'tendency' | 'wrong' {
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

  if (tournamentId === 16) {
    // Mundial (tournamentId 16) rules:
    const stage = (match?.stage || match?.round_name || '').toLowerCase();
    const torneo = (pred.torneo || match?.tournament_name || '').toLowerCase();

    // Group stage detection:
    const isGroup = torneo.includes('group') || torneo.includes('grupo') || stage.includes('fecha') || stage.includes('group');

    if (isGroup) {
      return result === 'exact' ? 4 : 2;
    }

    // Knockout phases (16avos, Octavos, Cuartos):
    const is16avosTo4tos = 
      stage.includes('32') || 
      stage.includes('16') || 
      stage.includes('octav') || 
      stage.includes('dieciseis') || 
      stage.includes('16av') || 
      stage.includes('quarter') || 
      stage.includes('cuart');

    if (is16avosTo4tos) {
      return result === 'exact' ? 8 : 4;
    }

    const isSemi = stage.includes('semi');
    if (isSemi) {
      return result === 'exact' ? 14 : 7;
    }

    const isFinal = stage.includes('final');
    if (isFinal) {
      return result === 'exact' ? 20 : 10;
    }

    // Default fallback for Mundial (Group rules)
    return result === 'exact' ? 4 : 2;
  }

  // Fallback for standard tournaments:
  return result === 'exact' ? 6 : 3;
}

const RESULT_CONFIG = {
  exact: {
    label: 'Exacto',
    icon: '🏆',
    color: 'text-emerald-400',
    bg: 'bg-gradient-to-br from-emerald-500/10 via-slate-900/50 to-slate-950/60',
    border: 'border-emerald-500/30 hover:border-emerald-500/50',
    pill: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    glow: 'shadow-[0_0_25px_rgba(16,185,129,0.12)]',
    barBg: 'bg-emerald-500'
  },
  tendency: {
    label: 'Tendencia',
    icon: '✨',
    color: 'text-amber-400',
    bg: 'bg-gradient-to-br from-amber-500/10 via-slate-900/50 to-slate-950/60',
    border: 'border-amber-500/30 hover:border-amber-500/50',
    pill: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    glow: 'shadow-[0_0_25px_rgba(245,158,11,0.12)]',
    barBg: 'bg-amber-500'
  },
  wrong: {
    label: 'Errado',
    icon: '❌',
    color: 'text-slate-400',
    bg: 'bg-gradient-to-br from-slate-900/60 via-slate-950/70 to-slate-950/80',
    border: 'border-slate-800 hover:border-slate-700/50',
    pill: 'bg-slate-800/60 border-slate-700/55 text-slate-400',
    glow: 'shadow-none',
    barBg: 'bg-slate-700'
  },
};

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
  if (name.includes('gales') || name.includes('wales')) return '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
  if (name.includes('tunez') || name.includes('túnez') || name.includes('tunisia')) return '🇹🇳';
  return '🏳️';
};

const getTeamLogo = (match: any, team: 'home' | 'away') => {
  if (!match) return null;
  const teamObj = team === 'home' ? match.homeTeam : match.awayTeam;
  const altTeamObj = team === 'home' ? match.home_team : match.away_team;
  const teamId = teamObj?.id || altTeamObj?.id;
  if (teamId) return `https://apivacas.jariel.com.ar/escudos/${teamId}.png`;
  const logoUrl = teamObj?.logoUrl || altTeamObj?.logoUrl || null;
  return logoUrl?.startsWith('/') ? `https://apivacas.jariel.com.ar/api${logoUrl}` : logoUrl;
};

function TeamLogo({ url, name }: { url?: string | null; name: string }) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div className="w-8 h-8 sm:w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-[10px] sm:text-xs font-black text-slate-300 uppercase select-none shrink-0 shadow-inner">
        {name.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className="w-8 h-8 sm:w-10 h-10 flex items-center justify-center bg-slate-900/40 rounded-xl border border-white/5 shrink-0 shadow-md">
      <img
        src={url}
        alt={name}
        onError={() => setError(true)}
        className="w-6 h-6 sm:w-8 h-8 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-110"
      />
    </div>
  );
}

export default function UserPredictionsView({ userId: propUserId }: { userId?: string } = {}) {
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

  useEffect(() => {
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
      matchesMap.set(mId, m);
    }
  });

  // Calculate statistics
  const totals = predictions.reduce(
    (acc, p) => {
      const r = getResult(p);
      acc[r]++;
      const match = matchesMap.get(p.matchId);
      acc.pts += getPointsForPrediction(p, match, tournament.tournamentId, r);
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
    const matchesFilter = filter === 'all' || getResult(pred) === filter;
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
        className="self-start flex items-center gap-2 text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900/80 px-4 py-2.5 rounded-2xl transition-all duration-300 border border-white/10 hover:border-white/20 active:scale-95 shadow-lg backdrop-blur-md group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
        <span className="font-bold text-sm">Volver al Ranking</span>
      </button>

      {/* ── Cabecera (Stats Dashboard & Profiles) ── */}
      <div className="relative bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-500 p-[3px] shadow-[0_0_20px_rgba(99,102,241,0.2)] shrink-0 group">
                <div className="w-full h-full rounded-[1.8rem] bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center overflow-hidden relative border border-white/10">
                  <span className="absolute z-0 text-3xl font-black text-slate-500 bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
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
                  <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md">
                    {userName || 'Usuario'}
                  </h1>
                  <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 rounded-full">
                    Prode Perfil
                  </span>
                </div>
                <p className="text-slate-400 text-sm font-semibold mt-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Evaluando: {tournament.name}
                </p>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            {!loading && totalPreds > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                {[
                  { label: 'Puntos', value: totals.pts, color: 'text-amber-400', bg: 'from-amber-500/15 via-amber-500/5 to-transparent', border: 'border-amber-500/20', icon: <Trophy className="w-4 h-4 text-amber-400" /> },
                  { label: 'Exactos', value: totals.exact, color: 'text-emerald-400', bg: 'from-emerald-500/15 via-emerald-500/5 to-transparent', border: 'border-emerald-500/20', icon: <Award className="w-4 h-4 text-emerald-400" /> },
                  { label: 'Tendencias', value: totals.tendency, color: 'text-indigo-400', bg: 'from-indigo-500/15 via-indigo-500/5 to-transparent', border: 'border-indigo-500/20', icon: <Star className="w-4 h-4 text-indigo-400" /> },
                  { label: 'Errados', value: totals.wrong, color: 'text-slate-400', bg: 'from-slate-800/15 via-slate-800/5 to-transparent', border: 'border-slate-800', icon: <X className="w-4 h-4 text-slate-400" /> },
                ].map((s) => (
                  <div key={s.label} className={`relative flex flex-col justify-between bg-gradient-to-b ${s.bg} border ${s.border} rounded-2xl p-4 min-w-[110px] shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">{s.label}</span>
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
              <div className="w-full h-px bg-white/10 my-2" />
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between text-xs font-bold text-slate-450 px-1">
                    <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Distribución de Aciertos</span>
                    <span className="text-emerald-400 font-extrabold">{hitRate}% Eficacia de Acierto</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-950/80 rounded-full overflow-hidden flex border border-white/5 p-[2px]">
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
                        className="h-full bg-gradient-to-r from-slate-650 to-slate-750 transition-all duration-500 last:rounded-r-full"
                        title={`Errados: ${totals.wrong} (${wrongPercent}%)`}
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1 px-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Exactos: <b className="text-slate-200">{totals.exact}</b> ({exactPercent}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Tendencia: <b className="text-slate-200">{totals.tendency}</b> ({tendencyPercent}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0" />
                      <span>Errados: <b className="text-slate-200">{totals.wrong}</b> ({wrongPercent}%)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 divide-x divide-white/10 shrink-0 self-end lg:self-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Puntos / Partido</span>
                    <span className="text-xl font-black text-white mt-1">
                      {totalPreds ? (totals.pts / totalPreds).toFixed(1) : '0'} <span className="text-xs text-slate-400 font-normal">pts</span>
                    </span>
                  </div>
                  <div className="flex flex-col pl-6">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Total Evaluados</span>
                    <span className="text-xl font-black text-white mt-1">{totalPreds}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Podio Mundial (Pedestal 3D Layout) ── */}
      {!loading && !error && tournament.tournamentId === 16 && podium && (
        <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
            <div>
              <h2 className="text-xl font-black text-white leading-tight">Predicción del Podio</h2>
              <p className="text-xs text-slate-400">Predicción final del podio elegida por el usuario</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-end justify-center gap-6 max-w-4xl mx-auto pt-6 pb-2 w-full">
            
            {/* 2DO PUESTO (SILVER) */}
            <div className="flex-1 order-2 md:order-1 flex flex-col items-center">
              <div className="w-full bg-slate-900/40 backdrop-blur-md border border-slate-450/20 rounded-3xl p-5 flex flex-col items-center relative overflow-hidden group shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-[1.03] hover:border-slate-400/40 md:h-52 justify-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-300" />
                <span className="text-3xl filter drop-shadow-md mb-2">🥈</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subcampeón</span>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-2xl">{getCountryEmoji(podium.runnerUp)}</span>
                  <span className={`text-base font-black text-white ${isBlurred ? 'blur-md select-none' : ''}`}>
                    {podium.runnerUp || 'Sin elegir'}
                  </span>
                </div>
              </div>
              <div className="hidden md:flex w-24 h-12 bg-slate-800/40 border-x border-t border-slate-700/30 rounded-t-xl items-center justify-center mt-3 shadow-inner">
                <span className="text-lg font-black text-slate-450/60">2</span>
              </div>
            </div>

            {/* 1ER PUESTO (GOLD) */}
            <div className="flex-1 order-1 md:order-2 flex flex-col items-center">
              <div className="w-full bg-slate-900/50 backdrop-blur-md border border-amber-500/30 rounded-3xl p-6 flex flex-col items-center relative overflow-hidden group shadow-[0_15px_40px_rgba(245,158,11,0.15)] transition-all duration-300 hover:scale-[1.05] hover:border-amber-500/50 md:h-60 justify-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-300" />
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-500" />
                
                <span className="text-4xl filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] mb-2 animate-bounce">🏆</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Campeón</span>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-3xl">{getCountryEmoji(podium.champion)}</span>
                  <span className={`text-lg font-black text-white ${isBlurred ? 'blur-md select-none' : ''}`}>
                    {podium.champion || 'Sin elegir'}
                  </span>
                </div>
              </div>
              <div className="hidden md:flex w-28 h-20 bg-amber-500/10 border-x border-t border-amber-500/25 rounded-t-2xl items-center justify-center mt-3 shadow-inner">
                <span className="text-2xl font-black text-amber-500/60">1</span>
              </div>
            </div>

            {/* 3ER PUESTO (BRONZE) */}
            <div className="flex-1 order-3 md:order-3 flex flex-col items-center">
              <div className="w-full bg-slate-900/40 backdrop-blur-md border border-amber-750/20 rounded-3xl p-5 flex flex-col items-center relative overflow-hidden group shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-[1.03] hover:border-amber-700/40 md:h-44 justify-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-700 to-amber-600" />
                <span className="text-3xl filter drop-shadow-md mb-2">🥉</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Tercer Puesto</span>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-2xl">{getCountryEmoji(podium.thirdPlace)}</span>
                  <span className={`text-base font-black text-white ${isBlurred ? 'blur-md select-none' : ''}`}>
                    {podium.thirdPlace || 'Sin elegir'}
                  </span>
                </div>
              </div>
              <div className="hidden md:flex w-24 h-8 bg-slate-800/20 border-x border-t border-slate-700/20 rounded-t-xl items-center justify-center mt-3 shadow-inner">
                <span className="text-base font-black text-slate-550/50">3</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-lg">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/60 border border-white/5 rounded-2xl w-full sm:w-auto">
            {[
              { id: 'all', label: 'Todos', count: totalPreds, color: 'hover:text-indigo-300', activeClass: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' },
              { id: 'exact', label: 'Exactos', count: totals.exact, color: 'hover:text-emerald-400', activeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' },
              { id: 'tendency', label: 'Tendencias', count: totals.tendency, color: 'hover:text-amber-400', activeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
              { id: 'wrong', label: 'Errados', count: totals.wrong, color: 'hover:text-slate-400', activeClass: 'bg-slate-800 border-slate-700/50 text-slate-300' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border border-transparent cursor-pointer ${
                  filter === tab.id
                    ? tab.activeClass
                    : `text-slate-450 ${tab.color} hover:bg-white/5`
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
              className="w-full bg-slate-950/60 border border-white/5 rounded-2xl py-2 px-4 pl-10 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all duration-350 shadow-inner"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
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
                const result = getResult(pred);
                const cfg = RESULT_CONFIG[result];
                const match = matchesMap.get(pred.matchId);
                const hLogo = getTeamLogo(match, 'home');
                const aLogo = getTeamLogo(match, 'away');
                const ptsObtenidos = getPointsForPrediction(pred, match, tournament.tournamentId, result);
                
                const date = new Date(pred.fechaUnix * 1000);
                const dateStr = date.toLocaleDateString('es-ES', {
                  weekday: 'short', day: 'numeric', month: 'short',
                });
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={pred._id}
                    className={`relative overflow-hidden ${cfg.bg} border ${cfg.border} ${cfg.glow} rounded-3xl p-5 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-2xl`}
                  >
                    {/* Left vertical border color indicator */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${cfg.barBg}`} />

                    {/* Card Header: stage and date */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                        <Calendar className="w-3 h-3 text-slate-650" />
                        <span>{dateStr}</span>
                        <span className="text-slate-700">·</span>
                        <Clock className="w-3 h-3 text-slate-650" />
                        <span>{timeStr}</span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${cfg.pill} shadow-sm`}>
                        <span>{cfg.icon}</span>
                        <span>+{ptsObtenidos} PTS</span>
                      </span>
                    </div>

                    {/* Team logos and scores */}
                    <div className="flex items-center justify-between gap-4 my-1">
                      {/* Home Team */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <TeamLogo url={hLogo} name={pred.equipoLocal} />
                        <span className="font-extrabold text-white text-xs sm:text-sm truncate">
                          {pred.equipoLocal}
                        </span>
                      </div>

                      {/* Score display widget */}
                      <div className="shrink-0 flex flex-col items-center justify-center bg-slate-950/80 rounded-2xl border border-white/5 p-2 px-3 shadow-inner min-w-[90px]">
                        <span className="text-[8px] font-black text-slate-550 uppercase tracking-widest mb-1">REAL</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-black text-white">{pred.golesRealesLocal}</span>
                          <span className="text-slate-605 text-[10px] font-black">:</span>
                          <span className="text-sm font-black text-white">{pred.golesRealesVisita}</span>
                        </div>
                        <div className="w-full h-[1px] bg-white/5 my-1.5" />
                        <span className={`text-[7px] font-black ${cfg.color} uppercase tracking-widest mb-0.5`}>PRONÓSTICO</span>
                        <span className={`text-xs font-black tracking-wider ${cfg.color}`}>
                          {pred.miPronosticoLocal} - {pred.miPronosticoVisita}
                        </span>
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
                        <span className="font-extrabold text-white text-xs sm:text-sm truncate">
                          {pred.equipoVisita}
                        </span>
                        <TeamLogo url={aLogo} name={pred.equipoVisita} />
                      </div>
                    </div>

                    {/* Card Footer: League and Result label */}
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-indigo-400 font-extrabold uppercase tracking-wider">
                        {pred.torneo || tournament.name}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.pill}`}>
                        {cfg.label}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-12 flex flex-col items-center gap-4 text-slate-400 text-center">
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
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-12 flex flex-col items-center gap-4 text-slate-400">
          <div className="text-5xl opacity-30">🔮</div>
          <p className="text-sm font-medium text-center">
            No hay predicciones evaluadas para {tournament.name} todavía.
          </p>
        </div>
      )}

    </div>
  );
}
