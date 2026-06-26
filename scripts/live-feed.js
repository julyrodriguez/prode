// Using native fetch from Node v22

async function scrapeAgenda() {
  const url = Buffer.from('aHR0cHM6Ly9mdXRib2wtbGlicmVzLnN1L2FnZW5kYS8=', 'base64').toString('utf8');
  console.log(`Fetching agenda...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch agenda: ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    return html;
  } catch (error) {
    console.error('Error fetching agenda:', error);
    return null;
  }
}

function decodeBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('utf8');
  } catch (e) {
    return null;
  }
}

function parseMatches(html) {
  if (!html) return [];

  const streamPrefix = Buffer.from('aHR0cHM6Ly9mdXRib2wtbGlicmVzLnN1L2V2ZW50b3MuaHRtbD9yPQ==', 'base64').toString('utf8');
  const escapedPrefix = streamPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const streamRegex = new RegExp(`<a href="${escapedPrefix}([^"]+)"[^>]*>([\\s\\S]*?)</a>`, 'i');

  const matches = [];
  const parts = html.split('<li class="');
  let currentMatch = null;
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const typeMatch = part.match(/^([^"]+)"/);
    if (!typeMatch) continue;
    const type = typeMatch[1]; 
    
    if (type.startsWith('subitem')) {
      if (currentMatch) {
        // Parse stream link from this part
        const match = part.match(streamRegex);
        if (match) {
          const base64Url = match[1];
          const channelHtml = match[2];
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
      // It's a main match item!
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

  return matches;
}

// Simple test
async function run() {
  const html = await scrapeAgenda();
  if (!html) return;
  const matches = parseMatches(html);
  
  console.log(`\nFound ${matches.length} matches in agenda:`);
  matches.forEach((m, idx) => {
    console.log(`\n[${idx + 1}] (${m.type}) ${m.title} @ ${m.time}`);
    m.streams.forEach(s => {
      console.log(`   - ${s.channelName} (${s.quality}) -> ${s.streamUrl}`);
    });
  });
}

run();
