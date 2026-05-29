import { useNavigate } from 'react-router-dom';

import { Game } from '@/components/Game/Game';
import { ScreenHeader } from '@/components/ScreenHeader';

export const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-game-background relative h-screen w-full">
      <ScreenHeader title="Play" onBack={() => navigate('/')} />
      <Game />
    </div>
  );
};
