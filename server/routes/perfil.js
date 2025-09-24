import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

// 🔹 Obtener perfil por id_cliente
router.get("/:id_cliente", async (req, res) => {
  const { id_cliente } = req.params;

  try {
    const { data, error } = await supabase
      .from("perfil")
      .select("id_perfil, id_cliente, biografia, skills, nivel, reputacion, redes_sociales, foto_perfil")
      .eq("id_cliente", id_cliente)
      .single();

    if (error && error.code !== "PGRST116") throw error; // si no existe, devuelve null
    res.json(data || {});
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    res.status(500).json({ error: "Error obteniendo perfil" });
  }
});

// 🔹 Editar perfil de un cliente (o crearlo si no existe)
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
          nivel: nivel || 1,           // por defecto 1
          reputacion: reputacion || 0, // por defecto 0
          redes_sociales,
          foto_perfil
        },
        { onConflict: ["id_cliente"] } // si ya existe, actualiza
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

export default router;
