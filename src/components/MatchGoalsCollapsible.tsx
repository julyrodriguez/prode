import { useState, useEffect } from 'react';

interface Incident {
  id?: string;
  _id?: string;
  incidentType: string;
  incidentClass?: string;
  isHome: boolean;
  time: number;
  addedTime?: number;
  playerName?: string;
  player?: {
    name?: string;
    shortName?: string;
  };
}

interface MatchGoalsCollapsibleProps {
  matchId: number;
  hasStarted: boolean;
}

export default function MatchGoalsCollapsible({ matchId, hasStarted }: MatchGoalsCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<Incident[] | null>(null);

  useEffect(() => {
    if (isOpen && goals === null && hasStarted) {
      setLoading(true);
      fetch(`https://apivacas.jariel.com.ar/api/matches/detail/${matchId}`)
        .then((r) => r.json())
        .then((d) => {
          const incidents = d.incidents || [];
          const goalIncidents = incidents.filter(
            (inc: Incident) => inc.incidentType === 'goal'
          );
          setGoals(goalIncidents);
        })
        .catch((err) => {
          console.error("Error fetching match goals:", err);
          setGoals([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, matchId, goals, hasStarted]);

  if (!hasStarted) return null;

  return (
    <div className="w-full border-t border-white/[0.06] bg-black/25">
      {/* Botón para expandir/colapsar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="w-full flex items-center justify-center py-1.5 hover:bg-white/[0.04] active:bg-white/10 transition-colors text-slate-400 hover:text-slate-200"
      >
        <span className="text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
          {isOpen ? 'Ocultar goles ▲' : 'Ver goles ▼'}
        </span>
      </button>

      {/* Contenido colapsable */}
      {isOpen && (
        <div className="px-4 py-2 border-t border-white/[0.04] bg-black/10">
          {loading ? (
            <div className="flex justify-center items-center py-2">
              <div className="animate-spin w-4 h-4 rounded-full border border-t-emerald-400 border-r-transparent" />
              <span className="text-[11px] text-slate-500 font-bold ml-2">Cargando goles...</span>
            </div>
          ) : goals && goals.length > 0 ? (
            <div className="flex flex-col gap-1.5 py-1">
              {goals.map((goal, idx) => {
                const isHome = goal.isHome === true;
                const isAway = goal.isHome === false;
                const name = goal.playerName || goal.player?.shortName || goal.player?.name || 'Gol';
                const timeStr = goal.addedTime ? `${goal.time}+${goal.addedTime}'` : `${goal.time}'`;

                return (
                  <div key={goal.id || goal._id || idx} className="grid grid-cols-[1fr_40px_1fr] items-center text-xs">
                    {/* Local */}
                    {isHome ? (
                      <div className="flex items-center justify-end gap-1.5 pr-2">
                        <span className="text-slate-200 font-semibold truncate max-w-[120px] sm:max-w-xs">{name}</span>
                        <span className="text-[10px] text-slate-500 font-bold">({timeStr})</span>
                        <span className="text-emerald-400 text-xs shrink-0">⚽</span>
                      </div>
                    ) : (
                      <div />
                    )}

                    {/* Centro (separador o nada) */}
                    <div className="flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                    </div>

                    {/* Visitante */}
                    {isAway ? (
                      <div className="flex items-center justify-start gap-1.5 pl-2">
                        <span className="text-indigo-400 text-xs shrink-0">⚽</span>
                        <span className="text-slate-200 font-semibold truncate max-w-[120px] sm:max-w-xs">{name}</span>
                        <span className="text-[10px] text-slate-500 font-bold">({timeStr})</span>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-2 text-[11px] text-slate-500 font-medium">
              No se registraron goles en este partido.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
