"use client";
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getMatch as getCachedMatch, setMatch as setCachedMatch, TTL_LIVE_MS } from '../lib/matchCache';
import { useParams, useRouter } from 'next/navigation';
import { useContext } from 'react';
import { DashboardContext } from '../app/(dashboard)/layout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Link from 'next/link';
import { LEAGUES } from '../components/layout/AppLayout';
import { ArrowLeft, Clock, Calendar, X, BarChart3, ChevronDown, Activity, Award, Sparkles } from 'lucide-react';
import TeamLogo from '../components/TeamLogo';
import TeamHoverCard from '../components/TeamHoverCard';
import { elnineMappings } from '../lib/elnineMappings';


const parseStatValue = (val: string | number | undefined): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/%/g, '').trim();
  return parseFloat(cleaned) || 0;
};

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

const isPlayerOfTeam = (playerSelection: string | null | undefined, teamName: string) => {
  if (!playerSelection || !teamName) return false;
  
  const normTeam = teamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normSelection = playerSelection.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (normTeam.includes(normSelection) || normSelection.includes(normTeam)) return true;
  
  const formattedSelection = formatSelectionName(playerSelection).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normTeam.includes(formattedSelection) || formattedSelection.includes(normTeam)) return true;
  
  const spaceSelection = normSelection.replace(/-/g, ' ');
  if (normTeam.includes(spaceSelection) || spaceSelection.includes(normTeam)) return true;

  const teamTranslations: Record<string, string[]> = {
    'saudi-arabia': ['arabia saudita', 'saudi arabia'],
    'south-korea': ['corea del sur', 'south korea', 'korea republic'],
    'netherlands': ['paises bajos', 'holanda', 'netherlands', 'holland'],
    'usa': ['estados unidos', 'ee. uu.', 'usa', 'united states'],
    'czech-republic': ['republica checa', 'czech republic'],
    'bosnia-herzegovina': ['bosnia', 'bosnia y herzegovina', 'bosnia-herzegovina'],
    'ivory-coast': ['costa de marfil', 'ivory coast'],
    'dr-congo': ['rd congo', 'congo dr', 'dr congo'],
    'cape-verde': ['cabo verde', 'cape verde'],
    'new-zealand': ['nueva zelanda', 'new zealand'],
    'south-africa': ['sudafrica', 'south africa']
  };

  if (teamTranslations[playerSelection]) {
    return teamTranslations[playerSelection].some(trans => normTeam.includes(trans) || trans.includes(normTeam));
  }
  
  return false;
};

const formatTabName = (key: string) => {
  const customMap: Record<string, string> = {
    grupoA: 'Grupo A',
    grupoB: 'Grupo B',
    grupoC: 'Grupo C',
    grupoD: 'Grupo D',
    grupoE: 'Grupo E',
    grupoF: 'Grupo F',
    grupoG: 'Grupo G',
    grupoH: 'Grupo H',
  };
  if (customMap[key]) return customMap[key];
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

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

const resolvePlayerCountry = async (matches: any[], name: string): Promise<string | null> => {
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

export default function MatchDetailView() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const outletContext = useContext(DashboardContext);
  const setOverriddenLeagueId = outletContext?.setOverriddenLeagueId;
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [subSection, setSubSection] = useState<'resumen' | 'estadisticas'>('resumen');
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchPredictions, setMatchPredictions] = useState<any[]>([]);
  const [showAllPredictions, setShowAllPredictions] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [elninePlayers, setElninePlayers] = useState<any[] | null>(null);
  const [loadingElnine, setLoadingElnine] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [selectedPrePlayerName, setSelectedPrePlayerName] = useState<string | null>(null);
  const [prePlayerMatches, setPrePlayerMatches] = useState<any[]>([]);
  const [loadingPrePlayerDetail, setLoadingPrePlayerDetail] = useState(false);
  const [prePlayerCountry, setPrePlayerCountry] = useState<string | null>(null);
  const [visiblePreMatchesLimit, setVisiblePreMatchesLimit] = useState(5);
  const [mounted, setMounted] = useState(false);

  const [sortField, setSortField] = useState<'shots' | 'shotsOnTarget' | 'foulsCommitted' | 'foulsWon' | 'tackles'>('shots');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAllPlayerStats, setShowAllPlayerStats] = useState(false);
  const [showSubstitutes, setShowSubstitutes] = useState(false);

  const [h2hMatches, setH2hMatches] = useState<any[]>([]);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [h2hLimit, setH2hLimit] = useState<5 | 10>(10);
  const [h2hFilter, setH2hFilter] = useState<'all' | 'local'>('all');
  const [isH2hCollapsed, setIsH2hCollapsed] = useState(false);
  const [showH2hExtended, setShowH2hExtended] = useState(false);
  const [homeTeamMatches, setHomeTeamMatches] = useState<any[]>([]);
  const [awayTeamMatches, setAwayTeamMatches] = useState<any[]>([]);
  const [teamMatchesLoading, setTeamMatchesLoading] = useState(false);
  const [showTeamStatsExtended, setShowTeamStatsExtended] = useState(false);

  // Pre-match stats averages state
  const [globalPlayers, setGlobalPlayers] = useState<any[]>([]);
  const [preSortField, setPreSortField] = useState<'shots' | 'shotsOnTarget' | 'foulsCommitted' | 'foulsWon'>('shots');
  const [preSortDirection, setPreSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAllPreStats, setShowAllPreStats] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (selectedPlayer || selectedPrePlayerName) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPlayer, selectedPrePlayerName]);

  // Manejar el gesto de "ir para atrás" para cerrar el modal de jugador sin salir de la página
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!selectedPlayer) return;

    window.history.pushState({ modalOpen: 'playerStats' }, '');

    const handlePopState = () => {
      setSelectedPlayer(null);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modalOpen === 'playerStats') {
        window.history.back();
      }
    };
  }, [selectedPlayer]);

  // Fetch details for the pre-match tapped player
  useEffect(() => {
    if (!selectedPrePlayerName) {
      setPrePlayerMatches([]);
      setPrePlayerCountry(null);
      setVisiblePreMatchesLimit(5);
      return;
    }

    let isMounted = true;
    const fetchPrePlayerDetail = async () => {
      try {
        setLoadingPrePlayerDetail(true);
        const encodedName = encodeURIComponent(selectedPrePlayerName);
        const res = await fetch(`https://apivacas.jariel.com.ar/api/mundial/players/detail?name=${encodedName}`);
        if (!res.ok) throw new Error('Error al obtener el detalle del jugador');
        const json = await res.json();
        if (json.success && json.data && isMounted) {
          const matches = json.data || [];
          setPrePlayerMatches(matches);
          
          // Resolver el país
          const country = await resolvePlayerCountry(matches, selectedPrePlayerName);
          if (isMounted) {
            setPrePlayerCountry(country);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoadingPrePlayerDetail(false);
      }
    };

    fetchPrePlayerDetail();
    return () => { isMounted = false; };
  }, [selectedPrePlayerName]);

  // Manejar el gesto de "ir para atrás" para cerrar el modal de pre-jugador sin salir de la página
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!selectedPrePlayerName) return;

    window.history.pushState({ modalOpen: 'prePlayerStats' }, '');

    const handlePopState = () => {
      setSelectedPrePlayerName(null);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modalOpen === 'prePlayerStats') {
        window.history.back();
      }
    };
  }, [selectedPrePlayerName]);


  const [mundialStandings, setMundialStandings] = useState<Record<string, any[]> | null>(null);
  const [loadingMundialStandings, setLoadingMundialStandings] = useState(false);

  const isMundialMatch = match && (match.tournament_id === 16 || match.tournament?.id === 16);

  useEffect(() => {
    if (match && setOverriddenLeagueId) {
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
  }, [match, setOverriddenLeagueId, isMundialMatch]);

  useEffect(() => {
    if (!isMundialMatch) return;
    
    let isMounted = true;
    const fetchMundialStandings = async () => {
      setLoadingMundialStandings(true);
      try {
        const response = await fetch('https://apivacas.jariel.com.ar/api/standings/16');
        if (response.ok) {
          const json = await response.json();
          if (isMounted) {
            setMundialStandings(json.data || {});
          }
        }
      } catch (err) {
        console.error('Error fetching mundial standings', err);
      } finally {
        if (isMounted) {
          setLoadingMundialStandings(false);
        }
      }
    };

    fetchMundialStandings();
    return () => { isMounted = false; };
  }, [isMundialMatch]);

  // Fetch promedios de jugadores de la base de datos para la comparación pre-partido
  useEffect(() => {
    if (!isMundialMatch) return;
    let isMounted = true;
    fetch('https://apivacas.jariel.com.ar/api/mundial/players')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json && json.success && isMounted) {
          setGlobalPlayers(json.data || []);
        }
      })
      .catch(err => console.error('Error fetching global players:', err));
    return () => { isMounted = false; };
  }, [isMundialMatch]);

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

    // Usamos el caché para mostrar datos inmediatamente sin spinner.
    // Para partidos en vivo usamos TTL muy corto (10s) para no mostrar datos stale.
    const isLive = (data: any) => {
      const s = data?.status;
      if (!s) return false;
      if (typeof s === 'string') return s === 'inprogress';
      return s?.type === 'inprogress';
    };
    const cached = getCachedMatch(id);
    const cachedIsStaleForLive = cached && isLive(cached) && !getCachedMatch(id, TTL_LIVE_MS);
    const useCache = cached && !cachedIsStaleForLive;
    if (useCache) {
      setMatch(cached);
      setLoading(false);
    }

    const fetchDetail = async (showLoading = false) => {
      try {
        if (showLoading && !useCache) setLoading(true);
        const res = await fetch(`https://apivacas.jariel.com.ar/api/matches/detail/${id}`);
        if (!res.ok) throw new Error('Error al cargar datos del partido');
        const data = await res.json();
        const matchData = data.events ? data.events[0] : data;
        setCachedMatch(id, matchData);
        if (isMounted) {
          setMatch(matchData);
        }
      } catch (err: any) {
        if (showLoading && !useCache && isMounted) {
          setError(err.message);
        }
      } finally {
        if (showLoading && isMounted) {
          setLoading(false);
        }
      }
    };

    // Si había caché válido, refrescamos en background sin mostrar loading
    fetchDetail(!useCache);

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

  // Fetch H2H statistics
  useEffect(() => {
    const hId = match?.homeTeam?.id || match?.home_team?.id;
    const aId = match?.awayTeam?.id || match?.away_team?.id;
    if (!hId || !aId) return;

    const isWorldCup = match?.tournament?.id === 16 || 
                       match?.tournament?.name?.toLowerCase().includes('copa mundial') || 
                       match?.tournament?.name?.toLowerCase().includes('world cup') || 
                       match?.tournament_name?.toLowerCase().includes('mundial');
    
    if (isWorldCup) return;

    const fetchH2H = async () => {
      // Solo mostramos loading si no tenemos los partidos en memoria (evita parpadeos)
      if (h2hMatches.length === 0) {
        setH2hLoading(true);
      }
      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/matches/h2h?teamA=${hId}&teamB=${aId}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setH2hMatches(data);
        }
      } catch (e) {
        console.error("Error fetching H2H matches:", e);
      } finally {
        setH2hLoading(false);
      }
    };

    fetchH2H();
  }, [match?.homeTeam?.id, match?.home_team?.id, match?.awayTeam?.id, match?.away_team?.id]);

  // Fetch home and away team matches for recent condition form/stats
  useEffect(() => {
    const hId = match?.homeTeam?.id || match?.home_team?.id;
    const aId = match?.awayTeam?.id || match?.away_team?.id;
    if (!hId || !aId || isMundialMatch) return;

    let isMounted = true;
    const fetchTeamMatches = async () => {
      setTeamMatchesLoading(true);
      try {
        const [homeRes, awayRes] = await Promise.all([
          fetch(`https://apivacas.jariel.com.ar/api/teams/${hId}/all-matches?limit=40`),
          fetch(`https://apivacas.jariel.com.ar/api/teams/${aId}/all-matches?limit=40`)
        ]);
        
        if (homeRes.ok && awayRes.ok) {
          const homeData = await homeRes.json();
          const awayData = await awayRes.json();
          if (isMounted) {
            setHomeTeamMatches(homeData);
            setAwayTeamMatches(awayData);
          }
        }
      } catch (e) {
        console.error("Error fetching team matches:", e);
      } finally {
        if (isMounted) {
          setTeamMatchesLoading(false);
        }
      }
    };

    fetchTeamMatches();
    return () => {
      isMounted = false;
    };
  }, [match?.homeTeam?.id, match?.home_team?.id, match?.awayTeam?.id, match?.away_team?.id, isMundialMatch]);

  const processedH2H = useMemo(() => {
    if (!match || h2hMatches.length === 0) return [];
    const hId = Number(match.homeTeam?.id || match.home_team?.id);
    const aId = Number(match.awayTeam?.id || match.away_team?.id);

    let filtered = h2hMatches.filter(m => {
      const homeScore = m.homeScore?.current ?? m.homeTeam?.score ?? m.home_team?.score;
      const awayScore = m.awayScore?.current ?? m.awayTeam?.score ?? m.away_team?.score;
      if (homeScore === undefined || awayScore === undefined) return false;

      if (h2hFilter === 'local') {
        const mHomeId = Number(m.homeTeam?.id || m.home_team?.id);
        const mAwayId = Number(m.awayTeam?.id || m.away_team?.id);
        return mHomeId === hId && mAwayId === aId;
      }
      return true;
    });

    filtered = [...filtered].sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0));
    return filtered.slice(0, h2hLimit);
  }, [h2hMatches, h2hFilter, h2hLimit, match]);

  const h2hStats = useMemo(() => {
    if (!match || processedH2H.length === 0) return null;
    const hId = Number(match.homeTeam?.id || match.home_team?.id);

    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;

    let homeGoals = 0;
    let awayGoals = 0;
    
    let bttsCount = 0;
    let homeCleanSheets = 0;
    let awayCleanSheets = 0;

    processedH2H.forEach(m => {
      const mHomeId = Number(m.homeTeam?.id || m.home_team?.id);
      
      const hScore = Number(m.homeScore?.current ?? m.homeTeam?.score ?? m.home_team?.score ?? 0);
      const aScore = Number(m.awayScore?.current ?? m.awayTeam?.score ?? m.away_team?.score ?? 0);

      const isHomeTeamThisMatch = mHomeId === hId;
      const ourHomeGoals = isHomeTeamThisMatch ? hScore : aScore;
      const ourAwayGoals = isHomeTeamThisMatch ? aScore : hScore;

      homeGoals += ourHomeGoals;
      awayGoals += ourAwayGoals;

      if (ourHomeGoals > ourAwayGoals) homeWins++;
      else if (ourHomeGoals < ourAwayGoals) awayWins++;
      else draws++;

      if (ourHomeGoals > 0 && ourAwayGoals > 0) bttsCount++;
      if (ourHomeGoals === 0) awayCleanSheets++;
      if (ourAwayGoals === 0) homeCleanSheets++;
    });

    const total = processedH2H.length;
    return {
      total,
      homeWins,
      awayWins,
      draws,
      homeWinPct: Math.round((homeWins / total) * 100),
      awayWinPct: Math.round((awayWins / total) * 100),
      drawPct: Math.round((draws / total) * 100),
      avgHomeGoals: (homeGoals / total).toFixed(1),
      avgAwayGoals: (awayGoals / total).toFixed(1),
      avgTotalGoals: ((homeGoals + awayGoals) / total).toFixed(1),
      bttsPct: Math.round((bttsCount / total) * 100),
      homeCleanSheetPct: Math.round((homeCleanSheets / total) * 100),
      awayCleanSheetPct: Math.round((awayCleanSheets / total) * 100),
    };
  }, [processedH2H, match]);

  const STAT_MAPPINGS: Record<string, string[]> = {
    corners: ['saques de esquina', 'corner kicks', 'córners', 'saques de esquina'],
    fouls: ['faltas', 'fouls'],
    yellowCards: ['tarjetas amarillas', 'yellow cards'],
    shots: ['total remates', 'total shots', 'tiros totales', 'remates', 'tiros'],
    shotsOnTarget: ['remates al arco', 'shots on target', 'tiros al arco'],
    possession: ['posesión', 'ball possession', 'posesión del balón', 'posesion']
  };

  // Helper to extract a statistic value from a match's live_statistics array
  const getMatchStatValue = (m: any, statKey: string, getForHome: boolean): number => {
    if (!m.live_statistics || !Array.isArray(m.live_statistics)) return 0;
    
    const possibleNames = STAT_MAPPINGS[statKey] || [statKey.toLowerCase()];

    for (const group of m.live_statistics) {
      if (group.statisticsItems && Array.isArray(group.statisticsItems)) {
        const item = group.statisticsItems.find(
          (i: any) => i.name && possibleNames.includes(i.name.toLowerCase())
        );
        if (item) {
          const val = getForHome ? item.home : item.away;
          return parseStatValue(val);
        }
      }
    }
    return 0;
  };

  // Helper to determine match outcome (Win/Loss/Draw) for a specific team in a match
  const getTeamMatchOutcome = (m: any, teamId: number): 'V' | 'D' | 'E' | null => {
    const hScoreVal = m.homeScore?.current ?? m.homeTeam?.score ?? m.home_team?.score;
    const aScoreVal = m.awayScore?.current ?? m.awayTeam?.score ?? m.away_team?.score;
    if (hScoreVal === undefined || hScoreVal === null || aScoreVal === undefined || aScoreVal === null) return null;

    const hScore = Number(hScoreVal);
    const aScore = Number(aScoreVal);
    const mHomeId = Number(m.homeTeam?.id || m.home_team?.id);
    const mAwayId = Number(m.awayTeam?.id || m.away_team?.id);

    if (mHomeId === Number(teamId)) {
      if (hScore > aScore) return 'V';
      if (hScore < aScore) return 'D';
      return 'E';
    } else if (mAwayId === Number(teamId)) {
      if (aScore > hScore) return 'V';
      if (aScore < hScore) return 'D';
      return 'E';
    }
    return null;
  };

  const h2hExtendedStats = useMemo(() => {
    if (!match || processedH2H.length === 0) return null;
    const hId = Number(match.homeTeam?.id || match.home_team?.id);

    let homeCorners = 0;
    let homeFouls = 0;
    let homeYellowCards = 0;
    let homeShots = 0;
    let homeShotsOnTarget = 0;
    let homePossession = 0;

    let awayCorners = 0;
    let awayFouls = 0;
    let awayYellowCards = 0;
    let awayShots = 0;
    let awayShotsOnTarget = 0;
    let awayPossession = 0;

    let matchesWithStats = 0;

    processedH2H.forEach(m => {
      if (!m.live_statistics || !Array.isArray(m.live_statistics) || m.live_statistics.length === 0) return;

      matchesWithStats++;

      const isCurrentHomeTeamHome = Number(m.homeTeam?.id || m.home_team?.id) === hId;

      const homeCornersVal = getMatchStatValue(m, "corners", true);
      const homeFoulsVal = getMatchStatValue(m, "fouls", true);
      const homeYellowCardsVal = getMatchStatValue(m, "yellowCards", true);
      const homeShotsVal = getMatchStatValue(m, "shots", true);
      const homeShotsOnTargetVal = getMatchStatValue(m, "shotsOnTarget", true);
      const homePossessionVal = getMatchStatValue(m, "possession", true);

      const awayCornersVal = getMatchStatValue(m, "corners", false);
      const awayFoulsVal = getMatchStatValue(m, "fouls", false);
      const awayYellowCardsVal = getMatchStatValue(m, "yellowCards", false);
      const awayShotsVal = getMatchStatValue(m, "shots", false);
      const awayShotsOnTargetVal = getMatchStatValue(m, "shotsOnTarget", false);
      const awayPossessionVal = getMatchStatValue(m, "possession", false);

      if (isCurrentHomeTeamHome) {
        homeCorners += homeCornersVal;
        homeFouls += homeFoulsVal;
        homeYellowCards += homeYellowCardsVal;
        homeShots += homeShotsVal;
        homeShotsOnTarget += homeShotsOnTargetVal;
        homePossession += homePossessionVal;

        awayCorners += awayCornersVal;
        awayFouls += awayFoulsVal;
        awayYellowCards += awayYellowCardsVal;
        awayShots += awayShotsVal;
        awayShotsOnTarget += awayShotsOnTargetVal;
        awayPossession += awayPossessionVal;
      } else {
        homeCorners += awayCornersVal;
        homeFouls += awayFoulsVal;
        homeYellowCards += awayYellowCardsVal;
        homeShots += awayShotsVal;
        homeShotsOnTarget += awayShotsOnTargetVal;
        homePossession += awayPossessionVal;

        awayCorners += homeCornersVal;
        awayFouls += homeFoulsVal;
        awayYellowCards += homeYellowCardsVal;
        awayShots += homeShotsVal;
        awayShotsOnTarget += homeShotsOnTargetVal;
        awayPossession += homePossessionVal;
      }
    });

    if (matchesWithStats === 0) return null;

    return {
      matchesWithStats,
      homeCornersAvg: (homeCorners / matchesWithStats).toFixed(1),
      homeFoulsAvg: (homeFouls / matchesWithStats).toFixed(1),
      homeYellowCardsAvg: (homeYellowCards / matchesWithStats).toFixed(1),
      homeShotsAvg: (homeShots / matchesWithStats).toFixed(1),
      homeShotsOnTargetAvg: (homeShotsOnTarget / matchesWithStats).toFixed(1),
      homePossessionAvg: `${Math.round(homePossession / matchesWithStats)}%`,

      awayCornersAvg: (awayCorners / matchesWithStats).toFixed(1),
      awayFoulsAvg: (awayFouls / matchesWithStats).toFixed(1),
      awayYellowCardsAvg: (awayYellowCards / matchesWithStats).toFixed(1),
      awayShotsAvg: (awayShots / matchesWithStats).toFixed(1),
      awayShotsOnTargetAvg: (awayShotsOnTarget / matchesWithStats).toFixed(1),
      awayPossessionAvg: `${Math.round(awayPossession / matchesWithStats)}%`,
    };
  }, [processedH2H, match]);

  const processedHomeTeamMatches = useMemo(() => {
    if (!match || homeTeamMatches.length === 0) return [];
    const hId = Number(match.homeTeam?.id || match.home_team?.id);
    const now = Math.floor(Date.now() / 1000);

    const filtered = homeTeamMatches.filter((m: any) => {
      const mHomeId = Number(m.homeTeam?.id || m.home_team?.id);
      const isHome = mHomeId === hId;
      const isPlayed = m.startTimestamp && m.startTimestamp < now;
      const notWorldCup = m.tournament?.id !== 16 && m.tournament_id !== 16;
      return isHome && isPlayed && notWorldCup;
    });

    return [...filtered].sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0)).slice(0, 5);
  }, [homeTeamMatches, match]);

  const processedAwayTeamMatches = useMemo(() => {
    if (!match || awayTeamMatches.length === 0) return [];
    const aId = Number(match.awayTeam?.id || match.away_team?.id);
    const now = Math.floor(Date.now() / 1000);

    const filtered = awayTeamMatches.filter((m: any) => {
      const mAwayId = Number(m.awayTeam?.id || m.away_team?.id);
      const isAway = mAwayId === aId;
      const isPlayed = m.startTimestamp && m.startTimestamp < now;
      const notWorldCup = m.tournament?.id !== 16 && m.tournament_id !== 16;
      return isAway && isPlayed && notWorldCup;
    });

    return [...filtered].sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0)).slice(0, 5);
  }, [awayTeamMatches, match]);

  const homeTeamAverages = useMemo(() => {
    if (processedHomeTeamMatches.length === 0) return null;

    let totalShots = 0;
    let totalCorners = 0;
    let totalFouls = 0;
    let totalShotsOnTarget = 0;
    let totalYellowCards = 0;
    let totalPossession = 0;
    let matchesWithStats = 0;

    processedHomeTeamMatches.forEach(m => {
      if (!m.live_statistics || !Array.isArray(m.live_statistics) || m.live_statistics.length === 0) return;
      matchesWithStats++;
      totalShots += getMatchStatValue(m, "shots", true);
      totalCorners += getMatchStatValue(m, "corners", true);
      totalFouls += getMatchStatValue(m, "fouls", true);
      totalShotsOnTarget += getMatchStatValue(m, "shotsOnTarget", true);
      totalYellowCards += getMatchStatValue(m, "yellowCards", true);
      totalPossession += getMatchStatValue(m, "possession", true);
    });

    return {
      matchesWithStats,
      shotsAvg: matchesWithStats > 0 ? (totalShots / matchesWithStats).toFixed(1) : '-',
      cornersAvg: matchesWithStats > 0 ? (totalCorners / matchesWithStats).toFixed(1) : '-',
      foulsAvg: matchesWithStats > 0 ? (totalFouls / matchesWithStats).toFixed(1) : '-',
      shotsOnTargetAvg: matchesWithStats > 0 ? (totalShotsOnTarget / matchesWithStats).toFixed(1) : '-',
      yellowCardsAvg: matchesWithStats > 0 ? (totalYellowCards / matchesWithStats).toFixed(1) : '-',
      possessionAvg: matchesWithStats > 0 ? `${Math.round(totalPossession / matchesWithStats)}%` : '-',
    };
  }, [processedHomeTeamMatches]);

  const awayTeamAverages = useMemo(() => {
    if (processedAwayTeamMatches.length === 0) return null;

    let totalShots = 0;
    let totalCorners = 0;
    let totalFouls = 0;
    let totalShotsOnTarget = 0;
    let totalYellowCards = 0;
    let totalPossession = 0;
    let matchesWithStats = 0;

    processedAwayTeamMatches.forEach(m => {
      if (!m.live_statistics || !Array.isArray(m.live_statistics) || m.live_statistics.length === 0) return;
      matchesWithStats++;
      totalShots += getMatchStatValue(m, "shots", false);
      totalCorners += getMatchStatValue(m, "corners", false);
      totalFouls += getMatchStatValue(m, "fouls", false);
      totalShotsOnTarget += getMatchStatValue(m, "shotsOnTarget", false);
      totalYellowCards += getMatchStatValue(m, "yellowCards", false);
      totalPossession += getMatchStatValue(m, "possession", false);
    });

    return {
      matchesWithStats,
      shotsAvg: matchesWithStats > 0 ? (totalShots / matchesWithStats).toFixed(1) : '-',
      cornersAvg: matchesWithStats > 0 ? (totalCorners / matchesWithStats).toFixed(1) : '-',
      foulsAvg: matchesWithStats > 0 ? (totalFouls / matchesWithStats).toFixed(1) : '-',
      shotsOnTargetAvg: matchesWithStats > 0 ? (totalShotsOnTarget / matchesWithStats).toFixed(1) : '-',
      yellowCardsAvg: matchesWithStats > 0 ? (totalYellowCards / matchesWithStats).toFixed(1) : '-',
      possessionAvg: matchesWithStats > 0 ? `${Math.round(totalPossession / matchesWithStats)}%` : '-',
    };
  }, [processedAwayTeamMatches]);

  // Fetch estadísticas detalladas de elnine.com.ar desde la base de datos con actualización automática en vivo
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const fetchElnineStats = async () => {
      setLoadingElnine(true);
      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/matches/elnine-players/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.players) {
            setElninePlayers(data.players);
          }
        }
      } catch (err) {
        console.error('Error fetching elnine stats from database:', err);
      } finally {
        if (isMounted) {
          setLoadingElnine(false);
        }
      }
    };

    // Si ya vienen en el match actual, cargarlos inicialmente
    if (match && match.elnine_players && match.elnine_players.length > 0) {
      setElninePlayers(match.elnine_players);
    } else {
      // Si no, hacer el fetch inicial
      fetchElnineStats();
    }

    // Determinar si el partido está en vivo para activar polling
    const statusType = typeof match?.status === 'string' ? match.status : match?.status?.type;
    const isLiveMatch = statusType === 'inprogress';

    // Establecer un intervalo de actualización automática cada 30 segundos si el partido está en vivo
    let interval: NodeJS.Timeout | null = null;
    if (isLiveMatch) {
      interval = setInterval(() => {
        fetchElnineStats();
      }, 30000); // 30 segundos
    }

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [id, match?.status]);

  // Helper para vincular jugador de lineups con datos scrapeados
  const findScrapedPlayer = (p: any, isHome: boolean) => {
    if (!elninePlayers) return null;
    const dbName = (p.player?.name || p.player?.shortName || '').toLowerCase();
    const dbShort = (p.player?.shortName || '').toLowerCase();
    const dbNumber = p.jerseyNumber;

    // 1. Intentar buscar por número de camiseta primero
    const sameNumberPlayers = elninePlayers.filter((ep: any) => ep.number === dbNumber);
    if (sameNumberPlayers.length === 1) {
      return sameNumberPlayers[0];
    } else if (sameNumberPlayers.length > 1) {
      // Si hay más de uno con el mismo número (uno de cada equipo), comparamos por coincidencia básica de nombre
      for (const ep of sameNumberPlayers) {
        const epName = (ep.nameFull || ep.name || '').toLowerCase();
        if (epName.includes(dbShort) || dbName.includes(epName) || epName.includes(dbName)) {
          return ep;
        }
      }
    }

    // 2. Fallback: buscar por coincidencia de nombre
    return elninePlayers.find((ep: any) => {
      const epName = (ep.nameFull || ep.name || '').toLowerCase();
      const epShort = (ep.name || '').toLowerCase();
      return (
        epName.includes(dbName) || 
        dbName.includes(epName) ||
        epName.includes(dbShort) ||
        epShort.includes(dbShort)
      );
    }) || null;
  };

  // Helper para calcular minutos jugados a partir de lineups e incidencias de sustitución
  const getPlayerMinutesPlayed = (player: any) => {
    if (!match || !match.lineups) return null;

    const normalizeString = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // 1. Buscar al jugador en las alineaciones
    const lp = [
      ...(match.lineups.home?.players || []),
      ...(match.lineups.away?.players || [])
    ].find((item: any) => {
      if (item.jerseyNumber !== player.number) return false;
      const itemClean = normalizeString(item.player?.name || item.player?.shortName || '');
      const pCleanFull = normalizeString(player.nameFull || '');
      const pCleanShort = normalizeString(player.name || '');
      return pCleanFull.includes(itemClean) || itemClean.includes(pCleanShort) || pCleanShort.includes(itemClean);
    });

    if (!lp) return null;

    const isStarter = !lp.substitute;
    const playerNameForMatching = (player.name || lp.player?.shortName || lp.player?.name || '').toLowerCase();
    const playerFullNameForMatching = (player.nameFull || lp.player?.name || lp.player?.shortName || '').toLowerCase();

    const matchesPlayer = (incPlayer: any) => {
      if (!incPlayer) return false;
      const incName = normalizeString(incPlayer.name || incPlayer.shortName || '');
      const pName = normalizeString(playerNameForMatching);
      const pFull = normalizeString(playerFullNameForMatching);
      return pFull.includes(incName) || pName.includes(incName) || incName.includes(pName);
    };

    const subs = (match.incidents || []).filter((inc: any) => inc.incidentType === 'substitution');
    
    const subOut = subs.find((inc: any) => matchesPlayer(inc.playerOut));
    const subIn = subs.find((inc: any) => matchesPlayer(inc.playerIn));

    let endMinute = 90;
    if (match.status) {
      if (match.status.type === 'finished') {
        endMinute = 90;
      } else if (match.status.type === 'inprogress') {
        const minStr = match.status.minute || match.status.description || '';
        const parsedMin = parseInt(minStr.replace("'", ""), 10);
        endMinute = isNaN(parsedMin) ? 90 : parsedMin;
      } else if (match.status.type === 'notstarted') {
        endMinute = 0;
      }
    }

    if (isStarter) {
      if (subOut) {
        return {
          minutes: subOut.time,
          details: `Titular (jugó ${subOut.time}')`
        };
      } else {
        return {
          minutes: endMinute,
          details: match.status?.type === 'inprogress' 
            ? `Titular (jugando, ${endMinute}')` 
            : `Titular (jugó ${endMinute}')`
        };
      }
    } else {
      if (subIn) {
        const subOutAfterIn = subs.find((inc: any) => matchesPlayer(inc.playerOut) && inc.time > subIn.time);
        if (subOutAfterIn) {
          const played = subOutAfterIn.time - subIn.time;
          return {
            minutes: played,
            details: `Entró a los ${subIn.time}' y salió a los ${subOutAfterIn.time}' (jugó ${played}')`
          };
        } else {
          const played = endMinute - subIn.time;
          const playedClean = played >= 0 ? played : 0;
          return {
            minutes: playedClean,
            details: match.status?.type === 'inprogress'
              ? `Entró a los ${subIn.time}' (jugando, ${playedClean}')`
              : `Entró a los ${subIn.time}' (jugó ${playedClean}')`
          };
        }
      } else {
        return {
          minutes: 0,
          details: 'Suplente (no ingresó)'
        };
      }
    }
  };


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

  const getMatchGroupData = () => {
    if (!mundialStandings) return null;
    for (const [groupKey, groupTeams] of Object.entries(mundialStandings)) {
      if (Array.isArray(groupTeams)) {
        if (groupTeams.some((t: any) => t.equipoId === hId || t.equipoId === aId)) {
          return { groupKey, groupTeams };
        }
      }
    }
    return null;
  };

  const hLogoBase = match.homeTeam?.logoUrl || match.home_team?.logoUrl;
  const aLogoBase = match.awayTeam?.logoUrl || match.away_team?.logoUrl;

  const hLogo = hId ? `/escudos/${hId}.png` :
    (hLogoBase?.startsWith('/') ? `https://apivacas.jariel.com.ar${hLogoBase}` : hLogoBase);

  const aLogo = aId ? `/escudos/${aId}.png` :
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
  const selectedPrePlayerAggInfo = globalPlayers.find(p => p.nameFull === selectedPrePlayerName);

  // Compute minutes and aggregated stats for pre player modal
  const totalMinPre = prePlayerMatches.reduce((acc, m) => acc + getPlayerHistoryMinutes(m), 0);
  const playedMatchesCountPre = prePlayerMatches.filter(m => getPlayerHistoryMinutes(m) > 0).length || 1;
  const avgMinutesPre = totalMinPre / playedMatchesCountPre;

  const aggregatedPre = prePlayerMatches.reduce((acc, m) => {
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

  const statsListPre = [
    { label: 'Goles', value: aggregatedPre.goals },
    { label: 'Asistencias', value: aggregatedPre.assists },
    { label: 'Goles + Asistencias', value: aggregatedPre.goals + aggregatedPre.assists },
    { label: 'Tiros', value: aggregatedPre.shots },
    { label: 'Tiros al Arco', value: aggregatedPre.shotsOnTarget },
    { label: 'Faltas Cometidas', value: aggregatedPre.foulsCommitted },
    { label: 'Faltas Recibidas', value: aggregatedPre.foulsWon },
    { label: 'Atajadas', value: aggregatedPre.saves, show: (selectedPrePlayerAggInfo?.position === 'Arquero' || selectedPrePlayerAggInfo?.position === 'Goalkeeper' || aggregatedPre.saves > 0) },
    { label: 'Recuperaciones', value: aggregatedPre.recoveries },
    { label: 'Intercepciones', value: aggregatedPre.interceptions },
    { label: 'Despejes', value: aggregatedPre.clearances },
    { label: 'Toques', value: aggregatedPre.touches },
    { label: 'Pérdidas', value: aggregatedPre.possessionLost },
    { label: 'Quitado/Robado', value: aggregatedPre.dispossessed },
    { 
      label: 'Pases', 
      value: aggregatedPre.passesOk, 
      extra: aggregatedPre.passesTotal ? `${aggregatedPre.passesOk}/${aggregatedPre.passesTotal} (${Math.round((aggregatedPre.passesOk/aggregatedPre.passesTotal)*100)}%)` : null 
    },
    { 
      label: 'Regates', 
      value: aggregatedPre.dribblesOk, 
      extra: aggregatedPre.dribblesTotal ? `${aggregatedPre.dribblesOk}/${aggregatedPre.dribblesTotal} (${Math.round((aggregatedPre.dribblesOk/aggregatedPre.dribblesTotal)*100)}%)` : null 
    },
    { 
      label: 'Entradas', 
      value: aggregatedPre.tacklesOk, 
      extra: aggregatedPre.tacklesTotal ? `${aggregatedPre.tacklesOk}/${aggregatedPre.tacklesTotal} (${Math.round((aggregatedPre.tacklesOk/aggregatedPre.tacklesTotal)*100)}%)` : null 
    },
    { 
      label: 'Duelos Suelo', 
      value: aggregatedPre.groundDuelsOk, 
      extra: aggregatedPre.groundDuelsTotal ? `${aggregatedPre.groundDuelsOk}/${aggregatedPre.groundDuelsTotal} (${Math.round((aggregatedPre.groundDuelsOk/aggregatedPre.groundDuelsTotal)*100)}%)` : null 
    },
    { 
      label: 'Duelos Aéreos', 
      value: aggregatedPre.aerialDuelsOk, 
      extra: aggregatedPre.aerialDuelsTotal ? `${aggregatedPre.aerialDuelsOk}/${aggregatedPre.aerialDuelsTotal} (${Math.round((aggregatedPre.aerialDuelsOk/aggregatedPre.aerialDuelsTotal)*100)}%)` : null 
    },
  ];

  return (
    <>
      <div className="w-full flex flex-col gap-4 md:gap-6 animate-fade-in pb-6 md:pb-8 pt-2 md:pt-6">

      {/* Botón Volver — sticky en mobile */}
      <div className={`sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 ${isLight ? 'bg-slate-50' : 'bg-[#09090b]'} md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent border-0`}>
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
                <TeamLogo logoUrl={hLogo} teamName={hName} className="w-full h-full z-20 filter drop-shadow-xl" />
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
              <div className={`flex items-center gap-1 md:gap-2 px-2 py-0.5 md:px-4 md:py-1.5 rounded-md md:rounded-lg border font-black text-[9px] md:text-xs tracking-wider md:tracking-widest shadow-lg ${isLive ? 'bg-red-500/20 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800/80 text-slate-300 border-white/10'}`}>
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
                <TeamLogo logoUrl={aLogo} teamName={aName} className="w-full h-full z-20 filter drop-shadow-xl" />
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl z-0"></div>
              </div>
              <h2 className="text-xs sm:text-sm md:text-xl lg:text-3xl font-black text-center text-white break-words drop-shadow-md group-hover:text-indigo-300 transition-colors line-clamp-2 px-1">{aName}</h2>
              {aId && <span className="hidden md:inline text-[10px] font-semibold text-slate-500 group-hover:text-indigo-400 transition-colors">Ver perfil →</span>}
            </button>
          </div>

        </div>

      </div>

      {/* Submenu de navegación interna */}
      <div className="w-full flex border-b border-white/5 mb-2 bg-white/[0.01] rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => setSubSection('resumen')}
          className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-black tracking-wider uppercase transition-all border-0 cursor-pointer ${
            subSection === 'resumen'
              ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-white border border-emerald-500/20 font-black shadow-[0_0_12px_rgba(16,185,129,0.1)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          📝 Resumen
        </button>
        <button
          type="button"
          onClick={() => setSubSection('estadisticas')}
          className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-black tracking-wider uppercase transition-all border-0 cursor-pointer ${
            subSection === 'estadisticas'
              ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-white border border-emerald-500/20 font-black shadow-[0_0_12px_rgba(16,185,129,0.1)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          📊 Estadísticas
        </button>
      </div>

      {/* Cronología de Eventos – Timeline compacto */}
      {subSection === 'resumen' && match.incidents && match.incidents.length > 0 && (
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
              } else if (inc.incidentType === "woodwork") {
                icon = "🪵";
                colorClass = "text-orange-300 bg-orange-500/10";
                borderClass = "border-orange-500/30";
                title = `Tiro al palo - ${inc.player?.shortName || inc.player?.name || ''}`;
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

      {/* H2H Historial de enfrentamientos (Solo ligas) */}
      {subSection === 'estadisticas' && !h2hLoading && h2hMatches.length > 1 && h2hStats && (
        <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
          
          {/* Cabecera */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 text-xs">⚔️</span>
              <h3 className="text-sm font-bold text-white">Historial de Enfrentamientos (H2H)</h3>
              <span className="text-[10px] bg-white/5 border border-white/5 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                {h2hMatches.length} partidos
              </span>
            </div>
            
            {/* Controles del H2H */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Selector de Límite */}
              <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setH2hLimit(5)}
                  className={`px-2.5 py-1 rounded-lg transition-all border-0 cursor-pointer ${
                    h2hLimit === 5
                      ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/20 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Últimos 5
                </button>
                <button
                  type="button"
                  onClick={() => setH2hLimit(10)}
                  className={`px-2.5 py-1 rounded-lg transition-all border-0 cursor-pointer ${
                    h2hLimit === 10
                      ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/20 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Últimos 10
                </button>
              </div>

              {/* Selector de Condición (Localía) */}
              <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setH2hFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all border-0 cursor-pointer ${
                    h2hFilter === 'all'
                      ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/20 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setH2hFilter('local')}
                  className={`px-2.5 py-1 rounded-lg transition-all border-0 cursor-pointer ${
                    h2hFilter === 'local'
                      ? 'bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/20 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Local vs Visita
                </button>
              </div>
            </div>
          </div>

          {/* Grid de Estadísticas */}
          {processedH2H.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              No hay partidos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              {/* Tarjetas Principales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Tarjeta 1: Resultados */}
                <div className="bg-[#0b1015]/60 border border-white/5 rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Historial (Últimos {processedH2H.length})</span>
                    <span className="text-[10px] text-emerald-400 font-bold">W-D-L</span>
                  </div>
                  <div className="flex flex-col justify-center flex-1 gap-2">
                    <div className="flex justify-between text-xs font-semibold px-0.5">
                      <span className="text-emerald-400">{h2hStats.homeWins} L</span>
                      <span className="text-slate-400">{h2hStats.draws} E</span>
                      <span className="text-indigo-400">{h2hStats.awayWins} V</span>
                    </div>
                    {/* Barra de progreso de 3 segmentos */}
                    <div className="w-full h-3 rounded-full overflow-hidden bg-white/5 flex">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                        style={{ width: `${h2hStats.homeWinPct}%` }}
                        title={`Local: ${h2hStats.homeWinPct}%`}
                      />
                      <div
                        className="h-full bg-slate-600"
                        style={{ width: `${h2hStats.drawPct}%` }}
                        title={`Empate: ${h2hStats.drawPct}%`}
                      />
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                        style={{ width: `${h2hStats.awayWinPct}%` }}
                        title={`Visitante: ${h2hStats.awayWinPct}%`}
                      />
                    </div>
                  </div>
                </div>

                {/* Tarjeta 2: Goles */}
                <div className="bg-[#0b1015]/60 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Promedio de Goles</span>
                  <div className="flex flex-col justify-center flex-1 gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">{h2hStats.avgHomeGoals} gol{Number(h2hStats.avgHomeGoals) !== 1 ? 'es' : ''}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Local</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">{h2hStats.avgAwayGoals} gol{Number(h2hStats.avgAwayGoals) !== 1 ? 'es' : ''}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Visita</span>
                    </div>
                    <div className="h-px bg-white/5 my-0.5" />
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-emerald-400 font-black">{h2hStats.avgTotalGoals}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Total x Partido</span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta 3: Métricas Clave */}
                <div className="bg-[#0b1015]/60 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Datos Clave</span>
                  <div className="flex flex-col justify-center flex-1 gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Ambos anotan (BTTS):</span>
                      <span className="text-emerald-400 font-extrabold">{h2hStats.bttsPct}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Valla Invicta Local:</span>
                      <span className="text-slate-200 font-extrabold">{h2hStats.homeCleanSheetPct}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Valla Invicta Visita:</span>
                      <span className="text-slate-200 font-extrabold">{h2hStats.awayCleanSheetPct}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Estadísticas Promedio H2H Plegable */}
              {h2hExtendedStats && (
                <div className="border border-white/5 rounded-xl overflow-hidden bg-black/10 mb-2">
                  <button
                    type="button"
                    onClick={() => setShowH2hExtended(!showH2hExtended)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[10px] md:text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/[0.01] hover:bg-white/[0.03] select-none cursor-pointer border-0"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>📊</span>
                      <span>Ver estadísticas promedio H2H</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showH2hExtended ? 'rotate-180' : ''}`} />
                  </button>

                  {showH2hExtended && (
                    <div className="p-3 bg-[#080d12]/50 border-t border-white/5 flex flex-col gap-3">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Córners Promedio</span>
                          <div className="flex justify-center items-center gap-1 text-[11px] font-bold text-slate-200">
                            <span className="text-emerald-400">{h2hExtendedStats.homeCornersAvg}</span>
                            <span className="text-slate-600 font-sans">-</span>
                            <span className="text-indigo-400">{h2hExtendedStats.awayCornersAvg}</span>
                          </div>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Faltas Promedio</span>
                          <div className="flex justify-center items-center gap-1 text-[11px] font-bold text-slate-200">
                            <span className="text-emerald-400">{h2hExtendedStats.homeFoulsAvg}</span>
                            <span className="text-slate-600 font-sans">-</span>
                            <span className="text-indigo-400">{h2hExtendedStats.awayFoulsAvg}</span>
                          </div>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Tarjetas Amarillas</span>
                          <div className="flex justify-center items-center gap-1 text-[11px] font-bold text-slate-200">
                            <span className="text-emerald-400">{h2hExtendedStats.homeYellowCardsAvg}</span>
                            <span className="text-slate-600 font-sans">-</span>
                            <span className="text-indigo-400">{h2hExtendedStats.awayYellowCardsAvg}</span>
                          </div>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Remates Promedio</span>
                          <div className="flex justify-center items-center gap-1 text-[11px] font-bold text-slate-200">
                            <span className="text-emerald-400">{h2hExtendedStats.homeShotsAvg}</span>
                            <span className="text-slate-600 font-sans">-</span>
                            <span className="text-indigo-400">{h2hExtendedStats.awayShotsAvg}</span>
                          </div>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Al Arco Promedio</span>
                          <div className="flex justify-center items-center gap-1 text-[11px] font-bold text-slate-200">
                            <span className="text-emerald-400">{h2hExtendedStats.homeShotsOnTargetAvg}</span>
                            <span className="text-slate-600 font-sans">-</span>
                            <span className="text-indigo-400">{h2hExtendedStats.awayShotsOnTargetAvg}</span>
                          </div>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Posesión Promedio</span>
                          <div className="flex justify-center items-center gap-1 text-[11px] font-bold text-slate-200">
                            <span className="text-emerald-400">{h2hExtendedStats.homePossessionAvg}</span>
                            <span className="text-slate-600 font-sans">-</span>
                            <span className="text-indigo-400">{h2hExtendedStats.awayPossessionAvg}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desglose de Partidos Plegable */}
              <div className="border border-white/5 rounded-xl overflow-hidden bg-black/10">
                <button
                  type="button"
                  onClick={() => setIsH2hCollapsed(!isH2hCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] md:text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/[0.01] hover:bg-white/[0.03] select-none cursor-pointer border-0"
                >
                  <span className="flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Ver enfrentamientos incluidos ({processedH2H.length})</span>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isH2hCollapsed ? 'rotate-180' : ''}`} />
                </button>

                {isH2hCollapsed && (
                  <div className="flex flex-col divide-y divide-white/5 bg-[#080d12]/50 border-t border-white/5">
                    {processedH2H.map((m: any, idx: number) => {
                      const mhScore = m.homeScore?.current ?? m.homeTeam?.score ?? m.home_team?.score ?? 0;
                      const maScore = m.awayScore?.current ?? m.awayTeam?.score ?? m.away_team?.score ?? 0;
                      const mhName = m.homeTeam?.name || m.home_team?.name || 'Local';
                      const maName = m.awayTeam?.name || m.away_team?.name || 'Visitante';
                      const mhId = m.homeTeam?.id || m.home_team?.id;
                      const maId = m.awayTeam?.id || m.away_team?.id;
                      
                      const isCurrentLocal = Number(mhId) === Number(match.homeTeam?.id || match.home_team?.id);

                      const dateText = m.startTimestamp 
                        ? new Date(m.startTimestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '';

                      const targetId = m.id || m._id || m.matchId;

                      return (
                        <div
                          key={targetId || idx}
                          onClick={() => {
                            if (targetId) {
                              router.push(`/match/${targetId}`);
                            }
                          }}
                          className={`grid grid-cols-[80px_1fr_auto_1fr] items-center px-3 py-2 transition-colors text-xs font-semibold ${
                            targetId ? 'cursor-pointer hover:bg-white/[0.05]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{dateText}</span>
                          <div className={`flex items-center justify-end gap-1.5 text-right min-w-0 ${isCurrentLocal ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            <span className="truncate">{mhName}</span>
                            <img
                              src={`/escudos/${mhId}.png`}
                              alt={mhName}
                              className="w-4 h-4 object-contain shrink-0"
                              onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = '/football2.png'; }}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 mx-2 rounded bg-black/40 border border-white/5 font-black shrink-0">
                            <span className={isCurrentLocal ? 'text-emerald-400' : 'text-slate-300'}>{mhScore}</span>
                            <span className="text-slate-600 text-[10px] font-sans">-</span>
                            <span className={!isCurrentLocal ? 'text-emerald-400' : 'text-slate-300'}>{maScore}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-left min-w-0 ${!isCurrentLocal ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            <img
                              src={`/escudos/${maId}.png`}
                              alt={maName}
                              className="w-4 h-4 object-contain shrink-0"
                              onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = '/football2.png'; }}
                            />
                            <span className="truncate">{maName}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* Forma Reciente y Promedios (Solo ligas, excluyendo mundial) */}
      {subSection === 'estadisticas' && !isMundialMatch && !teamMatchesLoading && (processedHomeTeamMatches.length > 0 || processedAwayTeamMatches.length > 0) && (
        <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 shadow-lg animate-fade-in">
          {/* Cabecera */}
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 text-xs">📈</span>
            <h3 className="text-sm font-bold text-white">Rendimiento en Condición</h3>
            <span className="text-[10px] bg-white/5 border border-white/5 text-slate-400 px-2 py-0.5 rounded-full font-bold">
              Últimos 5 partidos ({hName} de Local / {aName} de Visita)
            </span>
          </div>

          {/* Grid de 2 Columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/5">
            
            {/* COLUMNA LOCAL */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <img
                  src={`/escudos/${hId}.png`}
                  alt={hName}
                  className="w-6 h-6 object-contain shrink-0"
                  onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = '/football2.png'; }}
                />
                <div className="flex flex-col">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">{hName}</h4>
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Como Local</span>
                </div>
              </div>

              {/* Racha / Form badges */}
              <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Historial Reciente (Local)</span>
                <div className="flex items-center gap-2">
                  {processedHomeTeamMatches.map((m, idx) => {
                    const outcome = getTeamMatchOutcome(m, hId);
                    if (!outcome) return null;
                    const badgeColors = {
                      V: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
                      D: 'bg-red-500/20 text-red-400 border-red-500/30',
                      E: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    };
                    const targetId = m.id || m._id || m.matchId;
                    return (
                      <span
                        key={targetId || idx}
                        onClick={() => {
                          if (targetId) {
                            router.push(`/match/${targetId}`);
                          }
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border transition-all ${
                          targetId ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
                        } ${badgeColors[outcome]}`}
                        title={outcome === 'V' ? 'Victoria' : outcome === 'D' ? 'Derrota' : 'Empate'}
                      >
                        {outcome}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Promedios Local */}
              {homeTeamAverages && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Tiros</span>
                      <span className="text-sm font-black text-slate-200">{homeTeamAverages.shotsAvg}</span>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Córners</span>
                      <span className="text-sm font-black text-slate-200">{homeTeamAverages.cornersAvg}</span>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Faltas</span>
                      <span className="text-sm font-black text-slate-200">{homeTeamAverages.foulsAvg}</span>
                    </div>
                  </div>

                  {showTeamStatsExtended && (
                    <div className="grid grid-cols-3 gap-2 animate-fade-in border-t border-white/5 pt-2 mt-1">
                      <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Al Arco</span>
                        <span className="text-sm font-black text-emerald-400">{homeTeamAverages.shotsOnTargetAvg}</span>
                      </div>
                      <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Amarillas</span>
                        <span className="text-sm font-black text-yellow-400">{homeTeamAverages.yellowCardsAvg}</span>
                      </div>
                      <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Posesión</span>
                        <span className="text-sm font-black text-teal-400">{homeTeamAverages.possessionAvg}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desglose Partidos Local */}
              <div className="flex flex-col divide-y divide-white/[0.03] bg-[#0b1015]/40 rounded-xl border border-white/5 overflow-hidden">
                {processedHomeTeamMatches.map((m, idx) => {
                  const outcome = getTeamMatchOutcome(m, hId);
                  const opponentName = m.awayTeam?.name || m.away_team?.name || 'Visitante';
                  const mhScore = m.homeScore?.current ?? m.homeTeam?.score ?? m.home_team?.score ?? 0;
                  const maScore = m.awayScore?.current ?? m.awayTeam?.score ?? m.away_team?.score ?? 0;
                  const dateText = m.startTimestamp 
                    ? new Date(m.startTimestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                    : '';
                  const targetId = m.id || m._id || m.matchId;
                  
                  return (
                    <div
                      key={targetId || idx}
                      onClick={() => {
                        if (targetId) {
                          router.push(`/match/${targetId}`);
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${
                        targetId ? 'cursor-pointer hover:bg-white/[0.05]' : 'hover:bg-white/[0.01]'
                      }`}
                    >
                      <span className="text-[9px] text-slate-500 font-bold uppercase">{dateText}</span>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center px-2">
                        <span className="text-slate-400 truncate max-w-[80px] text-right">{hName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-[10px] font-black font-mono shrink-0">
                          {mhScore} - {maScore}
                        </span>
                        <span className="text-slate-355 truncate max-w-[80px] font-bold">{opponentName}</span>
                      </div>
                      {outcome && (
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${
                          outcome === 'V' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          outcome === 'D' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {outcome}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA VISITANTE */}
            <div className="flex flex-col gap-4 pt-6 md:pt-0 md:pl-6">
              <div className="flex items-center gap-2">
                <img
                  src={`/escudos/${aId}.png`}
                  alt={aName}
                  className="w-6 h-6 object-contain shrink-0"
                  onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = '/football2.png'; }}
                />
                <div className="flex flex-col">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">{aName}</h4>
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Como Visitante</span>
                </div>
              </div>

              {/* Racha / Form badges */}
              <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Historial Reciente (Visita)</span>
                <div className="flex items-center gap-2">
                  {processedAwayTeamMatches.map((m, idx) => {
                    const outcome = getTeamMatchOutcome(m, aId);
                    if (!outcome) return null;
                    const badgeColors = {
                      V: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
                      D: 'bg-red-500/20 text-red-400 border-red-500/30',
                      E: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    };
                    const targetId = m.id || m._id || m.matchId;
                    return (
                      <span
                        key={targetId || idx}
                        onClick={() => {
                          if (targetId) {
                            router.push(`/match/${targetId}`);
                          }
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border transition-all ${
                          targetId ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
                        } ${badgeColors[outcome]}`}
                        title={outcome === 'V' ? 'Victoria' : outcome === 'D' ? 'Derrota' : 'Empate'}
                      >
                        {outcome}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Promedios Visitante */}
              {awayTeamAverages && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Tiros</span>
                      <span className="text-sm font-black text-slate-200">{awayTeamAverages.shotsAvg}</span>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Córners</span>
                      <span className="text-sm font-black text-slate-200">{awayTeamAverages.cornersAvg}</span>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Faltas</span>
                      <span className="text-sm font-black text-slate-200">{awayTeamAverages.foulsAvg}</span>
                    </div>
                  </div>

                  {showTeamStatsExtended && (
                    <div className="grid grid-cols-3 gap-2 animate-fade-in border-t border-white/5 pt-2 mt-1">
                      <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Al Arco</span>
                        <span className="text-sm font-black text-emerald-400">{awayTeamAverages.shotsOnTargetAvg}</span>
                      </div>
                      <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Amarillas</span>
                        <span className="text-sm font-black text-yellow-400">{awayTeamAverages.yellowCardsAvg}</span>
                      </div>
                      <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Posesión</span>
                        <span className="text-sm font-black text-teal-400">{awayTeamAverages.possessionAvg}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desglose Partidos Visitante */}
              <div className="flex flex-col divide-y divide-white/[0.03] bg-[#0b1015]/40 rounded-xl border border-white/5 overflow-hidden">
                {processedAwayTeamMatches.map((m, idx) => {
                  const outcome = getTeamMatchOutcome(m, aId);
                  const opponentName = m.homeTeam?.name || m.home_team?.name || 'Local';
                  const mhScore = m.homeScore?.current ?? m.homeTeam?.score ?? m.home_team?.score ?? 0;
                  const maScore = m.awayScore?.current ?? m.awayTeam?.score ?? m.away_team?.score ?? 0;
                  const dateText = m.startTimestamp 
                    ? new Date(m.startTimestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                    : '';
                  const targetId = m.id || m._id || m.matchId;
                  
                  return (
                    <div
                      key={targetId || idx}
                      onClick={() => {
                        if (targetId) {
                          router.push(`/match/${targetId}`);
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${
                        targetId ? 'cursor-pointer hover:bg-white/[0.05]' : 'hover:bg-white/[0.01]'
                      }`}
                    >
                      <span className="text-[9px] text-slate-500 font-bold uppercase">{dateText}</span>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center px-2">
                        <span className="text-slate-350 truncate max-w-[80px] text-right font-bold">{opponentName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-[10px] font-black font-mono shrink-0">
                          {mhScore} - {maScore}
                        </span>
                        <span className="text-slate-400 truncate max-w-[80px]">{aName}</span>
                      </div>
                      {outcome && (
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${
                          outcome === 'V' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          outcome === 'D' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {outcome}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Botón Ver Más Estadísticas de Promedios */}
          {(homeTeamAverages || awayTeamAverages) && (
            <button
              type="button"
              onClick={() => setShowTeamStatsExtended(!showTeamStatsExtended)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-white/5 rounded-xl bg-black/20 hover:bg-black/40 hover:text-white text-[10px] md:text-xs font-bold text-slate-400 transition-colors select-none cursor-pointer"
            >
              <span>{showTeamStatsExtended ? 'Ver menos estadísticas ↑' : 'Ver más estadísticas (Remates al arco, Amarillas, Posesión) ↓'}</span>
            </button>
          )}
        </div>
      )}

      {/* Estadísticas (Movido debajo de la Cronología de Eventos) */}
      {subSection === 'resumen' && match.live_statistics && match.live_statistics.length > 0 && (
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

      {/* Tabla Compacta de Estadísticas de Jugadores */}
      {subSection === 'resumen' && (() => {
        if (!elninePlayers || elninePlayers.length === 0) return null;

        const normalizeString = (str: string) => {
          return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
        };

        // Filtrar jugadores con al menos alguna estadística mayor a 0
        const playersWithStats = elninePlayers.filter((p: any) => {
          if (!p.stats) return false;
          const shots = p.stats.shots || 0;
          const shotsOnTarget = p.stats.shotsOnTarget || 0;
          const foulsCommitted = p.stats.foulsCommitted || 0;
          const foulsWon = p.stats.foulsWon || 0;
          const tackles = p.stats.tackles?.total || p.stats.tackles?.ok || 0;
          return (shots + shotsOnTarget + foulsCommitted + foulsWon + tackles) > 0;
        });

        if (playersWithStats.length === 0) return null;

        // Ordenar según el campo y dirección elegidos
        const sortedPlayers = [...playersWithStats].sort((a: any, b: any) => {
          let valA = 0;
          let valB = 0;

          if (sortField === 'shots') {
            valA = a.stats.shots || 0;
            valB = b.stats.shots || 0;
          } else if (sortField === 'shotsOnTarget') {
            valA = a.stats.shotsOnTarget || 0;
            valB = b.stats.shotsOnTarget || 0;
          } else if (sortField === 'foulsCommitted') {
            valA = a.stats.foulsCommitted || 0;
            valB = b.stats.foulsCommitted || 0;
          } else if (sortField === 'foulsWon') {
            valA = a.stats.foulsWon || 0;
            valB = b.stats.foulsWon || 0;
          } else if (sortField === 'tackles') {
            valA = a.stats.tackles?.ok || 0;
            valB = b.stats.tackles?.ok || 0;
          }

          if (valA === valB) {
            return (a.nameFull || a.name || '').localeCompare(b.nameFull || b.name || '');
          }

          return sortDirection === 'desc' ? valB - valA : valA - valB;
        });

        const displayedPlayers = showAllPlayerStats ? sortedPlayers : sortedPlayers.slice(0, 5);

        const handleSort = (field: 'shots' | 'shotsOnTarget' | 'foulsCommitted' | 'foulsWon' | 'tackles') => {
          if (sortField === field) {
            setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
          } else {
            setSortField(field);
            setSortDirection('desc');
          }
        };

        const homeClean = normalizeString(match.home_team?.name || match.homeTeam?.name || '');
        
        return (
          <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col gap-3 shadow-lg h-fit">
            <div className="flex flex-row items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 text-[10px] md:text-xs">🏃</span>
                <h3 className="text-xs md:text-sm font-bold text-white">Estadísticas de Jugadores</h3>
              </div>
              <span className="text-[8px] md:text-[9px] text-slate-500 uppercase tracking-widest font-black">
                Columna activa: {sortField === 'shots' ? 'Tiros' : sortField === 'shotsOnTarget' ? 'Tiros al arco' : sortField === 'foulsCommitted' ? 'Faltas cometidas' : sortField === 'foulsWon' ? 'Faltas recibidas' : 'Entradas'}
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 font-bold">
                    <th className="py-1.5 pl-1 font-bold text-slate-400">Jugador</th>
                    <th 
                      onClick={() => handleSort('shots')}
                      className={`py-1.5 px-2 text-center cursor-pointer hover:text-white transition-colors select-none ${sortField === 'shots' ? 'text-emerald-400 font-black' : ''}`}
                    >
                      Tiros {sortField === 'shots' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th 
                      onClick={() => handleSort('shotsOnTarget')}
                      className={`py-1.5 px-2 text-center cursor-pointer hover:text-white transition-colors select-none ${sortField === 'shotsOnTarget' ? 'text-emerald-400 font-black' : ''}`}
                    >
                      Al Arco {sortField === 'shotsOnTarget' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th 
                      onClick={() => handleSort('foulsCommitted')}
                      className={`py-1.5 px-2 text-center cursor-pointer hover:text-white transition-colors select-none ${sortField === 'foulsCommitted' ? 'text-emerald-400 font-black' : ''}`}
                    >
                      Faltas {sortField === 'foulsCommitted' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th 
                      onClick={() => handleSort('foulsWon')}
                      className={`py-1.5 px-2 text-center cursor-pointer hover:text-white transition-colors select-none ${sortField === 'foulsWon' ? 'text-emerald-400 font-black' : ''}`}
                    >
                      Recibidas {sortField === 'foulsWon' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th 
                      onClick={() => handleSort('tackles')}
                      className={`py-1.5 pr-1 text-center cursor-pointer hover:text-white transition-colors select-none ${sortField === 'tackles' ? 'text-emerald-400 font-black' : ''}`}
                    >
                      Entradas {sortField === 'tackles' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {displayedPlayers.map((player: any, pIdx: number) => {
                    const playerFlagClean = normalizeString(player.countryFlag || '');
                    const isHomeTeam = homeClean.includes(playerFlagClean) || playerFlagClean.includes(homeClean);

                    return (
                      <tr 
                        key={pIdx}
                        onClick={() => setSelectedPlayer(player)}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                      >
                        <td className="py-2 pl-1 flex items-center gap-1.5 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHomeTeam ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                          <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate max-w-[120px] sm:max-w-xs">
                            {player.nameFull || player.name}
                          </span>
                          <span className="text-[9px] text-slate-500 shrink-0 font-medium">#{player.number}</span>
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-300">{player.stats.shots || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-300">{player.stats.shotsOnTarget || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-300">{player.stats.foulsCommitted || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-300">{player.stats.foulsWon || 0}</td>
                        <td className="py-2 pr-1 text-center font-bold text-slate-300">
                          {player.stats.tackles?.ok || 0}/{player.stats.tackles?.total || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sortedPlayers.length > 5 && (
              <button
                onClick={() => setShowAllPlayerStats(!showAllPlayerStats)}
                className="w-full text-center py-1.5 text-[9px] md:text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/[0.02] border-t border-white/5 transition-all cursor-pointer mt-1"
              >
                {showAllPlayerStats ? 'Ver menos ↑' : `Ver más (${sortedPlayers.length - 5} jugadores con estadísticas) ↓`}
              </button>
            )}
          </div>
        );
      })()}

      {/* Data Section: Detalles, Alineaciones, Tabla, Promedios y Pronósticos */}
      <div className={`grid grid-cols-1 ${
        user && (
          (subSection === 'resumen') || 
          (subSection === 'estadisticas' && statusType !== 'finished' && globalPlayers && globalPlayers.length > 0)
        ) ? 'xl:grid-cols-3' : 'xl:grid-cols-1'
      } gap-3 md:gap-4`}>

        {/* COLUMNA IZQUIERDA: Detalles, Alineaciones (Resumen) y Tabla (Estadísticas) */}
        <div className="xl:col-span-1 flex flex-col gap-3 md:gap-4">

          {/* Detalles (solo antes de empezar el partido) */}
          {subSection === 'resumen' && !hasStarted && (
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
          {subSection === 'resumen' && match.lineups && (
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
                    {(match.lineups.home?.players || []).filter((p: any) => !p.substitute).map((p: any, i: number) => {
                      const scrapedPlayer = findScrapedPlayer(p, true);
                      const hasStats = !!scrapedPlayer?.stats;
                      return (
                        <div 
                          key={i} 
                          onClick={() => scrapedPlayer && setSelectedPlayer(scrapedPlayer)}
                          className={`flex items-center gap-2 group min-w-0 rounded-lg p-1 border border-transparent transition-all ${scrapedPlayer ? 'cursor-pointer hover:bg-emerald-500/5 hover:border-emerald-500/20 active:scale-[0.98]' : ''}`}
                        >
                          <span className="w-4 h-4 md:w-5 md:h-5 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[8px] md:text-[9px] font-bold border border-emerald-500/20 shadow-sm shrink-0 animate-pulse-slow">
                            {p.jerseyNumber}
                          </span>
                          <div className="flex flex-col truncate overflow-hidden w-full">
                            <div className="flex items-center gap-1.5 w-full min-w-0">
                              <span className="text-slate-300 text-[10px] md:text-[11px] font-semibold truncate group-hover:text-emerald-300 transition-colors shrink min-w-0">{p.player?.shortName || p.player?.name}</span>
                              {hasStats && <BarChart3 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-all shrink-0" />}
                            </div>
                            <span className="text-slate-600 text-[7px] md:text-[8px] uppercase font-bold">{p.position}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Divisor */}
                  <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

                  {/* VISITANTE */}
                  <div className="flex-1 flex flex-col gap-2 pl-1 min-w-0">
                    {(match.lineups.away?.players || []).filter((p: any) => !p.substitute).map((p: any, i: number) => {
                      const scrapedPlayer = findScrapedPlayer(p, false);
                      const hasStats = !!scrapedPlayer?.stats;
                      return (
                        <div 
                          key={i} 
                          onClick={() => scrapedPlayer && setSelectedPlayer(scrapedPlayer)}
                          className={`flex items-center justify-end gap-2 group text-right min-w-0 rounded-lg p-1 border border-transparent transition-all ${scrapedPlayer ? 'cursor-pointer hover:bg-indigo-500/5 hover:border-indigo-500/20 active:scale-[0.98]' : ''}`}
                        >
                          <div className="flex flex-col truncate overflow-hidden w-full items-end">
                            <div className="flex items-center gap-1.5 w-full min-w-0 justify-end">
                              {hasStats && <BarChart3 className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-all shrink-0" />}
                              <span className="text-slate-300 text-[10px] md:text-[11px] font-semibold truncate group-hover:text-indigo-300 transition-colors shrink min-w-0">{p.player?.shortName || p.player?.name}</span>
                            </div>
                            <span className="text-slate-600 text-[7px] md:text-[8px] uppercase font-bold">{p.position}</span>
                          </div>
                          <span className="w-4 h-4 md:w-5 md:h-5 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[8px] md:text-[9px] font-bold border border-indigo-500/20 shadow-sm shrink-0 animate-pulse-slow">
                            {p.jerseyNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SUPLENTES */}
                {((match.lineups.home?.players || []).some((p: any) => p.substitute) || 
                  (match.lineups.away?.players || []).some((p: any) => p.substitute)) && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSubstitutes(!showSubstitutes)}
                      className="w-full text-center py-2 text-[10px] md:text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-t border-white/5 transition-all cursor-pointer mt-3 flex items-center justify-center gap-1.5"
                    >
                      {showSubstitutes ? 'Ocultar suplentes' : 'Ver suplentes'}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSubstitutes ? 'rotate-180' : ''}`} />
                    </button>
                    {showSubstitutes && (
                      <div className="mt-2 pt-3 border-t border-white/5 flex flex-col gap-2 animate-fade-in">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">Suplentes</h4>
                        <div className="flex w-full gap-2">
                          {/* LOCAL SUPLENTES */}
                          <div className="flex-1 flex flex-col gap-2 pr-1 min-w-0">
                            {(match.lineups.home?.players || []).filter((p: any) => p.substitute).map((p: any, i: number) => {
                              const scrapedPlayer = findScrapedPlayer(p, true);
                              const hasStats = !!scrapedPlayer?.stats;
                              return (
                                <div 
                                  key={i} 
                                  onClick={() => scrapedPlayer && setSelectedPlayer(scrapedPlayer)}
                                  className={`flex items-center gap-2 group min-w-0 rounded-lg p-1 border border-transparent transition-all ${scrapedPlayer ? 'cursor-pointer hover:bg-emerald-500/5 hover:border-emerald-500/20 active:scale-[0.98]' : ''}`}
                                >
                                  <span className="w-4 h-4 md:w-5 md:h-5 rounded bg-emerald-500/5 text-emerald-500/60 flex items-center justify-center text-[8px] md:text-[9px] font-bold border border-emerald-500/10 shadow-sm shrink-0">
                                    {p.jerseyNumber}
                                  </span>
                                  <div className="flex flex-col truncate overflow-hidden w-full">
                                    <div className="flex items-center gap-1.5 w-full min-w-0">
                                      <span className="text-slate-400 text-[10px] md:text-[11px] font-medium truncate group-hover:text-emerald-300 transition-colors shrink min-w-0">{p.player?.shortName || p.player?.name}</span>
                                      {hasStats && <BarChart3 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-all shrink-0" />}
                                    </div>
                                    <span className="text-slate-600 text-[7px] md:text-[8px] uppercase font-bold">{p.position}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Divisor */}
                          <div className="w-px bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>

                          {/* VISITANTE SUPLENTES */}
                          <div className="flex-1 flex flex-col gap-2 pl-1 min-w-0">
                            {(match.lineups.away?.players || []).filter((p: any) => p.substitute).map((p: any, i: number) => {
                              const scrapedPlayer = findScrapedPlayer(p, false);
                              const hasStats = !!scrapedPlayer?.stats;
                              return (
                                <div 
                                  key={i} 
                                  onClick={() => scrapedPlayer && setSelectedPlayer(scrapedPlayer)}
                                  className={`flex items-center justify-end gap-2 group text-right min-w-0 rounded-lg p-1 border border-transparent transition-all ${scrapedPlayer ? 'cursor-pointer hover:bg-indigo-500/5 hover:border-indigo-500/20 active:scale-[0.98]' : ''}`}
                                >
                                  <div className="flex flex-col truncate overflow-hidden w-full items-end">
                                    <div className="flex items-center gap-1.5 w-full min-w-0 justify-end">
                                      {hasStats && <BarChart3 className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-all shrink-0" />}
                                      <span className="text-slate-400 text-[10px] md:text-[11px] font-medium truncate group-hover:text-indigo-300 transition-colors shrink min-w-0">{p.player?.shortName || p.player?.name}</span>
                                    </div>
                                    <span className="text-slate-600 text-[7px] md:text-[8px] uppercase font-bold">{p.position}</span>
                                  </div>
                                  <span className="w-4 h-4 md:w-5 md:h-5 rounded bg-indigo-500/5 text-indigo-500/60 flex items-center justify-center text-[8px] md:text-[9px] font-bold border border-indigo-500/10 shadow-sm shrink-0">
                                    {p.jerseyNumber}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Posiciones en la tabla / Tabla de Grupos Mundial */}
          {subSection === 'estadisticas' && (isMundialMatch ? (
            (() => {
              const groupData = getMatchGroupData();
              if (loadingMundialStandings && !groupData) {
                return (
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col gap-3 shadow-lg justify-center items-center h-48">
                    <div className="animate-spin w-6 h-6 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent"></div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cargando Tabla...</span>
                  </div>
                );
              }
              if (!groupData) return null;

              const { groupKey, groupTeams } = groupData;
              return (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col gap-3 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 text-[10px] md:text-xs">🏆</span>
                      <h3 className="text-xs md:text-sm font-bold text-slate-200">
                        Tabla - {formatTabName(groupKey)}
                      </h3>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-black/20 px-1.5 py-0.5 rounded border border-white/5">Mundial</span>
                  </div>

                  <div className="overflow-hidden bg-[#0b1015]/60 rounded-xl border border-white/5 relative shadow-inner">
                    <div className="w-full overflow-x-auto no-scrollbar">
                      <table className="w-full text-left border-collapse text-[11px] min-w-[300px]">
                        <thead className="bg-[#121820] text-slate-400 font-extrabold uppercase text-[9px] tracking-wider border-b border-white/10">
                          <tr>
                            <th className="py-2 px-1 text-center w-6">#</th>
                            <th className="py-2 px-2 text-left">Equipo</th>
                            <th className="py-2 px-1 text-center text-amber-400">Pts</th>
                            <th className="py-2 px-1 text-center">PJ</th>
                            <th className="py-2 px-1 text-center">G</th>
                            <th className="py-2 px-1 text-center">E</th>
                            <th className="py-2 px-1 text-center">P</th>
                            <th className="py-2 px-1.5 text-center">DIF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {groupTeams.map((row: any, idx: number) => {
                            const isHomeTeam = row.equipoId === hId;
                            const isAwayTeam = row.equipoId === aId;
                            const isCurrentMatchTeam = isHomeTeam || isAwayTeam;

                            // Custom highlighting class
                            const rowHighlightClass = isHomeTeam
                              ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                              : isAwayTeam
                              ? 'bg-indigo-500/5 hover:bg-indigo-500/10'
                              : 'hover:bg-white/[0.02]';

                            const teamNameClass = isHomeTeam
                              ? 'text-emerald-400 font-black'
                              : isAwayTeam
                              ? 'text-indigo-400 font-black'
                              : 'text-slate-200 font-bold';

                            return (
                              <tr
                                key={row.equipoId || idx}
                                onClick={() => row.equipoId && router.push(`/team/${row.equipoId}`)}
                                className={`transition-colors cursor-pointer ${rowHighlightClass}`}
                              >
                                <td className="py-2 px-1 text-center font-black text-slate-500">
                                  {row.posicion || idx + 1}
                                </td>
                                <td className="py-2 px-2">
                                  <TeamHoverCard teamId={row.equipoId} teamName={row.nombre} className="flex items-center">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div className="w-5 h-5 flex-shrink-0 bg-white/5 rounded-full p-0.5 border border-white/5">
                                        <img
                                          src={`/escudos/${row.equipoId}.png`}
                                          alt={row.nombre}
                                          className="w-full h-full object-contain"
                                          onError={(e) => { (e.target as HTMLImageElement).src = '/football2.png' }}
                                        />
                                      </div>
                                      <span className={`truncate max-w-[90px] ${teamNameClass}`}>
                                        {translateTeamToSpanish(row.nombre)}
                                      </span>
                                      {isCurrentMatchTeam && (
                                        <span className={`w-1.5 h-1.5 rounded-full ${isHomeTeam ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' : 'bg-indigo-400 shadow-[0_0_4px_#818cf8]'}`} />
                                      )}
                                    </div>
                                  </TeamHoverCard>
                                </td>
                                <td className="py-2 px-1 text-center font-black text-amber-400 bg-amber-500/5">
                                  {row.puntos ?? '-'}
                                </td>
                                <td className="py-2 px-1 text-center text-slate-400 font-medium">
                                  {row.partidosJugados ?? '-'}
                                </td>
                                <td className="py-2 px-1 text-center text-slate-350">
                                  {row.ganados ?? '-'}
                                </td>
                                <td className="py-2 px-1 text-center text-slate-450">
                                  {row.empatados ?? '-'}
                                </td>
                                <td className="py-2 px-1 text-center text-slate-455">
                                  {row.perdidos ?? '-'}
                                </td>
                                <td className="py-2 px-1.5 text-center font-bold text-slate-350">
                                  {row.diferenciaGoles ?? '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            match.posiciones && (
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
            )
          ))}

          {/* Historial / Enfrentamientos Previos */}
          {subSection === 'estadisticas' && match.historial && (
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

        {/* COLUMNA DERECHA: Promedios de Jugadores + Pronósticos */}
        {user && (
          <div className="xl:col-span-2 flex flex-col gap-3 md:gap-4">

            {/* CUADRO DE ESTADÍSTICAS PROMEDIO PRE-PARTIDO */}
            {subSection === 'estadisticas' && statusType !== 'finished' && (() => {
                if (!globalPlayers || globalPlayers.length === 0) return null;

                const findGlobalPlayer = (lineupPlayer: any) => {
                  const dbName = (lineupPlayer.player?.name || lineupPlayer.player?.shortName || '').toLowerCase();
                  const dbShort = (lineupPlayer.player?.shortName || '').toLowerCase();
                  const dbNumber = lineupPlayer.jerseyNumber;

                  const normalizeString = (str: string) => {
                    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
                  };

                  const normDbName = normalizeString(dbName);
                  const normDbShort = normalizeString(dbShort);

                  const candidates = globalPlayers.filter((gp: any) => gp.number === dbNumber);
                  if (candidates.length === 1) {
                    return candidates[0];
                  } else if (candidates.length > 1) {
                    for (const gp of candidates) {
                      const gpName = normalizeString(gp.nameFull || gp.name || '');
                      if (gpName.includes(normDbShort) || normDbName.includes(gpName) || gpName.includes(normDbName)) {
                        return gp;
                      }
                    }
                  }

                  return globalPlayers.find((gp: any) => {
                    const gpName = normalizeString(gp.nameFull || gp.name || '');
                    const gpShort = normalizeString(gp.name || '');
                    return (
                      gpName.includes(normDbName) || 
                      normDbName.includes(gpName) ||
                      gpName.includes(normDbShort) ||
                      gpShort.includes(normDbShort)
                    );
                  }) || null;
                };

                const homeTeamName = hName;
                const awayTeamName = aName;

                const isPreloaded = match.elnine_players && match.elnine_players.length > 0;
                const isNotStarted = match.status?.type === 'notstarted';
                const shouldSubtract = (isNotStarted && isPreloaded) || isLive;

                const isPlayerInPreloadedLineup = (gp: any) => {
                  if (!match.elnine_players) return false;
                  return match.elnine_players.some((ep: any) => {
                    const epName = (ep.nameFull || ep.name || '').toLowerCase();
                    const gpName = (gp.nameFull || gp.name || '').toLowerCase();
                    return ep.number === gp.number || epName.includes(gpName) || gpName.includes(epName);
                  });
                };

                let combined: any[] = [];

                if (match.lineups && (match.lineups.home?.players?.length > 0 || match.lineups.away?.players?.length > 0)) {
                  const homePlayersLineup = (match.lineups.home?.players || []).map((p: any) => ({ ...p, isHome: true }));
                  const awayPlayersLineup = (match.lineups.away?.players || []).map((p: any) => ({ ...p, isHome: false }));
                  const allLineup = [...homePlayersLineup, ...awayPlayersLineup];
                  
                  combined = allLineup.map(lp => {
                    const gp = findGlobalPlayer(lp);
                    if (!gp) return null;

                    let actualMatches = gp.totalMatches || 0;
                    if (shouldSubtract && isPlayerInPreloadedLineup(gp) && actualMatches > 0) {
                      actualMatches -= 1;
                    }

                    return {
                      nameFull: gp.nameFull || lp.player?.name,
                      name: gp.name || lp.player?.shortName,
                      number: lp.jerseyNumber || gp.number,
                      position: lp.position || gp.position,
                      isHome: lp.isHome,
                      totalMatches: actualMatches,
                      stats: {
                        shots: gp.shots || 0,
                        shotsOnTarget: gp.shotsOnTarget || 0,
                        foulsCommitted: gp.foulsCommitted || 0,
                        foulsWon: gp.foulsWon || 0,
                      }
                    };
                  }).filter(Boolean);
                } else {
                  const homeList = globalPlayers.filter(gp => isPlayerOfTeam(gp.selection, homeTeamName)).map(gp => {
                    let actualMatches = gp.totalMatches || 0;
                    if (shouldSubtract && isPlayerInPreloadedLineup(gp) && actualMatches > 0) {
                      actualMatches -= 1;
                    }
                    return {
                      nameFull: gp.nameFull,
                      name: gp.name,
                      number: gp.number,
                      position: gp.position,
                      isHome: true,
                      totalMatches: actualMatches,
                      stats: {
                        shots: gp.shots || 0,
                        shotsOnTarget: gp.shotsOnTarget || 0,
                        foulsCommitted: gp.foulsCommitted || 0,
                        foulsWon: gp.foulsWon || 0,
                      }
                    };
                  });

                  const awayList = globalPlayers.filter(gp => isPlayerOfTeam(gp.selection, awayTeamName)).map(gp => {
                    let actualMatches = gp.totalMatches || 0;
                    if (shouldSubtract && isPlayerInPreloadedLineup(gp) && actualMatches > 0) {
                      actualMatches -= 1;
                    }
                    return {
                      nameFull: gp.nameFull,
                      name: gp.name,
                      number: gp.number,
                      position: gp.position,
                      isHome: false,
                      totalMatches: actualMatches,
                      stats: {
                        shots: gp.shots || 0,
                        shotsOnTarget: gp.shotsOnTarget || 0,
                        foulsCommitted: gp.foulsCommitted || 0,
                        foulsWon: gp.foulsWon || 0,
                      }
                    };
                  });

                  combined = [...homeList, ...awayList];
                }

                const filtered = combined.filter(p => {
                  const total = p.stats.shots + p.stats.shotsOnTarget + p.stats.foulsCommitted + p.stats.foulsWon;
                  return p.totalMatches > 0 && total > 0;
                }).map(p => {
                  const matches = p.totalMatches;
                  return {
                    ...p,
                    avgStats: {
                      shots: p.stats.shots / matches,
                      shotsOnTarget: p.stats.shotsOnTarget / matches,
                      foulsCommitted: p.stats.foulsCommitted / matches,
                      foulsWon: p.stats.foulsWon / matches,
                    }
                  };
                });

                if (filtered.length === 0) return null;

                const sorted = [...filtered].sort((a, b) => {
                  let valA = a.avgStats[preSortField] || 0;
                  let valB = b.avgStats[preSortField] || 0;
                  if (valA === valB) {
                    return (a.nameFull || a.name || '').localeCompare(b.nameFull || b.name || '');
                  }
                  return preSortDirection === 'desc' ? valB - valA : valA - valB;
                });

                const displayed = showAllPreStats ? sorted : sorted.slice(0, 5);

                const handlePreSort = (field: 'shots' | 'shotsOnTarget' | 'foulsCommitted' | 'foulsWon') => {
                  if (preSortField === field) {
                    setPreSortDirection(preSortDirection === 'desc' ? 'asc' : 'desc');
                  } else {
                    setPreSortField(field);
                    setPreSortDirection('desc');
                  }
                };

                return (
                  <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col gap-3 shadow-lg h-fit">
                    <div className="flex flex-row items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 text-[10px] md:text-xs">📊</span>
                        <h3 className="text-xs md:text-sm font-bold text-white">Promedios de Jugadores</h3>
                      </div>
                      <span className="text-[8px] md:text-[9px] text-slate-500 uppercase tracking-widest font-black">
                        Partidos Previos
                      </span>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-400 font-bold">
                            <th className="py-1.5 pl-1 font-bold text-slate-400">Jugador</th>
                            <th 
                              onClick={() => handlePreSort('shots')}
                              className={`py-1.5 px-2 text-center cursor-pointer hover:text-white transition-colors select-none ${preSortField === 'shots' ? 'text-emerald-400 font-black' : ''}`}
                            >
                              Tiros {preSortField === 'shots' ? (preSortDirection === 'desc' ? '↓' : '↑') : ''}
                            </th>
                            <th 
                              onClick={() => handlePreSort('shotsOnTarget')}
                              className={`py-1.5 px-2 text-center cursor-pointer hover:text-white transition-colors select-none ${preSortField === 'shotsOnTarget' ? 'text-emerald-400 font-black' : ''}`}
                            >
                              Al Arco {preSortField === 'shotsOnTarget' ? (preSortDirection === 'desc' ? '↓' : '↑') : ''}
                            </th>
                            <th 
                              onClick={() => handlePreSort('foulsCommitted')}
                              className={`py-1.5 px-2 text-center cursor-pointer hover:text-white transition-colors select-none ${preSortField === 'foulsCommitted' ? 'text-emerald-400 font-black' : ''}`}
                            >
                              Faltas {preSortField === 'foulsCommitted' ? (preSortDirection === 'desc' ? '↓' : '↑') : ''}
                            </th>
                            <th 
                              onClick={() => handlePreSort('foulsWon')}
                              className={`py-1.5 pr-1 text-center cursor-pointer hover:text-white transition-colors select-none ${preSortField === 'foulsWon' ? (preSortDirection === 'desc' ? '↓' : '↑') : ''}`}
                            >
                              Recibidas {preSortField === 'foulsWon' ? (preSortDirection === 'desc' ? '↓' : '↑') : ''}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {displayed.map((player: any, pIdx: number) => {
                            return (
                              <tr 
                                key={pIdx}
                                onClick={() => setSelectedPrePlayerName(player.nameFull || player.name)}
                                className="hover:bg-white/[0.02] active:scale-[0.99] transition-all cursor-pointer group"
                              >
                                <td className="py-2 pl-1 flex items-center gap-1.5 min-w-0">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${player.isHome ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                  <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate max-w-[120px] sm:max-w-xs">
                                    {player.nameFull || player.name}
                                  </span>
                                  <span className="text-[9px] text-slate-500 shrink-0 font-medium">#{player.number}</span>
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-slate-350">{player.avgStats.shots.toFixed(2)}</td>
                                <td className="py-2 px-2 text-center font-bold text-slate-350">{player.avgStats.shotsOnTarget.toFixed(2)}</td>
                                <td className="py-2 px-2 text-center font-bold text-slate-350">{player.avgStats.foulsCommitted.toFixed(2)}</td>
                                <td className="py-2 pr-1 text-center font-bold text-slate-350">{player.avgStats.foulsWon.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {sorted.length > 5 && (
                      <button
                        onClick={() => setShowAllPreStats(!showAllPreStats)}
                        className="w-full text-center py-1.5 text-[9px] md:text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/[0.02] border-t border-white/5 transition-all cursor-pointer mt-1"
                      >
                        {showAllPreStats ? 'Ver menos ↑' : `Ver más (${sorted.length - 5} jugadores con promedios) ↓`}
                      </button>
                    )}
                  </div>
                );
              })()}
            {subSection === 'resumen' && (() => {
              const nowSec = Math.floor(Date.now() / 1000);
              const start = match.startTimestamp ?? 0;
            const isFinished = typeof match.status === 'object'
              ? match.status?.type === 'finished'
              : match.status === 'finished';
            const isLiveMatch = isLive;
            const isUnderTenMinutes = start > 0 && (nowSec >= start - 600);
            const predMode: 'hidden' | 'grey' | 'scored' =
              (isFinished || isLiveMatch) ? 'scored' :
                isUnderTenMinutes ? 'grey' :
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
              exact: isLight 
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' 
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
              trend: isLight 
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 font-extrabold' 
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300',
              wrong: isLight 
                ? 'border-red-500/20 bg-red-500/5 text-red-600' 
                : 'border-red-500/40 bg-red-500/10 text-red-400',
              grey: isLight 
                ? 'border-slate-200 bg-slate-100 text-slate-600' 
                : 'border-white/10 bg-white/5 text-slate-300',
              '': isLight 
                ? 'border-slate-200 bg-slate-100 text-slate-600' 
                : 'border-white/10 bg-white/5 text-slate-300',
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
 
                {isLiveMatch && (
                  <div className="bg-orange-500/10 border-b border-white/10 px-3 py-2 text-[10px] font-bold text-orange-400 flex items-start gap-2 leading-relaxed shadow-sm">
                    <span className="text-xs shrink-0 select-none">⚠️</span>
                    <span>Los colores en vivo muestran aciertos parciales. Los puntos del prode se computarán oficialmente solo una vez finalizado el partido.</span>
                  </div>
                )}
 
                {predMode === 'hidden' && (
                  <p className="text-center text-slate-500 text-[10px] py-2 font-medium">
                    🔒 Los scores se revelan 10 minutos antes del partido
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
                          <>
                            <span className="sr-only">Pronóstico oculto</span>
                            <div 
                              className="px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md border border-white/10 bg-white/5 text-slate-500 text-[10px] md:text-xs font-black select-none" 
                              style={{ filter: 'blur(5px)' }}
                              aria-hidden="true"
                            >
                              ? - ?
                            </div>
                          </>
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
        )}
      </div>
    </div>

      {/* MODAL DETALLES DEL JUGADOR */}
      {mounted && selectedPlayer && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 animate-fade-in">
          {/* Contenedor del Modal */}
          <div className={`relative w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0f141c] border-white/10 text-slate-200'} border rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
            
            {/* Header Modal */}
            <div className={`flex items-center justify-between p-4 md:p-6 border-b ${isLight ? 'border-slate-100 bg-slate-50' : 'border-white/5 bg-gradient-to-r from-emerald-500/10 to-indigo-500/10'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded ${isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'} flex items-center justify-center font-bold text-sm border`}>
                  {selectedPlayer.number || '#'}
                </span>
                <div className="flex flex-col">
                  <h3 className={`text-sm md:text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'} leading-tight flex items-center gap-1.5`}>
                    {selectedPlayer.nameFull || selectedPlayer.name}
                    {selectedPlayer.isCaptain && (
                      <span className={`text-[9px] ${isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'} px-1 py-0.5 rounded border font-bold uppercase`}>C</span>
                    )}
                  </h3>
                  <span className={`text-[10px] md:text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} font-medium`}>
                    {selectedPlayer.position} • {selectedPlayer.age ? `${selectedPlayer.age} años` : ''} {selectedPlayer.height ? `• ${selectedPlayer.height}m` : ''}
                    {(() => {
                      const minsInfo = getPlayerMinutesPlayed(selectedPlayer);
                      return minsInfo ? ` • ${minsInfo.details}` : '';
                    })()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className={`w-8 h-8 rounded-full ${isLight ? 'bg-slate-150 hover:bg-slate-200 text-slate-500 hover:text-slate-800' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'} flex items-center justify-center transition-all`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-3 sm:p-4 md:p-6 overflow-y-auto no-scrollbar flex-1 flex flex-col gap-4 sm:gap-6">
              
              {!selectedPlayer.stats ? (
                <div className={`flex flex-col items-center justify-center py-12 ${isLight ? 'text-slate-400' : 'text-slate-500'} gap-2`}>
                  <span className="text-3xl">📭</span>
                  <p className="text-xs font-semibold">Sin estadísticas detalladas disponibles para este partido.</p>
                  {(() => {
                    const minsInfo = getPlayerMinutesPlayed(selectedPlayer);
                    return minsInfo ? (
                      <p className={`text-[11px] mt-2 px-3 py-1 rounded border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                        Estado: <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>{minsInfo.details}</strong>
                      </p>
                    ) : null;
                  })()}
                </div>
              ) : (
                <>
                  {/* Grid de Estadísticas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* ATAQUE */}
                    {selectedPlayer.position !== "Arquero" && (
                      <div className={`${isLight ? 'bg-slate-50/70 border-slate-100' : 'bg-white/[0.02] border-white/5'} border rounded-xl p-3 flex flex-col gap-2.5`}>
                        <h4 className={`text-[9px] font-black ${isLight ? 'text-emerald-600' : 'text-emerald-455'} uppercase tracking-wider border-b ${isLight ? 'border-slate-100' : 'border-white/5'} pb-1`}>Ataque</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0 sm:gap-y-2 text-[11px]">
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Goles</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.goals || selectedPlayer.events?.goals || 0}</span>
                          </div>
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Remates</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.shots || 0}</span>
                          </div>
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Al arco</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.shotsOnTarget || 0}</span>
                          </div>
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Bloqueados</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.blockedShots || 0}</span>
                          </div>
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Regates</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>
                              {selectedPlayer.stats.dribbles?.ok || 0}/{selectedPlayer.stats.dribbles?.total || 0}
                            </span>
                          </div>
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Toques área rival</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.touchesOppBox || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DISTRIBUCIÓN */}
                    <div className={`${isLight ? 'bg-slate-50/70 border-slate-100' : 'bg-white/[0.02] border-white/5'} border rounded-xl p-3 flex flex-col gap-2.5`}>
                      <h4 className={`text-[9px] font-black ${isLight ? 'text-indigo-600' : 'text-indigo-400'} uppercase tracking-wider border-b ${isLight ? 'border-slate-100' : 'border-white/5'} pb-1`}>Distribución y Creación</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0 sm:gap-y-2 text-[11px]">
                        <div className={`flex justify-between py-0.5 col-span-2 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Pases efectivos</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>
                            {selectedPlayer.stats.passes?.ok || 0}/{selectedPlayer.stats.passes?.total || 0} 
                            {selectedPlayer.stats.passes?.total ? ` (${Math.round((selectedPlayer.stats.passes.ok / selectedPlayer.stats.passes.total) * 100)}%)` : ''}
                          </span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Centros</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>
                            {selectedPlayer.stats.crosses?.ok || 0}/{selectedPlayer.stats.crosses?.total || 0}
                          </span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Pelotas largas</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>
                            {selectedPlayer.stats.longBalls?.ok || 0}/{selectedPlayer.stats.longBalls?.total || 0}
                          </span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Pases filtrados</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>
                            {selectedPlayer.stats.throughBalls?.ok || 0}/{selectedPlayer.stats.throughBalls?.total || 0}
                          </span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Oportunidades creadas</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.chancesCreated || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* DEFENSA Y DUELOS */}
                    <div className={`${isLight ? 'bg-slate-50/70 border-slate-100' : 'bg-white/[0.02] border-white/5'} border rounded-xl p-3 flex flex-col gap-2.5`}>
                      <h4 className={`text-[9px] font-black ${isLight ? 'text-cyan-600' : 'text-cyan-400'} uppercase tracking-wider border-b ${isLight ? 'border-slate-100' : 'border-white/5'} pb-1`}>Defensa y Duelos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0 sm:gap-y-2 text-[11px]">
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Recuperaciones</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.recoveries || 0}</span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Quites ganados</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>
                            {selectedPlayer.stats.tackles?.ok || 0}/{selectedPlayer.stats.tackles?.total || 0}
                          </span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Interceptaciones</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.interceptions || 0}</span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Despejes</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.clearances || 0}</span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Duelos en tierra</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>
                            {selectedPlayer.stats.groundDuels?.ok || 0}/{selectedPlayer.stats.groundDuels?.total || 0}
                          </span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Duelos aéreos</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>
                            {selectedPlayer.stats.aerialDuels?.ok || 0}/{selectedPlayer.stats.aerialDuels?.total || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DISCIPLINA Y DETALLES */}
                    <div className={`${isLight ? 'bg-slate-50/70 border-slate-100' : 'bg-white/[0.02] border-white/5'} border rounded-xl p-3 flex flex-col gap-2.5`}>
                      <h4 className={`text-[9px] font-black ${isLight ? 'text-rose-600' : 'text-rose-400'} uppercase tracking-wider border-b ${isLight ? 'border-slate-100' : 'border-white/5'} pb-1`}>Disciplina y Otros</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0 sm:gap-y-2 text-[11px]">
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Pérdidas de balón</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.possessionLost || 0}</span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Desposeído</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.dispossessed || 0}</span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Faltas cometidas</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.foulsCommitted || 0}</span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Faltas recibidas</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.foulsWon || 0}</span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Fueras de juego</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.offsides || 0}</span>
                        </div>
                        <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Toques totales</span>
                          <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.touches || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* ARQUERO */}
                    {selectedPlayer.position === "Arquero" && (
                      <div className={`${isLight ? 'bg-slate-50/70 border-slate-100' : 'bg-white/[0.02] border-white/5'} border rounded-xl p-3 flex flex-col gap-2.5 col-span-1 md:col-span-2 lg:col-span-1`}>
                        <h4 className={`text-[9px] font-black ${isLight ? 'text-amber-600' : 'text-amber-400'} uppercase tracking-wider border-b ${isLight ? 'border-slate-100' : 'border-white/5'} pb-1`}>Estadísticas de Portería</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-2 gap-x-4 gap-y-0 sm:gap-y-2 lg:gap-y-1 text-[11px]">
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Atajadas</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.saves || 0}</span>
                          </div>
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Atajadas clave</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.bigSaves || 0}</span>
                          </div>
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Centros atrapados</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.highClaims || 0}</span>
                          </div>
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Goles concedidos</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.goalsConceded || 0}</span>
                          </div>
                          <div className={`flex justify-between py-0.5 border-b border-dashed ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Goles evitados</span>
                            <span className={`${isLight ? 'text-slate-800' : 'text-white'} font-bold`}>{selectedPlayer.stats.goalsPrevented || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </>
              )}
            </div>

            {/* Footer Modal */}
            <div className={`flex items-center justify-end p-4 border-t ${isLight ? 'border-slate-100 bg-slate-50' : 'border-white/5 bg-[#0b0e14]/50'}`}>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className={`px-5 py-1.5 ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 hover:border-slate-350' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'} rounded-lg text-xs font-bold transition-all border`}
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {mounted && selectedPrePlayerName && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          {/* Dismiss overlay */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedPrePlayerName(null)} />
          
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-3xl lg:max-w-5xl max-h-[85vh] sm:max-h-[90vh] bg-[#0b1015] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden shadow-emerald-500/5">
            {/* Modal Header */}
            <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/20 shrink-0">
                  {selectedPrePlayerAggInfo?.number || '#'}
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-100">{selectedPrePlayerName}</h2>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <span className={`text-[6px] uppercase font-black tracking-wider px-1 py-0.2 border rounded-full ${getPositionBadgeColor(selectedPrePlayerAggInfo?.position || '')}`}>
                      {selectedPrePlayerAggInfo?.position || 'Jugador'}
                    </span>
                    {prePlayerCountry && (
                      <span className="text-[9px] text-emerald-400 font-bold">• {prePlayerCountry}</span>
                    )}
                    {selectedPrePlayerAggInfo?.age && (
                      <span className="text-[9px] text-slate-500">• {selectedPrePlayerAggInfo.age} años</span>
                    )}
                    {selectedPrePlayerAggInfo?.height && (
                      <span className="text-[9px] text-slate-500">• {selectedPrePlayerAggInfo.height}m</span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPrePlayerName(null)}
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
                    {prePlayerMatches.filter(m => m.status?.type !== 'notstarted' && getPlayerHistoryMinutes(m) > 0).length}
                  </span>
                </div>
                <div className="text-center border-r border-white/10">
                  <Activity className="w-3 h-3 mx-auto mb-0.5 text-teal-400" />
                  <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider block">Min. Totales</span>
                  <span className="text-xs font-black text-slate-200">{totalMinPre}</span>
                </div>
                <div className="text-center border-r border-white/10">
                  <Activity className="w-3 h-3 mx-auto mb-0.5 text-indigo-400" />
                  <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider block">Min. Promedio</span>
                  <span className="text-xs font-black text-slate-200">{avgMinutesPre.toFixed(1)}'</span>
                </div>
                <div className="text-center border-r border-white/10">
                  <Award className="w-3 h-3 mx-auto mb-0.5 text-emerald-400" />
                  <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider block">Goles</span>
                  <span className="text-xs font-black text-emerald-400">{selectedPrePlayerAggInfo?.goals || 0}</span>
                </div>
                <div className="text-center">
                  <Sparkles className="w-3 h-3 mx-auto mb-0.5 text-amber-500" />
                  <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider block">Asistencias</span>
                  <span className="text-xs font-black text-amber-500">{selectedPrePlayerAggInfo?.assists || 0}</span>
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
                      {statsListPre.map((st, i) => {
                        if (st.show === false) return null;
                        const matchesCount = prePlayerMatches.filter(m => m.status?.type !== 'notstarted' && getPlayerHistoryMinutes(m) > 0).length || 1;
                        const perMatch = (st.value / matchesCount).toFixed(2);
                        const perProm = totalMinPre > 0 ? ((st.value / totalMinPre) * avgMinutesPre).toFixed(2) : '0.00';
                        const per90 = totalMinPre > 0 ? ((st.value / totalMinPre) * 90).toFixed(2) : '0.00';
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

                {loadingPrePlayerDetail ? (
                  <div className="flex justify-center p-6">
                    <div className="animate-spin w-5 h-5 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent"></div>
                  </div>
                ) : prePlayerMatches.length === 0 ? (
                  <p className="text-slate-500 text-[10px] text-center py-4">No se encontraron detalles de partidos.</p>
                ) : (
                  <div className="space-y-2">
                    {[...prePlayerMatches]
                      .sort((a, b) => b.startTimestamp - a.startTimestamp)
                      .slice(0, visiblePreMatchesLimit)
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
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                )}

                {prePlayerMatches.length > visiblePreMatchesLimit && visiblePreMatchesLimit < 20 && (
                  <button
                    onClick={() => setVisiblePreMatchesLimit(prev => prev === 5 ? 10 : 20)}
                    className="w-full text-center py-2 text-[10px] font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all cursor-pointer mt-2"
                  >
                    Ver más partidos ({prePlayerMatches.length - visiblePreMatchesLimit} más)
                  </button>
                )}
              </div>
            </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end p-3 border-t border-white/10 bg-[#0b0e14]/50">
              <button 
                onClick={() => setSelectedPrePlayerName(null)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white border-white/10 rounded-xl text-[10px] font-bold transition-all border cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}


