import express from 'express';
import { supabase } from '../config/db.js';
import { enviarCodigo } from '../utils/judge0.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const { id_cliente, id_ejercicio, codigo_fuente, lenguaje } = req.body;

    if (!id_cliente || !id_ejercicio || !codigo_fuente || !lenguaje) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    try {
        const { data: casos, error: errorCasos } = await supabase
            .from('caso_prueba')
            .select('id_caso, entrada_procesada, salida_esperada')
            .eq('id_ejercicio', id_ejercicio)
            .eq('publico', true);

        if (errorCasos) throw errorCasos;

        const resultados = [];

        for (const caso of casos) {
            // Generar codigo final usando la plantilla
            const plantilla = codigo_fuente.replace('{entrada}', caso.entrada_procesada);
            const resultado = await enviarCodigo(plantilla);

            const salida_obtenida = resultado.stdout?.trim() || 'error';
            resultados.push({
                id_caso: caso.id_caso,
                entrada: caso.entrada_procesada,
                salida_esperada: caso.salida_esperada,
                salida_obtenida,
                resultado: salida_obtenida === caso.salida_esperada ? 'aceptado' : 'rechazado'
            });
        }

        const aceptado = resultados.every(r => r.resultado === 'aceptado');

        const { error: errorInsert } = await supabase
            .from('submit')
            .insert({
                id_cliente,
                id_ejercicio,
                codigo_fuente,
                lenguaje,
                resultado: aceptado ? 'aceptado' : 'rechazado'
            });

        if (errorInsert) throw errorInsert;

        res.json({
            mensaje: 'Submit procesado con Judge0',
            resultado: aceptado ? 'aceptado' : 'rechazado',
            detalles: resultados
        });
    } catch (err) {
        console.error('Error procesando submit:', err);
        res.status(500).json({ error: 'Error procesando submit' });
    }
});

export default router;
