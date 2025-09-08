import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// Mock de ejecución final
function ejecutarMockCompleto(codigo, lenguaje, casos) {
    const todosPasan = codigo.includes("ok");
    return casos.map(caso => ({
        id_caso: caso.id_caso,
        entrada: caso.entrada,
        salida_esperada: caso.salida_esperada,
        salida_obtenida: todosPasan ? caso.salida_esperada : "error",
        resultado: todosPasan ? "aceptado" : "rechazado"
    }));
}


router.post('/', async (req, res) => {
    const { id_cliente, id_ejercicio, codigo_fuente, lenguaje } = req.body;

    if (!id_cliente || !id_ejercicio || !codigo_fuente || !lenguaje) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    try {
        const { data: casos, error: errorCasos } = await supabase
            .from('caso_prueba')
            .select('id_caso, entrada, salida_esperada')
            .eq('id_ejercicio', id_ejercicio);

        if (errorCasos) throw errorCasos;

        const resultados = ejecutarMockCompleto(codigo_fuente, lenguaje, casos);

        const aceptado = resultados.every(r => r.resultado === "aceptado");

        const { error: errorInsert } = await supabase
            .from('submit')
            .insert({
                id_cliente,
                id_ejercicio,
                codigo_fuente,
                lenguaje,
                resultado: aceptado ? "aceptado" : "rechazado"
            });

        if (errorInsert) throw errorInsert;

        res.json({
            mensaje: "Submit final procesado (mock)",
            resultado: aceptado ? "aceptado" : "rechazado",
            detalles: resultados
        });

    } catch (err) {
        console.error('Error procesando submit final:', err);
        res.status(500).json({ error: 'Error procesando submit final' });
    }
});

export default router;
