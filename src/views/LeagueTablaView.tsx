"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LEAGUES } from '../components/layout/AppLayout';
import TeamHoverCard from '../components/TeamHoverCard';
import TeamLogo from '../components/TeamLogo';

type LeagueType = typeof LEAGUES[number];

// Function to format the key to a readable tab string
function formatTabName(key: string, leagueId?: string) {
  if (leagueId === 'mls') {
    const mlsMap: Record<string, string> = {
      zonaA: 'Conferencia Este',
      zonaB: 'Conferencia Oeste'
    };
    if (mlsMap[key]) return mlsMap[key];
  }

  const customMap: Record<string, string> = {
    zonaA: 'Zona A',
    zonaB: 'Zona B',
    anual: 'Tabla Anual',
    promedios: 'Promedios',
    tablaGeneral: 'Tabla General',
    grupoA: 'Grupo A',
    grupoB: 'Grupo B',
    grupoC: 'Grupo C',
    grupoD: 'Grupo D',
    grupoE: 'Grupo E',
    grupoF: 'Grupo F',
    grupoG: 'Grupo G',
    grupoH: 'Grupo H',
    tablaConjunta: 'Tabla Conjunta'
  };
  if (customMap[key]) return customMap[key];
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

// Normalized team name helper for robust comparisons
function normalizeTeamName(name: string): string {
  if (!name) return '';
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\b(club atletico|atletico|club|c\.a\.|ca|dep\.|deportivo|c\.d\.|cd)\b/gi, '') // strip prefixes
    .replace(/\b(de cordoba|de santa fe|de la plata|sde|de parana|mza|mendoza)\b/gi, '') // strip locations
    .replace(/[^a-z0-9]/gi, '') // alphanumeric only
    .trim();
}

export default function LeagueTablaView() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;
  const activeLeague = LEAGUES.find(l => l.id === leagueId) || LEAGUES[0];
  const tournamentId = activeLeague.tournamentId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // API Standings Data (fallback/legacy)
  const [standingsData, setStandingsData] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('all');

  const availableTabs = Object.keys(standingsData);

  // Custom Argentine Prototype States
  const isArgentinePrototype = leagueId === 'liga-arg';
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(2026);
  const [selectedTournament, setSelectedTournament] = useState<'Apertura' | 'Clausura'>('Apertura');
  const [subView, setSubView] = useState<'standings' | 'bracket'>('standings');
  const [customActiveTab, setCustomActiveTab] = useState<'zonaA' | 'zonaB' | 'anual' | 'promedios'>('zonaA');

  // Load API Standings
  useEffect(() => {
    let isMounted = true;
    const fetchStandings = async () => {
      if (!tournamentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://apivacas.jariel.com.ar/api/standings/${tournamentId}`);
        if (!response.ok) throw new Error('No se pudieron obtener las estadísticas.');
        const json = await response.json();

        if (!isMounted) return;

        const dataObj = json.data || {};

        // Filter out empty arrays
        const filledTables: Record<string, any[]> = {};
        for (const [key, value] of Object.entries(dataObj)) {
          if (Array.isArray(value) && value.length > 0) {
            filledTables[key] = value;
          }
        }

        setStandingsData(filledTables);

        const available = Object.keys(filledTables);
        if (available.length > 0) {
          if (!activeTab || !available.includes(activeTab)) {
            setActiveTab(available[0]);
          }
        } else {
          setActiveTab(null);
        }

      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error de conexión');
      } finally {
        if (isMounted) {
          // If it is not Argentine Prototype, we stop loading here. 
          // If it is, we wait until matches are fetched.
          if (!isArgentinePrototype) setLoading(false);
        }
      }
    };

    fetchStandings();

    return () => {
      isMounted = false;
    };
  }, [tournamentId, isArgentinePrototype]);

  // Load Argentine matches (if applicable)
  useEffect(() => {
    if (!isArgentinePrototype) return;
    
    let isMounted = true;
    const fetchAllMatches = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/matches/all?tournamentId=155`);
        if (!res.ok) throw new Error("No se pudieron cargar los partidos.");
        const data = await res.json();
        if (isMounted) {
          setAllMatches(data);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Error al obtener historial");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllMatches();
    return () => { isMounted = false; };
  }, [isArgentinePrototype]);

  // Categorize a match by season and tournament
  const getMatchCategory = (m: any) => {
    const ts = m.startTimestamp;
    const date = new Date(ts * 1000);
    const year = date.getFullYear();
    const month = date.getMonth();
    const tName = m.tournament_name || m.tournament?.name || '';
    const round = m.round_name || '';

    if (year === 2025) {
      if (ts < 1751328000) { // Before July 1st, 2025
        const isPlayoff = (!round || round === 'No Round') && (month === 4 || month === 5); // May or June
        return { season: 2025, tournament: 'Apertura' as const, isPlayoff };
      } else {
        const isPlayoff = (!round || round === 'No Round') && (month === 10 || month === 11); // Nov or Dec
        return { season: 2025, tournament: 'Clausura' as const, isPlayoff };
      }
    } else if (year === 2026) {
      if (ts < 1782777600) { // Before June 30th, 2026
        const isPlayoff = tName.includes('Playoffs') || 
                          (month === 4 && (round.includes('16') || round.includes('Quarter') || !round || round === 'No Round'));
        return { season: 2026, tournament: 'Apertura' as const, isPlayoff };
      } else {
        const isPlayoff = tName.includes('Playoffs');
        return { season: 2026, tournament: 'Clausura' as const, isPlayoff };
      }
    }
    return null;
  };

  // Helper to extract penalty scores from incidents
  const getPenaltyScore = (match: any) => {
    if (!match.incidents) return null;
    const penInc = match.incidents.find((inc: any) => inc.text === 'PEN' && inc.incidentType === 'period');
    if (penInc && penInc.homeScore !== undefined) {
      return { h: penInc.homeScore, a: penInc.awayScore };
    }
    return null;
  };

  // Helper to calculate standings dynamically
  const calculateStandings = (groupMatches: any[]) => {
    const standingsMap: Record<string, any> = {};

    groupMatches.forEach(m => {
      if (m.status?.type !== 'finished') return;

      const homeName = m.home_team?.name || m.homeTeam?.name;
      const awayName = m.away_team?.name || m.awayTeam?.name;
      const homeId = m.home_team?.id || m.homeTeam?.id;
      const awayId = m.away_team?.id || m.awayTeam?.id;

      if (!homeName || !awayName) return;

      if (!standingsMap[homeName]) {
        standingsMap[homeName] = {
          equipoId: homeId,
          nombre: homeName,
          puntos: 0,
          partidosJugados: 0,
          ganados: 0,
          empatados: 0,
          perdidos: 0,
          golesAFavor: 0,
          golesEnContra: 0,
          diferenciaGoles: 0,
        };
      }

      if (!standingsMap[awayName]) {
        standingsMap[awayName] = {
          equipoId: awayId,
          nombre: awayName,
          puntos: 0,
          partidosJugados: 0,
          ganados: 0,
          empatados: 0,
          perdidos: 0,
          golesAFavor: 0,
          golesEnContra: 0,
          diferenciaGoles: 0,
        };
      }

      const homeScore = m.homeScore?.normaltime !== undefined ? m.homeScore.normaltime : m.homeScore?.current;
      const awayScore = m.awayScore?.normaltime !== undefined ? m.awayScore.normaltime : m.awayScore?.current;

      if (homeScore === undefined || awayScore === undefined || homeScore === null || awayScore === null) return;

      const h = standingsMap[homeName];
      const a = standingsMap[awayName];

      h.partidosJugados += 1;
      a.partidosJugados += 1;
      h.golesAFavor += homeScore;
      h.golesEnContra += awayScore;
      a.golesAFavor += awayScore;
      a.golesEnContra += homeScore;

      if (homeScore > awayScore) {
        h.puntos += 3;
        h.ganados += 1;
        a.perdidos += 1;
      } else if (homeScore < awayScore) {
        a.puntos += 3;
        a.ganados += 1;
        h.perdidos += 1;
      } else {
        h.puntos += 1;
        a.puntos += 1;
        h.empatados += 1;
        a.empatados += 1;
      }
    });

    const standings = Object.values(standingsMap).map(team => {
      team.diferenciaGoles = team.golesAFavor - team.golesEnContra;
      return team;
    });

    standings.sort((t1, t2) => {
      if (t2.puntos !== t1.puntos) return t2.puntos - t1.puntos;
      if (t2.diferenciaGoles !== t1.diferenciaGoles) return t2.diferenciaGoles - t1.diferenciaGoles;
      if (t2.golesAFavor !== t1.golesAFavor) return t2.golesAFavor - t1.golesAFavor;
      return t1.nombre.localeCompare(t2.nombre);
    });

    standings.forEach((team, idx) => {
      team.posicion = idx + 1;
      if (idx < 4) {
        team.promocion = "Libertadores";
      } else if (idx >= 4 && idx < 10) {
        team.promocion = "Sudamericana";
      } else if (idx >= 28) {
        team.promocion = "Descenso";
      } else {
        team.promocion = null;
      }
    });

    return standings;
  };

  // Helper to dynamically partition teams into Zona A and Zona B (Min-Cut / Shared Neighbors Clustering)
  const partitionZones = (groupMatches: any[]) => {
    const adj: Record<string, Set<string>> = {};
    groupMatches.forEach(m => {
      const home = m.home_team?.name || m.homeTeam?.name;
      const away = m.away_team?.name || m.awayTeam?.name;
      if (!home || !away) return;
      if (!adj[home]) adj[home] = new Set();
      if (!adj[away]) adj[away] = new Set();
      adj[home].add(away);
      adj[away].add(home);
    });

    const teams = Object.keys(adj);
    if (teams.length === 0) return { zonaA: [], zonaB: [] };

    const seed = teams[0];
    const neighbors = Array.from(adj[seed]);
    let classicRival = null;
    let minShared = Infinity;

    neighbors.forEach(n => {
      let sharedCount = 0;
      neighbors.forEach(other => {
        if (other !== n && adj[n].has(other)) {
          sharedCount++;
        }
      });
      if (sharedCount < minShared) {
        minShared = sharedCount;
        classicRival = n;
      }
    });

    const zoneASet = new Set([seed]);
    neighbors.forEach(n => {
      if (n !== classicRival) zoneASet.add(n);
    });

    const zoneBSet = new Set<string>();
    teams.forEach(t => {
      if (!zoneASet.has(t)) zoneBSet.add(t);
    });

    return {
      zonaA: Array.from(zoneASet),
      zonaB: Array.from(zoneBSet)
    };
  };

  // Process Argentine standings data dynamically
  const currentGroupMatches = allMatches.filter(m => {
    const cat = getMatchCategory(m);
    return cat && cat.season === selectedSeason && cat.tournament === selectedTournament && !cat.isPlayoff;
  });

  const annualMatches = allMatches.filter(m => {
    const cat = getMatchCategory(m);
    return cat && cat.season === selectedSeason && !cat.isPlayoff;
  });

  const { zonaA: zoneATeams, zonaB: zoneBTeams } = partitionZones(currentGroupMatches);
  const fullStandings = calculateStandings(currentGroupMatches);
  const annualStandings = calculateStandings(annualMatches);

  const standingsA = fullStandings.filter(t => zoneATeams.includes(t.nombre));
  const standingsB = fullStandings.filter(t => zoneBTeams.includes(t.nombre));

  standingsA.forEach((t, idx) => { t.posicion = idx + 1; });
  standingsB.forEach((t, idx) => { t.posicion = idx + 1; });

  // Fallback to static promedios from database
  const promediosStandings = standingsData['promedios'] || [];

  const getActiveTableData = () => {
    if (customActiveTab === 'zonaA') return standingsA;
    if (customActiveTab === 'zonaB') return standingsB;
    if (customActiveTab === 'anual') return annualStandings;
    return promediosStandings;
  };

  const activeTableData = getActiveTableData();

  // Process Playoffs Bracket dynamically
  const buildBracket = (playoffMatches: any[]) => {
    const octavos: any[] = [];
    const cuartos: any[] = [];
    const semis: any[] = [];
    const final: any[] = [];

    playoffMatches.forEach(m => {
      const cat = getMatchCategory(m);
      if (!cat || !cat.isPlayoff) return;

      const date = new Date(m.startTimestamp * 1000);
      const day = date.getDate();
      const month = date.getMonth();
      const round = m.round_name || '';

      if (selectedSeason === 2025) {
        if (selectedTournament === 'Apertura') {
          // Octavos: May 10-12
          if (month === 4 && day <= 12) octavos.push(m);
          // Cuartos: May 18-20
          else if (month === 4 && day >= 18 && day <= 20) cuartos.push(m);
          // Semis: May 24-25
          else if (month === 4 && day >= 24 && day <= 25) semis.push(m);
          // Final: Jun 1
          else if (month === 5 && day === 1) final.push(m);
        } else {
          // Clausura
          // Octavos: Nov 22-27
          if (month === 10 && day >= 22 && day <= 27) octavos.push(m);
          // Cuartos: Nov 30 - Dec 2
          else if ((month === 10 && day >= 30) || (month === 11 && day <= 2)) cuartos.push(m);
          // Semis: Dec 7-8
          else if (month === 11 && day >= 7 && day <= 8) semis.push(m);
          // Final: Dec 14
          else if (month === 11 && day === 14) final.push(m);
        }
      } else if (selectedSeason === 2026) {
        if (selectedTournament === 'Apertura') {
          if (round.includes('16') || round.includes('Octavos')) octavos.push(m);
          else if (round.includes('Quarter') || round.includes('Cuartos')) cuartos.push(m);
          // Semis: May 16-20
          else if (month === 4 && day >= 15 && day <= 21) semis.push(m);
          // Final: May 24
          else if (month === 4 && day >= 22 && day <= 26) final.push(m);
        } else {
          // Clausura 2026 Playoffs (Future / Empty)
          if (round.includes('16')) octavos.push(m);
          else if (round.includes('Quarter')) cuartos.push(m);
        }
      }
    });

    const sortByTime = (a: any, b: any) => a.startTimestamp - b.startTimestamp;
    octavos.sort(sortByTime);
    cuartos.sort(sortByTime);
    semis.sort(sortByTime);
    final.sort(sortByTime);

    return { octavos, cuartos, semis, final };
  };

  const playoffMatches = allMatches.filter(m => {
    const cat = getMatchCategory(m);
    return cat && cat.season === selectedSeason && cat.tournament === selectedTournament && cat.isPlayoff;
  });

  const { octavos, cuartos, semis, final: finalRound } = buildBracket(playoffMatches);

  // Responsive mobile vs desktop settings for tabs
  useEffect(() => {
    if (availableTabs.length === 0) return;
    
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSelectedGroupTab(prev => prev === 'all' ? availableTabs[0] : prev);
      } else {
        setSelectedGroupTab('all');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [standingsData]);

  const getBackgroundColorForPromotion = (promoDesc: string | null) => {
    if (!promoDesc) return '';
    const dl = promoDesc.toLowerCase();
    if (dl.includes('libertadores') || dl.includes('champions')) return 'border-l-4 border-l-cyan-400';
    if (dl.includes('sudamericana') || dl.includes('europa')) return 'border-l-4 border-l-amber-400';
    if (dl.includes('playoff')) return 'border-l-4 border-l-indigo-400';
    if (dl.includes('relegation') || dl.includes('descenso')) return 'border-l-4 border-l-red-500';
    return 'border-l-4 border-l-white/20';
  };

  const Header = () => (
    <div className="relative bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.5)] mb-2">
      <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 translate-y-1/2" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-250 to-emerald-400 tracking-tight drop-shadow-md">
            🏟️ {activeLeague.name}
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            {isArgentinePrototype ? 'Panel de Temporadas, Posiciones y Playoffs' : 'Estadísticas oficiales de la fase de grupos'}
          </p>
        </div>
      </div>
    </div>
  );

  const MatchBracketCard = ({ match }: { match: any }) => {
    const homeName = match.home_team?.name || match.homeTeam?.name || 'TBD';
    const awayName = match.away_team?.name || match.awayTeam?.name || 'TBD';
    const homeId = match.home_team?.id || match.homeTeam?.id;
    const awayId = match.away_team?.id || match.awayTeam?.id;

    const homeScore = match.homeScore?.current;
    const awayScore = match.awayScore?.current;

    const isMatchFinished = match.status?.type === 'finished';
    const penScore = isMatchFinished ? getPenaltyScore(match) : null;

    let homeWinner = false;
    let awayWinner = false;

    if (isMatchFinished) {
      if (homeScore > awayScore) {
        homeWinner = true;
      } else if (awayScore > homeScore) {
        awayWinner = true;
      } else if (penScore) {
        if (penScore.h > penScore.a) homeWinner = true;
        else if (penScore.a > penScore.h) awayWinner = true;
      }
    }

    return (
      <div 
        onClick={() => router.push(`/match/${match._id || match.id}`)}
        className="bg-[#0e1622]/90 hover:bg-[#152030]/90 border border-white/5 hover:border-amber-500/30 rounded-2xl p-3 flex flex-col gap-1.5 transition-all duration-300 cursor-pointer shadow-lg w-full max-w-[210px] mx-auto group"
      >
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          <span>{match.round_name || 'Eliminatoria'}</span>
          {isMatchFinished && <span className="text-amber-500">Finalizado</span>}
        </div>

        <div className="flex flex-col gap-1">
          {/* Home */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 bg-white/5 rounded-full flex-shrink-0 p-0.5 border border-white/5">
                <TeamLogo logoUrl={`/escudos/${homeId}.png`} teamName={homeName} className="w-full h-full" />
              </div>
              <span className={`text-[12px] truncate transition-colors ${homeWinner ? 'font-black text-slate-100 group-hover:text-amber-400' : 'text-slate-400 font-medium'}`}>
                {homeName}
              </span>
            </div>
            {homeScore !== undefined && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-[12px] font-black ${homeWinner ? 'text-slate-100' : 'text-slate-500'}`}>
                  {match.homeScore?.normaltime !== undefined ? match.homeScore.normaltime : homeScore}
                </span>
                {penScore && (
                  <span className="text-[10px] font-black text-emerald-400">
                    ({penScore.h})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 bg-white/5 rounded-full flex-shrink-0 p-0.5 border border-white/5">
                <TeamLogo logoUrl={`/escudos/${awayId}.png`} teamName={awayName} className="w-full h-full" />
              </div>
              <span className={`text-[12px] truncate transition-colors ${awayWinner ? 'font-black text-slate-100 group-hover:text-amber-400' : 'text-slate-400 font-medium'}`}>
                {awayName}
              </span>
            </div>
            {awayScore !== undefined && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-[12px] font-black ${awayWinner ? 'text-slate-100' : 'text-slate-500'}`}>
                  {match.awayScore?.normaltime !== undefined ? match.awayScore.normaltime : awayScore}
                </span>
                {penScore && (
                  <span className="text-[10px] font-black text-emerald-400">
                    ({penScore.a})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-6 pb-10">
        <Header />
        <div className="flex-1 min-h-[300px] flex flex-col justify-center items-center bg-white/[0.02] border border-white/5 rounded-[2rem] gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-medium">Cargando tabla de posiciones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col gap-6 pb-10">
        <Header />
        <div className="w-full bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 flex justify-center items-center mt-4">
          <span className="text-red-400 font-bold text-lg">{error}</span>
        </div>
      </div>
    );
  }

  // Render Custom Argentine Prototype
  if (isArgentinePrototype) {
    const isPromediosTab = customActiveTab === 'promedios';
    return (
      <div className="w-full flex flex-col gap-6 pb-10 animate-fade-in">
        <Header />

        {/* Season & Tournament Dropdowns / Selectors */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-gradient-to-r from-white/[0.04] to-white/[0.01] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-lg">
          <div className="flex flex-wrap items-center gap-4">
            {/* Season Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Temporada:</span>
              <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                {[2025, 2026].map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedSeason(year)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${selectedSeason === year ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Tournament Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Torneo:</span>
              <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                {(['Apertura', 'Clausura'] as const).map(tName => (
                  <button
                    key={tName}
                    onClick={() => setSelectedTournament(tName)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${selectedTournament === tName ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    {tName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* View Toggles (Standings vs Bracket) */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
              <button
                onClick={() => setSubView('standings')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${subView === 'standings' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                📊 Posiciones
              </button>
              <button
                onClick={() => setSubView('bracket')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${subView === 'bracket' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                🏆 Playoffs
              </button>
            </div>
          </div>
        </div>

        {/* STANDINGS SUB-VIEW */}
        {subView === 'standings' && (
          <div className="flex flex-col gap-6">
            {/* Custom Subtabs (Zona A, Zona B, Anual, Promedios) */}
            <div className="flex flex-wrap items-center gap-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-inner">
              {(['zonaA', 'zonaB', 'anual', 'promedios'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => setCustomActiveTab(tabKey)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${customActiveTab === tabKey
                      ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {formatTabName(tabKey, leagueId)}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-hidden bg-[#0b1015]/60 rounded-[2rem] border border-white/5 relative shadow-2xl backdrop-blur-md">
              <div className="w-full h-full overflow-auto custom-scrollbar max-h-[800px]">
                <table className="w-full text-left border-collapse w-full md:min-w-[700px] text-sm">
                  <thead className="bg-gradient-to-b from-[#1a2330] to-[#121820] text-slate-300 sticky top-0 z-10 text-xs uppercase tracking-wider font-extrabold shadow-md border-b border-white/10">
                    <tr>
                      <th className="py-5 px-3 w-10 text-center">#</th>
                      <th className="py-5 px-2 text-left">Equipo</th>
                      {isPromediosTab ? (
                        <>
                          <th className="py-5 px-2 text-center text-amber-400">Prom</th>
                          <th className="py-5 px-2 text-center">Pts</th>
                          <th className="py-5 px-2 text-center">PJ</th>
                          <th className="py-5 px-2 text-center opacity-70 hidden sm:table-cell">Act</th>
                          <th className="py-5 px-2 text-center opacity-70 hidden sm:table-cell">Ant</th>
                          <th className="py-5 px-2 text-center opacity-70 hidden sm:table-cell">Tras</th>
                        </>
                      ) : (
                        <>
                          <th className="py-5 px-2 text-center text-amber-400">Pts</th>
                          <th className="py-5 px-2 text-center">PJ</th>
                          <th className="py-5 px-2 text-center">G</th>
                          <th className="py-5 px-2 text-center">E</th>
                          <th className="py-5 px-2 text-center">P</th>
                          <th className="py-5 px-2 text-center opacity-70 hidden sm:table-cell">GF</th>
                          <th className="py-5 px-2 text-center opacity-70 hidden sm:table-cell">GC</th>
                          <th className="py-5 px-2 text-center">DIF</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {activeTableData.map((row, idx) => {
                      const borderClass = getBackgroundColorForPromotion(row.promocion);
                      return (
                        <tr
                          key={row.equipoId || idx}
                          onClick={() => row.equipoId && router.push(`/team/${row.equipoId}`)}
                          className="hover:bg-amber-500/[0.04] transition-colors group cursor-pointer"
                        >
                          <td className={`py-3.5 px-3 text-center font-black text-slate-500 group-hover:text-slate-350 transition-colors ${borderClass}`}>
                            {row.posicion || idx + 1}
                          </td>
                          <td className="py-3.5 px-2">
                            <TeamHoverCard teamId={row.equipoId} teamName={row.nombre} className="w-full flex items-center">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 p-1 flex-shrink-0 bg-white/5 rounded-full mt-0.5 border border-white/5 group-hover:border-white/10 transition-colors">
                                  <TeamLogo
                                    logoUrl={`/escudos/${row.equipoId}.png`}
                                    teamName={row.nombre}
                                    className="w-full h-full"
                                  />
                                </div>
                                <span className="font-bold text-slate-100 group-hover:text-white truncate max-w-[100px] xs:max-w-[140px] sm:max-w-xs transition-colors text-[15px]">
                                  {row.nombre}
                                </span>
                              </div>
                            </TeamHoverCard>
                          </td>

                          {isPromediosTab ? (
                            <>
                              <td className="py-3.5 px-2 text-center font-black text-amber-400 bg-amber-500/5">{row.coeficiente?.toFixed(3)}</td>
                              <td className="py-3.5 px-2 text-center font-black text-white">{row.puntosTotales}</td>
                              <td className="py-3.5 px-2 text-center text-slate-400 font-medium">{row.partidosTotales}</td>
                              <td className="py-3.5 px-2 text-center text-slate-550 hidden sm:table-cell">{row.ptsTemporadaActual}</td>
                              <td className="py-3.5 px-2 text-center text-slate-550 hidden sm:table-cell">{row.ptsTemporadaAnterior}</td>
                              <td className="py-3.5 px-2 text-center text-slate-550 hidden sm:table-cell">{row.ptsTemporadaTrasanterior}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-3.5 px-2 text-center font-black text-amber-400 bg-amber-500/5">{row.puntos ?? 0}</td>
                              <td className="py-3.5 px-2 text-center text-slate-450 font-medium">{row.partidosJugados ?? 0}</td>
                              <td className="py-3.5 px-2 text-center text-slate-350 font-medium">{row.ganados ?? 0}</td>
                              <td className="py-3.5 px-2 text-center text-slate-450">{row.empatados ?? 0}</td>
                              <td className="py-3.5 px-2 text-center text-slate-455">{row.perdidos ?? 0}</td>
                              <td className="py-3.5 px-2 text-center text-slate-550 hidden sm:table-cell">{row.golesAFavor ?? 0}</td>
                              <td className="py-3.5 px-2 text-center text-slate-550 hidden sm:table-cell">{row.golesEnContra ?? 0}</td>
                              <td className="py-3.5 px-2 text-center font-bold text-slate-350">
                                {(row.diferenciaGoles ?? 0) > 0 ? `+${row.diferenciaGoles}` : row.diferenciaGoles ?? 0}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend Area */}
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-3 px-4 text-[10px] sm:text-[11px] font-black tracking-wider justify-center lg:justify-start">
              <div className="flex items-center gap-2 px-2"><div className="w-2.5 h-2.5 bg-cyan-400 rounded-sm shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div> Clasifica a Copa Libertadores</div>
              <div className="flex items-center gap-2 px-2"><div className="w-2.5 h-2.5 bg-amber-400 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div> Clasifica a Copa Sudamericana</div>
              <div className="flex items-center gap-2 px-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Zona de Descenso</div>
            </div>
          </div>
        )}

        {/* BRACKET PLAYOFFS SUB-VIEW */}
        {subView === 'bracket' && (
          <div className="flex flex-col gap-4">
            {octavos.length === 0 && cuartos.length === 0 && semis.length === 0 && finalRound.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-16 flex flex-col items-center gap-5 text-center mt-4 shadow-xl">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                  🏆
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-200">Playoffs no iniciados</h2>
                  <p className="text-slate-500 text-sm font-medium mt-2 max-w-sm">
                    Los playoffs eliminatorios correspondientes al torneo **{selectedTournament} {selectedSeason}** no han comenzado o no hay partidos registrados.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full overflow-x-auto custom-scrollbar py-6 rounded-[2rem] border border-white/5 bg-[#0b1015]/60 shadow-2xl backdrop-blur-md">
                <div className="flex gap-6 min-w-[950px] justify-between px-6 h-[720px]">
                  {/* Octavos */}
                  <div className="flex flex-col justify-around h-full flex-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center bg-black/40 py-1.5 rounded-lg border border-white/5 mb-1">Octavos de Final</div>
                    {octavos.length > 0 ? (
                      octavos.map(m => <MatchBracketCard key={m._id} match={m} />)
                    ) : (
                      <div className="text-xs text-slate-600 font-bold text-center">Por definir</div>
                    )}
                  </div>

                  {/* Cuartos */}
                  <div className="flex flex-col justify-around h-full flex-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center bg-black/40 py-1.5 rounded-lg border border-white/5 mb-1">Cuartos de Final</div>
                    {cuartos.length > 0 ? (
                      cuartos.map(m => <MatchBracketCard key={m._id} match={m} />)
                    ) : (
                      <div className="text-xs text-slate-600 font-bold text-center">Por definir</div>
                    )}
                  </div>

                  {/* Semis */}
                  <div className="flex flex-col justify-around h-full flex-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center bg-black/40 py-1.5 rounded-lg border border-white/5 mb-1">Semifinales</div>
                    {semis.length > 0 ? (
                      semis.map(m => <MatchBracketCard key={m._id} match={m} />)
                    ) : (
                      <div className="text-xs text-slate-600 font-bold text-center">Por definir</div>
                    )}
                  </div>

                  {/* Final */}
                  <div className="flex flex-col justify-around h-full flex-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center bg-black/40 py-1.5 rounded-lg border border-white/5 mb-1">Final</div>
                    {finalRound.length > 0 ? (
                      finalRound.map(m => <MatchBracketCard key={m._id} match={m} />)
                    ) : (
                      <div className="text-xs text-slate-600 font-bold text-center">Por definir</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render Default Layout for other leagues
  const isGroupLeague = activeLeague.id === 'mundial' || activeLeague.id === 'libertadores';
  const tabsToShow = isGroupLeague
    ? (selectedGroupTab === 'all' ? availableTabs : [selectedGroupTab])
    : (activeTab ? [activeTab] : []);
  const dataForLegend = (isGroupLeague ? availableTabs : tabsToShow).flatMap(tab => standingsData[tab] || []);

  if (availableTabs.length === 0) {
    return (
      <div className="w-full flex flex-col gap-6 pb-10">
        <Header />
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-16 flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
            🏟️
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-200">Sin datos</h2>
            <p className="text-slate-500 text-sm font-medium mt-2 max-w-sm">
              La tabla de posiciones de los equipos de <strong className="text-slate-300">{activeLeague.name}</strong> aún no está disponible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10 animate-fade-in">
      <Header />

      {/* Group Selector Tabs for Mundial/Group Tournaments */}
      {isGroupLeague && availableTabs.length > 1 && (
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/40 border border-white/5 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth shrink-0 shadow-inner">
          <button
            onClick={() => setSelectedGroupTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border border-transparent cursor-pointer whitespace-nowrap ${
              selectedGroupTab === 'all'
                ? 'bg-amber-550/15 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Ver Todos
          </button>
          {availableTabs.map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setSelectedGroupTab(tabKey)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border border-transparent cursor-pointer whitespace-nowrap ${
                selectedGroupTab === tabKey
                  ? 'bg-amber-550/15 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {formatTabName(tabKey, leagueId)}
            </button>
          ))}
        </div>
      )}

      {/* Tabs for Standard Leagues */}
      {!isGroupLeague && availableTabs.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-inner">
          {availableTabs.map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${activeTab === tabKey
                  ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {formatTabName(tabKey, leagueId)}
            </button>
          ))}
        </div>
      )}

      {/* Table Containers */}
      <div className={`flex-1 ${isGroupLeague && selectedGroupTab === 'all' ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : 'flex flex-col gap-8'}`}>
        {tabsToShow.map((tab) => {
          const currentData = standingsData[tab] || [];
          const isPromedios = tab === 'promedios';

          const headPY = isGroupLeague ? 'py-3.5' : 'py-5';
          const bodyPY = isGroupLeague ? 'py-2.5' : 'py-3.5';
          const iconSize = isGroupLeague ? 'w-7 h-7 p-0.5' : 'w-8 h-8 p-1';
          const textSize = isGroupLeague ? 'text-xs sm:text-sm' : 'text-[15px]';
          const minW = isGroupLeague ? 'w-full md:min-w-[480px]' : 'w-full md:min-w-[700px]';

          return (
            <div key={tab} className="flex flex-col gap-3">
              {isGroupLeague && (
                <div className="flex items-center pl-2 group-header-container">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full mr-3 shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                  <h3 className="text-xl font-bold group-header-gradient">
                    {formatTabName(tab, leagueId)}
                  </h3>
                </div>
              )}
              <div className="overflow-hidden bg-[#0b1015]/60 rounded-[2rem] border border-white/5 relative shadow-2xl backdrop-blur-md">
                <div className="w-full h-full overflow-auto custom-scrollbar max-h-[800px]">
                  <table className={`w-full text-left border-collapse ${minW} text-sm`}>
                    <thead className="bg-gradient-to-b from-[#1a2330] to-[#121820] text-slate-300 sticky top-0 z-10 text-xs uppercase tracking-wider font-extrabold shadow-md border-b border-white/10">
                      <tr>
                        <th className={`${headPY} px-2 sm:px-3 w-8 sm:w-10 text-center`}>#</th>
                        <th className={`${headPY} px-2 text-left`}>Equipo</th>
                        {isPromedios ? (
                          <>
                            <th className={`${headPY} px-2 text-center text-amber-400`}>Prom</th>
                            <th className={`${headPY} px-2 text-center`}>Pts</th>
                            <th className={`${headPY} px-2 text-center`}>PJ</th>
                            <th className={`${headPY} px-2 text-center opacity-70 hidden sm:table-cell`}>Act</th>
                            <th className={`${headPY} px-2 text-center opacity-70 hidden sm:table-cell`}>Ant</th>
                            <th className={`${headPY} px-2 text-center opacity-70 hidden sm:table-cell`}>Tras</th>
                          </>
                        ) : (
                          <>
                            <th className={`${headPY} px-1 sm:px-2 text-center text-amber-400`}>Pts</th>
                            <th className={`${headPY} px-1 sm:px-2 text-center`}>PJ</th>
                            <th className={`${headPY} px-1 sm:px-2 text-center`}>G</th>
                            <th className={`${headPY} px-1 sm:px-2 text-center`}>E</th>
                            <th className={`${headPY} px-1 sm:px-2 text-center`}>P</th>
                            <th className={`${headPY} px-1 sm:px-2 text-center opacity-70 hidden sm:table-cell`}>GF</th>
                            <th className={`${headPY} px-1 sm:px-2 text-center opacity-70 hidden sm:table-cell`}>GC</th>
                            <th className={`${headPY} px-1 sm:px-2 text-center`}>DIF</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {currentData.map((row, idx) => {
                        const borderClass = getBackgroundColorForPromotion(row.promocion);
                        return (
                          <tr
                            key={row.equipoId || idx}
                            onClick={() => row.equipoId && router.push(`/team/${row.equipoId}`)}
                            className="hover:bg-amber-500/[0.04] transition-colors group cursor-pointer"
                          >
                            <td className={`${bodyPY} px-2 sm:px-3 text-center font-black text-slate-500 group-hover:text-slate-350 transition-colors ${borderClass}`}>
                              {row.posicion || idx + 1}
                            </td>
                            <td className={`${bodyPY} px-2`}>
                              <TeamHoverCard teamId={row.equipoId} teamName={row.nombre} className="w-full flex items-center">
                                <div className="flex items-center gap-2.5">
                                  <div className={`${iconSize} flex-shrink-0 bg-white/5 rounded-full mt-0.5 border border-white/5 group-hover:border-white/10 transition-colors`}>
                                    <TeamLogo
                                      logoUrl={`/escudos/${row.equipoId}.png`}
                                      teamName={row.nombre}
                                      className="w-full h-full"
                                    />
                                  </div>
                                  <span className={`font-bold text-slate-100 group-hover:text-white truncate max-w-[100px] xs:max-w-[140px] sm:max-w-xs transition-colors ${textSize}`}>
                                    {row.nombre}
                                  </span>
                                  {row.enVivo && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 rounded-md shrink-0 animate-pulse">
                                      <span className="flex h-1.5 w-1.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                      </span>
                                      Vivo
                                    </span>
                                  )}
                                </div>
                              </TeamHoverCard>
                            </td>

                            {isPromedios ? (
                              <>
                                <td className={`${bodyPY} px-2 text-center font-black text-amber-400 bg-amber-500/5`}>{row.coeficiente?.toFixed(3)}</td>
                                <td className={`${bodyPY} px-2 text-center font-black text-white`}>{row.puntosTotales}</td>
                                <td className={`${bodyPY} px-2 text-center text-slate-400 font-medium`}>{row.partidosTotales}</td>
                                <td className={`${bodyPY} px-2 text-center text-slate-550 hidden sm:table-cell`}>{row.ptsTemporadaActual}</td>
                                <td className={`${bodyPY} px-2 text-center text-slate-550 hidden sm:table-cell`}>{row.ptsTemporadaAnterior}</td>
                                <td className={`${bodyPY} px-2 text-center text-slate-550 hidden sm:table-cell`}>{row.ptsTemporadaTrasanterior}</td>
                              </>
                            ) : (
                              <>
                                <td className={`${bodyPY} px-1 sm:px-2 text-center font-black text-amber-400 bg-amber-500/5`}>{row.puntos ?? '-'}</td>
                                <td className={`${bodyPY} px-1 sm:px-2 text-center text-slate-455 font-medium`}>{row.partidosJugados ?? '-'}</td>
                                <td className={`${bodyPY} px-1 sm:px-2 text-center text-slate-350 font-medium`}>{row.ganados ?? '-'}</td>
                                <td className={`${bodyPY} px-1 sm:px-2 text-center text-slate-455`}>{row.empatados ?? '-'}</td>
                                <td className={`${bodyPY} px-1 sm:px-2 text-center text-slate-455`}>{row.perdidos ?? '-'}</td>
                                <td className={`${bodyPY} px-1 sm:px-2 text-center text-slate-550 hidden sm:table-cell`}>{row.golesAFavor ?? '-'}</td>
                                <td className={`${bodyPY} px-1 sm:px-2 text-center text-slate-550 hidden sm:table-cell`}>{row.golesEnContra ?? '-'}</td>
                                <td className={`${bodyPY} px-1 sm:px-2 text-center font-bold text-slate-350`}>{row.diferenciaGoles ?? '-'}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Area */}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-3 px-4 text-[10px] sm:text-[11px] font-black tracking-wider justify-center lg:justify-start">
        {dataForLegend.some(row => row.promocion?.toLowerCase().includes('libertadores') || row.promocion?.toLowerCase().includes('champions')) && (
          <div className="flex items-center gap-2 px-2"><div className="w-2.5 h-2.5 bg-cyan-400 rounded-sm shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div> Libertadores / Champions</div>
        )}
        {dataForLegend.some(row => row.promocion?.toLowerCase().includes('sudamericana') || row.promocion?.toLowerCase().includes('europa')) && (
          <div className="flex items-center gap-2 px-2"><div className="w-2.5 h-2.5 bg-amber-400 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div> Sudamericana </div>
        )}
        {dataForLegend.some(row => row.promocion?.toLowerCase().includes('playoff')) && (
          <div className="flex items-center gap-2 px-2"><div className="w-2.5 h-2.5 bg-indigo-400 rounded-sm shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div> Playoffs</div>
        )}
        {dataForLegend.some(row => row.promocion?.toLowerCase().includes('relegation') || row.promocion?.toLowerCase().includes('descenso')) && (
          <div className="flex items-center gap-2 px-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Descenso</div>
        )}
      </div>

    </div>
  );
}
