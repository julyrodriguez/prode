"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, ArrowRight } from 'lucide-react';

const translateTeamToSpanish = (name: string): string => {
  if (!name) return '';
  const translations: Record<string, string> = {
    'Brazil': 'Brasil', 'France': 'Francia', 'Germany': 'Alemania', 'Spain': 'España',
    'England': 'Inglaterra', 'Belgium': 'Bélgica', 'Croatia': 'Croacia', 'Netherlands': 'Países Bajos',
    'Holland': 'Holanda', 'Japan': 'Japón', 'Saudi Arabia': 'Arabia Saudita', 'South Korea': 'Corea del Sur',
    'Switzerland': 'Suiza', 'Denmark': 'Dinamarca', 'Poland': 'Polonia', 'Mexico': 'México',
    'Morocco': 'Marruecos', 'United States': 'Estados Unidos', 'USA': 'Estados Unidos',
    'Cameroon': 'Camerún', 'Canada': 'Canadá', 'Ecuador': 'Ecuador', 'Senegal': 'Senegal',
    'Tunisia': 'Túnez', 'Wales': 'Gales', 'Qatar': 'Qatar', 'Serbia': 'Serbia', 'Ghana': 'Ghana',
    'Uruguay': 'Uruguay', 'Argentina': 'Argentina', 'Portugal': 'Portugal', 'Italy': 'Italia',
    'Colombia': 'Colombia', 'Chile': 'Chile', 'Peru': 'Perú', 'Paraguay': 'Paraguay',
    'Venezuela': 'Venezuela', 'Bolivia': 'Bolivia', 'Algeria': 'Argelia', 'Austria': 'Austria',
    'Egypt': 'Egipto', 'Sweden': 'Suecia', 'Norway': 'Noruega', 'Scotland': 'Escocia',
    'Ireland': 'Irlanda', 'Greece': 'Grecia', 'Turkey': 'Turquía', 'Ukraine': 'Ucrania',
    'Czech Republic': 'República Checa', 'Czechia': 'República Checa', 'Romania': 'Rumania',
    'Russia': 'Rusia', 'New Zealand': 'Nueva Zelanda', 'South Africa': 'Sudáfrica',
    'Panama': 'Panamá', 'Costa Rica': 'Costa Rica', 'Honduras': 'Honduras', 'El Salvador': 'El Salvador',
    'Jamaica': 'Jamaica', 'Hungary': 'Hungría',
    "Côte d'Ivoire": 'Costa de Marfil', "Cote d'Ivoire": 'Costa de Marfil', 'Ivory Coast': 'Costa de Marfil'
  };
  const trimmed = name.trim();
  return translations[trimmed] || translations[trimmed.replace(/\s+/g, ' ')] || trimmed;
};

interface Team {
  id: number;
  name: string;
  group?: string;
}

interface Match {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  tournament_name: string;
  startTimestamp: number;
  round_name: string;
  status: string | { type: string };
  homeScore?: { current?: number };
  awayScore?: { current?: number };
}

interface GroupStanding {
  team: Team;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

export default function LeagueSimulationView() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'groups' | 'bracket'>('groups');

  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [simulatedPredictions, setSimulatedPredictions] = useState<Record<number, { home: string; away: string }>>({});
  const [expandedGroup, setExpandedGroup] = useState<string | null>('A');

  // Knockout winners mapping: matchId/key -> Team
  const [knockoutWinners, setKnockoutWinners] = useState<Record<string, Team>>({});

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all matches
        const matchesRes = await fetch('https://apivacas.jariel.com.ar/api/matches/all');
        if (!matchesRes.ok) throw new Error('No se pudieron obtener los partidos.');
        const matchesData = await matchesRes.json();

        if (!isMounted) return;

        // Filter and format World Cup matches
        const wcMatches: Match[] = (Array.isArray(matchesData) ? matchesData : [])
          .filter((m: any) => m.tournament_name && m.tournament_name.toLowerCase().includes('world cup'))
          .map((m: any) => ({
            id: m.id || m._id,
            homeTeam: {
              id: m.homeTeam?.id || m.home_team?.id,
              name: translateTeamToSpanish(m.homeTeam?.name || m.home_team?.name || '')
            },
            awayTeam: {
              id: m.awayTeam?.id || m.away_team?.id,
              name: translateTeamToSpanish(m.awayTeam?.name || m.away_team?.name || '')
            },
            tournament_name: m.tournament_name,
            startTimestamp: m.startTimestamp,
            round_name: m.round_name || m.stage || '',
            status: m.status,
            homeScore: m.homeScore || m.home_team,
            awayScore: m.awayScore || m.away_team
          }));

        setAllMatches(wcMatches);

        // Fetch user predictions
        if (user) {
          const predRes = await fetch(`https://apivacas.jariel.com.ar/api/predictions/user/${user.uid}`);
          if (predRes.ok) {
            const predData = await predRes.json();
            const predMap: Record<number, { home: string; away: string }> = {};
            if (Array.isArray(predData)) {
              predData.forEach(p => {
                const matchId = Number(p.matchId || p.match_id);
                const homeS = p.homeScore !== undefined ? p.homeScore : (p.home_score ?? '');
                const awayS = p.awayScore !== undefined ? p.awayScore : (p.away_score ?? '');
                predMap[matchId] = { home: String(homeS), away: String(awayS) };
              });
            }
            setSimulatedPredictions(predMap);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error de conexión');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [user]);

  // Group Stage Matches (Group A to L)
  const groupMatches = allMatches.filter(m => m.tournament_name.includes('Group'));

  // Count how many matches don't have predictions and haven't started yet
  const unpredictedCount = groupMatches.filter(m => {
    const pred = simulatedPredictions[m.id];
    const hasPred = pred && pred.home !== '' && pred.away !== '';
    const statusType = typeof m.status === 'string' ? m.status : m.status?.type;
    const hasReal = statusType !== 'notstarted';
    return !hasPred && !hasReal;
  }).length;

  const autoFillPredictions = () => {
    setSimulatedPredictions(prev => {
      const next = { ...prev };
      groupMatches.forEach(m => {
        const pred = next[m.id];
        const hasPred = pred && pred.home !== '' && pred.away !== '';
        const statusType = typeof m.status === 'string' ? m.status : m.status?.type;
        const hasReal = statusType !== 'notstarted';
        if (!hasPred && !hasReal) {
          next[m.id] = { home: '0', away: '0' };
        }
      });
      return next;
    });
  };
  
  // Extract unique group names
  const groupNames = Array.from(new Set(
    groupMatches.map(m => {
      const match = m.tournament_name.match(/Group\s+([A-L])/);
      return match ? match[1] : null;
    }).filter(Boolean)
  )).sort() as string[];

  // Calculate standings for a given group
  const getGroupStandings = (groupLetter: string): GroupStanding[] => {
    const groupMatchesFiltered = groupMatches.filter(m => m.tournament_name.includes(`Group ${groupLetter}`));
    
    // Find all unique teams in this group
    const teamMap: Record<number, Team> = {};
    groupMatchesFiltered.forEach(m => {
      if (m.homeTeam?.id) teamMap[m.homeTeam.id] = { ...m.homeTeam, group: groupLetter };
      if (m.awayTeam?.id) teamMap[m.awayTeam.id] = { ...m.awayTeam, group: groupLetter };
    });

    const standings: Record<number, GroupStanding> = {};
    Object.keys(teamMap).forEach(id => {
      standings[Number(id)] = {
        team: teamMap[Number(id)],
        pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0
      };
    });

    groupMatchesFiltered.forEach(m => {
      const homeId = m.homeTeam?.id;
      const awayId = m.awayTeam?.id;
      if (!homeId || !awayId || !standings[homeId] || !standings[awayId]) return;

      // Determine simulated score: local prediction, or fallback to real score, or empty
      const pred = simulatedPredictions[m.id];
      let homeS = pred?.home !== undefined && pred.home !== '' ? Number(pred.home) : null;
      let awayS = pred?.away !== undefined && pred.away !== '' ? Number(pred.away) : null;

      if (homeS === null && awayS === null) {
        // Fallback to real score if match has finished/has scores
        const statusType = typeof m.status === 'string' ? m.status : m.status?.type;
        if (statusType !== 'notstarted') {
          homeS = m.homeScore?.current !== undefined ? m.homeScore.current : null;
          awayS = m.awayScore?.current !== undefined ? m.awayScore.current : null;
        } else {
          // If match hasn't started and no prediction exists, default to 0-0 for simulation
          homeS = 0;
          awayS = 0;
        }
      } else {
        // If one of the fields is empty, default it to 0
        if (homeS === null) homeS = 0;
        if (awayS === null) awayS = 0;
      }

      if (homeS !== null && awayS !== null) {
        standings[homeId].pj += 1;
        standings[awayId].pj += 1;
        standings[homeId].gf += homeS;
        standings[homeId].gc += awayS;
        standings[awayId].gf += awayS;
        standings[awayId].gc += homeS;

        if (homeS > awayS) {
          standings[homeId].g += 1;
          standings[homeId].pts += 3;
          standings[awayId].p += 1;
        } else if (homeS < awayS) {
          standings[awayId].g += 1;
          standings[awayId].pts += 3;
          standings[homeId].p += 1;
        } else {
          standings[homeId].e += 1;
          standings[homeId].pts += 1;
          standings[awayId].e += 1;
          standings[awayId].pts += 1;
        }
      }
    });

    // Compute goal difference
    Object.keys(standings).forEach(id => {
      const s = standings[Number(id)];
      s.dg = s.gf - s.gc;
    });

    // Sort: 1. Pts, 2. GD, 3. GF, 4. Name
    return Object.values(standings).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.name.localeCompare(b.team.name);
    });
  };

  // Compile group standings for all groups
  const allGroupsStandings: Record<string, GroupStanding[]> = {};
  groupNames.forEach(letter => {
    allGroupsStandings[letter] = getGroupStandings(letter);
  });

  // Calculate 8 Best Third-Placed Teams
  const getBestThirdPlacedTeams = (): Team[] => {
    const thirds: GroupStanding[] = [];
    groupNames.forEach(letter => {
      const groupStand = allGroupsStandings[letter];
      if (groupStand && groupStand.length >= 3) {
        thirds.push(groupStand[2]); // index 2 is 3rd place
      }
    });

    // Sort thirds: Pts, DG, GF, Name
    const sortedThirds = thirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.name.localeCompare(b.team.name);
    });

    return sortedThirds.slice(0, 8).map(s => s.team);
  };

  const bestThirds = getBestThirdPlacedTeams();

  // Helper to get group winners, runners-up, or third placed
  const getGroupQualifier = (groupLetter: string, pos: 1 | 2 | 3): Team => {
    const stand = allGroupsStandings[groupLetter];
    if (stand && stand[pos - 1]) {
      return stand[pos - 1].team;
    }
    return { id: 0, name: `${pos}${groupLetter}` };
  };

  // Handle score change in real-time
  const handleScoreChange = (matchId: number, side: 'home' | 'away', val: string) => {
    // Only accept positive digits or empty string
    if (val !== '' && !/^\d+$/.test(val)) return;

    setSimulatedPredictions(prev => {
      const current = prev[matchId] || { home: '', away: '' };
      return {
        ...prev,
        [matchId]: {
          ...current,
          [side]: val
        }
      };
    });
  };

  // Knockout Stage Bracket Definition
  // Assign 3rd-placed slots to the 8 best 3rd-placed teams dynamically
  const getAssignedThirds = (): Record<number, Team> => {
    const assigned: Record<number, Team> = {};
    const pool = [...bestThirds];

    // Official FIFA 2026 3rd-place slots in Round of 32:
    const thirdSlots = [
      { matchIndex: 3, allowed: ['A', 'B', 'C', 'D', 'F'] }, // Match 75
      { matchIndex: 6, allowed: ['C', 'D', 'F', 'G', 'H'] }, // Match 78
      { matchIndex: 7, allowed: ['C', 'E', 'F', 'H', 'I'] }, // Match 79
      { matchIndex: 8, allowed: ['E', 'H', 'I', 'J', 'K'] }, // Match 80
      { matchIndex: 9, allowed: ['A', 'E', 'H', 'I', 'J'] }, // Match 81
      { matchIndex: 10, allowed: ['B', 'E', 'F', 'I', 'J'] }, // Match 82
      { matchIndex: 13, allowed: ['E', 'F', 'G', 'I', 'J'] }, // Match 85
      { matchIndex: 16, allowed: ['D', 'E', 'I', 'J', 'L'] }, // Match 88
    ];

    thirdSlots.forEach(slot => {
      // Find the best third-placed team that comes from one of the allowed groups
      const idx = pool.findIndex(t => t.group && slot.allowed.includes(t.group));
      if (idx !== -1) {
        assigned[slot.matchIndex] = pool[idx];
        pool.splice(idx, 1);
      } else if (pool.length > 0) {
        // Fallback
        assigned[slot.matchIndex] = pool[0];
        pool.splice(0, 1);
      } else {
        assigned[slot.matchIndex] = { id: 0, name: `3rd (${slot.allowed.join('/')})` };
      }
    });

    return assigned;
  };

  const assignedThirds = getAssignedThirds();

  // Define the 16 Round of 32 Matches:
  // We number them 73 to 88.
  const roundOf32Matches = [
    { key: 'm73', home: getGroupQualifier('A', 2), away: getGroupQualifier('B', 2), label: 'Partida 73' },
    { key: 'm74', home: getGroupQualifier('C', 1), away: getGroupQualifier('F', 2), label: 'Partida 74' },
    { key: 'm75', home: getGroupQualifier('E', 1), away: assignedThirds[3] || { id: 0, name: '3ro A/B/C/D/F' }, label: 'Partida 75' },
    { key: 'm76', home: getGroupQualifier('F', 1), away: getGroupQualifier('C', 2), label: 'Partida 76' },
    { key: 'm77', home: getGroupQualifier('E', 2), away: getGroupQualifier('I', 2), label: 'Partida 77' },
    { key: 'm78', home: getGroupQualifier('I', 1), away: assignedThirds[6] || { id: 0, name: '3ro C/D/F/G/H' }, label: 'Partida 78' },
    { key: 'm79', home: getGroupQualifier('A', 1), away: assignedThirds[7] || { id: 0, name: '3ro C/E/F/H/I' }, label: 'Partida 79' },
    { key: 'm80', home: getGroupQualifier('L', 1), away: assignedThirds[8] || { id: 0, name: '3ro E/H/I/J/K' }, label: 'Partida 80' },
    { key: 'm81', home: getGroupQualifier('G', 1), away: assignedThirds[9] || { id: 0, name: '3ro A/E/H/I/J' }, label: 'Partida 81' },
    { key: 'm82', home: getGroupQualifier('D', 1), away: assignedThirds[10] || { id: 0, name: '3ro B/E/F/I/J' }, label: 'Partida 82' },
    { key: 'm83', home: getGroupQualifier('H', 1), away: getGroupQualifier('J', 2), label: 'Partida 83' },
    { key: 'm84', home: getGroupQualifier('K', 2), away: getGroupQualifier('L', 2), label: 'Partida 84' },
    { key: 'm85', home: getGroupQualifier('B', 1), away: assignedThirds[13] || { id: 0, name: '3ro E/F/G/I/J' }, label: 'Partida 85' },
    { key: 'm86', home: getGroupQualifier('D', 2), away: getGroupQualifier('G', 2), label: 'Partida 86' },
    { key: 'm87', home: getGroupQualifier('J', 1), away: getGroupQualifier('H', 2), label: 'Partida 87' },
    { key: 'm88', home: getGroupQualifier('K', 1), away: assignedThirds[16] || { id: 0, name: '3ro D/E/I/J/L' }, label: 'Partida 88' },
  ];

  // Helper to get winner of a match, falling back to database prediction if present
  const getWinner = (key: string, homeTeam: Team, awayTeam: Team): Team | null => {
    // If user clicked manually, use that selection
    if (knockoutWinners[key]) {
      // Make sure the manual selection is still one of the two teams (in case group stage changed)
      const currentWinner = knockoutWinners[key];
      if (currentWinner.id === homeTeam.id || currentWinner.name === homeTeam.name) return homeTeam;
      if (currentWinner.id === awayTeam.id || currentWinner.name === awayTeam.name) return awayTeam;
    }

    // Otherwise, check if there is a saved prediction for this match in the database
    // We map keys 'm73'...'m88' to their corresponding real match _ids
    const matchIdMap: Record<string, number> = {
      m73: 12813000, m74: 12813012, m75: 12813014, m76: 12812998,
      m77: 12812989, m78: 12812995, m79: 12813001, m80: 12813020,
      m81: 12813013, m82: 12812992, m83: 12813004, m84: 12812997,
      m85: 12813019, m86: 12813018, m87: 12812999, m88: 12813011,
      m89: 12813009, m90: 12813010
    };

    const dbMatchId = matchIdMap[key];
    if (dbMatchId && simulatedPredictions[dbMatchId]) {
      const pred = simulatedPredictions[dbMatchId];
      if (pred.home !== '' && pred.away !== '') {
        const homeS = Number(pred.home);
        const awayS = Number(pred.away);
        if (homeS > awayS) return homeTeam;
        if (homeS < awayS) return awayTeam;
        return homeTeam; // default fallback on draw prediction
      }
    }

    return null;
  };

  // Select a winner manually by clicking
  const selectWinner = (matchKey: string, winner: Team) => {
    if (!winner.id || winner.name.startsWith('1') || winner.name.startsWith('2') || winner.name.startsWith('3')) return;

    setKnockoutWinners(prev => {
      const next = { ...prev, [matchKey]: winner };
      
      // Clear dependent children recursively to prevent inconsistent state
      const dependencies: Record<string, string[]> = {
        m73: ['m89', 'm97', 'm101', 'm104'], m75: ['m89', 'm97', 'm101', 'm104'],
        m74: ['m90', 'm97', 'm101', 'm104'], m77: ['m90', 'm97', 'm101', 'm104'],
        m76: ['m91', 'm98', 'm101', 'm104'], m78: ['m91', 'm98', 'm101', 'm104'],
        m79: ['m92', 'm98', 'm101', 'm104'], m80: ['m92', 'm98', 'm101', 'm104'],
        m81: ['m93', 'm99', 'm102', 'm104'], m82: ['m93', 'm99', 'm102', 'm104'],
        m83: ['m94', 'm99', 'm102', 'm104'], m84: ['m94', 'm99', 'm102', 'm104'],
        m85: ['m95', 'm100', 'm102', 'm104'], m86: ['m95', 'm100', 'm102', 'm104'],
        m87: ['m96', 'm100', 'm102', 'm104'], m88: ['m96', 'm100', 'm102', 'm104'],
        m89: ['m97', 'm101', 'm104'], m90: ['m97', 'm101', 'm104'],
        m91: ['m98', 'm101', 'm104'], m92: ['m98', 'm101', 'm104'],
        m93: ['m99', 'm102', 'm104'], m94: ['m99', 'm102', 'm104'],
        m95: ['m100', 'm102', 'm104'], m96: ['m100', 'm102', 'm104'],
        m97: ['m101', 'm104'], m98: ['m101', 'm104'],
        m99: ['m102', 'm104'], m100: ['m102', 'm104'],
        m101: ['m104'], m102: ['m104']
      };

      if (dependencies[matchKey]) {
        dependencies[matchKey].forEach(depKey => {
          delete next[depKey];
        });
      }

      return next;
    });
  };

  // Resolve knockout stages recursively
  const getKnockoutTeam = (key: string, side: 'home' | 'away'): Team => {
    // Round of 32: Resolved directly from group standings
    const matchNum = Number(key.substring(1));
    if (matchNum >= 73 && matchNum <= 88) {
      const idx = matchNum - 73;
      const m = roundOf32Matches[idx];
      return side === 'home' ? m.home : m.away;
    }

    // Subsequent rounds depend on winners of previous rounds
    const parentMatches: Record<string, { homeKey: string; awayKey: string }> = {
      // Round of 16
      m89: { homeKey: 'm73', awayKey: 'm75' },
      m90: { homeKey: 'm74', awayKey: 'm77' },
      m91: { homeKey: 'm76', awayKey: 'm78' },
      m92: { homeKey: 'm79', awayKey: 'm80' },
      m93: { homeKey: 'm81', awayKey: 'm82' },
      m94: { homeKey: 'm83', awayKey: 'm84' },
      m95: { homeKey: 'm85', awayKey: 'm86' },
      m96: { homeKey: 'm87', awayKey: 'm88' },
      // Quarterfinals
      m97: { homeKey: 'm89', awayKey: 'm90' },
      m98: { homeKey: 'm91', awayKey: 'm92' },
      m99: { homeKey: 'm93', awayKey: 'm94' },
      m100: { homeKey: 'm95', awayKey: 'm96' },
      // Semifinals
      m101: { homeKey: 'm97', awayKey: 'm98' },
      m102: { homeKey: 'm99', awayKey: 'm100' },
      // Final
      m104: { homeKey: 'm101', awayKey: 'm102' },
    };

    const parents = parentMatches[key];
    if (!parents) return { id: 0, name: 'TBD' };

    const parentKey = side === 'home' ? parents.homeKey : parents.awayKey;
    const parentHome = getKnockoutTeam(parentKey, 'home');
    const parentAway = getKnockoutTeam(parentKey, 'away');

    const winner = getWinner(parentKey, parentHome, parentAway);
    return winner || { id: 0, name: `Ganador ${parentKey.substring(1)}` };
  };

  // Helper to resolve loser of a match (for 3rd place match)
  const getKnockoutLoser = (key: string): Team => {
    const home = getKnockoutTeam(key, 'home');
    const away = getKnockoutTeam(key, 'away');
    const winner = getWinner(key, home, away);
    if (!winner) return { id: 0, name: `Perdedor ${key.substring(1)}` };
    return winner.id === home.id ? away : home;
  };

  // Resolve specific match matches:
  const getKnockoutMatch = (key: string, label: string) => {
    const home = getKnockoutTeam(key, 'home');
    const away = getKnockoutTeam(key, 'away');
    const winner = getWinner(key, home, away);

    return {
      key,
      label,
      home,
      away,
      winner
    };
  };

  const r32Resolved = roundOf32Matches.map(m => getKnockoutMatch(m.key, m.label));
  const r16Resolved = ['m89', 'm90', 'm91', 'm92', 'm93', 'm94', 'm95', 'm96'].map((k, idx) => getKnockoutMatch(k, `Octavos ${idx + 1}`));
  const qfResolved = ['m97', 'm98', 'm99', 'm100'].map((k, idx) => getKnockoutMatch(k, `Cuartos ${idx + 1}`));
  const sfResolved = ['m101', 'm102'].map((k, idx) => getKnockoutMatch(k, `Semifinal ${idx + 1}`));
  
  // Final and 3rd Place Match
  const finalMatchResolved = getKnockoutMatch('m104', 'Final');
  const thirdPlaceMatchResolved = {
    key: 'm103',
    label: 'Tercer Puesto',
    home: getKnockoutLoser('m101'),
    away: getKnockoutLoser('m102'),
    winner: getWinner('m103', getKnockoutLoser('m101'), getKnockoutLoser('m102'))
  };

  // Crowned Champion
  const champion = finalMatchResolved.winner;

  // Header Component
  const Header = () => (
    <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-amber-500/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/8 to-transparent blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
            🪄 Simulador del Mundial
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Simula las posiciones de grupo y completa los brackets usando tus predicciones.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'groups'
              ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            Fase de Grupos
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'bracket'
              ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            Brackets Finales
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-6 pb-10">
        <Header />
        <div className="flex-1 min-h-[350px] flex flex-col justify-center items-center bg-white/[0.02] border border-white/5 rounded-[2rem] gap-4">
          <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-amber-400 border-r-2 border-transparent" />
          <span className="text-slate-400 font-medium">Cargando simulador del mundial...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col gap-6 pb-10">
        <Header />
        <div className="w-full bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 flex justify-center items-center mt-4">
          <span className="text-red-400 font-bold text-lg">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10 animate-fade-in">
      <Header />

      {activeTab === 'groups' && (
        <div className="flex flex-col gap-4 w-full animate-fade-in">
          {unpredictedCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-400 font-bold">
              <span className="flex items-center gap-2">
                <span>⚠️</span>
                <span>Tienes {unpredictedCount} partidos sin pronóstico en la fase de grupos. Se simulan con un empate 0-0 por defecto.</span>
              </span>
              <button
                onClick={autoFillPredictions}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-black transition-all text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
              >
                Completar todos con 0-0
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* List of Groups */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {groupNames.map(letter => (
                <button
                  key={letter}
                  onClick={() => setExpandedGroup(letter)}
                  className={`p-4 rounded-2xl border text-center transition-all ${expandedGroup === letter
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-md'
                    : 'bg-[#0b1015]/40 border-white/5 text-slate-300 hover:bg-white/5'}`}
                >
                  <span className="block text-2xl font-black">Grupo {letter}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">
                    {allGroupsStandings[letter]?.[0]?.team.name || 'TBD'}
                  </span>
                </button>
              ))}
            </div>

            {/* Expanded Group Standings & Matches */}
            {expandedGroup && (
              <div className="bg-[#0b1015]/60 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md shadow-xl flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-amber-400 rounded-full" />
                    Tabla del Grupo {expandedGroup}
                  </h3>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-white/5 text-slate-400 text-xs font-black uppercase tracking-wider border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-2">Equipo</th>
                        <th className="py-3 px-2 text-center text-amber-400">Pts</th>
                        <th className="py-3 px-2 text-center">PJ</th>
                        <th className="py-3 px-2 text-center">G</th>
                        <th className="py-3 px-2 text-center">E</th>
                        <th className="py-3 px-2 text-center">P</th>
                        <th className="py-3 px-2 text-center opacity-60">GF</th>
                        <th className="py-3 px-2 text-center opacity-60">GC</th>
                        <th className="py-3 px-2 text-center">DIF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allGroupsStandings[expandedGroup].map((row, idx) => (
                        <tr key={row.team.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-center font-black text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-2 font-extrabold text-slate-100 flex items-center gap-2">
                            <img
                              src={`/escudos/${row.team.id}.png`}
                              alt=""
                              className="w-5 h-5 object-contain"
                              onError={(e) => { e.currentTarget.src = '/football2.png' }}
                            />
                            {row.team.name}
                          </td>
                          <td className="py-3 px-2 text-center font-black text-amber-400 bg-amber-500/5">{row.pts}</td>
                          <td className="py-3 px-2 text-center font-medium text-slate-300">{row.pj}</td>
                          <td className="py-3 px-2 text-center text-slate-300">{row.g}</td>
                          <td className="py-3 px-2 text-center text-slate-400">{row.e}</td>
                          <td className="py-3 px-2 text-center text-slate-400">{row.p}</td>
                          <td className="py-3 px-2 text-center text-slate-500">{row.gf}</td>
                          <td className="py-3 px-2 text-center text-slate-500">{row.gc}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-300">{row.dg > 0 ? `+${row.dg}` : row.dg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-white/5 pt-6 flex flex-col gap-4">
                  <h4 className="font-bold text-sm text-slate-300 uppercase tracking-widest">Partidos de Grupo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupMatches
                      .filter(m => m.tournament_name.includes(`Group ${expandedGroup}`))
                      .sort((a, b) => a.startTimestamp - b.startTimestamp)
                      .map(m => {
                        const pred = simulatedPredictions[m.id] || { home: '', away: '' };
                        return (
                          <div key={m.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-3 text-xs font-black">
                              <span className="flex items-center gap-2 text-slate-100 flex-1 text-right justify-end">
                                {m.homeTeam.name}
                                <img
                                  src={`/escudos/${m.homeTeam.id}.png`}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => { e.currentTarget.src = '/football2.png' }}
                                />
                              </span>
                              
                              {/* Inputs */}
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={pred.home}
                                    onChange={(e) => handleScoreChange(m.id, 'home', e.target.value)}
                                    className={`w-8 h-8 rounded-lg bg-white/5 border text-center font-black text-white text-sm focus:border-amber-500/50 outline-none ${pred.home === '' ? 'border-white/10 placeholder-slate-600' : 'border-amber-500/30'}`}
                                    placeholder="0"
                                  />
                                  <span className="text-slate-600 font-bold">-</span>
                                  <input
                                    type="text"
                                    value={pred.away}
                                    onChange={(e) => handleScoreChange(m.id, 'away', e.target.value)}
                                    className={`w-8 h-8 rounded-lg bg-white/5 border text-center font-black text-white text-sm focus:border-amber-500/50 outline-none ${pred.away === '' ? 'border-white/10 placeholder-slate-600' : 'border-amber-500/30'}`}
                                    placeholder="0"
                                  />
                                </div>
                                {(pred.home === '' || pred.away === '') && (
                                  <span className="text-[8px] text-amber-500/80 font-bold uppercase tracking-wider block mt-0.5">Rellenado 0-0</span>
                                )}
                              </div>

                              <span className="flex items-center gap-2 text-slate-100 flex-1 text-left">
                                <img
                                  src={`/escudos/${m.awayTeam.id}.png`}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => { e.currentTarget.src = '/football2.png' }}
                                />
                                {m.awayTeam.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Standings Summary & 3rd Placed ranking */}
          <div className="flex flex-col gap-6">
            {/* Top 3rd places */}
            <div className="bg-[#0b1015]/60 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md shadow-xl flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-6 bg-indigo-500 rounded-full" />
                  Tabla de Terceros
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1">Los mejores 8 clasifican a Dieciseisavos.</p>
              </div>

              <div className="flex flex-col gap-2">
                {groupNames.map(letter => {
                  const stand = allGroupsStandings[letter];
                  if (!stand || stand.length < 3) return null;
                  const row = stand[2]; // 3rd placed team
                  const isQualified = bestThirds.some(t => t.id === row.team.id);

                  return (
                    <div
                      key={letter}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${isQualified
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/5 border-red-500/20 text-red-400'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-500">G{letter}</span>
                        <img
                          src={`/escudos/${row.team.id}.png`}
                          alt=""
                          className="w-4 h-4 object-contain"
                          onError={(e) => { e.currentTarget.src = '/football2.png' }}
                        />
                        <span className="text-slate-200 font-bold truncate max-w-[100px]">{row.team.name}</span>
                      </div>
                      <div className="flex items-center gap-3 font-black">
                        <span>Pts: {row.pts}</span>
                        <span>DG: {row.dg > 0 ? `+${row.dg}` : row.dg}</span>
                        <span>{isQualified ? '✅' : '❌'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#0b1015]/60 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md shadow-xl flex flex-col gap-4 text-center">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
              <div>
                <h3 className="font-black text-white text-lg">¿Listo para los Brackets?</h3>
                <p className="text-xs text-slate-400 mt-1.5">
                  Una vez que configures la fase de grupos, ve a la pestaña "Brackets Finales" para ver las eliminatorias y coronar al campeón.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('bracket')}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2"
              >
                Simular Eliminatorias
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'bracket' && (
        <div className="w-full bg-[#0b1015]/60 border border-white/5 rounded-[2rem] p-6 shadow-2xl backdrop-blur-md overflow-x-auto custom-scrollbar">
          <div className="min-w-[1200px] flex gap-6 pb-6 pt-4 items-stretch justify-around">
            
            {/* Round of 32 (Dieciseisavos) */}
            <div className="flex flex-col w-56 shrink-0 gap-4">
              <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">
                Dieciseisavos (32 Equipos)
              </div>
              <div className="flex flex-col justify-between flex-1 gap-4">
                {r32Resolved.map((m) => (
                  <div key={m.key} className="flex flex-col bg-black/40 border border-white/5 rounded-xl overflow-hidden text-xs shadow-md">
                    {/* Home Team */}
                    <div
                      onClick={() => selectWinner(m.key, m.home)}
                      className={`px-3 py-2.5 flex items-center gap-2 cursor-pointer border-b border-white/5 transition-all hover:bg-white/5 ${m.winner?.id === m.home.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                    >
                      <img src={`/escudos/${m.home.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                      <span className="font-extrabold truncate flex-1">{m.home.name}</span>
                      {m.winner?.id === m.home.id && <span className="text-[10px]">🟢</span>}
                    </div>
                    {/* Away Team */}
                    <div
                      onClick={() => selectWinner(m.key, m.away)}
                      className={`px-3 py-2.5 flex items-center gap-2 cursor-pointer transition-all hover:bg-white/5 ${m.winner?.id === m.away.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                    >
                      <img src={`/escudos/${m.away.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                      <span className="font-extrabold truncate flex-1">{m.away.name}</span>
                      {m.winner?.id === m.away.id && <span className="text-[10px]">🟢</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Round of 16 (Octavos) */}
            <div className="flex flex-col w-56 shrink-0 gap-4 justify-around">
              <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">
                Octavos de Final
              </div>
              <div className="flex flex-col justify-around flex-1 gap-12">
                {r16Resolved.map((m) => (
                  <div key={m.key} className="flex flex-col bg-black/40 border border-white/5 rounded-xl overflow-hidden text-xs shadow-md">
                    <div
                      onClick={() => selectWinner(m.key, m.home)}
                      className={`px-3 py-2.5 flex items-center gap-2 cursor-pointer border-b border-white/5 transition-all hover:bg-white/5 ${m.winner?.id === m.home.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                    >
                      <img src={`/escudos/${m.home.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                      <span className="font-extrabold truncate flex-1">{m.home.name}</span>
                      {m.winner?.id === m.home.id && <span className="text-[10px]">🟢</span>}
                    </div>
                    <div
                      onClick={() => selectWinner(m.key, m.away)}
                      className={`px-3 py-2.5 flex items-center gap-2 cursor-pointer transition-all hover:bg-white/5 ${m.winner?.id === m.away.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                    >
                      <img src={`/escudos/${m.away.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                      <span className="font-extrabold truncate flex-1">{m.away.name}</span>
                      {m.winner?.id === m.away.id && <span className="text-[10px]">🟢</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quarterfinals (Cuartos) */}
            <div className="flex flex-col w-56 shrink-0 gap-4 justify-around">
              <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">
                Cuartos de Final
              </div>
              <div className="flex flex-col justify-around flex-1 gap-24">
                {qfResolved.map((m) => (
                  <div key={m.key} className="flex flex-col bg-black/40 border border-white/5 rounded-xl overflow-hidden text-xs shadow-md">
                    <div
                      onClick={() => selectWinner(m.key, m.home)}
                      className={`px-3 py-2.5 flex items-center gap-2 cursor-pointer border-b border-white/5 transition-all hover:bg-white/5 ${m.winner?.id === m.home.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                    >
                      <img src={`/escudos/${m.home.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                      <span className="font-extrabold truncate flex-1">{m.home.name}</span>
                      {m.winner?.id === m.home.id && <span className="text-[10px]">🟢</span>}
                    </div>
                    <div
                      onClick={() => selectWinner(m.key, m.away)}
                      className={`px-3 py-2.5 flex items-center gap-2 cursor-pointer transition-all hover:bg-white/5 ${m.winner?.id === m.away.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                    >
                      <img src={`/escudos/${m.away.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                      <span className="font-extrabold truncate flex-1">{m.away.name}</span>
                      {m.winner?.id === m.away.id && <span className="text-[10px]">🟢</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semifinals (Semifinal) */}
            <div className="flex flex-col w-56 shrink-0 gap-4 justify-around">
              <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">
                Semifinales
              </div>
              <div className="flex flex-col justify-around flex-1 gap-48">
                {sfResolved.map((m) => (
                  <div key={m.key} className="flex flex-col bg-black/40 border border-white/5 rounded-xl overflow-hidden text-xs shadow-md">
                    <div
                      onClick={() => selectWinner(m.key, m.home)}
                      className={`px-3 py-2.5 flex items-center gap-2 cursor-pointer border-b border-white/5 transition-all hover:bg-white/5 ${m.winner?.id === m.home.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                    >
                      <img src={`/escudos/${m.home.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                      <span className="font-extrabold truncate flex-1">{m.home.name}</span>
                      {m.winner?.id === m.home.id && <span className="text-[10px]">🟢</span>}
                    </div>
                    <div
                      onClick={() => selectWinner(m.key, m.away)}
                      className={`px-3 py-2.5 flex items-center gap-2 cursor-pointer transition-all hover:bg-white/5 ${m.winner?.id === m.away.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                    >
                      <img src={`/escudos/${m.away.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                      <span className="font-extrabold truncate flex-1">{m.away.name}</span>
                      {m.winner?.id === m.away.id && <span className="text-[10px]">🟢</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Finals and Champion */}
            <div className="flex flex-col w-56 shrink-0 gap-8 justify-center">
              {/* Final */}
              <div className="flex flex-col gap-2">
                <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Gran Final
                </div>
                <div className="flex flex-col bg-black/40 border border-amber-500/20 rounded-xl overflow-hidden text-xs shadow-lg">
                  <div
                    onClick={() => selectWinner(finalMatchResolved.key, finalMatchResolved.home)}
                    className={`px-3 py-3 flex items-center gap-2 cursor-pointer border-b border-white/5 transition-all hover:bg-white/5 ${finalMatchResolved.winner?.id === finalMatchResolved.home.id ? 'bg-amber-500/10 text-amber-400 font-bold' : 'text-slate-300'}`}
                  >
                    <img src={`/escudos/${finalMatchResolved.home.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                    <span className="font-extrabold truncate flex-1">{finalMatchResolved.home.name}</span>
                    {finalMatchResolved.winner?.id === finalMatchResolved.home.id && <span className="text-[10px]">🏆</span>}
                  </div>
                  <div
                    onClick={() => selectWinner(finalMatchResolved.key, finalMatchResolved.away)}
                    className={`px-3 py-3 flex items-center gap-2 cursor-pointer transition-all hover:bg-white/5 ${finalMatchResolved.winner?.id === finalMatchResolved.away.id ? 'bg-amber-500/10 text-amber-400 font-bold' : 'text-slate-300'}`}
                  >
                    <img src={`/escudos/${finalMatchResolved.away.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                    <span className="font-extrabold truncate flex-1">{finalMatchResolved.away.name}</span>
                    {finalMatchResolved.winner?.id === finalMatchResolved.away.id && <span className="text-[10px]">🏆</span>}
                  </div>
                </div>
              </div>

              {/* 3rd place */}
              <div className="flex flex-col gap-2">
                <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Tercer Puesto
                </div>
                <div className="flex flex-col bg-black/40 border border-white/5 rounded-xl overflow-hidden text-xs shadow-md">
                  <div
                    onClick={() => selectWinner(thirdPlaceMatchResolved.key, thirdPlaceMatchResolved.home)}
                    className={`px-3 py-2 flex items-center gap-2 cursor-pointer border-b border-white/5 transition-all hover:bg-white/5 ${thirdPlaceMatchResolved.winner?.id === thirdPlaceMatchResolved.home.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                  >
                    <img src={`/escudos/${thirdPlaceMatchResolved.home.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                    <span className="font-extrabold truncate flex-1">{thirdPlaceMatchResolved.home.name}</span>
                  </div>
                  <div
                    onClick={() => selectWinner(thirdPlaceMatchResolved.key, thirdPlaceMatchResolved.away)}
                    className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-all hover:bg-white/5 ${thirdPlaceMatchResolved.winner?.id === thirdPlaceMatchResolved.away.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300'}`}
                  >
                    <img src={`/escudos/${thirdPlaceMatchResolved.away.id}.png`} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.src = '/football2.png' }} />
                    <span className="font-extrabold truncate flex-1">{thirdPlaceMatchResolved.away.name}</span>
                  </div>
                </div>
              </div>

              {/* Champion Box */}
              {champion && champion.id > 0 && (
                <div className="bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/40 rounded-2xl p-4 text-center shadow-2xl relative overflow-hidden flex flex-col items-center gap-2 animate-pulse mt-4">
                  <Trophy className="w-12 h-12 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Campeón Mundial</span>
                  <span className="font-black text-lg text-white">{champion.name}</span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
