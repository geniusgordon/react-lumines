import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';

import {
  StartScreen,
  GameScreen,
  LeaderboardScreen,
  ReplayScreen,
} from '@/screens';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/play" element={<GameScreen />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="/replays/:id" element={<ReplayScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
