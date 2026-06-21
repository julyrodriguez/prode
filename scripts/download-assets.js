import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEAGUES = [
  { id: 'mundial', name: 'Mundial', tournamentId: 16 },
  { id: 'liga-arg', name: 'Liga Argentina', tournamentId: 155 },
  { id: 'brasileirao', name: 'Brasileirao', tournamentId: 325 },
  { id: 'champions', name: 'Champions League', tournamentId: 7 },
  { id: 'libertadores', name: 'Copa Libertadores', tournamentId: 384 },
  { id: 'primera-nacional', name: 'Primera Nacional', tournamentId: 10001 },
  { id: 'primera-b-metro', name: 'Primera B Metro', tournamentId: 10002 },
  { id: 'copa-arg', name: 'Copa Argentina', tournamentId: 10005 },
  { id: 'mls', name: 'MLS', tournamentId: 10006 },
  { id: 'premier-league', name: 'Premier League', tournamentId: 10007 },
  { id: 'laliga', name: 'La Liga', tournamentId: 10008 },
  { id: 'serie-a', name: 'Serie A', tournamentId: 10009 },
  { id: 'ligue-1', name: 'Ligue 1', tournamentId: 10010 },
  { id: 'bundesliga', name: 'Bundesliga', tournamentId: 10011 },
];

const CONCURRENCY_LIMIT = 15;

async function downloadFile(url, destPath, isBinary = false) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    if (isBinary) {
      const arrayBuffer = await res.arrayBuffer();
      await fsp.writeFile(destPath, Buffer.from(arrayBuffer));
    } else {
      const data = await res.json();
      await fsp.writeFile(destPath, JSON.stringify(data, null, 2), 'utf8');
    }
    return true;
  } catch (err) {
    throw new Error(`Failed to download ${url}: ${err.message}`);
  }
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  const escudosDir = path.join(publicDir, 'escudos');
  const teamsDir = path.join(publicDir, 'teams');

  // Create directories
  await fsp.mkdir(escudosDir, { recursive: true });
  await fsp.mkdir(teamsDir, { recursive: true });

  console.log('Fetching all matches to identify teams...');
  const matchesRes = await fetch('https://apivacas.jariel.com.ar/api/matches/all');
  if (!matchesRes.ok) {
    throw new Error('Failed to fetch matches/all');
  }
  const matches = await matchesRes.json();
  console.log(`Fetched ${matches.length} total matches.`);

  const tournamentIds = new Set(LEAGUES.map(l => l.tournamentId));
  const teamsMap = new Map(); // id -> { name, leagues: Set }

  function addTeam(id, name, tournamentId) {
    if (!id) return;
    const league = LEAGUES.find(l => l.tournamentId === tournamentId);
    if (!league) return;
    if (!teamsMap.has(id)) {
      teamsMap.set(id, { name, leagues: new Set() });
    }
    teamsMap.get(id).leagues.add(league.name);
  }

  // Parse teams from matches
  for (const m of matches) {
    const tId = m.tournament_id;
    if (tournamentIds.has(tId)) {
      if (m.home_team) addTeam(m.home_team.id, m.home_team.name, tId);
      if (m.away_team) addTeam(m.away_team.id, m.away_team.name, tId);
    }
  }

  // Parse teams from standings
  console.log('Fetching standings for each league...');
  for (const league of LEAGUES) {
    if (!league.tournamentId) continue;
    try {
      const res = await fetch(`https://apivacas.jariel.com.ar/api/standings/${league.tournamentId}`);
      if (!res.ok) continue;
      const json = await res.json();
      const dataObj = json.data || {};
      for (const [key, value] of Object.entries(dataObj)) {
        if (Array.isArray(value)) {
          for (const row of value) {
            if (row.equipoId) {
              addTeam(row.equipoId, row.nombre, league.tournamentId);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Warning: Could not fetch standings for league ${league.name} (ID ${league.tournamentId}): ${e.message}`);
    }
  }

  const teams = Array.from(teamsMap.entries()).map(([id, info]) => ({
    id,
    name: info.name,
    leagues: Array.from(info.leagues)
  }));

  console.log(`Identified ${teams.length} unique teams across targeted leagues.`);

  let processedCount = 0;
  let skippedCount = 0;
  let downloadedCount = 0;
  let errorCount = 0;
  const errorsLog = [];

  const queue = [...teams];

  async function worker() {
    while (queue.length > 0) {
      const team = queue.shift();
      if (!team) continue;

      const teamId = team.id;
      const teamName = team.name;

      const escudoPath = path.join(escudosDir, `${teamId}.png`);
      const infoPath = path.join(teamsDir, `${teamId}.json`);
      const matchesPath = path.join(teamsDir, `${teamId}-matches.json`);

      // Check if they already exist
      const hasEscudo = fs.existsSync(escudoPath);
      const hasInfo = fs.existsSync(infoPath);
      const hasMatches = fs.existsSync(matchesPath);

      const needsEscudo = !hasEscudo;
      const needsInfo = !hasInfo;
      const needsMatches = !hasMatches;

      if (!needsEscudo && !needsInfo && !needsMatches) {
        processedCount++;
        skippedCount++;
        if (processedCount % 50 === 0 || processedCount === teams.length) {
          console.log(`Progress: ${processedCount}/${teams.length} teams processed.`);
        }
        continue;
      }

      try {
        const promises = [];
        if (needsEscudo) {
          promises.push(
            downloadFile(`https://apivacas.jariel.com.ar/escudos/${teamId}.png`, escudoPath, true)
              .catch(err => {
                errorsLog.push(`[Escudo] ${teamName} (${teamId}): ${err.message}`);
                errorCount++;
              })
          );
        }
        if (needsInfo) {
          promises.push(
            downloadFile(`https://apivacas.jariel.com.ar/api/teams/${teamId}`, infoPath, false)
              .catch(err => {
                errorsLog.push(`[Info] ${teamName} (${teamId}): ${err.message}`);
                errorCount++;
              })
          );
        }
        if (needsMatches) {
          promises.push(
            downloadFile(`https://apivacas.jariel.com.ar/api/teams/${teamId}/matches?limit=20`, matchesPath, false)
              .catch(err => {
                errorsLog.push(`[Matches] ${teamName} (${teamId}): ${err.message}`);
                errorCount++;
              })
          );
        }

        await Promise.all(promises);
        downloadedCount++;
      } catch (err) {
        console.error(`Unexpected error processing ${teamName} (${teamId}): ${err.message}`);
      }

      processedCount++;
      if (processedCount % 50 === 0 || processedCount === teams.length) {
        console.log(`Progress: ${processedCount}/${teams.length} teams processed.`);
      }
    }
  }

  // Run workers in parallel
  console.log(`Starting downloads with concurrency limit of ${CONCURRENCY_LIMIT}...`);
  const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());
  await Promise.all(workers);

  console.log('\n--- Download Summary ---');
  console.log(`Total teams: ${teams.length}`);
  console.log(`Skipped (already exist): ${skippedCount}`);
  console.log(`Processed/Downloaded successfully: ${downloadedCount}`);
  console.log(`Errors encountered: ${errorCount}`);
  if (errorsLog.length > 0) {
    console.log('\nDetailed Errors (first 20 shown):');
    errorsLog.slice(0, 20).forEach(e => console.log(` - ${e}`));
  }
}

main().catch(console.error);
