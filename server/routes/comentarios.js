import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

router.post("/", requireSesion, async (req, res) => {
  const { id_publicacion, contenido } = req.body;
  const id_cliente = req.cliente.id_cliente;
  
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
