import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { LEAGUES } from './components/layout/AppLayout';
import MatchesView from './views/MatchesView';
import MatchDetailView from './views/MatchDetailView';
import TeamView from './views/TeamView';
import UserPredictionsView from './views/UserPredictionsView';
import RankingView from './views/RankingView';
import StatsView from './views/StatsView';
import LoginView from './views/LoginView';
import LeagueMatchesView from './views/LeagueMatchesView';
import LeaguePredictionsView from './views/LeaguePredictionsView';
import LeagueRankingView from './views/LeagueRankingView';
import LeagueTablaView from './views/LeagueTablaView';
import LeagueMinigamesView from './views/LeagueMinigamesView';
import LeagueSimulationView from './views/LeagueSimulationView';
import ProfileView from './views/ProfileView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import CS2RankingView from './views/CS2RankingView';
import CS2ProfileView from './views/CS2ProfileView';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-t-2 border-emerald-500 rounded-full"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>

            {/* ── General Section ── */}
            <Route index element={<Navigate to="/liga/mundial/partidos" replace />} />
            <Route path="general" element={<MatchesView />} />
            <Route path="predicciones" element={<MatchesView isPredictionMode={true} />} />
            <Route path="ranking" element={<RankingView />} />
            <Route path="stats" element={<StatsView />} />
            <Route path="perfil" element={<ProfileView />} />
            <Route path="cs2" element={<CS2RankingView />} />
            <Route path="cs2/player/:steam64Id" element={<CS2ProfileView />} />

            {/* ── Match / Team Detail ── */}
            <Route path="match/:id" element={<MatchDetailView />} />
            <Route path="team/:id" element={<TeamView />} />
            <Route path="predictions/:userId" element={<UserPredictionsView />} />

            {/* ── Per-League Routes ── */}
            {LEAGUES.filter(l => l.id !== 'general').map(league => (
              <Route key={league.id} path={`liga/${league.id}`}>
                <Route index element={<Navigate to={`/liga/${league.id}/partidos`} replace />} />
                <Route path="partidos" element={<LeagueMatchesView />} />
                <Route path="predicciones" element={<LeaguePredictionsView />} />
                <Route path="posiciones" element={<LeagueRankingView />} />
                <Route path="tabla" element={<LeagueTablaView />} />
                {league.id === 'mundial' && (
                  <>
                    <Route path="minijuegos" element={<LeagueMinigamesView />} />
                    <Route path="simulacion" element={<LeagueSimulationView />} />
                  </>
                )}
              </Route>
            ))}

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
