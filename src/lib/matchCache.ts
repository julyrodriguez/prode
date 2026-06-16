/**
 * matchCache.ts
 * Caché en memoria de detalles de partidos.
 * Los datos se guardan en window.__matchDetailCache__ para que sobrevivan
 * navegaciones client-side de Next.js sin necesidad de librerías externas.
 */

const CACHE_KEY = '__matchDetailCache__';
const TTL_MS = 60_000; // 1 minuto

interface CacheEntry {
  data: any;
  at: number;
}

function store(): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {};
  const w = window as any;
  if (!w[CACHE_KEY]) w[CACHE_KEY] = {};
  return w[CACHE_KEY];
}

/** Devuelve los datos cacheados para un partido, o null si no existen / expiraron. */
export function getMatch(id: string | number): any | null {
  const entry = store()[String(id)];
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) return null;
  return entry.data;
}

/** Guarda los datos de un partido en el caché. */
export function setMatch(id: string | number, data: any): void {
  store()[String(id)] = { data, at: Date.now() };
}

const API_BASE = 'https://apivacas.jariel.com.ar/api/matches/detail';

/**
 * Prefetchea los detalles de una lista de IDs de partidos en segundo plano,
 * escalonando las requests para no saturar la API.
 *
 * @param ids         Lista de IDs a prefetchear
 * @param delayMs     Retardo inicial antes de empezar (default 800ms)
 * @param betweenMs   Pausa entre cada request (default 150ms)
 * @returns           Función para cancelar el proceso
 */
export function prefetchMatches(
  ids: (string | number)[],
  delayMs = 800,
  betweenMs = 150,
): () => void {
  let cancelled = false;

  const run = async () => {
    await new Promise(r => setTimeout(r, delayMs));

    for (const id of ids) {
      if (cancelled) break;

      // Saltamos los que ya están en caché y siguen frescos
      if (getMatch(id)) {
        continue;
      }

      try {
        const res = await fetch(`${API_BASE}/${id}`);
        if (!res.ok) continue;
        const data = await res.json();
        const matchData = data.events ? data.events[0] : data;
        setMatch(id, matchData);
      } catch {
        // Silencioso — es prefetch, no bloqueante
      }

      if (!cancelled) {
        await new Promise(r => setTimeout(r, betweenMs));
      }
    }
  };

  run();
  return () => { cancelled = true; };
}
