import { Button } from '@bestapp/ui';
import { cardClass } from '../styles';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`${cardClass} flex flex-col gap-3 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between`}>
      <div>
        Səhifə {page} / {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => onPageChange(Math.max(page - 1, 1))} disabled={page <= 1}>
          Geri
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page >= totalPages}
        >
          İrəli
        </Button>
      </div>
    </div>
  );
}
