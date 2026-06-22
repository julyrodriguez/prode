"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LEAGUES } from '../../components/layout/AppLayout';
import TeamHoverCard from '../../components/TeamHoverCard';
import TeamLogo from '../../components/TeamLogo';

type LeagueType = typeof LEAGUES[number];

// Function to format the key to a readable tab string
function formatTabName(key: string) {
  const customMap: Record<string, string> = {
    zonaA: 'Zona A',
    zonaB: 'Zona B',
    anual: 'Anual',
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

export default function MundialTablaView() {
  const router = useRouter();
  const leagueId = 'mundial';
  const activeLeague = LEAGUES.find(l => l.id === leagueId) || LEAGUES[0];
  const tournamentId = activeLeague.tournamentId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [standingsData, setStandingsData] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Sub-tabs navigation
  const [activeSubTab, setActiveSubTab] = useState<'grupos' | 'estadisticas' | 'bracket'>('grupos');
  const [bracketData, setBracketData] = useState<any>(null);
  const [thirdPlaceTable, setThirdPlaceTable] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  const [loadingBracket, setLoadingBracket] = useState(false);
  const [bracketError, setBracketError] = useState<string | null>(null);
  const [mobileStageIndex, setMobileStageIndex] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  const availableTabs = Object.keys(standingsData);

  // Normalize team names to match promiedos names with local API database names
  const normalizeTeamName = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9 ]/g, ""); // Remove non-alphanumeric except spaces
  };

  // Translation map from Spanish normalized country name to English normalized country name
  const spanishToEnglishMap: Record<string, string> = {
    'alemania': 'germany',
    'estados unidos': 'usa',
    'ee uu': 'usa',
    'eeuu': 'usa',
    'suecia': 'sweden',
    'suiza': 'switzerland',
    'francia': 'france',
    'marruecos': 'morocco',
    'holanda': 'netherlands',
    'paises bajos': 'netherlands',
    'espana': 'spain',
    'corea del sur': 'south korea',
    'rep checa': 'czechia',
    'republica checa': 'czechia',
    'sudafrica': 'south africa',
    'bosnia': 'bosnia & herzegovina',
    'bosnia y herzegovina': 'bosnia & herzegovina',
    'escocia': 'scotland',
    'haiti': 'haiti',
    'turquia': 'türkiye',
    'costa de marfil': "cote d'ivoire",
    'curazao': 'curacao',
    'japon': 'japan',
    'tunez': 'tunisia',
    'iran': 'iran',
    'belgica': 'belgium',
    'nueva zelanda': 'new zealand',
    'egipto': 'egypt',
    'arabia saudita': 'saudi arabia',
    'noruega': 'norway',
    'irak': 'iraq',
    'jordania': 'jordan',
    'argelia': 'algeria',
    'congo rd': 'dr congo',
    'congo rd.': 'dr congo',
    'r.d. congo': 'dr congo',
    'rd congo': 'dr congo',
    'uzbekistan': 'uzbekistan',
    'inglaterra': 'england',
    'panama': 'panama',
    'croacia': 'croatia',
    'mexico': 'mexico',
    'brasil': 'brazil',
    'canada': 'canada'
  };

  // Build a lookup map of normalized team name -> local equipoId
  const teamNameToIdMap: Record<string, number> = {};
  Object.values(standingsData).forEach((groupRows: any) => {
    if (Array.isArray(groupRows)) {
      groupRows.forEach((row: any) => {
        if (row.nombre && row.equipoId) {
          const norm = normalizeTeamName(row.nombre);
          teamNameToIdMap[norm] = row.equipoId;
        }
      });
    }
  });

  const getTeamIdByName = (name: string): number | null => {
    if (!name) return null;
    const norm = normalizeTeamName(name);
    const englishName = spanishToEnglishMap[norm] || norm;
    return teamNameToIdMap[englishName] || null;
  };

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
        if (isMounted) setLoading(false);
      }
    };

    fetchStandings();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  // Fetch bracket and third place data
  useEffect(() => {
    let isMounted = true;
    const fetchBracket = async () => {
      setLoadingBracket(true);
      setBracketError(null);
      try {
        const response = await fetch('/api/mundial/bracket');
        if (!response.ok) throw new Error('No se pudo obtener el cuadro del mundial.');
        const json = await response.json();
        
        if (!isMounted) return;
        setBracketData(json.brackets || null);
        setThirdPlaceTable(json.thirdPlaceTable || null);
        setPlayerStats(json.playerStatistics || []);
      } catch (err: any) {
        if (isMounted) setBracketError(err.message || 'Error al cargar el cuadro.');
      } finally {
        if (isMounted) setLoadingBracket(false);
      }
    };
    
    fetchBracket();
    
    return () => {
      isMounted = false;
    };
  }, []);

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

  useEffect(() => {
    let isMounted = true;
    const fetchAllMatches = async () => {
      try {
        const res = await fetch('https://apivacas.jariel.com.ar/api/matches/all');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const matchesArray = Array.isArray(data) ? data : [];
            const filtered = matchesArray.filter((m: any) => 
              m.tournamentId === tournamentId || 
              m.tournament_id === tournamentId || 
              m.tournament?.id === tournamentId ||
              (m.tournament_name && m.tournament_name.toLowerCase().includes('world cup'))
            );
            setAllMatches(filtered);
          }
        }
      } catch (err) {
        console.error('Error fetching all matches:', err);
      }
    };
    fetchAllMatches();
    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  const getGroupMatches = (groupTeams: any[]) => {
    if (!groupTeams || groupTeams.length === 0) return [];
    
    const teamIds = new Set(
      groupTeams
        .map(t => t.equipoId)
        .filter(id => id !== undefined && id !== null)
    );
    
    const teamNames = new Set(
      groupTeams
        .map(t => normalizeTeamName(t.nombre))
        .filter(n => !!n)
    );
    
    const filtered = allMatches.filter((m: any) => {
      const hId = m.homeTeam?.id || m.home_team?.id;
      const aId = m.awayTeam?.id || m.away_team?.id;
      
      if (hId && aId && teamIds.has(hId) && teamIds.has(aId)) {
        return true;
      }
      
      const hName = normalizeTeamName(m.homeTeam?.name || m.home_team?.name || '');
      const aName = normalizeTeamName(m.awayTeam?.name || m.away_team?.name || '');
      return teamNames.has(hName) && teamNames.has(aName);
    });

    return filtered.sort((a, b) => (a.startTimestamp || 0) - (b.startTimestamp || 0));
  };

  const parseMatchNumber = (name: string): { type: 'winner' | 'loser', num: number } | null => {
    const matchWin = name.match(/Ganador del partido\s+(\d+)/i) || name.match(/^G(\d+)$/i);
    if (matchWin) {
      return { type: 'winner', num: parseInt(matchWin[1], 10) };
    }
    const matchLose = name.match(/Perdedor del partido\s+(\d+)/i) || name.match(/^P(\d+)$/i);
    if (matchLose) {
      return { type: 'loser', num: parseInt(matchLose[1], 10) };
    }
    return null;
  };

  const getMatchByNumber = (stagesList: any[], num: number): any | null => {
    if (!stagesList) return null;
    if (num >= 73 && num <= 88) {
      return stagesList[0]?.groups?.[num - 73] || null;
    }
    if (num >= 89 && num <= 96) {
      return stagesList[1]?.groups?.[num - 89] || null;
    }
    if (num >= 97 && num <= 100) {
      return stagesList[2]?.groups?.[num - 97] || null;
    }
    if (num >= 101 && num <= 102) {
      return stagesList[3]?.groups?.[num - 101] || null;
    }
    return null;
  };

  const resolveParticipantName = (p: any, stagesList: any[]): { name: string; isReal: boolean } => {
    const name = p.nombre || p.name || '';
    const parsed = parseMatchNumber(name);
    if (!parsed) {
      return { name: translateTeamToSpanish(name), isReal: true }; // Real team name
    }

    const { type, num } = parsed;
    const sourceMatch = getMatchByNumber(stagesList, num);
    if (!sourceMatch) {
      return { name: p.short_name || name, isReal: false };
    }

    const sWinnerIdx = sourceMatch.winner;
    const hasWinner = sWinnerIdx === 0 || sWinnerIdx === 1;

    if (hasWinner) {
      const winnerPart = sourceMatch.participants?.[sWinnerIdx];
      const loserPart = sourceMatch.participants?.[1 - sWinnerIdx];
      
      if (type === 'winner' && winnerPart) {
        return resolveParticipantName(winnerPart, stagesList);
      }
      if (type === 'loser' && loserPart) {
        return resolveParticipantName(loserPart, stagesList);
      }
    }

    // Unresolved source match: let's get names of contestants
    const p0 = sourceMatch.participants?.[0];
    const p1 = sourceMatch.participants?.[1];

    if (p0 && p1) {
      const r0 = resolveParticipantName(p0, stagesList);
      const r1 = resolveParticipantName(p1, stagesList);
      
      const name0 = r0.isReal ? r0.name : (p0.short_name || p0.name);
      const name1 = r1.isReal ? r1.name : (p1.short_name || p1.name);
      
      const label = type === 'winner' ? 'Ganador entre' : 'Perdedor entre';
      return { name: `${label} ${name0} y ${name1}`, isReal: false };
    }

    return { name: p.short_name || name, isReal: false };
  };

  const getBackgroundColorForPromotion = (promoDesc: string | null) => {
    if (!promoDesc) return '';
    const dl = promoDesc.toLowerCase();
    if (dl.includes('libertadores') || dl.includes('champions')) return 'border-l-[3px] border-l-cyan-400';
    if (dl.includes('sudamericana') || dl.includes('europa')) return 'border-l-[3px] border-l-amber-400';
    if (dl.includes('playoff')) return 'border-l-[3px] border-l-indigo-400';
    if (dl.includes('relegation') || dl.includes('descenso')) return 'border-l-[3px] border-l-red-500';
    if (dl.includes('siguiente ronda')) return 'border-l-[3px] border-l-fuchsia-500';
    return 'border-l-[3px] border-l-white/20'; // Default fallback
  };

  const mapPromiedosRow = (row: any) => {
    const getVal = (key: string) => row.values?.find((v: any) => v.key === key)?.value;
    const name = row.entity?.object?.name || '?';
    const localId = getTeamIdByName(name);
    
    const points = parseInt(getVal('Points') || '0', 10);
    const gp = parseInt(getVal('GamePlayed') || '0', 10);
    const gw = parseInt(getVal('GamesWon') || '0', 10);
    const ge = parseInt(getVal('GamesEven') || '0', 10);
    const gl = parseInt(getVal('GamesLost') || '0', 10);
    const goalsStr = getVal('Goals') || '0:0';
    const ratio = parseInt(getVal('Ratio') || '0', 10);
    
    const [gf, gc] = goalsStr.split(':').map((s: string) => parseInt(s, 10) || 0);
    
    return {
      posicion: row.num,
      nombre: name,
      equipoId: localId, // mapped correctly to local database ID
      puntos: points,
      partidosJugados: gp,
      ganados: gw,
      empatados: ge,
      perdidos: gl,
      golesAFavor: gf,
      golesEnContra: gc,
      diferenciaGoles: ratio,
      promocion: row.destination_color === '#F022E2' ? 'Siguiente Ronda' : null
    };
  };

  const Header = () => (
    <div className="relative bg-black/20 backdrop-blur-sm border border-white/5 rounded-2xl p-4 md:p-5 mb-2 overflow-hidden shadow-lg">
      <h1 className="relative z-10 text-lg md:text-2xl font-black text-white tracking-tight">
        📊 Tabla de Posiciones
      </h1>
      <p className="text-slate-400 text-[10px] md:text-xs font-semibold mt-0.5 md:mt-1 relative z-10">
        Estadísticas oficiales del Mundial de la FIFA
      </p>
    </div>
  );

  const renderThirdPlaceTable = () => {
    if (loadingBracket) {
      return (
        <div className="flex-1 min-h-[200px] flex flex-col justify-center items-center bg-white/[0.01] border border-white/5 rounded-3xl gap-3">
          <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
          <span className="text-slate-400 text-xs font-medium">Cargando tabla de terceros...</span>
        </div>
      );
    }

    if (!thirdPlaceTable) {
      return null;
    }

    const rows = thirdPlaceTable.table?.rows?.map(mapPromiedosRow) || [];

    return (
      <div className="flex flex-col gap-3 animate-fade-in">
        <div className="flex items-center pl-2">
          <div className="w-1 h-4 bg-fuchsia-500 rounded-full mr-2 shadow-[0_0_8px_rgba(240,34,226,0.4)]" />
          <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wide text-slate-200">
            Tabla de Terceros Puestos
          </h3>
        </div>
        
        <div className="overflow-hidden bg-[#0b1015]/60 rounded-2xl border border-white/5 relative shadow-xl backdrop-blur-md">
          <div className="w-full h-full overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[340px] text-[11px] md:text-sm">
              <thead className="bg-gradient-to-b from-[#1a2330] to-[#121820] text-slate-350 sticky top-0 z-10 text-[10px] md:text-xs uppercase tracking-wider font-extrabold shadow-md border-b border-white/10">
                <tr>
                  <th className="py-2.5 md:py-3.5 px-2 w-7 md:w-10 text-center">#</th>
                  <th className="py-2.5 md:py-3.5 px-1.5 text-left">Equipo</th>
                  <th className="py-2.5 md:py-3.5 px-1 text-center text-amber-400">Pts</th>
                  <th className="py-2.5 md:py-3.5 px-1 text-center">PJ</th>
                  <th className="py-2.5 md:py-3.5 px-1 text-center">G</th>
                  <th className="py-2.5 md:py-3.5 px-1 text-center">E</th>
                  <th className="py-2.5 md:py-3.5 px-1 text-center">P</th>
                  <th className="py-2.5 md:py-3.5 px-1 text-center opacity-70 hidden sm:table-cell">GF</th>
                  <th className="py-2.5 md:py-3.5 px-1 text-center opacity-70 hidden sm:table-cell">GC</th>
                  <th className="py-2.5 md:py-3.5 px-1 text-center">DIF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((row: any, idx: number) => {
                  const borderClass = getBackgroundColorForPromotion(row.promocion);
                  const isQualifying = row.promocion === 'Siguiente Ronda';
                  return (
                    <tr
                      key={row.equipoId || idx}
                      onClick={() => row.equipoId && router.push(`/team/${row.equipoId}`)}
                      className="hover:bg-amber-500/[0.03] transition-colors group cursor-pointer"
                    >
                      <td className={`py-1.5 md:py-2.5 px-2 text-center font-black text-slate-500 group-hover:text-slate-350 transition-colors ${borderClass}`}>
                        {idx + 1}
                      </td>
                      <td className="py-1.5 md:py-2.5 px-1.5">
                        <TeamHoverCard teamId={row.equipoId} teamName={row.nombre} className="w-full flex items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-5.5 h-5.5 md:w-7 md:h-7 p-0.5 flex-shrink-0 bg-white/5 rounded-full border border-white/5 group-hover:border-white/10 transition-colors">
                              <TeamLogo
                                logoUrl={row.equipoId ? `/escudos/${row.equipoId}.png` : null}
                                teamName={row.nombre}
                                className="w-full h-full"
                              />
                            </div>
                            <span className="font-bold text-slate-200 group-hover:text-white truncate max-w-[90px] xs:max-w-[125px] sm:max-w-xs transition-colors">
                              {row.nombre}
                            </span>
                            {isQualifying && (
                              <span className="inline-flex items-center px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-widest bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 rounded-md shrink-0">
                                OK
                              </span>
                            )}
                          </div>
                        </TeamHoverCard>
                      </td>
                      <td className="py-1.5 md:py-2.5 px-1 text-center font-black text-amber-400 bg-amber-500/5">{row.puntos ?? '-'}</td>
                      <td className="py-1.5 md:py-2.5 px-1 text-center text-slate-450 font-medium">{row.partidosJugados ?? '-'}</td>
                      <td className="py-1.5 md:py-2.5 px-1 text-center text-slate-350 font-medium">{row.ganados ?? '-'}</td>
                      <td className="py-1.5 md:py-2.5 px-1 text-center text-slate-450">{row.empatados ?? '-'}</td>
                      <td className="py-1.5 md:py-2.5 px-1 text-center text-slate-455">{row.perdidos ?? '-'}</td>
                      <td className="py-1.5 md:py-2.5 px-1 text-center text-slate-550 hidden sm:table-cell">{row.golesAFavor ?? '-'}</td>
                      <td className="py-1.5 md:py-2.5 px-1 text-center text-slate-550 hidden sm:table-cell">{row.golesEnContra ?? '-'}</td>
                      <td className="py-1.5 md:py-2.5 px-1 text-center font-bold text-slate-350">{row.diferenciaGoles ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-1 flex items-center gap-1.5 px-3 text-[9px] md:text-[10px] font-black tracking-wider text-slate-400">
          <div className="w-2 h-2 bg-fuchsia-500 rounded-sm shadow-[0_0_6px_rgba(240,34,226,0.5)]"></div>
          Los mejores 8 terceros puestos clasifican a los 16avos de final.
        </div>
      </div>
    );
  };

  const renderBracket = () => {
    if (loadingBracket) {
      return (
        <div className="flex-1 min-h-[200px] flex flex-col justify-center items-center bg-white/[0.01] border border-white/5 rounded-3xl gap-3">
          <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
          <span className="text-slate-400 text-xs font-medium">Cargando cuadro del mundial...</span>
        </div>
      );
    }

    if (bracketError || !bracketData || !bracketData.stages) {
      return (
        <div className="w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex justify-center items-center mt-2">
          <span className="text-red-400 font-bold text-sm">{bracketError || 'No se pudieron cargar los datos del cuadro.'}</span>
        </div>
      );
    }

    const stages = bracketData.stages;

    return (
      <div className="flex flex-col gap-3 animate-fade-in w-full">
        {/* Mobile Stage Selector */}
        <div className="flex md:hidden items-center gap-1 p-1 bg-slate-900/40 border border-white/5 rounded-xl overflow-x-auto no-scrollbar shadow-inner">
          {stages.map((stage: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setMobileStageIndex(idx)}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 border border-transparent cursor-pointer ${
                mobileStageIndex === idx
                  ? 'bg-amber-550/15 border-amber-500/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                  : 'text-slate-455 hover:text-slate-200'
              }`}
            >
              {stage.name.replace(' de final', '').replace(' de Final', '')}
            </button>
          ))}
        </div>

        {/* Bracket Scroll Container */}
        <div className="w-full overflow-x-auto pb-4 pt-1 select-none no-scrollbar scroll-smooth">
          <div className="flex gap-4 md:gap-6 items-stretch min-w-max px-1">
            {stages.map((stage: any, stageIdx: number) => {
              const isMobileVisible = mobileStageIndex === stageIdx;
              
              return (
                <div 
                  key={stageIdx} 
                  className={`${isMobileVisible ? 'flex' : 'hidden'} md:flex flex-col w-[170px] xs:w-[190px] md:w-[210px] shrink-0`}
                >
                  <div className="flex items-center pl-2 mb-2">
                    <div className="w-1 h-3 bg-amber-500 rounded-full mr-1.5 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                    <h4 className="text-[10px] md:text-[11px] font-black uppercase text-slate-350 tracking-wider">
                      {stage.name}
                    </h4>
                  </div>
                  
                  {/* min-h-0 on mobile keeps semifinal/final compact, while md:min-h-[850px] spaces stages vertically for horizontal alignment */}
                  <div className="flex flex-col justify-around flex-grow min-h-0 md:min-h-[850px] relative gap-1.5 md:gap-2.5 p-1.5 bg-slate-900/10 border border-white/[0.02] rounded-xl shadow-inner">
                    {stage.groups?.map((match: any, idx: number) => (
                      <div 
                        key={idx}
                        className="bg-[#0b1015]/85 border border-white/5 hover:border-amber-500/20 transition-all duration-300 rounded-lg p-1.5 md:p-2 flex flex-col gap-1 shadow-md w-full relative group"
                      >
                        {match.games && match.games[0]?.start_time && (
                          <div className="text-[7px] md:text-[8px] font-black text-slate-500 tracking-wider uppercase flex justify-between items-center px-0.5 border-b border-white/5 pb-0.5">
                            <span>
                              {stageIdx === 4 
                                ? (idx === 0 ? '🏆 Gran Final' : '🥉 Tercer Puesto') 
                                : `Partido ${idx + 1}`
                              }
                            </span>
                            <span className="text-amber-500/80">{match.games[0].start_time.split(' ')[0]}</span>
                          </div>
                        )}

                        <div className="flex flex-col gap-0.5 md:gap-1">
                          {match.participants?.map((p: any, pIdx: number) => {
                            const resolved = resolveParticipantName(p, stages);
                            const pName = resolved.name;
                            const localId = resolved.isReal ? getTeamIdByName(pName) : null;
                            const hasId = localId !== null;

                            const isWinner = match.winner === pIdx || (hasId && match.winner === localId);
                            const isLoser = match.winner !== -1 && !isWinner;
                            const score = match.score && match.score.length > pIdx ? match.score[pIdx] : null;

                            return (
                              <div 
                                key={pIdx} 
                                onClick={() => hasId && router.push(`/team/${localId}`)}
                                className={`flex items-center justify-between p-0.5 md:p-1 rounded transition-all ${
                                  hasId ? 'cursor-pointer hover:bg-white/5' : ''
                                } ${
                                  isWinner ? 'bg-amber-500/10 text-white font-bold' : 'text-slate-350'
                                } ${isLoser ? 'opacity-40' : ''}`}
                              >
                                <div className="flex items-center gap-1 md:gap-1.5 truncate pr-1">
                                  <div className="w-4 h-4 md:w-4.5 md:h-4.5 flex-shrink-0 bg-white/5 rounded-full border border-white/5 flex items-center justify-center overflow-hidden">
                                    {hasId ? (
                                      <TeamLogo
                                        logoUrl={`/escudos/${localId}.png`}
                                        teamName={pName}
                                        className="w-full h-full p-0.5"
                                      />
                                    ) : (
                                      <div className="text-[7px] text-slate-655">🏳️</div>
                                    )}
                                  </div>
                                  <span className={`text-[9px] md:text-[10px] truncate ${isWinner ? 'text-amber-400 font-extrabold' : 'font-medium'}`}>
                                    {pName}
                                  </span>
                                </div>
                                
                                {score !== null && score !== undefined && (
                                  <span className={`text-[9px] md:text-[10px] font-black px-1 py-0.5 rounded-md ${isWinner ? 'bg-amber-500/25 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-transparent'}`}>
                                    {score}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderPlayerStatistics = () => {
    if (loadingBracket) {
      return (
        <div className="flex-grow min-h-[300px] flex flex-col justify-center items-center bg-white/[0.02] border border-white/5 rounded-[2rem] gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-medium">Cargando estadísticas...</span>
        </div>
      );
    }

    if (bracketError || !playerStats || playerStats.length === 0) {
      return (
        <div className="w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex justify-center items-center mt-2">
          <span className="text-red-400 font-bold text-sm">
            {bracketError || 'No se pudieron cargar las estadísticas.'}
          </span>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 animate-fade-in w-full">
        {playerStats.map((statCategory: any, catIdx: number) => {
          const allRows = (statCategory.rows || []).slice(0, 20);
          const isExpanded = !!expandedCards[catIdx];
          const rows = isExpanded ? allRows : allRows.slice(0, 4);

          let catIcon = "📈";
          let badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
          
          const catNameLower = statCategory.name.toLowerCase();
          if (catNameLower.includes("gol")) {
            catIcon = "⚽";
            badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
          } else if (catNameLower.includes("asist")) {
            catIcon = "👟";
            badgeColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
          } else if (catNameLower.includes("barrid") || catNameLower.includes("foul") || catNameLower.includes("tackle")) {
            catIcon = "🛡️";
            badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
          } else if (catNameLower.includes("amarill")) {
            catIcon = "🟨";
            badgeColor = "bg-yellow-500/10 text-yellow-455 border-yellow-500/20";
          } else if (catNameLower.includes("roj")) {
            catIcon = "🟥";
            badgeColor = "bg-red-500/10 text-red-455 border-red-500/20";
          }

          return (
            <div 
              key={catIdx} 
              className="bg-[#0b1015]/60 border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/10"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-[#1a2330] to-[#121820] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{catIcon}</span>
                  <h3 className="text-xs md:text-sm font-black uppercase text-slate-200 tracking-wider">
                    {statCategory.name}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${badgeColor}`}>
                  Top {allRows.length}
                </span>
              </div>

              {/* Card Body - Table */}
              <div className="overflow-auto custom-scrollbar flex-grow">
                <table className="w-full text-left border-collapse text-[11px] md:text-xs">
                  <thead className="bg-[#121820]/30 text-slate-400 uppercase text-[9px] font-bold sticky top-0 border-b border-white/5 backdrop-blur-sm">
                    <tr>
                      <th className="py-2 px-3 text-center w-8">#</th>
                      <th className="py-2 px-2 text-left">Jugador / País</th>
                      <th className="py-2 px-3 text-center font-extrabold text-slate-350 w-16">
                        {statCategory.title || "Cant."}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((row: any, idx: number) => {
                      const localId = getTeamIdByName(row.teamName);

                      return (
                        <tr 
                          key={idx} 
                          className="hover:bg-amber-500/[0.02] transition-colors group cursor-pointer"
                          onClick={() => localId && router.push(`/team/${localId}`)}
                        >
                          {/* Rank */}
                          <td className="py-1.5 px-3 text-center font-black text-slate-500 group-hover:text-slate-350 transition-colors">
                            {row.rank || idx + 1}
                          </td>
                          {/* Player Info */}
                          <td className="py-1.5 px-2">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-[10px] md:text-[11px] text-slate-250 group-hover:text-white truncate">
                                {row.playerName}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0 bg-white/5 rounded-full border border-white/5 overflow-hidden flex items-center justify-center">
                                  {localId ? (
                                    <TeamLogo
                                      logoUrl={`/escudos/${localId}.png`}
                                      teamName={row.teamName}
                                      className="w-full h-full p-0.5"
                                    />
                                  ) : (
                                    <span className="text-[7px]">🏳️</span>
                                  )}
                                </div>
                                <span className="text-[8px] md:text-[9px] text-slate-400 font-medium truncate group-hover:text-slate-350">
                                  {row.teamName || "Desconocido"}
                                </span>
                              </div>
                            </div>
                          </td>
                          {/* Value */}
                          <td className="py-1.5 px-3 text-center font-black text-amber-400 bg-amber-500/5">
                            {row.value}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Card Footer with Toggle Button */}
              {allRows.length > 4 && (
                <div className="bg-[#121820]/45 px-4 py-2 border-t border-white/5 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCards(prev => ({ ...prev, [catIdx]: !isExpanded }));
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors py-1 px-3 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    {isExpanded ? "▲ Ver Menos" : "▼ Ver Más"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
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

  const isGroupLeague = activeLeague.id === 'mundial' || activeLeague.id === 'libertadores';
  const tabsToShow = isGroupLeague ? availableTabs : (activeTab ? [activeTab] : []);
  const dataForLegend = (isGroupLeague ? availableTabs : tabsToShow).flatMap(tab => standingsData[tab] || []);

  return (
    <div className="w-full flex flex-col gap-4 md:gap-6 pb-8 md:pb-10 animate-fade-in">
      <Header />

      {/* Main Sub Tabs Selector */}
      <div className="flex items-center gap-1 p-1 bg-[#121820]/80 border border-white/10 rounded-2xl w-full sm:w-max shadow-lg mb-1 md:mb-2">
        <button
          onClick={() => setActiveSubTab('grupos')}
          className={`flex-1 sm:flex-initial px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeSubTab === 'grupos'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          📊 Grupos
        </button>
        <button
          onClick={() => setActiveSubTab('estadisticas')}
          className={`flex-1 sm:flex-initial px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeSubTab === 'estadisticas'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          📈 Estadísticas
        </button>
        <button
          onClick={() => setActiveSubTab('bracket')}
          className={`flex-1 sm:flex-initial px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeSubTab === 'bracket'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          🏆 Cuadro
        </button>
      </div>

      {activeSubTab === 'grupos' && (
        <>
          {/* Table Containers */}
          <div className={`flex-1 ${isGroupLeague ? 'grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6' : 'flex flex-col gap-6 md:gap-8'}`}>
            {tabsToShow.map((tab) => {
              const currentData = standingsData[tab] || [];
              const isPromedios = tab === 'promedios';

              const headPY = 'py-2 md:py-3.5';
              const bodyPY = 'py-1.5 md:py-2.5';
              const iconSize = 'w-6 h-6 p-0.5 md:w-7 md:h-7';
              const textSize = 'text-[11px] xs:text-[12px] md:text-sm';
              const minW = 'w-full min-w-[340px] xs:min-w-[420px] md:min-w-[480px]';

              return (
                <div key={tab} className="flex flex-col gap-2 md:gap-3">
                  {isGroupLeague && (
                    <div className="flex items-center pl-2 group-header-container">
                      <div className="w-1 h-4 bg-amber-500 rounded-full mr-2 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                      <h3 className="text-base md:text-lg font-black uppercase text-slate-200">
                        {formatTabName(tab)}
                      </h3>
                    </div>
                  )}
                  <div className="overflow-hidden bg-[#0b1015]/60 rounded-2xl border border-white/5 relative shadow-xl backdrop-blur-md">
                    <div className="w-full h-full overflow-auto custom-scrollbar max-h-[800px]">
                      <table className={`w-full text-left border-collapse ${minW} text-[11px] md:text-sm`}>
                        <thead className="bg-gradient-to-b from-[#1a2330] to-[#121820] text-slate-350 sticky top-0 z-10 text-[10px] md:text-xs uppercase tracking-wider font-extrabold shadow-md border-b border-white/10">
                          <tr>
                            <th className={`${headPY} px-2 w-7 md:w-10 text-center`}>#</th>
                            <th className={`${headPY} px-1.5 text-left`}>Equipo</th>
                            {isPromedios ? (
                              <>
                                <th className={`${headPY} px-1 text-center text-amber-400`}>Prom</th>
                                <th className={`${headPY} px-1 text-center`}>Pts</th>
                                <th className={`${headPY} px-1 text-center`}>PJ</th>
                                <th className={`${headPY} px-1 text-center opacity-70 hidden sm:table-cell`}>Act</th>
                                <th className={`${headPY} px-1 text-center opacity-70 hidden sm:table-cell`}>Ant</th>
                                <th className={`${headPY} px-1 text-center opacity-70 hidden sm:table-cell`}>Tras</th>
                              </>
                            ) : (
                              <>
                                <th className={`${headPY} px-1 text-center text-amber-400`}>Pts</th>
                                <th className={`${headPY} px-1 text-center`}>PJ</th>
                                <th className={`${headPY} px-1 text-center`}>G</th>
                                <th className={`${headPY} px-1 text-center`}>E</th>
                                <th className={`${headPY} px-1 text-center`}>P</th>
                                <th className={`${headPY} px-1 text-center opacity-70 hidden sm:table-cell`}>GF</th>
                                <th className={`${headPY} px-1 text-center opacity-70 hidden sm:table-cell`}>GC</th>
                                <th className={`${headPY} px-1 text-center`}>DIF</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {currentData.map((row, idx) => {
                            const borderClass = getBackgroundColorForPromotion(row.promocion);
                            return (
                              <tr
                                key={row.equipoId || idx}
                                onClick={() => row.equipoId && router.push(`/team/${row.equipoId}`)}
                                className="hover:bg-amber-500/[0.03] transition-colors group cursor-pointer"
                              >
                                <td className={`${bodyPY} px-2 text-center font-black text-slate-500 group-hover:text-slate-350 transition-colors ${borderClass}`}>
                                  {row.posicion || idx + 1}
                                </td>
                                <td className={`${bodyPY} px-1.5`}>
                                  <TeamHoverCard teamId={row.equipoId} teamName={row.nombre} className="w-full flex items-center">
                                    <div className="flex items-center gap-2">
                                      <div className={`${iconSize} flex-shrink-0 bg-white/5 rounded-full mt-0.5 border border-white/5 group-hover:border-white/10 transition-colors`}>
                                        <TeamLogo
                                          logoUrl={`/escudos/${row.equipoId}.png`}
                                          teamName={row.nombre}
                                          className="w-full h-full"
                                        />
                                      </div>
                                      <span className={`font-bold text-slate-200 group-hover:text-white truncate max-w-[90px] xs:max-w-[125px] sm:max-w-xs transition-colors ${textSize}`}>
                                        {row.nombre}
                                      </span>
                                      {row.enVivo && (
                                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 rounded-md shrink-0 animate-pulse">
                                          Vivo
                                        </span>
                                      )}
                                    </div>
                                  </TeamHoverCard>
                                </td>

                                {isPromedios ? (
                                  <>
                                    <td className={`${bodyPY} px-1 text-center font-black text-amber-400 bg-amber-500/5`}>{row.coeficiente?.toFixed(3)}</td>
                                    <td className={`${bodyPY} px-1 text-center font-black text-white`}>{row.puntosTotales}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-450 font-medium`}>{row.partidosTotales}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-550 hidden sm:table-cell`}>{row.ptsTemporadaActual}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-550 hidden sm:table-cell`}>{row.ptsTemporadaAnterior}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-550 hidden sm:table-cell`}>{row.ptsTemporadaTrasanterior}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className={`${bodyPY} px-1 text-center font-black text-amber-400 bg-amber-500/5`}>{row.puntos ?? '-'}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-450 font-medium`}>{row.partidosJugados ?? '-'}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-350 font-medium`}>{row.ganados ?? '-'}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-450`}>{row.empatados ?? '-'}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-455`}>{row.perdidos ?? '-'}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-550 hidden sm:table-cell`}>{row.golesAFavor ?? '-'}</td>
                                    <td className={`${bodyPY} px-1 text-center text-slate-550 hidden sm:table-cell`}>{row.golesEnContra ?? '-'}</td>
                                    <td className={`${bodyPY} px-1 text-center font-bold text-slate-350`}>{row.diferenciaGoles ?? '-'}</td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Botón desplegar partidos y listado */}
                  {isGroupLeague && (
                    <div className="mt-1 px-1">
                      <button
                        onClick={() => {
                          setExpandedGroups(prev => ({
                            ...prev,
                            [tab]: !prev[tab]
                          }));
                        }}
                        className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-xs font-bold text-slate-350 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>⚽</span>
                        {expandedGroups[tab] ? 'Ocultar partidos' : 'Desplegar partidos'}
                        <span className="text-[10px] opacity-60">
                          {expandedGroups[tab] ? '▲' : '▼'}
                        </span>
                      </button>

                      {expandedGroups[tab] && (
                        <div className="mt-3 flex flex-col gap-2 p-3 bg-[#0b1015]/40 border border-white/5 rounded-2xl animate-fade-in">
                          {getGroupMatches(currentData).length === 0 ? (
                            <span className="text-[11px] text-slate-500 text-center font-medium py-2">
                              No hay partidos cargados para este grupo.
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {getGroupMatches(currentData).map((m: any) => {
                                const hName = translateTeamToSpanish(m.homeTeam?.name || m.home_team?.name || 'Local');
                                const aName = translateTeamToSpanish(m.awayTeam?.name || m.away_team?.name || 'Visitante');
                                const hId = m.homeTeam?.id || m.home_team?.id;
                                const aId = m.awayTeam?.id || m.away_team?.id;
                                
                                const hLogo = hId ? `/escudos/${hId}.png` : null;
                                const aLogo = aId ? `/escudos/${aId}.png` : null;
                                
                                const statusType = typeof m.status === 'object' ? m.status?.type : m.status;
                                const isFinished = statusType === 'finished';
                                const isInProgress = statusType === 'inprogress';
                                
                                const hScore = m.homeScore?.current ?? m.homeTeam?.score ?? m.home_team?.score ?? (isFinished || isInProgress ? 0 : '-');
                                const aScore = m.awayScore?.current ?? m.awayTeam?.score ?? m.away_team?.score ?? (isFinished || isInProgress ? 0 : '-');
                                
                                const date = m.startTimestamp ? new Date(m.startTimestamp * 1000) : null;
                                const dateStr = date ? date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '';
                                const timeStr = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                                return (
                                  <div
                                    key={m.id || m._id}
                                    onClick={() => router.push(`/match/${m.id || m._id}`)}
                                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.04] border border-white/5 transition-all cursor-pointer group"
                                  >
                                    <div className="flex flex-col justify-center items-start pl-1 shrink-0 min-w-[55px]">
                                      {isInProgress ? (
                                        <span className="text-[9px] font-black text-red-500 animate-pulse tracking-wide">EN VIVO</span>
                                      ) : isFinished ? (
                                        <span className="text-[9px] font-bold text-slate-500">FINALIZADO</span>
                                      ) : (
                                        <>
                                          <span className="text-[10px] font-extrabold text-amber-500/80 leading-none">{dateStr}</span>
                                          <span className="text-[9px] font-medium text-slate-400 mt-0.5 leading-none">{timeStr}</span>
                                        </>
                                      )}
                                    </div>

                                    <div className="flex-1 flex items-center justify-center gap-2 px-2 min-w-0">
                                      <div className="flex-1 flex items-center justify-end gap-1.5 text-right min-w-0">
                                        <span className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate">
                                          {hName}
                                        </span>
                                        <div className="w-5 h-5 flex-shrink-0 bg-white/5 rounded-full border border-white/5 flex items-center justify-center overflow-hidden">
                                          <TeamLogo logoUrl={hLogo} teamName={hName} className="w-full h-full p-0.5" />
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/40 border border-white/5 font-mono text-xs font-black select-none shrink-0">
                                        <span className={isFinished || isInProgress ? 'text-white' : 'text-slate-550'}>{hScore}</span>
                                        <span className="text-slate-600 font-sans font-medium">-</span>
                                        <span className={isFinished || isInProgress ? 'text-white' : 'text-slate-550'}>{aScore}</span>
                                      </div>

                                      <div className="flex-1 flex items-center justify-start gap-1.5 text-left min-w-0">
                                        <div className="w-5 h-5 flex-shrink-0 bg-white/5 rounded-full border border-white/5 flex items-center justify-center overflow-hidden">
                                          <TeamLogo logoUrl={aLogo} teamName={aName} className="w-full h-full p-0.5" />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate">
                                          {aName}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="pr-1 text-slate-600 group-hover:text-slate-350 transition-colors text-[9px] shrink-0 select-none">
                                      ▶
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend Area */}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 px-3 text-[9px] md:text-[10px] font-black tracking-wider justify-center lg:justify-start text-slate-400">
            {dataForLegend.some(row => row.promocion?.toLowerCase().includes('libertadores') || row.promocion?.toLowerCase().includes('champions')) && (
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-cyan-400 rounded-sm shadow-[0_0_6px_rgba(34,211,238,0.5)]"></div> 16avos de final</div>
            )}
            {dataForLegend.some(row => row.promocion?.toLowerCase().includes('sudamericana') || row.promocion?.toLowerCase().includes('europa')) && (
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-amber-400 rounded-sm shadow-[0_0_6px_rgba(251,191,36,0.5)]"></div> Posible clasificado</div>
            )}
            {dataForLegend.some(row => row.promocion?.toLowerCase().includes('relegation') || row.promocion?.toLowerCase().includes('descenso')) && (
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-sm shadow-[0_0_6px_rgba(239,68,68,0.5)]"></div> Eliminado</div>
            )}
          </div>

          {/* Third Place Table at the bottom of groups */}
          {thirdPlaceTable && (
            <div className="mt-8 border-t border-white/5 pt-6">
              {renderThirdPlaceTable()}
            </div>
          )}
        </>
      )}

      {activeSubTab === 'estadisticas' && renderPlayerStatistics()}

      {activeSubTab === 'bracket' && renderBracket()}
    </div>
  );
}
