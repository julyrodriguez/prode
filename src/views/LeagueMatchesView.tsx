import { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { LEAGUES } from '../components/layout/AppLayout';
import TeamForm from '../components/TeamForm';
import CopaBracket from '../components/CopaBracket';
import TeamHoverCard from '../components/TeamHoverCard';
import TeamRedCards from '../components/TeamRedCards';
import MatchGoalsCollapsible from '../components/MatchGoalsCollapsible';
import MatchSkeleton from '../components/MatchSkeleton';

const translateTeamToSpanish = (name: string): string => {
  if (!name) return '';
  const translations: Record<string, string> = {
    'Brazil': 'Brasil',
    'France': 'Francia',
    'Germany': 'Alemania',
    'Spain': 'España',
    'England': 'Inglaterra',
    'Belgium': 'Bélgica',
    'Croatia': 'Croacia',
    'Netherlands': 'Países Bajos',
    'Holland': 'Holanda',
    'Japan': 'Japón',
    'Saudi Arabia': 'Arabia Saudita',
    'South Korea': 'Corea del Sur',
    'Switzerland': 'Suiza',
    'Denmark': 'Dinamarca',
    'Poland': 'Polonia',
    'Mexico': 'México',
    'Morocco': 'Marruecos',
    'United States': 'Estados Unidos',
    'USA': 'Estados Unidos',
    'Cameroon': 'Camerún',
    'Canada': 'Canadá',
    'Ecuador': 'Ecuador',
    'Senegal': 'Senegal',
    'Tunisia': 'Túnez',
    'Wales': 'Gales',
    'Qatar': 'Qatar',
    'Serbia': 'Serbia',
    'Ghana': 'Ghana',
    'Uruguay': 'Uruguay',
    'Argentina': 'Argentina',
    'Portugal': 'Portugal',
    'Italy': 'Italia',
    'Colombia': 'Colombia',
    'Chile': 'Chile',
    'Peru': 'Perú',
    'Paraguay': 'Paraguay',
    'Venezuela': 'Venezuela',
    'Bolivia': 'Bolivia',
    'Algeria': 'Argelia',
    'Austria': 'Austria',
    'Egypt': 'Egipto',
    'Sweden': 'Suecia',
    'Norway': 'Noruega',
    'Scotland': 'Escocia',
    'Ireland': 'Irlanda',
    'Greece': 'Grecia',
    'Turkey': 'Turquía',
    'Ukraine': 'Ucrania',
    'Czech Republic': 'República Checa',
    'Czechia': 'República Checa',
    'Romania': 'Rumania',
    'Russia': 'Rusia',
    'New Zealand': 'Nueva Zelanda',
    'South Africa': 'Sudáfrica',
    'Panama': 'Panamá',
    'Costa Rica': 'Costa Rica',
    'Honduras': 'Honduras',
    'El Salvador': 'El Salvador',
    'Jamaica': 'Jamaica',
    'Hungary': 'Hungría'
  };
  const trimmed = name.trim();
  return translations[trimmed] || translations[trimmed.replace(/\s+/g, ' ')] || trimmed;
};

type LeagueType = typeof LEAGUES[number];

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
  const [score, setScore] = useState<{h: number, a: number} | null>(null);

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
      .catch(() => {});
  }, [matchId]);

  if (!score) return <span className="text-emerald-400 font-bold text-[8px] md:text-[9px] uppercase tracking-widest leading-none mt-0.5">A PENALES</span>;

  return (
    <span className="text-emerald-400 font-bold text-[8px] md:text-[9px] uppercase tracking-widest leading-none mt-0.5">
      A PENALES ({score.h} - {score.a})
    </span>
  );
}


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
  if (statusDesc?.includes('1st') || statusDesc?.includes('first')) return 'PRIMER TIEMPO';
  if (statusDesc?.includes('2nd') || statusDesc?.includes('second')) return 'SEGUNDO TIEMPO';
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

interface MatchRowProps {
  match: Match;
  isPredictionMode: boolean;
  prediction: { home: string; away: string } | undefined;
  user: any;
  viewMode: string;
  onPredictionChange: (matchId: number, side: 'home' | 'away', value: string) => void;
  onStepScore: (matchId: number, side: 'home' | 'away', delta: number) => void;
}

const MatchRow = memo(({
  match,
  isPredictionMode,
  prediction,
  user,
  viewMode,
  onPredictionChange,
  onStepScore
}: MatchRowProps) => {
  const navigate = useNavigate();

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
  const hasPrediction = !!(prediction?.home !== undefined && prediction?.away !== undefined);
  const liveTime = status.isLive ? getMatchTime(match) : null;

  return (
    <div
      className={`group grid grid-cols-[60px_1fr] md:grid-cols-[80px_1fr] items-stretch border-b border-white/5 last:border-0 relative cursor-pointer transition-colors ${status.isLive
        ? 'bg-red-500/[0.02] hover:bg-red-500/[0.05]'
        : 'hover:bg-white/[0.03]'
        }`}
      onClick={() => navigate(`/match/${match.id}`)}
    >
      {/* Columna Izquierda: Logo Torneo y Tiempo */}
      <div className="row-span-2 flex flex-col items-center justify-center border-r border-white/5 py-3 px-1">
        <div className="w-5 h-5 md:w-6 md:h-6 mb-1.5 opacity-80 flex items-center justify-center overflow-hidden shrink-0">
          <img
            src={match.tournament?.category?.flag === 'world' ? 'https://img.icons8.com/color/48/000000/football2.png' : match.tournament?.category?.flag ? `https://img.icons8.com/color/48/000000/${match.tournament.category.flag}.png` : 'https://img.icons8.com/color/48/000000/football2.png'}
            alt="torneo"
            className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/48/000000/football2.png' }}
          />
        </div>
        {viewMode === 'week' && match.startTimestamp && (
          <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider text-center leading-none mb-1">
            {new Date(match.startTimestamp * 1000).toLocaleDateString('es-ES', {
              weekday: 'short', day: '2-digit'
            }).replace('.', '')}
          </span>
        )}
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

        {/* ── Fila de equipos + centro (scores/VS) ── */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 md:gap-4">

          {/* HOME TEAM */}
          <TeamHoverCard teamId={hId} teamName={hName} className="flex items-center justify-end gap-2 md:gap-3 text-right bg-transparent border-0 min-w-0">
            <div
              className="flex items-center justify-end gap-2 md:gap-3 text-right min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                if (hId) navigate(`/team/${hId}`);
              }}
            >
              <div className="flex flex-col items-end justify-center min-w-0">
                <div className="relative inline-block">
                  <TeamRedCards matchId={match.id} hasStarted={status.hasStarted} isLive={status.isLive} isHome={true} />
                  <span className="font-bold text-slate-100 text-xs sm:text-sm md:text-[15px] leading-tight line-clamp-2 hover:text-emerald-400 transition-colors">{hName}</span>
                </div>
                <div className="mt-1">
                  <TeamForm teamId={hId} align="left" />
                </div>
              </div>
              <div className="shrink-0 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
                {hLogo ? <img src={hLogo} alt={hName} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-white/5 rounded-full" />}
              </div>
            </div>
          </TeamHoverCard>

          {/* CENTER: score / VS separator / dashes */}
          <div className="flex flex-col items-center justify-center shrink-0">
            {isPredictionMode && !status.hasStarted && !isLocked && !canPredict && (
              <div className="text-amber-500/80 text-[9px] uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                🔒
              </div>
            )}

            {canPredict ? (
              // En modo predicción el centro queda limpio — inputs van abajo
              <div className="flex items-center gap-1 px-2 py-1">
                <span className="text-lg font-black text-slate-700">–</span>
              </div>
            ) : status.hasStarted && (hScore !== null || aScore !== null) ? (
              // Scores live/finished
              <div className="flex flex-col items-center gap-0.5">
                <div className={`flex items-center gap-2 md:gap-3 px-2 py-0.5 rounded ${status.isLive ? 'bg-red-500/[0.08] border border-red-500/20' : 'bg-black/30 border border-white/5'}`}>
                  <span className={`text-base md:text-lg font-black ${status.isLive ? 'text-red-500' : 'text-slate-100'}`}>{hScore ?? 0}</span>
                  <span className={`text-xs md:text-sm ${status.isLive ? 'text-red-500/50' : 'text-slate-500'}`}>-</span>
                  <span className={`text-base md:text-lg font-black ${status.isLive ? 'text-red-500' : 'text-slate-100'}`}>{aScore ?? 0}</span>
                </div>
                {status.isPenalties && (
                  <PenaltyScoreDisplay matchId={match.id} />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3 px-2 py-0.5">
                <span className="text-base md:text-lg font-black text-slate-500">-</span>
                <span className="text-xs md:text-sm text-slate-600">-</span>
                <span className="text-base md:text-lg font-black text-slate-500">-</span>
              </div>
            )}

            {/* Mi prode (si el partido empezó) */}
            {isPredictionMode && status.hasStarted && hasPrediction && (
              <div className="mt-1 flex items-center justify-center gap-1.5 px-2 py-[2px] bg-black/40 border border-white/5 rounded-full">
                <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-slate-500">Mi prode</span>
                <span className="text-[10px] md:text-[11px] font-black text-emerald-400/90 tracking-widest">
                  {prediction?.home}-{prediction?.away}
                </span>
              </div>
            )}
          </div>

          {/* AWAY TEAM */}
          <TeamHoverCard teamId={aId} teamName={aName} className="flex items-center justify-start gap-2 md:gap-3 text-left bg-transparent border-0 min-w-0">
            <div
              className="flex items-center justify-start gap-2 md:gap-3 text-left min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                if (aId) navigate(`/team/${aId}`);
              }}
            >
              <div className="shrink-0 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
                {aLogo ? <img src={aLogo} alt={aName} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-white/5 rounded-full" />}
              </div>
              <div className="flex flex-col items-start justify-center min-w-0">
                <div className="relative inline-block">
                  <TeamRedCards matchId={match.id} hasStarted={status.hasStarted} isLive={status.isLive} isHome={false} />
                  <span className="font-bold text-slate-100 text-xs sm:text-sm md:text-[15px] leading-tight line-clamp-2 hover:text-emerald-400 transition-colors">{aName}</span>
                </div>
                <div className="mt-1">
                  <TeamForm teamId={aId} align="right" />
                </div>
              </div>
            </div>
          </TeamHoverCard>
        </div>

        {/* ── Inputs de predicción: fila separada DEBAJO de los equipos ── */}
        {canPredict && (
          <div
            className="mt-2.5 pt-2.5 border-t border-emerald-500/10 flex items-center justify-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            {/* Nombre local */}
            <span className="text-[10px] text-slate-500 font-bold truncate max-w-[60px] text-right hidden sm:block">{hName}</span>

            {/* HOME STEPPER */}
            <div className="flex items-center bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden hover:border-emerald-500/40 transition-colors">
              <button onClick={e => { e.stopPropagation(); onStepScore(match.id, 'home', -1); }} className="w-8 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm font-black transition-colors select-none">−</button>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={prediction?.home ?? ''}
                onClick={e => e.stopPropagation()}
                placeholder="0"
                onChange={e => onPredictionChange(match.id, 'home', e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-8 h-9 bg-transparent text-center font-black text-base text-emerald-400 outline-none placeholder:text-slate-700 p-0 m-0"
              />
              <button onClick={e => { e.stopPropagation(); onStepScore(match.id, 'home', 1); }} className="w-8 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm font-black transition-colors select-none">+</button>
            </div>

            <span className="text-slate-600 font-black text-lg">—</span>

            {/* AWAY STEPPER */}
            <div className="flex items-center bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden hover:border-emerald-500/40 transition-colors">
              <button onClick={e => { e.stopPropagation(); onStepScore(match.id, 'away', -1); }} className="w-8 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm font-black transition-colors select-none">−</button>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={prediction?.away ?? ''}
                onClick={e => e.stopPropagation()}
                placeholder="0"
                onChange={e => onPredictionChange(match.id, 'away', e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-8 h-9 bg-transparent text-center font-black text-base text-emerald-400 outline-none placeholder:text-slate-700 p-0 m-0"
              />
              <button onClick={e => { e.stopPropagation(); onStepScore(match.id, 'away', 1); }} className="w-8 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm font-black transition-colors select-none">+</button>
            </div>

            {/* Nombre visitante */}
            <span className="text-[10px] text-slate-500 font-bold truncate max-w-[60px] hidden sm:block">{aName}</span>
          </div>
        )}
      </div>

      {/* Goles colapsables debajo de cada partido */}
      <div
        className="col-start-2"
        onClick={e => e.stopPropagation()}
      >
        <MatchGoalsCollapsible matchId={match.id} hasStarted={status.hasStarted} />
      </div>
    </div>
  );
});


// Prediction mode is the separate "predicciones" tab, passed via context if needed
// But here we just need to know if we're in prediction mode based on the URL tab
export default function LeagueMatchesView({ isPredictionMode = false }: { isPredictionMode?: boolean }) {
  const { activeLeague } = useOutletContext<{ activeLeague: LeagueType }>();
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
  const [localPredictions, setLocalPredictions] = useState<Record<number, { home: string; away: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Estados para predicción del podio del Mundial
  const [podiumChampion, setPodiumChampion] = useState('');
  const [podiumRunnerUp, setPodiumRunnerUp] = useState('');
  const [podiumThirdPlace, setPodiumThirdPlace] = useState('');
  const [worldCupTeams, setWorldCupTeams] = useState<string[]>([
    'Alemania', 'Arabia Saudita', 'Argelia', 'Argentina', 'Australia', 'Austria', 'Bélgica', 'Brasil', 
    'Canadá', 'Camerún', 'Chile', 'Colombia', 'Corea del Sur', 'Costa Rica', 'Croacia', 'Dinamarca', 
    'Ecuador', 'Egipto', 'Escocia', 'España', 'Estados Unidos', 'Francia', 'Gales', 'Ghana', 
    'Grecia', 'Holanda', 'Honduras', 'Hungría', 'Inglaterra', 'Irán', 'Irlanda', 'Islandia', 'Italia', 
    'Jamaica', 'Japón', 'Marruecos', 'México', 'Nigeria', 'Noruega', 'Nueva Zelanda', 'Países Bajos', 
    'Panamá', 'Paraguay', 'Perú', 'Polonia', 'Portugal', 'Qatar', 'República Checa', 'Rumania', 
    'Rusia', 'Senegal', 'Serbia', 'Suecia', 'Suiza', 'Túnez', 'Turquía', 'Ucrania', 'Uruguay', 'Venezuela'
  ].sort());
  const [isSavingPodium, setIsSavingPodium] = useState(false);
  const [podiumToast, setPodiumToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const deadlineDate = new Date('2026-06-12T00:00:00-03:00'); // Límite: 11/06 inclusive
  const isBeforeDeadline = Date.now() < deadlineDate.getTime();

  const tournamentId = activeLeague.tournamentId;
  const [prevTournamentId, setPrevTournamentId] = useState(tournamentId);

  // Reiniciamos la fecha a "hoy" si cambian la liga en el menú de navegación
  if (tournamentId !== prevTournamentId) {
    const d = new Date();
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setSearchDirection(1);
    setPrevTournamentId(tournamentId);
  }

  useEffect(() => {
    const fetchData = async (showLoading = false) => {
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
          if (tournamentId) {
            url.searchParams.append('tournamentId', String(tournamentId));
          }

          const response = await fetch(url.toString());
          if (!response.ok) throw new Error('No se pudieron obtener los partidos.');

          const data = await response.json();
          if (data && data.matches !== undefined) {
            events = data.matches;
            if (data.metadata?.jumpedToFuture && data.metadata?.newDate) {
              if (selectedDate !== data.metadata.newDate) {
                setJumpMsg(searchDirection === -1 ? "No había partidos, saltamos a la fecha anterior disponible." : "No había partidos, saltamos a la próxima fecha disponible.");
                setSelectedDate(data.metadata.newDate);
                setTimeout(() => setJumpMsg(null), 8000);
                return; // evitamos el seteo y dejamos que useEffect re-corra con la nueva fecha
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
            if (tournamentId) {
              url.searchParams.append('tournamentId', String(tournamentId));
            }
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
                // Filtrar partidos que no se jueguen en la fecha solicitada para evitar saltos/jumps de la API en la vista semanal
                if (m.startTimestamp) {
                  const matchDate = new Date(m.startTimestamp * 1000);
                  const matchDateStr = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}-${String(matchDate.getDate()).padStart(2, '0')}`;
                  if (matchDateStr !== dateStr) {
                    return; // Ignorar el partido ya que corresponde a otra fecha por un salto de la API
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
        setAllMatches(events);

        if (user) {
          try {
            const predRes = await fetch(`https://apivacas.jariel.com.ar/api/predictions/user/${user.uid}`);
            if (predRes.ok) {
              const pData = await predRes.json();
              const predMap: Record<number, { home: string; away: string }> = {};
              if (Array.isArray(pData)) {
                pData.forEach(p => {
                  const idDelPartido = Number(p.matchId || p.match_id);
                  const golesLocal = p.homeScore !== undefined ? p.homeScore : (p.home_score ?? '');
                  const golesVisita = p.awayScore !== undefined ? p.awayScore : (p.away_score ?? '');
                  predMap[idDelPartido] = { home: String(golesLocal), away: String(golesVisita) };
                });
              }
              // En el refresco automático (showLoading=false) NO sobreescribimos lo que
              // el usuario ya modificó localmente — solo rellenamos lo que no tiene.
              if (showLoading) {
                // Primera carga: tomamos todo el servidor
                setLocalPredictions(predMap);
              } else {
                // Refresco: local gana; actualizamos solo lo que no hay localmente
                setLocalPredictions(prev => {
                  const merged = { ...predMap };
                  Object.keys(prev).forEach(k => { merged[Number(k)] = prev[Number(k)]; });
                  return merged;
                });
              }
            }
          } catch (err) {
            console.error('Error al obtener predicciones', err);
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

    fetchData(true);
    const interval = setInterval(() => fetchData(false), 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [user, tournamentId, selectedDate, searchDirection, viewMode]);

  // Obtener lista completa de países participantes desde la tabla de posiciones (torneo 16)
  useEffect(() => {
    if (activeLeague.id !== 'mundial') return;
    
    let isMounted = true;
    const fetchTeams = async () => {
      try {
        const response = await fetch('https://apivacas.jariel.com.ar/api/standings/16');
        if (response.ok) {
          const json = await response.json();
          const dataObj = json.data || {};
          const teams: string[] = [];
          for (const group of Object.values(dataObj)) {
            if (Array.isArray(group)) {
              group.forEach((row: any) => {
                if (row && row.nombre) {
                  teams.push(translateTeamToSpanish(row.nombre));
                }
              });
            }
          }
          if (isMounted && teams.length > 0) {
            setWorldCupTeams(prev => {
              const combined = Array.from(new Set([...prev, ...teams]));
              return combined.sort();
            });
          }
        }
      } catch (err) {
        console.warn('Error fetching standings for World Cup teams', err);
      }
    };
    
    fetchTeams();
    return () => { isMounted = false; };
  }, [activeLeague.id]);

  // Cargar predicción de podio guardada de la API / LocalStorage
  useEffect(() => {
    if (!user || activeLeague.id !== 'mundial') return;
    
    const loadPodium = async () => {
      // 1. Intentar cargar desde localStorage primero para velocidad
      let cached = null;
      try {
        cached = localStorage.getItem(`podium_pred_${user.uid}`);
      } catch (e) {
        console.warn('localStorage is not available:', e);
      }
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.champion) setPodiumChampion(translateTeamToSpanish(parsed.champion));
          if (parsed.runnerUp) setPodiumRunnerUp(translateTeamToSpanish(parsed.runnerUp));
          if (parsed.thirdPlace) setPodiumThirdPlace(translateTeamToSpanish(parsed.thirdPlace));
        } catch (e) {}
      }
      
      // 2. Consultar la API
      try {
        let res = await fetch(`https://apivacas.jariel.com.ar/api/predictions/${user.uid}`);
        if (!res.ok) {
          res = await fetch(`https://apivacas.jariel.com.ar/api/mundial/predictions/${user.uid}`);
        }
        if (!res.ok) {
          res = await fetch(`https://apivacas.jariel.com.ar/api/mundial/predictions/user/${user.uid}`);
        }
        
        if (res.ok) {
          const data = await res.json();
          const pred = Array.isArray(data) ? data[0] : (data.data || data);
          if (pred && (pred.champion || pred.runnerUp || pred.thirdPlace)) {
            const c = translateTeamToSpanish(pred.champion || '');
            const r = translateTeamToSpanish(pred.runnerUp || '');
            const t = translateTeamToSpanish(pred.thirdPlace || '');
            setPodiumChampion(c);
            setPodiumRunnerUp(r);
            setPodiumThirdPlace(t);
            try {
              localStorage.setItem(`podium_pred_${user.uid}`, JSON.stringify({ champion: c, runnerUp: r, thirdPlace: t }));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Error retrieving saved podium from API', err);
      }
    };
    
    loadPodium();
  }, [user, activeLeague.id]);

  const handleSavePodium = async () => {
    if (!user) return;
    
    // Validaciones
    if (!podiumChampion || !podiumRunnerUp || !podiumThirdPlace) {
      setPodiumToast({ ok: false, msg: 'Por favor completa las tres predicciones (Campeón, Subcampeón y 3º puesto).' });
      setTimeout(() => setPodiumToast(null), 4000);
      return;
    }
    
    if (podiumChampion.trim() === podiumRunnerUp.trim() || podiumChampion.trim() === podiumThirdPlace.trim() || podiumRunnerUp.trim() === podiumThirdPlace.trim()) {
      setPodiumToast({ ok: false, msg: 'No puedes elegir el mismo país para más de una posición.' });
      setTimeout(() => setPodiumToast(null), 4000);
      return;
    }
    
    setIsSavingPodium(true);
    setPodiumToast(null);
    
    try {
      const response = await fetch('https://apivacas.jariel.com.ar/api/mundial/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userID: user.uid, // enviar ambos por robustez
          champion: podiumChampion.trim(),
          runnerUp: podiumRunnerUp.trim(),
          thirdPlace: podiumThirdPlace.trim()
        })
      });
      
      if (response.ok) {
        setPodiumToast({ ok: true, msg: '¡Tu predicción del podio ha sido guardada con éxito!' });
        try {
          localStorage.setItem(`podium_pred_${user.uid}`, JSON.stringify({
            champion: podiumChampion.trim(),
            runnerUp: podiumRunnerUp.trim(),
            thirdPlace: podiumThirdPlace.trim()
          }));
        } catch (e) {}
      } else {
        const data = await response.json().catch(() => ({}));
        setPodiumToast({ ok: false, msg: data.error || 'Error al guardar la predicción del podio.' });
      }
    } catch (e) {
      setPodiumToast({ ok: false, msg: 'Error de conexión con el servidor.' });
    } finally {
      setIsSavingPodium(false);
      setTimeout(() => setPodiumToast(null), 4500);
    }
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

  const dailyMatches = allMatches; // El backend ya filtra por fecha ahora

  const handleSavePredictions = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveToast(null);
    try {
      const now = Math.floor(Date.now() / 1000);
      const toSend = allMatches
        .filter(m => {
          const pred = localPredictions[m.id];
          if (!pred || pred.home === '' || pred.away === '') return false;
          if (!m.startTimestamp || m.startTimestamp <= now) return false;
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
        setSaveToast({ ok: true, msg: `¡${total} pronóstico${total !== 1 ? 's' : ''} guardado${total !== 1 ? 's' : ''}!` });
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

  const stepScore = useCallback((matchId: number, side: 'home' | 'away', delta: number) => {
    setLocalPredictions(prev => {
      const cur = prev[matchId] || { home: '0', away: '0' };
      const curVal = parseInt(cur[side] || '0', 10);
      const next = Math.max(0, Math.min(20, curVal + delta));
      return { ...prev, [matchId]: { ...cur, [side]: String(next) } };
    });
  }, []);

  const handlePredictionChange = useCallback((matchId: number, side: 'home' | 'away', value: string) => {
    setLocalPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId] ?? { home: '', away: '' },
        [side]: value
      }
    }));
  }, []);

  // Se eliminó el early return de loading para dejar el título fijo

  if (error) {
    return (
      <div className="w-full bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 flex justify-center items-center">
        <span className="text-red-400 font-bold text-lg">{error}</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">

      {/* Prediction mode banner */}
      {isPredictionMode && (
        <div className="flex items-center gap-3 warning-banner border rounded-2xl px-5 py-3">
          <span className="text-lg">🔒</span>
          <p className="text-sm font-semibold">
            <strong className="font-black">Regla:</strong> Los pronósticos se bloquean automáticamente{' '}
            <strong className="font-black">1 hora antes</strong> del comienzo del partido.
          </p>
        </div>
      )}

      {/* SECCIÓN PREDICCIÓN DEL PODIO DEL MUNDIAL */}
      {activeLeague.id === 'mundial' && isPredictionMode && (isBeforeDeadline || podiumChampion || podiumRunnerUp || podiumThirdPlace) && (
        <div className="relative overflow-hidden podium-card rounded-[2rem] p-6 flex flex-col gap-5 backdrop-blur-xl">
          {/* Decorative Glow Blob */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">🏆</span>
                <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-200 to-emerald-400">
                  Pronóstico del Podio del Mundial
                </h2>
              </div>
              <p className="text-slate-400 text-xs font-semibold mt-1">
                Elegí tus candidatos para las primeras tres posiciones del Mundial.
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isBeforeDeadline ? 'deadline-badge border' : 'deadline-badge-expired border'}`}>
              {isBeforeDeadline ? '⏳ Plazo: Hasta el 11/06/2026' : '🔒 Plazo finalizado'}
            </div>
          </div>

          {/* Form / Podium Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {/* 1st Place (Campeón) */}
            <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-amber-500/20 transition-all">
              <span className="text-[10px] gold-label font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                🥇 Campeón
              </span>
              {isBeforeDeadline ? (
                <input
                  list="world-cup-teams"
                  type="text"
                  placeholder="Escribí o seleccioná un país"
                  value={podiumChampion}
                  onChange={(e) => setPodiumChampion(e.target.value)}
                  className="w-full podium-card-input rounded-xl px-3.5 py-2 text-sm font-bold outline-none transition-all"
                />
              ) : (
                <div className="podium-card-static rounded-xl px-3.5 py-2 text-sm font-black">
                  {podiumChampion || '—'}
                </div>
              )}
            </div>

            {/* 2nd Place (Subcampeón) */}
            <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-slate-400/20 transition-all">
              <span className="text-[10px] silver-label font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                🥈 Subcampeón
              </span>
              {isBeforeDeadline ? (
                <input
                  list="world-cup-teams"
                  type="text"
                  placeholder="Escribí o seleccioná un país"
                  value={podiumRunnerUp}
                  onChange={(e) => setPodiumRunnerUp(e.target.value)}
                  className="w-full podium-card-input rounded-xl px-3.5 py-2 text-sm font-bold outline-none transition-all"
                />
              ) : (
                <div className="podium-card-static rounded-xl px-3.5 py-2 text-sm font-black">
                  {podiumRunnerUp || '—'}
                </div>
              )}
            </div>

            {/* 3rd Place (Tercer Puesto) */}
            <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-amber-700/20 transition-all">
              <span className="text-[10px] bronze-label font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                🥉 Tercer Puesto
              </span>
              {isBeforeDeadline ? (
                <input
                  list="world-cup-teams"
                  type="text"
                  placeholder="Escribí o seleccioná un país"
                  value={podiumThirdPlace}
                  onChange={(e) => setPodiumThirdPlace(e.target.value)}
                  className="w-full podium-card-input rounded-xl px-3.5 py-2 text-sm font-bold outline-none transition-all"
                />
              ) : (
                <div className="podium-card-static rounded-xl px-3.5 py-2 text-sm font-black">
                  {podiumThirdPlace || '—'}
                </div>
              )}
            </div>
          </div>

          {/* Datalist for autocomplete */}
          <datalist id="world-cup-teams">
            {worldCupTeams.map((team) => (
              <option key={team} value={team} />
            ))}
          </datalist>

          {/* Save Button / Feedback Toast for Podium */}
          {isBeforeDeadline && (
            <div className="flex items-center justify-center sm:justify-between gap-4 mt-1 border-t border-white/5 pt-4 relative z-10">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hidden sm:inline">
                Asegurate de que no se repitan los países
              </span>
              <button
                onClick={handleSavePodium}
                disabled={isSavingPodium}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-black font-black px-6 py-2.5 rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.25)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm mx-auto sm:mx-0 sm:ml-auto"
              >
                {isSavingPodium ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <span>💾</span> Guardar Podio
                  </>
                )}
              </button>
            </div>
          )}

          {/* Podium Feedback Toast (localized inside card) */}
          {podiumToast && (
            <div className={`mt-2 px-4 py-2.5 rounded-xl font-bold text-xs border text-center relative z-10 transition-all ${podiumToast.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
              : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
              }`}>
              {podiumToast.ok ? '✅ ' : '⚠️ '}{podiumToast.msg}
            </div>
          )}
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

      {/* Date Navigator Header - Compact Centered Pill */}
      {selectedDate && (
        <div className="flex justify-center w-full my-1">
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center justify-center gap-3 shadow-lg shadow-black/30 w-fit">
            
            {activeLeague.id === 'mundial' && (
              <button
                onClick={() => { setAllMatches([]); setLoading(true); setViewMode(prev => prev === 'day' ? 'week' : 'day'); }}
                className="px-3.5 py-1.5 rounded-full text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 hover:border-emerald-500/30 transition-all flex items-center gap-1 active:scale-95 transform shrink-0 select-none cursor-pointer"
              >
                {viewMode === 'day' ? (
                  <>
                    <span>📅</span> Semana
                  </>
                ) : (
                  <>
                    <span>📆</span> Día
                  </>
                )}
              </button>
            )}

            {activeLeague.id === 'mundial' && (
              <div className="w-px h-5 bg-white/10 shrink-0" />
            )}

            <div className="flex items-center gap-2 bg-black/35 px-1.5 py-1 rounded-full border border-white/5 shrink-0">
              <button
                onClick={handlePrevDay}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300 font-bold text-xs cursor-pointer"
              >
                <span>{'<'}</span>
              </button>

              <div className="flex flex-col items-center min-w-[95px] select-none">
                <span className="text-[7px] text-emerald-400 font-black uppercase tracking-widest leading-none mb-0.5">
                  {viewMode === 'week' ? 'SEMANA' : 'FECHA'}
                </span>
                <span className="text-[11px] font-black text-white/90 capitalize text-center leading-none">
                  {viewMode === 'week' ? (
                    (() => {
                      const startD = new Date(selectedDate + 'T12:00:00');
                      const endD = new Date(selectedDate + 'T12:00:00');
                      endD.setDate(endD.getDate() + 6);
                      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
                      return `${startD.toLocaleDateString('es-ES', options)} - ${endD.toLocaleDateString('es-ES', options)}`;
                    })()
                  ) : (
                    new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                      weekday: 'short', day: '2-digit', month: 'short'
                    })
                  )}
                </span>
              </div>

              <button
                onClick={handleNextDay}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300 font-bold text-xs cursor-pointer"
              >
                <span>{'>'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {activeLeague.id === 'liga-arg' && !isPredictionMode && (
        <CopaBracket />
      )}

      <div className={`transition-opacity duration-300 ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        {loading && dailyMatches.length === 0 ? (
          <MatchSkeleton />
        ) : dailyMatches.length === 0 ? (
          <div className="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 flex flex-col justify-center items-center text-center">
            <div className="text-5xl mb-4 opacity-50">🏟️</div>
            <span className="text-slate-400 text-lg font-medium">No hay partidos disponibles para {activeLeague.name} en esta fecha.</span>
          </div>
        ) : (
          <div className="flex flex-col bg-[#0b1015]/60 border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
            {dailyMatches.map((match, idx) => (
              <MatchRow
                key={match.id || idx}
                match={match}
                isPredictionMode={isPredictionMode}
                prediction={localPredictions[match.id]}
                user={user}
                viewMode={viewMode}
                onPredictionChange={handlePredictionChange}
                onStepScore={stepScore}
              />
            ))}
          </div>
        )}
      </div>

      {/* Spacer para que el cartel no tape el último partido */}
      {isPredictionMode && <div className="h-32 md:h-24"></div>}


      {/* Toast */}
      {saveToast && (
        <div className={`fixed bottom-36 md:bottom-28 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl border transition-all ${saveToast.ok
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          : 'bg-red-500/20 border-red-500/40 text-red-300'
          }`}>
          {saveToast.ok ? '✅ ' : '⚠️ '}{saveToast.msg}
        </div>
      )}

      {/* Save Button (prediction mode) */}
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
