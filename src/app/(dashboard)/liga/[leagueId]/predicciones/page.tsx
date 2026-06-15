import LeaguePredictionsView from '../../../../../views/LeaguePredictionsView';


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
  return <LeaguePredictionsView  />;
}
