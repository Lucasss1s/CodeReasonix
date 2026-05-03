import { z } from 'zod';

const lenguajesPermitidos = ['javascript', 'python', 'java', 'c', 'cpp'];

export const submitSchema = z.object({
    id_ejercicio: z.coerce
        .number()
        .int()
        .positive('id_ejercicio inválido'),

    codigo_fuente: z
        .string()
        .min(1, 'El código fuente es requerido'),

    lenguaje: z
        .string()
        .min(1, 'Lenguaje requerido')
        .transform(v => v.toLowerCase())
        .refine(v => lenguajesPermitidos.includes(v), {
            message: 'Lenguaje no soportado'
        }),
});