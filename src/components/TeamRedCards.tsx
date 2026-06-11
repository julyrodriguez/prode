import { useEffect, useState } from 'react';

// Cache for match details promise to deduplicate concurrent requests (home and away)
// and prevent rapid refetching within 15 seconds.
const matchDetailPromises = new Map<number, { promise: Promise<any[]>; timestamp: number }>();

function getMatchIncidentsCached(matchId: number): Promise<any[]> {
  const now = Date.now();
  const cached = matchDetailPromises.get(matchId);

  if (cached && (now - cached.timestamp < 15000)) { // 15 seconds cache window
    return cached.promise;
  }

  const promise = fetch(`https://apivacas.jariel.com.ar/api/matches/detail/${matchId}`)
    .then(r => r.json())
    .then(d => {
      const matchData = d.events ? d.events[0] : d;
      return matchData?.incidents || [];
    })
    .catch(() => {
      // On error, remove from cache so the next call retries
      matchDetailPromises.delete(matchId);
      return [];
    });

  matchDetailPromises.set(matchId, { promise, timestamp: now });
  return promise;
}

interface TeamRedCardsProps {
  matchId: number;
  hasStarted: boolean;
  isLive: boolean;
  isHome: boolean;
}

export default function TeamRedCards({
  matchId,
  hasStarted,
  isLive,
  isHome
}: TeamRedCardsProps) {
  const [redCards, setRedCards] = useState<number>(0);

  useEffect(() => {
    if (!hasStarted) {
      setRedCards(0);
      return;
    }

    let isMounted = true;
    const updateRedCards = () => {
      getMatchIncidentsCached(matchId)
        .then(incidents => {
          if (!isMounted) return;
          const count = incidents.filter((inc: any) =>
            inc.incidentType === 'card' &&
            inc.incidentClass !== 'yellow' &&
            inc.isHome === isHome
          ).length;
          setRedCards(count);
        })
        .catch(() => {
          if (isMounted) setRedCards(0);
        });
    };

    updateRedCards();

    if (isLive) {
      const interval = setInterval(updateRedCards, 30000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
    return () => {
      isMounted = false;
    };
  }, [matchId, hasStarted, isLive, isHome]);

  if (redCards === 0) return null;

  return (
    <div className="absolute -top-[7px] left-0 flex gap-0.5 pointer-events-none z-10 select-none">
      {Array.from({ length: redCards }).map((_, i) => (
        <span
          key={i}
          className="w-[5px] h-[8px] bg-red-600 rounded-[0.5px] inline-block border border-red-800/50 shadow-[0_0_5px_rgba(220,38,38,0.9)]"
          title="Tarjeta Roja"
        />
      ))}
    </div>
  );
}
