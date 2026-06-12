"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { LEAGUES } from '../components/layout/AppLayout';

interface RankingEntry {
  userId: string;
  name: string;
  correctTendencies: number;
  exactResults: number;
  totalPoints: number;
  tournamentName: string;
  avatarUrl?: string;
}

const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };

const PRODE_USER_IDS = new Set([
  'mDpYgQIEtCVIF8pdQ0HYHWiAyJV2',
  'ZIM8X38poYUZicf38gGzFsj8Tis1',
  'vtiJxm0gJFgpyv74p6wnLnYuSyC3',
  'vNEg4qrr9vQFDYeLt7tFJQ2GXl13',
  'ryCAlOASuTM7BiMQ8VJUfgnCJtt1',
  'jTnexEDtihPrcP1r1dmFm4CFD0z2',
  'POYvW930tTUZZEnfNcIIy8O67692',
  'pffqgeno1jSwZMLws4h7sWmzjEj2',
  'IS6Ap0JmN9OVoGBbvoPCQSIU0xU2',
  'CPJ15xjLbaMJmiEc7fChoFUiDMw2',
  'aayngHYHpsNaw66u8FjG9RvF7Vk1'
]);

export default function RankingView() {
  const { user } = useAuth();
  const router = useRouter();

  // Get valid leagues with a tournamentId
  const validLeagues = LEAGUES.filter(l => l.tournamentId !== null);
  const [selectedLeague, setSelectedLeague] = useState(validLeagues[0]);

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rankingTab, setRankingTab] = useState<'prode' | 'pobres'>('prode');

  useEffect(() => {
    const fetchRanking = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(
          `https://apivacas.jariel.com.ar/api/ranking/${selectedLeague.tournamentId}`
        );
        if (!res.ok) throw new Error('No se pudo cargar el ranking');
        const data: RankingEntry[] = await res.json();
        setRanking(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (showLoading) {
          setError(e.message);
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    };
    fetchRanking(true);
    const interval = setInterval(() => fetchRanking(false), 60000); // 1 minuto
    return () => clearInterval(interval);
  }, [selectedLeague.tournamentId]);

  const activeRanking = rankingTab === 'prode'
    ? ranking.filter((entry) => PRODE_USER_IDS.has(entry.userId))
    : ranking;

  const myEntry = user ? activeRanking.find((r) => r.userId === user.uid) : null;
  const myPos = myEntry ? activeRanking.indexOf(myEntry) : -1;

  return (
    <div className="w-full flex flex-col gap-6 pb-10 animate-fade-in">

      {/* ── Cabecera ── */}
      <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-amber-500/8 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/8 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
              🏆 Ranking
            </h1>
            <p className="text-slate-400 font-medium mt-1">
              Participantes clasificados — {activeRanking.length} participantes
            </p>
          </div>

          {/* Mi posición */}
          {myEntry && (
            <div className="flex items-center gap-4 bg-black/40 border border-amber-500/20 px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.08)]">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Mi posición</span>
                <span className="text-3xl font-black text-white">#{myPos + 1}</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Puntos</span>
                <span className="text-3xl font-black text-amber-400">{myEntry.totalPoints}</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Exactos</span>
                <span className="text-3xl font-black text-emerald-400">{myEntry.exactResults}</span>
              </div>
              {selectedLeague.id === 'mundial' && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <button
                    onClick={() => setShowRulesModal(true)}
                    className="flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all text-amber-400 hover:text-amber-300 px-1 cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest">Reglas</span>
                    <span className="text-xl mt-0.5">📜</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Selector de Torneo ── */}
      <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1 gap-1 overflow-x-auto no-scrollbar max-w-full">
        {validLeagues.map((league) => {
          const isActive = selectedLeague.id === league.id;
          return (
            <button
              key={league.id}
              onClick={() => setSelectedLeague(league)}
              className={`
                flex-1 min-w-max px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                ${isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
              `}
            >
              <span className="mr-2">{league.icon}</span>
              {league.name}
            </button>
          );
        })}
      </div>

      {/* ── Estado de carga/error ── */}
      {loading && (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-medium">Cargando ranking...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400 font-bold">
          {error}
        </div>
      )}

      {/* ── Tabla ── */}
      {!loading && !error && ranking.length > 0 && (
        <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-inner mb-4 w-full">
          <button
            onClick={() => setRankingTab('prode')}
            className={`flex-1 text-center px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
              rankingTab === 'prode'
                ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            PRODE
          </button>
          <button
            onClick={() => setRankingTab('pobres')}
            className={`flex-1 text-center px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
              rankingTab === 'pobres'
                ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            POBRES
          </button>
        </div>
      )}

      {/* ── Tabla ── */}
      {!loading && !error && ranking.length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden shadow-lg">

          {/* Header de columnas */}
          <div className="grid grid-cols-[40px_1fr_56px_56px_48px] md:grid-cols-[48px_1fr_80px_80px_80px] items-center px-3 md:px-6 py-3 border-b border-white/5 bg-black/20">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">#</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Jugador</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Tend.</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Exact.</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Pts</span>
          </div>

          {/* Filas */}
          <div className="divide-y divide-white/[0.03]">
            {activeRanking.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic">No hay participantes en esta tabla todavía.</div>
            ) : (
              activeRanking.map((entry, idx) => {
              const isMe = user && entry.userId === user.uid;
              const isMundial = selectedLeague.id === 'mundial';
              const isTop3 = idx < 3;
              const medal = isMundial
                ? (idx === 0 ? '🥇' : idx === 1 ? '🥈' : undefined)
                : MEDAL[idx];

              const rowPadding = idx === 0
                ? 'py-6 md:py-8'
                : (isMundial && idx === 1)
                  ? 'py-4 md:py-5'
                  : 'py-3.5';

              const rowBg = idx === 0
                ? (isMe
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-l-4 border-amber-500 hover:from-amber-500/25 hover:to-amber-500/10'
                  : 'bg-gradient-to-r from-amber-500/10 to-amber-500/[0.02] border-l-4 border-amber-500/50 hover:from-amber-500/15 hover:to-amber-500/[0.05]')
                : isMe
                  ? 'bg-amber-500/[0.06] border-l-2 border-amber-500/50 hover:bg-amber-500/[0.10]'
                  : (isMundial && idx === 1)
                    ? 'bg-slate-500/[0.02] border-l-2 border-slate-400/20 hover:bg-slate-500/[0.05]'
                    : 'hover:bg-white/[0.04]';

              const medalSize = idx === 0
                ? 'text-3xl md:text-4xl'
                : (isMundial && idx === 1)
                  ? 'text-xl md:text-2xl'
                  : 'text-xl';

              const avatarSize = idx === 0
                ? 'w-20 h-20 md:w-24 md:h-24 shadow-[0_0_20px_rgba(245,158,11,0.2)] border-amber-400/40'
                : (isMundial && idx === 1)
                  ? 'w-10 h-10 md:w-11 md:h-11'
                  : 'w-8 h-8';

              const initialsTextSize = idx === 0
                ? 'text-3xl md:text-4xl'
                : (isMundial && idx === 1)
                  ? 'text-sm md:text-base'
                  : 'text-xs';

              const avatarBgClass = isMe
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : (isMundial && idx === 0)
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : (isMundial && idx === 1)
                    ? 'bg-slate-500/20 border-slate-500/30 text-slate-300'
                    : isTop3 && !isMundial
                      ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                      : 'bg-white/5 border-white/10 text-slate-400';

              const nameTextClass = idx === 0
                ? 'text-xl md:text-2xl font-black text-amber-300'
                : (isMundial && idx === 1)
                  ? 'text-sm md:text-base font-extrabold text-slate-200'
                  : `font-bold text-sm ${isMe ? 'text-amber-300' : 'text-slate-200'}`;

              const pointsClass = idx === 0
                ? 'text-2xl md:text-3xl font-black text-amber-400'
                : (isMundial && idx === 1)
                  ? 'text-base md:text-lg font-black text-slate-200'
                  : `text-base font-black ${isMe ? 'text-amber-400' : (idx < 3) ? 'text-white' : 'text-slate-300'}`;

              return (
                <div
                  key={entry.userId}
                  onClick={() => router.push(`/predictions/${entry.userId}?tournamentId=selectedLeague.tournamentId&tournamentName=selectedLeague.name`)}
                  className={`grid grid-cols-[40px_1fr_56px_56px_48px] md:grid-cols-[48px_1fr_80px_80px_80px] items-center px-3 md:px-6 cursor-pointer transition-colors duration-75 ${rowPadding} ${rowBg}`}
                >
                  {/* Posición */}
                  <div className="flex items-center justify-center">
                    {medal ? (
                      <span className={medalSize}>{medal}</span>
                    ) : (
                      <span className={`text-sm font-black ${isMe ? 'text-amber-400' : 'text-slate-500'}`}>
                        {idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Nombre e Imagen */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className={`relative rounded-full flex items-center justify-center font-black shrink-0 border overflow-hidden ${avatarSize} ${avatarBgClass}`}>
                      <span className={`absolute z-0 ${initialsTextSize}`}>{entry.name?.slice(0, 1).toUpperCase() || '?'}</span>
                      <img
                        src={`https://apivacas.jariel.com.ar/users/${entry.userId}.webp`}
                        alt={entry.name}
                        className="w-full h-full object-cover relative z-10"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`truncate ${nameTextClass}`}>
                        {entry.name || 'Desconocido'}
                        {isMe && <span className="ml-2 text-[10px] font-semibold text-amber-400/70">(vos)</span>}
                      </span>
                    </div>
                  </div>

                  {/* Tendencias correctas */}
                  <div className="text-center">
                    <span className="text-sm font-bold text-slate-300">{entry.correctTendencies}</span>
                  </div>

                  {/* Resultados exactos */}
                  <div className="text-center">
                    <span className={`text-sm font-bold ${entry.exactResults > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {entry.exactResults}
                    </span>
                  </div>

                  {/* Puntos */}
                  <div className="text-right">
                    <span className={pointsClass}>
                      {entry.totalPoints}
                    </span>
                  </div>
                </div>
              );
            }))}
          </div>

          {/* Leyenda de puntos */}
          {selectedLeague.id !== 'mundial' && (
            <div className="flex flex-wrap gap-4 px-6 py-4 border-t border-white/5 bg-black/10">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span><strong className="text-slate-300">Resultado exacto</strong> = 6 pts</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span><strong className="text-slate-300">Tendencia correcta</strong> = 3 pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sin datos */}
      {!loading && !error && ranking.length === 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-12 flex flex-col items-center gap-4 text-slate-400">
          <div className="text-5xl opacity-30">🏆</div>
          <p className="text-sm font-medium text-center">
            Todavía no hay posiciones para {selectedLeague.name}.<br />
            ¡Sé el primero en hacer tus predicciones!
          </p>
        </div>
      )}

      {/* ── Modal de Reglas Mundial ── */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-modal-fade-in">
          {/* Card */}
          <div className="relative w-full max-w-md bg-[#0b1015] border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl flex flex-col gap-6 animate-modal-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer animate-none!"
            >
              ✕
            </button>

            {/* Header */}
            <div className="text-center">
              <span className="text-4xl">🌍</span>
              <h3 className="text-xl font-black text-white mt-2">Reglas del Mundial</h3>
              <p className="text-xs text-slate-400 mt-1">Puntos otorgados por cada predicción correcta</p>
            </div>

            {/* Content: Phases Table */}
            <div className="flex flex-col gap-4">
              <div className="bg-black/25 rounded-2xl border border-white/5 overflow-hidden">
                <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-2 bg-black/40 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Fase</span>
                  <span className="text-center">Resultado</span>
                  <span className="text-center">Exacto</span>
                </div>
                <div className="divide-y divide-white/[0.03] text-sm">
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">Grupos</span>
                    <span className="text-center font-bold text-indigo-400">2 pts</span>
                    <span className="text-center font-bold text-emerald-400">4 pts</span>
                  </div>
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">16avos a Cuartos</span>
                    <span className="text-center font-bold text-indigo-400">4 pts</span>
                    <span className="text-center font-bold text-emerald-400">8 pts</span>
                  </div>
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">Semifinal</span>
                    <span className="text-center font-bold text-indigo-400">7 pts</span>
                    <span className="text-center font-bold text-emerald-400">14 pts</span>
                  </div>
                  <div className="grid grid-cols-[1fr_75px_75px] items-center px-4 py-3">
                    <span className="font-semibold text-slate-300">Final</span>
                    <span className="text-center font-bold text-indigo-400">10 pts</span>
                    <span className="text-center font-bold text-emerald-400">20 pts</span>
                  </div>
                </div>
              </div>

              {/* Podium section */}
              <div className="bg-black/25 rounded-2xl border border-white/5 p-4 flex flex-col gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Predicción del Podio</span>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>🥇</span>
                    <span className="font-semibold text-slate-300">Campeón</span>
                  </div>
                  <span className="font-extrabold text-amber-400">40 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>🥈</span>
                    <span className="font-semibold text-slate-300">Subcampeón</span>
                  </div>
                  <span className="font-extrabold text-slate-400">25 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>🥉</span>
                    <span className="font-semibold text-slate-300">Tercer Puesto</span>
                  </div>
                  <span className="font-extrabold text-amber-600">20 pts</span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-black font-black rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
