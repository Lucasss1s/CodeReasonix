import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

router.get("/", requireSesion, async (req, res) => {
  try {
    const { data: publicaciones, error: pubError } = await supabase
      .from("publicacion")
      .select(`
        id_publicacion,
        contenido,
        imagen_url,
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
      .order("fecha", { ascending: false }); 

    if (pubError) throw pubError;

    const { data: comentarios, error: comError } = await supabase
      .from("comentario")
      .select(`
        id_comentario,
        id_publicacion,
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
      `);

    if (comError) throw comError;

    const { data: reacciones, error: reacError } = await supabase
      .from("reaccion")
      .select(`
        id_reaccion,
        id_publicacion,
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
      `);

    if (reacError) throw reacError;

    const feed = publicaciones.map((pub) => ({
      ...pub,
      comentarios: comentarios.filter((c) => c.id_publicacion === pub.id_publicacion),
      reacciones: reacciones.filter((r) => r.id_publicacion === pub.id_publicacion),
    }));

    res.json(feed);
  } catch (err) {
    console.error("Error obteniendo feed:", err);
    res.status(500).json({ error: "Error obteniendo feed" });
  }
});

export default router;
