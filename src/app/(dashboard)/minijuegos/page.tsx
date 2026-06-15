'use client';

import { useState } from 'react';
import ArmaEquipo from './components/ArmaEquipo';

type Tab = 'inicio' | 'minijuegos';
type ActiveGame = null | 'arma-equipo';

/* ─── Inicio Component ─────────────────────────────────── */
function Inicio() {
  return (
    <div className="relative overflow-hidden min-h-[80vh] flex flex-col items-center justify-center px-4 py-16">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 left-1/2 w-64 h-64 bg-indigo-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-3xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Portal de Minijuegos · Vacas Locas
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
          Bienvenido al{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 animate-pulse">
            Gaming Hub
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Tu portal de minijuegos de fútbol. Draftea leyendas mundialistas, arma tu equipo perfecto y compite por la gloria del campeonato.
        </p>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-12">
          {[
            { value: '39', label: 'Equipos mundialistas', icon: '🌍' },
            { value: '429', label: 'Jugadores históricos', icon: '⚽' },
            { value: '∞', label: 'Partidas únicas', icon: '🎮' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 border border-white/8 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-slate-500 text-xs mt-1 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            '🏆 Sistema de Draft',
            '⚔️ Simulación de Torneos',
            '🎭 Modo Experto',
            '📊 Jugadores con Rating',
            '🌟 Selección Dorada',
          ].map(feat => (
            <span
              key={feat}
              className="px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-sm hover:border-emerald-500/50 hover:text-emerald-400 transition-colors cursor-default"
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
function MinijuegosHub({ onSelectGame }: { onSelectGame: (g: ActiveGame) => void }) {
  return (
    <div className="px-4 py-10 max-w-5xl mx-auto">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-white mb-2">Minijuegos</h2>
        <p className="text-slate-400">Elige tu juego y demuestra tu conocimiento futbolístico</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* ARMA TU EQUIPO — Featured */}
        <button
          onClick={() => onSelectGame('arma-equipo')}
          className="group col-span-1 md:col-span-2 xl:col-span-1 relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/40 to-slate-900 p-0 text-left hover:border-emerald-400/60 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.02]"
        >
          {/* Header gradient */}
          <div className="relative h-44 bg-gradient-to-br from-emerald-500/30 via-green-600/20 to-transparent overflow-hidden">
            {/* Pitch lines decoration */}
            <div className="absolute inset-0">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/15" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/15" />
              <div className="absolute bottom-0 left-1/3 right-1/3 h-10 border-t border-l border-r border-white/10" />
            </div>
            <div className="absolute top-6 left-6">
              <span className="text-5xl">⚽</span>
            </div>
            <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              ¡DISPONIBLE!
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900/90 to-transparent" />
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">
                Arma tu Equipo
              </h3>
              <span className="text-slate-500 text-xs">🏆 Mundiales</span>
            </div>
            <p className="text-slate-400 text-sm mb-5 leading-relaxed">
              Draftea jugadores de los mejores equipos mundialistas, construye tu 11 ideal y compite desde Octavos hasta la Gran Final.
            </p>
            <div className="flex flex-wrap gap-2">
              {['4-3-3', '11 Rondas', 'Octavos→Final', '39 Equipos'].map(tag => (
                <span key={tag} className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>

        {/* Coming soon cards */}
        {[
          { icon: '🎯', title: 'Adivina el Jugador', desc: 'Pistas progresivas hasta revelar la estrella oculta.', tags: ['Trivia', '11 vidas'] },
          { icon: '📋', title: 'Prode Express', desc: 'Predice resultados de partidos y acumula puntos.', tags: ['Predicciones', 'Ranking'] },
          { icon: '🃏', title: 'Colección de Figuritas', desc: 'Colecciona y completa tu álbum virtual de leyendas.', tags: ['Cards', 'Álbum'] },
        ].map(game => (
          <div
            key={game.title}
            className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/60 p-6 opacity-60 cursor-not-allowed"
          >
            <div className="text-4xl mb-4">{game.icon}</div>
            <h3 className="text-xl font-bold text-slate-400 mb-2">{game.title}</h3>
            <p className="text-slate-500 text-sm mb-4">{game.desc}</p>
            <div className="flex flex-wrap gap-2">
              {game.tags.map(tag => (
                <span key={tag} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 text-xs">
                  {tag}
                </span>
              ))}
            </div>
            <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-slate-700/50 border border-slate-600/30 text-slate-500 text-xs font-bold uppercase tracking-wider">
              Próximamente
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────── */
export default function MinijuegosPage() {
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  const handleSelectGame = (game: ActiveGame) => {
    setActiveGame(game);
  };

  const handleBackToHub = () => {
    setActiveGame(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-16 gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <span className="text-2xl">🎮</span>
            <span className="font-black text-white text-lg hidden sm:block">
              Vacas<span className="text-emerald-400">Locas</span>
            </span>
          </div>

          {/* Tabs */}
          {(!activeGame) && (
            <div className="flex gap-1">
              {(['inicio', 'minijuegos'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 capitalize ${
                    activeTab === tab
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab === 'inicio' ? '🏠 Inicio' : '🎮 Minijuegos'}
                </button>
              ))}
            </div>
          )}

          {/* Back button when game is active */}
          {activeGame && (
            <button
              onClick={handleBackToHub}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              ← Volver al Hub
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Game title if active */}
          {activeGame === 'arma-equipo' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-400 font-bold">⚽ Arma tu Equipo</span>
            </div>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto">
        {activeGame === 'arma-equipo' ? (
          <ArmaEquipo />
        ) : activeTab === 'inicio' ? (
          <Inicio />
        ) : (
          <MinijuegosHub onSelectGame={handleSelectGame} />
        )}
      </main>
    </div>
  );
}
