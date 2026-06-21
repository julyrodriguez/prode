"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useContext } from 'react';
import { DashboardContext } from '../app/(dashboard)/layout';
import { LEAGUES } from '../components/layout/AppLayout';

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

export default function StatsView() {
  const params = useParams();
  const leagueId = (params?.leagueId as string) || 'general';
  const activeLeague = LEAGUES.find(l => l.id === leagueId) || LEAGUES[0];
  const router = useRouter();
  const tournamentId = activeLeague.tournamentId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [standingsData, setStandingsData] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);

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
        
        const availableTabs = Object.keys(filledTables);
        if (availableTabs.length > 0) {
          // Default to the first available tab if activeTab is empty or not in the new dataset
          if (!activeTab || !availableTabs.includes(activeTab)) {
            // Prioritize tables with generic names if desired, but first available is fine
            setActiveTab(availableTabs[0]);
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

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8">
        <h2 className="text-2xl font-black text-white mb-6">Estadísticas</h2>
        <div className="flex-1 flex flex-col justify-center items-center gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-medium">Cargando estadísticas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8">
        <h2 className="text-2xl font-black text-white mb-6">Estadísticas</h2>
        <div className="w-full bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 flex justify-center items-center mt-4">
          <span className="text-red-400 font-bold text-lg">{error}</span>
        </div>
      </div>
    );
  }

  const availableTabs = Object.keys(standingsData);

  if (availableTabs.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8">
        <h2 className="text-2xl font-black text-white mb-6">Estadísticas</h2>
        <div className="flex-1 flex flex-col justify-center items-center bg-white/[0.02] border border-white/5 rounded-2xl p-10 text-center gap-4">
          <div className="text-5xl opacity-30">📊</div>
          <span className="text-slate-400 text-lg font-medium">Aún no hay estadísticas para esta liga.</span>
        </div>
      </div>
    );
  }

  // Active table data
  const currentData = activeTab ? standingsData[activeTab] : [];
  const isPromedios = activeTab === 'promedios';

  const getBackgroundColorForPromotion = (promoDesc: string | null) => {
    if (!promoDesc) return '';
    const dl = promoDesc.toLowerCase();
    if (dl.includes('libertadores') || dl.includes('champions')) return 'border-l-4 border-l-emerald-400';
    if (dl.includes('sudamericana') || dl.includes('europa')) return 'border-l-4 border-l-amber-400';
    if (dl.includes('playoff')) return 'border-l-4 border-l-blue-400';
    if (dl.includes('relegation') || dl.includes('descenso')) return 'border-l-4 border-l-red-500';
    return 'border-l-4 border-l-white/20'; // Default fallback
  };

  return (
    <div className="flex flex-col h-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 sm:p-6 lg:p-8">
      {/* Header & Tabs */}
      <div className="mb-6 flex flex-col gap-4">
        <h2 className="text-2xl font-black text-white">Estadísticas</h2>
        
        {availableTabs.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5 shadow-inner">
            {availableTabs.map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tabKey 
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {formatTabName(tabKey)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden bg-[#0b1015]/60 rounded-2xl border border-white/5 relative shadow-xl backdrop-blur-md">
        <div className="w-full h-full overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-[700px] text-sm">
            <thead className="bg-[#121820] text-slate-400 sticky top-0 z-10 text-xs uppercase tracking-wider font-extrabold shadow-md border-b border-white/10">
              <tr>
                <th className="py-4 px-4 w-12 text-center">#</th>
                <th className="py-4 px-2 text-left">Equipo</th>
                {isPromedios ? (
                  <>
                    <th className="py-4 px-3 text-center text-emerald-400">Prom</th>
                    <th className="py-4 px-3 text-center">Pts</th>
                    <th className="py-4 px-3 text-center">PJ</th>
                    <th className="py-4 px-3 text-center opacity-70">Act</th>
                    <th className="py-4 px-3 text-center opacity-70">Ant</th>
                    <th className="py-4 px-3 text-center opacity-70">Tras</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-3 text-center text-emerald-400">Pts</th>
                    <th className="py-4 px-3 text-center">PJ</th>
                    <th className="py-4 px-3 text-center">G</th>
                    <th className="py-4 px-3 text-center">E</th>
                    <th className="py-4 px-3 text-center">P</th>
                    <th className="py-4 px-3 text-center opacity-70">GF</th>
                    <th className="py-4 px-3 text-center opacity-70">GC</th>
                    <th className="py-4 px-3 text-center">DIF</th>
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
                    className="hover:bg-emerald-500/[0.05] transition-colors group cursor-pointer"
                  >
                    <td className={`py-3 px-4 text-center font-bold text-slate-500 group-hover:text-slate-300 transition-colors ${borderClass}`}>
                      {row.posicion || idx + 1}
                    </td>
                    <td className="py-3 px-2">
                       <div className="flex items-center gap-3">
                         <div className="w-7 h-7 flex-shrink-0 bg-white/5 rounded-full p-0.5 mt-0.5">
                            <img 
                             src={`/escudos/${row.equipoId}.png`} 
                             alt={row.nombre} 
                             className="w-full h-full object-contain drop-shadow-md"
                             onError={(e) => { (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/48/000000/football2.png' }}
                            />
                         </div>
                         <span className="font-bold text-slate-200 group-hover:text-white truncate max-w-[150px] sm:max-w-xs transition-colors">
                           {row.nombre}
                         </span>
                       </div>
                    </td>

                    {isPromedios ? (
                      <>
                        <td className="py-3 px-3 text-center font-black text-emerald-400 bg-emerald-500/5">{row.coeficiente?.toFixed(3)}</td>
                        <td className="py-3 px-3 text-center font-black text-white">{row.puntosTotales}</td>
                        <td className="py-3 px-3 text-center text-slate-400 font-medium">{row.partidosTotales}</td>
                        <td className="py-3 px-3 text-center text-slate-500">{row.ptsTemporadaActual}</td>
                        <td className="py-3 px-3 text-center text-slate-500">{row.ptsTemporadaAnterior}</td>
                        <td className="py-3 px-3 text-center text-slate-500">{row.ptsTemporadaTrasanterior}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-3 text-center font-black text-emerald-400 bg-emerald-500/5">{row.puntos ?? '-'}</td>
                        <td className="py-3 px-3 text-center text-slate-400 font-medium">{row.partidosJugados ?? '-'}</td>
                        <td className="py-3 px-3 text-center text-slate-300 font-medium">{row.ganados ?? '-'}</td>
                        <td className="py-3 px-3 text-center text-slate-400">{row.empatados ?? '-'}</td>
                        <td className="py-3 px-3 text-center text-slate-400">{row.perdidos ?? '-'}</td>
                        <td className="py-3 px-3 text-center text-slate-500">{row.golesAFavor ?? '-'}</td>
                        <td className="py-3 px-3 text-center text-slate-500">{row.golesEnContra ?? '-'}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-300">{row.diferenciaGoles ?? '-'}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Legend Area (Optional) */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-2 text-[10px] sm:text-xs text-slate-400 uppercase font-black tracking-wider justify-center lg:justify-start">
        {currentData.some(row => row.promocion?.toLowerCase().includes('libertadores') || row.promocion?.toLowerCase().includes('champions')) && (
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-400 rounded-sm"></div> Libertadores / Champions</div>
        )}
        {currentData.some(row => row.promocion?.toLowerCase().includes('sudamericana') || row.promocion?.toLowerCase().includes('europa')) && (
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-400 rounded-sm"></div> Sudamericana / Europa</div>
        )}
        {currentData.some(row => row.promocion?.toLowerCase().includes('playoff')) && (
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-400 rounded-sm"></div> Playoffs</div>
        )}
        {currentData.some(row => row.promocion?.toLowerCase().includes('relegation') || row.promocion?.toLowerCase().includes('descenso')) && (
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-sm"></div> Descenso</div>
        )}
      </div>

    </div>
  );
}
