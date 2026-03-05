import { Trophy, Clock, Globe, Users } from 'lucide-react';
import React from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabNavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  return (
    <div className="mb-6">
      <Tabs value={currentView} onValueChange={onViewChange}>
        <TabsList className="w-full">
          <TabsTrigger value="local-score" className="flex-1">
            <Trophy />
            High Score
          </TabsTrigger>
          <TabsTrigger value="local-recent" className="flex-1">
            <Clock />
            Recent
          </TabsTrigger>
          <TabsTrigger value="online" className="flex-1">
            <Globe />
            Online
          </TabsTrigger>
          <TabsTrigger value="player-scores" className="flex-1">
            <Users />
            Players
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
