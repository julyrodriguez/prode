import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://www.promiedos.com.ar/league/fifa-world-cup/fjda', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 300 } // Cache for 5 minutes (300 seconds)
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
    
    // Find the 3er puesto table
    let thirdPlaceTable = null;
    const tablesGroups = gameData.tables_groups || [];
    for (const group of tablesGroups) {
      for (const tableItem of (group.tables || [])) {
        if (tableItem.name === '3er puesto' || group.name === '3er puesto') {
          thirdPlaceTable = tableItem;
          break;
        }
      }
      if (thirdPlaceTable) break;
    }
    
    return NextResponse.json({
      brackets,
      thirdPlaceTable
    });
  } catch (error: any) {
    console.error('Error fetching bracket:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
