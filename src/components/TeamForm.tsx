import { useEffect, useState } from 'react';

// Cache para no saturar la API
const formCache: Record<number, string[]> = {};

export default function TeamForm({ teamId, align = 'left' }: { teamId: number | undefined, align?: 'left' | 'right' }) {
  const [form, setForm] = useState<string[]>([]);

  useEffect(() => {
    if (!teamId) return;

    if (formCache[teamId]) {
      setForm(formCache[teamId]);
      return;
    }

    const fetchForm = async () => {
      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/teams/${teamId}/matches?limit=3`);
        if (res.ok) {
          const matches = await res.json();
          const results: string[] = [];

          for (const match of matches) {
            const hId = match.homeTeam?.id || match.home_team?.id;
            const isHome = Number(hId) === Number(teamId);
            
            const hScore = match.homeScore?.current ?? match.homeTeam?.score ?? match.home_team?.score;
            const aScore = match.awayScore?.current ?? match.awayTeam?.score ?? match.away_team?.score;

            if (hScore === undefined || aScore === undefined) continue;

            const homeC = Number(hScore);
            const awayC = Number(aScore);

            if (homeC === awayC) {
              results.push('E');
            } else if (isHome) {
              results.push(homeC > awayC ? 'V' : 'D');
            } else {
              results.push(awayC > homeC ? 'V' : 'D');
            }
          }
           // formCache almacena el historial cronológicamente [Viejo, Medio, Nuevo]
          formCache[teamId] = results.reverse();
          setForm(formCache[teamId]);
        }
      } catch (err) {
        console.error('Error fetching form for team', teamId, err);
      }
    };

    fetchForm();
  }, [teamId]);

  if (!form || form.length === 0) return null;

  // Si align == 'left' (para Local), cuadritos a la izquierda del texto -> queremos [Viejo, Medio, Nuevo]
  // Si align == 'right' (para Visitante), cuadritos a la derecha -> queremos [Nuevo, Medio, Viejo]
  // Así, el "Nuevo" siempre queda pegado al nombre del equipo.
  const displayForm = align === 'left' ? form : [...form].reverse();

  return (
    <div className="flex items-center gap-1">
      {displayForm.map((res, idx) => (
        <span 
          key={idx} 
          className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-[3px] flex items-center justify-center text-[8px] md:text-[9px] font-bold text-white shadow-sm ${
            res === 'V' ? 'bg-emerald-500' :
            res === 'E' ? 'bg-amber-500' : 'bg-red-500'
          }`}
        >
          {res}
        </span>
      ))}
    </div>
  );
}

