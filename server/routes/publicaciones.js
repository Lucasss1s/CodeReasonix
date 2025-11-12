import express from "express";
import { supabase } from "../config/db.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("publicacion")
      .select(`
        id_publicacion,
        contenido,
        imagen_url,
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

router.post("/", upload.single("imagen"), async (req, res) => {
  const { id_cliente, contenido } = req.body;
  const file = req.file;

  if (!id_cliente || !contenido) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  let imagen_url = null;

  if (file) {
    try {
      const ext = file.originalname.split(".").pop() || "jpg";
      const fileName = `publicacion_${id_cliente}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("perfil-fotos")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("perfil-fotos")
        .getPublicUrl(fileName);

      imagen_url = publicUrl.publicUrl;
    } catch (e) {
      console.log(
        "Error subiendo imagen de publicación (¿bucket faltante?):",
        e?.message || e
      );
      imagen_url = null;
    }
  }

  try {
    const { data, error } = await supabase
      .from("publicacion")
      .insert([{ id_cliente, contenido, fecha: new Date(), imagen_url }])
      .select()
      .single();

    if (error) throw error;
    res.json({ publicacion: data });
  } catch (err) {
    console.error("Error creando publicación:", err);
    res.status(500).json({ error: "Error creando publicación" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { id_cliente } = req.body;

  if (!id_cliente) {
    return res.status(400).json({ error: "Falta el id_cliente" });
  }

  try {
    // Buscar publicacion
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
