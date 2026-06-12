import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';


interface CS2Player {
  _id: string;
  alias: string;
  name: string;
  steam64_id: string;
  ranks: {
    leetify: number;
    premier: number;
  };
  rating: {
    aim: number;
    positioning: number;
    utility: number;
  };
  stats: {
    accuracy_head: number;
    reaction_time_ms: number;
  };
  total_matches: number;
  winrate: number;
}

export default function CS2RankingView() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<CS2Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://apivacas.jariel.com.ar/api/cs2/players')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Sort by premier rank descending
          const sorted = data.data.sort((a: CS2Player, b: CS2Player) => {
            const rankA = a.ranks?.premier || 0;
            const rankB = b.ranks?.premier || 0;
            return rankB - rankA;
          });
          setPlayers(sorted);
        } else {
          setError('Error al cargar datos');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Error de conexión');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-t-2 border-emerald-500 rounded-full mb-4"></div>
        <p className="text-slate-400">Cargando ranking de CS2...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-3xl">🔫</div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">CS2 Premier Ranking</h2>
            <p className="text-slate-400 text-sm">Clasificación general basada en el rating Premier</p>
          </div>
        </div>

        <div className="w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[10px] sm:text-sm uppercase tracking-wider">
                <th className="pb-2 font-semibold pl-2 sm:pl-4 w-10">#</th>
                <th className="pb-2 font-semibold">Jugador</th>
                <th className="pb-2 font-semibold text-right pr-2 sm:pr-0">Premier</th>
                <th className="pb-2 font-semibold text-right hidden lg:table-cell">Matches</th>
                <th className="pb-2 font-semibold text-right pr-2 sm:pr-4">Winrate</th>
                <th className="pb-2 font-semibold text-right hidden sm:table-cell">AIM</th>
                <th className="pb-2 font-semibold text-right hidden md:table-cell">HS %</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const premierRank = player.ranks?.premier || 0;
                
                // Color coding for premier ranks (approximations)
                let colorClass = "text-slate-300";
                if (premierRank >= 20000) colorClass = "text-yellow-400 font-bold";
                else if (premierRank >= 15000) colorClass = "text-purple-400 font-bold";
                else if (premierRank >= 10000) colorClass = "text-pink-400 font-bold";
                else if (premierRank >= 5000) colorClass = "text-blue-400 font-bold";

                return (
                  <tr 
                    key={player._id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors duration-75 cursor-pointer group"
                    onClick={() => navigate(`/cs2/player/${player.steam64_id}`)}
                  >
                    <td className="py-3 sm:py-4 pl-2 sm:pl-4">
                      <div className={`
                        w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm
                        ${index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                          index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' : 
                          index === 2 ? 'bg-orange-800/20 text-orange-400 border border-orange-800/30' : 
                          'bg-white/5 text-slate-400'}
                      `}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 sm:py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white group-hover:text-emerald-400 transition-colors text-xs sm:text-base break-words">
                          {player.alias || player.name}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-500 line-clamp-1">{player.name}</span>
                      </div>
                    </td>
                    <td className="py-3 sm:py-4 text-right pr-2 sm:pr-0">
                      <span className={`text-sm sm:text-lg font-black tracking-tight ${colorClass}`}>
                        {premierRank.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 sm:py-4 text-right text-slate-300 hidden lg:table-cell">
                      {player.total_matches}
                    </td>
                    <td className="py-3 sm:py-4 text-right pr-2 sm:pr-4">
                      <div className="flex flex-col items-end">
                        <span className={`font-bold text-xs sm:text-base ${player.winrate >= 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(player.winrate * 100).toFixed(1)}%
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-500 block lg:hidden">{player.total_matches} Partidos</span>
                      </div>
                    </td>
                    <td className="py-3 sm:py-4 text-right hidden sm:table-cell text-slate-300 text-xs sm:text-base">
                      {player.rating?.aim?.toFixed(1) || '-'}
                    </td>
                    <td className="py-3 sm:py-4 text-right hidden md:table-cell text-slate-300 text-xs sm:text-base">
                      {player.stats?.accuracy_head?.toFixed(1) ? player.stats?.accuracy_head?.toFixed(1) + '%' : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
