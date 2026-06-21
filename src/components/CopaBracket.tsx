import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';

interface BracketMatch {
  id: number;
  equipo1: string;
  equipo2: string;
  team1Id?: number;
  team2Id?: number;
}

interface BracketData {
  mostrarTabla: boolean;
  octavos: BracketMatch[];
  cuartos: BracketMatch[];
  semifinales: BracketMatch[];
  final: BracketMatch[];
}

function TeamRow({ name, teamId, hasBorder }: { name: string; teamId?: number; hasBorder?: boolean }) {
  const router = useRouter();
  const clickable = !!teamId;

  return (
    <div
      className={`px-3 py-2 flex items-center gap-2${hasBorder ? ' border-b border-white/5' : ''}${clickable ? ' cursor-pointer hover:bg-white/10' : ''}`}
      onClick={clickable ? () => router.push(`/team/${teamId}`) : undefined}
      title={clickable ? `Ver ${name}` : name}
    >
      {teamId ? (
        <img src={`/escudos/${teamId}.png`} alt="" className="w-4 h-4 object-contain shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full bg-white/10 shrink-0" />
      )}
      <span className={`truncate font-semibold text-slate-200${clickable ? ' hover:text-white' : ''}`}>{name}</span>
    </div>
  );
}

export default function CopaBracket() {
  const [data, setData] = useState<BracketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://apivacas.jariel.com.ar/api/cruces-octavos')
      .then(res => res.json())
      .then((json: BracketData) => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching bracket', err);
        setLoading(false);
      });
  }, []);

  if (loading) return null;
  if (!data || !data.mostrarTabla) return null;

  const MatchBox = ({ match }: { match: BracketMatch }) => (
    <div className="flex flex-col bg-black/40 border border-white/5 rounded-lg overflow-hidden text-[11px] md:text-xs shadow-sm w-full relative z-10">
      <TeamRow name={match.equipo1} teamId={match.team1Id} hasBorder />
      <TeamRow name={match.equipo2} teamId={match.team2Id} />
    </div>
  );

  return (
    <div className="w-full bg-[#0b1015]/60 border border-white/5 rounded-2xl p-4 md:p-6 shadow-2xl backdrop-blur-md mb-6 overflow-x-auto custom-scrollbar">
      <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400 mb-6 text-center">
        Fase Final Copa de la Liga
      </h2>
      <div className="min-w-[800px] flex gap-6 pb-2">
        {/* Octavos */}
        <div className="flex flex-col w-48 relative">
          <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Octavos</div>
          <div className="flex flex-col justify-around flex-1 gap-3">
            {data.octavos?.map(m => <MatchBox key={`o-${m.id}`} match={m} />)}
          </div>
        </div>

        {/* Cuartos */}
        <div className="flex flex-col w-48 relative">
          <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Cuartos</div>
          <div className="flex flex-col justify-around flex-1 gap-3">
            {data.cuartos?.map(m => <MatchBox key={`c-${m.id}`} match={m} />)}
          </div>
        </div>

        {/* Semifinal */}
        <div className="flex flex-col w-48 relative">
          <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Semifinales</div>
          <div className="flex flex-col justify-around flex-1 gap-3">
            {data.semifinales?.map(m => <MatchBox key={`s-${m.id}`} match={m} />)}
          </div>
        </div>

        {/* Final */}
        <div className="flex flex-col w-48 relative">
          <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Final</div>
          <div className="flex flex-col justify-around flex-1 gap-3">
            {data.final?.map(m => (
              <div key={`f-${m.id}`} className="flex flex-col items-center w-full">
                <div className="flex flex-col items-center mb-3 drop-shadow-md">
                  <Trophy className="w-8 h-8 text-yellow-500 mb-1" />
                  <span className="text-xs font-black text-yellow-500 tracking-wider">X3</span>
                </div>
                <MatchBox match={m} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
