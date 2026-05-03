import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";
import { validate } from "../middlewares/validate.js";
import {
  cancelSuscripcionSchema,
  renewSuscripcionSchema
} from "../schemas/suscripcion.js";

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

router.post("/cancel", requireSesion, validate(cancelSuscripcionSchema), async (req, res) => {
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

router.post("/renew", requireSesion, validate(renewSuscripcionSchema), async (req, res) => {
    try {
      const id_cliente = req.cliente?.id_cliente;
      const ahora = new Date();

      const sumar30Dias = (fecha) => {
        const f = new Date(fecha);
        f.setDate(f.getDate() + 30);
        return f;
      };

      const { data: last, error: lastErr } = await supabase
        .from("suscripcion")
        .select("*")
        .eq("id_cliente", id_cliente)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastErr) throw lastErr;

      //Not subscription exists -> create new
      if (!last) {
        const periodoFin = sumar30Dias(ahora);

        const { data: inserted, error: insErr } = await supabase
          .from("suscripcion")
          .insert([
            {
              id_cliente,
              estado: "activo",
              periodo_fin: periodoFin,
              auto_renew: true,
              creado_en: ahora,
              actualizado_en: ahora,
            },
          ])
          .select()
          .single();

        if (insErr) throw insErr;
        return res.status(201).json({ suscripcion: inserted });
      }

      const vigente =
        last.periodo_fin && new Date(last.periodo_fin) > ahora;

      //Exists and remains in active
      if (vigente) {
        // its already in auto-renew -> nothing
        if (last.auto_renew === true) {
          return res.status(200).json({ suscripcion: last });
        }

        // reactivate auto-renew
        const { data: updated, error: upErr } = await supabase
          .from("suscripcion")
          .update({
            auto_renew: true,
            cancelado_en: null,
            actualizado_en: ahora,
          })
          .eq("id_suscripcion", last.id_suscripcion)
          .select()
          .single();

        if (upErr) throw upErr;
        return res.json({ suscripcion: updated });
      }

      //Exists but expired → reactivate
      const periodoFin = sumar30Dias(ahora);

      const { data: updated, error: upErr } = await supabase
        .from("suscripcion")
        .update({
          estado: "activo",
          periodo_fin: periodoFin,
          auto_renew: true,
          cancelado_en: null,
          actualizado_en: ahora,
        })
        .eq("id_suscripcion", last.id_suscripcion)
        .select()
        .single();

      if (upErr) throw upErr;

      return res.json({ suscripcion: updated });
    } catch (err) {
      console.error("POST /suscripcion/renew error:", err);
      res.status(500).json({
        error: "Error renovando suscripción",
        details: err?.message || err,
      });
    }
  }
);


export default router;
