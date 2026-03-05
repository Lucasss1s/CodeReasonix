import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from '../middlewares/requireSesion.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = express.Router();

router.get("/:id_ejercicio", requireSesion, async (req, res) => {
    const { id_ejercicio } = req.params;
    const id_cliente = req.cliente.id_cliente;

    try {
        const { data: pistas, error: e1 } = await supabase
        .from("ejercicio_pista")
        .select("id_pista,id_ejercicio,titulo,contenido,orden")
        .eq("id_ejercicio", id_ejercicio)
        .order("orden", { ascending: true });

        if (e1) throw e1;

        const ids = (pistas || []).map(p => p.id_pista);

        let vistas = [];
        if (ids.length) {
        const { data: v, error: e2 } = await supabase
            .from("ejercicio_pista_vista")
            .select("id_pista")
            .eq("id_cliente", id_cliente)
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
        console.error("[PISTAS USER] list fail:", err);
        return res.status(500).json({ error: "Error listando pistas" });
    }
});

router.get("/:id_ejercicio/admin", requireSesion, requireAdmin, async (req, res) => {
    const { id_ejercicio } = req.params;

    try {
        const { data, error } = await supabase
        .from("ejercicio_pista")
        .select("*")
        .eq("id_ejercicio", id_ejercicio)
        .order("orden", { ascending: true });

        if (error) throw error;

        return res.json({ pistas: data || [] });

    } catch (err) {
        console.error("[PISTAS ADMIN] list fail:", err);
        return res.status(500).json({ error: "Error listando pistas" });
    }
});


router.post("/:id_ejercicio/unlock", requireSesion, async (req, res) => {
    const { id_ejercicio } = req.params;
    const id_cliente = req.cliente?.id_cliente;

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

router.get("/:id_ejercicio/progress", requireSesion, async (req, res) => {
    const { id_ejercicio } = req.params;
    const id_cliente = req.cliente?.id_cliente;

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
        return res.status(500).json({ error: "No se pudo obtener el progreso de pistas", details: err?.message });
    }
});

router.post("/:id_ejercicio", requireSesion, requireAdmin, async (req, res) => {
    const { id_ejercicio } = req.params;
    const { titulo, contenido, orden } = req.body || {};

    try {
        let finalOrden = orden !== undefined ? Number(orden) : null;

        if (finalOrden === null) {
            const { data: existing, error: e } = await supabase
                .from("ejercicio_pista")
                .select("orden")
                .eq("id_ejercicio", id_ejercicio)
                .order("orden", { ascending: false })
                .limit(1);

            if (e) throw e;
            const last = (existing && existing[0] && Number(existing[0].orden)) || 0;
            finalOrden = last + 1;
        }

        const payload = {
            id_ejercicio: Number(id_ejercicio),
            titulo: titulo.trim(),
            contenido: contenido.trim(),
            orden: finalOrden,
        };

        const { data, error } = await supabase
        .from("ejercicio_pista")
        .insert([payload])
        .select()
        .single();

        if (error) throw error;
        return res.json({ ok: true, pista: data });
    } catch (err) {
        console.error("[PISTAS] create fail:", err);
        return res.status(500).json({ error: "Error creando pista", details: err?.message });
    }
});


export default router;
