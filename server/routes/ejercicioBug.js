import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();


router.post("/", async (req, res) => {
    const { id_ejercicio, id_cliente, tipo, descripcion, codigo_fuente } = req.body || {};

    if (!id_ejercicio || !descripcion || !descripcion.trim()) {
        return res.status(400).json({ error: "id_ejercicio y descripcion son obligatorios" });
    }

    try {
        const { data, error } = await supabase
        .from("ejercicio_bug")
        .insert([
            {
            id_ejercicio,
            id_cliente: id_cliente || null,
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
        console.error(err);
        return res
        .status(500)
        .json({ error: "Error creando reporte", details: err?.message });
    }
});

export default router;
