import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';

import { StartScreen, GameScreen } from '@/components/Game';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/play" element={<GameScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
