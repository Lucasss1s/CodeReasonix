import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router(); 

router.get('/', async (req, res) => {
    try {
        const { data: ejerciciosData, error: errorEj } = await supabase
        .from('ejercicio') 
        .select('id_ejercicio, titulo, descripcion, dificultad')
        .eq('disabled', false) 
        .order('id_ejercicio', { ascending: true });

        if (errorEj) throw errorEj;

        const { data: relData, error: errorRel } = await supabase
        .from('ejercicio_etiqueta')
        .select('id_ejercicio, id_etiqueta');

        if (errorRel) throw errorRel;

        const { data: etiquetasData, error: errorEt } = await supabase
        .from('etiqueta')
        .select('id_etiqueta, nombre');

        if (errorEt) throw errorEt;

        const etiquetasById = new Map();
        (etiquetasData || []).forEach((row) => {
        etiquetasById.set(row.id_etiqueta, row.nombre);
        });

        const etiquetasPorEjercicio = {};
        (relData || []).forEach((row) => {
        const { id_ejercicio, id_etiqueta } = row;
        const nombre = etiquetasById.get(id_etiqueta);
        if (!nombre) return;

        if (!etiquetasPorEjercicio[id_ejercicio]) {
            etiquetasPorEjercicio[id_ejercicio] = [];
        }
        etiquetasPorEjercicio[id_ejercicio].push(nombre);
        });

        const ejercicios = (ejerciciosData || []).map((ej) => {
        const rawTags = etiquetasPorEjercicio[ej.id_ejercicio] || [];
        const etiquetas = [...new Set(rawTags)]; 
        return { ...ej, etiquetas };
        });

        res.json(ejercicios);
    } catch (err) {
        console.error('Error listando ejercicios:', err);
        res.status(500).json({ error: 'Error listando ejercicios'});
    }
});

// Detalle ejercicio con casos de prueba
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: ejercicio, error: errorEjercicio } = await supabase
        .from('ejercicio')
        .select('id_ejercicio, titulo, descripcion, dificultad, plantillas')
        .eq('id_ejercicio', id)
        .eq('disabled', false) 
        .single();

        if (errorEjercicio) throw errorEjercicio;
        if (!ejercicio) {
        return res.status(404).json({ error: 'Ejercicio no encontrado' });
        }
        const { data: rels, error: errorRels } = await supabase
        .from('ejercicio_etiqueta')
        .select('id_etiqueta')
        .eq('id_ejercicio', id);

        if (errorRels) throw errorRels;

        let etiquetas = [];
        if (rels && rels.length > 0) {
        const ids = rels.map((r) => r.id_etiqueta);
        const { data: tags, error: errorTags } = await supabase
            .from('etiqueta')
            .select('id_etiqueta, nombre')
            .in('id_etiqueta', ids);

        if (errorTags) throw errorTags;
        etiquetas = (tags || []).map((t) => t.nombre);
        }

        //Casos de prueba publicos
        const { data: casos, error: errorCasos } = await supabase
        .from('caso_prueba')
        .select('id_caso, entrada_procesada, salida_esperada, publico')
        .eq('id_ejercicio', id)
        .eq('publico', true);

        if (errorCasos) throw errorCasos;

        res.json({ ...ejercicio, etiquetas, casos_prueba: casos || [] });
    } catch (err) {
        console.error('Error obteniendo ejercicio:', err);
        res.status(500).json({ error: 'Error obteniendo ejercicio' });
    }
});

export default router;
