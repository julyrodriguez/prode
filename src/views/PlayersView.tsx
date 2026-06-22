"use client";

import { useEffect, useState } from 'react';
import { Search, User, Trophy, Calendar, Sparkles, Activity, ShieldAlert, Target, Award } from 'lucide-react';

interface PlayerAggregated {
  _id: string;
  name: string;
  nameFull: string;
  number: number;
  position: string;
  age?: number;
  height?: string;
  totalMatches: number;
  goals: number;
  assists: number;
  shots: number;
  foulsCommitted: number;
  saves: number;
}

interface MatchDetailHistory {
  matchId: number;
  homeTeam: { id: number; name: string; score: number };
  awayTeam: { id: number; name: string; score: number };
  startTimestamp: number;
  status: { type: string; description: string; minute: number | null };
  stats: Record<string, any>;
  number: number;
  position: string;
  age?: number;
  height?: string;
  events?: Record<string, any>;
}

export default function PlayersView() {
  const [players, setPlayers] = useState<PlayerAggregated[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Player Detail State
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [playerMatches, setPlayerMatches] = useState<MatchDetailHistory[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch players list on mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://apivacas.jariel.com.ar/api/mundial/players');
        if (!res.ok) throw new Error('Error al obtener la lista de jugadores');
        const json = await res.json();
        if (json.success) {
          setPlayers(json.data || []);
        }
      } catch (err: any) {
        setError(err.message || 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  // Fetch player details when selected
  useEffect(() => {
    if (!selectedPlayerName) {
      setPlayerMatches([]);
      return;
    }

    const fetchPlayerDetail = async () => {
      try {
        setLoadingDetail(true);
        const encodedName = encodeURIComponent(selectedPlayerName);
        const res = await fetch(`https://apivacas.jariel.com.ar/api/mundial/players/detail?name=${encodedName}`);
        if (!res.ok) throw new Error('Error al obtener el detalle del jugador');
        const json = await res.json();
        if (json.success) {
          setPlayerMatches(json.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchPlayerDetail();
  }, [selectedPlayerName]);

  // Calculations for Top 5 (based on averages)
  const getTop5 = (
    key: 'goals' | 'assists' | 'shots' | 'foulsCommitted' | 'saves',
    filterFn?: (p: PlayerAggregated) => boolean
  ) => {
    const list = filterFn ? players.filter(filterFn) : players;
    return [...list]
      .map(p => ({
        ...p,
        average: p.totalMatches > 0 ? p[key] / p.totalMatches : 0
      }))
      .filter(p => p[key] > 0) // only show if they have at least 1
      .sort((a, b) => b.average - a.average || b[key] - a[key])
      .slice(0, 5);
  };

  const topGoleadores = getTop5('goals');
  const topAsistidores = getTop5('assists');
  const topTiros = getTop5('shots');
  const topFaltas = getTop5('foulsCommitted');
  const topAtajadas = getTop5('saves', p => p.position === 'Arquero');

  // Search filter
  const searchResults = searchQuery.trim() === ''
    ? []
    : players.filter(p => 
        (p.nameFull || p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

  const getPositionBadgeColor = (pos: string) => {
    switch (pos) {
      case 'Arquero': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Defensa': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Centrocampista': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Delantero': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const selectedPlayerAggInfo = players.find(p => p.nameFull === selectedPlayerName);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
            <Trophy className="w-8 h-8 text-emerald-400" />
            Estadísticas del Mundial
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Consulta los líderes de estadísticas o busca un jugador específico.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar un jugador exacto (ej: Messi, J. David)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-sm mb-6 text-center">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent"></div>
        </div>
      ) : searchQuery.trim() !== '' ? (
        /* SEARCH RESULTS SCREEN */
        <div>
          <h2 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
            Resultados de búsqueda ({searchResults.length})
          </h2>
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/20 border border-slate-900/60 rounded-3xl text-center text-slate-400">
              <User className="w-12 h-12 mb-3 text-slate-600" />
              <p className="font-semibold text-lg">No se encontraron jugadores para "{searchQuery}"</p>
              <p className="text-sm mt-1">Prueba escribiendo otro nombre.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {searchResults.map((player, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedPlayerName(player.nameFull)}
                  className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 hover:bg-slate-900/80 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 font-bold text-sm">
                          {player.number || '#'}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                            {player.nameFull || player.name}
                          </h3>
                          <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full mt-1 ${getPositionBadgeColor(player.position)}`}>
                            {player.position}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-500 text-xs font-semibold">
                        {player.totalMatches} {player.totalMatches === 1 ? 'partido' : 'partidos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-950/40 rounded-xl p-2.5 border border-slate-950/20 text-xs">
                      <div className="text-center border-r border-slate-800/50">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Prom Goles</span>
                        <span className="text-sm font-black text-emerald-400">{(player.goals / player.totalMatches).toFixed(1)}</span>
                      </div>
                      <div className="text-center border-r border-slate-800/50">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Prom Tiros</span>
                        <span className="text-sm font-black text-teal-400">{(player.shots / player.totalMatches).toFixed(1)}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Prom Faltas</span>
                        <span className="text-sm font-black text-orange-400">{(player.foulsCommitted / player.totalMatches).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
                    <span>{player.age ? `${player.age} años` : ''}</span>
                    <span>{player.height ? `${player.height}m` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* LEADERBOARDS DASHBOARD SCREEN (TOP 5) */
        <div className="space-y-8 animate-fade-in">
          {/* Main Grid: Goals & Assists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Goleadores */}
            <LeaderboardCard 
              title="Promedio de Goles" 
              icon={<Award className="w-5 h-5 text-emerald-400" />}
              data={topGoleadores}
              metricKey="goals"
              metricLabel="goles"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
            />

            {/* Top 5 Asistidores */}
            <LeaderboardCard 
              title="Promedio de Asistencias" 
              icon={<Sparkles className="w-5 h-5 text-indigo-400" />}
              data={topAsistidores}
              metricKey="assists"
              metricLabel="asistencias"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
            />
          </div>

          {/* Secondary Grid: Shots, Fouls & Saves */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Top 5 Tiros */}
            <LeaderboardCard 
              title="Promedio de Tiros" 
              icon={<Target className="w-5 h-5 text-teal-400" />}
              data={topTiros}
              metricKey="shots"
              metricLabel="tiros"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
            />

            {/* Top 5 Faltas Cometidas */}
            <LeaderboardCard 
              title="Promedio de Faltas Cometidas" 
              icon={<ShieldAlert className="w-5 h-5 text-orange-400" />}
              data={topFaltas}
              metricKey="foulsCommitted"
              metricLabel="faltas"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
            />

            {/* Top 5 Atajadas */}
            <LeaderboardCard 
              title="Promedio de Atajadas" 
              icon={<Activity className="w-5 h-5 text-yellow-400" />}
              data={topAtajadas}
              metricKey="saves"
              metricLabel="atajadas"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
            />
          </div>
        </div>
      )}

      {/* DETAIL MODAL PANEL */}
      {selectedPlayerName && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Dismiss overlay */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedPlayerName(null)} />
          
          <div className="relative w-full max-w-2xl h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-lg border border-emerald-500/20">
                  {selectedPlayerAggInfo?.number || '#'}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-100">{selectedPlayerName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 border rounded-full ${getPositionBadgeColor(selectedPlayerAggInfo?.position || '')}`}>
                      {selectedPlayerAggInfo?.position}
                    </span>
                    {selectedPlayerAggInfo?.age && (
                      <span className="text-xs text-slate-500">• {selectedPlayerAggInfo.age} años</span>
                    )}
                    {selectedPlayerAggInfo?.height && (
                      <span className="text-xs text-slate-500">• {selectedPlayerAggInfo.height}m</span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayerName(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all"
              >
                Cerrar
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Aggregated Quick Info */}
              <div className="grid grid-cols-3 gap-4 bg-slate-900/30 rounded-2xl p-4 border border-slate-900">
                <div className="text-center border-r border-slate-800/80">
                  <Activity className="w-4 h-4 mx-auto mb-1 text-teal-400" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Partidos</span>
                  <span className="text-lg font-black text-slate-200">{selectedPlayerAggInfo?.totalMatches || 0}</span>
                </div>
                <div className="text-center border-r border-slate-800/80">
                  <Trophy className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Goles</span>
                  <span className="text-lg font-black text-emerald-400">{selectedPlayerAggInfo?.goals || 0}</span>
                </div>
                <div className="text-center">
                  <Sparkles className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Asistencias</span>
                  <span className="text-lg font-black text-indigo-400">{selectedPlayerAggInfo?.assists || 0}</span>
                </div>
              </div>

              {/* Match History Details */}
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Historial de Partidos
                </h3>

                {loadingDetail ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent"></div>
                  </div>
                ) : playerMatches.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No se encontraron detalles de partidos.</p>
                ) : (
                  <div className="space-y-4">
                    {playerMatches.map((m, idx) => {
                      const date = m.startTimestamp ? new Date(m.startTimestamp * 1000).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      }) : 'Fecha no disp.';
                      return (
                        <div key={idx} className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 hover:border-slate-800 transition-all">
                          {/* Match Header */}
                          <div className="flex justify-between items-start gap-4 mb-3 pb-3 border-b border-slate-900">
                            <div>
                              <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                                <span>{m.homeTeam.name}</span>
                                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                                  {m.homeTeam.score} - {m.awayTeam.score}
                                </span>
                                <span>{m.awayTeam.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-1">{date}</span>

                              {m.events && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {m.events.yellowCard && (
                                    <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider">
                                      🟨 Amarilla
                                    </span>
                                  )}
                                  {m.events.redCard && (
                                    <span className="bg-red-500/10 text-red-555 border border-red-500/20 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider">
                                      🟥 Roja
                                    </span>
                                  )}
                                  {m.events.subInMinute !== undefined && (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                      🔄 Entró {m.events.subInMinute}'
                                    </span>
                                  )}
                                  {m.events.subOutMinute !== undefined && (
                                    <span className="bg-rose-500/10 text-rose-455 border border-rose-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                      🔄 Salió {m.events.subOutMinute}'
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {m.status.type === 'inprogress' ? (
                              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 border border-emerald-500/20 rounded-full font-bold">
                                EN VIVO
                              </span>
                            ) : (
                              <span className="bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">
                                Finalizado
                              </span>
                            )}
                          </div>

                          {/* Individual Stats in Match */}
                          {m.stats ? (
                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2.5 text-xs">
                              {m.stats.minutesPlayed !== undefined && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Minutos</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.minutesPlayed}'</span>
                                </div>
                              )}
                              
                              {m.stats.goals !== undefined && m.stats.goals > 0 && (
                                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/25">
                                  <span className="text-emerald-400 block text-[9px] uppercase font-bold tracking-wider">Goles</span>
                                  <span className="font-extrabold text-emerald-400">{m.stats.goals}</span>
                                </div>
                              )}

                              {m.stats.assists !== undefined && m.stats.assists > 0 && (
                                <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/25">
                                  <span className="text-indigo-400 block text-[9px] uppercase font-bold tracking-wider">Asistencias</span>
                                  <span className="font-extrabold text-indigo-400">{m.stats.assists}</span>
                                </div>
                              )}

                              {m.stats.shots !== undefined && m.stats.shots > 0 && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Tiros (Al arco)</span>
                                  <span className="font-extrabold text-slate-300">
                                    {m.stats.shots}
                                    {m.stats.shotsOnTarget !== undefined && ` (${m.stats.shotsOnTarget})`}
                                  </span>
                                </div>
                              )}

                              {m.stats.foulsCommitted !== undefined && m.stats.foulsCommitted > 0 && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Faltas Cometidas</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.foulsCommitted}</span>
                                </div>
                              )}

                              {m.stats.foulsWon !== undefined && m.stats.foulsWon > 0 && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Faltas Recibidas</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.foulsWon}</span>
                                </div>
                              )}

                              {m.stats.saves !== undefined && (m.position === 'Arquero' || m.stats.saves > 0) && (
                                <div className="bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/25">
                                  <span className="text-yellow-400 block text-[9px] uppercase font-bold tracking-wider">Atajadas</span>
                                  <span className="font-extrabold text-yellow-400">{m.stats.saves}</span>
                                </div>
                              )}

                              {m.stats.passes && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Pases</span>
                                  <span className="font-extrabold text-slate-300">
                                    {m.stats.passes.ok}/{m.stats.passes.total} 
                                    <small className="text-slate-500 font-normal ml-0.5">({m.stats.passes.total ? Math.round((m.stats.passes.ok / m.stats.passes.total) * 100) : 0}%)</small>
                                  </span>
                                </div>
                              )}

                              {m.stats.touches !== undefined && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Toques</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.touches}</span>
                                </div>
                              )}

                              {m.stats.tackles && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Entradas</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.tackles.ok}/{m.stats.tackles.total}</span>
                                </div>
                              )}

                              {m.stats.recoveries !== undefined && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Recuperaciones</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.recoveries}</span>
                                </div>
                              )}

                              {m.stats.interceptions !== undefined && m.stats.interceptions > 0 && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Intercepciones</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.interceptions}</span>
                                </div>
                              )}

                              {m.stats.clearances !== undefined && m.stats.clearances > 0 && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Despejes</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.clearances}</span>
                                </div>
                              )}

                              {m.stats.possessionLost !== undefined && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Pérdidas</span>
                                  <span className="font-extrabold text-slate-400">{m.stats.possessionLost}</span>
                                </div>
                              )}

                              {m.stats.dispossessed !== undefined && m.stats.dispossessed > 0 && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Quitado/Robado</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.dispossessed}</span>
                                </div>
                              )}

                              {m.stats.dribbles && m.stats.dribbles.total > 0 && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Regates</span>
                                  <span className="font-extrabold text-slate-300">
                                    {m.stats.dribbles.ok}/{m.stats.dribbles.total}
                                    <small className="text-slate-500 font-normal ml-0.5">({m.stats.dribbles.total ? Math.round((m.stats.dribbles.ok / m.stats.dribbles.total) * 100) : 0}%)</small>
                                  </span>
                                </div>
                              )}

                              {m.stats.groundDuels && m.stats.groundDuels.total > 0 && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Duelos Suelo</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.groundDuels.ok}/{m.stats.groundDuels.total}</span>
                                </div>
                              )}

                              {m.stats.aerialDuels && m.stats.aerialDuels.total > 0 && (
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/40">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Duelos Aéreos</span>
                                  <span className="font-extrabold text-slate-300">{m.stats.aerialDuels.ok}/{m.stats.aerialDuels.total}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-600">No hay estadísticas detalladas registradas para este partido.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface LeaderboardCardProps {
  title: string;
  icon: React.ReactNode;
  data: any[];
  metricKey: string;
  metricLabel: string;
  onPlayerClick: (name: string) => void;
  getPositionBadgeColor: (pos: string) => string;
}

function LeaderboardCard({
  title,
  icon,
  data,
  metricKey,
  metricLabel,
  onPlayerClick,
  getPositionBadgeColor
}: LeaderboardCardProps) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-850">
          {icon}
          <h3 className="font-extrabold text-slate-200 text-sm tracking-wide uppercase">{title}</h3>
        </div>

        {data.length === 0 ? (
          <p className="text-slate-600 text-xs py-4 text-center">Aún no hay datos registrados.</p>
        ) : (
          <div className="space-y-3">
            {data.map((player, idx) => {
              const rankStyles = [
                'bg-amber-400/10 text-amber-400 border-amber-400/25',
                'bg-slate-300/10 text-slate-300 border-slate-300/20',
                'bg-amber-700/10 text-amber-600 border-amber-700/20',
                'bg-slate-800 text-slate-500 border-slate-800',
                'bg-slate-800 text-slate-500 border-slate-800',
              ];

              return (
                <div 
                  key={idx}
                  onClick={() => onPlayerClick(player.nameFull)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-850/50 transition-all cursor-pointer group active:scale-[0.98] border border-transparent hover:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs border ${rankStyles[idx] || rankStyles[4]}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-300 group-hover:text-emerald-400 transition-colors text-sm">
                        {player.nameFull || player.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 border rounded-full ${getPositionBadgeColor(player.position)}`}>
                          {player.position}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {player.totalMatches} {player.totalMatches === 1 ? 'partido' : 'partidos'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-sm font-black text-slate-200">
                      {player.average.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      {metricLabel} / p
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
