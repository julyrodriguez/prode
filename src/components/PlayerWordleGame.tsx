import { useState, useEffect, useRef, useCallback } from 'react';

export interface Player {
  nombre: string;
  seleccion: string;
  grupo: string;
  liga: string;
  edad: number;
  posicion: string;
}

interface PlayerWordleGameProps {
  userId: string;
  jugadorDelDia: Player;
  playersList: Player[];
}



export default function PlayerWordleGame({ userId, jugadorDelDia, playersList }: PlayerWordleGameProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Player[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [guesses, setGuesses] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [points, setPoints] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  // API Syncing state
  const [isSaving, setIsSaving] = useState(false);
  const [savedToApi, setSavedToApi] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const autocompleteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current YYYY-MM-DD date string (in UTC to sync with server daily reset at 21:00 hs AR)
  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Load state on mount/userId change (fetch from MongoDB backend)
  useEffect(() => {
    if (!userId || !jugadorDelDia) return;

    const fetchGameState = async () => {
      setIsLoading(true);
      setSaveError(null);
      const todayStr = getTodayDateString();

      try {
        const res = await fetch(`https://apivacas.jariel.com.ar/api/games/mundial/games/wordle/state?userId=${userId}&gameId=wordle_jugador&date=${todayStr}`);
        if (res.ok) {
          const data = await res.json();
          if (data.played && data.state && data.state.date === todayStr) {
            const serverState = data.state;
            const loadedGuesses = (serverState.guesses || [])
              .map((name: string) => playersList.find(p => p.nombre.toLowerCase() === name.toLowerCase()))
              .filter((p: Player | undefined): p is Player => p !== undefined);

            setGuesses(loadedGuesses);
            setGameStatus(serverState.status);
            setPoints(serverState.points);
            setSavedToApi(serverState.completed || serverState.status !== 'playing');
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching backend game state:', err);
      }

      // Start fresh daily game state
      setGuesses([]);
      setGameStatus('playing');
      setPoints(0);
      setSavedToApi(false);
      setIsLoading(false);
    };

    fetchGameState();
  }, [userId, jugadorDelDia, playersList]);

  // Sync to API helper (sends final state to MongoDB database state route)
  const syncScoreToApi = useCallback(async (scorePoints: number) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch('https://apivacas.jariel.com.ar/api/games/mundial/games/wordle/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gameId: 'wordle_jugador',
          date: getTodayDateString(),
          guesses: guesses.map(g => g.nombre),
          status: gameStatus,
          points: scorePoints,
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar la puntuación en el servidor.');
      }

      setSavedToApi(true);
    } catch (err: unknown) {
      console.error('API Sync Error:', err);
      setSaveError('Error al conectar con el servidor. Podés intentar re-guardar tus puntos.');
    } finally {
      setIsSaving(false);
    }
  }, [userId, guesses, gameStatus]);

  // Handle Autocomplete selection (saves guess to MongoDB state route on every attempt)
  const selectPlayer = async (player: Player) => {
    setInputValue('');
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);

    if (gameStatus !== 'playing') return;

    // Add to guesses
    const newGuesses = [...guesses, player];
    setGuesses(newGuesses);

    // Check game condition
    const isCorrect = player.nombre.toLowerCase() === jugadorDelDia.nombre.toLowerCase();
    const attempts = newGuesses.length;

    let newStatus: 'playing' | 'won' | 'lost' = 'playing';
    let calculatedPoints = 0;

    if (isCorrect) {
      newStatus = 'won';
      const pointsTable: Record<number, number> = {
        1: 100,
        2: 80,
        3: 60,
        4: 40,
        5: 20,
        6: 10
      };
      calculatedPoints = pointsTable[attempts] || 0;
      setPoints(calculatedPoints);
      setGameStatus('won');
    } else if (attempts >= 6) {
      newStatus = 'lost';
      calculatedPoints = 0;
      setPoints(0);
      setGameStatus('lost');
    }

    // Sync attempt/guess state to backend immediately
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch('https://apivacas.jariel.com.ar/api/games/mundial/games/wordle/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gameId: 'wordle_jugador',
          date: getTodayDateString(),
          guesses: newGuesses.map(g => g.nombre),
          status: newStatus,
          points: calculatedPoints,
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar la puntuación en el servidor.');
      }

      const isFinished = newStatus !== 'playing';
      if (isFinished) {
        setSavedToApi(true);
      }
    } catch (err: unknown) {
      console.error('Save progress error:', err);
      setSaveError(newStatus !== 'playing'
        ? 'Error al guardar la puntuación final en el servidor. Podés intentar re-guardar.'
        : 'Error al sincronizar tu intento con el servidor.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Filter suggestions when input changes
  useEffect(() => {
    if (inputValue.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    const filtered = playersList
      .filter(player => {
        const isMatch = player.nombre.toLowerCase().includes(inputValue.toLowerCase()) ||
          player.seleccion.toLowerCase().includes(inputValue.toLowerCase());
        const alreadyGuessed = guesses.some(g => g.nombre.toLowerCase() === player.nombre.toLowerCase());
        return isMatch && !alreadyGuessed;
      })
      .slice(0, 6); // Cap suggestion length at 6 for clean UX

    setSuggestions(filtered);
    setActiveSuggestionIndex(prev => {
      if (filtered.length === 0) return -1;
      if (prev >= filtered.length) return filtered.length - 1;
      return prev;
    });
  }, [inputValue, guesses, playersList]);

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation inside input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        selectPlayer(suggestions[activeSuggestionIndex]);
      } else if (suggestions.length > 0) {
        // default select first option if none is selected
        selectPlayer(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center bg-[#0b0f19]/90 border border-white/10 rounded-[2.5rem] p-12 shadow-2xl min-h-[400px] relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="animate-spin w-10 h-10 border-t-2 border-emerald-500 rounded-full mb-4"></div>
        <span className="text-slate-400 font-medium text-sm">Cargando partida diaria...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center bg-[#0b0f19]/90 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-visible">
      {/* Background radial glow */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header Info */}
      <div className="w-full flex items-center justify-between border-b border-white/5 pb-4 mb-6 relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase">JUEGO DIARIO</span>
          <h2 className="text-xl sm:text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            Adiviná el Jugador
          </h2>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase">INTENTOS</span>
          <span className="text-lg font-black text-white">{guesses.length} / 6</span>
        </div>
      </div>

      {/* Guesses Board */}
      <div className="w-full flex flex-col gap-3 relative z-10 mb-6 min-h-[180px] overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header Row */}
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-1 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span className="text-left pl-2">Jugador</span>
            <span>Selección</span>
            <span>Grupo</span>
            <span>Liga</span>
            <span>Edad</span>
            <span>Posición</span>
          </div>

          {/* Attempts History */}
          <div className="flex flex-col gap-2">
            {guesses.map((guess, idx) => {
              const isCorrectSeleccion = guess.seleccion.toLowerCase() === jugadorDelDia.seleccion.toLowerCase();
              const isCorrectGrupo = guess.grupo.toLowerCase() === jugadorDelDia.grupo.toLowerCase();
              const isCorrectLiga = guess.liga.toLowerCase() === jugadorDelDia.liga.toLowerCase();
              const isCorrectEdad = guess.edad === jugadorDelDia.edad;
              const isCorrectPosicion = guess.posicion.toLowerCase() === jugadorDelDia.posicion.toLowerCase();

              return (
                <div
                  key={idx}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center text-center text-xs font-bold animate-fade-in"
                >
                  {/* Name cell */}
                  <div className={`text-left pl-3 py-3 rounded-xl border border-white/5 bg-white/[0.02] text-slate-200 truncate`}>
                    {guess.nombre}
                  </div>

                  {/* Selección */}
                  <div className={`py-3 rounded-xl flex items-center justify-center text-white transition-all duration-200 ${isCorrectSeleccion ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-rose-500/85'}`}>
                    {guess.seleccion}
                  </div>

                  {/* Grupo */}
                  <div className={`py-3 rounded-xl flex items-center justify-center text-white transition-all duration-200 ${isCorrectGrupo ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-rose-500/85'}`}>
                    {guess.grupo}
                  </div>

                  {/* Liga */}
                  <div className={`py-3 rounded-xl flex items-center justify-center text-white transition-all duration-200 ${isCorrectLiga ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-rose-500/85'}`}>
                    {guess.liga}
                  </div>

                  {/* Edad */}
                  <div className={`py-3 rounded-xl flex items-center justify-center gap-1 text-white transition-all duration-200 ${isCorrectEdad ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-rose-500/85'}`}>
                    <span>{guess.edad}</span>
                    {!isCorrectEdad && (
                      <span className="text-xs font-black">
                        {jugadorDelDia.edad > guess.edad ? '↑' : '↓'}
                      </span>
                    )}
                  </div>

                  {/* Posición */}
                  <div className={`py-3 rounded-xl flex items-center justify-center text-white transition-all duration-200 ${isCorrectPosicion ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-rose-500/85'}`}>
                    {guess.posicion}
                  </div>
                </div>
              );
            })}

            {/* Empty boxes for remaining attempts */}
            {Array.from({ length: 6 - guesses.length }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center"
              >
                <div className="h-11 rounded-xl border border-white/10 bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" />
                <div className="h-11 rounded-xl border border-white/10 bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" />
                <div className="h-11 rounded-xl border border-white/10 bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" />
                <div className="h-11 rounded-xl border border-white/10 bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" />
                <div className="h-11 rounded-xl border border-white/10 bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" />
                <div className="h-11 rounded-xl border border-white/10 bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Autocomplete Input Form */}
      {gameStatus === 'playing' ? (
        <div
          ref={autocompleteRef}
          className="w-full relative z-20 mt-4 max-w-md"
        >
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí el nombre de un jugador..."
              className="w-full pl-5 pr-12 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-sm font-semibold transition"
            />
            <span className="absolute right-4 text-slate-500 text-lg">🔍</span>
          </div>

          {/* Autocomplete suggestion dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#0e1424] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-30 divide-y divide-white/5">
              {suggestions.map((player, index) => {
                const isActive = index === activeSuggestionIndex;
                return (
                  <button
                    key={player.nombre}
                    onClick={() => selectPlayer(player)}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    className={`w-full flex items-center justify-between px-5 py-3 text-left text-sm transition-colors ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-300 hover:bg-white/[0.02]'}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold">{player.nombre}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {player.seleccion} • {player.posicion} • {player.edad} años
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{player.liga}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* End Screen States (Winner / Loser Card) */
        <div className="w-full max-w-md bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center animate-fade-in relative z-20">
          {gameStatus === 'won' ? (
            <>
              <span className="text-5xl animate-bounce mb-2">🎉</span>
              <h3 className="text-2xl font-black text-emerald-400 uppercase tracking-wide">¡Logrado!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                Adivinaste a <strong>{jugadorDelDia.nombre}</strong> en {guesses.length} {guesses.length === 1 ? 'intento' : 'intentos'}.
              </p>
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl min-w-[160px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Puntos sumados</span>
                <span className="text-3xl font-black text-emerald-400">+{points}</span>
              </div>
            </>
          ) : (
            <>
              <span className="text-5xl mb-2">💀</span>
              <h3 className="text-2xl font-black text-rose-500 uppercase tracking-wide">Fin del Juego</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                No pudiste adivinar. El jugador oculto era:
              </p>
              <div className="mt-3 text-lg font-black text-white tracking-wide bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl">
                {jugadorDelDia.nombre}
              </div>
              <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl min-w-[160px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Puntos sumados</span>
                <span className="text-3xl font-black text-rose-400">0</span>
              </div>
            </>
          )}

          {/* Syncing indicators */}
          {isSaving && (
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mt-5 animate-pulse">
              <div className="w-4 h-4 border-2 border-t-transparent border-amber-400 rounded-full animate-spin" />
              <span>Guardando puntuación diaria...</span>
            </div>
          )}

          {savedToApi && (
            <div className="mt-5 flex flex-col items-center gap-1.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 max-w-[280px]">
              <div className="flex items-center gap-2">
                <span className="text-base">✅</span>
                <span className="font-bold text-xs uppercase tracking-wide">¡Sincronización Exitosa!</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium leading-normal">
                Tus puntos del día fueron guardados con éxito en el Prode general.
              </span>
            </div>
          )}

          {saveError && (
            <div className="mt-5 flex flex-col items-center gap-3">
              <span className="text-xs text-amber-500 font-semibold leading-relaxed max-w-[260px]">
                ⚠️ {saveError}
              </span>
              <button
                onClick={() => syncScoreToApi(points)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-amber-500/10"
              >
                Reintentar Guardado
              </button>
            </div>
          )}

          <p className="text-[10px] text-slate-500 font-medium mt-6 leading-relaxed border-t border-white/5 pt-4 w-full">
            Este juego es diario. Mañana habrá un nuevo jugador oculto para adivinar. ¡Vuelve mañana!
          </p>
        </div>
      )}
    </div>
  );
}
