import { useState, useCallback } from 'react';

import { SupabaseService } from '@/services/supabaseService';
import type { ReplayData } from '@/types/replay';
import { convertReplayDataToInsertInput } from '@/utils/dataTransformers';

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

  const submitScoreToOnline = useCallback(
    async (replayData: ReplayData, playerName?: string) => {
      if (isSubmitting || hasSubmitted) {
        return;
      }

      setIsSubmitting(true);
      setSubmissionError(null);

      try {
        const insertInput = convertReplayDataToInsertInput(
          replayData,
          playerName
        );
        await SupabaseService.insertReplay(insertInput);
        setHasSubmitted(true);
      } catch (error) {
        setSubmissionError(
          error instanceof Error ? error.message : 'Failed to submit score'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, hasSubmitted]
  );

  return {
    isSubmitting,
    hasSubmitted,
    submissionError,
    submitScore: submitScoreToOnline,
  };
}
