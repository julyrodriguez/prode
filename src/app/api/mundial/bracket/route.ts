import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://www.promiedos.com.ar/league/fifa-world-cup/fjda', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch Promiedos page: ${res.status}`);
    }
    
    const html = await res.text();
    
    // Regex to extract __NEXT_DATA__ content
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (!match) {
      return NextResponse.json({ error: 'Could not parse data from Promiedos' }, { status: 500 });
    }
    
    const parsed = JSON.parse(match[1]);
    const gameData = parsed.props?.pageProps?.data || {};
    
    const brackets = gameData.brackets || {};
    
    // 1. Build a map of promiedosTeamId -> countryName
    const promiedosTeamIdToName: Record<string, string> = {};
    const tablesGroups = gameData.tables_groups || [];
    for (const group of tablesGroups) {
      for (const tableItem of (group.tables || [])) {
        for (const row of (tableItem.table?.rows || [])) {
          const teamObj = row.entity?.object || {};
          if (teamObj.id && teamObj.name) {
            promiedosTeamIdToName[teamObj.id] = teamObj.name;
          }
        }
      }
    }
    
    // Find the 3er puesto table
    let thirdPlaceTable = null;
    for (const group of tablesGroups) {
      for (const tableItem of (group.tables || [])) {
        if (tableItem.name === '3er puesto' || group.name === '3er puesto') {
          thirdPlaceTable = tableItem;
          break;
        }
      }
      if (thirdPlaceTable) break;
    }
    
    // 2. Parse the player statistics and map team IDs to names
    const playersStatsRaw = gameData.players_statistics || {};
    const statsTables = (playersStatsRaw.tables || []).map((table: any) => {
      const rows = (table.rows || []).map((row: any) => {
        const playerObj = row.entity?.object || {};
        const teamId = playerObj.team_id;
        const teamName = promiedosTeamIdToName[teamId] || '';
        
        return {
          rank: row.num,
          playerName: playerObj.name || playerObj.sname || '?',
          teamName: teamName,
          promiedosTeamId: teamId,
          value: row.values?.[0]?.value || '0'
        };
      });
      
      return {
        name: table.name,
        key: table.columns?.[0]?.key,
        title: table.columns?.[0]?.title || table.name,
        rows: rows
      };
    });
    
    return NextResponse.json({
      brackets,
      thirdPlaceTable,
      playerStatistics: statsTables
    });
  } catch (error: any) {
    console.error('Error fetching bracket:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
