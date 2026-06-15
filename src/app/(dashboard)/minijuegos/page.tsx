'use client';

import { useState, useEffect, useCallback } from 'react';
import ArmaEquipo, { FIELD_SLOTS } from './components/ArmaEquipo';
import type { Seleccion, Jugador } from './data/mundiales';

type Tab = 'inicio' | 'minijuegos';
type ActiveGame = null | 'arma-equipo';

/* ─── Champion persistence ──────────────────────────────── */
const LS_COUNT = 'vl_champion_count';
const LS_TEAM  = 'vl_last_champion';
const CHAMPION_ID = 9999;

interface SavedChampion {
  slots: Record<string, Jugador>;
  avg: number;
  date: string;
}

function buildChampionSeleccion(saved: SavedChampion): Seleccion {
  return {
    id: CHAMPION_ID,
    pais: '⭐ Tu Equipo',
    anio: 'Histórico',
    formacion: '4-3-3',
    bandera: '🏅',
    color: 'from-yellow-500 to-amber-600',
    jugadores: Object.values(saved.slots),
  };
}

function getRatingColor(rating: number) {
  if (rating >= 95) return 'text-yellow-400';
  if (rating >= 90) return 'text-emerald-400';
  if (rating >= 85) return 'text-sky-400';
  return 'text-white';
}

/* ─── Team Viewer Modal ─────────────────────────────────── */
function TeamViewerModal({
  champion,
  onClose,
}: {
  champion: SavedChampion;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-slate-900 border border-yellow-500/30 rounded-3xl p-6 shadow-2xl shadow-yellow-500/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-2xl font-black text-white">Último Equipo Campeón</h2>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-slate-400">
            <span>Media: <span className="text-yellow-400 font-bold">{champion.avg}</span></span>
            <span className="text-slate-700">•</span>
            <span>{champion.date}</span>
          </div>
        </div>

        {/* Players grid */}
        <div className="grid grid-cols-3 gap-2">
          {FIELD_SLOTS.map(slot => {
            const j = champion.slots[slot.key];
            if (!j) return <div key={slot.key} className="h-20 rounded-xl bg-slate-800/40 border border-slate-700/30 flex items-center justify-center text-slate-700 text-xs">{slot.label}</div>;
            return (
              <div
                key={slot.key}
                className="bg-gradient-to-b from-yellow-500/10 to-slate-800/60 border border-yellow-500/20 rounded-xl p-2.5 text-center"
              >
                <div className="text-[10px] text-slate-500 font-bold mb-1">{slot.label}</div>
                <div className={`text-xl font-black mb-0.5 ${getRatingColor(j.rating)}`}>{j.rating}</div>
                <div className="text-white text-[11px] font-semibold leading-tight truncate">{j.nombre}</div>
                <div className="text-slate-500 text-[9px] mt-0.5">{j.posicion}</div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:border-slate-500 transition text-sm font-semibold cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

/* ─── Champions Table ───────────────────────────────────── */
function ChampionsTable({
  count,
  lastChampion,
  onViewTeam,
}: {
  count: number;
  lastChampion: SavedChampion | null;
  onViewTeam: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="mt-10 px-4 max-w-5xl mx-auto">
      <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
        <span>🏆</span> Sala de la Fama
      </h3>
      <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-slate-900 overflow-hidden">
        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-yellow-500/10">
          <div className="p-6 text-center">
            <div className="text-4xl font-black text-yellow-400">{count}</div>
            <div className="text-slate-400 text-sm mt-1">
              {count === 1 ? 'vez Campeón' : 'veces Campeón'}
            </div>
          </div>
          <div className="p-6 text-center">
            <div className="text-4xl font-black text-emerald-400">
              {lastChampion ? lastChampion.avg : '--'}
            </div>
            <div className="text-slate-400 text-sm mt-1">Media del último equipo</div>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-2">
            {lastChampion ? (
              <>
                <div className="text-slate-500 text-xs">{lastChampion.date}</div>
                <button
                  onClick={onViewTeam}
                  className="px-4 py-2 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 text-sm font-bold hover:bg-yellow-500/25 transition cursor-pointer whitespace-nowrap"
                >
                  Ver equipo →
                </button>
              </>
            ) : (
              <div className="text-slate-600 text-sm">Sin datos</div>
            )}
          </div>
        </div>

        {/* Trophy row */}
        <div className="px-6 py-3 border-t border-yellow-500/10 bg-black/20 flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: Math.min(count, 20) }).map((_, i) => (
            <span key={i} className="text-yellow-400 text-lg shrink-0" title={`Campeonato #${i + 1}`}>🏆</span>
          ))}
          {count > 20 && (
            <span className="text-yellow-600 text-sm font-bold shrink-0">+{count - 20} más</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Inicio Component ──────────────────────────────────── */
function Inicio({
  onGoToMinijuegos,
  championCount,
}: {
  onGoToMinijuegos: () => void;
  championCount: number;
}) {
  return (
    <div className="relative overflow-hidden min-h-[80vh] flex flex-col items-center justify-center px-4 py-16">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 left-1/2 w-64 h-64 bg-indigo-500/6 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-3xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Portal de Minijuegos · Vacas Locas
          {championCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-black">
              🏆 ×{championCount}
            </span>
          )}
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
          Bienvenido al{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400">
            Gaming Hub
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Tu portal de minijuegos de fútbol. Draftea leyendas mundialistas, arma tu equipo perfecto y compite por la gloria del campeonato.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-10">
          {[
            { value: '39', label: 'Equipos mundialistas', icon: '🌍' },
            { value: '429+', label: 'Jugadores históricos', icon: '⚽' },
            { value: championCount > 0 ? String(championCount) : '∞', label: championCount > 0 ? 'veces Campeón' : 'Partidas únicas', icon: championCount > 0 ? '🏆' : '🎮' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 border border-white/8 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-slate-500 text-xs mt-1 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onGoToMinijuegos}
          className="group px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black text-lg hover:scale-105 transition-transform shadow-xl shadow-emerald-500/30 cursor-pointer mb-8"
        >
          🎮 Ver Minijuegos
          <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
        </button>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-3 justify-center">
          {['🏆 Sistema de Draft', '⚔️ Torneos Eliminatorios', '🎭 Modo Experto', '🌟 Selección Dorada'].map(feat => (
            <span
              key={feat}
              className="px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-sm"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Minijuegos Hub ────────────────────────────────────── */
function MinijuegosHub({
  onSelectGame,
  championCount,
  lastChampion,
  onViewTeam,
}: {
  onSelectGame: (g: ActiveGame) => void;
  championCount: number;
  lastChampion: SavedChampion | null;
  onViewTeam: () => void;
}) {
  return (
    <div className="px-4 py-10 max-w-5xl mx-auto">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-white mb-2">Minijuegos</h2>
        <p className="text-slate-400">Elegí tu juego y demostrá tu conocimiento futbolístico</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* ── ARMA TU EQUIPO — Featured ── */}
        <div className="group col-span-1 md:col-span-2 xl:col-span-1 relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-900/40 to-slate-900 hover:border-emerald-400/70 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.01]">
          {/* Pitch decoration */}
          <div className="relative h-40 overflow-hidden"
            style={{ background: 'repeating-linear-gradient(0deg, #166534 0px, #166534 18px, #15803d 18px, #15803d 36px)' }}
          >
            <div className="absolute inset-0">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/15" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/15" />
              <div className="absolute bottom-0 left-1/3 right-1/3 h-8 border-t border-l border-r border-white/10" />
            </div>
            <div className="absolute top-5 left-6 text-5xl">⚽</div>
            <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-emerald-400/25 border border-emerald-400/50 text-emerald-300 text-xs font-black uppercase tracking-wider">
              DISPONIBLE
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent" />
          </div>

          <div className="p-6 pt-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">
                Arma tu Equipo
              </h3>
              {championCount > 0 && (
                <span className="text-yellow-400 text-sm font-bold">🏆 ×{championCount}</span>
              )}
            </div>
            <p className="text-slate-400 text-sm mb-5 leading-relaxed">
              Draftea jugadores de los mejores equipos mundialistas, construye tu 11 ideal y compite desde Octavos hasta la Gran Final.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {['4-3-3', '11 Rondas', 'Octavos→Final', '39+ Equipos'].map(tag => (
                <span key={tag} className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
            {/* Big obvious CTA */}
            <button
              onClick={() => onSelectGame('arma-equipo')}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/40 cursor-pointer flex items-center justify-center gap-2"
            >
              ⚽ Jugar Ahora
            </button>
          </div>
        </div>

        {/* Coming soon cards */}
        {[
          { icon: '🎯', title: 'Adivina el Jugador', desc: 'Pistas progresivas hasta revelar la estrella oculta.', tags: ['Trivia', '11 vidas'] },
          { icon: '📋', title: 'Prode Express', desc: 'Predice resultados de partidos y acumula puntos.', tags: ['Predicciones', 'Ranking'] },
          { icon: '🃏', title: 'Colección de Figuritas', desc: 'Colecciona y completa tu álbum virtual de leyendas.', tags: ['Cards', 'Álbum'] },
        ].map(game => (
          <div
            key={game.title}
            className="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-slate-900/60 p-6 opacity-55 cursor-not-allowed"
          >
            <div className="text-4xl mb-4">{game.icon}</div>
            <h3 className="text-xl font-bold text-slate-400 mb-2">{game.title}</h3>
            <p className="text-slate-500 text-sm mb-4">{game.desc}</p>
            <div className="flex flex-wrap gap-2">
              {game.tags.map(tag => (
                <span key={tag} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-600 text-xs">{tag}</span>
              ))}
            </div>
            <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-slate-700/50 border border-slate-600/30 text-slate-500 text-xs font-bold uppercase tracking-wider">
              Próximamente
            </div>
          </div>
        ))}
      </div>

      {/* Champions Table */}
      <ChampionsTable
        count={championCount}
        lastChampion={lastChampion}
        onViewTeam={onViewTeam}
      />
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────── */
export default function MinijuegosPage() {
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  // Champion state
  const [championCount, setChampionCount] = useState(0);
  const [lastChampion, setLastChampion] = useState<SavedChampion | null>(null);
  const [championRivals, setChampionRivals] = useState<Seleccion[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const count = localStorage.getItem(LS_COUNT);
      if (count) setChampionCount(parseInt(count, 10));

      const raw = localStorage.getItem(LS_TEAM);
      if (raw) {
        const saved: SavedChampion = JSON.parse(raw);
        setLastChampion(saved);
        setChampionRivals([buildChampionSeleccion(saved)]);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleChampion = useCallback((slots: Record<string, Jugador | null>) => {
    try {
      const filtered: Record<string, Jugador> = {};
      for (const [k, v] of Object.entries(slots)) {
        if (v) filtered[k] = v;
      }
      const avg = Math.round(
        Object.values(filtered).reduce((s, j) => s + j.rating, 0) / Object.values(filtered).length
      );
      const date = new Date().toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
      const saved: SavedChampion = { slots: filtered, avg, date };

      const newCount = championCount + 1;
      setChampionCount(newCount);
      setLastChampion(saved);
      setChampionRivals([buildChampionSeleccion(saved)]);

      localStorage.setItem(LS_COUNT, String(newCount));
      localStorage.setItem(LS_TEAM, JSON.stringify(saved));
    } catch {
      // ignore storage errors
    }
  }, [championCount]);

  const handleSelectGame = (game: ActiveGame) => setActiveGame(game);
  const handleBackToHub = () => setActiveGame(null);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🎮</span>
            <span className="font-black text-white text-lg hidden sm:block">
              Vacas<span className="text-emerald-400">Locas</span>
            </span>
          </div>

          {/* Tabs (hidden when game is active) */}
          {!activeGame && (
            <div className="flex gap-1 ml-2">
              {(['inicio', 'minijuegos'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === tab
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab === 'inicio' ? '🏠 Inicio' : '🎮 Minijuegos'}
                </button>
              ))}
            </div>
          )}

          {/* Back button */}
          {activeGame && (
            <button
              onClick={handleBackToHub}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-slate-700"
            >
              ← Volver al Hub
            </button>
          )}

          <div className="flex-1" />

          {/* Champion badge in nav */}
          {championCount > 0 && (
            <button
              onClick={() => { setActiveTab('minijuegos'); setShowTeamModal(true); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-sm font-bold hover:bg-yellow-400/20 transition cursor-pointer"
              title="Ver último equipo campeón"
            >
              🏆 <span className="hidden sm:inline">×{championCount}</span>
            </button>
          )}

          {/* Active game label */}
          {activeGame === 'arma-equipo' && (
            <div className="text-emerald-400 font-bold text-sm hidden md:block">⚽ Arma tu Equipo</div>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto">
        {activeGame === 'arma-equipo' ? (
          <ArmaEquipo onChampion={handleChampion} championRivals={championRivals} />
        ) : activeTab === 'inicio' ? (
          <Inicio onGoToMinijuegos={() => setActiveTab('minijuegos')} championCount={championCount} />
        ) : (
          <MinijuegosHub
            onSelectGame={handleSelectGame}
            championCount={championCount}
            lastChampion={lastChampion}
            onViewTeam={() => setShowTeamModal(true)}
          />
        )}
      </main>

      {/* Team viewer modal */}
      {showTeamModal && lastChampion && (
        <TeamViewerModal champion={lastChampion} onClose={() => setShowTeamModal(false)} />
      )}
    </div>
  );
}
