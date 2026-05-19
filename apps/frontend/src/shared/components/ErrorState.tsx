import { AlertTriangle } from 'lucide-react';
import { Button, Card } from '@bestapp/ui';

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Не удалось загрузить данные',
  description = 'Проверьте соединение с backend и повторите попытку.',
  onRetry
}: ErrorStateProps) {
  return (
    <Card className="border-rose-200 bg-rose-50 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-white p-3 text-rose-600 shadow-sm">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-rose-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-rose-700">{description}</p>
          {onRetry ? (
            <div className="mt-4">
              <Button onClick={onRetry}>Повторить</Button>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

