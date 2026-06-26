import { NextResponse } from 'next/server';

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function decodeBase64(str: string): string | null {
  try {
    return Buffer.from(str, 'base64').toString('utf8');
  } catch (e) {
    return null;
  }
}

interface Stream {
  channelName: string;
  quality: string;
  streamUrl: string | null;
  rawParam: string;
}

interface MatchStream {
  type: string;
  title: string;
  time: string;
  streams: Stream[];
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const home = searchParams.get('home');
  const away = searchParams.get('away');

  const agendaUrl = 'https://futbol-libres.su/agenda/';

  try {
    const res = await fetch(agendaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
      },
      next: { revalidate: 60 } // Cache agenda for 60 seconds
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch agenda: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const matches: MatchStream[] = [];
    const parts = html.split('<li class="');
    let currentMatch: MatchStream | null = null;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const typeMatch = part.match(/^([^"]+)"/);
      if (!typeMatch) continue;
      const type = typeMatch[1];

      if (type.startsWith('subitem')) {
        if (currentMatch) {
          const streamRegex = /<a href="https:\/\/futbol-libres\.su\/eventos\.html\?r=([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
          const matchResult = part.match(streamRegex);
          if (matchResult) {
            const base64Url = matchResult[1];
            const channelHtml = matchResult[2];
            const channelName = channelHtml.replace(/<span[\s\S]*?<\/span>/gi, '').replace(/<[^>]*>/g, '').trim();
            const qualityMatch = channelHtml.match(/<span>([^<]+)<\/span>/i);
            const quality = qualityMatch ? qualityMatch[1].trim() : '';

            const decodedUrl = decodeBase64(base64Url);
            currentMatch.streams.push({
              channelName,
              quality,
              streamUrl: decodedUrl,
              rawParam: base64Url
            });
          }
        }
      } else {
        const titleMatch = part.match(/<a href="#">([\s\S]*?)<\/a>/i);
        if (!titleMatch) continue;

        let title = titleMatch[1].replace(/<span[\s\S]*?<\/span>/gi, '').trim();
        title = title.replace(/<[^>]*>/g, '').trim();

        const timeMatch = titleMatch[1].match(/<span class="t">([^<]+)<\/span>/i);
        const time = timeMatch ? timeMatch[1].trim() : '';

        currentMatch = {
          type,
          title,
          time,
          streams: []
        };
        matches.push(currentMatch);
      }
    }

    // Attempt matching
    let bestMatch: MatchStream | null = null;
    let bestScore = 0;

    if (home || away) {
      const homeNorm = home ? normalize(home) : '';
      const awayNorm = away ? normalize(away) : '';

      for (const m of matches) {
        let score = 0;
        const titleNorm = normalize(m.title);

        if (homeNorm && titleNorm.includes(homeNorm)) score++;
        if (awayNorm && titleNorm.includes(awayNorm)) score++;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = m;
        }
      }
    }

    return NextResponse.json({
      success: true,
      matched: bestScore > 0 ? bestMatch : null,
      score: bestScore,
      allMatches: matches
    });

  } catch (error: any) {
    console.error('Error fetching stream:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error scraping stream agenda'
    }, { status: 500 });
  }
}
