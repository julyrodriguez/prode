import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Falta el parámetro url' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Error al descargar la página: ${response.statusText}` }, { status: response.status });
    }

    const html = await response.text();

    // Reconstruir el RSC payload de Next.js
    const pushedChunks: string[] = [];
    const pattern = /self\.__next_f\.push\(\s*\[\s*\d+\s*,\s*"(.*?)"\s*\]\s*\)/g;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const chunk = match[1];
      try {
        // Desescapar string JSON
        const decoded = JSON.parse('"' + chunk + '"');
        pushedChunks.push(decoded);
      } catch {
        const chunkUnescaped = chunk.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        pushedChunks.push(chunkUnescaped);
      }
    }

    const rscText = pushedChunks.join('');

    // Extraer candidatos JSON de jugadores
    const results: string[] = [];
    const startPattern = /\{"name(Full)?":/g;
    let startMatch;
    while ((startMatch = startPattern.exec(rscText)) !== null) {
      const start = startMatch.index;
      let braceCount = 0;
      let inString = false;
      let escape = false;
      for (let i = start; i < rscText.length; i++) {
        const char = rscText[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              results.push(rscText.substring(start, i + 1));
              break;
            }
          }
        }
      }
    }

    const players: any[] = [];
    const seen = new Set<string>();

    for (const item of results) {
      try {
        const cleaned = item.replace(/\$[a-zA-Z0-9]+/g, 'null');
        const data = JSON.parse(cleaned);
        if (data && typeof data === 'object' && 'nameFull' in data && 'stats' in data) {
          const key = `${data.nameFull}_${data.number}`;
          if (!seen.has(key)) {
            seen.add(key);
            players.push(data);
          }
        }
      } catch {
        // Ignorar errores de parsing
      }
    }

    return NextResponse.json({ players });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
