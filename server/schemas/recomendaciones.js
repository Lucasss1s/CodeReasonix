import { z } from 'zod';

export const recomendacionesHomeQuerySchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .default(8),
}).strict();


export const retomarQuerySchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .default(5),
}).strict();