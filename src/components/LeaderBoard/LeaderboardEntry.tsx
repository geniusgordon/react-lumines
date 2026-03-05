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
      className="border-border bg-card hover:bg-accent/50 block w-full cursor-pointer rounded-lg border p-4 transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-secondary text-secondary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold tabular-nums">
            #{rank}
          </div>
          <div>
            <h3 className="text-foreground font-semibold">{playerName}</h3>
            <p className="text-muted-foreground text-left text-xs">{date}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-foreground font-bold tabular-nums">
            {score.toLocaleString()}
          </div>
        </div>
      </div>
    </Link>
  );
};
