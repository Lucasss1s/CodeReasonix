import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router(); 

router.get('/', async (req, res) => {
    try {
        const { data: ejercicios, error } = await supabase
            .from('ejercicio')
            .select('id_ejercicio, titulo, dificultad');

        if (error) throw error;

        res.json(ejercicios);
    } catch (err) {
        console.error('Error listando ejercicios:', err);
        res.status(500).json({ error: 'Error listando ejercicios'});
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params; //Obtiene el parametro de la URL

    try {
        const { data: ejercicio, error: errorEjercicio } = await supabase
            .from('ejercicio')
            .select('id_ejercicio, titulo, descripcion, dificultad')
            .eq('id_ejercicio', id)
            .single(); //Espera solo un registro

        if (errorEjercicio) throw errorEjercicio;
        if (!ejercicio) return res.status(404).json({ error: 'Ejercicio no encontrado' });

        //Consulta los casos de prueba asociados
        const { data: casos, error: errorCasos } = await supabase
            .from('caso_prueba')
            .select('id_caso, entrada, salida_esperada, publico')
            .eq('id_ejercicio', id)
            .eq('publico', true);

        if (errorCasos) throw errorCasos;

        res.json({ ...ejercicio, casos_prueba: casos});
    } catch (err) {
        console.error('Error obteniendo ejercicio:', err);
        res.status(500).json({ error: 'Error obteniendo ejercicio'});
    }
});

export default router;
