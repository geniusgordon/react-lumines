import { Button } from '@/components/Button';

interface EmptyStateProps {
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  actionText,
  onAction,
}) => {
  return (
    <div className="py-16 text-center">
      <p className="mb-4 text-gray-400">{message}</p>
      {actionText && onAction && (
        <div className="flex justify-center">
          <Button onClick={onAction} variant="primary" className="w-auto">
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
