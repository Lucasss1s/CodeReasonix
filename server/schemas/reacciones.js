import { z } from 'zod';

const tiposReaccion = ['like', 'dislike']; 

export const reaccionSchema = z.object({
    id_publicacion: z.coerce
        .number()
        .int()
        .positive('id_publicacion inválido'),

    tipo: z
        .string()
        .transform(v => v.toLowerCase())
        .refine(v => tiposReaccion.includes(v), {
        message: 'Tipo de reacción inválido'
        }),
}).strict();