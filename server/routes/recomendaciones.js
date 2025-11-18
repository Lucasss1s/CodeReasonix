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

        const resueltosIds = Array.from(
        new Set(
            (resueltos || [])
            .map((r) => r.id_ejercicio)
            .filter((id) => id != null)
        )
        );

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
        resueltosIds,
        });
    } catch (err) {
        console.error("Error obteniendo recomendaciones:", err);
        return res
        .status(500)
        .json({ error: "Error 500 al obtener recomendaciones" });
    }
});


router.get("/retomar/:id_cliente", async (req, res) => {
    const { id_cliente } = req.params;
    const id = Number(id_cliente);

    if (!id) {
        return res.status(400).json({ error: "id_cliente inválido" });
    }

    try {
        //Intentos finales
        const { data: sf, error: sfError } = await supabase
        .from("submit_final")
        .select("id_ejercicio, lenguaje, resultado, fecha, id_submit_final")
        .eq("id_cliente", id)
        .order("id_submit_final", { ascending: false });

        if (sfError) throw sfError;

        const statusByEj = {};

        for (const row of sf || []) {
        const ejId = row.id_ejercicio;
        if (!ejId) continue;

        if (!statusByEj[ejId]) {
            statusByEj[ejId] = {
            id_ejercicio: ejId,
            ultimo_lenguaje: row.lenguaje,
            ultima_fecha: row.fecha || null,
            total_intentos: 1,
            tiene_aceptado: !!row.resultado,
            };
        } else {
            statusByEj[ejId].total_intentos += 1;
            if (!statusByEj[ejId].ultima_fecha && row.fecha) {
            statusByEj[ejId].ultima_fecha = row.fecha;
            }
            if (row.resultado) statusByEj[ejId].tiene_aceptado = true;
        }
        }

        //Intentos de prueba
        const { data: sb, error: sbError } = await supabase
        .from("submit")
        .select("id_ejercicio, lenguaje, id_submit")
        .eq("id_cliente", id)
        .order("id_submit", { ascending: false });

        if (sbError) throw sbError;

        for (const row of sb || []) {
        const ejId = row.id_ejercicio;
        if (!ejId) continue;

        if (!statusByEj[ejId]) {
            statusByEj[ejId] = {
            id_ejercicio: ejId,
            ultimo_lenguaje: row.lenguaje,
            ultima_fecha: null,
            total_intentos: 1,
            tiene_aceptado: false,
            };
        } else {
            statusByEj[ejId].total_intentos += 1;
            if (!statusByEj[ejId].ultimo_lenguaje && row.lenguaje) {
            statusByEj[ejId].ultimo_lenguaje = row.lenguaje;
            }
        }
        }

        //Filtrar sin "aceptado"
        const incompletos = Object.values(statusByEj).filter(
        (s) => !s.tiene_aceptado
        );

        if (!incompletos.length) {
        return res.json({ retomar: [] });
        }

        incompletos.sort((a, b) => {
        const da = a.ultima_fecha ? new Date(a.ultima_fecha).getTime() : 0;
        const db = b.ultima_fecha ? new Date(b.ultima_fecha).getTime() : 0;
        return db - da;
        });

        const top = incompletos.slice(0, 5);
        const ids = top.map((s) => s.id_ejercicio);

        const { data: ejercicios, error: ejError } = await supabase
        .from("ejercicio")
        .select("id_ejercicio, titulo, descripcion, dificultad")
        .in("id_ejercicio", ids);

        if (ejError) throw ejError;

        const ejMap = {};
        for (const ej of ejercicios || []) {
        ejMap[ej.id_ejercicio] = ej;
        }

        const retomar = top
        .map((s) => {
            const ej = ejMap[s.id_ejercicio];
            if (!ej) return null;
            return {
            ...ej,
            ultimo_lenguaje: s.ultimo_lenguaje,
            total_intentos: s.total_intentos,
            ultima_fecha: s.ultima_fecha,
            };
        })
        .filter(Boolean);

        return res.json({ retomar });
    } catch (err) {
        console.error("Error obteniendo retomar:", err);
        return res
        .status(500)
        .json({ error: "Error interno al obtener ejercicios para retomar" });
    }
});


export default router;
