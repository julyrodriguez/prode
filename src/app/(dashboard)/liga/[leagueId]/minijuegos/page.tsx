import LeagueMinigamesView from '../../../../../views/LeagueMinigamesView';


export async function generateStaticParams() {
  return [
    { leagueId: 'general' },
    { leagueId: 'cs2' },
    { leagueId: 'liga-arg' },
    { leagueId: 'brasileirao' },
    { leagueId: 'champions' },
    { leagueId: 'libertadores' },
  ];
}

export default function Page() {
  return <LeagueMinigamesView  />;
}
