import { useState, useCallback } from 'react';

interface UseSupabaseQueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseSupabaseQueryResult<T> extends UseSupabaseQueryState<T> {
  refetch: () => Promise<void>;
}

interface UseSupabaseQueryOptions<T> {
  queryFn: () => Promise<T>;
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useSupabaseQuery<T>({
  queryFn,
  initialData = null,
  onSuccess,
  onError,
}: UseSupabaseQueryOptions<T>): UseSupabaseQueryResult<T> {
  const [state, setState] = useState<UseSupabaseQueryState<T>>({
    data: initialData ?? null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await queryFn();
      setState({ data: result, loading: false, error: null });
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      onError?.(error);
    }
  }, [queryFn, onSuccess, onError]);

  return {
    ...state,
    refetch: execute,
  };
}
