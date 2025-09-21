import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

// 🔹 Obtener reacciones de una publicación
router.get("/publicacion/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("reaccion")
      .select("id_reaccion, tipo, fecha, cliente(id_cliente, id_usuario)")
      .eq("id_publicacion", id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error obteniendo reacciones:", err);
    res.status(500).json({ error: "Error obteniendo reacciones" });
  }
});

// 🔹 Crear reacción
router.post("/", async (req, res) => {
  const { id_publicacion, id_cliente, tipo } = req.body;
  if (!id_publicacion || !id_cliente || !tipo) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const { data, error } = await supabase
      .from("reaccion")
      .insert([{ id_publicacion, id_cliente, tipo, fecha: new Date() }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error creando reacción:", err);
    res.status(500).json({ error: "Error creando reacción" });
  }
});

export default router;
