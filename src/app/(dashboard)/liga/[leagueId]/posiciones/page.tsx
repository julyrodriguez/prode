import LeagueRankingView from '../../../../../views/LeagueRankingView';


export async function generateStaticParams() {
  return [
    { leagueId: 'mundial' },
    { leagueId: 'general' },
    { leagueId: 'cs2' },
    { leagueId: 'liga-arg' },
    { leagueId: 'brasileirao' },
    { leagueId: 'champions' },
    { leagueId: 'libertadores' },
  ];
}

export default function Page() {
  return <LeagueRankingView  />;
}
