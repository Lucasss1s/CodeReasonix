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
      .select("id_perfil, id_cliente, biografia, skills, nivel, reputacion, redes_sociales, foto_perfil, display_name, username")
      .eq("id_cliente", id_cliente)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    res.json(data || {});
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    res.status(500).json({ error: "Error obteniendo perfil" });
  }
});

router.put('/:id_cliente', async (req, res) => {
  const { id_cliente } = req.params;

  const allowed = ['biografia', 'skills', 'redes_sociales', 'foto_perfil', 'display_name', 'username'];
  const updateData = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, k)) {
      updateData[k] = req.body[k]; 
    }
  }

  try {
    //Chekeo username unico
    if (updateData.username) {
      const { data: exists, error: exErr } = await supabase
        .from('perfil')
        .select('id_cliente')
        .eq('username', updateData.username)
        .neq('id_cliente', id_cliente)
        .maybeSingle();

      if (exErr) throw exErr;
      if (exists) return res.status(409).json({ error: 'USERNAME_TAKEN' });
    }

    const { data, error } = await supabase
      .from('perfil')
      .update(updateData)
      .eq('id_cliente', id_cliente)
      .select('id_perfil, id_cliente, biografia, skills, nivel, reputacion, redes_sociales, foto_perfil, display_name, username')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando perfil:', err);
    res.status(500).json({ error: 'Error actualizando perfil' });
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

//Normalizador de @username 
function normalizeUsername(u = "") {
  return u
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, ""); 
}
function isValidUsername(u = "") {
  return /^[a-z0-9._-]{3,20}$/.test(u);
}

//disponibilidad de username
router.get('/username/availability/:username', async (req, res) => {
  const raw = req.params.username || "";
  const u = normalizeUsername(raw);
  if (!u || !isValidUsername(u)) {
    return res.json({ ok: false, reason: 'invalid' });
  }
  try {
    const { data, error } = await supabase
      .from('perfil')
      .select('id_perfil')
      .eq('username', u)
      .limit(1);

    if (error) throw error;
    const taken = (data || []).length > 0;
    res.json({ ok: !taken, reason: taken ? 'taken' : 'ok' });
  } catch (err) {
    console.error('Error check username:', err);
    res.status(500).json({ ok: false, reason: 'error' });
  }
});

export default router;
