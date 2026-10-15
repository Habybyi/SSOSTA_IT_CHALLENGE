import { z } from "zod";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// Stránkovanie od prvého endpointu: so stovkami zákazníkov netreba nič prepisovať.
export function getPagination(query) {
  const { page, pageSize } = paginationSchema.parse(query);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginated(items, total, { page, pageSize }) {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
