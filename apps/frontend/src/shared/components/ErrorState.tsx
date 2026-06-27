import { AlertTriangle } from 'lucide-react';
import { Button, Card } from '@bestapp/ui';
import { cardClass } from '../styles';

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Məlumatlar yüklənmədi',
  description = 'Bağlantını yoxlayın və yenidən cəhd edin.',
  onRetry
}: ErrorStateProps) {
  return (
    <Card className={`${cardClass} border-rose-500/15 bg-rose-500/8 p-6`}>
      <div className="flex items-start gap-4">
        <div className="rounded-3xl border border-rose-500/15 bg-rose-500/10 p-3 text-rose-600 shadow-sm">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-rose-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-rose-700">{description}</p>
          {onRetry ? (
            <div className="mt-4">
              <Button onClick={onRetry}>Təkrar et</Button>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
