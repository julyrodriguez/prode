import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { createPortal } from 'react-dom';

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
          ? 'rounded-xl w-9 h-9 justify-center border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
          : 'rounded-2xl p-3 w-full border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-semibold overflow-hidden justify-start'
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

  const infoModal = showInfo && createPortal(
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
          className="absolute top-5 right-6 text-slate-400 hover:text-white text-lg font-bold transition-colors"
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
          className="mt-6 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
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
          className="text-slate-400 hover:text-white text-xs w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 shrink-0"
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
          className="text-slate-400 hover:text-white transition-colors duration-150 shrink-0 md:opacity-0 md:group-hover:opacity-100 opacity-100"
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
  { id: 'cs2', name: 'CS2 Premier', icon: '🔫', tournamentId: null },
  { id: 'liga-arg', name: 'Liga Argentina', icon: '🇦🇷', tournamentId: 155 },
  { id: 'brasileirao', name: 'Brasileirao', icon: '🇧🇷', tournamentId: 325 },
  { id: 'champions', name: 'Champions League', icon: '⭐', tournamentId: 7 },
  { id: 'libertadores', name: 'Copa Libertadores', icon: '🏆', tournamentId: 384 },
] as const;

export type LeagueId = typeof LEAGUES[number]['id'];

const LEAGUE_TABS = [
  { id: 'partidos', label: 'Partidos', icon: '⚽' },
  { id: 'predicciones', label: 'Predicciones', icon: '🔮' },
  { id: 'tabla', label: 'Tabla', icon: '📊' },
  { id: 'posiciones', label: 'Posiciones', icon: '🏅' },
] as const;

// General tab items (old behavior)
const GENERAL_TABS = [
  { id: 'partidos', label: 'Partidos', path: '/general', icon: '⚽' },
  { id: 'predicciones', label: 'Predicciones', path: '/predicciones', icon: '🔮' },
  { id: 'minijuegos', label: 'Juegos', path: '/liga/mundial/minijuegos', icon: '🎮' },
  { id: 'ranking', label: 'Ranking', path: '/ranking', icon: '🏅' },
  { id: 'estadisticas', label: 'Estadísticas', path: '/stats', icon: '📊' },
] as const;

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const handleLogout = () => signOut(auth);

  const [overriddenLeagueId, setOverriddenLeagueId] = useState<LeagueId | null>(null);

  useEffect(() => {
    setOverriddenLeagueId(null);
  }, [location.pathname]);

  // Detect if we're on a league sub-route
  const leagueMatch = location.pathname.match(/^\/liga\/([^/]+)\/?(.+)?$/);
  const activeLeagueId = overriddenLeagueId || (leagueMatch ? leagueMatch[1] as LeagueId : 'general');
  const activeTabId = leagueMatch ? (leagueMatch[2]?.split('/')[0] || 'partidos') : null;

  const isMatchDetail = location.pathname.startsWith('/match/') || location.pathname.startsWith('/team/') || location.pathname.startsWith('/cs2/player/');
  const isCS2 = location.pathname.startsWith('/cs2');
  const isGeneralSection = isCS2 ? false : (activeLeagueId === 'general' || !leagueMatch);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const currentLeagueTabs = activeLeagueId === 'mundial'
    ? [...LEAGUE_TABS, { id: 'simulacion', label: 'Simulación', icon: '🪄' } as const, { id: 'minijuegos', label: 'Minijuegos', icon: '🎮' } as const]
    : [...LEAGUE_TABS, { id: 'minijuegos', label: 'Minijuegos', icon: '🎮' } as const];

  const activeLeague = LEAGUES.find(l => {
    if (isCS2) return l.id === 'cs2';
    return l.id === activeLeagueId;
  }) || LEAGUES.find(l => l.id === 'general') || LEAGUES[0];

  const handleLeagueSelect = (leagueId: string) => {
    if (leagueId === 'general') {
      navigate('/general');
    } else if (leagueId === 'cs2') {
      navigate('/cs2');
    } else {
      navigate(`/liga/${leagueId}/partidos`);
    }
    setMobileSidebarOpen(false);
  };

  const handleTabSelect = (tabId: string) => {
    if (tabId === 'minijuegos') {
      navigate('/liga/mundial/minijuegos');
      return;
    }
    if (activeLeagueId && !isGeneralSection) {
      navigate(`/liga/${activeLeagueId}/${tabId}`);
    }
  };

  // For general section: detect active general tab
  const generalTabActive = isGeneralSection
    ? (location.pathname === '/ranking' ? 'ranking'
      : location.pathname === '/stats' ? 'estadisticas'
        : location.pathname === '/predicciones' ? 'predicciones'
          : 'partidos')
    : null;

  return (
    <div 
      className="h-screen w-full font-sans selection:bg-emerald-500/30 overflow-hidden flex" 
      data-league={activeLeagueId}
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', transition: 'background-color 0.15s ease, color 0.15s ease' }}
    >

      {/* ── GLOW BACKGROUND ── */}
      {activeLeagueId === 'mundial' && activeTabId !== 'minijuegos' ? (
        <div className="mundial-smoke-container">
          <div className={`mundial-smoke-bg-image ${activeTabId === 'posiciones' ? 'is-static' : ''}`} />
        </div>
      ) : (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vh] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vh] bg-emerald-600/10 rounded-full blur-[120px]" />
        </div>
      )}

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
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
            const isActive = league.id === 'cs2'
              ? isCS2
              : (league.id === activeLeagueId || (league.id === 'general' && isGeneralSection && !isCS2));
            return (
              <button
                key={league.id}
                onClick={() => handleLeagueSelect(league.id)}
                className={`
                  flex items-center p-3 rounded-2xl transition-all duration-100 w-full text-left
                  ${league.id === 'mundial'
                    ? `mundial-menu-item ${isActive ? 'active-mundial' : ''}`
                    : isActive && league.id === 'cs2'
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
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150 flex-shrink-0 ${league.id === 'mundial' ? 'bg-amber-400' : league.id === 'cs2' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                )}
              </button>
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
                  <NavLink to="/perfil" className="text-[10px] text-emerald-400 hover:text-emerald-300 text-left transition-colors duration-100" onClick={() => setMobileSidebarOpen(false)}>Editar Perfil</NavLink>
                  <span className="text-white/20">|</span>
                  <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 text-left transition-colors duration-100">
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-full border border-red-500/30 flex items-center justify-center bg-black/40 text-red-400 font-bold flex-shrink-0">
                ?
              </div>
              <span className="text-slate-400 text-sm font-medium md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-150">
                No autenticado
              </span>
            </div>
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
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition text-slate-300"
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
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSelect(tab.id)}
                      className={`
                        px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-100 whitespace-nowrap
                        ${isTabActive
                          ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)] border border-emerald-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <span className="mr-1.5 hidden sm:inline">{tab.icon}</span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* General section: show old-school tab selector */}
            {isGeneralSection && (
              <div className="hidden md:flex items-center bg-black/40 p-1 rounded-xl border border-white/5 gap-0.5">
                {GENERAL_TABS.map((tab) => {
                  const isTabActive = generalTabActive === tab.id;
                  return (
                    <NavLink
                      key={tab.id}
                      to={tab.path}
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
                    </NavLink>
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
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/perfil')}>
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
                  <div className="w-9 h-9 rounded-full border border-red-500/30 flex items-center justify-center bg-black/40 text-red-400 font-bold">
                    ?
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* ── PAGE CONTENT ── */}
        <div className={`flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 relative ${isMatchDetail ? 'pb-8' : 'pb-24 md:pb-8'}`}>
          <div className="max-w-7xl mx-auto py-6">
            <Outlet context={{ activeLeague, activeLeagueId, activeTabId, setOverriddenLeagueId }} />
          </div>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        {!isMatchDetail && (
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-[#121212]/65 backdrop-blur-xl border border-white/10 rounded-2xl h-16 flex items-center justify-between px-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
            {isCS2 ? (
              // CS2 Tab (only one for now, or just dummy to keep layout consistent)
              <button
                className={`flex flex-col items-center justify-center py-2 rounded-xl flex-1 transition-all duration-100 text-amber-500 font-bold bg-amber-500/10`}
              >
                <span className="text-xl mb-1">🔫</span>
                <span className="text-[10px] leading-none tracking-wide">CS2</span>
              </button>
            ) : (
              // General or League Nav with Protruding Matches button in center
              (() => {
                const isPartidosActive = isGeneralSection
                  ? (generalTabActive === 'partidos')
                  : (activeTabId === 'partidos' || !activeTabId);

                const leftItems = isGeneralSection
                  ? [
                      { id: 'minijuegos', label: 'Juegos', icon: '🎮', path: '/liga/mundial/minijuegos' },
                      { id: 'predicciones', label: 'Predicciones', icon: '🔮', path: '/predicciones' }
                    ]
                  : [
                      { id: 'minijuegos', label: 'Juegos', icon: '🎮' },
                      { id: 'predicciones', label: 'Predicciones', icon: '🔮' }
                    ];

                const rightItems = isGeneralSection
                  ? [
                      { id: 'ranking', label: 'Ranking', icon: '🏅', path: '/ranking' },
                      { id: 'estadisticas', label: 'Estadísticas', icon: '📊', path: '/stats' }
                    ]
                  : [
                      { id: 'tabla', label: 'Tabla', icon: '📊' },
                      { id: 'posiciones', label: 'Posiciones', icon: '🏅' }
                    ];

                return (
                  <>
                    {/* Left section (flexible space) */}
                    <div className="flex-1 flex items-center justify-around gap-1 px-1 min-w-0">
                      {leftItems.map((tab) => {
                        const isActive = isGeneralSection
                          ? (generalTabActive === tab.id)
                          : (activeTabId === tab.id);

                        const handleClick = () => {
                          if (isGeneralSection && 'path' in tab) {
                            navigate(tab.path);
                          } else {
                            handleTabSelect(tab.id);
                          }
                        };

                        return (
                          <button
                            key={tab.id}
                            onClick={handleClick}
                            className={`
                              flex flex-col items-center justify-center py-1 rounded-xl flex-1 min-w-[50px] max-w-[72px] transition-all duration-100
                              ${isActive ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-400 hover:text-white'}
                            `}
                          >
                            <span className="text-lg mb-0.5">{tab.icon}</span>
                            <span className="text-[9px] leading-none tracking-wide text-center truncate w-full">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Center section (fixed space for protruding button) */}
                    <div className="w-16 flex-shrink-0 relative h-12 flex items-center justify-center">
                      <button
                        onClick={() => {
                          if (isGeneralSection) {
                            navigate('/general');
                          } else {
                            navigate(`/liga/${activeLeagueId}/partidos`);
                          }
                        }}
                        className={`
                          absolute -top-7 w-16 h-16 rounded-full flex items-center justify-center border-4 border-[#121212] shadow-lg transition-all duration-200 active:scale-90
                          ${isPartidosActive
                            ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                            : 'bg-slate-800 text-slate-300 shadow-md hover:bg-slate-700'
                          }
                        `}
                      >
                        <span className="text-3xl">⚽</span>
                      </button>
                    </div>

                    {/* Right section (flexible space) */}
                    <div className="flex-1 flex items-center justify-around gap-1 px-1 min-w-0">
                      {rightItems.map((tab) => {
                        const isActive = isGeneralSection
                          ? (generalTabActive === tab.id)
                          : (activeTabId === tab.id);

                        const handleClick = () => {
                          if (isGeneralSection && 'path' in tab) {
                            navigate(tab.path);
                          } else {
                            handleTabSelect(tab.id);
                          }
                        };

                        return (
                          <button
                            key={tab.id}
                            onClick={handleClick}
                            className={`
                              flex flex-col items-center justify-center py-1 rounded-xl flex-1 min-w-[50px] max-w-[72px] transition-all duration-100
                              ${isActive ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-400 hover:text-white'}
                            `}
                          >
                            <span className="text-lg mb-0.5">{tab.icon}</span>
                            <span className="text-[9px] leading-none tracking-wide text-center truncate w-full">{tab.label}</span>
                          </button>
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
  );
}
