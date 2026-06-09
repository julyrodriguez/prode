import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ExpandedMatchDetails({ matchId, currentPlayerId, allPlayers, matchScore, matchOutcome }: { matchId: string, currentPlayerId: string, allPlayers: CS2Player[], matchScore: number[], matchOutcome: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`https://apivacas.jariel.com.ar/api/matchesCs/${matchId}`)
      .then(res => res.json())
      .then(json => {
        let matchData = json.data || json;
        if (Array.isArray(matchData)) matchData = matchData[0];
        if (matchData && matchData.jugadores) {
          setData(matchData);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) return (
    <div className="p-8 flex justify-center border-t border-white/5 bg-black/20">
      <div className="animate-spin w-6 h-6 border-t-2 border-emerald-500 rounded-full"></div>
    </div>
  );

  if (error || !data) return (
    <div className="p-4 text-center text-red-400 border-t border-white/5 bg-black/20">
      No hay registro de un game tan viejo
    </div>
  );

  let team1Raw = data.jugadores.filter((p: any) => p.equipoInicial === 3);
  let team2Raw = data.jugadores.filter((p: any) => p.equipoInicial === 2);

  if (team1Raw.length === 0 && team2Raw.length === 0) {
    const rawIndex = data.jugadores.findIndex((p: any) => p.steamId === currentPlayerId) < 5 ? 0 : 1;
    team1Raw = rawIndex === 0 ? data.jugadores.slice(0, 5) : data.jugadores.slice(5);
    team2Raw = rawIndex === 0 ? data.jugadores.slice(5) : data.jugadores.slice(0, 5);
  }

  const currentPlayerInTeam1 = team1Raw.some((p: any) => p.steamId === currentPlayerId);
  const rawMyTeam = currentPlayerInTeam1 ? team1Raw : team2Raw;
  const rawEnemyTeam = currentPlayerInTeam1 ? team2Raw : team1Raw;

  // Ordenamos por Puntos (o HLTV si no hay puntos)
  const myTeam = [...rawMyTeam].sort((a: any, b: any) => (b.puntos || b.hltvRating || 0) - (a.puntos || a.hltvRating || 0));
  const enemyTeam = [...rawEnemyTeam].sort((a: any, b: any) => (b.puntos || b.hltvRating || 0) - (a.puntos || a.hltvRating || 0));

  const myScore = matchScore?.[0] ?? 0;
  const enemyScore = matchScore?.[1] ?? 0;

  const isWin = matchOutcome === 'win';
  const isDraw = matchOutcome === 'draw';

  const renderPlayerTable = (players: any[]) => (
    <div className="overflow-x-auto w-full max-w-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
      <table className="w-full text-center border-collapse whitespace-nowrap sm:whitespace-normal min-w-[600px] sm:min-w-[700px]">
        <thead>
          <tr className="border-b border-white/5 text-slate-400 text-[10px] uppercase tracking-widest bg-black/40">
            <th className="py-2.5 font-semibold text-left pl-4">Jugador</th>
            <th className="py-2.5 font-semibold">K-A-D</th>
            <th className="py-2.5 font-semibold">K/D</th>
            <th className="py-2.5 font-semibold">+/-</th>
            <th className="py-2.5 font-semibold hidden xl:table-cell">KAST</th>
            <th className="py-2.5 font-semibold hidden sm:table-cell">MVP</th>
            <th className="py-2.5 font-semibold hidden md:table-cell">Puntos</th>
            <th className="py-2.5 font-semibold hidden lg:table-cell">HLTV</th>
            <th className="py-2.5 font-semibold">Leetify</th>
            <th className="py-2.5 font-semibold text-right pr-4 hidden lg:table-cell">Premier</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const dbPlayer = allPlayers.find(ap => ap.steam64_id === p.steamId);
            const alias = dbPlayer ? dbPlayer.alias : p.nombre || 'Anónimo';
            const isSelf = p.steamId === currentPlayerId;
            const kdDiff = (p.kills || 0) - (p.deaths || 0);

            return (
              <tr key={p.steamId || idx} className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${isSelf ? 'bg-white/5' : ''}`}>
                <td className="py-2 pl-4 text-left">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isSelf ? 'text-white' : 'text-slate-200'} truncate max-w-[120px] sm:max-w-[150px]`}>{alias}</span>
                      {dbPlayer && !isSelf && <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded flex-shrink-0 uppercase tracking-widest">Prode</span>}
                      {isSelf && <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded flex-shrink-0 font-bold tracking-widest">TÚ</span>}
                    </div>
                    {!dbPlayer && !isSelf && <span className="text-[10px] text-slate-500 truncate max-w-[120px] sm:max-w-[150px]">{p.nombre}</span>}
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center justify-center gap-1.5 text-sm">
                    <span className="text-white font-bold">{p.kills || 0}</span>
                    <span className="text-slate-500">-</span>
                    <span className="text-slate-300 font-medium">{p.assists || 0}</span>
                    <span className="text-slate-500">-</span>
                    <span className="text-red-400 font-medium opacity-80">{p.deaths || 0}</span>
                  </div>
                </td>
                <td className="py-2 font-medium text-slate-300 text-sm">
                  {p.kdRatio?.toFixed(2) || '-'}
                </td>
                <td className={`py-2 font-bold text-sm ${kdDiff > 0 ? 'text-emerald-400' : kdDiff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {kdDiff > 0 ? '+' : ''}{kdDiff}
                </td>
                <td className="py-2 font-medium text-slate-300 text-sm hidden xl:table-cell">
                  {p.kast ? `${(p.kast * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="py-2 text-sm hidden sm:table-cell">
                  {p.mvps > 0 ? (
                    <span className="inline-flex items-center justify-center gap-1 text-yellow-500/90 font-bold bg-yellow-500/10 px-2 rounded-full">
                      ★ {p.mvps}
                    </span>
                  ) : <span className="text-slate-600">-</span>}
                </td>
                <td className="py-2 font-bold text-white text-sm hidden md:table-cell">
                  {p.puntos || '-'}
                </td>
                <td className="py-2 font-medium text-slate-300 text-sm hidden lg:table-cell">
                  {p.hltvRating?.toFixed(2) || '-'}
                </td>
                <td className="py-2 text-sm">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${p.leetifyRating > 0 ? 'bg-emerald-500/10 text-emerald-400' : p.leetifyRating < 0 ? 'bg-red-500/10 text-red-500' : 'text-slate-400'}`}>
                    {p.leetifyRating > 0 ? '+' : ''}{p.leetifyRating?.toFixed(2) || '-'}
                  </span>
                </td>
                <td className="py-2 text-right pr-4 hidden lg:table-cell">
                  {p.ranking?.current ? (
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-slate-200 font-bold text-sm">{p.ranking.current}</span>
                      {p.ranking.diff ? (
                        <span className={`text-[10px] font-bold ${p.ranking.diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {p.ranking.diff > 0 ? '+$' : '-'}{Math.abs(p.ranking.diff)}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-sm">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 border-t border-white/5 bg-[#1a1b1e] text-sm space-y-4 sm:space-y-6 shadow-inner overflow-hidden w-full max-w-full min-w-0">

      {/* Tu Equipo */}
      <div className={`rounded-xl border ${isWin ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : isDraw ? 'border-slate-500/40' : 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]'} overflow-hidden`}>
        <div className={`flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 ${isWin ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5' : isDraw ? 'bg-gradient-to-r from-slate-500/20 to-slate-500/5' : 'bg-gradient-to-r from-red-500/20 to-red-500/5'}`}>
          <h4 className={`font-black uppercase tracking-widest text-base sm:text-lg ${isWin ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-red-400'}`}>
            Tu Equipo {isWin ? '🏆' : ''}
          </h4>
          <span className={`text-2xl sm:text-4xl font-black tabular-nums tracking-tighter ${isWin ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-red-400'}`}>{myScore}</span>
        </div>
        <div className="bg-black/80 w-full max-w-full">
          {renderPlayerTable(myTeam)}
        </div>
      </div>

      {/* Equipo Enemigo */}
      <div className={`rounded-xl border ${!isWin && !isDraw ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : isDraw ? 'border-slate-500/40' : 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]'} w-full overflow-hidden`}>
        <div className={`flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 ${!isWin && !isDraw ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5' : isDraw ? 'bg-gradient-to-r from-slate-500/20 to-slate-500/5' : 'bg-gradient-to-r from-red-500/20 to-red-500/5'}`}>
          <h4 className={`font-black uppercase tracking-widest text-base sm:text-lg ${!isWin && !isDraw ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-red-400'}`}>
            Rival {!isWin && !isDraw ? '🏆' : ''}
          </h4>
          <span className={`text-2xl sm:text-4xl font-black tabular-nums tracking-tighter ${!isWin && !isDraw ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-red-400'}`}>{enemyScore}</span>
        </div>
        <div className="bg-black/80 w-full max-w-full">
          {renderPlayerTable(enemyTeam)}
        </div>
      </div>

    </div>
  );
}

interface CS2Player {
  _id: any;
  alias: string;
  name: string;
  steam64_id: string;
  ranks: {
    leetify: number;
    premier: number;
  };
  rating: {
    aim: number;
    positioning: number;
    utility: number;
    clutch: number;
    opening: number;
    ct_leetify: number;
    t_leetify: number;
  };
  recent_matches: Array<{
    id: string;
    map_name: string;
    outcome: string;
    score: number[];
    teammates: string[];
    kills?: number;
    deaths?: number;
    preaim?: number;
    reaction_time_ms?: number;
    accuracy_head?: number;
    leetify_rating?: number;
    finished_at?: { $date: string } | string;
    _id: any;
  }>;
  stats: {
    accuracy_enemy_spotted: number;
    accuracy_head: number;
    reaction_time_ms: number;
    spray_accuracy: number;
  };
  total_matches: number;
  winrate: number;
  lastUpdated?: any;
}

const getMatchDate = (finishedAt: any) => {
  if (!finishedAt) return 'Fecha desconocida';
  const dateStr = finishedAt.$date || finishedAt;
  return new Date(dateStr).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function CS2ProfileView() {
  const { steam64Id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<CS2Player | null>(null);
  const [allPlayers, setAllPlayers] = useState<CS2Player[]>([]);
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toggleMatch = (id: string) => {
    setExpandedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  useEffect(() => {
    fetch('https://apivacas.jariel.com.ar/api/cs2/players')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setAllPlayers(data.data);
          const found = data.data.find((p: CS2Player) => p.steam64_id === steam64Id);
          if (found) {
            setPlayer(found);
          } else {
            setError('Jugador no encontrado');
          }
        } else {
          setError('Error al cargar datos');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Error de conexión');
      })
      .finally(() => setLoading(false));
  }, [steam64Id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-t-2 border-emerald-500 rounded-full mb-4"></div>
        <p className="text-slate-400">Cargando perfil de {steam64Id}...</p>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
        {error || 'No se encontró el jugador'}
        <br />
        <button onClick={() => navigate('/cs2')} className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white">
          Volver al ranking
        </button>
      </div>
    );
  }

  const premierRank = player.ranks?.premier || 0;
  let rankColor = "text-slate-300";
  if (premierRank >= 20000) rankColor = "text-yellow-400 font-bold";
  else if (premierRank >= 15000) rankColor = "text-purple-400 font-bold";
  else if (premierRank >= 10000) rankColor = "text-pink-400 font-bold";
  else if (premierRank >= 5000) rankColor = "text-blue-400 font-bold";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">

      {/* ── Botón Volver ── */}
      <button
        onClick={() => navigate('/cs2')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al Ranking CS2
      </button>

      {/* ── Perfil Cabecera ── */}
      <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg className="w-48 h-48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM11 19.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-lg p-[2px]">
            <div className="w-full h-full bg-black/80 rounded-2xl flex items-center justify-center overflow-hidden">
              <span className="text-4xl text-white font-black">{player.alias.substring(0, 2).toUpperCase()}</span>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white">{player.alias}</h1>
            <p className="text-slate-400 mb-2">{player.name}</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/70">
                Steam: {player.steam64_id}
              </span>
              <span className={`px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold ${rankColor}`}>
                Premier: {premierRank.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-6">
              <span className="text-slate-400 text-sm">Winrate</span>
              <span className={`font-bold ${player.winrate >= 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(player.winrate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-6">
              <span className="text-slate-400 text-sm">Total Matches</span>
              <span className="font-bold text-white">
                {player.total_matches}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Rating (Radar/List) ── */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-xl font-bold text-white mb-4">Rating de Jugador</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col">
              <span className="text-slate-400 text-xs uppercase mb-1">Aim</span>
              <span className="text-2xl font-bold text-white tracking-tight">{player.rating?.aim?.toFixed(2) || '0'}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col">
              <span className="text-slate-400 text-xs uppercase mb-1">Positioning</span>
              <span className="text-2xl font-bold text-white tracking-tight">{player.rating?.positioning?.toFixed(2) || '0'}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col">
              <span className="text-slate-400 text-xs uppercase mb-1">Utility</span>
              <span className="text-2xl font-bold text-white tracking-tight">{player.rating?.utility?.toFixed(2) || '0'}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col">
              <span className="text-slate-400 text-xs uppercase mb-1">Clutch</span>
              <span className="text-2xl font-bold text-white tracking-tight">{player.rating?.clutch?.toFixed(2) || '0'}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col">
              <span className="text-slate-400 text-xs uppercase mb-1">Opening</span>
              <span className="text-2xl font-bold text-white tracking-tight">{player.rating?.opening?.toFixed(2) || '0'}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col">
              <span className="text-slate-400 text-xs uppercase mb-1">Leetify Rank</span>
              <span className="text-2xl font-bold text-emerald-400 tracking-tight">{player.ranks?.leetify?.toFixed(3) || '0'}</span>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-xl font-bold text-white mb-4">Estadísticas Principales</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">Headshot Accuracy</span>
              <span className="font-bold text-white">{player.stats?.accuracy_head?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">Spray Accuracy</span>
              <span className="font-bold text-white">{player.stats?.spray_accuracy?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">Enemy Spotted Accuracy</span>
              <span className="font-bold text-white">{player.stats?.accuracy_enemy_spotted?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">Reaction Time</span>
              <span className="font-bold text-white">{player.stats?.reaction_time_ms ? Math.round(player.stats.reaction_time_ms) : 0} ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Partidos Recientes ── */}
      <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4">Últimos {player.recent_matches?.length || 0} Partidos Registrados</h3>

        {(!player.recent_matches || player.recent_matches.length === 0) ? (
          <div className="text-center py-8 text-slate-500">
            No hay partidos recientes registrados.
          </div>
        ) : (
          <div className="space-y-3">
            {player.recent_matches.map((match, i) => {
              const isExpanded = expandedMatches.has(match.id || `match-${i}`);

              return (
                <div key={match.id || i} className="rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors overflow-hidden">
                  <div
                    className={`
                      flex sm:flex-row items-center justify-between p-3 sm:p-4 cursor-pointer
                      ${match.outcome === 'win' ? 'border-l-4 border-l-emerald-500' :
                        match.outcome === 'loss' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-slate-500'}
                    `}
                    onClick={() => toggleMatch(match.id || `match-${i}`)}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 overflow-hidden pr-2">

                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center font-black 
                        ${match.outcome === 'win' ? 'bg-emerald-500/20 text-emerald-400' :
                          match.outcome === 'loss' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}
                      `}>
                        {match.outcome === 'win' ? 'W' : match.outcome === 'loss' ? 'L' : 'D'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-white capitalize flex items-center gap-2 truncate">
                          <span className="truncate">{match.map_name.replace('de_', '')}</span>
                          {match.leetify_rating !== undefined && (
                            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${match.leetify_rating > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {match.leetify_rating > 0 ? '+' : ''}{match.leetify_rating.toFixed(2)}
                            </span>
                          )}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {getMatchDate(match.finished_at)}
                          </span>
                          <span className="hidden sm:inline">&bull;</span>
                          <span className="hidden sm:inline">ID: {match.id?.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-500 mt-1">{match.teammates?.length || 0} Teammates</p>
                      </div>
                      <div className="text-right mr-2">
                        <div className="text-xl font-black text-white tracking-widest">
                          <span className={match.outcome === 'win' ? 'text-emerald-400' : 'text-slate-400'}>{match.score?.[0]}</span>
                          <span className="text-slate-600 mx-1">-</span>
                          <span className={match.outcome === 'loss' ? 'text-red-400' : 'text-slate-400'}>{match.score?.[1]}</span>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* ── EXPANDED DETAILS (FETCHED DYNAMICALLY) ── */}
                  {isExpanded && (
                    <ExpandedMatchDetails
                      matchId={match.id}
                      currentPlayerId={player.steam64_id}
                      allPlayers={allPlayers}
                      matchScore={match.score}
                      matchOutcome={match.outcome}
                    />
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
