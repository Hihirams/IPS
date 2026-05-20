import { z } from 'zod';

export const SyncTriggerSchema = z.object({
  entityType: z.enum(['CATEGORIES', 'BRANDS', 'PRODUCTS', 'EXCHANGE_RATE']),
  categoryId: z.string().optional(),
});

export type SyncTriggerInput = z.infer<typeof SyncTriggerSchema>;