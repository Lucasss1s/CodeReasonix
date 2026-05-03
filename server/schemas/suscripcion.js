import { z } from 'zod';

/*for scalability with Stripe*/

export const cancelSuscripcionSchema = z
    .object({})
    .strict(); 

export const renewSuscripcionSchema = z
    .object({})
    .strict();