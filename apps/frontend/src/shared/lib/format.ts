export function formatCurrency(value?: number | null, currency = 'RUB') {
  const amount = value ?? 0;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatNumber(value?: number | null, digits = 2) {
  const amount = value ?? 0;
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: digits
  }).format(amount);
}

export function formatPercent(value?: number | null, digits = 1) {
  return `${formatNumber(value ?? 0, digits)}%`;
}

export function formatDate(value?: string | Date | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return '—';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }).format(date);
}

export function formatDateOnly(value?: string | Date | null) {
  return formatDate(value, {
    hour: undefined,
    minute: undefined
  });
}

export function initials(value?: string | null) {
  if (!value) {
    return 'BA';
  }

  return value
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

