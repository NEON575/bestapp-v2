import type { PaginationQuery } from '@bestapp/shared';

export function buildQueryParams(query: PaginationQuery & Record<string, unknown> = {}) {
  return Object.entries(query).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }

    acc[key] = value as string | number | boolean;
    return acc;
  }, {});
}

