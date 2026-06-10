import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

/* ── Theme Toggle Button ── */
function ThemeToggleBtn({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`
        relative flex items-center gap-2 border transition-all duration-300
        ${compact
          ? 'rounded-xl w-9 h-9 justify-center border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
          : 'rounded-2xl p-3 w-full border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-semibold overflow-hidden justify-start'
        }
      `}
    >
      <span
        className={`transition-transform duration-500 ${compact ? 'text-base' : 'text-xl flex-shrink-0 w-6 text-center leading-none'}`}
        style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)' }}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
      {!compact && (
        <span className="md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity whitespace-nowrap">
          {isDark ? 'Modo Claro' : 'Modo Oscuro'}
        </span>
      )}
    </button>
  );
}

/* ── Lite Toggle Button ── */
function LiteToggleBtn({ compact = false }: { compact?: boolean }) {
  const { isLite, toggleLite } = useTheme();
  return (
    <button
      onClick={toggleLite}
      title={isLite ? 'Desactivar modo LITE' : 'Activar modo LITE (sin animaciones)'}
      className={`
        relative flex items-center gap-2 border transition-all duration-300
        ${compact
          ? 'rounded-xl w-9 h-9 justify-center'
          : 'rounded-2xl p-3 w-full text-sm font-semibold overflow-hidden justify-start'
        }
        ${isLite
          ? 'border-amber-500/35 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
          : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
        }
      `}
    >
      <span
        className={`transition-transform duration-500 ${compact ? 'text-base' : 'text-xl flex-shrink-0 w-6 text-center leading-none'}`}
        style={{ transform: isLite ? 'scale(1.15)' : 'scale(1)' }}
      >
        {isLite ? '⚡' : '✨'}
      </span>
      {!compact && (
        <span className="md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity whitespace-nowrap">
          {isLite ? 'Modo Normal' : 'Modo LITE'}
        </span>
      )}
    </button>
  );
}

export const LEAGUES = [
  { id: 'mundial', name: 'Mundial', icon: '🌍', tournamentId: 16 },
  { id: 'general', name: 'General', icon: '🌐', tournamentId: null },
  { id: 'jarielbet', name: 'JarielBet', icon: '🎰', tournamentId: null },
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

const JARIELBET_TABS = [
  { id: 'apuestas', label: 'Apuestas', icon: '🎰' },
  { id: 'historial', label: 'Historial', icon: '📋' },
  { id: 'pendientes', label: 'Pendientes', icon: '⏳' },
  { id: 'tabla', label: 'Tabla', icon: '🏆' },
] as const;

// General tab items (old behavior)
const GENERAL_TABS = [
  { id: 'partidos', label: 'Partidos', path: '/', icon: '⚽' },
  { id: 'predicciones', label: 'Predicciones', path: '/predicciones', icon: '🔮' },
  { id: 'ranking', label: 'Ranking', path: '/ranking', icon: '🏅' },
  { id: 'estadisticas', label: 'Estadísticas', path: '/stats', icon: '📊' },
] as const;

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const handleLogout = () => signOut(auth);

  // Detect if we're on a league sub-route
  const leagueMatch = location.pathname.match(/^\/liga\/([^/]+)\/?(.+)?$/);
  const activeLeagueId = leagueMatch ? leagueMatch[1] as LeagueId : 'general';
  const activeTabId = leagueMatch ? (leagueMatch[2]?.split('/')[0] || 'partidos') : null;

  const isMatchDetail = location.pathname.startsWith('/match/') || location.pathname.startsWith('/team/') || location.pathname.startsWith('/cs2/player/');
  const isJarielBet = location.pathname === '/jarielbet';
  const isCS2 = location.pathname.startsWith('/cs2');
  const query = new URLSearchParams(location.search);
  const activeJarielTab = isJarielBet ? (query.get('tab') || 'apuestas') : null;
  const isGeneralSection = isJarielBet || isCS2 ? false : (activeLeagueId === 'general' || !leagueMatch);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const currentLeagueTabs = activeLeagueId === 'mundial'
    ? [...LEAGUE_TABS, { id: 'minijuegos', label: 'Minijuegos', icon: '🎮' } as const]
    : LEAGUE_TABS;

  const activeLeague = LEAGUES.find(l => {
    if (isJarielBet) return l.id === 'jarielbet';
    if (isCS2) return l.id === 'cs2';
    return l.id === activeLeagueId;
  }) || LEAGUES.find(l => l.id === 'general') || LEAGUES[0];

  const handleLeagueSelect = (leagueId: string) => {
    if (leagueId === 'general') {
      navigate('/');
    } else if (leagueId === 'jarielbet') {
      navigate('/jarielbet');
    } else if (leagueId === 'cs2') {
      navigate('/cs2');
    } else {
      navigate(`/liga/${leagueId}/partidos`);
    }
    setMobileSidebarOpen(false);
  };

  const handleTabSelect = (tabId: string) => {
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
    <div className="h-screen w-full font-sans selection:bg-emerald-500/30 overflow-hidden flex" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', transition: 'background-color 0.28s ease, color 0.28s ease' }}>

      {/* ── GLOW BACKGROUND ── */}
      {activeLeagueId === 'mundial' && activeTabId !== 'minijuegos' ? (
        <div className="mundial-smoke-container">
          <div className="mundial-smoke-blob mundial-smoke-red" />
          <div className="mundial-smoke-blob mundial-smoke-green" />
          <div className="mundial-smoke-blob mundial-smoke-blue" />
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
          transition-all duration-300 ease-out
          bg-black/60 backdrop-blur-xl border-r border-white/5
          z-50 group
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-start px-5 transition-all shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-lg text-slate-50 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex-shrink-0">
            VL
          </div>
          <span className="ml-4 font-bold text-xl tracking-tight md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity whitespace-nowrap">
            Vacas Locas
          </span>
        </div>

        {/* League Navigation */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
          {LEAGUES.map((league) => {
            const isActive = league.id === 'jarielbet'
              ? isJarielBet
              : league.id === 'cs2'
                ? isCS2
                : (league.id === activeLeagueId || (league.id === 'general' && isGeneralSection && !isJarielBet && !isCS2));
            return (
              <button
                key={league.id}
                onClick={() => handleLeagueSelect(league.id)}
                className={`
                  flex items-center p-3 rounded-2xl transition-all duration-200 w-full text-left
                  ${league.id === 'mundial'
                    ? `mundial-menu-item ${isActive ? 'active-mundial' : ''}`
                    : isActive && (league.id === 'jarielbet' || league.id === 'cs2')
                      ? 'bg-amber-500/15 text-amber-400 shadow-[inset_0_1px_1px_rgba(245,158,11,0.1)]'
                      : isActive
                        ? 'bg-white/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <span className={`text-xl flex-shrink-0 w-6 text-center leading-none ${league.id === 'mundial' ? 'mundial-icon' : ''}`}>{league.icon}</span>
                <span className="ml-4 font-semibold text-sm md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity whitespace-nowrap">
                  {league.name}
                </span>
                {isActive && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity flex-shrink-0 ${league.id === 'mundial' ? 'bg-amber-400' : (league.id === 'jarielbet' || league.id === 'cs2') ? 'bg-amber-400' : 'bg-emerald-400'}`} />
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
              <div className="flex flex-col min-w-0 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                <span className="text-white text-sm font-bold truncate">{user.displayName || user.email?.split('@')[0]}</span>
                <div className="flex items-center gap-2">
                  <NavLink to="/perfil" className="text-[10px] text-emerald-400 hover:text-emerald-300 text-left" onClick={() => setMobileSidebarOpen(false)}>Editar Perfil</NavLink>
                  <span className="text-white/20">|</span>
                  <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 text-left">
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
              <span className="text-slate-400 text-sm font-medium md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
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

            {/* CENTER: Sub-tabs (for league sections, NOT JarielBet, NOT CS2) */}
            {!isGeneralSection && !isJarielBet && !isCS2 && (
              <div className="hidden md:flex items-center bg-black/40 p-1 rounded-xl border border-white/5 gap-0.5">
                {currentLeagueTabs.map((tab) => {
                  const isTabActive = activeTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSelect(tab.id)}
                      className={`
                        px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap
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
                        px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5
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
                    <span className="text-white text-sm font-bold hidden lg:block hover:text-emerald-400 transition-colors">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <div className="relative w-9 h-9 rounded-full border border-white/20 bg-gradient-to-r from-emerald-400 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg overflow-hidden hover:border-emerald-400 transition-colors">
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
            <Outlet context={{ activeLeague, activeLeagueId, activeTabId }} />
          </div>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        {!isMatchDetail && (
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 flex items-center justify-around shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
            {isJarielBet ? (
              // JarielBet Tabs
              JARIELBET_TABS.map((tab) => {
                const isActive = activeJarielTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigate(`/jarielbet?tab=${tab.id}`)}
                    className={`
                      flex flex-col items-center justify-center py-2 rounded-xl flex-1 transition-all
                      ${isActive ? 'text-amber-500 font-bold bg-amber-500/10' : 'text-slate-400 hover:text-white'}
                    `}
                  >
                    <span className="text-xl mb-1">{tab.icon}</span>
                    <span className="text-[10px] leading-none tracking-wide">{tab.label}</span>
                  </button>
                );
              })
            ) : isCS2 ? (
              // CS2 Tab (only one for now, or just dummy to keep layout consistent)
              <button
                className={`flex flex-col items-center justify-center py-2 rounded-xl flex-1 transition-all text-amber-500 font-bold bg-amber-500/10`}
              >
                <span className="text-xl mb-1">🔫</span>
                <span className="text-[10px] leading-none tracking-wide">CS2</span>
              </button>
            ) : !isGeneralSection ? (
              // League Tabs
              currentLeagueTabs.map((tab) => {
                const isTabActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSelect(tab.id)}
                    className={`
                      flex flex-col items-center justify-center py-2 rounded-xl flex-1 transition-all
                      ${isTabActive ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-400 hover:text-white'}
                    `}
                  >
                    <span className="text-xl mb-1">{tab.icon}</span>
                    <span className="text-[10px] leading-none tracking-wide">{tab.label}</span>
                  </button>
                );
              })
            ) : (
              // General Tabs
              GENERAL_TABS.map((tab) => {
                const isTabActive = generalTabActive === tab.id;
                return (
                  <NavLink
                    key={tab.id}
                    to={tab.path}
                    className={`
                      flex flex-col items-center justify-center py-2 rounded-xl flex-1 transition-all
                      ${isTabActive ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-400 hover:text-white'}
                    `}
                  >
                    <span className="text-xl mb-1">{tab.icon}</span>
                    <span className="text-[10px] leading-none tracking-wide">{tab.label}</span>
                  </NavLink>
                );
              })
            )}
          </div>
        )}

      </main>
    </div>
  );
}
