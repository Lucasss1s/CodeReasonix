import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("publicacion")
      .select(`
        id_publicacion,
        contenido,
        fecha,
        cliente (
          id_cliente,
          id_usuario,
          usuario (id_usuario, nombre, email)
        )
      `)
      .order("fecha", { ascending: false });

    if (error) throw error;
    res.json({ publicaciones: data });
  } catch (err) {
    console.error("Error obteniendo publicaciones:", err);
    res.status(500).json({ error: "Error obteniendo publicaciones" });
  }
});

router.post("/", async (req, res) => {
  const { id_cliente, contenido } = req.body;
  if (!id_cliente || !contenido) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const { data, error } = await supabase
      .from("publicacion")
      .insert([{ id_cliente, contenido, fecha: new Date() }])
      .select()
      .single();

    if (error) throw error;
    res.json({ publicacion: data });
  } catch (err) {
    console.error("Error creando publicación:", err);
    res.status(500).json({ error: "Error creando publicación" });
  }
});

export default router;
