// src/lib/pagination.ts
// Cursor-based pagination utility

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export function buildPrismaParams(params: PaginationParams) {
  const limit = params.limit ?? 25;
  return {
    take: limit + 1, // fetch one extra to check hasMore
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  };
}

export function buildPaginatedResult<T extends { id: string }>(
  items: T[],
  limit: number,
  total: number
): PaginationResult<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;
  return { data, nextCursor, hasMore, total };
}
