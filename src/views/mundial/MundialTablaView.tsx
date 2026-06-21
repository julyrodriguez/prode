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
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('all');

  // Sub-tabs navigation
  const [activeSubTab, setActiveSubTab] = useState<'grupos' | 'terceros' | 'bracket'>('grupos');
  const [bracketData, setBracketData] = useState<any>(null);
  const [thirdPlaceTable, setThirdPlaceTable] = useState<any>(null);
  const [loadingBracket, setLoadingBracket] = useState(false);
  const [bracketError, setBracketError] = useState<string | null>(null);
  const [mobileStageIndex, setMobileStageIndex] = useState(0);

  const availableTabs = Object.keys(standingsData);

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

  // Handle auto-focus of group tab on mobile layout
  useEffect(() => {
    if (availableTabs.length === 0) return;
    
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSelectedGroupTab(prev => prev === 'all' ? availableTabs[0] : prev);
      } else {
        setSelectedGroupTab('all');
      }
    };
    
    handleResize(); // Run initially
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
    if (dl.includes('siguiente ronda')) return 'border-l-4 border-l-fuchsia-500';
    return 'border-l-4 border-l-white/20'; // Default fallback
  };

  const mapPromiedosRow = (row: any) => {
    const getVal = (key: string) => row.values?.find((v: any) => v.key === key)?.value;
    
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
      nombre: row.entity?.object?.name || '?',
      equipoId: row.entity?.object?.id,
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
    <div className="relative bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.5)] mb-2">
      <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 translate-y-1/2" />
      <h1 className="relative z-10 text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-250 to-emerald-400 tracking-tight drop-shadow-md">
        📊 Tabla de Posiciones
      </h1>
      <p className="text-slate-400 text-xs font-semibold mt-1 relative z-10">
        Estadísticas oficiales del Mundial de la FIFA
      </p>
    </div>
  );

  const renderThirdPlaceTable = () => {
    if (loadingBracket) {
      return (
        <div className="flex-1 min-h-[300px] flex flex-col justify-center items-center bg-white/[0.02] border border-white/5 rounded-[2rem] gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-medium">Cargando tabla de mejores terceros...</span>
        </div>
      );
    }

    if (bracketError || !thirdPlaceTable) {
      return (
        <div className="w-full bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 flex justify-center items-center mt-4">
          <span className="text-red-400 font-bold text-lg">{bracketError || 'No se pudieron cargar los datos.'}</span>
        </div>
      );
    }

    const rows = thirdPlaceTable.table?.rows?.map(mapPromiedosRow) || [];

    return (
      <div className="flex flex-col gap-3 animate-fade-in">
        <div className="flex items-center pl-2">
          <div className="w-1.5 h-6 bg-fuchsia-500 rounded-full mr-3 shadow-[0_0_10px_rgba(240,34,226,0.4)]" />
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-pink-400">
            Tabla de Terceros Puestos
          </h3>
        </div>
        
        <div className="overflow-hidden bg-[#0b1015]/60 rounded-[2rem] border border-white/5 relative shadow-2xl backdrop-blur-md">
          <div className="w-full h-full overflow-auto custom-scrollbar max-h-[800px]">
            <table className="w-full text-left border-collapse w-full md:min-w-[480px] text-sm">
              <thead className="bg-gradient-to-b from-[#1a2330] to-[#121820] text-slate-300 sticky top-0 z-10 text-xs uppercase tracking-wider font-extrabold shadow-md border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-3 w-10 text-center">#</th>
                  <th className="py-3.5 px-2 text-left">Equipo</th>
                  <th className="py-3.5 px-2 text-center text-amber-400">Pts</th>
                  <th className="py-3.5 px-2 text-center">PJ</th>
                  <th className="py-3.5 px-2 text-center">G</th>
                  <th className="py-3.5 px-2 text-center">E</th>
                  <th className="py-3.5 px-2 text-center">P</th>
                  <th className="py-3.5 px-2 text-center opacity-70 hidden sm:table-cell">GF</th>
                  <th className="py-3.5 px-2 text-center opacity-70 hidden sm:table-cell">GC</th>
                  <th className="py-3.5 px-2 text-center">DIF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.map((row: any, idx: number) => {
                  const borderClass = getBackgroundColorForPromotion(row.promocion);
                  const isQualifying = row.promocion === 'Siguiente Ronda';
                  return (
                    <tr
                      key={row.equipoId || idx}
                      onClick={() => row.equipoId && router.push(`/team/${row.equipoId}`)}
                      className="hover:bg-amber-500/[0.04] transition-colors group cursor-pointer"
                    >
                      <td className={`py-2.5 px-3 text-center font-black text-slate-500 group-hover:text-slate-350 transition-colors ${borderClass}`}>
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-2">
                        <TeamHoverCard teamId={row.equipoId} teamName={row.nombre} className="w-full flex items-center">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 p-0.5 flex-shrink-0 bg-white/5 rounded-full mt-0.5 border border-white/5 group-hover:border-white/10 transition-colors">
                              <TeamLogo
                                logoUrl={row.equipoId ? `/escudos/${row.equipoId}.png` : null}
                                teamName={row.nombre}
                                className="w-full h-full"
                              />
                            </div>
                            <span className="font-bold text-slate-100 group-hover:text-white truncate max-w-[120px] xs:max-w-[140px] sm:max-w-xs transition-colors text-xs sm:text-sm">
                              {row.nombre}
                            </span>
                            {isQualifying && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 rounded-md shrink-0">
                                Clasificado
                              </span>
                            )}
                          </div>
                        </TeamHoverCard>
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-amber-400 bg-amber-500/5">{row.puntos ?? '-'}</td>
                      <td className="py-2.5 px-2 text-center text-slate-450 font-medium">{row.partidosJugados ?? '-'}</td>
                      <td className="py-2.5 px-2 text-center text-slate-350 font-medium">{row.ganados ?? '-'}</td>
                      <td className="py-2.5 px-2 text-center text-slate-450">{row.empatados ?? '-'}</td>
                      <td className="py-2.5 px-2 text-center text-slate-455">{row.perdidos ?? '-'}</td>
                      <td className="py-2.5 px-2 text-center text-slate-550 hidden sm:table-cell">{row.golesAFavor ?? '-'}</td>
                      <td className="py-2.5 px-2 text-center text-slate-550 hidden sm:table-cell">{row.golesEnContra ?? '-'}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-350">{row.diferenciaGoles ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-2 flex items-center gap-2 px-4 text-[10px] sm:text-[11px] font-black tracking-wider text-slate-400">
          <div className="w-2.5 h-2.5 bg-fuchsia-500 rounded-sm shadow-[0_0_8px_rgba(240,34,226,0.5)]"></div>
          Los mejores 8 terceros puestos clasifican a los 16avos de final.
        </div>
      </div>
    );
  };

  const renderBracket = () => {
    if (loadingBracket) {
      return (
        <div className="flex-1 min-h-[300px] flex flex-col justify-center items-center bg-white/[0.02] border border-white/5 rounded-[2rem] gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-medium">Cargando cuadro del mundial...</span>
        </div>
      );
    }

    if (bracketError || !bracketData || !bracketData.stages) {
      return (
        <div className="w-full bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 flex justify-center items-center mt-4">
          <span className="text-red-400 font-bold text-lg">{bracketError || 'No se pudieron cargar los datos del cuadro.'}</span>
        </div>
      );
    }

    const stages = bracketData.stages;

    return (
      <div className="flex flex-col gap-4 animate-fade-in w-full">
        {/* Mobile Stage Selector */}
        <div className="flex md:hidden items-center gap-1.5 p-1.5 bg-slate-900/40 border border-white/5 rounded-2xl overflow-x-auto no-scrollbar shadow-inner mb-2">
          {stages.map((stage: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setMobileStageIndex(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 border border-transparent cursor-pointer ${
                mobileStageIndex === idx
                  ? 'bg-amber-550/15 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {stage.name.replace(' de final', '').replace(' de Final', '')}
            </button>
          ))}
        </div>

        {/* Bracket Scroll Container */}
        <div className="w-full overflow-x-auto pb-6 pt-2 select-none no-scrollbar scroll-smooth">
          <div className="flex gap-6 items-stretch min-w-max px-2">
            {stages.map((stage: any, stageIdx: number) => {
              const isMobileVisible = mobileStageIndex === stageIdx;
              
              return (
                <div 
                  key={stageIdx} 
                  className={`${isMobileVisible ? 'flex' : 'hidden'} md:flex flex-col w-72 shrink-0`}
                >
                  <div className="flex items-center pl-2 mb-3">
                    <div className="w-1 h-4 bg-amber-500 rounded-full mr-2 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                    <h4 className="text-sm font-black uppercase text-slate-350 tracking-wider">
                      {stage.name}
                    </h4>
                  </div>
                  
                  <div className="flex flex-col justify-around flex-grow min-h-[850px] relative gap-4 p-3 bg-slate-900/10 border border-white/[0.03] rounded-[2rem] shadow-inner">
                    {stage.groups?.map((match: any, idx: number) => (
                      <div 
                        key={idx}
                        className="bg-[#0b1015]/80 border border-white/5 hover:border-amber-500/20 transition-all duration-300 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-lg w-full relative group"
                      >
                        {match.games && match.games[0]?.start_time && (
                          <div className="text-[9px] font-black text-slate-500 tracking-wider uppercase flex justify-between items-center px-0.5 border-b border-white/5 pb-1.5">
                            <span>
                              {stageIdx === 4 
                                ? (idx === 0 ? '🏆 Gran Final' : '🥉 Tercer Puesto') 
                                : `Partido ${idx + 1}`
                              }
                            </span>
                            <span className="text-amber-500/80">{match.games[0].start_time.split(' ')[0]}</span>
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          {match.participants?.map((p: any, pIdx: number) => {
                            const isWinner = match.winner === pIdx || (p.id && p.id !== -1 && match.winner === p.id);
                            const isLoser = match.winner !== -1 && !isWinner;
                            const score = match.score && match.score.length > pIdx ? match.score[pIdx] : null;
                            const hasId = p.id && p.id !== -1;

                            return (
                              <div 
                                key={pIdx} 
                                onClick={() => hasId && router.push(`/team/${p.id}`)}
                                className={`flex items-center justify-between p-1.5 rounded-xl transition-all ${
                                  hasId ? 'cursor-pointer hover:bg-white/5' : ''
                                } ${
                                  isWinner ? 'bg-amber-500/10 text-white font-bold' : 'text-slate-350'
                                } ${isLoser ? 'opacity-45' : ''}`}
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <div className="w-5.5 h-5.5 flex-shrink-0 bg-white/5 rounded-full border border-white/5 flex items-center justify-center overflow-hidden">
                                    {hasId ? (
                                      <TeamLogo
                                        logoUrl={`/escudos/${p.id}.png`}
                                        teamName={p.nombre || p.name}
                                        className="w-full h-full p-0.5"
                                      />
                                    ) : (
                                      <div className="text-[9px] text-slate-600">🏳️</div>
                                    )}
                                  </div>
                                  <span className={`text-xs truncate ${isWinner ? 'text-amber-400 font-black' : 'font-medium'}`}>
                                    {p.nombre || p.name}
                                  </span>
                                </div>
                                
                                {score !== null && score !== undefined && (
                                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${isWinner ? 'bg-amber-500/25 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-transparent'}`}>
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
  const tabsToShow = isGroupLeague
    ? (selectedGroupTab === 'all' ? availableTabs : [selectedGroupTab])
    : (activeTab ? [activeTab] : []);
  const dataForLegend = (isGroupLeague ? availableTabs : tabsToShow).flatMap(tab => standingsData[tab] || []);

  return (
    <div className="w-full flex flex-col gap-6 pb-10 animate-fade-in">
      <Header />

      {/* Main Sub Tabs Selector */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#121820]/80 border border-white/10 rounded-2xl w-full sm:w-max shadow-lg mb-2">
        <button
          onClick={() => setActiveSubTab('grupos')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeSubTab === 'grupos'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          📊 Fase de Grupos
        </button>
        <button
          onClick={() => setActiveSubTab('terceros')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeSubTab === 'terceros'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          🥉 Mejores Terceros
        </button>
        <button
          onClick={() => setActiveSubTab('bracket')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeSubTab === 'bracket'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          🏆 Cuadro / Bracket
        </button>
      </div>

      {activeSubTab === 'grupos' && (
        <>
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
                  {formatTabName(tabKey)}
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
                  className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === tabKey
                      ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {formatTabName(tabKey)}
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
                        {formatTabName(tab)}
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
                                    <td className={`${bodyPY} px-1 sm:px-2 text-center text-slate-450 font-medium`}>{row.partidosJugados ?? '-'}</td>
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
        </>
      )}

      {activeSubTab === 'terceros' && renderThirdPlaceTable()}

      {activeSubTab === 'bracket' && renderBracket()}
    </div>
  );
}
