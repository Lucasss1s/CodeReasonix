import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

router.post("/", requireSesion, async (req, res) => {
  const { id_publicacion, tipo } = req.body;
  const id_cliente = req.cliente.id_cliente;

  if (!id_publicacion || !tipo) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from("reaccion")
      .select("*")
      .eq("id_publicacion", id_publicacion)
      .eq("id_cliente", id_cliente)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing && existing.tipo === tipo) {
      const { error: deleteError } = await supabase
        .from("reaccion")
        .delete()
        .eq("id_reaccion", existing.id_reaccion);

      if (deleteError) throw deleteError;
      return res.json({ deleted: true });
    }

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("reaccion")
        .update({ tipo, fecha: new Date() })
        .eq("id_reaccion", existing.id_reaccion)
        .select()
        .single();

      if (updateError) throw updateError;
      return res.json(updated);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("reaccion")
      .insert([{ id_publicacion, id_cliente, tipo, fecha: new Date() }])
      .select()
      .single();

    if (insertError) throw insertError;
    res.json(inserted);
  } catch (err) {
    console.error("Error creando reacción:", err);
    res.status(500).json({ error: "Error creando reacción" });
  }
});


export default router;
