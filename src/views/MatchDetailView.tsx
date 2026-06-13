"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useContext } from 'react';
import { DashboardContext } from '../app/(dashboard)/layout';
import { LEAGUES } from '../components/layout/AppLayout';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';

const parseStatValue = (val: string | number | undefined): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/%/g, '').trim();
  return parseFloat(cleaned) || 0;
};

export default function MatchDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const outletContext = useContext(DashboardContext);
  const setOverriddenLeagueId = outletContext?.setOverriddenLeagueId;

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchPredictions, setMatchPredictions] = useState<any[]>([]);
  const [showAllPredictions, setShowAllPredictions] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (match && setOverriddenLeagueId) {
      const isMundialMatch = match.tournament_id === 16 || match.tournament?.id === 16;
      if (isMundialMatch) {
        setOverriddenLeagueId('mundial');
      } else if (match.tournament_id === 155 || match.tournament?.id === 155) {
        setOverriddenLeagueId('liga-arg');
      } else if (match.tournament_id === 325 || match.tournament?.id === 325) {
        setOverriddenLeagueId('brasileirao');
      }
    }
    return () => {
      if (setOverriddenLeagueId) {
        setOverriddenLeagueId(null);
      }
    };
  }, [match, setOverriddenLeagueId]);

  // Cuenta regresiva del partido
  useEffect(() => {
    const start = match?.startTimestamp ? (match.startTimestamp * 1000) : 0;
    if (!start || start <= Date.now()) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [match?.startTimestamp]);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const fetchDetail = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        const res = await fetch(`https://apivacas.jariel.com.ar/api/matches/detail/${id}`);
        if (!res.ok) throw new Error('Error al cargar datos del partido');
        const data = await res.json();
        const matchData = data.events ? data.events[0] : data;
        if (isMounted) {
          setMatch(matchData);
        }
      } catch (err: any) {
        if (showLoading && isMounted) {
          setError(err.message);
        }
      } finally {
        if (showLoading && isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetail(true);

    const interval = setInterval(() => {
      fetchDetail(false);
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id]);

  // Fetch predicciones del partido
  useEffect(() => {
    if (!id) return;
    fetch(`https://apivacas.jariel.com.ar/api/predictions/match/${id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setMatchPredictions(Array.isArray(d) ? d : []))
      .catch(() => setMatchPredictions([]));
  }, [id]);

  if (loading) {
    return (
      <div className="w-full flex h-[60vh] justify-center items-center">
        <div className="animate-spin w-12 h-12 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent"></div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-4">
        <div className="text-4xl">⚠️</div>
        <p>{error || 'No se encontró el partido.'}</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">Volver</button>
      </div>
    );
  }

  // Helper functions specific to match detail to parse data safely
  const hName = match.homeTeam?.name || match.home_team?.name || 'Local';
  const aName = match.awayTeam?.name || match.away_team?.name || 'Visitante';
  const hId = match.homeTeam?.id || match.home_team?.id;
  const aId = match.awayTeam?.id || match.away_team?.id;

  const hLogoBase = match.homeTeam?.logoUrl || match.home_team?.logoUrl;
  const aLogoBase = match.awayTeam?.logoUrl || match.away_team?.logoUrl;

  const hLogo = hId ? `https://apivacas.jariel.com.ar/escudos/${hId}.png` :
    (hLogoBase?.startsWith('/') ? `https://apivacas.jariel.com.ar${hLogoBase}` : hLogoBase);

  const aLogo = aId ? `https://apivacas.jariel.com.ar/escudos/${aId}.png` :
    (aLogoBase?.startsWith('/') ? `https://apivacas.jariel.com.ar${aLogoBase}` : aLogoBase);

  const hScore = match.homeScore?.current ?? match.homeTeam?.score ?? match.home_team?.score ?? '-';
  const aScore = match.awayScore?.current ?? match.awayTeam?.score ?? match.away_team?.score ?? '-';

  const tName = match.tournament?.name || match.tournament_name || 'Torneo Desconocido';
  const dateStr = match.startTimestamp ? new Date(match.startTimestamp * 1000).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const timeStr = match.startTimestamp ? new Date(match.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const statusType = typeof match.status === 'object' ? match.status?.type : null;
  const statusDesc = typeof match.status === 'object' ? match.status?.description : match.status;

  const startMs = match.startTimestamp ? (match.startTimestamp * 1000) : 0;
  const isPastTime = startMs > 0 && startMs < Date.now();

  let hasStarted = false;
  let isLive = false;

  if (match.status === 'notstarted' || statusType === 'notstarted' || statusType === 'canceled') {
    hasStarted = false;
    isLive = false;
  } else if (statusType === 'inprogress') {
    hasStarted = true;
    isLive = true;
  } else if (statusType === 'finished') {
    hasStarted = true;
    isLive = false;
  } else if (isPastTime) {
    hasStarted = true;
    isLive = true;
  }

  let matchEndText = '';
  if (statusType === 'finished' && statusDesc === 'AP') {
    const penInc = match.incidents?.slice().reverse().find((inc: any) => inc.text === 'PEN' && inc.incidentType === 'period');
    if (penInc && penInc.homeScore !== undefined) {
      matchEndText = `Penales (${penInc.homeScore} - ${penInc.awayScore})`;
    } else {
      matchEndText = 'Penales';
    }
  }

  const getMatchTimeStatus = () => {
    if (!hasStarted) return 'PENDIENTE';
    if (statusType === 'finished') return 'FINALIZADO';
    if (statusType === 'canceled') return 'CANCELADO';

    // Si está en juego, parseamos el description
    const desc = statusDesc?.toLowerCase();
    if (desc?.includes('halftime') || desc === 'ht' || desc === 'pause') return 'ENTRETIEMPO';
    if (desc?.includes('1st') || desc?.includes('first')) return 'PRIMER TIEMPO';
    if (desc?.includes('2nd') || desc?.includes('second')) return 'SEGUNDO TIEMPO';
    if (desc === 'aet' || desc?.includes('extra')) return 'TIEMPO EXTRA';
    if (desc === 'ap' || desc?.includes('pen')) return 'PENALES';

    return statusDesc ? String(statusDesc).toUpperCase() : 'EN VIVO';
  };

  const getCountdownStr = () => {
    if (!startMs) return null;
    const diff = startMs - now;
    if (diff <= 0) return null;

    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    const s = secs % 60;
    const m = mins % 60;
    const h = hours % 24;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
  };

  // ─── Mapas de traducción ─────────────────────────────────────────────────────
  const translateGroup = (name: string): string => ({
    'Match overview': 'Resumen del partido',
    'Shots': 'Tiros',
    'Shots on target': 'Tiros al arco',
    'Attack': 'Ataque',
    'Passes': 'Pases',
    'Duels': 'Duelos',
    'Defending': 'Defensa',
    'Goalkeeping': 'Arqueros',
    'Discipline': 'Disciplina',
    'Possession': 'Posesión',
    'Corners': 'Córners',
  } as Record<string, string>)[name] ?? name;

  const translateStat = (name: string): string => ({
    'Ball possession': 'Posesión del balón',
    'Total shots': 'Tiros totales',
    'Shots on target': 'Tiros al arco',
    'Shots off target': 'Tiros afuera',
    'Blocked shots': 'Tiros bloqueados',
    'Corner kicks': 'Córners',
    'Offsides': 'Fueras de juego',
    'Fouls': 'Faltas',
    'Yellow cards': 'Tarjetas amarillas',
    'Red cards': 'Tarjetas rojas',
    'Free kicks': 'Tiros libres',
    'Goal kicks': 'Saques de arco',
    'Throw-ins': 'Saques de banda',
    'Total passes': 'Pases totales',
    'Accurate passes': 'Pases precisos',
    'Long balls': 'Pelota larga',
    'Crosses': 'Centros',
    'Dribbles': 'Regates',
    'Tackles': 'Entradas',
    'Interceptions': 'Interceptaciones',
    'Clearances': 'Despejes',
    'Total saves': 'Atajadas totales',
    'Shots from set pieces': 'Tiros a pelota parada',
    'Expected goals (xG)': 'xG esperados',
    'Big chances': 'Ocasiones claras',
    'Big chances missed': 'Ocasiones perdidas',
    'Goalkeeper saves': 'Atajadas del arquero',
    'Headed goals': 'Goles de cabeza',
    'Fast breaks': 'Contraataques',
    'Errors leading to shot': 'Errores que generan tiro',
    'Expected goals': 'Goles esperados (xG)',
    'Hit woodwork': 'Al palo/travesano',
    'Shots inside box': 'Tiros dentro del area',
    'Shots outside box': 'Tiros fuera del area',
    'Big chances scored': 'Ocasiones claras convertidas',
    'Through balls': 'Pases filtrados',
    'Touches in penalty area': 'Toques en el area',
    'Fouled in final third': 'Faltas en 3er tercio',
    'Final third entries': 'Entradas al 3er tercio',
    'Final third phase': 'Fase del 3er tercio',
    'Duels': 'Duelos',
    'Dispossessed': 'Perdidas de balon',
    'Ground duels': 'Duelos en tierra',
    'Aerial duels': 'Duelos aereos',
    'Tackles won': 'Entradas ganadas',
    'Recoveries': 'Recuperaciones',
    'Errors lead to a shot': 'Errores que generan tiro',
    'Errors lead to a goal': 'Errores que generan gol',
    'Goals prevented': 'Goles evitados',
    'Big saves': 'Atajadas clave',
    'High claims': 'Centros atrapados',
    'Professional foul last man': 'Falta profesional ultimo hombre',
    'Passes': 'Pases totales',
  } as Record<string, string>)[name] ?? name;

  const translatePeriod = (text: string): string => ({
    '1st half': 'Primer tiempo',
    '2nd half': 'Segundo tiempo',
    'Halftime': 'Entretiempo',
    'HT': 'Entretiempo',
    'FT': 'Tiempo reglamentario',
    'Full time': 'Tiempo reglamentario',
    'Extra time': 'Tiempo extra',
    'Penalty shootout': 'Penales',
    'PEN': 'Penales',
  } as Record<string, string>)[text] ?? text;
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col gap-4 md:gap-6 animate-fade-in pb-6 md:pb-8 pt-2 md:pt-6">

      {/* Botón Volver — sticky en mobile */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-[#09090b]/80 backdrop-blur-xl md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none border-0">
        <button
          onClick={() => router.back()}
          className="self-start flex items-center gap-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="font-semibold text-xs md:text-sm">Volver a Partidos</span>
        </button>
      </div>

      {/* Hero Header Partido */}
      <div className="relative w-full bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-[2rem] p-4 md:p-8 lg:p-10 flex flex-col items-center justify-center shadow-lg md:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">

        {/* Decorative background gradients */}
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-emerald-500/10 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent blur-3xl pointer-events-none"></div>

        {/* Torneo Label */}
        <div className="z-10 flex items-center gap-1.5 bg-black/40 px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-white/5 mb-4 md:mb-8">
          <span className="text-[9px] md:text-[11px] font-bold tracking-widest text-emerald-400 uppercase">T O R N E O</span>
          <div className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-slate-600"></div>
          <span className="text-[10px] md:text-xs font-semibold text-slate-200">{tName}</span>
        </div>

        {/* Info Teams & Score */}
        <div className="z-10 flex flex-row items-center w-full justify-between gap-2 md:gap-8 lg:gap-16">

          {/* HOME */}
          <div className="flex flex-col items-center gap-2 md:gap-4 flex-1 min-w-0">
            <button
              onClick={() => hId && router.push(`/team/${hId}`)}
              className={`flex flex-col items-center gap-2 md:gap-4 w-full ${hId ? 'cursor-pointer hover:opacity-80 transition-opacity group' : ''}`}
            >
              <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-white/5 rounded-full border border-white/10 p-2 md:p-4 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)] drop-shadow-2xl relative group-hover:border-emerald-500/40 transition-colors shrink-0 animate-[pulse_3s_infinite]">
                {hLogo && <img src={hLogo} alt={hName} className="w-full h-full object-contain filter drop-shadow-xl z-20" />}
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl z-0"></div>
              </div>
              <h2 className="text-xs sm:text-sm md:text-xl lg:text-3xl font-black text-center text-white break-words drop-shadow-md group-hover:text-emerald-300 transition-colors line-clamp-2 px-1">{hName}</h2>
              {hId && <span className="hidden md:inline text-[10px] font-semibold text-slate-500 group-hover:text-emerald-400 transition-colors">Ver perfil →</span>}
            </button>
          </div>

          {/* CENTRO: SCORE / TIME */}
          <div className="flex flex-col items-center gap-2 md:gap-4 shrink-0 px-2 sm:px-4">
            {hasStarted && statusType !== 'canceled' ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 md:gap-4 text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black font-mono tracking-tighter text-white drop-shadow-2xl">
                  <span>{hScore}</span>
                  <span className="text-slate-600 text-xl sm:text-3xl mb-1 md:mb-3 font-sans select-none">-</span>
                  <span>{aScore}</span>
                </div>
                {matchEndText && (
                  <span className="text-emerald-400 font-bold text-[9px] sm:text-xs uppercase tracking-widest mt-0.5 md:mt-1 mb-1 md:mb-2 drop-shadow-md text-center max-w-[100px] sm:max-w-none truncate">
                    {matchEndText}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-4 text-2xl sm:text-4xl md:text-5xl font-black text-slate-500 tracking-tighter drop-shadow-2xl">
                <span className="opacity-50">-</span>
                <span className="text-slate-700 text-xl sm:text-3xl mb-1">-</span>
                <span className="opacity-50">-</span>
              </div>
            )}

            {/* Status Badge / Countdown */}
            {!hasStarted && getCountdownStr() ? (
              <div className="flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono font-black text-[9px] md:text-xs tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.15)] select-none">
                <Clock className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 animate-pulse text-emerald-400 shrink-0" />
                <span>{getCountdownStr()}</span>
              </div>
            ) : (
              <div className={`flex items-center gap-1 md:gap-2 px-2 py-0.5 md:px-4 md:py-1.5 rounded-md md:rounded-lg border font-black text-[9px] md:text-xs tracking-wider md:tracking-widest shadow-lg ${isLive ? 'bg-red-500/20 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-slate-800/80 text-slate-300 border-white/10'}`}>
                {isLive && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"></div>}
                <span>{getMatchTimeStatus()}</span>
              </div>
            )}
          </div>

          {/* AWAY */}
          <div className="flex flex-col items-center gap-2 md:gap-4 flex-1 min-w-0">
            <button
              onClick={() => aId && router.push(`/team/${aId}`)}
              className={`flex flex-col items-center gap-2 md:gap-4 w-full ${aId ? 'cursor-pointer hover:opacity-80 transition-opacity group' : ''}`}
            >
              <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-white/5 rounded-full border border-white/10 p-2 md:p-4 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)] drop-shadow-2xl relative group-hover:border-indigo-500/40 transition-colors shrink-0 animate-[pulse_3s_infinite]">
                {aLogo && <img src={aLogo} alt={aName} className="w-full h-full object-contain filter drop-shadow-xl z-20" />}
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl z-0"></div>
              </div>
              <h2 className="text-xs sm:text-sm md:text-xl lg:text-3xl font-black text-center text-white break-words drop-shadow-md group-hover:text-indigo-300 transition-colors line-clamp-2 px-1">{aName}</h2>
              {aId && <span className="hidden md:inline text-[10px] font-semibold text-slate-500 group-hover:text-indigo-400 transition-colors">Ver perfil →</span>}
            </button>
          </div>

        </div>

      </div>

      {/* Cronología de Eventos – Timeline compacto */}
      {match.incidents && match.incidents.length > 0 && (
        <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          {/* Cabecera */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚡</span>
              <span className="text-[11px] font-black text-slate-200 uppercase tracking-wider">Cronología</span>
            </div>
            <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest">
              <span className="text-emerald-400 truncate max-w-[80px]" title={hName}>{hName}</span>
              <span className="text-indigo-400 truncate max-w-[80px]" title={aName}>{aName}</span>
            </div>
          </div>

          {/* Lista de eventos */}
          <div className="divide-y divide-white/[0.03] w-full pb-2">
            {match.incidents.map((inc: any, idx: number) => {
              let timeStr = inc.addedTime ? `${inc.time}+${inc.addedTime}'` : inc.time ? `${inc.time}'` : '';
              let icon = "•";
              let colorClass = "text-slate-400 bg-slate-700/50";
              let borderClass = "border-slate-600";
              let title = "";
              let detail = "";

              if (inc.incidentType === "goal") {
                icon = "⚽";
                colorClass = "text-emerald-300 bg-emerald-500/15";
                borderClass = "border-emerald-500/30";
                title = `Gol - ${inc.player?.shortName || inc.player?.name || ''}`;
                if (inc.assist1) detail = `Asist: ${inc.assist1.shortName || inc.assist1.name}`;
              } else if (inc.incidentType === "card") {
                if (inc.incidentClass === "yellow") {
                  icon = "🟨";
                  colorClass = "text-yellow-300 bg-yellow-500/10";
                  borderClass = "border-yellow-500/30";
                  title = `Amarilla - ${inc.player?.shortName || inc.player?.name || ''}`;
                } else {
                  icon = "🟥";
                  colorClass = "text-red-300 bg-red-500/10";
                  borderClass = "border-red-500/30";
                  title = `Roja - ${inc.player?.shortName || inc.player?.name || ''}`;
                }
                if (inc.reason) detail = inc.reason;
              } else if (inc.incidentType === "substitution") {
                icon = "⇄";
                colorClass = "text-blue-300 bg-blue-500/10";
                borderClass = "border-blue-500/30";
                title = `${inc.playerIn?.shortName || inc.playerIn?.name || ''}`;
                detail = `Sale: ${inc.playerOut?.shortName || inc.playerOut?.name || ''}`;
              } else if (inc.incidentType === "period") {
                const periodLabel = translatePeriod(inc.text || '');
                const hasScore = inc.homeScore !== undefined && inc.awayScore !== undefined;
                const scoreText = hasScore ? ` (${inc.homeScore} - ${inc.awayScore})` : '';
                return (
                   <div key={idx} className="flex items-center justify-center py-1 bg-white/[0.01]">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest border border-white/10 px-2.5 py-0.5 rounded-full bg-black/30">
                       {periodLabel || 'Período'}{scoreText}
                     </span>
                   </div>
                );
              } else if (inc.incidentType === "injuryTime") {
                return (
                  <div key={idx} className="flex items-center justify-center py-1">
                    <span className="text-[9px] font-semibold text-slate-500">⏱ +{inc.length}' tiempo añadido</span>
                  </div>
                );
              } else if (inc.incidentType === "varDecision") {
                icon = "📺";
                colorClass = "text-purple-300 bg-purple-500/10";
                borderClass = "border-purple-500/30";
                title = "Revisión VAR";
                if (inc.incidentClass === "penaltyAwarded") title += " – Penal";
                else if (inc.incidentClass === "goalDisallowed") title += " – Gol anulado";
                if (inc.player?.shortName) detail = inc.player.shortName;
              } else if (inc.incidentType === "penaltyShootout") {
                if (inc.incidentClass === "scored") {
                  icon = "⚽";
                  colorClass = "text-emerald-300 bg-emerald-500/15";
                  borderClass = "border-emerald-500/30";
                  title = `Anotado - ${inc.player?.shortName || inc.player?.name || ''}`;
                } else {
                  icon = "❌";
                  colorClass = "text-red-300 bg-red-500/10";
                  borderClass = "border-red-500/30";
                  title = `Fallado - ${inc.player?.shortName || inc.player?.name || ''}`;
                }
                if (inc.homeScore !== undefined && inc.awayScore !== undefined) {
                  timeStr = `(${inc.homeScore}-${inc.awayScore})`;
                }
                if (inc.description) {
                  const d = inc.description.toLowerCase();
                  if (d.includes('save')) detail = 'Atajado';
                  else if (d.includes('woodwork') || d.includes('post')) detail = 'Al palo';
                  else if (d.includes('miss')) detail = 'Afuera';
                  else detail = inc.description;
                }
              } else {
                return null;
              }

              const isHome = inc.isHome === true;
              const isAway = inc.isHome === false;

              return (
                <div key={idx} className="grid grid-cols-[1fr_40px_1fr] items-center px-1.5 py-1 hover:bg-white/[0.02] transition-colors group">
                  {/* IZQUIERDA (Local) */}
                  {isHome ? (
                    <div className="flex items-center justify-end gap-1.5 md:gap-2 pr-1.5 md:pr-2 min-w-0">
                      <div className="flex flex-col items-end text-right min-w-0">
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors leading-tight truncate max-w-[95px] xs:max-w-[140px] sm:max-w-xs">{title}</span>
                        {detail && <span className="text-[8px] sm:text-[10px] text-slate-500 leading-tight truncate max-w-[95px] xs:max-w-[140px] sm:max-w-xs">{detail}</span>}
                      </div>
                      <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full border ${borderClass} ${colorClass} flex items-center justify-center text-[10px] md:text-xs shrink-0`}>
                        {icon}
                      </div>
                    </div>
                  ) : <div />}

                  {/* CENTRO: tiempo */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-10">
                    <span className={`text-[11px] md:text-sm font-black ${isHome ? 'text-emerald-400' : isAway ? 'text-indigo-400' : 'text-slate-400'}`}>{timeStr}</span>
                  </div>

                  {/* DERECHA (Visitante) */}
                  {isAway ? (
                    <div className="flex items-center justify-start gap-1.5 md:gap-2 pl-1.5 md:pl-2 min-w-0">
                      <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full border ${borderClass} ${colorClass} flex items-center justify-center text-[10px] md:text-xs shrink-0`}>
                        {icon}
                      </div>
                      <div className="flex flex-col items-start text-left min-w-0">
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors leading-tight truncate max-w-[95px] xs:max-w-[140px] sm:max-w-xs">{title}</span>
                        {detail && <span className="text-[8px] sm:text-[10px] text-slate-500 leading-tight truncate max-w-[95px] xs:max-w-[140px] sm:max-w-xs">{detail}</span>}
                      </div>
                    </div>
                  ) : <div />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estadísticas (Movido debajo de la Cronología de Eventos) */}
      {match.live_statistics && match.live_statistics.length > 0 && (
        <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col gap-4 md:gap-6 shadow-lg h-fit">
          <div className="flex flex-row items-center justify-between gap-2 pb-2 md:pb-3 border-b border-white/5">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 text-[10px] md:text-xs">📊</span>
              <h3 className="text-xs md:text-sm font-bold text-white">Estadísticas</h3>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-bold uppercase tracking-widest bg-black/30 px-2 py-0.5 md:px-3 md:py-1 rounded-lg border border-white/5">
              <span className="text-emerald-400 truncate max-w-[70px] md:max-w-[80px]" title={hName}>{hName}</span>
              <span className="text-slate-600 font-sans select-none">-</span>
              <span className="text-indigo-400 truncate max-w-[70px] md:max-w-[80px]" title={aName}>{aName}</span>
            </div>
          </div>

          {/* Iteramos sobre los grupos de estadísticas */}
          <div className="flex flex-col gap-4 md:gap-6">
            {match.live_statistics.map((group: any, gIdx: number) => (
              <div key={gIdx} className="flex flex-col gap-2 md:gap-4">
                <h4 className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest pl-1.5 md:pl-2 border-l-2 border-slate-600">
                  {translateGroup(group.groupName)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 md:gap-y-3">
                  {group.statisticsItems.map((stat: any, idx: number) => {
                    const homeVal = parseStatValue(stat.home);
                    const awayVal = parseStatValue(stat.away);
                    const total = homeVal + awayVal || 1;
                    const hPct = (homeVal / total) * 100;
                    const aPct = (awayVal / total) * 100;

                    const isHomeWinner = homeVal > awayVal;
                    const isAwayWinner = awayVal > homeVal;

                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-1">
                          <span className={`text-[10px] md:text-xs ${isHomeWinner ? 'text-emerald-400 font-black' : 'text-slate-300 font-semibold'}`}>{stat.home}</span>
                          <span className="text-slate-400 text-[8px] md:text-[9px] font-bold tracking-wider uppercase">{translateStat(stat.name)}</span>
                          <span className={`text-[10px] md:text-xs ${isAwayWinner ? 'text-indigo-400 font-black' : 'text-slate-300 font-semibold'}`}>{stat.away}</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 w-full h-1 md:h-1.5 mt-0.5 opacity-90">
                          {/* Barra local: crece hacia la izquierda */}
                          <div className="flex-1 h-full bg-white/[0.03] rounded-full overflow-hidden flex justify-end border border-white/5">
                            <div
                              className="h-full bg-emerald-500/90 shadow-[0_0_6px_rgba(16,185,129,0.4)] rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${hPct}%` }}
                            />
                          </div>
                          {/* Barra visitante: crece hacia la derecha */}
                          <div className="flex-1 h-full bg-white/[0.03] rounded-full overflow-hidden flex justify-start border border-white/5">
                            <div
                              className="h-full bg-indigo-500/90 shadow-[0_0_6px_rgba(99,102,241,0.4)] rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${aPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Section: Detalles, Alineaciones y Pronósticos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 md:gap-4">

        {/* COLUMNA IZQUIERDA: Alineaciones, Posiciones e Historial */}
        <div className="xl:col-span-1 flex flex-col gap-3 md:gap-4">

          {/* Detalles (solo antes de empezar el partido) */}
          {!hasStarted && (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col gap-3 md:gap-4 relative overflow-hidden">
              <h3 className="text-xs md:text-sm font-bold text-slate-200">Detalles</h3>
              <div className="flex flex-col gap-2 z-10">
                {dateStr && (
                  <div className="flex items-center gap-2 md:gap-3 bg-black/20 p-2 md:p-2.5 rounded-xl border border-white/5">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Fecha Programada</span>
                      <span className="text-[10px] md:text-xs text-slate-200 font-bold capitalize">{dateStr}</span>
                    </div>
                  </div>
                )}

                {timeStr && (
                  <div className="flex items-center gap-2 md:gap-3 bg-black/20 p-2 md:p-2.5 rounded-xl border border-white/5">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Hora (Local)</span>
                      <span className="text-[10px] md:text-xs text-slate-200 font-bold">{timeStr} HS</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alineaciones */}
          {match.lineups && (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col gap-3 md:gap-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 text-[10px] md:text-xs">📋</span>
                <h3 className="text-xs md:text-sm font-bold text-slate-200">Alineaciones Iniciales</h3>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 pb-2 border-b border-white/5">
                  <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">{match.lineups.home?.formation || 'Local'}</span>
                  <span className="text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded border border-indigo-400/20">{match.lineups.away?.formation || 'Visitante'}</span>
                </div>

                <div className="flex w-full gap-2">
                  {/* LOCAL */}
                  <div className="flex-1 flex flex-col gap-2 pr-1 min-w-0">
                    {(match.lineups.home?.players || []).filter((p: any) => !p.substitute).map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 group min-w-0">
                        <span className="w-4 h-4 md:w-5 md:h-5 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[8px] md:text-[9px] font-bold border border-emerald-500/20 shadow-sm shrink-0">
                          {p.jerseyNumber}
                        </span>
                        <div className="flex flex-col truncate border-b border-transparent group-hover:border-emerald-500/30 transition-all overflow-hidden w-full">
                          <span className="text-slate-300 text-[10px] md:text-[11px] font-semibold truncate group-hover:text-emerald-300 transition-colors w-full">{p.player?.shortName || p.player?.name}</span>
                          <span className="text-slate-600 text-[7px] md:text-[8px] uppercase font-bold">{p.position}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Divisor */}
                  <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

                  {/* VISITANTE */}
                  <div className="flex-1 flex flex-col gap-2 pl-1 min-w-0">
                    {(match.lineups.away?.players || []).filter((p: any) => !p.substitute).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-end gap-2 group text-right min-w-0">
                        <div className="flex flex-col truncate items-end border-b border-transparent group-hover:border-indigo-500/30 transition-all overflow-hidden w-full">
                          <span className="text-slate-300 text-[10px] md:text-[11px] font-semibold truncate group-hover:text-indigo-300 transition-colors w-full">{p.player?.shortName || p.player?.name}</span>
                          <span className="text-slate-600 text-[7px] md:text-[8px] uppercase font-bold">{p.position}</span>
                        </div>
                        <span className="w-4 h-4 md:w-5 md:h-5 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[8px] md:text-[9px] font-bold border border-indigo-500/20 shadow-sm shrink-0">
                          {p.jerseyNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posiciones en la tabla */}
          {match.posiciones && (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 text-[10px] md:text-xs">🏆</span>
                <h3 className="text-xs md:text-sm font-bold text-slate-200">Posiciones</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* LOCAL */}
                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                  <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1 truncate max-w-full">{hName}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg md:text-2xl font-black text-emerald-400">#{match.posiciones.home?.posicion || match.posiciones.home?.position || '-'}</span>
                    <span className="text-[9px] text-slate-500 font-bold">Pos</span>
                  </div>
                  <span className="text-[10px] text-slate-300 font-semibold mt-0.5">{match.posiciones.home?.puntos || match.posiciones.home?.points || '0'} pts</span>
                </div>
                {/* VISITANTE */}
                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                  <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1 truncate max-w-full">{aName}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg md:text-2xl font-black text-indigo-400">#{match.posiciones.away?.posicion || match.posiciones.away?.position || '-'}</span>
                    <span className="text-[9px] text-slate-500 font-bold">Pos</span>
                  </div>
                  <span className="text-[10px] text-slate-300 font-semibold mt-0.5">{match.posiciones.away?.puntos || match.posiciones.away?.points || '0'} pts</span>
                </div>
              </div>
            </div>
          )}

          {/* Historial / Enfrentamientos Previos */}
          {match.historial && (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 text-[10px] md:text-xs">⚔️</span>
                <h3 className="text-xs md:text-sm font-bold text-slate-200">Historial Reciente</h3>
              </div>

              {typeof match.historial === 'string' ? (
                <p className="text-[10px] md:text-xs text-slate-300 bg-black/20 p-2 rounded-xl border border-white/5 leading-relaxed">{match.historial}</p>
              ) : (
                <div className="flex flex-col gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold text-slate-400">
                    <span>Jugaron {match.historial.jugaron || match.historial.total || 0} partidos</span>
                    {match.historial.diferencia && (
                      <span className="text-amber-400 font-black uppercase tracking-wider">{match.historial.diferencia}</span>
                    )}
                  </div>

                  {/* Barra de distribución */}
                  {(() => {
                    const hWins = Number(match.historial.ganadosHome || match.historial.homeWins || 0);
                    const aWins = Number(match.historial.ganadosAway || match.historial.awayWins || 0);
                    const draws = Number(match.historial.empataron || match.historial.draws || 0);
                    const total = hWins + aWins + draws || 1;

                    const hPct = (hWins / total) * 100;
                    const dPct = (draws / total) * 100;
                    const aPct = (aWins / total) * 100;

                    return (
                      <div className="flex flex-col gap-2">
                        <div className="w-full h-2 rounded-full overflow-hidden flex bg-white/5">
                          <div className="h-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]" style={{ width: `${hPct}%` }} title={`Ganó ${hName}`} />
                          <div className="h-full bg-slate-600" style={{ width: `${dPct}%` }} title="Empates" />
                          <div className="h-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.3)]" style={{ width: `${aPct}%` }} title={`Ganó ${aName}`} />
                        </div>
                        <div className="flex justify-between text-[9px] md:text-[10px] font-bold">
                          <span className="text-emerald-400">{hWins} {hWins === 1 ? 'victoria' : 'victorias'}</span>
                          <span className="text-slate-400">{draws} Empate{draws !== 1 ? 's' : ''}</span>
                          <span className="text-indigo-400">{aWins} {aWins === 1 ? 'victoria' : 'victorias'}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

        </div>

        {/* COLUMNA DERECHA: Pronósticos */}
        <div className="xl:col-span-2 flex flex-col gap-3 md:gap-4">
          {(() => {
            const nowSec = Math.floor(Date.now() / 1000);
            const start = match.startTimestamp ?? 0;
            const isFinished = typeof match.status === 'object'
              ? match.status?.type === 'finished'
              : match.status === 'finished';
            const isLiveMatch = isLive;
            const isUnderOneHour = start > 0 && (nowSec >= start - 3600);
            const predMode: 'hidden' | 'grey' | 'scored' =
              isFinished ? 'scored' :
                (isLiveMatch || isUnderOneHour) ? 'grey' :
                  'hidden';

            if (matchPredictions.length === 0) return null;

            const getColor = (p: any) => {
              if (predMode !== 'scored') return '';
              const rH = hScore !== '-' ? Number(hScore) : null;
              const rA = aScore !== '-' ? Number(aScore) : null;
              if (rH === null || rA === null) return 'grey';
              const pH = Number(p.homeScore ?? p.home_score);
              const pA = Number(p.awayScore ?? p.away_score);
              if (pH === rH && pA === rA) return 'exact';
              const rTrend = rH > rA ? 'H' : rH < rA ? 'A' : 'D';
              const pTrend = pH > pA ? 'H' : pH < pA ? 'A' : 'D';
              if (rTrend === pTrend) return 'trend';
              return 'wrong';
            };

            const colorClasses: Record<string, string> = {
              exact: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
              trend: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
              wrong: 'border-red-500/40 bg-red-500/10 text-red-400',
              grey: 'border-white/10 bg-white/5 text-slate-300',
              '': 'border-white/10 bg-white/5 text-slate-300',
            };

            const visiblePredictions = showAllPredictions
              ? matchPredictions
              : matchPredictions.slice(0, 3);

            return (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-lg h-fit">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                  <span className="text-sm">🎯</span>
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Pronósticos</span>
                  <span className="ml-auto text-[10px] font-semibold text-slate-500">{matchPredictions.length} participante{matchPredictions.length !== 1 ? 's' : ''}</span>
                </div>

                {predMode === 'hidden' && (
                  <p className="text-center text-slate-500 text-[10px] py-2 font-medium">
                    🔒 Los scores se revelan 1 hora antes del partido
                  </p>
                )}

                <div className="divide-y divide-white/[0.03]">
                  {visiblePredictions.map((p: any, i: number) => {
                    const color = getColor(p);
                    const scoreStr = `${p.homeScore ?? p.home_score ?? '?'} - ${p.awayScore ?? p.away_score ?? '?'}`;
                    const userName = p.userName || p.name || `Usuario ${i + 1}`;
                    const initial = userName.charAt(0).toUpperCase();
                    const uId = p.userId || p.user_id || p.uid;

                    return (
                      <div key={p._id || i} className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2">
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-black text-[9px] md:text-[10px] text-white shrink-0 relative overflow-hidden">
                          <span>{initial}</span>
                          {uId && (
                            <img
                              src={`https://apivacas.jariel.com.ar/users/${uId}.webp`}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              alt={userName}
                            />
                          )}
                        </div>
                        <span className="flex-1 text-[11px] md:text-xs font-semibold text-slate-300 truncate">{userName}</span>
                        {predMode === 'hidden' ? (
                          <div className="px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md border border-white/10 bg-white/5 text-slate-500 text-[10px] md:text-xs font-black select-none" style={{ filter: 'blur(5px)' }}>
                            {scoreStr}
                          </div>
                        ) : (
                          <div className={`px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md border text-[10px] md:text-xs font-black ${colorClasses[color] || colorClasses.grey}`}>
                            {scoreStr}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {matchPredictions.length > 3 && (
                  <button
                    onClick={() => setShowAllPredictions(!showAllPredictions)}
                    className="w-full text-center py-2 text-[10px] md:text-xs font-bold text-slate-400 hover:text-white hover:bg-white/[0.02] border-t border-white/5 transition-all cursor-pointer"
                  >
                    {showAllPredictions ? 'Ver menos ↑' : `Ver más (${matchPredictions.length - 3} más) ↓`}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

