/**
 * matchCache.ts
 * Caché en memoria de detalles de partidos.
 * Los datos se guardan en window.__matchDetailCache__ para que sobrevivan
 * navegaciones client-side de Next.js sin necesidad de librerías externas.
 */

const CACHE_KEY = '__matchDetailCache__';

/** TTL por defecto: 60 segundos para partidos pendientes/finalizados */
const TTL_DEFAULT_MS = 60_000;
/**
 * TTL corto para partidos en vivo: usamos 10 segundos.
 * En la práctica esto significa que si los datos tienen más de 10 segundos,
 * MatchDetailView los ignora y muestra el spinner (comportamiento original).
 */
export const TTL_LIVE_MS = 10_000;

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

/**
 * Devuelve los datos cacheados para un partido, o null si no existen / expiraron.
 * @param ttlMs TTL en ms (por defecto 60s). Pasar TTL_LIVE_MS para partidos en vivo.
 */
export function getMatch(id: string | number, ttlMs = TTL_DEFAULT_MS): any | null {
  const entry = store()[String(id)];
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) return null;
  return entry.data;
}

/** Guarda los datos de un partido en el caché. */
export function setMatch(id: string | number, data: any): void {
  store()[String(id)] = { data, at: Date.now() };
}

const API_BASE = 'https://apivacas.jariel.com.ar/api/matches/detail';

/** Detecta si un partido está en vivo según sus datos */
function isLiveMatch(matchData: any): boolean {
  const status = matchData?.status;
  if (!status) return false;
  if (typeof status === 'string') return status === 'inprogress';
  if (typeof status === 'object') return status.type === 'inprogress';
  return false;
}

/**
 * Prefetchea los detalles de una lista de IDs de partidos en segundo plano,
 * escalonando las requests para no saturar la API.
 * Los partidos en vivo se saltean (sus datos cambian demasiado rápido para ser útiles).
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

        // No cacheamos partidos en vivo — sus datos son demasiado volátiles
        if (!isLiveMatch(matchData)) {
          setMatch(id, matchData);
        }
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
