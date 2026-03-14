import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

router.get("/:id_ejercicio/:lenguaje", requireSesion, async (req, res) => {
    const id_cliente = req.cliente.id_cliente;
    const { id_ejercicio, lenguaje } = req.params;

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


router.post("/", requireSesion, async (req, res) => {
    const id_cliente = req.cliente.id_cliente;
    const { id_ejercicio, lenguaje, codigo } = req.body;

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

        res.json({ data });
    } catch (err) {
        console.error("Error guardando código:", err);
        res.status(500).json({ error: "Error guardando código" });
    }
});

export default router;
