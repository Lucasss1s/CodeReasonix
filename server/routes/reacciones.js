import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

router.get("/publicacion/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("reaccion")
      .select(`
        id_reaccion,
        tipo,
        fecha,
        cliente (
          id_cliente,
          usuario (
            id_usuario,
            nombre,
            email
          )
        )
      `)
      .eq("id_publicacion", id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error obteniendo reacciones:", err);
    res.status(500).json({ error: "Error obteniendo reacciones" });
  }
});

router.post("/", async (req, res) => {
  const { id_publicacion, id_cliente, tipo } = req.body;
  if (!id_publicacion || !id_cliente || !tipo) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from("reaccion")
      .select("*")
      .eq("id_publicacion", id_publicacion)
      .eq("id_cliente", id_cliente)
      .single();

    if (existingError && existingError.code !== "PGRST116") throw existingError;

    let data;
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("reaccion")
        .update({ tipo, fecha: new Date() })
        .eq("id_reaccion", existing.id_reaccion)
        .select()
        .single();
      if (updateError) throw updateError;
      data = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("reaccion")
        .insert([{ id_publicacion, id_cliente, tipo, fecha: new Date() }])
        .select()
        .single();
      if (insertError) throw insertError;
      data = inserted;
    }

    res.json(data);
  } catch (err) {
    console.error("Error creando reacción:", err);
    res.status(500).json({ error: "Error creando reacción" });
  }
});


export default router;
