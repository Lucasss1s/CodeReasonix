import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

/*suscripcion asociada al usuario autenticado (req.cliente)*/
router.get("/mi", requireSesion, async (req, res) => {
  try {
    const id_cliente = req.cliente?.id_cliente;
    if (!id_cliente) return res.status(404).json({ error: "No se encontro cliente asociado" });

    const { data, error } = await supabase
      .from("suscripcion")
      .select("*")
      .eq("id_cliente", id_cliente)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    res.json({ suscripcion: data ?? null });
  } catch (err) {
    console.error("GET /suscripcion/mi error:", err);
    res.status(500).json({ error: "Error obteniendo suscripcion" });
  }
});

/* Crear fila de suscripcion/ */
router.post("/", requireSesion, async (req, res) => {
  try {
    const id_cliente = req.cliente?.id_cliente;
    if (!id_cliente) return res.status(400).json({ error: "Cliente no encontrado para la sesion" });

    const {
      estado = "pendiente",
      periodo_fin = null,
    } = req.body;

    const { data, error } = await supabase
      .from("suscripcion")
      .insert([
        {
          id_cliente,
          estado,
          periodo_fin,
          creado_en: new Date(),
          actualizado_en: new Date(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ suscripcion: data });
  } catch (err) {
    console.error("POST /susccion error:", err);
    res.status(500).json({ error: "Error creando suscripcion" });
  }
});

router.put("/:id", requireSesion, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, periodo_fin } = req.body;

    const { data: sus, error: susErr } = await supabase
      .from("suscripcion")
      .select("id_suscripcion, id_cliente")
      .eq("id_suscripcion", id)
      .single();

    if (susErr) throw susErr;
    if (!sus) return res.status(404).json({ error: "Suscripción no encontrada" });

    if (req.cliente && sus.id_cliente !== req.cliente.id_cliente) {
      return res.status(403).json({ error: "No autorizado para modificar esta suscripcion" });
    }

    const updateData = { actualizado_en: new Date() };
    if (estado) updateData.estado = estado;
    if (periodo_fin) updateData.periodo_fin = periodo_fin;

    const { data, error } = await supabase
      .from("suscripcion")
      .update(updateData)
      .eq("id_suscripcion", id)
      .select()
      .single();

    if (error) throw error;
    res.json({ suscripcion: data });
  } catch (err) {
    console.error("PUT /suscripcion/:id error:", err);
    res.status(500).json({ error: "Error actualizando suscripcion" });
  }
});

router.delete("/:id", requireSesion, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: sus, error: susErr } = await supabase
      .from("suscripcion")
      .select("id_suscripcion, id_cliente")
      .eq("id_suscripcion", id)
      .single();

    if (susErr) throw susErr;
    if (!sus) return res.status(404).json({ error: "Suscripción no encontrada" });
    if (req.cliente && sus.id_cliente !== req.cliente.id_cliente) {
      return res.status(403).json({ error: "No autorizacion" });
    }

    const { error } = await supabase
      .from("suscripcion")
      .delete()
      .eq("id_suscripcion", id);

    if (error) throw error;
    res.json({ message: "Suscripción eliminada" });
  } catch (err) {
    console.error("DELETE /suscripcion/:id error:", err);
    res.status(500).json({ error: "Error eliminando suscripción" });
  }
});

// dar premiun en dev
router.post("/activate-manual", requireSesion, async (req, res) => {

  const allow = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_ACTIVATE === "true";
  if (!allow) {
    return res.status(403).json({ error: "activate-manual is disabled in this environment" });
  }

  try {
    const id_cliente = req.cliente?.id_cliente;
    if (!id_cliente) return res.status(400).json({ error: "Cliente no encontrado" });

    const periodo_fin = new Date();
    periodo_fin.setDate(periodo_fin.getDate() + 30); 

    const { data: existing, error: selErr } = await supabase
      .from("suscripcion")
      .select("*")
      .eq("id_cliente", id_cliente)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selErr) throw selErr;

    if (existing) {
      const { data: updated, error: upErr } = await supabase
        .from("suscripcion")
        .update({
          estado: "activo",
          periodo_fin,
          actualizado_en: new Date()
        })
        .eq("id_suscripcion", existing.id_suscripcion)
        .select()
        .single();
      if (upErr) throw upErr;
      return res.json({ suscripcion: updated });
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("suscripcion")
        .insert([{
          id_cliente,
          estado: "activo",
          periodo_fin,
          creado_en: new Date(),
          actualizado_en: new Date()
        }])
        .select()
        .single();
      if (insErr) throw insErr;
      return res.json({ suscripcion: inserted });
    }
  } catch (err) {
    console.error("activate-manual error:", err);
    res.status(500).json({ error: "Error activando suscripcion", details: err?.message || err });
  }
});


export default router;
