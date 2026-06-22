"use client";

import { useEffect, useState } from 'react';
import { Search, User, Trophy, Calendar, Sparkles, Activity, ShieldAlert, Target, Award, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [mounted, setMounted] = useState(false);

  const [players, setPlayers] = useState<PlayerAggregated[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Player Detail State
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [playerMatches, setPlayerMatches] = useState<MatchDetailHistory[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Set mounted state on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when selected player detail modal is open
  useEffect(() => {
    if (selectedPlayerName) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPlayerName]);

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
      case 'Arquero': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Defensa': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Centrocampista': return 'bg-emerald-500/10 text-emerald-455 border-emerald-500/20';
      case 'Delantero': return 'bg-rose-500/10 text-rose-455 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const selectedPlayerAggInfo = players.find(p => p.nameFull === selectedPlayerName);

  return (
    <div className="flex flex-col h-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 sm:p-6 lg:p-8 text-slate-100">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-emerald-400" />
            Estadísticas de Jugadores
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">
            Consulta los líderes de estadísticas o busca un jugador específico.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar jugador..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all placeholder:text-slate-500"
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
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4">
            Resultados de búsqueda ({searchResults.length})
          </h2>
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 rounded-[2rem] text-center text-slate-400">
              <User className="w-12 h-12 mb-3 text-slate-600" />
              <p className="font-semibold text-lg">No se encontraron jugadores para "{searchQuery}"</p>
              <p className="text-sm mt-1">Prueba escribiendo otro nombre.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
              {searchResults.map((player, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedPlayerName(player.nameFull)}
                  className="bg-[#0b1015]/60 border border-white/5 rounded-xl p-3.5 hover:bg-emerald-500/[0.03] hover:border-white/10 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.99] shadow-lg"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 font-bold text-xs">
                          {player.number || '#'}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-200 group-hover:text-emerald-400 transition-colors">
                            {player.nameFull || player.name}
                          </h3>
                          <span className={`inline-block text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 border rounded-full mt-0.5 ${getPositionBadgeColor(player.position)}`}>
                            {player.position}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-500 text-[10px] font-semibold">
                        {player.totalMatches} {player.totalMatches === 1 ? 'partido' : 'partidos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-black/40 rounded-lg p-2 border border-white/5 text-[10px]">
                      <div className="text-center border-r border-white/5">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold tracking-wider">P. Goles</span>
                        <span className="text-xs font-black text-emerald-400">{(player.goals / player.totalMatches).toFixed(1)}</span>
                      </div>
                      <div className="text-center border-r border-white/5">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold tracking-wider">P. Tiros</span>
                        <span className="text-xs font-black text-teal-400">{(player.shots / player.totalMatches).toFixed(1)}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold tracking-wider">P. Faltas</span>
                        <span className="text-xs font-black text-orange-400">{(player.foulsCommitted / player.totalMatches).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500">
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
        <div className="space-y-6 animate-fade-in">
          {/* Main Grid: Goals & Assists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 5 Goleadores */}
            <LeaderboardCard 
              title="Promedio de Goles" 
              icon={<Award className="w-4.5 h-4.5 text-emerald-400" />}
              data={topGoleadores}
              metricKey="goals"
              metricLabel="goles"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
            />

            {/* Top 5 Asistidores */}
            <LeaderboardCard 
              title="Promedio de Asistencias" 
              icon={<Sparkles className="w-4.5 h-4.5 text-indigo-400" />}
              data={topAsistidores}
              metricKey="assists"
              metricLabel="asistencias"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
            />
          </div>

          {/* Secondary Grid: Shots, Fouls & Saves */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Top 5 Tiros */}
            <LeaderboardCard 
              title="Promedio de Tiros" 
              icon={<Target className="w-4.5 h-4.5 text-teal-400" />}
              data={topTiros}
              metricKey="shots"
              metricLabel="tiros"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
            />

            {/* Top 5 Faltas Cometidas */}
            <LeaderboardCard 
              title="Promedio de Faltas Cometidas" 
              icon={<ShieldAlert className="w-4.5 h-4.5 text-orange-400" />}
              data={topFaltas}
              metricKey="foulsCommitted"
              metricLabel="faltas"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
            />

            {/* Top 5 Atajadas */}
            <LeaderboardCard 
              title="Promedio de Atajadas" 
              icon={<Activity className="w-4.5 h-4.5 text-yellow-400" />}
              data={topAtajadas}
              metricKey="saves"
              metricLabel="atajadas"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
            />
          </div>
        </div>
      )}

      {/* DETAIL MODAL PANEL */}
      {mounted && selectedPlayerName && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
          {/* Dismiss overlay */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedPlayerName(null)} />
          
          <div className="relative w-full max-w-md h-full bg-[#0b1015]/95 border-l border-white/10 shadow-2xl flex flex-col backdrop-blur-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-455 flex items-center justify-center font-black text-sm border border-emerald-500/20">
                  {selectedPlayerAggInfo?.number || '#'}
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-100">{selectedPlayerName}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[8px] uppercase font-black tracking-wider px-1.5 py-0.5 border rounded-full ${getPositionBadgeColor(selectedPlayerAggInfo?.position || '')}`}>
                      {selectedPlayerAggInfo?.position}
                    </span>
                    {selectedPlayerAggInfo?.age && (
                      <span className="text-[10px] text-slate-500">• {selectedPlayerAggInfo.age} años</span>
                    )}
                    {selectedPlayerAggInfo?.height && (
                      <span className="text-[10px] text-slate-500">• {selectedPlayerAggInfo.height}m</span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayerName(null)}
                className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full border border-white/10 transition-all flex items-center justify-center"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {/* Aggregated Quick Info */}
              <div className="grid grid-cols-3 gap-2 bg-black/20 rounded-xl p-2.5 border border-white/5">
                <div className="text-center border-r border-white/10">
                  <Activity className="w-3.5 h-3.5 mx-auto mb-1 text-teal-400" />
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Partidos</span>
                  <span className="text-sm font-black text-slate-200">{selectedPlayerAggInfo?.totalMatches || 0}</span>
                </div>
                <div className="text-center border-r border-white/10">
                  <Trophy className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Goles</span>
                  <span className="text-sm font-black text-emerald-400">{selectedPlayerAggInfo?.goals || 0}</span>
                </div>
                <div className="text-center">
                  <Sparkles className="w-3.5 h-3.5 mx-auto mb-1 text-amber-500" />
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Asistencias</span>
                  <span className="text-sm font-black text-amber-500">{selectedPlayerAggInfo?.assists || 0}</span>
                </div>
              </div>

              {/* Match History Details */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Historial de Partidos
                </h3>

                {loadingDetail ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin w-6 h-6 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent"></div>
                  </div>
                ) : playerMatches.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-6">No se encontraron detalles de partidos.</p>
                ) : (
                  <div className="space-y-3">
                    {playerMatches.map((m, idx) => {
                      const date = m.startTimestamp ? new Date(m.startTimestamp * 1000).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      }) : 'Fecha no disp.';
                      return (
                        <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-3 hover:border-white/10 transition-all">
                          {/* Match Header */}
                          <div className="flex justify-between items-start gap-3 mb-2.5 pb-2.5 border-b border-white/5">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-300">
                                <span>{m.homeTeam.name}</span>
                                <span className="bg-white/5 text-slate-400 px-1.5 py-0.2 rounded text-[9px] border border-white/5">
                                  {m.homeTeam.score} - {m.awayTeam.score}
                                </span>
                                <span>{m.awayTeam.name}</span>
                              </div>
                              <span className="text-[9px] text-slate-500 block mt-1">{date}</span>

                              {m.events && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {m.events.yellowCard && (
                                    <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[8px] px-1 py-0.2 rounded font-black tracking-wider">
                                      🟨 Amarilla
                                    </span>
                                  )}
                                  {m.events.redCard && (
                                    <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] px-1 py-0.2 rounded font-black tracking-wider">
                                      🟥 Roja
                                    </span>
                                  )}
                                  {m.events.subInMinute !== undefined && (
                                    <span className="bg-emerald-500/10 text-emerald-455 border border-emerald-500/20 text-[8px] px-1 py-0.2 rounded font-bold">
                                      🔄 Entró {m.events.subInMinute}'
                                    </span>
                                  )}
                                  {m.events.subOutMinute !== undefined && (
                                    <span className="bg-rose-500/10 text-rose-455 border border-rose-500/20 text-[8px] px-1 py-0.2 rounded font-bold">
                                      🔄 Salió {m.events.subOutMinute}'
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {m.status.type === 'inprogress' ? (
                              <span className="bg-emerald-500/10 text-emerald-455 text-[9px] px-1.5 py-0.2 border border-emerald-500/20 rounded-full font-bold">
                                EN VIVO
                              </span>
                            ) : (
                              <span className="bg-white/5 text-slate-500 text-[9px] px-1.5 py-0.2 rounded-full border border-white/5">
                                Finalizado
                              </span>
                            )}
                          </div>

                          {/* Individual Stats in Match */}
                          {m.stats ? (
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              {m.stats.minutesPlayed !== undefined && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Minutos</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.minutesPlayed}'</span>
                                </div>
                              )}
                              
                              {m.stats.goals !== undefined && m.stats.goals > 0 && (
                                <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 text-emerald-455">
                                  <span className="block text-[8px] uppercase font-bold tracking-wider opacity-85">Goles</span>
                                  <span className="font-extrabold text-xs">{m.stats.goals}</span>
                                </div>
                              )}

                              {m.stats.assists !== undefined && m.stats.assists > 0 && (
                                <div className="bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20 text-amber-500">
                                  <span className="block text-[8px] uppercase font-bold tracking-wider opacity-85">Asistencias</span>
                                  <span className="font-extrabold text-xs">{m.stats.assists}</span>
                                </div>
                              )}

                              {m.stats.shots !== undefined && m.stats.shots > 0 && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Tiros (Al arco)</span>
                                  <span className="font-extrabold text-slate-200">
                                    {m.stats.shots}
                                    {m.stats.shotsOnTarget !== undefined && ` (${m.stats.shotsOnTarget})`}
                                  </span>
                                </div>
                              )}

                              {m.stats.foulsCommitted !== undefined && m.stats.foulsCommitted > 0 && (
                                <div className="bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20 text-rose-455">
                                  <span className="block text-[8px] uppercase font-bold tracking-wider opacity-85">Faltas Cometidas</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.foulsCommitted}</span>
                                </div>
                              )}

                              {m.stats.foulsWon !== undefined && m.stats.foulsWon > 0 && (
                                <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 text-emerald-455">
                                  <span className="block text-[8px] uppercase font-bold tracking-wider opacity-85">Faltas Recibidas</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.foulsWon}</span>
                                </div>
                              )}

                              {m.stats.saves !== undefined && (m.position === 'Arquero' || m.stats.saves > 0) && (
                                <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 text-emerald-455">
                                  <span className="block text-[8px] uppercase font-bold tracking-wider opacity-85">Atajadas</span>
                                  <span className="font-extrabold text-xs">{m.stats.saves}</span>
                                </div>
                              )}

                              {m.stats.passes && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Pases</span>
                                  <span className="font-extrabold text-slate-200">
                                    {m.stats.passes.ok}/{m.stats.passes.total} 
                                    <small className="text-slate-500 font-normal ml-0.5">({m.stats.passes.total ? Math.round((m.stats.passes.ok / m.stats.passes.total) * 100) : 0}%)</small>
                                  </span>
                                </div>
                              )}

                              {m.stats.touches !== undefined && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Toques</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.touches}</span>
                                </div>
                              )}

                              {m.stats.tackles && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Entradas</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.tackles.ok}/{m.stats.tackles.total}</span>
                                </div>
                              )}

                              {m.stats.recoveries !== undefined && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Recuperaciones</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.recoveries}</span>
                                </div>
                              )}

                              {m.stats.interceptions !== undefined && m.stats.interceptions > 0 && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Intercepciones</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.interceptions}</span>
                                </div>
                              )}

                              {m.stats.clearances !== undefined && m.stats.clearances > 0 && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Despejes</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.clearances}</span>
                                </div>
                              )}

                              {m.stats.possessionLost !== undefined && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Pérdidas</span>
                                  <span className="font-extrabold text-slate-400">{m.stats.possessionLost}</span>
                                </div>
                              )}

                              {m.stats.dispossessed !== undefined && m.stats.dispossessed > 0 && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Quitado/Robado</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.dispossessed}</span>
                                </div>
                              )}

                              {m.stats.dribbles && m.stats.dribbles.total > 0 && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Regates</span>
                                  <span className="font-extrabold text-slate-200">
                                    {m.stats.dribbles.ok}/{m.stats.dribbles.total}
                                    <small className="text-slate-500 font-normal ml-0.5">({m.stats.dribbles.total ? Math.round((m.stats.dribbles.ok / m.stats.dribbles.total) * 100) : 0}%)</small>
                                  </span>
                                </div>
                              )}

                              {m.stats.groundDuels && m.stats.groundDuels.total > 0 && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Duelos Suelo</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.groundDuels.ok}/{m.stats.groundDuels.total}</span>
                                </div>
                              )}

                              {m.stats.aerialDuels && m.stats.aerialDuels.total > 0 && (
                                <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">Duelos Aéreos</span>
                                  <span className="font-extrabold text-slate-200">{m.stats.aerialDuels.ok}/{m.stats.aerialDuels.total}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-650">No hay estadísticas detalladas registradas para este partido.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
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
  isLight: boolean;
}

function LeaderboardCard({
  title,
  icon,
  data,
  metricKey,
  metricLabel,
  onPlayerClick,
  getPositionBadgeColor,
  isLight
}: LeaderboardCardProps) {
  return (
    <div className="bg-[#0b1015]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-xl transition-all duration-300">
      <div>
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-white/5">
          {icon}
          <h3 className="font-extrabold text-slate-200 text-xs tracking-wide uppercase">{title}</h3>
        </div>

        {data.length === 0 ? (
          <p className="text-slate-600 text-xs py-4 text-center">Aún no hay datos registrados.</p>
        ) : (
          <div className="space-y-1.5">
            {data.map((player, idx) => {
              const rankStyles = [
                'bg-amber-400/10 text-amber-500 border-amber-400/25',
                'bg-slate-350/15 text-slate-300 border-slate-350/20',
                'bg-amber-700/10 text-amber-600 border-amber-700/20',
                isLight ? 'bg-slate-100 text-slate-400 border-slate-200/60' : 'bg-white/5 text-slate-500 border-white/5',
                isLight ? 'bg-slate-100 text-slate-400 border-slate-200/60' : 'bg-white/5 text-slate-500 border-white/5',
              ];

              return (
                <div 
                  key={idx}
                  onClick={() => onPlayerClick(player.nameFull)}
                  className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center font-black text-[10px] border ${rankStyles[idx] || rankStyles[4]}`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-300 group-hover:text-emerald-400 transition-colors text-xs truncate block">
                        {player.nameFull || player.name}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-[7px] uppercase font-bold tracking-wider px-1 py-0.2 border rounded-full ${getPositionBadgeColor(player.position)}`}>
                          {player.position}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {player.totalMatches} {player.totalMatches === 1 ? 'partido' : 'partidos'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-xs font-black text-slate-200">
                      {player.average.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
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
