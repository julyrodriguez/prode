"use client";
import LeagueMatchesView from './LeagueMatchesView';

// Predicciones tab = same matches view but with prediction mode on
export default function LeaguePredictionsView() {
  return <LeagueMatchesView isPredictionMode={true} />;
}
