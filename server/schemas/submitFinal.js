import { z } from 'zod';

const id = z.coerce.number().int().positive();


export const submitFinalSchema = z.object({
    id_ejercicio: z.number().int().positive(),
    codigo_fuente: z.string().min(10, 'Código fuente muy corto'),
    codigo_editor: z.string().optional().nullable(),
    lenguaje: z.string().min(1),
});

export const comparacionParamsSchema = z.object({
    id_ejercicio: id,
});

export const comparacionQuerySchema = z.object({
    lenguaje: z.string().optional(),
});

export const submitIdParamSchema = z.object({
    id_submit_final: id,
});
