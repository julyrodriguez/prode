import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TeamInMatch {
  id?: any;
  name?: string;
  score?: number;
  logoUrl?: string;
}

interface Match {
  id: any;
  homeTeam?: TeamInMatch;
  home_team?: TeamInMatch;
  awayTeam?: TeamInMatch;
  away_team?: TeamInMatch;
  homeScore?: { current?: number };
  awayScore?: { current?: number };
  startTimestamp?: number;
  status?: any;
}

interface TeamHoverCardProps {
  teamId: any;
  teamName: string;
  children: React.ReactNode;
  className?: string;
}

export default function TeamHoverCard({ teamId, teamName, children, className }: TeamHoverCardProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const timeoutRef = useRef<any>(null);
  const hoverAreaRef = useRef<HTMLDivElement>(null);

  const fetchMatches = async () => {
    if (matches.length > 0) return; // Ya cargado
    try {
      setLoading(true);
      const res = await fetch(`https://apivacas.jariel.com.ar/api/teams/${teamId}/all-matches?limit=25`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (e) {
      console.error("Error fetching hover matches:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const rect = e.currentTarget.getBoundingClientRect();
    // Posicionar debajo del elemento, centrado horizontalmente
    setCoords({
      x: rect.left + rect.width / 2,
      y: rect.bottom + window.scrollY
    });

    timeoutRef.current = setTimeout(() => {
      setVisible(true);
      fetchMatches();
    }, 350); // Delay de 350ms para evitar llamadas spam en movimiento rápido del mouse
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 200); // Pequeña gracia antes de ocultar
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Separar partidos jugados vs próximos
  const playedMatches: Match[] = [];
  const upcomingMatches: Match[] = [];

  matches.forEach(m => {
    const startMs = (m.startTimestamp || 0) * 1000;
    const isPast = startMs > 0 && startMs < Date.now();
    let hasStarted = isPast;

    if (m.status === 'notstarted') hasStarted = false;
    else if (typeof m.status === 'object' && m.status !== null) {
      if (m.status.type === 'inprogress' || m.status.type === 'finished') hasStarted = true;
      else if (m.status.type === 'canceled') hasStarted = false;
    }

    if (hasStarted) {
      playedMatches.push(m);
    } else {
      upcomingMatches.push(m);
    }
  });

  // Ordenar: jugados desc (más reciente primero), próximos asc (más cercano en tiempo primero)
  playedMatches.sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0));
  upcomingMatches.sort((a, b) => (a.startTimestamp || 0) - (b.startTimestamp || 0));

  const lastPlayed = playedMatches.slice(0, 3);
  const nextUpcoming = upcomingMatches.slice(0, 3);

  const getScore = (m: Match, team: 'home' | 'away') => {
    const scoreObj = team === 'home' ? m.homeScore : m.awayScore;
    const teamObj = team === 'home' ? m.homeTeam : m.awayTeam;
    const altTeamObj = team === 'home' ? m.home_team : m.away_team;
    if (scoreObj?.current !== undefined) return scoreObj.current;
    if (teamObj?.score !== undefined) return teamObj.score;
    if (altTeamObj?.score !== undefined) return altTeamObj.score;
    return '-';
  };

  const getTeamNameStr = (m: Match, team: 'home' | 'away') => {
    const teamObj = team === 'home' ? m.homeTeam : m.awayTeam;
    const altTeamObj = team === 'home' ? m.home_team : m.away_team;
    return teamObj?.name || altTeamObj?.name || (team === 'home' ? 'Local' : 'Visitante');
  };

  const getResultBadge = (m: Match) => {
    const hId = m.homeTeam?.id || m.home_team?.id;
    const isHome = Number(hId) === Number(teamId);
    const hScore = getScore(m, 'home');
    const aScore = getScore(m, 'away');

    if (hScore === '-' || aScore === '-') return null;

    const weScored = isHome ? Number(hScore) : Number(aScore);
    const theyScored = isHome ? Number(aScore) : Number(hScore);

    if (weScored > theyScored) return <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 shrink-0 select-none">V</span>;
    if (weScored < theyScored) return <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/20 shrink-0 select-none">D</span>;
    return <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 shrink-0 select-none">E</span>;
  };

  const cardContent = visible && coords && (
    <div
      style={{
        position: 'fixed',
        top: Math.min(window.innerHeight - 340, coords.y + 8),
        left: Math.min(window.innerWidth - 300, Math.max(16, coords.x - 130)),
        zIndex: 99999,
      }}
      className="w-64 bg-[#0b1015]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 select-none animate-modal-scale-in"
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setVisible(true);
      }}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
        <div className="w-6 h-6 flex-shrink-0">
          <img
            src={`https://apivacas.jariel.com.ar/escudos/${teamId}.png`}
            alt={teamName}
            className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/48/000000/football2.png' }}
          />
        </div>
        <span className="font-extrabold text-white text-sm truncate">{teamName}</span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <div className="animate-spin w-5 h-5 rounded-full border-t border-r border-emerald-400 border-b border-transparent" />
          <span className="text-[10px] text-slate-400">Cargando partidos...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Jugados */}
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Últimos partidos</div>
            {lastPlayed.length === 0 ? (
              <div className="text-[10px] text-slate-500 italic py-1">No hay partidos jugados.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {lastPlayed.map((m, idx) => {
                  const dateStr = m.startTimestamp ? new Date(m.startTimestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
                  return (
                    <div key={m.id || idx} className="flex items-center justify-between gap-1 py-1 px-1.5 bg-white/[0.02] border border-white/5 rounded-lg">
                      <span className="text-[9px] text-slate-400 shrink-0 font-medium">{dateStr}</span>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
                        <span className="truncate max-w-[50px] font-bold text-right leading-none text-slate-300">{getTeamNameStr(m, 'home')}</span>
                        <span className="text-[10px] px-1 bg-black/40 border border-white/5 rounded text-white font-black whitespace-nowrap">
                          {getScore(m, 'home')} - {getScore(m, 'away')}
                        </span>
                        <span className="truncate max-w-[50px] font-bold text-left leading-none text-slate-300">{getTeamNameStr(m, 'away')}</span>
                      </div>
                      {getResultBadge(m)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-white/5" />

          {/* Próximos */}
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Próximos partidos</div>
            {nextUpcoming.length === 0 ? (
              <div className="text-[10px] text-slate-500 italic py-1">No hay partidos programados.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {nextUpcoming.map((m, idx) => {
                  const dateStr = m.startTimestamp ? new Date(m.startTimestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
                  const hourStr = m.startTimestamp ? new Date(m.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div key={m.id || idx} className="flex items-center justify-between gap-1 py-1 px-1.5 bg-white/[0.02] border border-white/5 rounded-lg">
                      <div className="flex flex-col shrink-0">
                        <span className="text-[9px] text-emerald-400 font-extrabold uppercase leading-none">{dateStr}</span>
                        <span className="text-[8px] text-slate-500 font-medium leading-none mt-0.5">{hourStr}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
                        <span className="truncate max-w-[55px] font-bold text-right leading-none text-slate-300">{getTeamNameStr(m, 'home')}</span>
                        <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap">vs</span>
                        <span className="truncate max-w-[55px] font-bold text-left leading-none text-slate-300">{getTeamNameStr(m, 'away')}</span>
                      </div>
                      <div className="w-4 h-4 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={hoverAreaRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className || "inline-block"}
    >
      {children}
      {visible && coords && createPortal(cardContent, document.body)}
    </div>
  );
}
