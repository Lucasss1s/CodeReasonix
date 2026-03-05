import express from 'express';
import { supabase } from '../config/db.js';
import { requireSesion } from '../middlewares/requireSesion.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = express.Router();

router.get('/', requireSesion, requireAdmin, async (req, res) => {
    const ejercicio = req.query.ejercicio;

    try {
        let query = supabase
        .from('ejercicio_bug')
        .select('*')
        .order('id_bug', { ascending: true });
        
    if (ejercicio) query = query.eq('id_ejercicio', ejercicio);

    const { data, error } = await query;

    if (error) throw error;

        res.json({ bugs: data || [] });
    } catch (err) {
        console.error("[REPORTES] list fail:", err);
        res.status(500).json({ error: 'Error listando bugs' });
    }
});

router.post('/', requireSesion, async (req, res) => {
    const id_cliente = req.cliente.id_cliente;
    const { id_ejercicio, tipo, descripcion, codigo_fuente } = req.body || {};

    try {
        const { data, error } = await supabase
        .from('ejercicio_bug')
        .insert([
            {
            id_ejercicio,
            id_cliente: id_cliente,
            tipo: tipo?.trim() || null,
            descripcion: descripcion.trim(),
            codigo_fuente: codigo_fuente || null,
            },
        ])
        .select()
        .single();

        if (error) throw error;

        return res.json({ ok: true, bug: data });
    } catch (err) {
        console.error("[REPORTES] create fail:", err);
        return res.status(500).json({ error: 'Error creando reporte' });
    }
});

export default router;
