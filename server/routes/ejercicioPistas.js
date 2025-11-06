import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

router.get("/:id_ejercicio/pistas", async (req, res) => {
    const { id_ejercicio } = req.params;
    const idCliente =
        req.query.cliente ??
        req.header("X-Client-Id") ??
        null;

    try {
        const { data: pistas, error: e1 } = await supabase
        .from("ejercicio_pista")
        .select("id_pista,id_ejercicio,titulo,contenido,orden")
        .eq("id_ejercicio", id_ejercicio)
        .order("orden", { ascending: true });

        if (e1) throw e1;

        if (!idCliente) {
        return res.json({
            pistas: pistas || [],
            unlocked_por_cliente: [],
        });
        }

        const ids = (pistas || []).map(p => p.id_pista);
        let vistas = [];
        if (ids.length) {
        const { data: v, error: e2 } = await supabase
            .from("ejercicio_pista_vista")
            .select("id_pista")
            .eq("id_cliente", idCliente)
            .in("id_pista", ids);
        if (e2) throw e2;
        vistas = v || [];
        }

        const setVistas = new Set(vistas.map(x => x.id_pista));
        const pistasMarcadas = (pistas || []).map(p => ({
        ...p,
        unlocked: setVistas.has(p.id_pista),
        }));

        return res.json({
        pistas: pistasMarcadas,
        unlocked_por_cliente: vistas.map(x => x.id_pista),
        });
    } catch (err) {
        console.error("[PISTAS] list fail:", err);
        return res.status(500).json({ error: "Error listando pistas", details: err?.message });
    }
});


router.post("/:id_ejercicio/unlock", async (req, res) => {
    const { id_ejercicio } = req.params;
    const { id_cliente } = req.body;

    if (!id_cliente) {
        return res.status(400).json({ error: "id_cliente requerido" });
    }

    try {
        //Pistas
        const { data: pistas, error: e1 } = await supabase
        .from("ejercicio_pista")
        .select("id_pista,orden,titulo,contenido")
        .eq("id_ejercicio", id_ejercicio)
        .order("orden", { ascending: true });

        if (e1) throw e1;
        if (!pistas || pistas.length === 0) {
        return res.status(404).json({ error: "El ejercicio no tiene pistas" });
        }

        //Vistas
        const { data: vistas, error: e2 } = await supabase
        .from("ejercicio_pista_vista")
        .select("id_pista")
        .eq("id_cliente", id_cliente)
        .in("id_pista", pistas.map(p => p.id_pista));

        if (e2) throw e2;

        const setVistas = new Set((vistas || []).map(v => v.id_pista));

        //Siguiente no vista
        const siguiente = pistas.find(p => !setVistas.has(p.id_pista));
        if (!siguiente) {
        return res.status(409).json({ error: "No hay más pistas para desbloquear" });
        }

        const { error: e3 } = await supabase
        .from("ejercicio_pista_vista")
        .insert([{ id_pista: siguiente.id_pista, id_cliente }]);

        if (e3 && e3.code !== "23505") { 
        console.error("[PISTAS] unlock insert fail:", e3);
        return res.status(500).json({ error: "No se pudo registrar la pista vista", details: e3.message });
        }

        const unlockedCount = setVistas.size + 1;
        const total = pistas.length;

        return res.json({
        unlocked: true,
        pista: {
            id_pista: siguiente.id_pista,
            orden: siguiente.orden,
            titulo: siguiente.titulo,
            contenido: siguiente.contenido,
        },
        progreso: { unlockedCount, total },
        });
    } catch (err) {
        console.error("[PISTAS] unlock fail:", err);
        return res.status(500).json({ error: "Error desbloqueando pista", details: err?.message });
    }
});

router.get("/:id_ejercicio/progress", async (req, res) => {
    const { id_ejercicio } = req.params;
    const id_cliente =
        req.query.cliente || req.headers["x-client-id"] || req.headers["x-client"];

    if (!id_cliente) {
        return res.status(400).json({ error: "id_cliente requerido" });
    }

    try {
        const { data: pistas, error: e1 } = await supabase
        .from("ejercicio_pista")
        .select("id_pista")
        .eq("id_ejercicio", id_ejercicio)
        .order("orden", { ascending: true });

        if (e1) {
        console.error("error e1 get pistas:", e1);
        throw e1;
        }

        const total = pistas?.length || 0;
        if (total === 0) {
        return res.json({ total: 0, unlocked: 0 });
        }

        const idsPistas = pistas.map((p) => p.id_pista);

        const { count: unlocked, error: e2 } = await supabase
        .from("ejercicio_pista_vista")
        .select("*", { count: "exact", head: true })
        .eq("id_cliente", id_cliente)
        .in("id_pista", idsPistas);


        return res.json({
        total,
        unlocked: unlocked || 0,
        });
    } catch (err) {
        console.error("progress fallo:", err?.message, err);
        return res.status(500).json({
        error: "No se pudo obtener el progreso de pistas",
        details: err?.message,
        });
    }
});


export default router;
