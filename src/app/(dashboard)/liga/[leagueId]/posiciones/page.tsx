import LeagueRankingView from '../../../../../views/LeagueRankingView';


export async function generateStaticParams() {
  return [
    { leagueId: 'general' },
    { leagueId: 'cs2' },
    { leagueId: 'liga-arg' },
    { leagueId: 'brasileirao' },
    { leagueId: 'champions' },
    { leagueId: 'libertadores' },
    { leagueId: 'primera-nacional' },
    { leagueId: 'primera-b-metro' },
    { leagueId: 'federal-a' },
    { leagueId: 'primera-c' },
    { leagueId: 'copa-arg' },
    { leagueId: 'mls' },
    { leagueId: 'premier-league' },
    { leagueId: 'laliga' },
    { leagueId: 'serie-a' },
    { leagueId: 'ligue-1' },
  ];
}

export default function Page() {
  return <LeagueRankingView  />;
}
