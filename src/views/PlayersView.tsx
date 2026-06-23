"use client";

import { useEffect, useState } from 'react';
import { Search, User, Trophy, Calendar, Sparkles, Activity, ShieldAlert, Target, Award, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';

const removeAccents = (str: string): string => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const formatSelectionName = (flag: string | null | undefined): string => {
  if (!flag) return '';
  const mapping: Record<string, string> = {
    'czech-republic': 'República Checa',
    'bosnia-herzegovina': 'Bosnia y Herzegovina',
    'cape-verde': 'Cabo Verde',
    'dr-congo': 'RD Congo',
    'ivory-coast': 'Costa de Marfil',
    'netherlands': 'Países Bajos',
    'new-zealand': 'Nueva Zelanda',
    'saudi-arabia': 'Arabia Saudita',
    'south-africa': 'Sudáfrica',
    'south-korea': 'Corea del Sur',
    'usa': 'EE. UU.',
    'england': 'Inglaterra',
    'france': 'Francia',
    'germany': 'Alemania',
    'japan': 'Japón',
    'spain': 'España',
    'turkey': 'Turquía',
    'belgium': 'Bélgica',
    'brazil': 'Brasil',
    'italy': 'Italia',
    'sweden': 'Suecia',
    'switzerland': 'Suiza',
    'croatia': 'Croacia',
    'morocco': 'Marruecos',
    'algeria': 'Argelia',
    'egypt': 'Egipto',
    'tunisia': 'Túnez',
    'uzbekistan': 'Uzbekistán'
  };
  if (mapping[flag]) return mapping[flag];
  return flag
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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
  selection?: string | null;
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

const getPlayerHistoryMinutes = (m: any): number => {
  if (!m) return 0;
  if (m.stats?.minutesPlayed !== undefined) {
    return m.stats.minutesPlayed;
  }
  if (m.events) {
    if (m.events.subInMinute !== undefined) {
      const out = m.events.subOutMinute !== undefined ? m.events.subOutMinute : 90;
      return Math.max(0, out - m.events.subInMinute);
    }
    if (m.events.subOutMinute !== undefined) {
      return m.events.subOutMinute;
    }
  }
  const hasAnyStatsOrEvents = (m.stats && Object.keys(m.stats).length > 0) || (m.events && Object.keys(m.events).length > 0);
  if (hasAnyStatsOrEvents) {
    return 90;
  }
  return 0;
};

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

  // Toggle mode: 'match' (per game) or 'minute' (per minute)
  const [statMode, setStatMode] = useState<'match' | 'minute'>('match');
  
  // Cache for total minutes of players: nameFull -> minutes
  const [playerMinutes, setPlayerMinutes] = useState<Record<string, number>>({});

  // Player nationality/country state
  const [playerCountry, setPlayerCountry] = useState<string | null>(null);

  // Visible matches limit state
  const [visibleMatchesLimit, setVisibleMatchesLimit] = useState(5);

  // Cache for search result details: nameFull -> MatchDetailHistory[]
  const [searchDetails, setSearchDetails] = useState<Record<string, MatchDetailHistory[]>>({});

  // Reset matches limit when player changes
  useEffect(() => {
    setVisibleMatchesLimit(5);
  }, [selectedPlayerName]);

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

  // Intercept browser back button / swipe gesture to close the modal
  useEffect(() => {
    if (!selectedPlayerName) return;

    window.history.pushState({ modalOpen: true }, '');

    const handlePopState = () => {
      setSelectedPlayerName(null);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
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
      setPlayerCountry(null);
      return;
    }

    const fetchPlayerDetail = async () => {
      try {
        setLoadingDetail(true);
        const encodedName = encodeURIComponent(selectedPlayerName);
        const res = await fetch(`https://apivacas.jariel.com.ar/api/mundial/players/detail?name=${encodedName}`);
        if (!res.ok) throw new Error('Error al obtener el detalle del jugador');
        const json = await res.json();
        if (json.success && json.data) {
          const matches = json.data || [];
          setPlayerMatches(matches);
          const country = await resolvePlayerCountry(matches, selectedPlayerName);
          setPlayerCountry(country);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchPlayerDetail();
  }, [selectedPlayerName]);

  // Helper to resolve player country from match history
  const resolvePlayerCountry = async (matches: MatchDetailHistory[], name: string): Promise<string | null> => {
    if (!matches || matches.length === 0) return null;

    if (matches.length > 1) {
      const counts: Record<string, number> = {};
      matches.forEach(m => {
        if (m.homeTeam?.name) counts[m.homeTeam.name] = (counts[m.homeTeam.name] || 0) + 1;
        if (m.awayTeam?.name) counts[m.awayTeam.name] = (counts[m.awayTeam.name] || 0) + 1;
      });
      const common = Object.keys(counts).find(team => counts[team] === matches.length);
      if (common) return common;
    }

    // Single match fallback lookup
    const singleMatch = matches[0];
    try {
      const res = await fetch(`https://apivacas.jariel.com.ar/api/matches/detail/${singleMatch.matchId}`);
      if (res.ok) {
        const matchDetail = await res.json();
        const lineups = matchDetail.lineups;
        if (lineups) {
          const matchName = (p: any) => {
            const pName = p.player?.name?.toLowerCase() || '';
            const pShort = p.player?.shortName?.toLowerCase() || '';
            const search = name.toLowerCase();
            return pName.includes(search) || search.includes(pName) || pShort.includes(search) || search.includes(pShort);
          };

          const homePlayers = lineups.home?.players || [];
          const inHome = homePlayers.some(matchName);
          if (inHome) return singleMatch.homeTeam?.name || null;

          const awayPlayers = lineups.away?.players || [];
          const inAway = awayPlayers.some(matchName);
          if (inAway) return singleMatch.awayTeam?.name || null;
        }
      }
    } catch (e) {
      console.error('Error resolving country', e);
    }

    return singleMatch.homeTeam?.name || null;
  };

  // Helper to fetch details for multiple players (stores in searchDetails and playerMinutes)
  const fetchDetailsForPlayers = async (names: string[]) => {
    const namesToFetch = names.filter(name => searchDetails[name] === undefined);
    if (namesToFetch.length === 0) return;

    // Set to empty array loading indicator
    setSearchDetails(prev => {
      const next = { ...prev };
      namesToFetch.forEach(name => {
        next[name] = [];
      });
      return next;
    });

    const fetchOne = async (name: string) => {
      try {
        const encodedName = encodeURIComponent(name);
        const res = await fetch(`https://apivacas.jariel.com.ar/api/mundial/players/detail?name=${encodedName}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (json.success && json.data) {
          const matches: MatchDetailHistory[] = json.data;
          const totalMin = matches.reduce((acc, m) => acc + getPlayerHistoryMinutes(m), 0);
          return { name, matches, minutes: totalMin };
        }
      } catch (e) {
        console.error('Error fetching detail for ' + name, e);
      }
      return { name, matches: null, minutes: 0 };
    };

    try {
      const results = await Promise.all(namesToFetch.map(name => fetchOne(name)));
      
      setSearchDetails(prev => {
        const next = { ...prev };
        results.forEach(res => {
          if (res.matches) {
            next[res.name] = res.matches;
          } else {
            delete next[res.name];
          }
        });
        return next;
      });

      setPlayerMinutes(prev => {
        const next = { ...prev };
        results.forEach(res => {
          if (res.matches) {
            next[res.name] = res.minutes;
          } else {
            next[res.name] = 0;
          }
        });
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to compute searched player statistics for the card preview
  const getSearchPlayerStats = (playerName: string) => {
    const matches = searchDetails[playerName];
    if (!matches || matches.length === 0) return null;

    return matches.reduce((acc, m) => {
      const s = m.stats || {};
      acc.saves += s.saves || 0;
      if (s.passes) {
        acc.passesOk += s.passes.ok || 0;
        acc.passesTotal += s.passes.total || 0;
      }
      acc.clearances += s.clearances || 0;
      if (s.tackles) {
        acc.tacklesOk += s.tackles.ok || 0;
        acc.tacklesTotal += s.tackles.total || 0;
      }
      return acc;
    }, {
      saves: 0,
      passesOk: 0,
      passesTotal: 0,
      clearances: 0,
      tacklesOk: 0,
      tacklesTotal: 0
    });
  };

  // Search filter
  const searchResults = searchQuery.trim().length < 3
    ? []
    : players.filter(p => {
        const query = removeAccents(searchQuery.toLowerCase());
        const nameText = removeAccents((p.nameFull || p.name || '').toLowerCase());
        const selectionFlagText = p.selection ? removeAccents(p.selection.toLowerCase()) : '';
        const selectionFormattedText = p.selection ? removeAccents(formatSelectionName(p.selection).toLowerCase()) : '';
        
        return nameText.includes(query) || 
               selectionFlagText.includes(query) || 
               selectionFormattedText.includes(query);
      });

  // Fetch details for search results
  useEffect(() => {
    if (searchResults.length === 0) return;
    const searchNames = searchResults.map(p => p.nameFull);
    fetchDetailsForPlayers(searchNames);
  }, [searchResults]);

  // Calculations for leaderboards (supporting per match / per minute)
  const getTop5 = (
    key: 'goals' | 'assists' | 'shots' | 'foulsCommitted' | 'saves' | 'goalsAssists',
    filterFn?: (p: PlayerAggregated) => boolean
  ) => {
    const list = filterFn ? players.filter(filterFn) : players;
    return [...list]
      .map(p => {
        const goals = p.goals || 0;
        const assists = p.assists || 0;
        const val = key === 'goalsAssists' ? (goals + assists) : (p[key] as number || 0);
        
        const matchesList = searchDetails[p.nameFull];
        const actualMatchesCount = matchesList
          ? matchesList.filter(m => m.status?.type !== 'notstarted' && getPlayerHistoryMinutes(m) > 0).length || 1
          : p.totalMatches;

        let avg = 0;
        if (statMode === 'minute') {
          const min = playerMinutes[p.nameFull];
          if (min && min > 0) {
            avg = (val / min) * 90; // Normalized to 90 mins for standard display
          } else {
            avg = actualMatchesCount > 0 ? (val / (actualMatchesCount * 90)) * 90 : 0;
          }
        } else {
          avg = actualMatchesCount > 0 ? val / actualMatchesCount : 0;
        }

        return {
          ...p,
          totalMatches: actualMatchesCount,
          goalsAssists: goals + assists,
          average: avg,
          rawVal: val
        };
      })
      .filter(p => p.rawVal > 0)
      .sort((a, b) => b.average - a.average || b.rawVal - a.rawVal)
      .slice(0, 5);
  };

  const topGoleadores = getTop5('goals');
  const topAsistidores = getTop5('assists');
  const topGolesAsistencias = getTop5('goalsAssists');
  const topTiros = getTop5('shots');
  const topFaltas = getTop5('foulsCommitted');
  const topAtajadas = getTop5('saves', p => p.position === 'Arquero' || p.position === 'Goalkeeper');

  // Fetch minutes for leaderboard players
  useEffect(() => {
    if (players.length === 0) return;
    const topNames = new Set<string>();
    
    // Prefetch for both modes to ensure instant response
    ['goals', 'assists', 'goalsAssists', 'shots', 'foulsCommitted', 'saves'].forEach(key => {
      const listMatch = [...players]
        .map(p => {
          const val = key === 'goalsAssists' ? (p.goals + p.assists) : (p[key as keyof PlayerAggregated] as number || 0);
          return { ...p, rawVal: val, average: p.totalMatches > 0 ? val / p.totalMatches : 0 };
        })
        .filter(p => p.rawVal > 0)
        .sort((a, b) => b.average - a.average || b.rawVal - a.rawVal)
        .slice(0, 10); // get top 10
      
      listMatch.forEach(p => topNames.add(p.nameFull));
    });

    fetchDetailsForPlayers(Array.from(topNames));
  }, [players]);

  const getPositionBadgeColor = (pos: string) => {
    switch (pos) {
      case 'Arquero':
      case 'Goalkeeper':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Defensa':
      case 'Defensor':
      case 'Defender':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Centrocampista':
      case 'Mediocampista':
      case 'Volante Central':
      case 'Midfielder':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Delantero':
      case 'Enganche':
      case 'Forward':
      case 'Striker':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const selectedPlayerAggInfo = players.find(p => p.nameFull === selectedPlayerName);

  // Compute minutes and aggregated stats for modal
  const totalMin = playerMatches.reduce((acc, m) => acc + getPlayerHistoryMinutes(m), 0);
  const playedMatchesCount = playerMatches.filter(m => getPlayerHistoryMinutes(m) > 0).length || 1;
  const avgMinutes = totalMin / playedMatchesCount;

  const aggregated = playerMatches.reduce((acc, m) => {
    const s = m.stats || {};
    acc.minutesPlayed += s.minutesPlayed || 0;
    acc.goals += s.goals || 0;
    acc.assists += s.assists || 0;
    acc.shots += s.shots || 0;
    acc.shotsOnTarget += s.shotsOnTarget || 0;
    acc.foulsCommitted += s.foulsCommitted || 0;
    acc.foulsWon += s.foulsWon || 0;
    acc.saves += s.saves || 0;
    if (s.passes) {
      acc.passesOk += s.passes.ok || 0;
      acc.passesTotal += s.passes.total || 0;
    }
    acc.touches += s.touches || 0;
    if (s.tackles) {
      acc.tacklesOk += s.tackles.ok || 0;
      acc.tacklesTotal += s.tackles.total || 0;
    }
    acc.recoveries += s.recoveries || 0;
    acc.interceptions += s.interceptions || 0;
    acc.clearances += s.clearances || 0;
    acc.possessionLost += s.possessionLost || 0;
    acc.dispossessed += s.dispossessed || 0;
    if (s.dribbles) {
      acc.dribblesOk += s.dribbles.ok || 0;
      acc.dribblesTotal += s.dribbles.total || 0;
    }
    if (s.groundDuels) {
      acc.groundDuelsOk += s.groundDuels.ok || 0;
      acc.groundDuelsTotal += s.groundDuels.total || 0;
    }
    if (s.aerialDuels) {
      acc.aerialDuelsOk += s.aerialDuels.ok || 0;
      acc.aerialDuelsTotal += s.aerialDuels.total || 0;
    }
    return acc;
  }, {
    minutesPlayed: 0,
    goals: 0,
    assists: 0,
    shots: 0,
    shotsOnTarget: 0,
    foulsCommitted: 0,
    foulsWon: 0,
    saves: 0,
    passesOk: 0,
    passesTotal: 0,
    touches: 0,
    tacklesOk: 0,
    tacklesTotal: 0,
    recoveries: 0,
    interceptions: 0,
    clearances: 0,
    possessionLost: 0,
    dispossessed: 0,
    dribblesOk: 0,
    dribblesTotal: 0,
    groundDuelsOk: 0,
    groundDuelsTotal: 0,
    aerialDuelsOk: 0,
    aerialDuelsTotal: 0
  });

  const statsList = [
    { label: 'Goles', value: aggregated.goals },
    { label: 'Asistencias', value: aggregated.assists },
    { label: 'Goles + Asistencias', value: aggregated.goals + aggregated.assists },
    { label: 'Tiros', value: aggregated.shots },
    { label: 'Tiros al Arco', value: aggregated.shotsOnTarget },
    { label: 'Faltas Cometidas', value: aggregated.foulsCommitted },
    { label: 'Faltas Recibidas', value: aggregated.foulsWon },
    { label: 'Atajadas', value: aggregated.saves, show: (selectedPlayerAggInfo?.position === 'Arquero' || selectedPlayerAggInfo?.position === 'Goalkeeper' || aggregated.saves > 0) },
    { label: 'Recuperaciones', value: aggregated.recoveries },
    { label: 'Intercepciones', value: aggregated.interceptions },
    { label: 'Despejes', value: aggregated.clearances },
    { label: 'Toques', value: aggregated.touches },
    { label: 'Pérdidas', value: aggregated.possessionLost },
    { label: 'Quitado/Robado', value: aggregated.dispossessed },
    { 
      label: 'Pases', 
      value: aggregated.passesOk, 
      extra: aggregated.passesTotal ? `${aggregated.passesOk}/${aggregated.passesTotal} (${Math.round((aggregated.passesOk/aggregated.passesTotal)*100)}%)` : null 
    },
    { 
      label: 'Regates', 
      value: aggregated.dribblesOk, 
      extra: aggregated.dribblesTotal ? `${aggregated.dribblesOk}/${aggregated.dribblesTotal} (${Math.round((aggregated.dribblesOk/aggregated.dribblesTotal)*100)}%)` : null 
    },
    { 
      label: 'Entradas', 
      value: aggregated.tacklesOk, 
      extra: aggregated.tacklesTotal ? `${aggregated.tacklesOk}/${aggregated.tacklesTotal} (${Math.round((aggregated.tacklesOk/aggregated.tacklesTotal)*100)}%)` : null 
    },
    { 
      label: 'Duelos Suelo', 
      value: aggregated.groundDuelsOk, 
      extra: aggregated.groundDuelsTotal ? `${aggregated.groundDuelsOk}/${aggregated.groundDuelsTotal} (${Math.round((aggregated.groundDuelsOk/aggregated.groundDuelsTotal)*100)}%)` : null 
    },
    { 
      label: 'Duelos Aéreos', 
      value: aggregated.aerialDuelsOk, 
      extra: aggregated.aerialDuelsTotal ? `${aggregated.aerialDuelsOk}/${aggregated.aerialDuelsTotal} (${Math.round((aggregated.aerialDuelsOk/aggregated.aerialDuelsTotal)*100)}%)` : null 
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 sm:p-4 text-slate-100">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-1.5">
            <Trophy className="w-5 h-5 text-emerald-400" />
            Estadísticas de Jugadores
          </h2>
          <p className="text-slate-400 text-[10px] mt-0.5 font-medium">
            Consulta los líderes de estadísticas o busca un jugador específico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Mode */}
          <div className="flex items-center gap-0.5 bg-black/20 p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setStatMode('match')}
              className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${statMode === 'match' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Por Partido
            </button>
            <button
              onClick={() => setStatMode('minute')}
              className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${statMode === 'minute' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Por Minuto
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar jugador..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3 text-xs mb-4 text-center">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent"></div>
        </div>
      ) : (searchQuery.trim().length > 0 && searchQuery.trim().length < 3) ? (
        /* SEARCH INSTRUCTIONS */
        <div className="flex flex-col items-center justify-center p-8 bg-white/[0.02] border border-white/5 rounded-2xl text-center text-slate-400 animate-fade-in">
          <Search className="w-8 h-8 mb-2 text-slate-500" />
          <p className="font-bold text-sm text-slate-350">Búsqueda rápida</p>
          <p className="text-[11px] text-slate-500 mt-1">Escribe al menos 3 letras para comenzar la búsqueda de un jugador.</p>
        </div>
      ) : searchQuery.trim().length >= 3 ? (
        /* SEARCH RESULTS SCREEN (4 columns) */
        <div>
          <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
            Resultados de búsqueda ({searchResults.length})
          </h2>
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-white/[0.02] border border-white/5 rounded-2xl text-center text-slate-400">
              <User className="w-10 h-10 mb-2.5 text-slate-655" />
              <p className="font-bold text-base">No se encontraron jugadores</p>
              <p className="text-xs mt-0.5">Prueba escribiendo otro nombre.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 animate-fade-in">
              {searchResults.map((player, idx) => {
                const detailLoaded = searchDetails[player.nameFull] !== undefined && searchDetails[player.nameFull].length > 0;
                const actualMatchesCount = detailLoaded
                  ? searchDetails[player.nameFull].filter(m => m.status?.type !== 'notstarted' && getPlayerHistoryMinutes(m) > 0).length || 1
                  : player.totalMatches;
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPlayerName(player.nameFull)}
                    className="bg-[#0b1015]/60 border border-white/5 rounded-lg p-2.5 hover:bg-emerald-500/[0.03] hover:border-white/10 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.99] shadow"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-6 h-6 rounded bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                            {player.number || '#'}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-xs text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                              {player.nameFull || player.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              <span className={`inline-block text-[6px] uppercase font-bold tracking-wider px-1 py-0.2 border rounded-full ${getPositionBadgeColor(player.position)}`}>
                                {player.position}
                              </span>
                              {player.selection && (
                                <span className="inline-flex items-center gap-1 text-[8px] text-slate-400 font-medium bg-white/5 px-1 py-0.2 border border-white/5 rounded-full shrink-0">
                                  <img
                                    src={`https://img.icons8.com/color/20/000000/${player.selection}.png`}
                                    alt={player.selection}
                                    className="w-2.5 h-2.5 object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                  {formatSelectionName(player.selection)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-slate-500 text-[9px] font-semibold shrink-0">
                          {actualMatchesCount} {actualMatchesCount === 1 ? 'partido' : 'partidos'}
                        </span>
                      </div>

                      {(() => {
                        const pos = player.position || '';
                        const isArquero = pos === 'Arquero' || pos === 'Goalkeeper';
                        const isDefensor = pos === 'Defensa' || pos === 'Defensor' || pos === 'Defender';
                        
                        const s = detailLoaded ? getSearchPlayerStats(player.nameFull) : null;
                        
                        if (isArquero) {
                          let displaySaves = '...';
                          let displayPasses = '...';
                          let displayClearances = '...';

                          if (detailLoaded && s) {
                            displaySaves = statMode === 'minute'
                              ? (playerMinutes[player.nameFull] > 0 ? ((s.saves / playerMinutes[player.nameFull]) * 90).toFixed(2) : '0.00')
                              : (s.saves / actualMatchesCount).toFixed(1);
                            displayPasses = s.passesTotal > 0 ? `${s.passesOk}/${s.passesTotal}` : '0/0';
                            displayClearances = statMode === 'minute'
                              ? (playerMinutes[player.nameFull] > 0 ? ((s.clearances / playerMinutes[player.nameFull]) * 90).toFixed(2) : '0.00')
                              : (s.clearances / actualMatchesCount).toFixed(1);
                          } else if (!detailLoaded) {
                            displaySaves = statMode === 'minute' ? '...' : (player.saves / actualMatchesCount).toFixed(1);
                          }

                          return (
                            <div className="grid grid-cols-3 gap-1 bg-black/40 rounded-md p-1.5 border border-white/5 text-[9px]">
                              <div className="text-center border-r border-white/5">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold tracking-wider">
                                  {statMode === 'minute' ? 'Atajadas x90\'' : 'P. Atajadas'}
                                </span>
                                <span className="text-[11px] font-black text-amber-500">
                                  {displaySaves}
                                </span>
                              </div>
                              <div className="text-center border-r border-white/5">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold tracking-wider">Pases (Ok)</span>
                                <span className="text-[11px] font-black text-emerald-400">
                                  {displayPasses}
                                </span>
                              </div>
                              <div className="text-center">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold tracking-wider">
                                  {statMode === 'minute' ? 'Despejes x90\'' : 'P. Despejes'}
                                </span>
                                <span className="text-[11px] font-black text-teal-400">
                                  {displayClearances}
                                </span>
                              </div>
                            </div>
                          );
                        } else if (isDefensor) {
                          let displayShots = '...';
                          let displayFouls = '...';
                          let displayTackles = '...';

                          if (detailLoaded && s) {
                            displayShots = statMode === 'minute'
                              ? (playerMinutes[player.nameFull] > 0 ? ((player.shots / playerMinutes[player.nameFull]) * 90).toFixed(2) : '0.00')
                              : (player.shots / actualMatchesCount).toFixed(1);
                            displayFouls = statMode === 'minute'
                              ? (playerMinutes[player.nameFull] > 0 ? ((player.foulsCommitted / playerMinutes[player.nameFull]) * 90).toFixed(2) : '0.00')
                              : (player.foulsCommitted / actualMatchesCount).toFixed(1);
                            displayTackles = s.tacklesTotal > 0 ? `${s.tacklesOk}/${s.tacklesTotal}` : '0/0';
                          } else if (!detailLoaded) {
                            displayShots = statMode === 'minute' ? '...' : (player.shots / actualMatchesCount).toFixed(1);
                            displayFouls = statMode === 'minute' ? '...' : (player.foulsCommitted / actualMatchesCount).toFixed(1);
                          }

                          return (
                            <div className="grid grid-cols-3 gap-1 bg-black/40 rounded-md p-1.5 border border-white/5 text-[9px]">
                              <div className="text-center border-r border-white/5">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold tracking-wider">
                                  {statMode === 'minute' ? 'Tiros x90\'' : 'P. Tiros'}
                                </span>
                                <span className="text-[11px] font-black text-teal-400">
                                  {displayShots}
                                </span>
                              </div>
                              <div className="text-center border-r border-white/5">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold tracking-wider">
                                  {statMode === 'minute' ? 'Faltas x90\'' : 'P. Faltas'}
                                </span>
                                <span className="text-[11px] font-black text-orange-400">
                                  {displayFouls}
                                </span>
                              </div>
                              <div className="text-center">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold tracking-wider">Entradas</span>
                                <span className="text-[11px] font-black text-emerald-400">
                                  {displayTackles}
                                </span>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="grid grid-cols-3 gap-1 bg-black/40 rounded-md p-1.5 border border-white/5 text-[9px]">
                              <div className="text-center border-r border-white/5">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold tracking-wider">
                                  {statMode === 'minute' ? 'Goles x90\'' : 'P. Goles'}
                                </span>
                                <span className="text-[11px] font-black text-emerald-400">
                                  {statMode === 'minute'
                                    ? (playerMinutes[player.nameFull] && playerMinutes[player.nameFull] > 0
                                        ? ((player.goals / playerMinutes[player.nameFull]) * 90).toFixed(2)
                                        : '...')
                                    : (player.goals / actualMatchesCount).toFixed(1)}
                                </span>
                              </div>
                              <div className="text-center border-r border-white/5">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold tracking-wider">
                                  {statMode === 'minute' ? 'Tiros x90\'' : 'P. Tiros'}
                                </span>
                                <span className="text-[11px] font-black text-teal-400">
                                  {statMode === 'minute'
                                    ? (playerMinutes[player.nameFull] && playerMinutes[player.nameFull] > 0
                                        ? ((player.shots / playerMinutes[player.nameFull]) * 90).toFixed(2)
                                        : '...')
                                    : (player.shots / actualMatchesCount).toFixed(1)}
                                </span>
                              </div>
                              <div className="text-center">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold tracking-wider">
                                  {statMode === 'minute' ? 'Faltas x90\'' : 'P. Faltas'}
                                </span>
                                <span className="text-[11px] font-black text-orange-400">
                                  {statMode === 'minute'
                                    ? (playerMinutes[player.nameFull] && playerMinutes[player.nameFull] > 0
                                        ? ((player.foulsCommitted / playerMinutes[player.nameFull]) * 90).toFixed(2)
                                        : '...')
                                    : (player.foulsCommitted / actualMatchesCount).toFixed(1)}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-white/5 flex justify-between items-center text-[9px] text-slate-500">
                      <span>{player.age ? `${player.age} años` : ''}</span>
                      <span>{player.height ? `${player.height}m` : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* LEADERBOARDS DASHBOARD SCREEN (3x2 layout, smaller) */
        <div className="space-y-3 animate-fade-in">
          {/* Main Grid: Goals, Assists & G+A */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <LeaderboardCard 
              title="Promedio de Goles" 
              icon={<Award className="w-4 h-4 text-emerald-400" />}
              data={topGoleadores}
              metricKey="goals"
              metricLabel="goles"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
              statMode={statMode}
              playerMinutes={playerMinutes}
            />

            <LeaderboardCard 
              title="Promedio de Asistencias" 
              icon={<Sparkles className="w-4 h-4 text-indigo-400" />}
              data={topAsistidores}
              metricKey="assists"
              metricLabel="asistencias"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
              statMode={statMode}
              playerMinutes={playerMinutes}
            />

            <LeaderboardCard 
              title="Goles + Asistencias (G+A)" 
              icon={<Trophy className="w-4 h-4 text-amber-500" />}
              data={topGolesAsistencias}
              metricKey="goalsAssists"
              metricLabel="G+A"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
              statMode={statMode}
              playerMinutes={playerMinutes}
            />
          </div>

          {/* Secondary Grid: Shots, Fouls & Saves */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <LeaderboardCard 
              title="Promedio de Tiros" 
              icon={<Target className="w-4 h-4 text-teal-400" />}
              data={topTiros}
              metricKey="shots"
              metricLabel="tiros"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
              statMode={statMode}
              playerMinutes={playerMinutes}
            />

            <LeaderboardCard 
              title="Promedio de Faltas" 
              icon={<ShieldAlert className="w-4 h-4 text-orange-400" />}
              data={topFaltas}
              metricKey="foulsCommitted"
              metricLabel="faltas"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
              statMode={statMode}
              playerMinutes={playerMinutes}
            />

            <LeaderboardCard 
              title="Promedio de Atajadas" 
              icon={<Activity className="w-4 h-4 text-yellow-400" />}
              data={topAtajadas}
              metricKey="saves"
              metricLabel="atajadas"
              onPlayerClick={setSelectedPlayerName}
              getPositionBadgeColor={getPositionBadgeColor}
              isLight={isLight}
              statMode={statMode}
              playerMinutes={playerMinutes}
            />
          </div>
        </div>
      )}

      {/* DETAIL MODAL PANEL */}
      {mounted && selectedPlayerName && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          {/* Dismiss overlay */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedPlayerName(null)} />
          
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-3xl lg:max-w-5xl max-h-[85vh] sm:max-h-[90vh] bg-[#0b1015] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden shadow-emerald-500/5">
            {/* Modal Header */}
            <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/20 shrink-0">
                  {selectedPlayerAggInfo?.number || '#'}
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-100">{selectedPlayerName}</h2>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <span className={`text-[6px] uppercase font-black tracking-wider px-1 py-0.2 border rounded-full ${getPositionBadgeColor(selectedPlayerAggInfo?.position || '')}`}>
                      {selectedPlayerAggInfo?.position}
                    </span>
                    {playerCountry && (
                      <span className="text-[9px] text-emerald-400 font-bold">• {playerCountry}</span>
                    )}
                    {selectedPlayerAggInfo?.age && (
                      <span className="text-[9px] text-slate-500">• {selectedPlayerAggInfo.age} años</span>
                    )}
                    {selectedPlayerAggInfo?.height && (
                      <span className="text-[9px] text-slate-500">• {selectedPlayerAggInfo.height}m</span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayerName(null)}
                className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1 rounded-full border border-white/10 transition-all flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
              {/* Aggregated Quick Info */}
              <div className="grid grid-cols-5 gap-1 bg-black/20 rounded-lg p-1.5 border border-white/5 text-[9px]">
                <div className="text-center border-r border-white/10">
                  <Calendar className="w-3 h-3 mx-auto mb-0.5 text-slate-400" />
                  <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider block">Partidos</span>
                  <span className="text-xs font-black text-slate-200">
                    {playerMatches.filter(m => m.status?.type !== 'notstarted' && getPlayerHistoryMinutes(m) > 0).length}
                  </span>
                </div>
                <div className="text-center border-r border-white/10">
                  <Activity className="w-3 h-3 mx-auto mb-0.5 text-teal-400" />
                  <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider block">Min. Totales</span>
                  <span className="text-xs font-black text-slate-200">{totalMin}</span>
                </div>
                <div className="text-center border-r border-white/10">
                  <Activity className="w-3 h-3 mx-auto mb-0.5 text-indigo-400" />
                  <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider block">Min. Promedio</span>
                  <span className="text-xs font-black text-slate-200">{avgMinutes.toFixed(1)}'</span>
                </div>
                <div className="text-center border-r border-white/10">
                  <Award className="w-3 h-3 mx-auto mb-0.5 text-emerald-400" />
                  <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider block">Goles</span>
                  <span className="text-xs font-black text-emerald-400">{selectedPlayerAggInfo?.goals || 0}</span>
                </div>
                <div className="text-center">
                  <Sparkles className="w-3 h-3 mx-auto mb-0.5 text-amber-500" />
                  <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider block">Asistencias</span>
                  <span className="text-xs font-black text-amber-500">{selectedPlayerAggInfo?.assists || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start space-y-3 md:space-y-0">
                {/* Aggregated Stats Table */}
                <div className="bg-black/20 border border-white/5 rounded-xl p-2.5">
                <h3 className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" /> Estadísticas Acumuladas
                </h3>
                
                <div className="overflow-x-auto -mx-2.5 px-2.5">
                  <table className="w-full text-left text-[9px] text-slate-350 border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[8px] uppercase tracking-wider text-slate-500">
                        <th className="py-1 font-bold">Estadística</th>
                        <th className="py-1 text-right font-bold">Total</th>
                        <th className="py-1 text-right font-bold">x Part</th>
                        <th className="py-1 text-right font-bold">x Prom</th>
                        <th className="py-1 text-right font-bold">x 90'</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {statsList.map((st, i) => {
                        if (st.show === false) return null;
                        const matchesCount = playerMatches.filter(m => m.status?.type !== 'notstarted' && getPlayerHistoryMinutes(m) > 0).length || 1;
                        const perMatch = (st.value / matchesCount).toFixed(2);
                        const perProm = totalMin > 0 ? ((st.value / totalMin) * avgMinutes).toFixed(2) : '0.00';
                        const per90 = totalMin > 0 ? ((st.value / totalMin) * 90).toFixed(2) : '0.00';
                        return (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="py-1 pr-1.5 text-slate-300 font-medium whitespace-nowrap">
                              {st.label}
                              {st.extra && <span className="block text-[7px] text-slate-500 font-normal mt-0.5">{st.extra}</span>}
                            </td>
                            <td className="py-1 text-right text-slate-100 font-semibold">{st.value}</td>
                            <td className="py-1 text-right text-emerald-400 font-semibold">{perMatch}</td>
                            <td className="py-1 text-right text-amber-500 font-semibold">{perProm}</td>
                            <td className="py-1 text-right text-teal-400 font-semibold">{per90}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Match History Details */}
              <div>
                <h3 className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" /> Historial de Partidos
                </h3>

                {loadingDetail ? (
                  <div className="flex justify-center p-6">
                    <div className="animate-spin w-5 h-5 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent"></div>
                  </div>
                ) : playerMatches.length === 0 ? (
                  <p className="text-slate-500 text-[10px] text-center py-4">No se encontraron detalles de partidos.</p>
                ) : (
                  <div className="space-y-2">
                    {[...playerMatches]
                      .sort((a, b) => b.startTimestamp - a.startTimestamp)
                      .slice(0, visibleMatchesLimit)
                      .map((m, idx) => {
                        const date = m.startTimestamp ? new Date(m.startTimestamp * 1000).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        }) : 'Fecha no disp.';
                        return (
                          <div key={idx} className="bg-black/20 border border-white/5 rounded-lg p-2 hover:border-white/10 transition-all">
                            {/* Match Header */}
                            <div className="flex justify-between items-start gap-2 mb-1.5 pb-1.5 border-b border-white/5">
                              <div>
                                <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-slate-300">
                                  <span>{m.homeTeam.name}</span>
                                  <span className="bg-white/5 text-slate-400 px-1 py-0.2 rounded text-[8px] border border-white/5">
                                    {m.homeTeam.score} - {m.awayTeam.score}
                                  </span>
                                  <span>{m.awayTeam.name}</span>
                                </div>
                                <span className="text-[8px] text-slate-500 block mt-0.5">{date}</span>

                                {m.events && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {m.events.yellowCard && (
                                      <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[7px] px-1 py-0.1 rounded font-black tracking-wider">
                                        🟨 Amarilla
                                      </span>
                                    )}
                                    {m.events.redCard && (
                                      <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[7px] px-1 py-0.1 rounded font-black tracking-wider">
                                        🟥 Roja
                                      </span>
                                    )}
                                    {m.events.subInMinute !== undefined && (
                                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] px-1 py-0.1 rounded font-bold">
                                        🔄 Entró {m.events.subInMinute}'
                                      </span>
                                    )}
                                    {m.events.subOutMinute !== undefined && (
                                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[7px] px-1 py-0.1 rounded font-bold">
                                        🔄 Salió {m.events.subOutMinute}'
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {m.status.type === 'inprogress' ? (
                                <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1 py-0.1 border border-emerald-500/20 rounded-full font-bold">
                                  EN VIVO
                                </span>
                              ) : (
                                <span className="bg-white/5 text-slate-500 text-[8px] px-1 py-0.1 rounded-full border border-white/5">
                                  Finalizado
                                </span>
                              )}
                            </div>

                            {/* Individual Stats in Match */}
                            {m.stats ? (
                              <div className="grid grid-cols-2 gap-1 text-[9px]">
                                {getPlayerHistoryMinutes(m) > 0 && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Minutos</span>
                                    <span className="font-extrabold text-slate-200">{getPlayerHistoryMinutes(m)}'</span>
                                  </div>
                                )}
                                
                                {m.stats.goals !== undefined && m.stats.goals > 0 && (
                                  <div className="bg-emerald-500/10 p-1 rounded border border-emerald-500/20 text-emerald-400">
                                    <span className="block text-[7px] uppercase font-bold tracking-wider opacity-85">Goles</span>
                                    <span className="font-extrabold text-[10px]">{m.stats.goals}</span>
                                  </div>
                                )}

                                {m.stats.assists !== undefined && m.stats.assists > 0 && (
                                  <div className="bg-amber-500/10 p-1 rounded border border-amber-500/20 text-amber-500">
                                    <span className="block text-[7px] uppercase font-bold tracking-wider opacity-85">Asistencias</span>
                                    <span className="font-extrabold text-[10px]">{m.stats.assists}</span>
                                  </div>
                                )}

                                {m.stats.shots !== undefined && m.stats.shots > 0 && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Tiros (Al arco)</span>
                                    <span className="font-extrabold text-slate-200">
                                      {m.stats.shots}
                                      {m.stats.shotsOnTarget !== undefined && ` (${m.stats.shotsOnTarget})`}
                                    </span>
                                  </div>
                                )}

                                {m.stats.foulsCommitted !== undefined && m.stats.foulsCommitted > 0 && (
                                  <div className="bg-rose-500/10 p-1 rounded border border-rose-500/20 text-rose-400">
                                    <span className="block text-[7px] uppercase font-bold tracking-wider opacity-85">Faltas Cometidas</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.foulsCommitted}</span>
                                  </div>
                                )}

                                {m.stats.foulsWon !== undefined && m.stats.foulsWon > 0 && (
                                  <div className="bg-emerald-500/10 p-1 rounded border border-emerald-500/20 text-emerald-400">
                                    <span className="block text-[7px] uppercase font-bold tracking-wider opacity-85">Faltas Recibidas</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.foulsWon}</span>
                                  </div>
                                )}

                                {m.stats.saves !== undefined && (m.position === 'Arquero' || m.stats.saves > 0) && (
                                  <div className="bg-emerald-500/10 p-1 rounded border border-emerald-500/20 text-emerald-400">
                                    <span className="block text-[7px] uppercase font-bold tracking-wider opacity-85">Atajadas</span>
                                    <span className="font-extrabold text-[10px]">{m.stats.saves}</span>
                                  </div>
                                )}

                                {m.stats.passes && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Pases</span>
                                    <span className="font-extrabold text-slate-200">
                                      {m.stats.passes.ok}/{m.stats.passes.total} 
                                      <small className="text-slate-500 font-normal ml-0.5">({m.stats.passes.total ? Math.round((m.stats.passes.ok / m.stats.passes.total) * 100) : 0}%)</small>
                                    </span>
                                  </div>
                                )}

                                {m.stats.touches !== undefined && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Toques</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.touches}</span>
                                  </div>
                                )}

                                {m.stats.tackles && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Entradas</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.tackles.ok}/{m.stats.tackles.total}</span>
                                  </div>
                                )}

                                {m.stats.recoveries !== undefined && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Recuperaciones</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.recoveries}</span>
                                  </div>
                                )}

                                {m.stats.interceptions !== undefined && m.stats.interceptions > 0 && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Intercepciones</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.interceptions}</span>
                                  </div>
                                )}

                                {m.stats.clearances !== undefined && m.stats.clearances > 0 && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Despejes</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.clearances}</span>
                                  </div>
                                )}

                                {m.stats.possessionLost !== undefined && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Pérdidas</span>
                                    <span className="font-extrabold text-slate-400">{m.stats.possessionLost}</span>
                                  </div>
                                )}

                                {m.stats.dispossessed !== undefined && m.stats.dispossessed > 0 && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Quitado/Robado</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.dispossessed}</span>
                                  </div>
                                )}

                                {m.stats.dribbles && m.stats.dribbles.total > 0 && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Regates</span>
                                    <span className="font-extrabold text-slate-200">
                                      {m.stats.dribbles.ok}/{m.stats.dribbles.total}
                                      <small className="text-slate-500 font-normal ml-0.5">({m.stats.dribbles.total ? Math.round((m.stats.dribbles.ok / m.stats.dribbles.total) * 100) : 0}%)</small>
                                    </span>
                                  </div>
                                )}

                                {m.stats.groundDuels && m.stats.groundDuels.total > 0 && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Duelos Suelo</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.groundDuels.ok}/{m.stats.groundDuels.total}</span>
                                  </div>
                                )}

                                {m.stats.aerialDuels && m.stats.aerialDuels.total > 0 && (
                                  <div className="bg-black/40 p-1 rounded border border-white/5">
                                    <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Duelos Aéreos</span>
                                    <span className="font-extrabold text-slate-200">{m.stats.aerialDuels.ok}/{m.stats.aerialDuels.total}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[8px] text-slate-500">No hay estadísticas detalladas registradas para este partido.</p>
                            )}
                          </div>
                        );
                      })}

                    {playerMatches.length > visibleMatchesLimit && visibleMatchesLimit < 20 && (
                      <button
                        onClick={() => setVisibleMatchesLimit(prev => prev === 5 ? 10 : 20)}
                        className="w-full text-center py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 border border-dashed border-emerald-500/20 rounded-lg transition-all mt-1"
                      >
                        Ver más partidos ({playerMatches.length - visibleMatchesLimit} más)
                      </button>
                    )}
                  </div>
                )}
              </div>
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
  statMode: 'match' | 'minute';
  playerMinutes: Record<string, number>;
}

function LeaderboardCard({
  title,
  icon,
  data,
  metricKey,
  metricLabel,
  onPlayerClick,
  getPositionBadgeColor,
  isLight,
  statMode,
  playerMinutes
}: LeaderboardCardProps) {
  return (
    <div className="bg-[#0b1015]/60 backdrop-blur-xl border border-white/5 rounded-xl p-2.5 flex flex-col justify-between shadow-md transition-all duration-300">
      <div>
        <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-white/5">
          {icon}
          <h3 className="font-extrabold text-slate-200 text-[10px] tracking-wide uppercase">{title}</h3>
        </div>

        {data.length === 0 ? (
          <p className="text-slate-600 text-[10px] py-3 text-center">Aún no hay datos registrados.</p>
        ) : (
          <div className="space-y-1">
            {data.map((player, idx) => {
              const rankStyles = [
                'bg-amber-400/10 text-amber-500 border-amber-400/25',
                'bg-slate-350/15 text-slate-300 border-slate-350/20',
                'bg-amber-700/10 text-amber-600 border-amber-700/20',
                isLight ? 'bg-slate-100 text-slate-400 border-slate-200/60' : 'bg-white/5 text-slate-500 border-white/5',
                isLight ? 'bg-slate-100 text-slate-400 border-slate-200/60' : 'bg-white/5 text-slate-500 border-white/5',
              ];

              const minutes = playerMinutes[player.nameFull];
              const hasMinutes = minutes !== undefined && minutes > 0;
              const isMinutesLoading = minutes === -1;

              let displayValue = '';
              let displayLabel = '';

              if (statMode === 'minute') {
                if (isMinutesLoading) {
                  displayValue = '...';
                  displayLabel = 'cargando';
                } else if (hasMinutes) {
                  const perMin = player[metricKey] / minutes;
                  const per90 = perMin * 90;
                  displayValue = per90.toFixed(2);
                  displayLabel = `x 90'`;
                } else {
                  displayValue = '0.00';
                  displayLabel = 'sin min';
                }
              } else {
                displayValue = player.average.toFixed(2);
                displayLabel = `${metricLabel} / p`;
              }

              return (
                <div 
                  key={idx}
                  onClick={() => onPlayerClick(player.nameFull)}
                  className="flex items-center justify-between p-1 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-4.5 h-4.5 shrink-0 rounded-md flex items-center justify-center font-black text-[9px] border ${rankStyles[idx] || rankStyles[4]}`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-300 group-hover:text-emerald-400 transition-colors text-[11px] truncate block">
                        {player.nameFull || player.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        <span className={`text-[6px] uppercase font-bold tracking-wider px-1 py-0.2 border rounded-full ${getPositionBadgeColor(player.position)}`}>
                          {player.position}
                        </span>
                        {player.selection && (
                          <span className="inline-flex items-center gap-0.5 text-[7px] text-slate-400 font-bold bg-white/5 px-1 py-0.2 border border-white/5 rounded-full shrink-0">
                            <img
                              src={`https://img.icons8.com/color/16/000000/${player.selection}.png`}
                              alt={player.selection}
                              className="w-2 h-2 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            {formatSelectionName(player.selection)}
                          </span>
                        )}
                        <span className="text-[8px] text-slate-500">
                          {player.totalMatches} {player.totalMatches === 1 ? 'partido' : 'partidos'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-[11px] font-black text-slate-200">
                      {displayValue}
                    </span>
                    <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">
                      {displayLabel}
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
