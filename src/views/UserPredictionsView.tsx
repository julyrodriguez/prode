"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

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
  exact: { label: 'Exacto', icon: '✅', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  tendency: { label: 'Tendencia', icon: '🟡', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
  wrong: { label: 'Errado', icon: '❌', color: 'text-slate-500', bg: 'bg-white/[0.01]', border: 'border-white/5' },
};

export default function UserPredictionsView() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const pathname = usePathname(); const searchParams = useSearchParams();
  const rawTournamentId = searchParams.get('tournamentId');
  let stateTournamentId: number | undefined = undefined;
  if (rawTournamentId && rawTournamentId !== 'null' && rawTournamentId !== 'undefined') {
    const parsed = parseInt(rawTournamentId, 10);
    if (!isNaN(parsed)) {
      stateTournamentId = parsed;
    }
  }
  const stateTournamentName = searchParams.get('tournamentName') || undefined;
  // Use Liga Argentina (155) as fallback 
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
    if (!userId || tournament.tournamentId !== 16) return;
    const fetchPodium = async () => {
      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/mundial/predictions/${userId}`);
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
  }, [userId, tournament.tournamentId]);

  useEffect(() => {
    if (!userId) return;
    const fetch_ = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://apivacas.jariel.com.ar/api/predictions/user/${userId}/tournament/${tournament.tournamentId}`
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
  }, [userId, tournament.tournamentId]);

  // ─── Fetch nombre del usuario desde la lista global de usuarios o ranking ──
  useEffect(() => {
    if (!userId) return;
    const getUserName = async () => {
      try {
        const resUsers = await fetch('https://apivacas.jariel.com.ar/api/users');
        if (resUsers.ok) {
          const users = await resUsers.json();
          if (Array.isArray(users)) {
            const found = users.find((u: any) => u._id === userId);
            if (found && found.name) {
              setUserName(found.name);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Error fetching global users list:", e);
      }

      // Fallback a ranking
      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/ranking/${tournament.tournamentId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const found = data.find((r: any) => r.userId === userId);
            if (found && found.name) {
              setUserName(found.name);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching ranking fallback:", e);
      }
    };
    getUserName();
  }, [userId, tournament.tournamentId]);

  // Create a quick lookup map for matches
  const matchesMap = new Map<number, any>();
  matches.forEach((m) => {
    const mId = m.id !== undefined ? m.id : m._id;
    if (mId !== undefined) {
      matchesMap.set(mId, m);
    }
  });

  // ─── Estadísticas rápidas ──────────────────────────────────────────────────
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

  return (
    <div className="w-full flex flex-col gap-6 pb-10 animate-fade-in">

      {/* Volver */}
      <button
        onClick={() => router.back()}
        className="self-start flex items-center gap-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-semibold text-sm">Volver al Ranking</span>
      </button>

      {/* ── Cabecera ── */}
      <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-indigo-500/8 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/8 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl font-black text-indigo-300 shrink-0 shadow-lg overflow-hidden">
              <span className="absolute z-0">{userName?.slice(0, 1).toUpperCase() || '?'}</span>
              <img
                src={`https://apivacas.jariel.com.ar/users/${userId}.webp`}
                alt="Avatar"
                className="w-full h-full object-cover relative z-10"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                {userName || 'Usuario'}
              </h1>
              <p className="text-slate-400 text-sm font-medium mt-0.5">
                Predicciones evaluadas · {tournament.name}
              </p>
            </div>
          </div>

          {/* Resumen rápido */}
          {!loading && predictions.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Puntos', value: totals.pts, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                { label: 'Exactos', value: totals.exact, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                { label: 'Tendencia', value: totals.tendency, color: 'text-amber-300', bg: 'bg-amber-500/5', border: 'border-amber-500/15' },
                { label: 'Errados', value: totals.wrong, color: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/5' },
              ].map((s) => (
                <div key={s.label} className={`flex flex-col items-center ${s.bg} border ${s.border} rounded-2xl px-4 py-2.5 min-w-[64px]`}>
                  <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Podio Mundial ── */}
      {!loading && !error && tournament.tournamentId === 16 && podium && (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-lg flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <span className="text-xl">🏆</span>
            <h2 className="text-lg font-black text-white">Predicción del Podio</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {/* Campeón */}
            <div className="flex flex-col items-center p-4 bg-black/40 border border-amber-500/10 rounded-2xl text-center">
              <span className="text-3xl mb-1">🥇</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Campeón</span>
              <span className={`text-sm md:text-base font-extrabold text-white mt-1.5 transition-all duration-150 ${isBlurred ? 'blur-md select-none' : ''}`}>
                {podium.champion}
              </span>
            </div>
            {/* Subcampeón */}
            <div className="flex flex-col items-center p-4 bg-black/40 border border-slate-500/10 rounded-2xl text-center">
              <span className="text-3xl mb-1">🥈</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subcampeón</span>
              <span className={`text-sm md:text-base font-extrabold text-white mt-1.5 transition-all duration-150 ${isBlurred ? 'blur-md select-none' : ''}`}>
                {podium.runnerUp}
              </span>
            </div>
            {/* Tercer Puesto */}
            <div className="flex flex-col items-center p-4 bg-black/40 border border-amber-600/10 rounded-2xl text-center">
              <span className="text-3xl mb-1">🥉</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Tercer Puesto</span>
              <span className={`text-sm md:text-base font-extrabold text-white mt-1.5 transition-all duration-150 ${isBlurred ? 'blur-md select-none' : ''}`}>
                {podium.thirdPlace}
              </span>
            </div>
          </div>
          {isBlurred && (
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center mt-1">
              🔒 Las predicciones del podio se revelarán el 12 de Junio de 2026.
            </div>
          )}
        </div>
      )}

      {/* ── Cargando / Error ── */}
      {loading && (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-indigo-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-medium">Cargando predicciones...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400 font-bold">
          {error}
        </div>
      )}

      {/* ── Lista de predicciones ── */}
      {!loading && !error && predictions.length > 0 && (
        <div className="flex flex-col gap-3">
          {predictions.map((pred) => {
            const result = getResult(pred);
            const cfg = RESULT_CONFIG[result];
            const match = matchesMap.get(pred.matchId);
            const ptsObtenidos = getPointsForPrediction(pred, match, tournament.tournamentId, result);
            const date = new Date(pred.fechaUnix * 1000);
            const dateStr = date.toLocaleDateString('es-ES', {
              weekday: 'short', day: 'numeric', month: 'short',
            });
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={pred._id}
                className={`relative ${cfg.bg} border ${cfg.border} rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-6 transition-all hover:scale-[1.01]`}
              >
                {/* PTS Badge */}
                <div className="absolute top-4 right-4 flex flex-col items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-black/20 shadow-sm">
                  <span className="text-lg leading-none">{cfg.icon}</span>
                  <span className={`text-[10px] font-black ${cfg.color} mt-0.5`}>+{ptsObtenidos}</span>
                </div>

                <div className="w-full flex-1 flex flex-col gap-4">
                  {/* Fecha */}
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-2 sm:mt-0">
                    <span>{dateStr}</span>
                    <span>·</span>
                    <span>{timeStr}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                    {/* Teams and Real Score */}
                    <div className="flex-1 w-full flex items-center justify-between gap-3 bg-black/30 border border-white/5 rounded-2xl p-4">
                      <span className="font-bold text-slate-200 text-sm md:text-base line-clamp-2 flex-1 text-right">
                        {pred.equipoLocal}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 px-3 py-1 bg-black/40 rounded-xl border border-white/10">
                        <span className="text-xl font-black text-white w-6 text-center">{pred.golesRealesLocal}</span>
                        <span className="text-slate-600 text-sm">-</span>
                        <span className="text-xl font-black text-white w-6 text-center">{pred.golesRealesVisita}</span>
                      </div>
                      <span className="font-bold text-slate-200 text-sm md:text-base line-clamp-2 flex-1 text-left">
                        {pred.equipoVisita}
                      </span>
                    </div>

                    {/* Divider for mobile */}
                    <div className="w-px h-10 bg-white/10 hidden sm:block"></div>

                    {/* User Prediction */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-full sm:w-auto">
                      <span className={`text-[10px] font-bold ${cfg.color} uppercase tracking-widest mb-2`}>Pronóstico</span>
                      <div className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border ${result === 'exact'
                          ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                          : result === 'tendency'
                            ? 'bg-amber-500/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                            : 'bg-white/5 border-white/10'
                        }`}>
                        <span className={`text-lg font-black w-6 text-center ${cfg.color}`}>{pred.miPronosticoLocal}</span>
                        <span className="text-slate-600 text-sm">-</span>
                        <span className={`text-lg font-black w-6 text-center ${cfg.color}`}>{pred.miPronosticoVisita}</span>
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-widest mt-2 ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
