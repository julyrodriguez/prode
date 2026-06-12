import { useTheme } from '../context/ThemeContext';

export default function MatchSkeleton() {
  const { isLite } = useTheme();

  if (isLite) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 bg-[#0b1015]/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="animate-spin w-6 h-6 rounded-full border-2 border-emerald-400 border-r-transparent" />
        <span className="text-sm font-black text-slate-300 tracking-wider">Cargando partidos...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 2 secciones simuladas de torneos */}
      {[1, 2].map((sectionIndex) => (
        <div key={sectionIndex} className="flex flex-col gap-4 animate-pulse">
          {/* Cabecera del Torneo */}
          <div className="flex items-center gap-4 px-2">
            <div className="w-32 h-5 bg-white/10 rounded-lg" />
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Bento Grid para los Partidos */}
          <div className="flex flex-col bg-[#0b1015]/60 border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
            {[1, 2, 3].map((cardIndex) => (
              <div
                key={cardIndex}
                className="grid grid-cols-[60px_1fr] md:grid-cols-[80px_1fr] items-stretch border-b border-white/5 last:border-0 py-3.5"
              >
                {/* Columna Izquierda: Logo Torneo y Tiempo */}
                <div className="flex flex-col items-center justify-center border-r border-white/5 px-1">
                  <div className="w-5 h-5 md:w-6 md:h-6 bg-white/10 rounded-full mb-2" />
                  <div className="w-10 h-3 bg-white/5 rounded" />
                </div>

                {/* Columna Derecha: Equipos, Score */}
                <div className="flex flex-col py-2 px-2 md:px-4 justify-center relative">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-4">
                    
                    {/* HOME TEAM */}
                    <div className="flex items-center justify-end gap-2 md:gap-3 text-right">
                      <div className="flex flex-col items-end gap-1.5 min-w-0">
                        <div className="w-16 sm:w-28 h-3.5 bg-white/10 rounded" />
                        <div className="w-8 h-2.5 bg-white/5 rounded" />
                      </div>
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-white/10 rounded-full shrink-0" />
                    </div>

                    {/* CENTER */}
                    <div className="w-12 h-6 bg-white/10 rounded-lg" />

                    {/* AWAY TEAM */}
                    <div className="flex items-center justify-start gap-2 md:gap-3 text-left">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-white/10 rounded-full shrink-0" />
                      <div className="flex flex-col items-start gap-1.5 min-w-0">
                        <div className="w-16 sm:w-28 h-3.5 bg-white/10 rounded" />
                        <div className="w-8 h-2.5 bg-white/5 rounded" />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
