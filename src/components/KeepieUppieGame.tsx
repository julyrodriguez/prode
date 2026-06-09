import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface KeepieUppieGameProps {
  userId: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

const renderBallToCanvas = (
  canvas: HTMLCanvasElement,
  radius: number,
  isSuper: boolean,
  isLight: boolean
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = 2; // Fixed resolution scaling for high-quality cached texture
  const padding = 20;
  const size = (radius + padding) * 2;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, size, size);

  const centerX = radius + padding;
  const centerY = radius + padding;

  ctx.save();
  ctx.translate(centerX, centerY);

  // 1. Draw glowing background radial gradient if super (replaces expensive shadowBlur)
  if (isSuper) {
    const glowGrad = ctx.createRadialGradient(0, 0, radius * 0.8, 0, 0, radius + 15);
    glowGrad.addColorStop(0, isLight ? 'rgba(249, 115, 22, 0.45)' : 'rgba(239, 68, 68, 0.6)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, radius + 15, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();
  }

  // 2. Spherical 3D shading
  const grad = ctx.createRadialGradient(-radius * 0.25, -radius * 0.25, radius * 0.1, 0, 0, radius);
  if (isSuper) {
    grad.addColorStop(0, '#fef08a'); // light yellow
    grad.addColorStop(0.5, '#f97316'); // orange
    grad.addColorStop(1, '#ef4444'); // red
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.75, '#e2e8f0');
    grad.addColorStop(1, '#94a3b8');
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 3. Shadow overlay
  const shadowGrad = ctx.createRadialGradient(radius * 0.3, radius * 0.3, radius * 0.2, radius * 0.3, radius * 0.3, radius * 1.1);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shadowGrad.addColorStop(1, isSuper ? 'rgba(127, 29, 29, 0.45)' : 'rgba(0, 0, 0, 0.25)');
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // 4. Stroke border
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = isSuper ? '#7f1d1d' : '#0f172a';
  ctx.stroke();

  // 5. Draw Panels
  ctx.fillStyle = isSuper ? '#7f1d1d' : '#0f172a';
  ctx.strokeStyle = isSuper ? '#b91c1c' : '#1e293b';
  ctx.lineWidth = 1.8;

  // Central Pentagon
  const pentagonRadius = radius * 0.32;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * pentagonRadius;
    const py = Math.sin(angle) * pentagonRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Radiation Lines and Outer Panels
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const p1x = Math.cos(angle) * pentagonRadius;
    const p1y = Math.sin(angle) * pentagonRadius;
    const p2x = Math.cos(angle) * radius;
    const p2y = Math.sin(angle) * radius;

    // Line from central pentagon vertices to outer edge
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();

    // Polygon along the edge (side panels)
    ctx.beginPath();
    const midAngle1 = angle - Math.PI / 10;
    const midAngle2 = angle + Math.PI / 10;
    ctx.moveTo(p2x, p2y);
    ctx.arc(0, 0, radius, angle, midAngle2);

    const innerX = Math.cos(midAngle2) * (radius * 0.72);
    const innerY = Math.sin(midAngle2) * (radius * 0.72);
    ctx.lineTo(innerX, innerY);

    const innerX2 = Math.cos(midAngle1) * (radius * 0.72);
    const innerY2 = Math.sin(midAngle1) * (radius * 0.72);
    ctx.lineTo(innerX2, innerY2);

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
};

export default function KeepieUppieGame({ userId }: KeepieUppieGameProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalBallCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const superBallCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pre-render cached ball textures when theme changes
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!normalBallCanvasRef.current) {
      normalBallCanvasRef.current = document.createElement('canvas');
    }
    if (!superBallCanvasRef.current) {
      superBallCanvasRef.current = document.createElement('canvas');
    }

    // Base cache radius is 60 (plenty high resolution, scaling down keeps it super sharp)
    renderBallToCanvas(normalBallCanvasRef.current, 60, false, isLight);
    renderBallToCanvas(superBallCanvasRef.current, 60, true, isLight);
  }, [isLight]);

  // Game states
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Ball physics refs (so the game loop always has the latest values without re-triggering effects)
  const ballRef = useRef({
    x: 200,
    y: 100,
    vx: 0,
    vy: 0,
    radius: 28,
    rotation: 0,
    gravity: 0.35,
    bounce: 0.7,
  });

  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);

  // Load High Score from database on mount/userId change
  useEffect(() => {
    if (!userId) return;
    const fetchHighScore = async () => {
      try {
        const response = await fetch('https://apivacas.jariel.com.ar/api/games/mundial/games/scores/all');
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            const userScores = result.data.filter(
              (s: { userId: string; gameId: string; points: number }) => s.userId === userId && s.gameId === 'jueguitos'
            );
            if (userScores.length > 0) {
              const maxScore = Math.max(...userScores.map((s: { points: number }) => s.points || 0));
              setHighScore(maxScore);
            } else {
              setHighScore(0);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching high score from server:', err);
      }
    };
    fetchHighScore();
  }, [userId]);

  // Restart the game
  const startGame = () => {
    setIsPlaying(true);
    setIsGameOver(false);
    setScore(0);
    scoreRef.current = 0;
    setSaveError(null);
    particlesRef.current = [];

    // Reset ball positions
    const canvas = canvasRef.current;
    const width = canvas ? canvas.width / (window.devicePixelRatio || 1) : 400;

    ballRef.current = {
      x: width / 2,
      y: 80,
      vx: 0,
      vy: 1, // small initial push down
      radius: 28,
      rotation: 0,
      gravity: 0.32,
      bounce: 0.7,
    };
  };

  // Trigger high score saving
  const handleGameOver = useCallback(async (finalScore: number) => {
    setIsGameOver(true);
    setIsPlaying(false);

    if (finalScore > highScore) {
      setIsSaving(true);
      setSaveError(null);
      setHighScore(finalScore);

      try {
        const response = await fetch('https://apivacas.jariel.com.ar/api/games/mundial/games/score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            gameId: 'jueguitos',
            points: finalScore,
          }),
        });

        if (!response.ok) {
          throw new Error('Error al guardar puntaje en el servidor');
        }
      } catch (err: unknown) {
        console.error('API Error:', err);
        setSaveError('No se pudo subir tu puntaje al ranking general.');
      } finally {
        setIsSaving(false);
      }
    }
  }, [userId, highScore]);

  // Spark / Particle explosion on hit (disabled to prevent performance lag)
  const spawnParticles = useCallback((_x: number, _y: number) => {
    // Disabled as requested to prevent lag
  }, []);

  // Click / Tap handler
  const handleHit = (clientX: number, clientY: number) => {
    if (!isPlaying || isGameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Scale client coords to logic coords (using logical bounds, which is rect width/height)
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const ball = ballRef.current;
    const dx = clickX - ball.x;
    const dy = clickY - ball.y;

    // Simular golpear con un botín: el clic debe estar en la mitad inferior o justo por debajo de la pelota
    const isBelowBall = dy >= -2 && dy <= ball.radius + 30; // Desde el centro hacia abajo, incluyendo 30px abajo de la pelota
    const isCloseHorizontally = Math.abs(dx) <= ball.radius + 18;

    if (isBelowBall && isCloseHorizontally) {
      // Hit!
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);

      // Bounce impulse
      if (newScore > 10) {
        // High speed random bounce
        const speedMultiplier = 1 + (newScore - 10) * 0.05; // gets slightly faster with each touch

        // Random angle deflection: -90 deg is straight up.
        // We select an angle in the range [-145, -35] degrees.
        const minAngle = -145 * Math.PI / 180;
        const maxAngle = -35 * Math.PI / 180;
        const randomAngle = minAngle + Math.random() * (maxAngle - minAngle);

        const baseSpeed = 9.5;
        const speed = baseSpeed * speedMultiplier;

        ball.vx = Math.cos(randomAngle) * speed;
        ball.vy = Math.sin(randomAngle) * speed;

        // Cap velocities to keep it playable but very fast
        ball.vx = Math.max(-10, Math.min(10, ball.vx));
        ball.vy = Math.max(-13, Math.min(-6.5, ball.vy));
      } else {
        // Normal bounce impulse
        // A strong upward force
        ball.vy = -7.8 - Math.min(newScore * 0.05, 1.2); // gets slightly faster/harder as score increases

        // Horizontal deviation: based on where they click (closer to edge = more deflection)
        // plus a random offset
        const clickOffsetPercent = dx / ball.radius; // -1 to 1
        const randomOffset = (Math.random() - 0.5) * 2;
        ball.vx = clickOffsetPercent * 3.5 + randomOffset;

        // Cap vx
        ball.vx = Math.max(-5.5, Math.min(5.5, ball.vx));
      }

      // Particle burst
      spawnParticles(ball.x, ball.y);
    }
  };

  // Set up game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrameId: number;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Drawing helpers - Renders ball using offscreen pre-cached canvas for zero-calculation drawing
    const drawSoccerBall = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number) => {
      const isSuper = scoreRef.current > 10;
      const cachedCanvas = isSuper ? superBallCanvasRef.current : normalBallCanvasRef.current;
      if (!cachedCanvas) return;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      const cachedRadius = 60;
      const padding = 20;
      const cachedSize = (cachedRadius + padding) * 2;

      const scale = radius / cachedRadius;
      const targetSize = cachedSize * scale;
      const targetOffset = -(cachedRadius + padding) * scale;

      ctx.drawImage(
        cachedCanvas,
        targetOffset,
        targetOffset,
        targetSize,
        targetSize
      );

      ctx.restore();
    };

    let lastTime = performance.now();

    // Render loop
    const update = (timestamp: number) => {
      const elapsed = timestamp - lastTime;
      lastTime = timestamp;

      // Calculate delta time multiplier relative to target 60fps (16.67ms)
      // Cap dt to a maximum of 4 to prevent physics wild jumps when backgrounded
      const dt = Math.min(elapsed / 16.67, 4);

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Draw Grid / Soccer Pitch Lines in canvas background
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 2;

      // Center circle
      ctx.beginPath();
      ctx.arc(width / 2, height, Math.min(width, height) * 0.35, Math.PI, 0);
      ctx.stroke();

      // Goal area line
      ctx.beginPath();
      ctx.rect(width * 0.15, height - 60, width * 0.7, 60);
      ctx.stroke();

      // Penalty spot
      ctx.beginPath();
      ctx.arc(width / 2, height - 80, 3, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fill();

      if (isPlaying && !isGameOver) {
        const ball = ballRef.current;

        // Apply physics scaled by dt
        ball.vy += ball.gravity * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Spin the ball based on horizontal speed scaled by dt
        ball.rotation += ball.vx * 0.04 * dt;

        // Fire trail disabled to prevent performance lag

        // Bounce left/right walls
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * ball.bounce;
        } else if (ball.x + ball.radius > width) {
          ball.x = width - ball.radius;
          ball.vx = -ball.vx * ball.bounce;
        }

        // Top limit (don't bounce, just let it fall, but cap it so it doesn't float away indefinitely)
        if (ball.y < -150) {
          ball.y = -150;
          ball.vy = 0;
        }

        // Game Over (touched ground)
        if (ball.y + ball.radius >= height) {
          // Explode ball into white particles on impact
          spawnParticles(ball.x, height - 10);
          handleGameOver(scoreRef.current);
        }

        // Draw Ball
        drawSoccerBall(ctx, ball.x, ball.y, ball.radius, ball.rotation);
      } else if (!isPlaying && !isGameOver) {
        // Menu state - float the ball in the center for show
        const time = Date.now() * 0.003;
        const hoverY = 180 + Math.sin(time) * 15;
        const hoverX = width / 2;
        drawSoccerBall(ctx, hoverX, hoverY, 32, time * 0.15);
      }

      // Draw Particles (without slow ctx.save/restore)
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Apply light gravity to particles scaled by dt
        p.vy += 0.08 * dt;

        p.alpha = Math.max(0, p.life / p.maxLife);
        p.life -= dt;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0; // Reset alpha for subsequent drawings

      localFrameId = requestAnimationFrame(update);
    };

    localFrameId = requestAnimationFrame((t) => {
      lastTime = t;
      update(t);
    });
    animationFrameIdRef.current = localFrameId;

    return () => {
      cancelAnimationFrame(localFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isPlaying, isGameOver, handleGameOver, spawnParticles, isLight]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-sm mx-auto flex flex-col items-center bg-[#090d16] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl select-none"
      style={{ touchAction: 'none' }}
    >

      {/* Stadium Light Header Bar */}
      <div className="w-full flex items-center justify-between px-6 py-4 bg-black/40 border-b border-white/5 relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">PUNTOS</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white">{score}</span>
            {score > 10 && (
              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full animate-pulse uppercase tracking-wider flex items-center gap-1">
                🔥 MODO DIABLO
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">RÉCORD</span>
          <span className="text-xl font-black text-amber-400">🏆 {highScore}</span>
        </div>
      </div>

      {/* HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onClick={(e) => handleHit(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          e.preventDefault(); // Prevents simulated double-tap / click on mobile browsers
          const touch = e.touches[0];
          handleHit(touch.clientX, touch.clientY);
        }}
        className={`w-full h-[400px] cursor-pointer bg-gradient-to-b ${isLight
            ? 'from-emerald-100 to-emerald-200'
            : 'from-[#032c1c] to-[#01160e]'
          } relative z-10 block`}
      />

      {/* Screen Overlay States */}

      {/* ── Start Screen Overlay ── */}
      {!isPlaying && !isGameOver && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
          <span className="text-5xl animate-bounce mb-3">⚽</span>
          <h2 className="text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            JUEGUITOS MUNDIAL
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-[240px] leading-relaxed">
            Hacé click o tap justo debajo de la pelota para patearla (como un botín). ¡No dejes que toque el suelo!
          </p>
          <div className="text-[10px] text-orange-400 font-medium mt-4 max-w-[260px] leading-normal bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3 flex gap-2 text-left">
            <span className="text-sm shrink-0">💡</span>
            <span>
              <strong className="text-orange-300 font-black">Tip:</strong> Apuntá a la zona inferior de la pelota justo cuando esté cayendo para un mejor control.
            </span>
          </div>
          <button
            onClick={startGame}
            className="mt-6 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm uppercase tracking-wider"
          >
            ¡Empezar a Jugar!
          </button>
        </div>
      )}

      {/* ── Game Over Overlay ── */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <span className="text-5xl mb-2">💔</span>
          <h3 className="text-3xl font-black text-red-500 tracking-wide">GAME OVER</h3>

          <div className="my-5 p-4 bg-white/[0.03] border border-white/5 rounded-2xl min-w-[200px]">
            <span className="text-xs text-slate-400 font-bold block mb-1">Puntaje obtenido</span>
            <span className="text-4xl font-black text-white">{score}</span>
            {score === highScore && score > 0 && (
              <span className="text-xs text-amber-400 font-black block mt-2 animate-pulse">
                🎉 ¡NUEVO RÉCORD! 🎉
              </span>
            )}
          </div>

          {/* Syncing Status Indicator */}
          {isSaving ? (
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm my-3 animate-pulse">
              <div className="w-4 h-4 border-2 border-t-transparent border-amber-400 rounded-full animate-spin" />
              <span>Guardando puntuación...</span>
            </div>
          ) : saveError ? (
            <div className="text-xs text-amber-500/90 font-medium my-2 max-w-[250px] leading-relaxed">
              ⚠️ {saveError}
            </div>
          ) : (
            <div className="h-6" /> // spacer
          )}

          <div className="flex flex-col gap-3 w-full max-w-[220px] mt-2">
            <button
              onClick={startGame}
              disabled={isSaving}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-black rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all text-sm uppercase tracking-wider"
            >
              Volver a intentar
            </button>
          </div>
        </div>
      )}

      {/* Small Pitch Line bottom border decoration */}
      <div className="w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 z-10 shrink-0" />
    </div>
  );
}
