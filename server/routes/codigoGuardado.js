import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

router.get("/:id_cliente/:id_ejercicio/:lenguaje", async (req, res) => {
    const { id_cliente, id_ejercicio, lenguaje } = req.params;

    try {
        const { data, error } = await supabase
            .from("codigo_guardado")
            .select("*")
            .eq("id_cliente", id_cliente)
            .eq("id_ejercicio", id_ejercicio)
            .eq("lenguaje", lenguaje)
            .single();

        if (error && error.code !== "PGRST116") throw error;

        if (!data) return res.json({ codigo: null });
        res.json(data);
    } catch (err) {
        console.error("Error obteniendo código guardado:", err);
        res.status(500).json({ error: "Error obteniendo código guardado" });
    }
});


router.post("/", async (req, res) => {
    const { id_cliente, id_ejercicio, lenguaje, codigo } = req.body;

    if (!id_cliente || !id_ejercicio || !lenguaje || codigo === undefined) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    try {
        const { data, error } = await supabase
            .from("codigo_guardado")
            .upsert(
                {
                    id_cliente,
                    id_ejercicio,
                    lenguaje,
                    codigo,
                    fecha_actualizacion: new Date(),
                },
                { onConflict: "id_cliente,id_ejercicio,lenguaje" }
            )
            .select()
            .single();

        if (error) throw error;

        res.json({ message: "Código guardado correctamente", data });
    } catch (err) {
        console.error("Error guardando código:", err);
        res.status(500).json({ error: "Error guardando código" });
    }
});

export default router;
