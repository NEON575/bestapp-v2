export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function normalizePagination(input?: { page?: number; limit?: number }) {
  const page = Math.max(Number(input?.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(input?.limit ?? 20), 1), 100);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildPaginatedResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  };
}
