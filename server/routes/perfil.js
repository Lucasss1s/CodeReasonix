import express from "express";
import { supabase } from "../config/db.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); 

router.get("/:id_cliente", async (req, res) => {
  const { id_cliente } = req.params;

  try {
    const { data, error } = await supabase
      .from("perfil")
      .select("id_perfil, id_cliente, biografia, skills, nivel, reputacion, redes_sociales, foto_perfil")
      .eq("id_cliente", id_cliente)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    res.json(data || {});
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    res.status(500).json({ error: "Error obteniendo perfil" });
  }
});

router.put("/:id_cliente", async (req, res) => {
  const { id_cliente } = req.params;
  const { biografia, skills, nivel, reputacion, redes_sociales, foto_perfil } = req.body;

  try {
    const { data, error } = await supabase
      .from("perfil")
      .upsert(
        {
          id_cliente: parseInt(id_cliente),
          biografia,
          skills,
          nivel: nivel || 1,
          reputacion: reputacion || 0,
          redes_sociales,
          foto_perfil
        },
        { onConflict: ["id_cliente"] }
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error guardando perfil:", err);
    res.status(500).json({ error: "Error guardando perfil" });
  }
});

router.post("/:id_cliente/foto", upload.single("foto"), async (req, res) => {
  const { id_cliente } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No se subió ninguna imagen" });

  try {
    const fileName = `perfil_${id_cliente}_${Date.now()}.${file.originalname.split(".").pop()}`;

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

    const { error: updateError } = await supabase
      .from("perfil")
      .update({ foto_perfil: publicUrl.publicUrl })
      .eq("id_cliente", id_cliente);

    if (updateError) throw updateError;

    res.json({ message: "Foto actualizada ✅", url: publicUrl.publicUrl });
  } catch (err) {
    console.error("Error subiendo foto:", err);
    res.status(500).json({ error: "Error subiendo foto" });
  }
});

export default router;
