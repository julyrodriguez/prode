'use client';

import { useState, useEffect, createContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { createPortal } from 'react-dom';
import { PrivateRoute } from '../providers';

export const DashboardContext = createContext<{
  setOverriddenLeagueId: (id: any | null) => void;
} | null>(null);

/* ── Theme Toggle Button ── */
function ThemeToggleBtn({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`
        relative flex items-center gap-2 border transition-all duration-150
        ${compact
          ? 'rounded-xl w-9 h-9 justify-center border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer'
          : 'rounded-2xl p-3 w-full border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-semibold overflow-hidden justify-start cursor-pointer'
        }
      `}
    >
      <span
        className={`transition-transform duration-200 ${compact ? 'text-base' : 'text-xl flex-shrink-0 w-6 text-center leading-none'}`}
        style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)' }}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
      {!compact && (
        <span className="md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
          {isDark ? 'Modo Claro' : 'Modo Oscuro'}
        </span>
      )}
    </button>
  );
}

/* ── Lite Toggle Button ── */
function LiteToggleBtn({ compact = false }: { compact?: boolean }) {
  const { isLite, toggleLite } = useTheme();
  const [showInfo, setShowInfo] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const switchElement = (
    <button
      onClick={toggleLite}
      title={isLite ? 'Cambiar a Versión Colorida (con animaciones y efectos)' : 'Cambiar a Versión Rápida (sin animaciones para máximo rendimiento)'}
      className={`
        relative flex items-center h-8 w-14 rounded-full p-1 cursor-pointer transition-colors duration-150 outline-none shrink-0
        ${isLite
          ? 'bg-amber-500/20 border border-amber-500/40'
          : 'bg-white/10 border border-white/20 hover:border-white/30'
        }
      `}
    >
      {/* Sliding Thumb */}
      <div
        className={`
          w-6 h-6 rounded-full shadow-md transform transition-transform duration-150 flex items-center justify-center text-xs select-none
          ${isLite ? 'translate-x-6 bg-amber-400' : 'translate-x-0 bg-white'}
        `}
      >
        {isLite ? '⚡' : '✨'}
      </div>
    </button>
  );

  const infoModal = showInfo && hasMounted && createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-modal-fade-in"
      onClick={() => setShowInfo(false)}
    >
      <div
        className="bg-[#0f172a] border border-white/10 rounded-[2rem] p-7 max-w-sm w-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-slate-200 relative animate-modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowInfo(false)}
          className="absolute top-5 right-6 text-slate-400 hover:text-white text-lg font-bold transition-colors cursor-pointer"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          ℹ️ Versiones de la Página
        </h3>
        <div className="flex flex-col gap-4 text-sm leading-relaxed">
          <div>
            <span className="font-bold text-amber-400 flex items-center gap-1.5">⚡ Versión Rápida (LITE)</span>
            <p className="text-slate-300 mt-1 text-xs">Desactiva todas las animaciones, transiciones, efectos y fondos con difuminados pesados. Optimiza la velocidad de carga y ahorra batería/procesador.</p>
          </div>
          <hr className="border-white/5" />
          <div>
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">✨ Versión Colorida</span>
            <p className="text-slate-300 mt-1 text-xs">Activa la interfaz premium completa con fondos animados y fluidos (efectos de humo y gradientes) y transiciones animadas.</p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(false)}
          className="mt-6 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>,
    document.body
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        {switchElement}
        <button
          onClick={() => setShowInfo(true)}
          title="Ver información de versiones"
          className="text-slate-400 hover:text-white text-xs w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 shrink-0 cursor-pointer"
        >
          ℹ️
        </button>
        {infoModal}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 w-full border border-white/10 bg-white/5 text-slate-300 rounded-2xl text-sm font-semibold select-none">
      <div className="flex items-center gap-2">
        <span className="md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
          {isLite ? 'Versión Rápida' : 'Versión Colorida'}
        </span>
        <button
          onClick={() => setShowInfo(true)}
          title="Ver información de versiones"
          className="text-slate-400 hover:text-white transition-colors duration-150 shrink-0 md:opacity-0 md:group-hover:opacity-100 opacity-100 cursor-pointer"
        >
          ℹ️
        </button>
      </div>
      {switchElement}
      {infoModal}
    </div>
  );
}

export const LEAGUES = [
  { id: 'mundial', name: 'Mundial', icon: '🌍', tournamentId: 16 },
  { id: 'general', name: 'General', icon: '🌐', tournamentId: null },
  { id: 'liga-arg', name: 'Liga Argentina', icon: '🇦🇷', tournamentId: 155 },
  { id: 'brasileirao', name: 'Brasileirao', icon: '🇧🇷', tournamentId: 325 },
  { id: 'champions', name: 'Champions League', icon: '⭐', tournamentId: 7 },
  { id: 'libertadores', name: 'Copa Libertadores', icon: '🏆', tournamentId: 384 },
  { id: 'primera-nacional', name: 'Primera Nacional', icon: '🇦🇷', tournamentId: 10001 },
  { id: 'primera-b-metro', name: 'Primera B Metro', icon: '🇦🇷', tournamentId: 10002 },
  { id: 'federal-a', name: 'Federal A', icon: '🇦🇷', tournamentId: 10003 },
  { id: 'primera-c', name: 'Primera C', icon: '🇦🇷', tournamentId: 10004 },
  { id: 'copa-arg', name: 'Copa Argentina', icon: '🏆', tournamentId: 10005 },
  { id: 'mls', name: 'MLS', icon: '🇺🇸', tournamentId: 10006 },
  { id: 'premier-league', name: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tournamentId: 10007 },
  { id: 'laliga', name: 'La Liga', icon: '🇪🇸', tournamentId: 10008 },
  { id: 'serie-a', name: 'Serie A', icon: '🇮🇹', tournamentId: 10009 },
  { id: 'ligue-1', name: 'Ligue 1', icon: '🇫🇷', tournamentId: 10010 },
  { id: 'bundesliga', name: 'Bundesliga', icon: '🇩🇪', tournamentId: 10011 },
] as const;

export type LeagueId = typeof LEAGUES[number]['id'];

const LEAGUE_TABS = [
  { id: 'partidos', label: 'Partidos', icon: '⚽' },
  { id: 'predicciones', label: 'Predicciones', icon: '🔮' },
  { id: 'tabla', label: 'Tabla', icon: '📊' },
  { id: 'posiciones', label: 'Posiciones', icon: '🏅' },
] as const;

// General tab items
const GENERAL_TABS = [
  { id: 'partidos', label: 'Partidos', path: '/general', icon: '⚽' },
  { id: 'minijuegos', label: 'Juegos', path: '/liga/mundial/minijuegos', icon: '🎮' },
  { id: 'ranking', label: 'Ranking', path: '/ranking', icon: '🏅' },
  { id: 'estadisticas', label: 'Estadísticas', path: '/stats', icon: '📊' },
  { id: 'jugadores', label: 'Jugadores', path: '/jugadores', icon: '🏃‍♂️' },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const handleLogout = () => signOut(auth);

  const [overriddenLeagueId, setOverriddenLeagueId] = useState<LeagueId | null>(null);

  useEffect(() => {
    const isOverridePage =
      pathname.startsWith('/match/') ||
      pathname.startsWith('/team/') ||
      pathname.startsWith('/predictions/');

    if (!isOverridePage) {
      setOverriddenLeagueId(null);
    }
  }, [pathname]);

  // Detect if we're on a league sub-route
  const leagueMatch = pathname.match(/^\/liga\/([^/]+)\/?(.+)?$/);
  const activeLeagueId = overriddenLeagueId || (leagueMatch ? leagueMatch[1] as LeagueId : 'general');
  const activeTabId = leagueMatch ? (leagueMatch[2]?.split('/')[0] || 'partidos') : null;

  const isMatchDetail = pathname.startsWith('/match/') || pathname.startsWith('/team/');
  const isCS2 = false;
  const isGeneralSection = activeLeagueId === 'general' || !leagueMatch;

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const argentineIds = ['liga-arg', 'primera-nacional', 'primera-b-metro', 'federal-a', 'primera-c', 'copa-arg'];
  const copasIds = ['champions', 'libertadores'];
  const ligasIds = ['brasileirao', 'mls', 'premier-league', 'laliga', 'serie-a', 'ligue-1', 'bundesliga'];

  const isArgActive = argentineIds.includes(activeLeagueId);
  const isCopasActive = copasIds.includes(activeLeagueId);
  const isLigasActive = ligasIds.includes(activeLeagueId);

  const [argentinaMenuOpen, setArgentinaMenuOpen] = useState(isArgActive);
  const [copasMenuOpen, setCopasMenuOpen] = useState(isCopasActive);
  const [ligasMenuOpen, setLigasMenuOpen] = useState(isLigasActive);

  useEffect(() => {
    setArgentinaMenuOpen(isArgActive);
    setCopasMenuOpen(isCopasActive);
    setLigasMenuOpen(isLigasActive);
  }, [activeLeagueId, isArgActive, isCopasActive, isLigasActive]);

  const rawLeagueTabs = activeLeagueId === 'mundial'
    ? [...LEAGUE_TABS, { id: 'simulacion', label: 'Simulación', icon: '🪄' } as const, { id: 'minijuegos', label: 'Minijuegos', icon: '🎮' } as const]
    : [...LEAGUE_TABS, { id: 'minijuegos', label: 'Minijuegos', icon: '🎮' } as const];

  const currentLeagueTabs = rawLeagueTabs.filter(tab => {
    if (!user) {
      if (tab.id === 'predicciones' || tab.id === 'posiciones' || tab.id === 'simulacion' || tab.id === 'minijuegos') {
        return false;
      }
    }
    return true;
  });

  const activeLeague = LEAGUES.find(l => l.id === activeLeagueId) || LEAGUES.find(l => l.id === 'general') || LEAGUES[0];

  const handleLeagueSelect = (leagueId: string) => {
    if (leagueId === 'general') {
      router.push('/general');
    } else {
      router.push(`/liga/${leagueId}/partidos`);
    }
    setMobileSidebarOpen(false);
  };

  const handleTabSelect = (tabId: string) => {
    if (tabId === 'minijuegos') {
      router.push('/liga/mundial/minijuegos');
      return;
    }
    if (activeLeagueId && !isGeneralSection) {
      router.push(`/liga/${activeLeagueId}/${tabId}`);
    }
  };

  // For general section: detect active general tab
  const generalTabActive = isGeneralSection
    ? (pathname === '/ranking' ? 'ranking'
      : pathname === '/stats' ? 'estadisticas'
        : pathname === '/jugadores' ? 'jugadores'
          : 'partidos')
    : null;

  return (
    <PrivateRoute>
      <div 
        className="h-screen w-full font-sans selection:bg-emerald-500/30 overflow-hidden flex" 
        data-league={activeLeagueId}
        style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', transition: 'background-color 0.15s ease, color 0.15s ease' }}
      >

      {/* ── GLOW BACKGROUND ── */}
      <div className="mundial-smoke-container">
        <div className={`mundial-smoke-bg-image ${activeTabId === 'posiciones' ? 'is-static' : ''}`} />
      </div>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 backdrop-blur-sm z-40"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── LEFT SIDEBAR (desktop: always visible; mobile: slide-in) ── */}
      <aside
        className={`
          fixed md:relative top-0 left-0 h-full
          flex flex-col
          w-72 md:w-20 md:hover:w-72
          transition-all duration-150 ease-out
          bg-black/60 backdrop-blur-xl border-r border-white/5
          z-50 group
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-start px-5 transition-all duration-150 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-lg text-slate-50 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex-shrink-0">
            VL
          </div>
          <span className="ml-4 font-bold text-xl tracking-tight md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
            Vacas Locas
          </span>
        </div>

        {/* League Navigation */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
          {LEAGUES.map((league) => {
            if ((league.id as string) === 'cs2' && !user) {
              return null;
            }

            // Saltear ligas agrupadas del flujo principal
            if ([
              'primera-nacional', 'primera-b-metro', 'federal-a', 'primera-c', 'copa-arg',
              'champions', 'libertadores',
              'brasileirao', 'mls', 'premier-league', 'laliga', 'serie-a', 'ligue-1', 'bundesliga'
            ].includes(league.id)) {
              return null;
            }

            if (league.id === 'liga-arg') {
              return (
                <div key="grouped-menus" className="flex flex-col w-full gap-1 shrink-0">
                  {/* Argentina Group */}
                  <div key="argentina-group" className="flex flex-col w-full">
                    <button
                      onClick={() => setArgentinaMenuOpen(!argentinaMenuOpen)}
                      className={`
                        flex items-center p-3 rounded-2xl transition-all duration-100 w-full text-left cursor-pointer
                        ${isArgActive
                          ? 'bg-white/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <span className="text-xl flex-shrink-0 w-6 text-center leading-none">🇦🇷</span>
                      <span className="ml-4 font-semibold text-sm md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
                        Argentina
                      </span>
                      <span className={`ml-auto text-[10px] transition-transform duration-200 md:opacity-0 md:group-hover:opacity-100 opacity-100 ${argentinaMenuOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {argentinaMenuOpen && (
                      <div className="pl-4 ml-6 border-l border-white/10 flex flex-col gap-1 mt-1">
                        {LEAGUES.filter(l => ['liga-arg', 'primera-nacional', 'primera-b-metro', 'federal-a', 'primera-c', 'copa-arg'].includes(l.id)).map(subLeague => {
                          const isSubActive = subLeague.id === activeLeagueId;
                          const displayName = subLeague.id === 'liga-arg' ? 'Liga Profesional' : subLeague.name;
                          return (
                            <Link
                              key={subLeague.id}
                              href={`/liga/${subLeague.id}/partidos`}
                              onClick={() => setMobileSidebarOpen(false)}
                              className={`
                                flex items-center p-2 rounded-xl text-xs font-semibold transition-all duration-100 cursor-pointer
                                ${isSubActive
                                  ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-[inset_0_1px_1px_rgba(16,185,129,0.05)]'
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                              `}
                            >
                              <span className="mr-2 text-base flex-shrink-0">{subLeague.icon}</span>
                              <span className="md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
                                {displayName}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Copas Internacionales Group */}
                  <div key="copas-group" className="flex flex-col w-full mt-1">
                    <button
                      onClick={() => setCopasMenuOpen(!copasMenuOpen)}
                      className={`
                        flex items-center p-3 rounded-2xl transition-all duration-100 w-full text-left cursor-pointer
                        ${isCopasActive
                          ? 'bg-white/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <span className="text-xl flex-shrink-0 w-6 text-center leading-none">🏆</span>
                      <span className="ml-4 font-semibold text-sm md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
                        Copas internacionales
                      </span>
                      <span className={`ml-auto text-[10px] transition-transform duration-200 md:opacity-0 md:group-hover:opacity-100 opacity-100 ${copasMenuOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {copasMenuOpen && (
                      <div className="pl-4 ml-6 border-l border-white/10 flex flex-col gap-1 mt-1">
                        {LEAGUES.filter(l => copasIds.includes(l.id)).map(subLeague => {
                          const isSubActive = subLeague.id === activeLeagueId;
                          return (
                            <Link
                              key={subLeague.id}
                              href={`/liga/${subLeague.id}/partidos`}
                              onClick={() => setMobileSidebarOpen(false)}
                              className={`
                                flex items-center p-2 rounded-xl text-xs font-semibold transition-all duration-100 cursor-pointer
                                ${isSubActive
                                  ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-[inset_0_1px_1px_rgba(16,185,129,0.05)]'
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                              `}
                            >
                              <span className="mr-2 text-base flex-shrink-0">{subLeague.icon}</span>
                              <span className="md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
                                {subLeague.name}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Ligas Internacionales Group */}
                  <div key="ligas-group" className="flex flex-col w-full mt-1">
                    <button
                      onClick={() => setLigasMenuOpen(!ligasMenuOpen)}
                      className={`
                        flex items-center p-3 rounded-2xl transition-all duration-100 w-full text-left cursor-pointer
                        ${isLigasActive
                          ? 'bg-white/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <span className="text-xl flex-shrink-0 w-6 text-center leading-none">🌐</span>
                      <span className="ml-4 font-semibold text-sm md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
                        Ligas internacionales
                      </span>
                      <span className={`ml-auto text-[10px] transition-transform duration-200 md:opacity-0 md:group-hover:opacity-100 opacity-100 ${ligasMenuOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {ligasMenuOpen && (
                      <div className="pl-4 ml-6 border-l border-white/10 flex flex-col gap-1 mt-1">
                        {LEAGUES.filter(l => ligasIds.includes(l.id)).map(subLeague => {
                          const isSubActive = subLeague.id === activeLeagueId;
                          return (
                            <Link
                              key={subLeague.id}
                              href={`/liga/${subLeague.id}/partidos`}
                              onClick={() => setMobileSidebarOpen(false)}
                              className={`
                                flex items-center p-2 rounded-xl text-xs font-semibold transition-all duration-100 cursor-pointer
                                ${isSubActive
                                  ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-[inset_0_1px_1px_rgba(16,185,129,0.05)]'
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                              `}
                            >
                              <span className="mr-2 text-base flex-shrink-0">{subLeague.icon}</span>
                              <span className="md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
                                {subLeague.name}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const isActive = (league.id as string) === 'cs2'
              ? isCS2
              : (league.id === activeLeagueId || (league.id === 'general' && isGeneralSection && !isCS2));
            return (
              <Link
                key={league.id}
                href={
                  league.id === 'general'
                    ? '/general'
                    : (league.id as string) === 'cs2'
                      ? '/cs2'
                      : `/liga/${league.id}/partidos`
                }
                onClick={() => setMobileSidebarOpen(false)}
                className={`
                  flex items-center p-3 rounded-2xl transition-all duration-100 w-full text-left cursor-pointer shrink-0
                  ${league.id === 'mundial'
                    ? `mundial-menu-item ${isActive ? 'active-mundial' : ''}`
                    : isActive && (league.id as string) === 'cs2'
                      ? 'bg-amber-500/15 text-amber-400 shadow-[inset_0_1px_1px_rgba(245,158,11,0.1)]'
                      : isActive
                        ? 'bg-white/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <span className={`text-xl flex-shrink-0 w-6 text-center leading-none ${league.id === 'mundial' ? 'mundial-icon' : ''}`}>{league.icon}</span>
                <span className="ml-4 font-semibold text-sm md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 whitespace-nowrap">
                  {league.name}
                </span>
                {isActive && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 flex-shrink-0 ${league.id === 'mundial' ? 'bg-amber-400' : (league.id as string) === 'cs2' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme & Lite Toggles (Mobile only) */}
        <div className="px-3 mb-2 shrink-0 md:hidden flex flex-col gap-2">
          <ThemeToggleBtn />
          <LiteToggleBtn />
        </div>

        {/* User info at bottom */}
        <div className="px-3 py-4 border-t border-white/5 shrink-0">
          {user ? (
            <div className="flex items-center gap-3 p-3">
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg flex-shrink-0 overflow-hidden">
                <span className="absolute z-0">{user.email?.[0].toUpperCase()}</span>
                <img
                  src={`https://apivacas.jariel.com.ar/users/${user.uid}.webp?v=${user.photoURL || '1'}`}
                  alt={user.displayName || 'Avatar'}
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div className="flex flex-col min-w-0 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150">
                <span className="text-white text-sm font-bold truncate">{user.displayName || user.email?.split('@')[0]}</span>
                <div className="flex items-center gap-2">
                  <Link href="/perfil" className="text-[10px] text-emerald-400 hover:text-emerald-300 text-left transition-colors duration-100" onClick={() => setMobileSidebarOpen(false)}>Editar Perfil</Link>
                  <span className="opacity-30" style={{ color: 'var(--text-muted)' }}>|</span>
                  <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 text-left transition-colors duration-100 cursor-pointer">
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition duration-150 cursor-pointer text-emerald-400 hover:text-emerald-300 w-full"
            >
              <div className="w-9 h-9 rounded-full border border-emerald-500/30 flex items-center justify-center bg-black/40 text-emerald-400 font-bold flex-shrink-0">
                🔑
              </div>
              <span className="text-sm font-bold md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150">
                Iniciar Sesión
              </span>
            </Link>
          )}
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <main className="flex-1 flex flex-col h-full relative z-10 w-full overflow-hidden min-w-0">

        {/* ── TOP HEADER ── */}
        {!isMatchDetail && (
          <header className="h-16 flex items-center justify-between px-4 sm:px-6 z-40 relative gap-3 border-b border-white/[0.04] bg-black/20 backdrop-blur-sm shrink-0">

            {/* Mobile: Hamburger + Logo */}
            <div className="flex items-center gap-3 md:hidden">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition text-slate-300 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="font-bold text-sm text-emerald-400">{activeLeague.name}</span>
            </div>

            {/* Desktop: League name breadcrumb */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xl">{activeLeague.icon}</span>
              <span className="font-bold text-white">{activeLeague.name}</span>
            </div>

            {/* CENTER: Sub-tabs (for league sections, NOT CS2) */}
            {!isGeneralSection && !isCS2 && (
              <div className="hidden md:flex items-center bg-black/40 p-1 rounded-xl border border-white/5 gap-0.5">
                {currentLeagueTabs.map((tab) => {
                  const isTabActive = activeTabId === tab.id;
                  const href = tab.id === 'minijuegos'
                    ? '/liga/mundial/minijuegos'
                    : `/liga/${activeLeagueId}/${tab.id}`;
                  return (
                    <Link
                      key={tab.id}
                      href={href}
                      className={`
                        px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-100 whitespace-nowrap cursor-pointer
                        ${isTabActive
                          ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)] border border-emerald-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <span className="mr-1.5 hidden sm:inline">{tab.icon}</span>
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* General section: show tab selector */}
            {isGeneralSection && (
              <div className="hidden md:flex items-center bg-black/40 p-1 rounded-xl border border-white/5 gap-0.5">
                {GENERAL_TABS.filter((tab) => {
                  if (!user) {
                    if (tab.id === 'ranking' || tab.id === 'estadisticas' || tab.id === 'minijuegos') return false;
                  }
                  return true;
                }).map((tab) => {
                  const isTabActive = generalTabActive === tab.id;
                  return (
                    <Link
                      key={tab.id}
                      href={tab.path}
                      className={`
                        px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-100 whitespace-nowrap flex items-center gap-1.5
                        ${isTabActive
                          ? 'bg-white/10 text-white shadow-sm border border-white/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <span className="hidden sm:inline">{tab.icon}</span>
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* RIGHT: Theme toggle + Lite toggle + User avatar */}
            <div className="flex items-center gap-3">
              <LiteToggleBtn compact />
              <ThemeToggleBtn compact />
              <div className="hidden md:block">
                {user ? (
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/perfil')}>
                    <span className="text-white text-sm font-bold hidden lg:block hover:text-emerald-400 transition-colors duration-100">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <div className="relative w-9 h-9 rounded-full border border-white/20 bg-gradient-to-r from-emerald-400 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg overflow-hidden hover:border-emerald-400 transition-colors duration-100">
                      <span className="absolute z-0">{user.email?.[0].toUpperCase()}</span>
                      <img
                        src={`https://apivacas.jariel.com.ar/users/${user.uid}.webp?v=${user.photoURL || '1'}`}
                        alt={user.displayName || 'Avatar'}
                        className="w-full h-full object-cover relative z-10"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition duration-150 shadow-md shadow-emerald-500/20 cursor-pointer whitespace-nowrap"
                  >
                    Iniciar Sesión
                  </Link>
                )}
              </div>
            </div>
          </header>
        )}

        {/* ── PAGE CONTENT ── */}
        <div className={`flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 relative ${isMatchDetail ? 'pb-8' : 'pb-24 md:pb-8'}`}>
          <div className="max-w-7xl mx-auto py-6">
            <DashboardContext.Provider value={{ setOverriddenLeagueId }}>
              {children}
            </DashboardContext.Provider>
          </div>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        {!isMatchDetail && (
          <div
            className="md:hidden fixed bottom-4 left-4 right-4 z-50 backdrop-blur-xl border rounded-2xl h-16 flex items-center justify-between px-2 shadow-lg"
            style={{
              backgroundColor: 'var(--bg-bottom-nav)',
              borderColor: 'var(--border)'
            }}
          >
            {isCS2 ? (
              <button
                className={`flex flex-col items-center justify-center py-2 rounded-xl flex-1 transition-all duration-100 text-amber-500 font-bold bg-amber-500/10 cursor-pointer`}
              >
                <span className="text-xl mb-1">🔫</span>
                <span className="text-[10px] leading-none tracking-wide">CS2</span>
              </button>
            ) : (
              (() => {
                const isPartidosActive = isGeneralSection
                  ? (generalTabActive === 'partidos')
                  : (activeTabId === 'partidos' || !activeTabId);

                const rawLeftItems = isGeneralSection
                  ? [
                      { id: 'minijuegos', label: 'Juegos', icon: '🎮', path: '/liga/mundial/minijuegos' },
                      { id: 'mundial', label: 'Mundial', icon: '🌍', path: '/liga/mundial/partidos' }
                    ]
                  : [
                      { id: 'minijuegos', label: 'Juegos', icon: '🎮' },
                      { id: 'predicciones', label: 'Predicciones', icon: '🔮' }
                    ];

                const leftItems = rawLeftItems.filter(item => {
                  if (!user && (item.id === 'predicciones' || item.id === 'minijuegos')) return false;
                  return true;
                });

                const rawRightItems = isGeneralSection
                  ? [
                      { id: 'ranking', label: 'Ranking', icon: '🏅', path: '/ranking' },
                      { id: 'estadisticas', label: 'Estadísticas', icon: '📊', path: '/stats' }
                    ]
                  : [
                      { id: 'tabla', label: 'Tabla', icon: '📊' },
                      { id: 'posiciones', label: 'Posiciones', icon: '🏅' }
                    ];

                const rightItems = rawRightItems.filter(item => {
                  if (!user && ['posiciones', 'ranking', 'estadisticas'].includes(item.id)) return false;
                  return true;
                });

                return (
                  <>
                    {/* Left section */}
                    <div className="flex-1 flex items-center justify-around gap-1 px-1 min-w-0">
                      {leftItems.map((tab) => {
                        const isActive = isGeneralSection
                          ? (generalTabActive === tab.id)
                          : (activeTabId === tab.id);

                        const href = isGeneralSection && 'path' in tab
                          ? tab.path
                          : tab.id === 'minijuegos'
                            ? '/liga/mundial/minijuegos'
                            : `/liga/${activeLeagueId}/${tab.id}`;

                        return (
                          <Link
                            key={tab.id}
                            href={href}
                            className={`
                              flex flex-col items-center justify-center py-1 rounded-xl flex-1 min-w-[50px] max-w-[72px] transition-all duration-100 cursor-pointer
                              ${isActive ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-400 hover:text-white'}
                            `}
                          >
                            <span className="text-lg mb-0.5">{tab.icon}</span>
                            <span className="text-[9px] leading-none tracking-wide text-center truncate w-full">{tab.label}</span>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Center section (Protruding button) */}
                    <div className="w-16 flex-shrink-0 relative h-12 flex items-center justify-center">
                      <Link
                        href={isGeneralSection ? '/general' : `/liga/${activeLeagueId}/partidos`}
                        className={`
                          absolute -top-7 w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-lg transition-all duration-200 active:scale-90 cursor-pointer
                          ${isPartidosActive
                            ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                            : theme === 'dark'
                              ? 'bg-slate-800 text-slate-300 shadow-md hover:bg-slate-700'
                              : 'bg-slate-200 text-slate-700 shadow-sm hover:bg-slate-300'
                          }
                        `}
                        style={{ borderColor: 'var(--bg-bottom-nav)' }}
                      >
                        <span className="text-3xl">⚽</span>
                      </Link>
                    </div>

                    {/* Right section */}
                    <div className="flex-1 flex items-center justify-around gap-1 px-1 min-w-0">
                      {rightItems.map((tab) => {
                        const isActive = isGeneralSection
                          ? (generalTabActive === tab.id)
                          : (activeTabId === tab.id);

                        const href = isGeneralSection && 'path' in tab
                          ? tab.path
                          : tab.id === 'minijuegos'
                            ? '/liga/mundial/minijuegos'
                            : `/liga/${activeLeagueId}/${tab.id}`;

                        return (
                          <Link
                            key={tab.id}
                            href={href}
                            className={`
                              flex flex-col items-center justify-center py-1 rounded-xl flex-1 min-w-[50px] max-w-[72px] transition-all duration-100 cursor-pointer
                              ${isActive ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-400 hover:text-white'}
                            `}
                          >
                            <span className="text-lg mb-0.5">{tab.icon}</span>
                            <span className="text-[9px] leading-none tracking-wide text-center truncate w-full">{tab.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                );
              })()
            )}
          </div>
        )}

      </main>
    </div>
    </PrivateRoute>
  );
}
