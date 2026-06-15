"use client";

import { useState } from 'react';

interface TeamLogoProps {
  logoUrl?: string | null;
  teamName: string;
  className?: string;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return '?';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getGradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    'from-blue-600 to-indigo-600',
    'from-emerald-600 to-teal-600',
    'from-purple-600 to-pink-600',
    'from-rose-600 to-orange-600',
    'from-amber-500 to-red-600',
    'from-cyan-500 to-blue-600',
    'from-fuchsia-600 to-purple-700',
    'from-violet-600 to-indigo-700',
    'from-emerald-500 to-green-600',
    'from-rose-500 to-pink-600',
  ];
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export default function TeamLogo({ logoUrl, teamName, className = "w-6 h-6 md:w-8 md:h-8" }: TeamLogoProps) {
  const [error, setError] = useState(false);

  const initials = getInitials(teamName);
  const gradient = getGradientForName(teamName);

  if (!logoUrl || error) {
    return (
      <div 
        className={`${className} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white text-[10px] md:text-xs tracking-wider shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),_0_2px_4px_rgba(0,0,0,0.3)] select-none shrink-0`}
        title={teamName}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={teamName}
      className={`${className} object-contain shrink-0`}
      onError={() => setError(true)}
    />
  );
}
