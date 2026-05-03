import { z } from 'zod';


export const createPublicacionSchema = z.object({
    contenido: z
        .string()
        .min(1, 'El contenido es requerido')
        .max(2000, 'Contenido demasiado largo')
        .transform(s => s.trim()),
}).strict();

export const deletePublicacionParamsSchema = z.object({
    id: z.coerce
        .number()
        .int()
        .positive('id inválido'),
});