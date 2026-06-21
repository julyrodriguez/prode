import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEAGUES = [
  { id: 'mundial', name: 'Mundial', tournamentId: 16, url: 'https://www.promiedos.com.ar/league/fifa-world-cup/fjda' },
  { id: 'liga-arg', name: 'Liga Argentina', tournamentId: 155, url: 'https://www.promiedos.com.ar/league/liga-profesional/hc' },
  { id: 'brasileirao', name: 'Brasileirao', tournamentId: 325, url: 'https://www.promiedos.com.ar/league/brasileirao-serie-a/bbd' },
  { id: 'champions', name: 'Champions League', tournamentId: 7, url: 'https://www.promiedos.com.ar/league/uefa-champions-league/fhc' },
  { id: 'libertadores', name: 'Copa Libertadores', tournamentId: 384, url: 'https://www.promiedos.com.ar/league/libertadores/bac' },
  { id: 'primera-nacional', name: 'Primera Nacional', tournamentId: 10001, url: 'https://www.promiedos.com.ar/league/primera-nacional/ebj' },
  { id: 'primera-b-metro', name: 'Primera B Metro', tournamentId: 10002, url: 'https://www.promiedos.com.ar/league/primera-b-metropolitana/fahh' },
  { id: 'copa-arg', name: 'Copa Argentina', tournamentId: 10005, url: 'https://www.promiedos.com.ar/league/copa-argentina/gea' },
  { id: 'mls', name: 'MLS', tournamentId: 10006, url: 'https://www.promiedos.com.ar/league/mls/bae' },
  { id: 'premier-league', name: 'Premier League', tournamentId: 10007, url: 'https://www.promiedos.com.ar/league/premier-league/h' },
  { id: 'laliga', name: 'La Liga', tournamentId: 10008, url: 'https://www.promiedos.com.ar/league/laliga/bb' },
  { id: 'serie-a', name: 'Serie A', tournamentId: 10009, url: 'https://www.promiedos.com.ar/league/serie-a/bh' },
  { id: 'ligue-1', name: 'Ligue 1', tournamentId: 10010, url: 'https://www.promiedos.com.ar/league/ligue-1/df' },
  { id: 'bundesliga', name: 'Bundesliga', tournamentId: 10011, url: 'https://www.promiedos.com.ar/league/bundesliga/cf' },
];

const COUNTRY_TRANSLATIONS = {
  'argentina': 'argentina',
  'brazil': 'brasil',
  'france': 'francia',
  'spain': 'espana',
  'germany': 'alemania',
  'italy': 'italia',
  'england': 'inglaterra',
  'belgium': 'belgica',
  'netherlands': 'paises bajos',
  'portugal': 'portugal',
  'croatia': 'croacia',
  'uruguay': 'uruguay',
  'colombia': 'colombia',
  'mexico': 'mexico',
  'usa': 'estados unidos',
  'united states': 'estados unidos',
  'switzerland': 'suiza',
  'denmark': 'dinamarca',
  'sweden': 'suecia',
  'norway': 'noruega',
  'poland': 'polonia',
  'ukraine': 'ucrania',
  'austria': 'austria',
  'turkiye': 'turquia',
  'turkey': 'turquia',
  'south korea': 'corea del sur',
  'japan': 'japon',
  'australia': 'australia',
  'morocco': 'marruecos',
  'senegal': 'senegal',
  'tunisia': 'tunez',
  'egypt': 'egipto',
  'saudi arabia': 'arabia saudita',
  'canada': 'canada',
  'ecuador': 'ecuador',
  'peru': 'peru',
  'chile': 'chile',
  'paraguay': 'paraguay',
  'venezuela': 'venezuela',
  'costa rica': 'costa rica',
  'south africa': 'sudafrica',
  'czechia': 'republica checa',
  'czech republic': 'republica checa',
  'scotland': 'escocia',
  'wales': 'gales',
  'ghana': 'ghana',
  'cote d ivoire': 'costa de marfil',
  'ivory coast': 'costa de marfil',
  'curacao': 'curazao',
  'new zealand': 'nueva zelanda',
  'cameroon': 'camerun',
  'algeria': 'argelia',
  'nigeria': 'nigeria',
  'greece': 'grecia',
  'ireland': 'irlanda',
  'romania': 'rumania',
  'slovakia': 'eslovaquia',
  'slovenia': 'eslovenia',
  'finland': 'finlandia',
  'hungary': 'hungria',
  'qatar': 'qatar',
  'panama': 'panama',
  'honduras': 'honduras',
  'jamaica': 'jamaica',
  'haiti': 'haiti',
  'bolivia': 'bolivia',
  'iraq': 'irak',
  'dr congo': 'rd congo',
};

const NAME_OVERRIDES = {
  'paris saint germain': 'psg',
  'paris saintgermain': 'psg',
  'tottenham hotspur': 'tottenham',
  'athletic club': 'athletic bilbao',
  'bayern munich': 'bayern',
  'bayern munchen': 'bayern',
  'inter milan': 'inter',
  'internazionale': 'inter',
  'milan': 'ac milan',
  'atletico madrid': 'atletico de madrid',
  'sporting cp': 'sporting lisboa',
  'sporting lisbon': 'sporting lisboa',
  'velez sarsfield': 'velez',
  'newells old boys': 'newells',
  'colon de santa fe': 'colon',
  'talleres de cordoba': 'talleres',
  'belgrano de cordoba': 'belgrano',
  'instituto de cordoba': 'instituto',
  'gimnasia de la plata': 'gimnasia lp',
  'gimnasia y esgrima la plata': 'gimnasia lp',
  'san martin de tucuman': 'san martin t',
  'san martin de san juan': 'san martin sj',
  'atletico de rafaela': 'atletico rafaela',
  'defensores de belgrano': 'defensores',
  'chacarita juniors': 'chacarita',
  'agropecuario argentino': 'agropecuario',
  'guillermo brown': 'brown madryn',
  'brown de adrogue': 'brown adrogue',
  'deportivo moron': 'moron',
  'deportivo madryn': 'madryn',
  'deportivo riestra': 'riestra',
  'deportivo maipu': 'maipu',
  'deportivo municipal': 'municipal',
  'sportivo belgrano': 'sportivo',
  'central cordoba de santiago del estero': 'central cordoba',
  'central cordoba sde': 'central cordoba',
  'central cordoba de rosario': 'central cordoba r',
  'argentino de quilmes': 'argentino quilmes',
  'dock sud': 'dock sud',
  'san martin de burzaco': 'san martin burzaco',
  'excursionistas': 'excursio',
  'villa dalmine': 'dalmine',
  'defensores unidos': 'cadu',
  'talleres de remedios de escalada': 'talleres re',
  'talleres escalada': 'talleres re',
  'deportivo armenio': 'armenio',
  'deportivo laferrere': 'laferrere',
  'deportivo merlo': 'merlo',
  'sportivo dock sud': 'dock sud',
  'sportivo italiano': 'italiano',
  'sportivo las parejas': 'las parejas',
  'sportivo penarol': 'penarol chimbas',
  'sportivo desamparados': 'desamparados',
  'sportivo bragado': 'bragado',
  'club atletico': '',
  
  // CL & Libertadores & Sudamericana Overrides
  'club brugge kv': 'brujas',
  'club brugge': 'brujas',
  'brugge': 'brujas',
  'cs 2 de mayo': '2 de mayo',
  '2 de mayo': '2 de mayo',
  'o\'higgins': 'o higgins',
  'ohiggins': 'o higgins',
  'guarani': 'guarani',
  'juventud de las piedras': 'juventud',
  'deportivo tachira': 'tachira',
  'carabobo fc': 'carabobo',
  'bahia': 'bahia',
  'audax italiano': 'audax',
  'u la calera': 'union la calera',
  'palestino': 'palestino',
  'u de concepcion': 'universidad concepcion',
  'deportes concepcion': 'concepcion',
  'deportes limache': 'limache',
  'deportes cobresal': 'cobresal',
  'everton': 'everton',
};

const CONCURRENCY_LIMIT = 10;

function cleanString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(str) {
  let cleaned = cleanString(str);
  if (COUNTRY_TRANSLATIONS[cleaned]) {
    cleaned = COUNTRY_TRANSLATIONS[cleaned];
  }
  if (NAME_OVERRIDES[cleaned]) return NAME_OVERRIDES[cleaned];
  
  const words = cleaned.split(' ')
    .filter(word => !['de', 'la', 'jrs', 'juniors', 'club', 'atletico', 'deportivo', 'dvo', 'fc', 'cf', 'united', 'city', 'town', 'hotspur', 'albion', 'afc', 'athletic', 'sd', 'rc', 'real', 'as', 'sp', 'v', 'san'].includes(word));
  
  return words.join(' ');
}

function isMatch(name1, name2, shortName2) {
  const norm1 = normalize(name1);
  const norm2 = normalize(name2);
  const normShort2 = normalize(shortName2);
  
  if (norm1 === norm2 || norm1 === normShort2) return true;
  
  if (norm1.length > 2 && norm2.length > 2) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  }
  
  if (norm1.length > 2 && normShort2.length > 2) {
    if (norm1.includes(normShort2) || normShort2.includes(norm1)) return true;
  }
  
  return false;
}

async function downloadBinary(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    await fsp.writeFile(destPath, Buffer.from(arrayBuffer));
    return true;
  } catch (err) {
    throw new Error(`Failed to download binary ${url}: ${err.message}`);
  }
}

async function fetchTeamPromiedosData(teamUrlName, teamId) {
  try {
    const res = await fetch(`https://www.promiedos.com.ar/team/${teamUrlName}/${teamId}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const html = await res.text();
    const match = html.match(/<script id=\"__NEXT_DATA__\"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) throw new Error('__NEXT_DATA__ script not found');
    const parsed = JSON.parse(match[1]);
    return parsed.props.pageProps.data;
  } catch (err) {
    throw new Error(`Failed to fetch Promiedos team page: ${err.message}`);
  }
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  const escudosDir = path.join(publicDir, 'escudos');
  const teamsDir = path.join(publicDir, 'teams');

  // Create directories
  await fsp.mkdir(escudosDir, { recursive: true });
  await fsp.mkdir(teamsDir, { recursive: true });

  console.log('Loading matches/all from project API...');
  const matchesRes = await fetch('https://apivacas.jariel.com.ar/api/matches/all');
  if (!matchesRes.ok) throw new Error('Failed to fetch matches/all');
  const matches = await matchesRes.json();

  const tournamentIds = new Set(LEAGUES.map(l => l.tournamentId));
  const projectTeamsMap = new Map(); // id -> name

  for (const m of matches) {
    const tId = m.tournament_id;
    if (tournamentIds.has(tId)) {
      if (m.home_team) projectTeamsMap.set(m.home_team.id, m.home_team.name);
      if (m.away_team) projectTeamsMap.set(m.away_team.id, m.away_team.name);
    }
  }

  // Fetch standings for targets as additional source
  console.log('Loading standings to identify remaining teams...');
  for (const league of LEAGUES) {
    try {
      const res = await fetch(`https://apivacas.jariel.com.ar/api/standings/${league.tournamentId}`);
      if (!res.ok) continue;
      const json = await res.json();
      const dataObj = json.data || {};
      for (const [key, value] of Object.entries(dataObj)) {
        if (Array.isArray(value)) {
          for (const row of value) {
            if (row.equipoId) {
              projectTeamsMap.set(row.equipoId, row.nombre);
            }
          }
        }
      }
    } catch (e) {
      // Ignore standings fetch warnings
    }
  }

  const projectTeams = Array.from(projectTeamsMap.entries()).map(([id, name]) => ({ id, name }));
  console.log(`Identified ${projectTeams.length} unique project teams.`);

  // Load Promiedos competitors to build global pool
  console.log('\nFetching Promiedos league pages to extract global competitor pool...');
  const globalPromiedosTeams = new Map(); // id -> team object
  for (const league of LEAGUES) {
    console.log(`Fetching Promiedos: ${league.name}...`);
    try {
      const res = await fetch(league.url);
      if (!res.ok) continue;
      const html = await res.text();
      const match = html.match(/<script id=\"__NEXT_DATA__\"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) continue;
      
      const parsed = JSON.parse(match[1]);
      function findTeams(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (obj.id && obj.name && obj.url_name) {
          if (obj.id !== league.id) {
            globalPromiedosTeams.set(obj.id, obj);
          }
        }
        for (const key of Object.keys(obj)) {
          findTeams(obj[key]);
        }
      }
      findTeams(parsed.props.pageProps.data);
    } catch (err) {
      console.warn(`Warning: Could not extract competitors from Promiedos league ${league.name}: ${err.message}`);
    }
  }

  console.log(`Global Promiedos competitor pool size: ${globalPromiedosTeams.size}`);

  // Processing queue
  let processedCount = 0;
  let downloadedShields = 0;
  let downloadedInfo = 0;
  let downloadedMatches = 0;
  let errorsCount = 0;
  const errorsLog = [];

  const queue = [...projectTeams];
  const promiedosList = Array.from(globalPromiedosTeams.values());

  async function worker() {
    while (queue.length > 0) {
      const team = queue.shift();
      if (!team) continue;

      const teamId = team.id;
      const teamName = team.name;

      const escudoPath = path.join(escudosDir, `${teamId}.png`);
      const infoPath = path.join(teamsDir, `${teamId}.json`);
      const matchesPath = path.join(teamsDir, `${teamId}-matches.json`);

      // Match with Promiedos
      let pTeam = null;
      for (const pt of promiedosList) {
        if (isMatch(teamName, pt.name, pt.short_name)) {
          pTeam = pt;
          break;
        }
      }

      try {
        const promises = [];

        // 1. Download Shield
        if (!fs.existsSync(escudoPath)) {
          if (pTeam) {
            // Download from Promiedos
            promises.push(
              downloadBinary(`https://api.promiedos.com.ar/images/team/${pTeam.id}/1`, escudoPath)
                .then(() => downloadedShields++)
                .catch(err => {
                  errorsLog.push(`[Escudo-Promiedos] ${teamName} (${teamId}): ${err.message}`);
                  errorsCount++;
                })
            );
          } else {
            // Fallback to our project API
            promises.push(
              downloadBinary(`https://apivacas.jariel.com.ar/escudos/${teamId}.png`, escudoPath)
                .then(() => downloadedShields++)
                .catch(err => {
                  errorsLog.push(`[Escudo-Fallback] ${teamName} (${teamId}): ${err.message}`);
                  errorsCount++;
                })
            );
          }
        }

        // 2. Download Team View Profile Info JSON
        if (!fs.existsSync(infoPath)) {
          promises.push(
            fetch(`https://apivacas.jariel.com.ar/api/teams/${teamId}`)
              .then(async res => {
                if (res.ok) {
                  const data = await res.json();
                  await fsp.writeFile(infoPath, JSON.stringify(data, null, 2), 'utf8');
                  downloadedInfo++;
                } else {
                  // Fallback: If project API returns 404, we can construct the profile using Promiedos page details
                  if (pTeam) {
                    const pData = await fetchTeamPromiedosData(pTeam.url_name, pTeam.id);
                    const mappedColors = {
                      primary: pData.competitor.colors?.color || '#1e293b',
                      secondary: pData.competitor.colors?.text_color || '#94a3b8'
                    };
                    const mappedData = {
                      _id: Number(teamId),
                      logoUrl: `/escudos/${teamId}.png`,
                      name: teamName,
                      profile: {
                        stadium: pData.stadium?.name || '',
                        capacity: pData.stadium?.capacity ? Number(pData.stadium.capacity) : null,
                        city: pData.stadium?.city || '',
                        colors: mappedColors
                      },
                      competitions: {}
                    };
                    await fsp.writeFile(infoPath, JSON.stringify(mappedData, null, 2), 'utf8');
                    downloadedInfo++;
                  } else {
                    throw new Error(`Project API status ${res.status}`);
                  }
                }
              })
              .catch(err => {
                errorsLog.push(`[Info] ${teamName} (${teamId}): ${err.message}`);
                errorsCount++;
              })
          );
        }

        // 3. Download Recent Matches
        if (!fs.existsSync(matchesPath)) {
          promises.push(
            fetch(`https://apivacas.jariel.com.ar/api/teams/${teamId}/matches?limit=20`)
              .then(async res => {
                if (res.ok) {
                  const data = await res.json();
                  await fsp.writeFile(matchesPath, JSON.stringify(data, null, 2), 'utf8');
                  downloadedMatches++;
                } else {
                  throw new Error(`Project API status ${res.status}`);
                }
              })
              .catch(err => {
                errorsLog.push(`[Matches] ${teamName} (${teamId}): ${err.message}`);
                errorsCount++;
              })
          );
        }

        await Promise.all(promises);
      } catch (err) {
        console.error(`Error processing ${teamName} (${teamId}): ${err.message}`);
      }

      processedCount++;
      if (processedCount % 50 === 0 || processedCount === projectTeams.length) {
        console.log(`Progress: ${processedCount}/${projectTeams.length} teams processed.`);
      }
    }
  }

  console.log(`\nStarting asset download workers (limit: ${CONCURRENCY_LIMIT})...`);
  const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());
  await Promise.all(workers);

  console.log('\n--- Download Summary ---');
  console.log(`Total teams processed: ${projectTeams.length}`);
  console.log(`Shields downloaded/existing: ${downloadedShields}`);
  console.log(`Team profile JSONs downloaded/existing: ${downloadedInfo}`);
  console.log(`Matches JSONs downloaded/existing: ${downloadedMatches}`);
  console.log(`Errors encountered: ${errorsCount}`);

  if (errorsLog.length > 0) {
    console.log('\nDetailed Errors (first 30 shown):');
    errorsLog.slice(0, 30).forEach(e => console.log(` - ${e}`));
  }
}

main().catch(console.error);
