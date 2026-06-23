"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useContext } from 'react';
import { DashboardContext } from '../app/(dashboard)/layout';
import { ArrowLeft, MapPin, Users, Calendar } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function getReadableColor(hex: string): string {
  if (!hex) return '#10b981';
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 70 ? '#ffffff' : `#${hex}`;
}

export default function TeamView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const outletContext = useContext(DashboardContext);
  const setOverriddenLeagueId = outletContext?.setOverriddenLeagueId;

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [team, setTeam] = useState<any>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'squad'>('matches');

  useEffect(() => {
    if (team && setOverriddenLeagueId) {
      const compKeys = Object.keys(team.competitions || {});
      if (compKeys.includes('16')) {
        setOverriddenLeagueId('mundial');
      } else if (compKeys.includes('155')) {
        setOverriddenLeagueId('liga-arg');
      } else if (compKeys.includes('325')) {
        setOverriddenLeagueId('brasileirao');
      }
    }
    return () => {
      if (setOverriddenLeagueId) {
        setOverriddenLeagueId(null);
      }
    };
  }, [team, setOverriddenLeagueId]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const res = await fetch(`https://apivacas.jariel.com.ar/api/teams/${id}`);
        if (!res.ok) throw new Error('No se pudo cargar el equipo');
        const data = await res.json();
        setTeam(data);

        // Obtener historial de partidos
        try {
          const mRes = await fetch(`https://apivacas.jariel.com.ar/api/teams/${id}/all-matches?limit=15`);
          if (mRes.ok) {
            const allMatches = await mRes.json();
            const now = Math.floor(Date.now() / 1000);
            const played = allMatches.filter((m: any) => m.startTimestamp && m.startTimestamp <= now).sort((a: any, b: any) => b.startTimestamp - a.startTimestamp);
            const upcoming = allMatches.filter((m: any) => m.startTimestamp && m.startTimestamp > now).sort((a: any, b: any) => a.startTimestamp - b.startTimestamp);
            setRecentMatches(played);
            setUpcomingMatches(upcoming);
          }
        } catch(e) {
          console.error("Error fetching recent matches:", e);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTeam();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 rounded-full border-t-2 border-emerald-400 border-r-2 border-transparent" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="text-4xl">⚠️</div>
        <p>{error || 'Equipo no encontrado.'}</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
          Volver
        </button>
      </div>
    );
  }

  const profile = team.profile || {};
  const competitions = team.competitions || {};

  // Colores del equipo
  const primary = profile.colors?.primary || '#1e293b';
  const secondary = profile.colors?.secondary || '#94a3b8';

  // Año de fundación
  const foundationYear = profile.foundationDate
    ? new Date(profile.foundationDate * 1000).getFullYear()
    : null;

  return (
    <div className="w-full flex flex-col gap-6 pb-10 pt-4 md:pt-6 animate-fade-in">

      {/* Botón volver */}
      <button
        onClick={() => router.back()}
        className="self-start flex items-center gap-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-semibold text-sm">Volver</span>
      </button>

      {/* ─── HERO del Equipo ─── */}
      <div
        className="relative w-full rounded-[2rem] p-6 lg:p-10 overflow-hidden border shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
        style={{
          background: isLight
            ? `linear-gradient(135deg, ${primary}18 0%, #f1f5f9 60%, ${secondary}10 100%)`
            : `linear-gradient(135deg, ${primary}30 0%, #09090b 60%, ${secondary}15 100%)`,
          borderColor: isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.10)',
        }}
      >
        {/* Glow detrás */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[120px] pointer-events-none"
          style={{ background: primary, opacity: isLight ? 0.12 : 0.30 }}
        />
        <div
          className="absolute bottom-0 right-0 w-48 h-48 rounded-full blur-[100px] pointer-events-none"
          style={{ background: secondary, opacity: isLight ? 0.10 : 0.20 }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Escudo real */}
          <div
            className="w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center text-4xl font-black border-4 shadow-2xl shrink-0 select-none overflow-hidden"
            style={{
              borderColor: secondary + '60',
              background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
            }}
          >
            <img 
              src={`/escudos/${id}.png`}
              alt={team.name}
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://img.icons8.com/color/48/000000/football2.png';
              }}
            />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3 text-center md:text-left flex-1">
            <h1
              className="text-3xl md:text-5xl font-black drop-shadow-xl"
              style={{ color: isLight ? '#0f172a' : '#ffffff' }}
            >
              {team.name}
            </h1>
            {team.detailedProfile?.apodo && (
              <p 
                className="text-xs md:text-sm font-bold italic tracking-wide opacity-75 mt-0.5 leading-none"
                style={{ color: getReadableColor(secondary) }}
              >
                "{team.detailedProfile.apodo}"
              </p>
            )}

            <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-1">
              {profile.city && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  <MapPin className="w-3 h-3" style={{ color: getReadableColor(secondary) }} />
                  {profile.city}
                </span>
              )}
              {profile.stadium && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  🏟️ {profile.stadium}
                </span>
              )}
              {profile.capacity && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  <Users className="w-3 h-3 text-indigo-400" />
                  {profile.capacity.toLocaleString('es-ES')} cap.
                </span>
              )}
              {foundationYear && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  Fundado en {foundationYear}
                </span>
              )}
              {profile.manager && (
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    color: isLight ? '#334155' : '#cbd5e1',
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.40)',
                    borderColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  👔 {profile.manager}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs: Partidos vs Plantel ─── */}
      {team.detailedProfile && (
        <div className="flex gap-4 border-b border-white/5 pb-1 mb-4 select-none">
          <button
            onClick={() => setActiveTab('matches')}
            className={`pb-2 px-1 text-sm font-bold transition-all relative ${
              activeTab === 'matches'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚽ Partidos
          </button>
          <button
            onClick={() => setActiveTab('squad')}
            className={`pb-2 px-1 text-sm font-bold transition-all relative ${
              activeTab === 'squad'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 Plantel y Club
          </button>
        </div>
      )}

      {(activeTab === 'matches' || !team.detailedProfile) && (
        <>
          {/* ─── Próximos Partidos ─── */}
          {upcomingMatches.length > 0 && (
            <div className="flex flex-col gap-6 w-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 lg:p-10">
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <span className="text-xl">📅</span>
                <h3 className="text-base font-black text-slate-200 uppercase tracking-wider">Próximos Partidos</h3>
              </div>
              <div className="flex flex-col bg-[#0b1015]/60 border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                {upcomingMatches.map((match, idx) => {
                  const hName = match.homeTeam?.name || match.home_team?.name || 'Local';
                  const aName = match.awayTeam?.name || match.away_team?.name || 'Visitante';
                  const hId = match.homeTeam?.id || match.home_team?.id;
                  const aId = match.awayTeam?.id || match.away_team?.id;
                  const isHome = Number(hId) === Number(id);

                  const startDate = match.startTimestamp ? new Date(match.startTimestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
                  const startHour = match.startTimestamp ? new Date(match.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <div
                      key={match.id || match._id || idx}
                      onClick={() => router.push(`/match/${match.id || match._id}`)}
                      className="grid grid-cols-[60px_1fr_auto_1fr] items-center border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors px-2 md:px-4 py-3"
                    >
                      <div className="flex flex-col items-center justify-center border-r border-white/5 pr-2 md:pr-4 mr-1 md:mr-2">
                        <span className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1 text-center">{startDate}</span>
                        <span className="text-xs text-slate-300 font-semibold leading-none">{startHour}</span>
                      </div>
                      <div className={`text-right text-xs md:text-sm font-bold truncate flex-1 flex items-center justify-end gap-2 ${isHome ? 'text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]' : 'text-slate-100'}`}>
                        {hName}
                        <img
                          src={`/escudos/${hId}.png`}
                          alt={hName}
                          className="w-5 h-5 object-contain shrink-0"
                          onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = 'https://img.icons8.com/color/48/000000/football2.png'; }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-3 px-3 mx-2 rounded-lg bg-black/40 border border-white/5 shrink-0 py-1">
                        <span className="text-xs text-slate-400 font-bold">vs</span>
                      </div>
                      <div className={`text-left text-xs md:text-sm font-bold truncate flex-1 flex items-center gap-2 ${!isHome ? 'text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]' : 'text-slate-100'}`}>
                        <img
                          src={`/escudos/${aId}.png`}
                          alt={aName}
                          className="w-5 h-5 object-contain shrink-0"
                          onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = 'https://img.icons8.com/color/48/000000/football2.png'; }}
                        />
                        {aName}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Últimos Resultados ─── */}
          {recentMatches.length > 0 && (
            <div className="flex flex-col gap-6 w-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 lg:p-10">
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <span className="text-xl">🏆</span>
                <h3 className="text-base font-black text-slate-200 uppercase tracking-wider">Últimos Resultados</h3>
              </div>
              <div className="flex flex-col bg-[#0b1015]/60 border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                {recentMatches.map((match, idx) => {
                  const hScore = match.homeScore?.current ?? match.homeTeam?.score ?? match.home_team?.score;
                  const aScore = match.awayScore?.current ?? match.awayTeam?.score ?? match.away_team?.score;
                  const hName = match.homeTeam?.name || match.home_team?.name || 'Local';
                  const aName = match.awayTeam?.name || match.away_team?.name || 'Visitante';
                  const hId = match.homeTeam?.id || match.home_team?.id;
                  const aId = match.awayTeam?.id || match.away_team?.id;
                  const isHome = Number(hId) === Number(id);
                  const weScored = isHome ? hScore : aScore;
                  const theyScored = isHome ? aScore : hScore;
                  let resultColor = 'bg-slate-500/20 text-slate-300';
                  let resultLetter = '-';
                  
                  if (weScored !== undefined && theyScored !== undefined) {
                    if (Number(weScored) > Number(theyScored)) {
                       resultColor = 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold';
                       resultLetter = 'V';
                    }
                    else if (Number(weScored) < Number(theyScored)) {
                       resultColor = 'bg-red-500/20 border border-red-500/30 text-red-500 font-bold';
                       resultLetter = 'D';
                    }
                    else {
                       resultColor = 'bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold';
                       resultLetter = 'E';
                    }
                  }

                  const startDate = match.startTimestamp ? new Date(match.startTimestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
                  const startHour = match.startTimestamp ? new Date(match.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <div 
                      key={match.id || match._id || idx} 
                      onClick={() => router.push(`/match/${match.id || match._id}`)}
                      className="grid grid-cols-[60px_1fr_auto_1fr_30px] items-center border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors px-2 md:px-4 py-3"
                    >
                      <div className="flex flex-col items-center justify-center border-r border-white/5 pr-2 md:pr-4 mr-1 md:mr-2">
                        <span className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1 text-center">{startDate}</span>
                        <span className="text-xs text-slate-300 font-semibold leading-none">{startHour}</span>
                      </div>
                      <div className={`text-right text-xs md:text-sm font-bold truncate flex-1 flex items-center justify-end gap-2 ${isHome ? 'text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]' : 'text-slate-100'}`}>
                        {hName}
                        <img
                          src={`/escudos/${hId}.png`}
                          alt={hName}
                          className="w-5 h-5 object-contain shrink-0"
                          onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = 'https://img.icons8.com/color/48/000000/football2.png'; }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-3 px-3 mx-2 rounded-lg bg-black/40 border border-white/5 shrink-0 py-1">
                        <span className={`text-sm md:text-base font-black ${isHome ? 'text-emerald-400' : 'text-white'}`}>{hScore ?? '-'}</span>
                        <span className="text-xs text-slate-500">-</span>
                        <span className={`text-sm md:text-base font-black ${!isHome ? 'text-emerald-400' : 'text-white'}`}>{aScore ?? '-'}</span>
                      </div>
                      <div className={`text-left text-xs md:text-sm font-bold truncate flex-1 flex items-center gap-2 ${!isHome ? 'text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]' : 'text-slate-100'}`}>
                        <img
                          src={`/escudos/${aId}.png`}
                          alt={aName}
                          className="w-5 h-5 object-contain shrink-0"
                          onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = 'https://img.icons8.com/color/48/000000/football2.png'; }}
                        />
                        {aName}
                      </div>
                      <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs tracking-wider shrink-0 ml-1 md:ml-3 ${resultColor}`}>
                        {resultLetter}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recentMatches.length === 0 && upcomingMatches.length === 0 && (
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 flex flex-col items-center gap-4 text-slate-400">
              <div className="text-5xl opacity-30">⚽</div>
              <p className="text-sm font-medium">No hay partidos disponibles para este equipo.</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'squad' && team.detailedProfile && (
        <div className="flex flex-col gap-8 animate-fade-in">
          {/* 🏟️ Sección de Información del Club e Instalaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tarjeta de Información General del Club */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 lg:p-8 flex flex-col gap-5 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                <span className="text-xl">🛡️</span>
                <h3 className="text-base font-black text-slate-200 uppercase tracking-wider">Detalles del Club</h3>
              </div>
              <div className="flex flex-col gap-4">
                {team.detailedProfile.apodo && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-slate-400">Apodo</span>
                    <span className="text-sm font-bold text-white italic">"{team.detailedProfile.apodo}"</span>
                  </div>
                )}
                {team.detailedProfile.fundacion && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-slate-400">Fundado en</span>
                    <span className="text-sm font-bold text-white">{team.detailedProfile.fundacion}</span>
                  </div>
                )}
                {team.profile.city && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-slate-400">Ciudad de origen</span>
                    <span className="text-sm font-bold text-white">{team.profile.city}</span>
                  </div>
                )}
                {team.detailedProfile.manager && (
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-semibold text-slate-400">Director Técnico</span>
                    <span className="text-sm font-bold text-white">👔 {team.detailedProfile.manager}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tarjeta del Estadio */}
            {team.detailedProfile.stadium && (
              <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 lg:p-8 flex flex-col gap-5 shadow-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                  <span className="text-xl">🏟️</span>
                  <h3 className="text-base font-black text-slate-200 uppercase tracking-wider">Estadio Oficial</h3>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-slate-400">Nombre</span>
                    <span className="text-sm font-bold text-white">{team.detailedProfile.stadium.name}</span>
                  </div>
                  {team.detailedProfile.stadium.capacity && (
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-semibold text-slate-400">Capacidad</span>
                      <span className="text-sm font-bold text-white">
                        {parseInt(team.detailedProfile.stadium.capacity.replace(/,/g, ''), 10).toLocaleString('es-ES')} espectadores
                      </span>
                    </div>
                  )}
                  {team.detailedProfile.stadium.address && (
                    <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                      <span className="text-xs font-semibold text-slate-400">Ubicación / Dirección</span>
                      <span className="text-xs font-bold text-slate-300 leading-relaxed">{team.detailedProfile.stadium.address}</span>
                    </div>
                  )}
                  {team.detailedProfile.stadium.coordinates && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-slate-400">Coordenadas</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${team.detailedProfile.stadium.coordinates}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-black text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl transition-all"
                      >
                        📍 Ver en Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 👥 Plantel / Jugadores */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <span className="text-xl">👥</span>
              <h3 className="text-base font-black text-slate-200 uppercase tracking-wider">Plantel de Jugadores</h3>
            </div>
            
            {(() => {
              const positionsOrder = ['Dirección', 'Arqueros', 'Defensores', 'Mediocampistas', 'Delanteros'];
              const groupedPlayers: Record<string, any[]> = {};
              
              team.detailedProfile.squad.forEach((p: any) => {
                const pos = p.position || 'Otros';
                if (!groupedPlayers[pos]) groupedPlayers[pos] = [];
                groupedPlayers[pos].push(p);
              });

              const positionsToShow = positionsOrder.filter(pos => groupedPlayers[pos]?.length > 0);
              Object.keys(groupedPlayers).forEach(pos => {
                if (!positionsOrder.includes(pos) && groupedPlayers[pos]?.length > 0) {
                  positionsToShow.push(pos);
                }
              });

              return positionsToShow.map(position => (
                <div key={position} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm">
                  <h4 className="text-sm font-black text-slate-300 uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primary }} />
                    {position}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupedPlayers[position].map((player: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between gap-3 bg-black/25 rounded-2xl px-4 py-3 border border-white/5 hover:border-white/15 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 select-none shadow-sm"
                            style={{ backgroundColor: primary }}
                          >
                            {player.num || '—'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-slate-100 truncate">{player.name}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              {player.formation_position || (player.is_staff ? 'Cuerpo Técnico' : position.slice(0, -1))}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-xs shrink-0 font-medium">
                          {player.age && (
                            <span className="border-r border-white/5 pr-3">{player.age} años</span>
                          )}
                          {player.height && (
                            <span>{player.height}m</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
