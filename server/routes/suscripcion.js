import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

async function normalizarSuscripcionSiExpirada(id_cliente) {
  const { data: ultima, error } = await supabase
    .from("suscripcion")
    .select("*")
    .eq("id_cliente", id_cliente)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!ultima) return null;

  const ahora = new Date();

  if (ultima.periodo_fin && new Date(ultima.periodo_fin) <= ahora) {
    if (ultima.estado !== "inactivo" && ultima.estado !== "expirado") {
      const { data: actualizado, error: upErr } = await supabase
        .from("suscripcion")
        .update({ estado: "inactivo", actualizado_en: new Date() })
        .eq("id_suscripcion", ultima.id_suscripcion)
        .select()
        .single();
      if (upErr) throw upErr;
      return actualizado;
    }
  }

  return ultima;
}

router.get("/mi", requireSesion, async (req, res) => {
  try {
    const id_cliente = req.cliente?.id_cliente;

    const sus = await normalizarSuscripcionSiExpirada(id_cliente);
    res.json({ suscripcion: sus ?? null });
  } catch (err) {
    console.error("GET /suscripcion/mi error:", err);
    res.status(500).json({ error: "Error obteniendo suscripción" });
  }
});

router.put("/:id", requireSesion, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, periodo_fin, auto_renew } = req.body;

    const { data: sus, error: susErr } = await supabase
      .from("suscripcion")
      .select("id_suscripcion, id_cliente")
      .eq("id_suscripcion", id)
      .single();

    if (susErr) throw susErr;
    if (!sus) return res.status(404).json({ error: "Suscripción no encontrada" });

    if (req.cliente && sus.id_cliente !== req.cliente.id_cliente) {
      return res.status(403).json({ error: "No autorizado para modificar esta suscripción" });
    }

    const updateData = { actualizado_en: new Date() };
    if (typeof estado !== "undefined") updateData.estado = estado;
    if (typeof periodo_fin !== "undefined") updateData.periodo_fin = periodo_fin;
    if (typeof auto_renew !== "undefined") updateData.auto_renew = auto_renew;

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
    res.status(500).json({ error: "Error actualizando suscripción" });
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
      return res.status(403).json({ error: "No autorizado" });
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

router.post("/cancel", requireSesion, async (req, res) => {
  try {
    const id_cliente = req.cliente?.id_cliente;

    const { data: last, error: lastErr } = await supabase
      .from("suscripcion")
      .select("*")
      .eq("id_cliente", id_cliente)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) throw lastErr;
    if (!last) return res.status(404).json({ error: "No se encontró suscripción para cancelar" });

    if (last.auto_renew === false) {
      return res.json({ suscripcion: last });
    }

    const updateData = {
      auto_renew: false,
      cancelado_en: new Date(),
      actualizado_en: new Date(),
    };

    const { data: updated, error: upErr } = await supabase
      .from("suscripcion")
      .update(updateData)
      .eq("id_suscripcion", last.id_suscripcion)
      .select()
      .single();

    if (upErr) throw upErr;
    res.json({ suscripcion: updated });
  } catch (err) {
    console.error("POST /suscripcion/cancel error:", err);
    res.status(500).json({ error: "Error cancelando suscripción" });
  }
});

router.post("/renew", requireSesion, async (req, res) => {
  try {
    const id_cliente = req.cliente?.id_cliente;

    const { data: last, error: lastErr } = await supabase
      .from("suscripcion")
      .select("*")
      .eq("id_cliente", id_cliente)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) throw lastErr;

    const ahora = new Date();

    if (!last) {
      const periodoFin = (() => {
        const p = new Date();
        p.setDate(p.getDate() + 30);
        return p;
      })();

      const { data: inserted, error: insErr } = await supabase
        .from("suscripcion")
        .insert([{
          id_cliente,
          estado: "activo",
          periodo_fin: periodoFin,
          auto_renew: true,
          creado_en: new Date(),
          actualizado_en: new Date()
        }])
        .select()
        .single();

      if (insErr) throw insErr;
      return res.status(201).json({ suscripcion: inserted });
    }

    if (last.periodo_fin && new Date(last.periodo_fin) > ahora) {
      if (last.auto_renew === true) {
        return res.status(200).json({ suscripcion: last });
      }
      const updateData = {
        auto_renew: true,
        cancelado_en: null,
        actualizado_en: new Date(),
      };

      const { data: updated, error: upErr } = await supabase
        .from("suscripcion")
        .update(updateData)
        .eq("id_suscripcion", last.id_suscripcion)
        .select()
        .single();

      if (upErr) throw upErr;
      return res.json({ suscripcion: updated });
    }

    const periodoFinReactivar = (() => {
      const p = new Date();
      p.setDate(p.getDate() + 30);
      return p;
    })();

    const updateData = {
      estado: "activo",
      periodo_fin: periodoFinReactivar,
      auto_renew: true,
      cancelado_en: null,
      actualizado_en: new Date(),
    };

    const { data: updated, error: upErr } = await supabase
      .from("suscripcion")
      .update(updateData)
      .eq("id_suscripcion", last.id_suscripcion)
      .select()
      .single();

    if (upErr) throw upErr;
    return res.json({ suscripcion: updated });

  } catch (err) {
    console.error("POST /suscripcion/renew error:", err);
    res.status(500).json({ error: "Error renovando suscripción", details: err?.message || err });
  }
});


/* Dev*/
router.post("/activate-manual", requireSesion, async (req, res) => {
  const allow = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_ACTIVATE === "true";
  if (!allow) {
    return res.status(403).json({ error: "activate-manual is disabled in this environment" });
  }

  try {
    const id_cliente = req.cliente?.id_cliente;

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
          auto_renew: true,
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
          auto_renew: true,
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
    res.status(500).json({ error: "Error activando suscripción", details: err?.message || err });
  }
});


export default router;
