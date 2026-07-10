import { z } from "zod";

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
});

export const mediaSortSchema = z.object({
  sortBy: z.enum(["uploadedAt", "takenAt", "fileName", "size"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const mediaFilterSchema = z.object({
  keyword: z.string().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
  uploaderId: z.string().optional(),
  takenFrom: z.string().optional(), // ISO date
  takenTo: z.string().optional(), // ISO date
});

export const mediaQuerySchema = pageQuerySchema.merge(mediaSortSchema).merge(mediaFilterSchema);

export type MediaQuery = z.infer<typeof mediaQuerySchema>;
export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
