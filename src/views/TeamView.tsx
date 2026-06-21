"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useContext } from 'react';
import { DashboardContext } from '../app/(dashboard)/layout';
import { LEAGUES } from '../components/layout/AppLayout';
import { ArrowLeft, MapPin, Users, Calendar, Trophy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function getReadableColor(hex: string): string {
  if (!hex) return '#10b981';
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 70 ? '#ffffff' : `#${hex}`;
}

// ─── Traducción de estadísticas ────────────────────────────────────────────────
const statLabels: Record<string, string> = {
  goalsScored: 'Goles a favor',
  goalsConceded: 'Goles en contra',
  assists: 'Asistencias',
  shots: 'Tiros totales',
  shotsOnTarget: 'Tiros al arco',
  shotsOffTarget: 'Tiros afuera',
  bigChances: 'Ocasiones claras',
  bigChancesCreated: 'Ocasiones creadas',
  bigChancesMissed: 'Ocasiones perdidas',
  corners: 'Córners',
  hitWoodwork: 'Al palo/travesaño',
  goalsFromInsideTheBox: 'Goles dentro del área',
  goalsFromOutsideTheBox: 'Goles fuera del área',
  headedGoals: 'Goles de cabeza',
  penaltyGoals: 'Goles de penal',
  freeKickGoals: 'Goles de tiro libre',
  fastBreaks: 'Contraataques',
  fastBreakGoals: 'Goles de contragolpe',
  averageBallPossession: 'Posesión promedio (%)',
  totalPasses: 'Pases totales',
  accuratePasses: 'Pases precisos',
  accuratePassesPercentage: 'Precisión de pases (%)',
  totalLongBalls: 'Pelotas largas',
  accurateLongBalls: 'Long balls precisas',
  accurateLongBallsPercentage: 'Precisión pelotas largas (%)',
  totalCrosses: 'Centros totales',
  accurateCrosses: 'Centros precisos',
  accurateCrossesPercentage: 'Precisión centros (%)',
  successfulDribbles: 'Regates exitosos',
  dribbleAttempts: 'Intentos de regate',
  cleanSheets: 'Vallas invictas',
  tackles: 'Entradas',
  interceptions: 'Interceptaciones',
  saves: 'Atajadas',
  clearances: 'Despejes',
  totalDuels: 'Duelos totales',
  duelsWon: 'Duelos ganados',
  duelsWonPercentage: 'Duelos ganados (%)',
  totalAerialDuels: 'Duelos aéreos',
  aerialDuelsWon: 'Duelos aéreos ganados',
  aerialDuelsWonPercentage: 'Duelos aéreos ganados (%)',
  totalGroundDuels: 'Duelos en tierra',
  groundDuelsWon: 'Duelos en tierra ganados',
  fouls: 'Faltas cometidas',
  yellowCards: 'Tarjetas amarillas',
  yellowRedCards: 'Doble amarilla',
  redCards: 'Tarjetas rojas',
  offsides: 'Fueras de juego',
  errorsLeadingToGoal: 'Errores que generan gol',
  errorsLeadingToShot: 'Errores que generan tiro',
  avgRating: 'Rating promedio',
  ballRecovery: 'Recuperaciones',
  possessionLost: 'Pérdidas de balón',
};

// Grupos de estadísticas para mostrar ordenadas
const statGroups = [
  {
    label: 'Ataque',
    icon: '⚽',
    keys: ['goalsScored', 'assists', 'shots', 'shotsOnTarget', 'shotsOffTarget',
           'bigChances', 'bigChancesCreated', 'bigChancesMissed', 'goalsFromInsideTheBox',
           'goalsFromOutsideTheBox', 'headedGoals', 'penaltyGoals', 'corners', 'hitWoodwork',
           'fastBreaks', 'fastBreakGoals'],
  },
  {
    label: 'Pases',
    icon: '🎯',
    keys: ['averageBallPossession', 'totalPasses', 'accuratePasses', 'accuratePassesPercentage',
           'totalLongBalls', 'accurateLongBalls', 'accurateLongBallsPercentage',
           'totalCrosses', 'accurateCrosses', 'accurateCrossesPercentage',
           'successfulDribbles', 'dribbleAttempts'],
  },
  {
    label: 'Defensa',
    icon: '🛡️',
    keys: ['goalsConceded', 'cleanSheets', 'saves', 'tackles', 'interceptions',
           'clearances', 'errorsLeadingToGoal', 'errorsLeadingToShot'],
  },
  {
    label: 'Duelos',
    icon: '🤝',
    keys: ['totalDuels', 'duelsWon', 'duelsWonPercentage',
           'totalAerialDuels', 'aerialDuelsWon', 'aerialDuelsWonPercentage',
           'totalGroundDuels', 'groundDuelsWon', 'ballRecovery', 'possessionLost'],
  },
  {
    label: 'Disciplina',
    icon: '🟨',
    keys: ['fouls', 'yellowCards', 'yellowRedCards', 'redCards', 'offsides'],
  },
];

function formatStatValue(key: string, val: number): string {
  if (['averageBallPossession', 'accuratePassesPercentage',
       'accurateLongBallsPercentage', 'accurateCrossesPercentage',
       'duelsWonPercentage', 'aerialDuelsWonPercentage',
       'groundDuelsWonPercentage'].includes(key)) {
    return `${val.toFixed(1)}%`;
  }
  if (key === 'avgRating') return val.toFixed(2);
  return String(Math.round(val));
}

export default function TeamView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const outletContext = useContext(DashboardContext);
  const setOverriddenLeagueId = outletContext?.setOverriddenLeagueId;

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [team, setTeam] = useState<any>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);

  useEffect(() => {
    if (team && setOverriddenLeagueId) {
      const compKeys = Object.keys(team.competitions || {});
      if (compKeys.includes('16')) {
        setOverriddenLeagueId('mundial');
      } else if (compKeys.includes('155')) {
        setOverriddenLeagueId('liga-arg');
      } else if (compKeys.includes('325')) {
        setOverriddenLeagueId('brasileirao');
      }
    }
    return () => {
      if (setOverriddenLeagueId) {
        setOverriddenLeagueId(null);
      }
    };
  }, [team, setOverriddenLeagueId]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/teams/${id}.json`);
        if (!res.ok) throw new Error('No se pudo cargar el equipo');
        const data = await res.json();
        setTeam(data);
        // Default al primer torneo
        const keys = Object.keys(data.competitions || {});
        if (keys.length > 0) setSelectedComp(keys[0]);

        // Obtener historial de partidos
        try {
          const mRes = await fetch(`/teams/${id}-matches.json`);
          if (mRes.ok) {
            const matchesData = await mRes.json();
            setRecentMatches(matchesData);
          }
        } catch(e) {
          console.error("Error fetching recent matches:", e);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTeam();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="text-4xl">⚠️</div>
        <p>{error || 'Equipo no encontrado.'}</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
          Volver
        </button>
      </div>
    );
  }

  const profile = team.profile || {};
  const competitions = team.competitions || {};
  const compKeys = Object.keys(competitions);
  const currentComp = selectedComp ? competitions[selectedComp] : null;
  const stats = currentComp?.estadisticas_completas || {};

  // Colores del equipo
  const primary = profile.colors?.primary || '#1e293b';
  const secondary = profile.colors?.secondary || '#94a3b8';

  // Año de fundación
  const foundationYear = profile.foundationDate
    ? new Date(profile.foundationDate * 1000).getFullYear()
    : null;

  return (
    <div className="w-full flex flex-col gap-6 pb-10 pt-4 md:pt-6 animate-fade-in">

      {/* Botón volver */}
      <button
        onClick={() => router.back()}
        className="self-start flex items-center gap-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-semibold text-sm">Volver</span>
      </button>

      {/* ─── HERO del Equipo ─── */}
      <div
        className="relative w-full rounded-[2rem] p-6 lg:p-10 overflow-hidden border shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
        style={{
          background: isLight
            ? `linear-gradient(135deg, ${primary}18 0%, #f1f5f9 60%, ${secondary}10 100%)`
            : `linear-gradient(135deg, ${primary}30 0%, #09090b 60%, ${secondary}15 100%)`,
          borderColor: isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.10)',
        }}
      >
        {/* Glow detrás */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[120px] pointer-events-none"
          style={{ background: primary, opacity: isLight ? 0.12 : 0.30 }}
        />
        <div
          className="absolute bottom-0 right-0 w-48 h-48 rounded-full blur-[100px] pointer-events-none"
          style={{ background: secondary, opacity: isLight ? 0.10 : 0.20 }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Escudo real */}
          <div
            className="w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center text-4xl font-black border-4 shadow-2xl shrink-0 select-none overflow-hidden"
            style={{
              borderColor: secondary + '60',
              background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
            }}
          >
            <img 
              src={`/escudos/${id}.png`}
              alt={team.name}
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://img.icons8.com/color/48/000000/football2.png';
              }}
            />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3 text-center md:text-left flex-1">
            <h1
              className="text-3xl md:text-5xl font-black drop-shadow-xl"
              style={{ color: isLight ? '#0f172a' : '#ffffff' }}
            >
              {team.name}
            </h1>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-1">
              {profile.city && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  <MapPin className="w-3 h-3" style={{ color: getReadableColor(secondary) }} />
                  {profile.city}
                </span>
              )}
              {profile.stadium && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  🏟️ {profile.stadium}
                </span>
              )}
              {profile.capacity && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  <Users className="w-3 h-3 text-indigo-400" />
                  {profile.capacity.toLocaleString('es-ES')} cap.
                </span>
              )}
              {foundationYear && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  Fundado en {foundationYear}
                </span>
              )}
              {profile.manager && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  👔 {profile.manager}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Selector de Competición ─── */}
      {compKeys.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {compKeys.map((key) => {
            const comp = competitions[key];
            const isActive = selectedComp === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedComp(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                {comp.name}
                <span className="text-[10px] font-semibold opacity-60 ml-0.5">
                  {comp.partidos_jugados}PJ
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Estadísticas por Grupo ─── */}
      {currentComp && (
        <div className="flex flex-col gap-6">
          {/* Resumen rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Partidos', value: currentComp.partidos_jugados, icon: '🏆' },
              { label: 'Goles', value: stats.goalsScored ?? '-', icon: '⚽' },
              { label: 'Vallas Invictas', value: stats.cleanSheets ?? '-', icon: '🧤' },
              { label: 'Rating Prom.', value: stats.avgRating ? stats.avgRating.toFixed(2) : '-', icon: '⭐' },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-1.5 shadow-sm"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-2xl font-black text-white">{item.value}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Grupos de stats */}
          {statGroups.map((group) => {
            const groupStats = group.keys
              .filter((k) => stats[k] !== undefined && stats[k] !== null)
              .map((k) => ({ key: k, label: statLabels[k] || k, value: stats[k] as number }));

            if (groupStats.length === 0) return null;

            return (
              <div key={group.label} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                  <span className="text-xl">{group.icon}</span>
                  <h3 className="text-base font-black text-slate-200 uppercase tracking-wider">{group.label}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupStats.map(({ key, label, value }) => (
                    <div key={key} className="flex items-center justify-between gap-3 bg-black/20 rounded-xl px-4 py-2.5 border border-white/5">
                      <span className="text-xs font-semibold text-slate-400 truncate flex-1">{label}</span>
                      <span
                        className="text-sm font-black shrink-0 ml-2"
                        style={{ color: getReadableColor(secondary) || '#10b981' }}
                      >
                        {formatStatValue(key, value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {compKeys.length === 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 flex flex-col items-center gap-4 text-slate-400">
          <div className="text-5xl opacity-30">📊</div>
          <p className="text-sm font-medium">No hay estadísticas disponibles para este equipo.</p>
        </div>
      )}

      {/* ─── Historial de Partidos ─── */}
      {recentMatches.length > 0 && (
        <div className="flex flex-col gap-6 w-full mt-4 bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 lg:p-10">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <span className="text-xl">📅</span>
            <h3 className="text-base font-black text-slate-200 uppercase tracking-wider">Últimos {recentMatches.length} Partidos</h3>
          </div>
          <div className="flex flex-col bg-[#0b1015]/60 border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
            {recentMatches.map((match, idx) => {
              const hScore = match.homeScore?.current ?? match.homeTeam?.score ?? match.home_team?.score;
              const aScore = match.awayScore?.current ?? match.awayTeam?.score ?? match.away_team?.score;
              const hName = match.homeTeam?.name || match.home_team?.name || 'Local';
              const aName = match.awayTeam?.name || match.away_team?.name || 'Visitante';
              const isHome = Number(match.homeTeam?.id || match.home_team?.id) === Number(id);
              const weScored = isHome ? hScore : aScore;
              const theyScored = isHome ? aScore : hScore;
              let resultColor = 'bg-slate-500/20 text-slate-300';
              let resultLetter = '-';
              
              if (weScored !== undefined && theyScored !== undefined) {
                if (Number(weScored) > Number(theyScored)) {
                   resultColor = 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold';
                   resultLetter = 'V';
                }
                else if (Number(weScored) < Number(theyScored)) {
                   resultColor = 'bg-red-500/20 border border-red-500/30 text-red-500 font-bold';
                   resultLetter = 'D';
                }
                else {
                   resultColor = 'bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold';
                   resultLetter = 'E';
                }
              }

              const startDate = match.startTimestamp ? new Date(match.startTimestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
              const startHour = match.startTimestamp ? new Date(match.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div 
                  key={match.id || match._id || idx} 
                  onClick={() => router.push(`/match/${match.id || match._id}`)}
                  className="grid grid-cols-[60px_1fr_auto_1fr_30px] items-center border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors px-2 md:px-4 py-3"
                >
                  <div className="flex flex-col items-center justify-center border-r border-white/5 pr-2 md:pr-4 mr-1 md:mr-2">
                    <span className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1 text-center">{startDate}</span>
                    <span className="text-xs text-slate-300 font-semibold leading-none">{startHour}</span>
                  </div>
                  <div className={`text-right text-xs md:text-sm font-bold truncate flex-1 flex items-center justify-end gap-2 ${isHome ? 'text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]' : 'text-slate-100'}`}>
                     {hName}
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-3 px-3 mx-2 rounded-lg bg-black/40 border border-white/5 shrink-0 py-1">
                    <span className={`text-sm md:text-base font-black ${isHome ? 'text-emerald-400' : 'text-white'}`}>{hScore ?? '-'}</span>
                    <span className="text-xs text-slate-500">-</span>
                    <span className={`text-sm md:text-base font-black ${!isHome ? 'text-emerald-400' : 'text-white'}`}>{aScore ?? '-'}</span>
                  </div>
                  <div className={`text-left text-xs md:text-sm font-bold truncate flex-1 flex items-center gap-2 ${!isHome ? 'text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]' : 'text-slate-100'}`}>
                     {aName}
                  </div>
                  <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs tracking-wider shrink-0 ml-1 md:ml-3 ${resultColor}`}>
                    {resultLetter}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
