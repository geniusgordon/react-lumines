interface LeaderboardEntryProps {
  rank: number;
  name: string;
  playerName: string;
  score: number;
  date: string;
  onClick?: () => void;
  isClickable?: boolean;
}

export const LeaderboardEntry: React.FC<LeaderboardEntryProps> = ({
  rank,
  name,
  playerName,
  score,
  date,
  onClick,
  isClickable = false,
}) => {
  const Component = isClickable ? 'button' : 'div';
  const clickableClasses = isClickable
    ? 'transition-all duration-200 hover:border-gray-600/50 hover:bg-gray-700/50 cursor-pointer'
    : '';

  return (
    <Component
      onClick={onClick}
      className={`block w-full rounded-lg border border-gray-700/30 bg-gray-800/50 p-4 ${clickableClasses}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-gray-300">
            #{rank}
          </div>
          <div>
            <h3 className="font-semibold text-white">{name}</h3>
            <p className="text-xs text-gray-400">
              {playerName} • {date}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-white">{score.toLocaleString()}</div>
        </div>
      </div>
    </Component>
  );
};
