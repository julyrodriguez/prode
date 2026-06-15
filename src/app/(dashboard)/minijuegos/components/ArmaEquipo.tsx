'use client';

import { useState, useCallback } from 'react';
import { DATA_MUNDIALES, type Seleccion, type Jugador } from '../data/mundiales';

/* ─── Types ─────────────────────────────────────────────── */
type Posicion = Jugador['posicion'];
type GamePhase = 'MODE_SELECT' | 'DRAFT' | 'TOURNAMENT' | 'CHAMPION' | 'ELIMINATED';

interface SlotInfo {
  key: string;
  label: string;
  posicionesValidas: Posicion[];
  row: number;
  col: number;
}

interface MatchEvent {
  minute: number;
  text: string;
  type: 'goal_user' | 'goal_rival' | 'save' | 'chance' | 'neutral';
}

interface MatchResult {
  userScore: number;
  rivalScore: number;
  events: MatchEvent[];
  rival: Seleccion;
  phase: string;
  userWon: boolean;
}

interface TournamentState {
  phase: 'Octavos' | 'Cuartos' | 'Semifinal' | 'Final';
  results: MatchResult[];
  currentMatchResult: MatchResult | null;
  usedRivalIds: Set<number>;
  currentRival: Seleccion | null;
  simulating: boolean;
  phaseIndex: number;
}

export interface ArmaEquipoProps {
  onChampion?: (slots: Record<string, Jugador | null>) => void;
  championRivals?: Seleccion[];
}

/* ─── Field slots 4-3-3 ────────────────────────────────── */
export const FIELD_SLOTS: SlotInfo[] = [
  { key: 'POR',  label: 'POR',  posicionesValidas: ['POR'],                      row: 5, col: 2 },
  { key: 'LD',   label: 'LD',   posicionesValidas: ['LD','DFC'],                 row: 4, col: 3 },
  { key: 'DFC1', label: 'DFC',  posicionesValidas: ['DFC','LD','LI'],            row: 4, col: 2 },
  { key: 'DFC2', label: 'DFC',  posicionesValidas: ['DFC','LD','LI'],            row: 4, col: 1 },
  { key: 'LI',   label: 'LI',   posicionesValidas: ['LI','DFC'],                 row: 4, col: 0 },
  { key: 'MCD',  label: 'MCD',  posicionesValidas: ['MCD','MC','MCO'],           row: 3, col: 1 },
  { key: 'MC',   label: 'MC',   posicionesValidas: ['MC','MCD','MCO'],           row: 3, col: 2 },
  { key: 'MCO',  label: 'MCO',  posicionesValidas: ['MCO','MC','MCD','EI','ED'], row: 3, col: 3 },
  { key: 'EI',   label: 'EI',   posicionesValidas: ['EI','DC','ED'],             row: 2, col: 0 },
  { key: 'DC',   label: 'DC',   posicionesValidas: ['DC','EI','ED'],             row: 2, col: 2 },
  { key: 'ED',   label: 'ED',   posicionesValidas: ['ED','DC','EI'],             row: 2, col: 4 },
];

const PHASES: TournamentState['phase'][] = ['Octavos', 'Cuartos', 'Semifinal', 'Final'];

function getRatingColor(rating: number) {
  if (rating >= 95) return 'text-yellow-400';
  if (rating >= 90) return 'text-emerald-400';
  if (rating >= 85) return 'text-sky-400';
  if (rating >= 80) return 'text-white';
  return 'text-slate-400';
}

function getTeamAvg(jugadores: (Jugador | null)[]): number {
  const valid = jugadores.filter(Boolean) as Jugador[];
  if (!valid.length) return 0;
  return Math.round(valid.reduce((s, j) => s + j.rating, 0) / valid.length);
}

function generateMatchEvents(
  userAvg: number,
  rivalAvg: number,
  userTeam: (Jugador | null)[],
  rivalTeam: Seleccion
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const diff = userAvg - rivalAvg;
  const userGoalProb = Math.max(0.2, Math.min(0.8, 0.5 + diff * 0.015));

  const attackers = userTeam.filter(j => j && ['DC','EI','ED','MCO'].includes(j.posicion)).map(j => j!.nombre);
  const mids = userTeam.filter(j => j && ['MC','MCD'].includes(j.posicion)).map(j => j!.nombre);
  const gk = userTeam.find(j => j?.posicion === 'POR')?.nombre ?? 'Tu portero';

  const rivalAttackers = rivalTeam.jugadores.filter(j => ['DC','EI','ED'].includes(j.posicion)).map(j => j.nombre);
  const rivalGk = rivalTeam.jugadores.find(j => j.posicion === 'POR')?.nombre ?? 'Su portero';

  const minutes = [8, 15, 23, 31, 38, 44, 52, 61, 67, 72, 79, 85, 90];
  for (const minute of minutes) {
    const rand = Math.random();
    if (rand < userGoalProb * 0.35) {
      const scorer = attackers[Math.floor(Math.random() * attackers.length)] ?? 'Tu delantero';
      events.push({ minute, type: 'goal_user', text: `⚽ ¡GOOOOL! ${scorer} marca para tu equipo!` });
    } else if (rand < 0.35 + (1 - userGoalProb) * 0.25) {
      const scorer = rivalAttackers[Math.floor(Math.random() * rivalAttackers.length)] ?? 'El rival';
      events.push({ minute, type: 'goal_rival', text: `💥 ${scorer} (${rivalTeam.pais}) marca. ¡El rival anota!` });
    } else if (rand < 0.55) {
      const saver = Math.random() > 0.5 ? gk : rivalGk;
      events.push({ minute, type: 'save', text: `🧤 Paradón de ${saver}!` });
    } else if (rand < 0.70) {
      const mid = mids[Math.floor(Math.random() * mids.length)] ?? 'Tu mediocampista';
      events.push({ minute, type: 'chance', text: `🎯 Min ${minute}: Gran chance de ${mid}, afuera por poco!` });
    } else {
      const neutrals = [
        `⚠️ Min ${minute}: El árbitro frena el juego. Tensión en el campo.`,
        `🔥 Min ${minute}: El partido se pone intenso. Tarjeta amarilla.`,
        `📊 Min ${minute}: El rival intenta presionar pero tu defensa aguanta.`,
      ];
      events.push({ minute, type: 'neutral', text: neutrals[Math.floor(Math.random() * neutrals.length)] });
    }
  }

  const userScore = events.filter(e => e.type === 'goal_user').length;
  const rivalScore = events.filter(e => e.type === 'goal_rival').length;

  if (userScore === rivalScore) {
    const luck = Math.random();
    if (luck < userGoalProb) {
      const scorer = attackers[Math.floor(Math.random() * attackers.length)] ?? 'Tu delantero';
      events.push({ minute: 95, type: 'goal_user', text: `⚽🔥 ¡GOOL EN EL ÚLTIMO MINUTO! ${scorer} define el partido!` });
    } else {
      events.push({ minute: 93, type: 'goal_rival', text: `💥 ¡El rival empata en tiempo añadido!` });
      if (Math.random() < userGoalProb) {
        events.push({ minute: 120, type: 'goal_user', text: `🏅 ¡Ganaste la tanda de penales! Tu equipo avanza.` });
      } else {
        events.push({ minute: 120, type: 'goal_rival', text: `❌ El rival gana la tanda de penales. Eliminado.` });
      }
    }
  }

  return events;
}

function getPosColor(pos: Posicion): string {
  const map: Record<Posicion, string> = {
    POR: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
    DFC: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
    LD:  'bg-blue-400/20 text-blue-300 border border-blue-400/40',
    LI:  'bg-blue-400/20 text-blue-300 border border-blue-400/40',
    MC:  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    MCD: 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/40',
    MCO: 'bg-teal-500/20 text-teal-400 border border-teal-500/40',
    EI:  'bg-orange-500/20 text-orange-400 border border-orange-500/40',
    ED:  'bg-orange-500/20 text-orange-400 border border-orange-500/40',
    DC:  'bg-red-500/20 text-red-400 border border-red-500/40',
  };
  return map[pos] ?? 'bg-slate-700 text-slate-400';
}

/* ─── Slot Button ────────────────────────────────────────── */
function SlotButton({
  slot, jugador, selected, expertMode, onClick,
}: {
  slot: SlotInfo;
  jugador: Jugador | null;
  selected: Jugador | null;
  expertMode: boolean;
  onClick: () => void;
}) {
  const isCompatible = selected && slot.posicionesValidas.includes(selected.posicion) && !jugador;
  const isFilled = !!jugador;

  return (
    <button
      onClick={onClick}
      title={isFilled ? `${jugador!.nombre} (${jugador!.posicion})` : slot.label}
      className={`
        relative flex flex-col items-center justify-center rounded-xl p-1 transition-all duration-200 text-center w-[72px] h-[72px] text-xs font-medium select-none
        ${isFilled
          ? 'bg-emerald-700/80 border-2 border-emerald-400 shadow-lg shadow-emerald-500/40 cursor-default'
          : isCompatible
            ? 'bg-yellow-400/20 border-2 border-yellow-400 animate-pulse cursor-pointer hover:bg-yellow-400/30 scale-105'
            : selected
              ? 'bg-black/40 border-2 border-slate-600/50 cursor-not-allowed opacity-60'
              : 'bg-black/30 border-2 border-white/25 hover:border-white/50 hover:bg-white/10 cursor-pointer'
        }
      `}
    >
      {isFilled ? (
        <>
          <span className={`font-black text-sm leading-none mb-0.5 ${expertMode ? 'text-slate-300' : getRatingColor(jugador!.rating)}`}>
            {expertMode ? '?' : jugador!.rating}
          </span>
          <span className="text-white font-semibold leading-tight text-[10px] truncate w-full px-1">
            {jugador!.nombre.split(' ')[0]}
          </span>
          <span className="text-emerald-200 text-[9px]">{jugador!.posicion}</span>
        </>
      ) : (
        <>
          <span className="text-white/60 text-[11px] font-bold">{slot.label}</span>
          {isCompatible && <span className="text-yellow-300 text-base leading-none">+</span>}
        </>
      )}
    </button>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
export default function ArmaEquipo({ onChampion, championRivals = [] }: ArmaEquipoProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('MODE_SELECT');
  const [expertMode, setExpertMode] = useState(false);
  const [round, setRound] = useState(0);
  const [usedTeamIds, setUsedTeamIds] = useState<Set<number>>(new Set());
  const [currentTeam, setCurrentTeam] = useState<Seleccion | null>(null);
  const [slots, setSlots] = useState<Record<string, Jugador | null>>(
    Object.fromEntries(FIELD_SLOTS.map(s => [s.key, null]))
  );
  const [selectedPlayer, setSelectedPlayer] = useState<Jugador | null>(null);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [eliminatedPhase, setEliminatedPhase] = useState('');

  /* ─── Pick draft team (only from DATA_MUNDIALES) ── */
  const pickRandomDraftTeam = useCallback((exclude: Set<number>) => {
    const available = DATA_MUNDIALES.filter(t => !exclude.has(t.id));
    if (!available.length) return DATA_MUNDIALES[0];
    return available[Math.floor(Math.random() * available.length)];
  }, []);

  /* ─── Pick rival (DATA_MUNDIALES + champion rivals) ── */
  const pickRandomRival = useCallback((exclude: Set<number>) => {
    const pool = [
      ...DATA_MUNDIALES,
      ...championRivals,
    ].filter(t => !exclude.has(t.id));
    if (!pool.length) return DATA_MUNDIALES[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [championRivals]);

  const startDraft = (expert: boolean) => {
    setExpertMode(expert);
    setRound(0);
    setUsedTeamIds(new Set());
    setSlots(Object.fromEntries(FIELD_SLOTS.map(s => [s.key, null])));
    setSelectedPlayer(null);
    const team = pickRandomDraftTeam(new Set());
    setCurrentTeam(team);
    setUsedTeamIds(new Set([team.id]));
    setGamePhase('DRAFT');
  };

  const handlePlayerSelect = (jugador: Jugador) => {
    setSelectedPlayer(prev => prev?.nombre === jugador.nombre ? null : jugador);
  };

  const handleSlotClick = (slot: SlotInfo) => {
    if (!selectedPlayer) return;
    if (slots[slot.key]) return;
    if (!slot.posicionesValidas.includes(selectedPlayer.posicion)) return;

    const newSlots = { ...slots, [slot.key]: selectedPlayer };
    setSlots(newSlots);
    setSelectedPlayer(null);

    const filledCount = Object.values(newSlots).filter(Boolean).length;

    if (filledCount === 11) {
      const userIds = new Set([...usedTeamIds]);
      const rival = pickRandomRival(userIds);
      const userJugadores = Object.values(newSlots);
      const userAvg = getTeamAvg(userJugadores);
      const rivalAvg = getTeamAvg(rival.jugadores);
      const events = generateMatchEvents(userAvg, rivalAvg, userJugadores, rival);
      const userScore = events.filter(e => e.type === 'goal_user').length;
      const rivalScore = events.filter(e => e.type === 'goal_rival').length;
      const lastEvent = events[events.length - 1];
      const userWon = userScore > rivalScore || (userScore === rivalScore && lastEvent?.type === 'goal_user');
      userIds.add(rival.id);

      setTournament({
        phase: 'Octavos',
        phaseIndex: 0,
        results: [],
        currentMatchResult: { userScore, rivalScore, events, rival, phase: 'Octavos', userWon },
        usedRivalIds: userIds,
        currentRival: rival,
        simulating: false,
      });
      setShowEvents(false);
      setGamePhase('TOURNAMENT');
      return;
    }

    const nextRound = round + 1;
    if (nextRound < 11) {
      const newUsed = new Set([...usedTeamIds]);
      const nextTeam = pickRandomDraftTeam(newUsed);
      newUsed.add(nextTeam.id);
      setUsedTeamIds(newUsed);
      setCurrentTeam(nextTeam);
      setRound(nextRound);
    }
  };

  const advanceTournament = () => {
    if (!tournament?.currentMatchResult) return;
    const { currentMatchResult, phaseIndex, results, usedRivalIds } = tournament;

    if (!currentMatchResult.userWon) {
      setEliminatedPhase(currentMatchResult.phase);
      setGamePhase('ELIMINATED');
      return;
    }

    const newResults = [...results, currentMatchResult];
    const nextPhaseIndex = phaseIndex + 1;

    if (nextPhaseIndex >= PHASES.length) {
      onChampion?.(slots);
      setGamePhase('CHAMPION');
      return;
    }

    const nextPhase = PHASES[nextPhaseIndex];
    const rival = pickRandomRival(usedRivalIds);
    const userJugadores = Object.values(slots);
    const userAvg = getTeamAvg(userJugadores);
    const rivalAvg = getTeamAvg(rival.jugadores);
    const events = generateMatchEvents(userAvg, rivalAvg, userJugadores, rival);
    const userScore = events.filter(e => e.type === 'goal_user').length;
    const rivalScore = events.filter(e => e.type === 'goal_rival').length;
    const lastEvent = events[events.length - 1];
    const userWon = userScore > rivalScore || (userScore === rivalScore && lastEvent?.type === 'goal_user');
    const newUsed = new Set([...usedRivalIds, rival.id]);

    setTournament({
      ...tournament,
      phase: nextPhase,
      phaseIndex: nextPhaseIndex,
      results: newResults,
      currentMatchResult: { userScore, rivalScore, events, rival, phase: nextPhase, userWon },
      usedRivalIds: newUsed,
      currentRival: rival,
    });
    setShowEvents(false);
  };

  const resetGame = () => {
    setGamePhase('MODE_SELECT');
    setTournament(null);
    setSlots(Object.fromEntries(FIELD_SLOTS.map(s => [s.key, null])));
    setRound(0);
    setUsedTeamIds(new Set());
    setCurrentTeam(null);
    setSelectedPlayer(null);
    setShowEvents(false);
    setEliminatedPhase('');
  };

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */

  /* ── MODE SELECT ── */
  if (gamePhase === 'MODE_SELECT') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4 animate-bounce">⚽</div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            Arma tu <span className="text-emerald-400">Equipo</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Draftea jugadores de los mejores equipos mundialistas y compite por la gloria.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 text-slate-500 text-sm">
            <span>11 rondas de draft</span>
            <span className="text-slate-700">•</span>
            <span>Octavos → Final</span>
            <span className="text-slate-700">•</span>
            <span>{DATA_MUNDIALES.length + championRivals.length} equipos</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-xl">
          <button
            onClick={() => startDraft(false)}
            className="group relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-left hover:bg-emerald-500/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20 cursor-pointer"
          >
            <div className="text-4xl mb-3">👁️</div>
            <h2 className="text-2xl font-bold text-white mb-1">Modo Normal</h2>
            <p className="text-slate-400 text-sm">Las medias de los jugadores son visibles durante el draft.</p>
            <div className="mt-4 w-full py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm font-bold text-center group-hover:bg-emerald-500/30 transition-colors">
              Jugar →
            </div>
          </button>
          <button
            onClick={() => startDraft(true)}
            className="group relative overflow-hidden rounded-2xl border border-purple-500/40 bg-purple-500/10 p-8 text-left hover:bg-purple-500/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 cursor-pointer"
          >
            <div className="text-4xl mb-3">🎭</div>
            <h2 className="text-2xl font-bold text-white mb-1">Modo Experto</h2>
            <p className="text-slate-400 text-sm">Las medias están ocultas. ¡Confía en tu conocimiento!</p>
            <div className="mt-4 w-full py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 text-sm font-bold text-center group-hover:bg-purple-500/30 transition-colors">
              Jugar →
            </div>
          </button>
        </div>
      </div>
    );
  }

  /* ── DRAFT ── */
  if (gamePhase === 'DRAFT') {
    const filledSlots = Object.values(slots).filter(Boolean).length;
    const teamAvg = getTeamAvg(Object.values(slots));
    const slotsByRow: Record<number, SlotInfo[]> = {};
    FIELD_SLOTS.forEach(s => {
      if (!slotsByRow[s.row]) slotsByRow[s.row] = [];
      slotsByRow[s.row].push(s);
    });
    const sortedRows = Object.keys(slotsByRow).map(Number).sort((a, b) => a - b);
    const assignedNames = new Set(Object.values(slots).filter(Boolean).map(j => j!.nombre));
    const availablePlayers = currentTeam?.jugadores.filter(j => !assignedNames.has(j.nombre)) ?? [];

    return (
      <div className="flex flex-col lg:flex-row gap-6 min-h-screen px-2 py-6">
        {/* ── Left: Field ── */}
        <div className="lg:w-1/2 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-bold text-white">Tu Formación</h2>
              <p className="text-slate-400 text-sm">
                Ronda <span className="text-emerald-400 font-bold">{round + 1}</span>/11
                &nbsp;·&nbsp;
                <span className="text-white font-semibold">{filledSlots}</span>/11 jugadores
              </p>
            </div>
            <div className="text-right">
              <div className={`font-black text-2xl ${teamAvg > 0 ? getRatingColor(teamAvg) : 'text-slate-600'}`}>
                {teamAvg > 0 ? (expertMode ? '?' : teamAvg) : '--'}
              </div>
              <div className="text-slate-500 text-xs">Media</div>
            </div>
          </div>

          {/* Pitch */}
          <div
            className="relative rounded-2xl overflow-hidden flex-1 min-h-[500px] flex flex-col"
            style={{
              background: 'repeating-linear-gradient(0deg, #166534 0px, #166534 44px, #15803d 44px, #15803d 88px)',
              border: '3px solid rgba(255,255,255,0.12)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)',
            }}
          >
            {/* Pitch markings */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Center line */}
              <div className="absolute top-1/2 left-4 right-4 h-px bg-white/20" />
              {/* Center circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/30" />
              {/* Goal areas */}
              <div className="absolute bottom-4 left-1/4 right-1/4 h-14 border-t-2 border-l-2 border-r-2 border-white/20 rounded-t-sm" />
              <div className="absolute top-4 left-1/4 right-1/4 h-14 border-b-2 border-l-2 border-r-2 border-white/20 rounded-b-sm" />
            </div>

            {/* ATTACK label */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-white/30 text-[10px] font-bold tracking-widest uppercase">Ataque</div>
            {/* DEFENSE label */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/30 text-[10px] font-bold tracking-widest uppercase">Defensa</div>

            {/* Slots */}
            <div className="absolute inset-0 flex flex-col justify-around items-center py-8">
              {sortedRows.map(rowIdx => {
                const rowSlots = slotsByRow[rowIdx];
                return (
                  <div key={rowIdx} className="flex justify-around items-center w-full px-2 gap-2">
                    {rowSlots.map(slot => (
                      <SlotButton
                        key={slot.key}
                        slot={slot}
                        jugador={slots[slot.key]}
                        selected={selectedPlayer}
                        expertMode={expertMode}
                        onClick={() => handleSlotClick(slot)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          {selectedPlayer ? (
            <div className="px-4 py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/40 text-yellow-300 text-sm flex items-center gap-2">
              <span className="text-yellow-400 text-lg">📍</span>
              <div>
                <span className="font-bold">{selectedPlayer.nombre}</span> seleccionado
                <span className="text-slate-400 ml-1">({selectedPlayer.posicion})</span>
                <span className="text-slate-500 text-xs ml-2">— Toca una posición compatible en el campo</span>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 text-sm text-center">
              Seleccioná un jugador de la derecha y luego tocá una posición en el campo
            </div>
          )}
        </div>

        {/* ── Right: Player cards ── */}
        <div className="lg:w-1/2 flex flex-col gap-4">
          {currentTeam && (
            <>
              {/* Team header */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-5xl">{currentTeam.bandera}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{currentTeam.pais}</h3>
                    <span className="text-slate-500 font-normal">{currentTeam.anio}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{currentTeam.formacion} · Seleccioná 1 jugador</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs text-slate-500 mb-1">Avg equipo</div>
                  <div className={`text-xl font-black ${getRatingColor(getTeamAvg(currentTeam.jugadores))}`}>
                    {expertMode ? '?' : getTeamAvg(currentTeam.jugadores)}
                  </div>
                </div>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[440px] pr-1 pb-1">
                {availablePlayers.map(jugador => {
                  const isSelected = selectedPlayer?.nombre === jugador.nombre;
                  const rColor = getRatingColor(jugador.rating);
                  return (
                    <button
                      key={jugador.nombre}
                      onClick={() => handlePlayerSelect(jugador)}
                      className={`
                        relative rounded-xl p-3 text-left transition-all duration-200 border cursor-pointer
                        ${isSelected
                          ? 'border-yellow-400 bg-yellow-400/15 shadow-lg shadow-yellow-500/20 scale-105'
                          : 'border-slate-700 bg-slate-800/70 hover:border-slate-500 hover:bg-slate-700/70 hover:scale-[1.02]'
                        }
                      `}
                    >
                      {/* Position + Rating row */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPosColor(jugador.posicion)}`}>
                          {jugador.posicion}
                        </span>
                        <span className={`text-xl font-black ${expertMode ? 'text-slate-600 select-none' : rColor}`}>
                          {expertMode ? '?' : jugador.rating}
                        </span>
                      </div>
                      {/* Name */}
                      <p className="text-white font-bold text-sm leading-tight">{jugador.nombre}</p>
                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── TOURNAMENT ── */
  if (gamePhase === 'TOURNAMENT' && tournament) {
    const { currentMatchResult, phase } = tournament;
    if (!currentMatchResult) return null;
    const { rival, userScore, rivalScore, events, userWon } = currentMatchResult;
    const userAvg = getTeamAvg(Object.values(slots));
    const rivalAvg = getTeamAvg(rival.jugadores);
    const phaseColor: Record<string, string> = {
      Octavos: 'text-sky-400',
      Cuartos: 'text-purple-400',
      Semifinal: 'text-orange-400',
      Final: 'text-yellow-400',
    };
    const phaseBg: Record<string, string> = {
      Octavos: 'bg-sky-500/10 border-sky-500/30',
      Cuartos: 'bg-purple-500/10 border-purple-500/30',
      Semifinal: 'bg-orange-500/10 border-orange-500/30',
      Final: 'bg-yellow-500/10 border-yellow-500/30',
    };

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Phase banner */}
        <div className={`rounded-2xl border p-6 mb-6 text-center ${phaseBg[phase]}`}>
          <div className={`text-sm font-bold uppercase tracking-widest mb-1 ${phaseColor[phase]}`}>
            {phase === 'Final' ? '🏆 Gran Final' : `${phase} de Final`}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
            Tu Equipo <span className="text-slate-400">vs</span>{' '}
            <span>{rival.bandera} {rival.pais} {rival.anio}</span>
          </h2>

          {/* Score */}
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Tu Media</div>
              <div className={`text-4xl font-black ${expertMode ? 'text-slate-500' : getRatingColor(userAvg)}`}>
                {expertMode ? '?' : userAvg}
              </div>
            </div>
            <div className="text-center">
              <div className={`text-5xl md:text-6xl font-black ${userWon ? 'text-emerald-400' : 'text-red-400'}`}>
                {userScore} – {rivalScore}
              </div>
              <div className={`mt-2 text-sm font-bold ${userWon ? 'text-emerald-400' : 'text-red-400'}`}>
                {userWon ? '✅ ¡Avanzás!' : '❌ Eliminado'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Media Rival</div>
              <div className={`text-4xl font-black ${getRatingColor(rivalAvg)}`}>{rivalAvg}</div>
            </div>
          </div>
        </div>

        {/* Events toggle */}
        <button
          onClick={() => setShowEvents(v => !v)}
          className="w-full py-3 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:border-slate-500 transition mb-4 text-sm font-medium"
        >
          {showEvents ? '▲ Ocultar relato' : '▼ Ver relato del partido'}
        </button>

        {showEvents && (
          <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1">
            {events.map((ev, i) => (
              <div
                key={i}
                className={`flex gap-3 p-3 rounded-lg text-sm ${
                  ev.type === 'goal_user'   ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' :
                  ev.type === 'goal_rival'  ? 'bg-red-500/15 border border-red-500/30 text-red-300' :
                  ev.type === 'save'        ? 'bg-sky-500/10 border border-sky-500/20 text-sky-300' :
                  'bg-slate-800/40 border border-slate-700/50 text-slate-400'
                }`}
              >
                <span className="font-bold text-xs shrink-0 pt-0.5 w-8 text-right">{ev.minute}&apos;</span>
                <span>{ev.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Phase progress */}
        <div className="flex items-center gap-1 mb-6 justify-center flex-wrap">
          {PHASES.map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                i < tournament.phaseIndex   ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                i === tournament.phaseIndex ? 'bg-white/15 text-white border border-white/40 scale-110' :
                'bg-slate-800/40 text-slate-600 border border-slate-700/30'
              }`}>{p}</div>
              {i < PHASES.length - 1 && <span className="text-slate-700 text-xs">›</span>}
            </div>
          ))}
        </div>

        <button
          onClick={advanceTournament}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 cursor-pointer ${
            userWon
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 hover:scale-[1.02]'
              : 'bg-red-500/80 hover:bg-red-600 text-white'
          }`}
        >
          {userWon
            ? tournament.phaseIndex < PHASES.length - 1 ? `→ Jugar ${PHASES[tournament.phaseIndex + 1]}` : '🏆 ¡Soy Campeón!'
            : '→ Ver resultado'}
        </button>
      </div>
    );
  }

  /* ── CHAMPION ── */
  if (gamePhase === 'CHAMPION') {
    const teamAvg = getTeamAvg(Object.values(slots));
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="relative mb-6">
          <div className="text-8xl animate-bounce">🏆</div>
          <div className="absolute -inset-8 rounded-full bg-yellow-400/10 animate-ping" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-600 mb-2">
          ¡CAMPEÓN DEL MUNDO!
        </h1>
        <p className="text-slate-300 text-xl mb-2">
          Media final del equipo:{' '}
          <span className="text-yellow-400 font-black text-2xl">{teamAvg}</span>
        </p>
        <p className="text-slate-500 text-sm mb-8">Tu equipo fue guardado. ¡Podría aparecer como rival en futuras partidas!</p>

        {/* Phases completed */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {PHASES.map(p => (
            <div key={p} className="px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-sm font-bold">
              ✅ {p}
            </div>
          ))}
        </div>

        {/* Team grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8 max-w-2xl w-full">
          {FIELD_SLOTS.map(slot => {
            const j = slots[slot.key];
            if (!j) return null;
            return (
              <div key={slot.key} className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-3 text-center">
                <div className={`text-lg font-black ${getRatingColor(j.rating)}`}>{j.rating}</div>
                <div className="text-white text-xs font-semibold leading-tight truncate">{j.nombre}</div>
                <div className="text-yellow-600 text-[10px] font-bold mt-0.5">{j.posicion}</div>
              </div>
            );
          })}
        </div>

        <button
          onClick={resetGame}
          className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl text-black font-black text-xl hover:scale-105 transition-transform shadow-2xl shadow-yellow-500/40 cursor-pointer"
        >
          Volver al Hub
        </button>
      </div>
    );
  }

  /* ── ELIMINATED ── */
  if (gamePhase === 'ELIMINATED') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="text-7xl mb-6">💔</div>
        <h1 className="text-4xl md:text-5xl font-black text-red-400 mb-3">
          Eliminado en {eliminatedPhase}
        </h1>
        <p className="text-slate-400 text-lg max-w-md mb-8">
          Tu equipo llegó hasta {eliminatedPhase} de Final. ¡La próxima va a ser!
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8 max-w-lg w-full opacity-60">
          {FIELD_SLOTS.map(slot => {
            const j = slots[slot.key];
            if (!j) return null;
            return (
              <div key={slot.key} className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-center">
                <div className="text-xs text-red-600 font-bold">{slot.label}</div>
                <div className="text-white text-[11px] truncate">{j.nombre}</div>
              </div>
            );
          })}
        </div>
        <button
          onClick={resetGame}
          className="px-10 py-4 bg-gradient-to-r from-slate-700 to-slate-600 border border-slate-500 rounded-2xl text-white font-bold text-lg hover:scale-105 transition-transform cursor-pointer"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return null;
}
