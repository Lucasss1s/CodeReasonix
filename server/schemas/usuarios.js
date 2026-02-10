import { z } from 'zod';

export const registerSchema = z.object({
    nombre: z.string().min(2, 'Nombre muy corto'),
    email: z.string().email('Email invalido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    sesion_id: z.string().uuid('sesion_id invalido'),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const changePasswordSchema = z.object({
    currPass: z.string().min(1),
    newPass: z.string().min(6),
});

export const updateMeSchema = z.object({
    nombre: z.string().min(2).optional(),
    email: z.string().email().optional(),
}).refine(data => data.nombre !== undefined || data.email !== undefined, {
    message: "Nada para actualizar"
});

export const updateEstadoSchema = z.object({
    estado: z.boolean(),
});

export const confirmEmailSchema = z.object({
    sesion_id: z.string().uuid(),
});
