import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

//Lista ejercicios recomendados
router.get("/home/:id_cliente", async (req, res) => {
    const { id_cliente } = req.params;
    const id = Number(id_cliente);

    if (!id) {
        return res.status(400).json({ error: "id_cliente inválido" });
    }

    try {
        //Pref usario
        const { data: pref, error: prefError } = await supabase
        .from("usuario_preferencia")
        .select("dificultad_objetivo")
        .eq("id_cliente", id)
        .maybeSingle();

        if (prefError) throw prefError;

        if (!pref) {
        return res
            .status(404)
            .json({ error: "El usuario no tiene preferencias configuradas" });
        }

        const dificultadObjetivo = pref.dificultad_objetivo;
        const dificultadMin = Math.max(1, dificultadObjetivo - 1);
        const dificultadMax = Math.min(4, dificultadObjetivo + 1);

        //Ejercicios resueltos
        const { data: resueltos, error: resueltosError } = await supabase
        .from("submit_final")
        .select("id_ejercicio")
        .eq("id_cliente", id)
        .eq("resultado", true);

        if (resueltosError) throw resueltosError;

        const resueltosIds = (resueltos || [])
        .map((r) => r.id_ejercicio)
        .filter(Boolean);

        //Ejercicios candidatos
        let query = supabase
        .from("ejercicio")
        .select("id_ejercicio, titulo, descripcion, dificultad")
        .gte("dificultad", dificultadMin)
        .lte("dificultad", dificultadMax);

        if (resueltosIds.length > 0) {
        query = query.not("id_ejercicio", "in", `(${resueltosIds.join(",")})`);
        }

        const { data: candidatos, error: candError } = await query;

        if (candError) throw candError;

        //Ordenar x dificultad/id
        let listaOrdenada = (candidatos || []).sort((a, b) => {
        const da = Math.abs(a.dificultad - dificultadObjetivo);
        const db = Math.abs(b.dificultad - dificultadObjetivo);
        if (da !== db) return da - db;
        return a.id_ejercicio - b.id_ejercicio;
        });

        let recomendados = listaOrdenada.slice(0, 8);
        let fromFallback = false;

        //De no haber traer random
        if (recomendados.length === 0) {
        let fallbackQuery = supabase
            .from("ejercicio")
            .select("id_ejercicio, titulo, descripcion, dificultad");

        if (resueltosIds.length > 0) {
            fallbackQuery = fallbackQuery.not(
            "id_ejercicio",
            "in",
            `(${resueltosIds.join(",")})`
            );
        }

        const { data: noResueltos, error: fbError } = await fallbackQuery
            .order("dificultad", { ascending: true })
            .order("id_ejercicio", { ascending: true });

        if (fbError) throw fbError;

        recomendados = (noResueltos || []).slice(0, 8);
        fromFallback = true;
        }

        return res.json({
        recomendados,
        fromFallback,
        });
    } catch (err) {
        console.error("Error obteniendo recomendaciones:", err);
        return res
        .status(500)
        .json({ error: "Error 500 al obtener recomendaciones" });
    }
});

export default router;
