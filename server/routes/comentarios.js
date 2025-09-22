import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

router.get("/publicacion/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("comentario")
      .select(`
        id_comentario,
        contenido,
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
    console.error("Error obteniendo comentarios:", err);
    res.status(500).json({ error: "Error obteniendo comentarios" });
  }
});

router.post("/", async (req, res) => {
  const { id_publicacion, id_cliente, contenido } = req.body;
  if (!id_publicacion || !id_cliente || !contenido) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const { data, error } = await supabase
      .from("comentario")
      .insert([
        {
          id_publicacion,
          id_cliente,
          contenido,
          fecha: new Date()
        }
      ])
      .select(`
        id_comentario,
        contenido,
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
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error creando comentario:", err);
    res.status(500).json({ error: "Error creando comentario" });
  }
});

export default router;
