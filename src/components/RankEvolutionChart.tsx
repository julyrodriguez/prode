"use client";
import React, { useState, useRef } from 'react';

interface MatchInfo {
  matchId: number;
  fechaUnix: number;
  equipoLocal: string;
  equipoVisita: string;
  stage?: string;
}

interface RankingStep {
  match: MatchInfo | null;
  rankings: Array<{
    userId: string;
    name: string;
    points: number;
    position: number;
  }>;
  positionsMap: Record<string, number>;
}

interface RankEvolutionChartProps {
  history: RankingStep[];
  users: Array<{ userId: string; name: string }>;
  activeUserId?: string | null;
}

const USER_COLORS: Record<string, string> = {
  'mDpYgQIEtCVIF8pdQ0HYHWiAyJV2': '#F59E0B', // Gold/Amber
  'ZIM8X38poYUZicf38gGzFsj8Tis1': '#10B981', // Emerald
  'vtiJxm0gJFgpyv74p6wnLnYuSyC3': '#06B6D4', // Cyan
  'vNEg4qrr9vQFDYeLt7tFJQ2GXl13': '#6366F1', // Indigo
  'ryCAlOASuTM7BiMQ8VJUfgnCJtt1': '#EC4899', // Pink
  'jTnexEDtihPrcP1r1dmFm4CFD0z2': '#F97316', // Orange
  'POYvW930tTUZZEnfNcIIy8O67692': '#A855F7', // Purple
  'pffqgeno1jSwZMLws4h7sWmzjEj2': '#EF4444', // Red
  'IS6Ap0JmN9OVoGBbvoPCQSIU0xU2': '#14B8A6', // Teal
  'CPJ15xjLbaMJmiEc7fChoFUiDMw2': '#EAB308', // Yellow
  'aayngHYHpsNaw66u8FjG9RvF7Vk1': '#0EA5E9', // Sky Blue
};

export const getColorForUser = (userId: string): string => {
  if (USER_COLORS[userId]) return USER_COLORS[userId];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#EC4899',
    '#F97316', '#A855F7', '#EF4444', '#14B8A6', '#EAB308', '#0EA5E9'
  ];
  return colors[Math.abs(hash) % colors.length];
};

export default function RankEvolutionChart({ history, users, activeUserId }: RankEvolutionChartProps) {
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center bg-white/[0.02] border border-white/5 rounded-[2rem] text-slate-400 italic font-medium">
        No hay datos suficientes para mostrar la evolución.
      </div>
    );
  }

  // Chart layout dimensions
  const width = 1000;
  const height = 550;
  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 40;
  const paddingBottom = 50;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const totalSteps = history.length;
  const totalUsers = users.length;

  // X coordinate mapper
  const getX = (stepIdx: number) => {
    if (totalSteps <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (stepIdx / (totalSteps - 1)) * chartWidth;
  };

  // Y coordinate mapper (Position 1 is top, Position N is bottom)
  const getY = (position: number) => {
    if (totalUsers <= 1) return paddingTop + chartHeight / 2;
    return paddingTop + ((position - 1) / (totalUsers - 1)) * chartHeight;
  };

  // Handle mouse interaction on SVG to detect hovered step
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert client X to SVG viewBox X coordinate space
    const svgX = (x / rect.width) * width;
    
    // Find closest step index
    let stepIdx = Math.round(((svgX - paddingLeft) / chartWidth) * (totalSteps - 1));
    stepIdx = Math.max(0, Math.min(totalSteps - 1, stepIdx));

    setHoveredStepIndex(stepIdx);
    setTooltipPos({ x: (stepIdx / (totalSteps - 1)) * rect.width, y });
  };

  const handleMouseLeave = () => {
    setHoveredStepIndex(null);
  };

  // Helper to calculate position changes
  const getPosChange = (userId: string, currentStepIdx: number) => {
    if (currentStepIdx === 0) return 0;
    const prevStep = history[currentStepIdx - 1];
    const curStep = history[currentStepIdx];
    const prevPos = prevStep.positionsMap[userId];
    const curPos = curStep.positionsMap[userId];
    if (prevPos === undefined || curPos === undefined) return 0;
    return prevPos - curPos; // Positive means rank improved (e.g. 5th -> 3rd)
  };

  // Get active step details
  const activeStep = hoveredStepIndex !== null ? history[hoveredStepIndex] : null;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* ── Legend pills ── */}
      <div className="flex flex-wrap gap-2 justify-center bg-black/20 p-4 border border-white/5 rounded-2xl">
        {users.map((u) => {
          const color = getColorForUser(u.userId);
          const isHighlighted = hoveredUserId === u.userId;
          const isMe = u.userId === activeUserId;
          const isAnyHighlighted = hoveredUserId !== null;

          return (
            <button
              key={u.userId}
              onMouseEnter={() => setHoveredUserId(u.userId)}
              onMouseLeave={() => setHoveredUserId(null)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border transition-all cursor-pointer
                ${isHighlighted 
                  ? 'border-white/20 shadow-md scale-105' 
                  : isAnyHighlighted 
                    ? 'border-transparent opacity-30 scale-95' 
                    : 'border-white/5 opacity-80'}
              `}
              style={{
                backgroundColor: `${color}15`,
                color: color,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span>{u.name}</span>
              {isMe && <span className="text-[9px] px-1 bg-white/10 rounded uppercase tracking-wider text-slate-300">Vos</span>}
            </button>
          );
        })}
      </div>

      {/* ── Chart Container ── */}
      <div className="relative w-full bg-slate-950/40 border border-white/5 rounded-[2.5rem] p-4 md:p-6 overflow-visible shadow-2xl">
        
        {/* SVG Wrapper */}
        <div className="relative w-full h-[380px] md:h-[480px]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full select-none overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Definitions for glow filters */}
            <defs>
              <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="currentColor" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Horizontal Grid lines & Y Axis Labels */}
            {Array.from({ length: totalUsers }).map((_, i) => {
              const pos = i + 1;
              const yVal = getY(pos);
              return (
                <g key={`y-grid-${pos}`} className="opacity-40">
                  <line
                    x1={paddingLeft}
                    y1={yVal}
                    x2={width - paddingRight}
                    y2={yVal}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                  <text
                    x={paddingLeft - 15}
                    y={yVal + 4}
                    textAnchor="end"
                    className="text-[11px] font-black fill-slate-400"
                  >
                    {pos}º
                  </text>
                </g>
              );
            })}

            {/* X Axis Labels (Matches indicators) */}
            {history.map((step, idx) => {
              const xVal = getX(idx);
              const showLabel = totalSteps < 15 || idx % Math.ceil(totalSteps / 10) === 0 || idx === totalSteps - 1 || idx === 0;

              return (
                <g key={`x-axis-${idx}`}>
                  {/* Vertical dotted grid line */}
                  <line
                    x1={xVal}
                    y1={paddingTop}
                    x2={xVal}
                    y2={height - paddingBottom}
                    stroke="rgba(255, 255, 255, 0.04)"
                    strokeDasharray="2 4"
                    strokeWidth={1}
                  />
                  {showLabel && (
                    <text
                      x={xVal}
                      y={height - paddingBottom + 22}
                      textAnchor="middle"
                      className="text-[10px] font-black fill-slate-500 uppercase tracking-wider"
                    >
                      {idx === 0 ? 'Inicio' : `P${idx}`}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Vertical Guide Line on Hover */}
            {hoveredStepIndex !== null && (
              <line
                x1={getX(hoveredStepIndex)}
                y1={paddingTop}
                x2={getX(hoveredStepIndex)}
                y2={height - paddingBottom}
                stroke="#F59E0B"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                className="opacity-70 pointer-events-none"
              />
            )}

            {/* Draw lines for each user */}
            {users.map((u) => {
              const color = getColorForUser(u.userId);
              const isHovered = hoveredUserId === u.userId;
              const isMe = u.userId === activeUserId;
              const isAnyHovered = hoveredUserId !== null;

              // Generate path points
              const points = history.map((step, idx) => {
                const pos = step.positionsMap[u.userId] || totalUsers;
                return { x: getX(idx), y: getY(pos) };
              });

              // Create SVG Path string
              const pathD = points.reduce((acc, p, idx) => {
                return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
              }, '');

              return (
                <g key={`path-group-${u.userId}`}>
                  {/* Backdrop thick line for hover effect styling */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={15}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredUserId(u.userId)}
                    onMouseLeave={() => setHoveredUserId(null)}
                  />

                  {/* Main Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHovered ? 4.5 : isMe ? 2.5 : 1.8}
                    strokeDasharray={isMe ? undefined : undefined}
                    className="transition-all duration-200 pointer-events-none"
                    style={{
                      opacity: isHovered ? 1 : isAnyHovered ? 0.12 : isMe ? 0.85 : 0.55,
                      filter: isHovered ? 'url(#glow-filter)' : undefined,
                      color: color,
                    }}
                  />

                  {/* Nodes on points */}
                  {points.map((p, idx) => {
                    const isStepHovered = hoveredStepIndex === idx;
                    const radius = isHovered && isStepHovered ? 6 : isStepHovered ? 5 : isHovered ? 3.5 : isMe ? 2.5 : 1.5;
                    const opacity = isHovered ? 1 : isAnyHovered ? 0.12 : isStepHovered ? 0.8 : isMe ? 0.7 : 0.45;

                    return (
                      <circle
                        key={`node-${u.userId}-${idx}`}
                        cx={p.x}
                        cy={p.y}
                        r={radius}
                        fill={color}
                        stroke={isStepHovered ? '#000' : 'transparent'}
                        strokeWidth={1}
                        className="transition-all duration-150 pointer-events-none"
                        style={{ opacity }}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* ── Glassmorphic Tooltip ── */}
          {hoveredStepIndex !== null && activeStep && (
            <div
              style={{
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y < 250 ? tooltipPos.y + 20 : tooltipPos.y - 20}px`,
                transform: `translate(${tooltipPos.x > (svgRef.current?.getBoundingClientRect().width || 0) * 0.7 ? '-102%' : '2%'}, ${tooltipPos.y < 250 ? '0%' : '-100%'})`,
              }}
              className="absolute z-35 pointer-events-none w-[260px] md:w-[300px] bg-slate-950/85 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col gap-3 transition-all duration-75 select-none"
            >
              {/* Tooltip Header */}
              <div className="flex flex-col border-b border-white/15 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  {hoveredStepIndex === 0 ? 'Estado Inicial' : `Fecha ${hoveredStepIndex}`}
                </span>
                <span className="text-xs font-black text-white truncate mt-0.5">
                  {activeStep.match ? (
                    <>
                      <span>{activeStep.match.equipoLocal} vs {activeStep.match.equipoVisita}</span>
                      {activeStep.match.stage && (
                        <span className="block text-[10px] text-slate-400 font-bold capitalize mt-0.5">
                          {activeStep.match.stage}
                        </span>
                      )}
                    </>
                  ) : (
                    'Inicio del Torneo'
                  )}
                </span>
              </div>

              {/* Tooltip Standings List */}
              <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-0.5 no-scrollbar pointer-events-none">
                {activeStep.rankings.map((r) => {
                  const color = getColorForUser(r.userId);
                  const isMe = r.userId === activeUserId;
                  const change = getPosChange(r.userId, hoveredStepIndex);
                  
                  return (
                    <div
                      key={`tooltip-r-${r.userId}`}
                      className={`flex items-center justify-between text-xs py-0.5 px-1.5 rounded-lg ${isMe ? 'bg-white/10' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Position dot/number */}
                        <span className="font-black text-slate-400 text-[10px] w-4 text-right">
                          {r.position}º
                        </span>
                        {/* Color indicator */}
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        {/* Name */}
                        <span className={`truncate font-bold ${isMe ? 'text-amber-300' : 'text-slate-200'}`}>
                          {r.name}
                        </span>
                      </div>
                      
                      {/* Points and change indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-white text-[11px]">
                          {r.points} <span className="text-[9px] text-slate-500 font-normal">pts</span>
                        </span>
                        
                        {/* Rise/Fall Indicator */}
                        {change > 0 ? (
                          <span className="text-emerald-400 font-black text-[10px] flex items-center">
                            ▲{change}
                          </span>
                        ) : change < 0 ? (
                          <span className="text-red-400 font-black text-[10px] flex items-center">
                            ▼{Math.abs(change)}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-extrabold text-[10px] flex items-center">
                            •
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ── Subtitle explanation ── */}
      <div className="text-[11px] text-slate-400 italic text-center px-4 leading-normal">
        Colocá el cursor sobre el gráfico para ver el detalle de posiciones en cada fecha. <br />
        Pasá el mouse sobre los nombres arriba para resaltar el camino de cada jugador.
      </div>

    </div>
  );
}
