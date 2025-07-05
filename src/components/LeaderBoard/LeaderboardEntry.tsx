import { Link } from 'react-router-dom';

interface LeaderboardEntryProps {
  replayId: string;
  rank: number;
  playerName: string;
  score: number;
  date: string;
}

export const LeaderboardEntry: React.FC<LeaderboardEntryProps> = ({
  replayId,
  rank,
  playerName,
  score,
  date,
}) => {
  return (
    <Link
      to={`/replays/${replayId}`}
      className="block w-full cursor-pointer rounded-lg border border-gray-700/30 bg-gray-800/50 p-4 transition-all duration-200 hover:border-gray-600/50 hover:bg-gray-700/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-gray-300">
            #{rank}
          </div>
          <div>
            <h3 className="font-semibold text-white">{playerName}</h3>
            <p className="text-left text-xs text-gray-400">{date}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-white">{score.toLocaleString()}</div>
        </div>
      </div>
    </Link>
  );
};
