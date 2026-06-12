import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import KeepieUppieGame from '../components/KeepieUppieGame';
import PlayerWordleGame, { type Player } from '../components/PlayerWordleGame';
import type { LEAGUES } from '../components/layout/AppLayout';

type LeagueType = typeof LEAGUES[number];

// Comprehensive database of ~90 World Cup players
const PLAYERS_DATABASE: Player[] = [
  { nombre: 'Lionel Messi', seleccion: 'Argentina', grupo: 'Grupo A', liga: 'MLS', edad: 38, posicion: 'DEL' },
  { nombre: 'Cristiano Ronaldo', seleccion: 'Portugal', grupo: 'Grupo F', liga: 'Saudi Pro League', edad: 41, posicion: 'DEL' },
  { nombre: 'Kylian Mbappé', seleccion: 'Francia', grupo: 'Grupo D', liga: 'La Liga', edad: 27, posicion: 'DEL' },
  { nombre: 'Neymar Jr', seleccion: 'Brasil', grupo: 'Grupo G', liga: 'Saudi Pro League', edad: 34, posicion: 'DEL' },
  { nombre: 'Vinicius Jr', seleccion: 'Brasil', grupo: 'Grupo G', liga: 'La Liga', edad: 25, posicion: 'DEL' },
  { nombre: 'Robert Lewandowski', seleccion: 'Polonia', grupo: 'Grupo C', liga: 'La Liga', edad: 37, posicion: 'DEL' },
  { nombre: 'Luka Modrić', seleccion: 'Croacia', grupo: 'Grupo F', liga: 'La Liga', edad: 40, posicion: 'MED' },
  { nombre: 'Kevin De Bruyne', seleccion: 'Bélgica', grupo: 'Grupo F', liga: 'Premier League', edad: 34, posicion: 'MED' },
  { nombre: 'Jude Bellingham', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'La Liga', edad: 22, posicion: 'MED' },
  { nombre: 'Harry Kane', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'Bundesliga', edad: 32, posicion: 'DEL' },
  { nombre: 'Antoine Griezmann', seleccion: 'Francia', grupo: 'Grupo D', liga: 'La Liga', edad: 35, posicion: 'DEL' },
  { nombre: 'Bruno Fernandes', seleccion: 'Portugal', grupo: 'Grupo F', liga: 'Premier League', edad: 31, posicion: 'MED' },
  { nombre: 'Bernardo Silva', seleccion: 'Portugal', grupo: 'Grupo F', liga: 'Premier League', edad: 31, posicion: 'MED' },
  { nombre: 'Luis Suárez', seleccion: 'Uruguay', grupo: 'Grupo H', liga: 'MLS', edad: 39, posicion: 'DEL' },
  { nombre: 'Edinson Cavani', seleccion: 'Uruguay', grupo: 'Grupo H', liga: 'Liga Argentina', edad: 39, posicion: 'DEL' },
  { nombre: 'Emiliano Martínez', seleccion: 'Argentina', grupo: 'Grupo A', liga: 'Premier League', edad: 33, posicion: 'ARQ' },
  { nombre: 'Angel Di María', seleccion: 'Argentina', grupo: 'Grupo A', liga: 'Primeira Liga', edad: 38, posicion: 'DEL' },
  { nombre: 'Rodrigo De Paul', seleccion: 'Argentina', grupo: 'Grupo A', liga: 'MLS', edad: 32, posicion: 'MED' },
  { nombre: 'Lautaro Martínez', seleccion: 'Argentina', grupo: 'Grupo A', liga: 'Serie A', edad: 28, posicion: 'DEL' },
  { nombre: 'Julián Álvarez', seleccion: 'Argentina', grupo: 'Grupo A', liga: 'La Liga', edad: 26, posicion: 'DEL' },
  { nombre: 'Alexis Mac Allister', seleccion: 'Argentina', grupo: 'Grupo A', liga: 'Premier League', edad: 27, posicion: 'MED' },
  { nombre: 'Enzo Fernández', seleccion: 'Argentina', grupo: 'Grupo A', liga: 'Premier League', edad: 25, posicion: 'MED' },
  { nombre: 'Virgil van Dijk', seleccion: 'Países Bajos', grupo: 'Grupo A', liga: 'Premier League', edad: 34, posicion: 'DEF' },
  { nombre: 'Frenkie de Jong', seleccion: 'Países Bajos', grupo: 'Grupo A', liga: 'La Liga', edad: 29, posicion: 'MED' },
  { nombre: 'Memphis Depay', seleccion: 'Países Bajos', grupo: 'Grupo A', liga: 'Brasileirao', edad: 32, posicion: 'DEL' },
  { nombre: 'Heung-min Son', seleccion: 'Corea del Sur', grupo: 'Grupo H', liga: 'Premier League', edad: 33, posicion: 'DEL' },
  { nombre: 'Federico Valverde', seleccion: 'Uruguay', grupo: 'Grupo H', liga: 'La Liga', edad: 27, posicion: 'MED' },
  { nombre: 'Darwin Núñez', seleccion: 'Uruguay', grupo: 'Grupo H', liga: 'Premier League', edad: 26, posicion: 'DEL' },
  { nombre: 'Achraf Hakimi', seleccion: 'Marruecos', grupo: 'Grupo F', liga: 'Ligue 1', edad: 27, posicion: 'DEF' },
  { nombre: 'Hakim Ziyech', seleccion: 'Marruecos', grupo: 'Grupo F', liga: 'Süper Lig', edad: 33, posicion: 'MED' },
  { nombre: 'Yassine Bounou', seleccion: 'Marruecos', grupo: 'Grupo F', liga: 'Saudi Pro League', edad: 35, posicion: 'ARQ' },
  { nombre: 'Thomas Müller', seleccion: 'Alemania', grupo: 'Grupo E', liga: 'Bundesliga', edad: 36, posicion: 'MED' },
  { nombre: 'Manuel Neuer', seleccion: 'Alemania', grupo: 'Grupo E', liga: 'Bundesliga', edad: 40, posicion: 'ARQ' },
  { nombre: 'Jamal Musiala', seleccion: 'Alemania', grupo: 'Grupo E', liga: 'Bundesliga', edad: 23, posicion: 'MED' },
  { nombre: 'Ilkay Gündogan', seleccion: 'Alemania', grupo: 'Grupo E', liga: 'Premier League', edad: 35, posicion: 'MED' },
  { nombre: 'Joshua Kimmich', seleccion: 'Alemania', grupo: 'Grupo E', liga: 'Bundesliga', edad: 31, posicion: 'MED' },
  { nombre: 'Leroy Sané', seleccion: 'Alemania', grupo: 'Grupo E', liga: 'Bundesliga', edad: 30, posicion: 'DEL' },
  { nombre: 'Pedri', seleccion: 'España', grupo: 'Grupo E', liga: 'La Liga', edad: 23, posicion: 'MED' },
  { nombre: 'Gavi', seleccion: 'España', grupo: 'Grupo E', liga: 'La Liga', edad: 21, posicion: 'MED' },
  { nombre: 'Alvaro Morata', seleccion: 'España', grupo: 'Grupo E', liga: 'Serie A', edad: 33, posicion: 'DEL' },
  { nombre: 'Rodri', seleccion: 'España', grupo: 'Grupo E', liga: 'Premier League', edad: 29, posicion: 'MED' },
  { nombre: 'Dani Carvajal', seleccion: 'España', grupo: 'Grupo E', liga: 'La Liga', edad: 34, posicion: 'DEF' },
  { nombre: 'Christian Pulisic', seleccion: 'EEUU', grupo: 'Grupo B', liga: 'Serie A', edad: 27, posicion: 'DEL' },
  { nombre: 'Weston McKennie', seleccion: 'EEUU', grupo: 'Grupo B', liga: 'Serie A', edad: 27, posicion: 'MED' },
  { nombre: 'Alphonso Davies', seleccion: 'Canadá', grupo: 'Grupo F', liga: 'Bundesliga', edad: 25, posicion: 'DEF' },
  { nombre: 'Jonathan David', seleccion: 'Canadá', grupo: 'Grupo F', liga: 'Ligue 1', edad: 26, posicion: 'DEL' },
  { nombre: 'Keylor Navas', seleccion: 'Costa Rica', grupo: 'Grupo E', liga: 'Sin Club', edad: 39, posicion: 'ARQ' },
  { nombre: 'Guillermo Ochoa', seleccion: 'México', grupo: 'Grupo C', liga: 'Primeira Liga', edad: 40, posicion: 'ARQ' },
  { nombre: 'Hirving Lozano', seleccion: 'México', grupo: 'Grupo C', liga: 'Eredivisie', edad: 30, posicion: 'DEL' },
  { nombre: 'Raúl Jiménez', seleccion: 'México', grupo: 'Grupo C', liga: 'Premier League', edad: 35, posicion: 'DEL' },
  { nombre: 'Richarlison', seleccion: 'Brasil', grupo: 'Grupo G', liga: 'Premier League', edad: 29, posicion: 'DEL' },
  { nombre: 'Casemiro', seleccion: 'Brasil', grupo: 'Grupo G', liga: 'Premier League', edad: 34, posicion: 'MED' },
  { nombre: 'Marquinhos', seleccion: 'Brasil', grupo: 'Grupo G', liga: 'Ligue 1', edad: 32, posicion: 'DEF' },
  { nombre: 'Alisson Becker', seleccion: 'Brasil', grupo: 'Grupo G', liga: 'Premier League', edad: 33, posicion: 'ARQ' },
  { nombre: 'Ederson', seleccion: 'Brasil', grupo: 'Grupo G', liga: 'Premier League', edad: 32, posicion: 'ARQ' },
  { nombre: 'Gabriel Jesus', seleccion: 'Brasil', grupo: 'Grupo G', liga: 'Premier League', edad: 29, posicion: 'DEL' },
  { nombre: 'Olivier Giroud', seleccion: 'Francia', grupo: 'Grupo D', liga: 'MLS', edad: 39, posicion: 'DEL' },
  { nombre: 'Ousmane Dembélé', seleccion: 'Francia', grupo: 'Grupo D', liga: 'Ligue 1', edad: 29, posicion: 'DEL' },
  { nombre: 'Theo Hernández', seleccion: 'Francia', grupo: 'Grupo D', liga: 'Serie A', edad: 28, posicion: 'DEF' },
  { nombre: 'Dayot Upamecano', seleccion: 'Francia', grupo: 'Grupo D', liga: 'Bundesliga', edad: 27, posicion: 'DEF' },
  { nombre: 'Aurelien Tchouaméni', seleccion: 'Francia', grupo: 'Grupo D', liga: 'La Liga', edad: 26, posicion: 'MED' },
  { nombre: 'Eduardo Camavinga', seleccion: 'Francia', grupo: 'Grupo D', liga: 'La Liga', edad: 23, posicion: 'MED' },
  { nombre: 'Bukayo Saka', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'Premier League', edad: 24, posicion: 'DEL' },
  { nombre: 'Declan Rice', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'Premier League', edad: 27, posicion: 'MED' },
  { nombre: 'Phil Foden', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'Premier League', edad: 26, posicion: 'MED' },
  { nombre: 'Marcus Rashford', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'Premier League', edad: 28, posicion: 'DEL' },
  { nombre: 'Jack Grealish', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'Premier League', edad: 30, posicion: 'MED' },
  { nombre: 'John Stones', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'Premier League', edad: 32, posicion: 'DEF' },
  { nombre: 'Kyle Walker', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'Premier League', edad: 36, posicion: 'DEF' },
  { nombre: 'Jordan Pickford', seleccion: 'Inglaterra', grupo: 'Grupo B', liga: 'Premier League', edad: 32, posicion: 'ARQ' },
  { nombre: 'Romelu Lukaku', seleccion: 'Bélgica', grupo: 'Grupo F', liga: 'Serie A', edad: 33, posicion: 'DEL' },
  { nombre: 'Thibaut Courtois', seleccion: 'Bélgica', grupo: 'Grupo F', liga: 'La Liga', edad: 34, posicion: 'ARQ' },
  { nombre: 'Yannick Carrasco', seleccion: 'Bélgica', grupo: 'Grupo F', liga: 'Saudi Pro League', edad: 32, posicion: 'MED' },
  { nombre: 'Christian Eriksen', seleccion: 'Dinamarca', grupo: 'Grupo D', liga: 'Premier League', edad: 34, posicion: 'MED' },
  { nombre: 'Pierre-Emile Højbjerg', seleccion: 'Dinamarca', grupo: 'Grupo D', liga: 'Ligue 1', edad: 30, posicion: 'MED' },
  { nombre: 'Kasper Schmeichel', seleccion: 'Dinamarca', grupo: 'Grupo D', liga: 'Scottish Premiership', edad: 39, posicion: 'ARQ' },
  { nombre: 'Granit Xhaka', seleccion: 'Suiza', grupo: 'Grupo G', liga: 'Bundesliga', edad: 33, posicion: 'MED' },
  { nombre: 'Xherdan Shaqiri', seleccion: 'Suiza', grupo: 'Grupo G', liga: 'MLS', edad: 34, posicion: 'MED' },
  { nombre: 'Yann Sommer', seleccion: 'Suiza', grupo: 'Grupo G', liga: 'Serie A', edad: 37, posicion: 'ARQ' },
  { nombre: 'Breel Embolo', seleccion: 'Suiza', grupo: 'Grupo G', liga: 'Ligue 1', edad: 29, posicion: 'DEL' },
  { nombre: 'Kalidou Koulibaly', seleccion: 'Senegal', grupo: 'Grupo A', liga: 'Saudi Pro League', edad: 34, posicion: 'DEF' },
  { nombre: 'Sadio Mané', seleccion: 'Senegal', grupo: 'Grupo A', liga: 'Saudi Pro League', edad: 34, posicion: 'DEL' },
  { nombre: 'Edouard Mendy', seleccion: 'Senegal', grupo: 'Grupo A', liga: 'Saudi Pro League', edad: 34, posicion: 'ARQ' },
  { nombre: 'Nicolas Jackson', seleccion: 'Senegal', grupo: 'Grupo A', liga: 'Premier League', edad: 24, posicion: 'DEL' },
  { nombre: 'Ismaila Sarr', seleccion: 'Senegal', grupo: 'Grupo A', liga: 'Premier League', edad: 28, posicion: 'DEL' },
  { nombre: 'André Onana', seleccion: 'Camerún', grupo: 'Grupo G', liga: 'Premier League', edad: 30, posicion: 'ARQ' },
  { nombre: 'Vincent Aboubakar', seleccion: 'Camerún', grupo: 'Grupo G', liga: 'Süper Lig', edad: 34, posicion: 'DEL' },
  { nombre: 'Eric Maxim Choupo-Moting', seleccion: 'Camerún', grupo: 'Grupo G', liga: 'Sin Club', edad: 37, posicion: 'DEL' },
  { nombre: 'Bryan Mbeumo', seleccion: 'Camerún', grupo: 'Grupo G', liga: 'Premier League', edad: 26, posicion: 'DEL' },
  { nombre: 'Frank Anguissa', seleccion: 'Camerún', grupo: 'Grupo G', liga: 'Serie A', edad: 30, posicion: 'MED' },
  { nombre: 'Mehdi Taremi', seleccion: 'Irán', grupo: 'Grupo B', liga: 'Serie A', edad: 33, posicion: 'DEL' },
  { nombre: 'Sardar Azmoun', seleccion: 'Irán', grupo: 'Grupo B', liga: 'UAE Pro League', edad: 31, posicion: 'DEL' },
  { nombre: 'Salem Al-Dawsari', seleccion: 'Arabia Saudita', grupo: 'Grupo C', liga: 'Saudi Pro League', edad: 34, posicion: 'MED' },
  { nombre: 'Mohammed Al-Owais', seleccion: 'Arabia Saudita', grupo: 'Grupo C', liga: 'Saudi Pro League', edad: 34, posicion: 'ARQ' }
];

// Helper hash function to select deterministic player based on today's date YYYY-MM-DD
const getDailyPlayer = (dateStr: string, list: Player[]): Player => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % list.length;
  return list[index];
};

interface JarielUser {
  _id: string;
  name: string;
  avatarUrl?: string;
}

interface GameScore {
  userId: string;
  points: number;
  gameId: string;
  createdAt: string;
}

interface PlayerWordle {
  userId: string;
  points: number;
  gameId: string;
  status: 'won' | 'lost' | 'playing';
  completed: boolean;
  createdAt: string;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  score: number;
}

interface LeaderboardProps {
  title: string;
  entries: LeaderboardEntry[];
  currentUserId: string;
  scoreLabel: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function MinigameLeaderboard({ title, entries, currentUserId, scoreLabel, loading, error, onRefresh }: LeaderboardProps) {
  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center p-8 bg-[#0b0f19]/80 border border-white/5 rounded-3xl mt-6 min-h-[150px]">
        <div className="animate-spin w-6 h-6 border-t-2 border-emerald-500 rounded-full mb-3" />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Cargando posiciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-red-500/5 border border-red-500/10 rounded-3xl mt-6 text-center">
        <span className="text-xs text-red-400 font-extrabold block">⚠️ {error}</span>
        <button
          onClick={onRefresh}
          className="mt-3 px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-black rounded-xl transition cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-[#0b0f19]/90 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl mt-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 relative z-10">
        <div className="flex flex-col">
          <span className="text-[9px] tracking-widest text-slate-500 font-bold uppercase">POSICIONES</span>
          <h3 className="text-base font-black text-white tracking-wide">
            {title}
          </h3>
        </div>
        <button
          onClick={onRefresh}
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95 cursor-pointer text-sm"
          title="Actualizar tabla"
        >
          🔄
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 relative z-10">
          <span className="text-3xl block mb-2 opacity-40">🏆</span>
          <p className="text-xs text-slate-500 font-bold">Nadie ha registrado puntaje aún.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 relative z-10 max-h-[300px] overflow-y-auto no-scrollbar">
          {entries.map((entry, idx) => {
            const isMe = entry.userId === currentUserId;
            const isTop3 = idx < 3;
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;

            const rowBg = isMe
              ? 'bg-emerald-500/10 border-l-2 border-emerald-500/50 hover:bg-emerald-500/15'
              : 'bg-white/[0.01] hover:bg-white/[0.03]';

            const nameClass = isMe
              ? 'text-emerald-400 font-black'
              : 'text-slate-200 font-bold';

            const scoreClass = isMe
              ? 'text-emerald-400 font-black'
              : isTop3
                ? 'text-white font-extrabold'
                : 'text-slate-300 font-medium';

            const avatarBg = isMe
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : isTop3
                ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                : 'bg-white/5 border-white/10 text-slate-400';

            const avatarUrl = entry.avatarUrl?.startsWith('http')
              ? entry.avatarUrl
              : (entry.avatarUrl ? `https://apivacas.jariel.com.ar${entry.avatarUrl}` : `https://apivacas.jariel.com.ar/users/${entry.userId}.webp`);

            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border border-white/5 transition-all ${rowBg}`}
              >
                {/* Left side: Position & Avatar & Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 flex items-center justify-center shrink-0">
                    {medal ? (
                      <span className="text-lg">{medal}</span>
                    ) : (
                      <span className="text-[11px] font-black text-slate-500">{idx + 1}</span>
                    )}
                  </div>

                  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 border overflow-hidden ${avatarBg}`}>
                    <span className="absolute z-0 text-xs">{entry.name?.slice(0, 1).toUpperCase() || '?'}</span>
                    <img
                      src={avatarUrl}
                      alt={entry.name}
                      className="w-full h-full object-cover relative z-10"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>

                  <span className={`text-xs truncate ${nameClass}`}>
                    {entry.name}
                    {isMe && <span className="ml-1 text-[9px] font-bold text-emerald-400/70">(vos)</span>}
                  </span>
                </div>

                {/* Right side: Points */}
                <span className={`text-xs font-black tracking-wide ${scoreClass}`}>
                  {entry.score} {scoreLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LeagueMinigamesView() {
  const { activeLeague } = useOutletContext<{ activeLeague: LeagueType }>();
  const { user } = useAuth();
  const [activeGameTab, setActiveGameTab] = useState<'jueguitos' | 'wordle'>('jueguitos');

  // Rankings state
  const [users, setUsers] = useState<JarielUser[]>([]);
  const [scores, setScores] = useState<GameScore[]>([]);
  const [wordleEntries, setWordleEntries] = useState<PlayerWordle[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [rankingsError, setRankingsError] = useState<string | null>(null);

  const fetchRankingsData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoadingRankings(true);
      setRankingsError(null);
    }
    try {
      const [usersRes, scoresRes, wordleRes] = await Promise.all([
        fetch('https://apivacas.jariel.com.ar/api/users'),
        fetch('https://apivacas.jariel.com.ar/api/games/mundial/games/scores/all'),
        fetch('https://apivacas.jariel.com.ar/api/games/mundial/games/wordle/all')
      ]);

      if (!usersRes.ok || !scoresRes.ok || !wordleRes.ok) {
        throw new Error('Error al cargar datos de posiciones del servidor');
      }

      const [usersData, scoresData, wordleData] = await Promise.all([
        usersRes.json(),
        scoresRes.json(),
        wordleRes.json()
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setScores(scoresData?.success && Array.isArray(scoresData.data) ? scoresData.data : []);
      setWordleEntries(wordleData?.success && Array.isArray(wordleData.data) ? wordleData.data : []);
    } catch (err: unknown) {
      console.error('Error fetching rankings:', err);
      if (showLoading) {
        const errMsg = err instanceof Error ? err.message : 'Error de conexión con el servidor';
        setRankingsError(errMsg);
      }
    } finally {
      if (showLoading) {
        setLoadingRankings(false);
      }
    }
  }, []);

  // Fetch rankings on mount and setup interval
  useEffect(() => {
    if (!user) return;
    fetchRankingsData(true);
    const interval = setInterval(() => fetchRankingsData(false), 30000); // 30s background sync
    return () => clearInterval(interval);
  }, [user, fetchRankingsData]);

  // Aggregate Keepie Uppie (Jueguitos) rankings
  // Shows highest points reached by each unique user
  const jueguitosRankings = Object.values(
    scores.reduce((acc, entry) => {
      if (entry.gameId !== 'jueguitos') return acc;
      const currentMax = acc[entry.userId]?.score || 0;
      if (entry.points > currentMax) {
        const userInfo = users.find(u => u._id === entry.userId);
        acc[entry.userId] = {
          userId: entry.userId,
          name: userInfo?.name || 'Desconocido',
          avatarUrl: userInfo?.avatarUrl,
          score: entry.points,
        };
      }
      return acc;
    }, {} as Record<string, LeaderboardEntry>)
  ).sort((a, b) => b.score - a.score);

  // Aggregate Wordle rankings
  // Sums the points for all daily Wordle completions for each unique user
  const wordleRankings = Object.values(
    wordleEntries.reduce((acc, entry) => {
      if (entry.gameId !== 'wordle_jugador') return acc;
      const current = acc[entry.userId];
      const pointsToAdd = entry.points || 0;
      if (current) {
        current.score += pointsToAdd;
      } else {
        const userInfo = users.find(u => u._id === entry.userId);
        acc[entry.userId] = {
          userId: entry.userId,
          name: userInfo?.name || 'Desconocido',
          avatarUrl: userInfo?.avatarUrl,
          score: pointsToAdd,
        };
      }
      return acc;
    }, {} as Record<string, LeaderboardEntry>)
  ).sort((a, b) => b.score - a.score);

  if (!user) {
    return (
      <div className="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-12 flex flex-col items-center gap-4 text-slate-400">
        <div className="text-5xl opacity-30">🎮</div>
        <p className="text-sm font-medium text-center">Debes iniciar sesión para jugar a los minijuegos.</p>
      </div>
    );
  }

  // Get current daily player (using UTC to sync with server daily reset at 21:00 hs AR)
  const todayStr = new Date().toISOString().split('T')[0];
  const jugadorDelDia = getDailyPlayer(todayStr, PLAYERS_DATABASE);

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="relative bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 lg:p-8 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-emerald-500/8 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/8 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
              🎮 Minijuegos Mundialistas
            </h1>
            <p className="text-slate-400 font-medium mt-1">
              {activeLeague.name} — Hacé jueguitos o adiviná el jugador oculto del día para sumar puntos en la tabla (No Prode).
            </p>
          </div>

          {/* Sub-Game Switcher */}
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 gap-1 shrink-0">
            <button
              onClick={() => setActiveGameTab('jueguitos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-100 cursor-pointer ${activeGameTab === 'jueguitos'
                ? 'bg-emerald-500/20 text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              ⚽ Hacer Jueguitos
            </button>
            <button
              onClick={() => setActiveGameTab('wordle')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-100 cursor-pointer ${activeGameTab === 'wordle'
                ? 'bg-emerald-500/20 text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              🧩 Adiviná el Jugador
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Interface + Leaderboard */}
      <div className="w-full flex flex-col gap-6 relative z-10">
        <div className="w-full flex justify-center py-4">
          {activeGameTab === 'jueguitos' ? (
            <KeepieUppieGame userId={user.uid} />
          ) : (
            <PlayerWordleGame
              userId={user.uid}
              jugadorDelDia={jugadorDelDia}
              playersList={PLAYERS_DATABASE}
            />
          )}
        </div>

        {/* Leaderboards rendered directly below each active game */}
        {activeGameTab === 'jueguitos' ? (
          <MinigameLeaderboard
            title="🏆 Récords de Jueguitos"
            entries={jueguitosRankings}
            currentUserId={user.uid}
            scoreLabel="jueguitos"
            loading={loadingRankings}
            error={rankingsError}
            onRefresh={() => fetchRankingsData(true)}
          />
        ) : (
          <MinigameLeaderboard
            title="🏆 Puntos de Adiviná el Jugador"
            entries={wordleRankings}
            currentUserId={user.uid}
            scoreLabel="pts"
            loading={loadingRankings}
            error={rankingsError}
            onRefresh={() => fetchRankingsData(true)}
          />
        )}
      </div>
    </div>
  );
}

