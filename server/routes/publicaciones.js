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

// 🔹 Eliminar publicación (solo si pertenece al cliente)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { id_cliente } = req.body;

  if (!id_cliente) {
    return res.status(400).json({ error: "Falta el id_cliente" });
  }

  try {
    // Buscar publicación
    const { data: publi, error: findError } = await supabase
      .from("publicacion")
      .select("id_cliente")
      .eq("id_publicacion", id)
      .single();

    if (findError || !publi) {
      return res.status(404).json({ error: "Publicación no encontrada" });
    }

    // Verificar que pertenece al cliente
    if (publi.id_cliente !== parseInt(id_cliente)) {
      return res.status(403).json({ error: "No puedes eliminar esta publicación" });
    }

    // Eliminar
    const { error: deleteError } = await supabase
      .from("publicacion")
      .delete()
      .eq("id_publicacion", id);

    if (deleteError) throw deleteError;

    res.json({ message: "Publicación eliminada correctamente" });
  } catch (err) {
    console.error("Error eliminando publicación:", err);
    res.status(500).json({ error: "Error eliminando publicación" });
  }
});


export default router;
