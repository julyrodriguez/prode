"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LEAGUES } from '../components/layout/AppLayout';
import TeamHoverCard from '../components/TeamHoverCard';
import TeamForm from '../components/TeamForm';
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

export default function LeagueTablaView() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;
  const activeLeague = LEAGUES.find(l => l.id === leagueId) || LEAGUES[0];
  const tournamentId = activeLeague.tournamentId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [standingsData, setStandingsData] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('all');

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
    return 'border-l-4 border-l-white/20'; // Default fallback
  };

  const Header = () => (
    <div className="relative bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.5)] mb-2">
      <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 translate-y-1/2" />
      <h1 className="relative z-10 text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-250 to-emerald-400 tracking-tight drop-shadow-md">
        📊 Tabla de Posiciones
      </h1>
      <p className="text-slate-400 text-xs font-semibold mt-1 relative z-10">
        Estadísticas oficiales de la fase de grupos
      </p>
    </div>
  );

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
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === tabKey
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
                                      logoUrl={`https://apivacas.jariel.com.ar/escudos/${row.equipoId}.png`}
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
                                <td className={`${bodyPY} px-1 sm:px-2 text-center text-slate-450`}>{row.empatados ?? '-'}</td>
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
