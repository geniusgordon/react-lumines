import { Trophy, Clock, Globe, Users } from 'lucide-react';

import { Button } from '@/components/Button';

interface TabNavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  return (
    <div className="mb-6 flex w-full gap-2">
      <Button
        onClick={() => onViewChange('local-score')}
        variant={currentView === 'local-score' ? 'primary' : 'secondary'}
        icon={Trophy}
        fullWidth
      >
        High Score
      </Button>
      <Button
        onClick={() => onViewChange('local-recent')}
        variant={currentView === 'local-recent' ? 'primary' : 'secondary'}
        icon={Clock}
        fullWidth
      >
        Recent
      </Button>
      <Button
        onClick={() => onViewChange('online')}
        variant={currentView === 'online' ? 'primary' : 'secondary'}
        icon={Globe}
        fullWidth
      >
        Online
      </Button>
      <Button
        onClick={() => onViewChange('player-scores')}
        variant={currentView === 'player-scores' ? 'primary' : 'secondary'}
        icon={Users}
        fullWidth
      >
        Players
      </Button>
    </div>
  );
};
