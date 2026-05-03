import { z } from 'zod';

const id = z.coerce.number().int().positive('id invalido');
const lenguajesPermitidos = ['javascript', 'python', 'java', 'c', 'cpp'];

export const submitFinalSchema = z.object({
    id_ejercicio: id,

    codigo_fuente: z
        .string()
        .min(1, 'Codigo fuente muy corto'),

    codigo_editor: z
        .string()
        .optional()
        .nullable(),
    
    lenguaje: z
        .string()
        .min(1, 'Lenguaje requerido')
        .transform(v => v.toLowerCase())
        .refine(v => lenguajesPermitidos.includes(v), {
            message: 'Lenguaje no soportado'
        }),
});

export const comparacionParamsSchema = z.object({
    id_ejercicio: id,
});

export const comparacionQuerySchema = z.object({
    lenguaje: z
        .string()
        .optional()
        .transform(v => v ? v.toLowerCase() : undefined)
        .refine(v => !v || lenguajesPermitidos.includes(v), { 
            message: 'Lenguaje no soportado' 
        }),
});

export const submitIdParamSchema = z.object({
    id_submit_final: id,
});
