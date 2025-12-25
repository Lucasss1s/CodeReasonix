import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

//Get/create pref
router.get("/", requireSesion, async (req, res) => {
    const id_cliente = req.cliente?.id_cliente;

    try {
        const { data, error } = await supabase
        .from("usuario_preferencia")
        .select(
            "id_cliente, lenguaje_pref, dificultad_objetivo, modo_objetivo, tiempo_sesion_minutos"
        )
        .eq("id_cliente", id_cliente)
        .maybeSingle();

        if (error) throw error;

        if (!data) {
        return res.status(404).json({ error: "Preferencias no encontradas" });
        }

        return res.json(data);
    } catch (err) {
        console.error("Error obteniendo preferencias:", err);
        return res
        .status(500)
        .json({ error: "Error interno al obtener preferencias" });
    }
});

//Update/create pref
router.post("/", requireSesion, async (req, res) => {
    const id_cliente = req.cliente?.id_cliente;

    const {
        lenguaje_pref,
        dificultad_objetivo,
        modo_objetivo,
        tiempo_sesion_minutos,
    } = req.body;

    if (!id_cliente || !lenguaje_pref || !dificultad_objetivo) {
        return res.status(400).json({
        error:
            "Faltan campos obligatorios (id_cliente, lenguaje_pref, dificultad_objetivo)",
        });
    }

    try {
        const { data, error } = await supabase
        .from("usuario_preferencia")
        .upsert(
            {
            id_cliente,
            lenguaje_pref,
            dificultad_objetivo,
            modo_objetivo: modo_objetivo || null,
            tiempo_sesion_minutos: tiempo_sesion_minutos || null,
            },
            { onConflict: "id_cliente" } 
        )
        .select(
            "id_cliente, lenguaje_pref, dificultad_objetivo, modo_objetivo, tiempo_sesion_minutos"
        )
        .single();

        if (error) throw error;

        return res.status(200).json({
        message: "Preferencias guardadas correctamente",
        preferencias: data,
        });
    } catch (err) {
        console.error("Error guardando preferencias:", err);
        return res
        .status(500)
        .json({ error: "Error 500 al guardar preferencias" });
    }
});

export default router;
