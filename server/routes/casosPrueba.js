import express from 'express';
import { supabase } from '../config/db.js';
import { requireSesion } from "../middlewares/requireSesion.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = express.Router();

router.get("/:id_ejercicio", async (req, res) => {
    const { id_ejercicio } = req.params;

    try {
        const { data, error } = await supabase
            .from("caso_prueba")
            .select("id_caso, id_ejercicio, entrada_procesada, salida_esperada, publico")
            .eq("id_ejercicio", id_ejercicio)
            .eq("publico", true)
            .order("id_caso", { ascending: true });

        if (error) throw error;

        return res.json({ casos: data || [] });
    } catch (err) {
        console.error("[CASOS USER] list fail:", err);
        return res.status(500).json({ error: "Error listando casos" });
    }
});

router.get("/:id_ejercicio/admin", requireSesion, requireAdmin, async (req, res) => {
    const { id_ejercicio } = req.params;

    try {
        const { data, error } = await supabase
            .from("caso_prueba")
            .select("id_caso, id_ejercicio, entrada_procesada, salida_esperada, publico")
            .eq("id_ejercicio", id_ejercicio)
            .order("id_caso", { ascending: true });

        if (error) throw error;

        return res.json({ casos: data || [] });
    } catch (err) {
        console.error("[CASOS ADMIN] list fail:", err);
        return res.status(500).json({ error: "Error listando casos" });
    }
});

router.post('/:id_ejercicio', requireSesion, requireAdmin, async (req, res) => {
    const { id_ejercicio } = req.params;
    const { entrada_procesada, salida_esperada, publico = false } = req.body || {};

    try {
        const { data, error } = await supabase
        .from('caso_prueba')
        .insert([{ id_ejercicio: id_ejercicio, entrada_procesada, salida_esperada, publico }])
        .select()
        .single();

        if (error) throw error;

        res.json({ ok: true, caso: data });
    } catch (err) {
        console.error("[CASOS] create fail:", err);
        res.status(500).json({ error: 'Error creando caso' });
    }
});

router.put('/:id', requireSesion, requireAdmin, async (req, res) => {
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
        console.error("[CASOS USER] update fail:", err);
        res.status(500).json({ error: 'Error actualizando caso' });
    }
});

export default router;
