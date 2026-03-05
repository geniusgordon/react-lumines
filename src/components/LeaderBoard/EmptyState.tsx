import { Button } from '@/components/ui/button';

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
      <p className="text-muted-foreground mb-4">{message}</p>
      {actionText && onAction && (
        <div className="flex justify-center">
          <Button onClick={onAction} className="w-auto">
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
