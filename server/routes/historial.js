import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

router.get("/ejercicio/:id_ejercicio", requireSesion, async (req, res) => {
  const id_cliente = req.cliente.id_cliente;
  
  const { id_ejercicio } = req.params;
  const limit = Math.min(parseInt(req.query.limit || "30", 10), 100);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
  const lenguaje = req.query.lenguaje || null;
  const estado = req.query.estado || null; 

  try {
    let q = supabase
      .from("submit_final")
      .select(
        "id_submit_final, id_ejercicio, id_cliente, lenguaje, puntaje, intentos, tiempo_ejecucion, memoria_usada, fecha, resultado, detalles",
        { count: "exact" }
      )
      .eq("id_cliente", id_cliente)
      .eq("id_ejercicio", id_ejercicio)
      .order("fecha", { ascending: false })
      .range(offset, offset + limit - 1);

    if (lenguaje) q = q.eq("lenguaje", lenguaje);
    if (estado === "aceptado") q = q.eq("resultado", true);
    if (estado === "rechazado") q = q.eq("resultado", false);

    const { data, error, count } = await q;
    if (error) throw error;

    const items = (data || []).map((row) => {
      let aceptados = null;
      let totales = null;
      try {
        const det = row.detalles;
        if (typeof det === "string") {
          try { det = JSON.parse(det); } catch {}
        }
        if (Array.isArray(det)) {
          totales = det.length;
          aceptados = det.filter(
            (d) => d.resultado === "aceptado" || d.resultado === true
          ).length;
        }
      } catch (_) {}

      return {
        id_submit_final: row.id_submit_final,
        fecha: row.fecha,
        lenguaje: row.lenguaje,
        puntaje: row.puntaje,
        intentos: row.intentos,
        tiempo_ejecucion: row.tiempo_ejecucion,
        memoria_usada: row.memoria_usada,
        resultado: !!row.resultado,
        aceptados,
        totales,
      };
    });

    res.json({ total: count || 0, items });
  } catch (err) {
    console.error("[HISTORIAL] list fail:", err);
    res
      .status(500)
      .json({ error: "No se pudo obtener el historial", details: err?.message });
  }
});

router.get("/submit/:id_submit_final", requireSesion, async (req, res) => {
  const id_cliente = req.cliente.id_cliente;

  const { id_submit_final } = req.params;

  try {
    const { data, error } = await supabase
      .from("submit_final")
      .select(
        "id_submit_final, id_cliente, id_ejercicio, lenguaje, codigo_fuente, fecha, resultado, puntaje, intentos, tiempo_ejecucion, memoria_usada, codigo_editor"
      )
      .eq("id_submit_final", id_submit_final)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "No encontrado" });

    if (String(data.id_cliente) !== String(id_cliente)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    res.json({ item: data });
  } catch (err) {
    console.error("[HISTORIAL] detail fail:", err);
    res
      .status(500)
      .json({ error: "No se pudo obtener el detalle", details: err?.message });
  }
});

router.get("/ejercicio/:id_ejercicio/count", requireSesion, async (req, res) => {
  const id_cliente = req.cliente.id_cliente;

  const { id_ejercicio } = req.params;

  try {
    const { count, error } = await supabase
      .from("submit_final")
      .select("*", { count: "exact", head: true })
      .eq("id_cliente", id_cliente)
      .eq("id_ejercicio", id_ejercicio);

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("[HISTORIAL] count fail:", err);
    res.status(500).json({ error: "No se pudo obtener el total", details: err?.message });
  }
});


export default router;
