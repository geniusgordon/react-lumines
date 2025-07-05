import { useState, useCallback } from 'react';

import type { CreateReplayInput } from '@/types/database';
import type { ReplayData } from '@/types/replay';

import { useOnlineLeaderboard } from './useOnlineLeaderboard';

interface UseScoreSubmissionResult {
  isSubmitting: boolean;
  hasSubmitted: boolean;
  submissionError: string | null;
  submitScore: (replayData: ReplayData, playerName?: string) => Promise<void>;
}

export function useScoreSubmission(): UseScoreSubmissionResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const { submitScore } = useOnlineLeaderboard();

  const submitScoreToOnline = useCallback(
    async (replayData: ReplayData, playerName?: string) => {
      if (isSubmitting || hasSubmitted) {
        return;
      }

      setIsSubmitting(true);
      setSubmissionError(null);

      try {
        const finalScore = replayData.metadata?.finalScore || 0;
        const duration = replayData.metadata?.duration || 0;

        const createReplayInput: CreateReplayInput = {
          name: `${playerName || 'Anonymous'}'s Game - ${finalScore.toLocaleString()}`,
          player_name: playerName || 'Anonymous',
          seed: replayData.seed,
          inputs: replayData.inputs,
          game_config: replayData.gameConfig,
          metadata: {
            ...replayData.metadata,
            playerName: playerName || 'Anonymous',
          },
          final_score: finalScore,
          duration_ms: duration,
        };

        const result = await submitScore(createReplayInput);

        if (result.success) {
          setHasSubmitted(true);
        } else {
          setSubmissionError(result.error || 'Failed to submit score');
        }
      } catch (error) {
        setSubmissionError(
          error instanceof Error ? error.message : 'Failed to submit score'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, hasSubmitted, submitScore]
  );

  return {
    isSubmitting,
    hasSubmitted,
    submissionError,
    submitScore: submitScoreToOnline,
  };
}
