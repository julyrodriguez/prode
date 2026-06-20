import { useEffect, useState, useRef } from 'react';

const API_BASE = 'https://apivacas.jariel.com.ar';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function getTodayART(): string {
  const now = new Date();
  const art = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return art.toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function displayDate(date: string): string {
  const today = getTodayART();
  if (date === today) return 'Hoy';
  if (date === shiftDate(today, 1)) return 'Mañana';
  if (date === shiftDate(today, -1)) return 'Ayer';
  const d = new Date(date + 'T12:00:00Z');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
}

/** Genera un color determinista (hsl) a partir de un string */
function teamColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return `hsl(${Math.abs(h) % 360}, 55%, 50%)`;
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface CS2Team { name: string; localLogo: string; score: number; }
interface CS2Match {
  _id: string;
  hltvId: number;
  team1: CS2Team;
  team2: CS2Team;
  event: string;
  format: string;
  status: 'upcoming' | 'live' | 'finished';
  date: string;
  horaArgentina?: string;
  lastUpdate: string;
}

/* ─── TeamLogo: fallback con inicial estilizada ──────────────────────────── */
function TeamLogo({ src, name }: { src: string; name: string }) {
  const [err, setErr] = useState(false);
  const color = teamColor(name);

  if (err || !src) {
    // Inicial(es): si tiene espacio usa primera de cada palabra, si no las primeras 2 letras
    const words = name.trim().split(/\s+/);
    const initials = words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    return (
      <div className="cs2-team-logo" style={{
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        borderColor: `${color}55`,
        boxShadow: `0 0 8px ${color}33`,
      }}>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 900,
          color,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          textShadow: `0 0 8px ${color}88`,
        }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className="cs2-team-logo">
      <img
        src={src}
        alt={name}
        className="w-full h-full object-contain"
        onError={() => setErr(true)}
      />
    </div>
  );
}

/* ─── Badges ─────────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: CS2Match['status'] }) {
  if (status === 'live') return (
    <span className="cs2-badge cs2-badge-live">
      <span className="cs2-live-dot" /> LIVE
    </span>
  );
  if (status === 'finished') return <span className="cs2-badge cs2-badge-finished">Finalizado</span>;
  return <span className="cs2-badge cs2-badge-upcoming">Próximo</span>;
}

/* ─── Match Card ─────────────────────────────────────────────────────────── */
function CS2MatchCard({ match }: { match: CS2Match }) {
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const t1Won = isFinished && match.team1.score > match.team2.score;
  const t2Won = isFinished && match.team2.score > match.team1.score;

  const hora = match.horaArgentina
    ?? new Date(match.date).toLocaleTimeString('es-AR', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires'
    });

  return (
    <div className={`cs2-card${isLive ? ' cs2-card-live' : ''}`}>
      {isLive && <div className="cs2-card-glow" />}

      {/* Header */}
      <div className="cs2-card-header">
        <div className="cs2-card-event">
          <span className="cs2-event-dot" />
          <span className="cs2-event-name">{match.event}</span>
        </div>
        <div className="cs2-card-meta">
          <span className="cs2-badge cs2-badge-format">{match.format}</span>
          <StatusBadge status={match.status} />
        </div>
      </div>

      {/* Teams */}
      <div className="cs2-teams-row">
        {/* Team 1 */}
        <div className={`cs2-team cs2-team-left${t1Won ? ' cs2-winner' : ''}${t2Won ? ' cs2-loser' : ''}`}>
          <TeamLogo src={match.team1.localLogo} name={match.team1.name} />
          <span className="cs2-team-name">{match.team1.name}</span>
        </div>

        {/* Centro */}
        <div className="cs2-center-col">
          {isFinished ? (
            <div className="cs2-score-box">
              <span className={`cs2-score${t1Won ? ' cs2-score-win' : ''}`}>{match.team1.score}</span>
              <span className="cs2-score-sep">:</span>
              <span className={`cs2-score${t2Won ? ' cs2-score-win' : ''}`}>{match.team2.score}</span>
            </div>
          ) : isLive ? (
            <div className="cs2-live-center">
              <span className="cs2-live-dot" />
              <span className="cs2-live-label">LIVE</span>
            </div>
          ) : (
            <div className="cs2-vs-box">
              <span className="cs2-vs">VS</span>
              <span className="cs2-hora">{hora}</span>
            </div>
          )}
        </div>

        {/* Team 2 */}
        <div className={`cs2-team cs2-team-right${t2Won ? ' cs2-winner' : ''}${t1Won ? ' cs2-loser' : ''}`}>
          <span className="cs2-team-name">{match.team2.name}</span>
          <TeamLogo src={match.team2.localLogo} name={match.team2.name} />
        </div>
      </div>

      {/* Footer */}
      {isLive && (
        <div className="cs2-footer cs2-footer-live">
          <span className="cs2-live-dot" />
          <span>Partido en curso · {hora} hs</span>
        </div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function CS2MatchesSection() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayART);
  const [matches, setMatches] = useState<CS2Match[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Fetch matches for the selected date.
   * The API now handles finished matches correctly within the date-based endpoint.
   */
  const fetchAll = (date: string, signal?: AbortSignal) =>
    fetch(`${API_BASE}/api/cs2/matches/${date}`, signal ? { signal } : {})
      .then(r => r.ok ? r.json() : [])
      .then(dayMatches => {
        const all: CS2Match[] = Array.isArray(dayMatches) ? dayMatches : [];
        const order = { live: 0, upcoming: 1, finished: 2 };
        all.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
        return all;
      })
      .catch(() => []);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const isFirst = matches.length === 0;
    if (isFirst) setFetching(true);
    else setRefetching(true);

    fetchAll(selectedDate, ctrl.signal)
      .then(merged => {
        if (!ctrl.signal.aborted) setMatches(merged);
      })
      .catch(e => {
        if (e.name !== 'AbortError') console.warn('[CS2] fetch error:', e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) { setFetching(false); setRefetching(false); }
      });

    // Auto-refresh silencioso cada 60 s
    const tick = setInterval(() => {
      fetchAll(selectedDate)
        .then(merged => { if (merged.length > 0) setMatches(merged); })
        .catch(() => { });
    }, 60_000);

    return () => { ctrl.abort(); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const goDay = (delta: number) =>
    setSelectedDate(cur => shiftDate(cur, delta));

  const liveCount = matches.filter(m => m.status === 'live').length;

  return (
    <>
      <style>{CSS}</style>
      <section className="cs2-section">

        {/* Divisor */}
        <div className="cs2-divider">
          <div className="cs2-divider-line" />
          <div className="cs2-divider-badge">
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18" style={{ filter: 'drop-shadow(0 0 5px #f9731680)' }}>
              <rect width="20" height="20" rx="4" fill="url(#dg2)" />
              <path d="M4 10 L8 6 L12 10 L8 14Z" fill="white" opacity="0.9" />
              <path d="M8 10 L12 6 L16 10 L12 14Z" fill="white" opacity="0.4" />
              <defs>
                <linearGradient id="dg2" x1="0" y1="0" x2="20" y2="20">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
            </svg>
            Counter-Strike 2
            {liveCount > 0 && (
              <span className="cs2-divider-live">
                <span className="cs2-live-dot" />{liveCount} live
              </span>
            )}
          </div>
          <div className="cs2-divider-line" />
        </div>

        {/* Header */}
        <div className="cs2-header">
          <div className="cs2-header-content">
            <svg viewBox="0 0 40 40" fill="none" width="40" height="40" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 12px #f9731680)' }}>
              <rect width="40" height="40" rx="8" fill="url(#hg)" />
              <path d="M8 20 L16 12 L24 20 L16 28Z" fill="white" opacity="0.9" />
              <path d="M16 20 L24 12 L32 20 L24 28Z" fill="white" opacity="0.4" />
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
            </svg>
            <div className="cs2-title-block">
              <h2 className="cs2-title">Counter-Strike 2</h2>
              <p className="cs2-subtitle">Cartelera competitiva</p>
            </div>
          </div>

          {/* ── Navegador de días ── */}
          <div className="cs2-date-nav">
            <button
              className="cs2-nav-btn"
              onClick={() => goDay(-1)}
              title="Día anterior"
            >‹</button>
            <div className="cs2-date-display">
              <span className="cs2-date-label">FECHA</span>
              <span className="cs2-date-value">{displayDate(selectedDate)}</span>
            </div>
            <button
              className="cs2-nav-btn"
              onClick={() => goDay(+1)}
              title="Día siguiente"
            >›</button>
          </div>
        </div>

        {/* Barra de progreso para refetch */}
        {refetching && <div className="cs2-progress-bar"><div className="cs2-progress-fill" /></div>}

        {/* Contenido: agrupado por status */}
        {fetching ? (
          <div className="cs2-state-box">
            <div className="cs2-spinner" />
            <span>Cargando partidos...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="cs2-state-box">
            <span style={{ fontSize: '2.2rem', opacity: 0.4 }}>🎯</span>
            <p>Sin partidos de CS2 para <strong style={{ color: '#fb923c' }}>{displayDate(selectedDate)}</strong></p>
          </div>
        ) : (
          <div className={refetching ? 'cs2-grid-loading' : ''}>

            {/* ── LIVE ── */}
            {matches.filter(m => m.status === 'live').length > 0 && (
              <div className="cs2-group">
                <div className="cs2-group-header cs2-group-header-live">
                  <span className="cs2-live-dot" />
                  <span>En Vivo</span>
                  <span className="cs2-group-count">{matches.filter(m => m.status === 'live').length}</span>
                </div>
                <div className="cs2-grid">
                  {matches.filter(m => m.status === 'live').map(m => (
                    <CS2MatchCard key={m._id || m.hltvId} match={m} />
                  ))}
                </div>
              </div>
            )}

            {/* ── UPCOMING ── */}
            {matches.filter(m => m.status === 'upcoming').length > 0 && (
              <div className="cs2-group">
                <div className="cs2-group-header cs2-group-header-upcoming">
                  <span>⏳</span>
                  <span>Próximos</span>
                  <span className="cs2-group-count">{matches.filter(m => m.status === 'upcoming').length}</span>
                </div>
                <div className="cs2-grid">
                  {matches.filter(m => m.status === 'upcoming').map(m => (
                    <CS2MatchCard key={m._id || m.hltvId} match={m} />
                  ))}
                </div>
              </div>
            )}

            {/* ── FINISHED ── */}
            {matches.filter(m => m.status === 'finished').length > 0 && (
              <div className="cs2-group">
                <div className="cs2-group-header cs2-group-header-finished">
                  <span>✅</span>
                  <span>Resultados</span>
                  <span className="cs2-group-count">{matches.filter(m => m.status === 'finished').length}</span>
                </div>
                <div className="cs2-grid">
                  {matches.filter(m => m.status === 'finished').map(m => (
                    <CS2MatchCard key={m._id || m.hltvId} match={m} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </section>
    </>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const CSS = `
.cs2-section{display:flex;flex-direction:column;gap:1rem;margin-top:2.5rem}

/* groups */
.cs2-group{display:flex;flex-direction:column;gap:.65rem}
.cs2-group-header{display:flex;align-items:center;gap:.55rem;padding:.5rem .8rem;border-radius:.75rem;font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border:1px solid transparent}
.cs2-group-header-live{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.22);color:#f87171}
.cs2-group-header-upcoming{background:rgba(234,88,12,.07);border-color:rgba(234,88,12,.18);color:rgba(251,146,60,.85)}
.cs2-group-header-finished{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.07);color:rgba(148,163,184,.5)}
.cs2-group-count{margin-left:auto;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:.05rem .45rem;font-size:.62rem;font-weight:900;color:inherit;opacity:.7}

/* divider */
.cs2-divider{display:flex;align-items:center;gap:.75rem}
.cs2-divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(234,88,12,.28),transparent)}
.cs2-divider-badge{display:flex;align-items:center;gap:.45rem;padding:.28rem .85rem .28rem .45rem;background:rgba(15,23,42,0.65);border:1px solid rgba(234,88,12,.35);border-radius:999px;font-size:.68rem;font-weight:800;color:#f97316;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,0.3)}
.cs2-divider-live{display:flex;align-items:center;gap:.3rem;padding:.12rem .5rem;background:rgba(239,68,68,.16);border:1px solid rgba(239,68,68,.32);border-radius:999px;font-size:.6rem;font-weight:900;color:#f87171;margin-left:.2rem}

/* header */
.cs2-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1.5rem;padding:1.2rem 1.5rem;background:rgba(15,23,42,0.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(234,88,12,.28);border-radius:1.2rem;position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4),inset 0 1px 1px rgba(255,255,255,.05)}
.cs2-header::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(234,88,12,.015) 12px,rgba(234,88,12,.015) 24px);pointer-events:none}
.cs2-header-content{display:flex;align-items:center;gap:1rem}
.cs2-title-block{display:flex;flex-direction:column}
.cs2-title{font-size:1.4rem;font-weight:900;background:linear-gradient(90deg,#fb923c,#f97316,#ef4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.02em;margin:0}
.cs2-subtitle{font-size:.68rem;color:rgba(203,213,225,.75);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:.12rem 0 0}

/* date nav */
.cs2-date-nav{display:flex;align-items:center;gap:.6rem;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);border-radius:1.1rem;padding:.4rem .6rem;position:relative;z-index:1}
.cs2-nav-btn{width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:.55rem;color:rgba(203,213,225,.85);font-size:1.2rem;font-weight:900;cursor:pointer;transition:background .15s,color .15s,border-color .15s;line-height:1;user-select:none}
.cs2-nav-btn:hover{background:rgba(234,88,12,.18);border-color:rgba(234,88,12,.4);color:#fb923c}
.cs2-nav-btn:active{transform:scale(.93)}
.cs2-date-display{display:flex;flex-direction:column;align-items:center;min-width:86px}
.cs2-date-label{font-size:.56rem;font-weight:800;color:#f97316;letter-spacing:.12em;text-transform:uppercase;line-height:1;margin-bottom:2px}
.cs2-date-value{font-size:.8rem;font-weight:900;color:#e2e8f0;text-transform:capitalize;letter-spacing:-.01em;line-height:1}

/* progress bar */
.cs2-progress-bar{width:100%;height:2px;background:rgba(234,88,12,.12);border-radius:1px;overflow:hidden}
.cs2-progress-fill{height:100%;background:linear-gradient(90deg,#f97316,#ef4444);border-radius:1px;animation:cs2progress 1.2s ease-in-out infinite}
@keyframes cs2progress{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}

/* state box */
.cs2-state-box{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.65rem;padding:2.2rem;color:rgba(148,163,184,.5);font-size:.8rem;font-weight:600;background:rgba(255,255,255,.015);border:1px dashed rgba(255,255,255,.06);border-radius:1.1rem;text-align:center}
.cs2-spinner{width:32px;height:32px;border-radius:50%;border:2.5px solid rgba(234,88,12,.12);border-top-color:#f97316;animation:cs2spin .7s linear infinite}
@keyframes cs2spin{to{transform:rotate(360deg)}}

/* grid */
.cs2-grid{display:grid;grid-template-columns:1fr;gap:.65rem;transition:opacity .25s;width:100%}
.cs2-grid-loading{opacity:.55;pointer-events:none}
.cs2-group{width:100%}
@media(min-width:600px){.cs2-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:960px){.cs2-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:960px){.cs2-card{width:100%;min-width:0;flex:1}}

/* card */
.cs2-card{position:relative;display:flex;flex-direction:column;gap:.75rem;padding:.85rem 1rem;background:linear-gradient(145deg,rgba(14,11,18,.93),rgba(18,11,7,.86));border:1px solid rgba(255,255,255,.065);border-radius:.95rem;overflow:hidden;transition:transform .18s,border-color .18s,box-shadow .18s}
.cs2-card::after{content:'';position:absolute;top:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,rgba(234,88,12,.42),transparent);opacity:0;transition:opacity .22s}
.cs2-card:hover{transform:translateY(-2px);border-color:rgba(234,88,12,.2);box-shadow:0 8px 28px rgba(0,0,0,.45)}
.cs2-card:hover::after{opacity:1}
.cs2-card-live{border-color:rgba(239,68,68,.22);background:linear-gradient(145deg,rgba(20,4,4,.95),rgba(14,4,4,.9))}
.cs2-card-glow{position:absolute;inset:0;border-radius:.95rem;pointer-events:none;box-shadow:inset 0 0 24px rgba(239,68,68,.05);animation:cs2glow 2.8s ease-in-out infinite}
@keyframes cs2glow{0%,100%{opacity:.6}50%{opacity:1}}

/* card header */
.cs2-card-header{display:flex;align-items:center;justify-content:space-between;gap:.4rem}
.cs2-card-event{display:flex;align-items:center;gap:.4rem;flex:1;min-width:0}
.cs2-event-dot{width:5px;height:5px;border-radius:50%;background:#f97316;flex-shrink:0;box-shadow:0 0 5px rgba(249,115,22,.7)}
.cs2-event-name{font-size:.62rem;font-weight:700;color:rgba(148,163,184,.6);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs2-card-meta{display:flex;align-items:center;gap:.3rem;flex-shrink:0}

/* badges */
.cs2-badge{padding:.16rem .45rem;border-radius:5px;font-size:.57rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;border:1px solid transparent}
.cs2-badge-format{background:rgba(99,102,241,.13);border-color:rgba(99,102,241,.22);color:#a5b4fc}
.cs2-badge-live{display:inline-flex;align-items:center;gap:.3rem;background:rgba(239,68,68,.13);border-color:rgba(239,68,68,.28);color:#f87171}
.cs2-badge-finished{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.07);color:rgba(148,163,184,.42)}
.cs2-badge-upcoming{background:rgba(234,88,12,.09);border-color:rgba(234,88,12,.18);color:#fb923c}

/* live dot */
.cs2-live-dot{width:6px;height:6px;border-radius:50%;background:#ef4444;box-shadow:0 0 5px rgba(239,68,68,.85);animation:cs2blink 1.15s ease-in-out infinite;display:inline-block;flex-shrink:0;vertical-align:middle}
@keyframes cs2blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.72)}}

/* teams row */
.cs2-teams-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:.35rem}
.cs2-team{display:flex;align-items:center;gap:.5rem;min-width:0;transition:opacity .2s}
.cs2-team-left{flex-direction:row;justify-content:flex-end}
.cs2-team-right{flex-direction:row;justify-content:flex-start}
.cs2-winner .cs2-team-name{color:#fff;text-shadow:0 0 10px rgba(249,115,22,.38)}
.cs2-winner .cs2-team-logo{box-shadow:0 0 12px rgba(249,115,22,.25);border-color:rgba(249,115,22,.35)!important}
.cs2-loser{opacity:.35}

/* team logo */
.cs2-team-logo{width:34px;height:34px;border-radius:7px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;transition:box-shadow .2s,border-color .2s}
.cs2-team-name{font-size:.78rem;font-weight:800;color:rgba(226,232,240,.88);letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .2s,text-shadow .2s}
@media(max-width:380px){.cs2-team-name{font-size:.67rem}.cs2-team-logo{width:26px;height:26px}}

/* center col */
.cs2-center-col{display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
.cs2-score-box{display:flex;align-items:center;gap:.22rem;padding:.26rem .58rem;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.07);border-radius:7px}
.cs2-score{font-size:1.3rem;font-weight:900;color:rgba(148,163,184,.6);line-height:1;min-width:20px;text-align:center;font-variant-numeric:tabular-nums;transition:color .2s,text-shadow .2s}
.cs2-score-win{color:#f97316;text-shadow:0 0 14px rgba(249,115,22,.5)}
.cs2-score-sep{font-size:.85rem;font-weight:900;color:rgba(100,116,139,.42)}
.cs2-live-center{display:flex;flex-direction:column;align-items:center;gap:.25rem;padding:.3rem .45rem;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);border-radius:7px}
.cs2-live-label{font-size:.55rem;font-weight:900;color:#f87171;letter-spacing:.12em;text-transform:uppercase}
.cs2-vs-box{display:flex;flex-direction:column;align-items:center;gap:.12rem}
.cs2-vs{font-size:.68rem;font-weight:900;color:rgba(100,116,139,.42);letter-spacing:.1em;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.055);border-radius:5px;padding:.15rem .42rem}
.cs2-hora{font-size:.72rem;font-weight:800;color:rgba(251,146,60,.78);text-align:center;letter-spacing:.02em;white-space:nowrap}

/* footer */
.cs2-footer{display:flex;align-items:center;gap:.4rem;padding-top:.42rem;border-top:1px solid rgba(255,255,255,.04);font-size:.62rem;font-weight:600;color:rgba(100,116,139,.5)}
.cs2-footer-live{border-top-color:rgba(239,68,68,.1)}

/* ── Mobile overrides ──────────────────────────────────────────────────── */
@media(max-width:480px){
  .cs2-header{flex-direction:column;align-items:center;text-align:center;gap:1.2rem;padding:1.5rem 1rem}
  .cs2-header-content{flex-direction:column;gap:.8rem}
  .cs2-date-nav{align-self:center}
  .cs2-group-header{font-size:.65rem;padding:.4rem .7rem}
  .cs2-card{padding:.75rem .85rem;gap:.6rem}
  .cs2-team-name{font-size:.72rem}
  .cs2-team-logo{width:30px;height:30px}
  .cs2-event-name{font-size:.58rem}
  .cs2-badge{font-size:.53rem;padding:.12rem .38rem}
  .cs2-score{font-size:1.15rem;min-width:18px}
  .cs2-hora{font-size:.68rem}
  .cs2-vs{font-size:.62rem}
  .cs2-title{font-size:1.2rem}
}
`;
