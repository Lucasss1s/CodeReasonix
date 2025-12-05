import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

router.get('/ejercicios/:id_ejercicio/casos', async (req, res) => {
    const { id_ejercicio } = req.params;
    const isAdmin = String(req.query.admin || '') === '1';
    try {
        let q = supabase.from('caso_prueba').select('id_caso, id_ejercicio, entrada_procesada, salida_esperada, publico').eq('id_ejercicio', id_ejercicio);
        if (!isAdmin) q = q.eq('publico', true);
        const { data, error } = await q.order('id_caso', { ascending: true });
        if (error) throw error;
        res.json({ casos: data || [] });
    } catch (err) {
        console.error('Error listando casos:', err);
        res.status(500).json({ error: 'Error listando casos' });
    }
});

router.post('/ejercicios/:id_ejercicio/casos', async (req, res) => {
    const { id_ejercicio } = req.params;
    const { entrada_procesada, salida_esperada, publico = false } = req.body || {};
    if (!entrada_procesada || salida_esperada === undefined) return res.status(400).json({ error: 'entrada_procesada y salida_esperada son requeridos' });

    try {
        const { data, error } = await supabase
        .from('caso_prueba')
        .insert([{ id_ejercicio: id_ejercicio, entrada_procesada, salida_esperada, publico }])
        .select()
        .single();
        if (error) throw error;
        res.json({ ok: true, caso: data });
    } catch (err) {
        console.error('Error creando caso:', err);
        res.status(500).json({ error: 'Error creando caso' });
    }
});

router.put('/casos/:id', async (req, res) => {
    const { id } = req.params;
    const { entrada_procesada, salida_esperada, publico } = req.body || {};
    const updates = {};
    if (entrada_procesada !== undefined) updates.entrada_procesada = entrada_procesada;
    if (salida_esperada !== undefined) updates.salida_esperada = salida_esperada;
    if (publico !== undefined) updates.publico = publico;

    try {
        const { data, error } = await supabase
        .from('caso_prueba')
        .update(updates)
        .eq('id_caso', id)
        .select()
        .maybeSingle();
        if (error) throw error;
        res.json({ ok: true, caso: data });
    } catch (err) {
        console.error('Error actualizando caso:', err);
        res.status(500).json({ error: 'Error actualizando caso' });
    }
});

export default router;
