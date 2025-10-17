import express from "express";
import { otorgarXPUnaVezPorDia } from "../services/gamificacion.js";

const router = express.Router();


router.post("/login-xp", async (req, res) => {
  const { id_cliente } = req.body;
  if (!id_cliente) return res.status(400).json({ error: "Falta id_cliente" });

  try {
    const info = await otorgarXPUnaVezPorDia({
      id_cliente,
      tipoActividad: "login",
      xp: 5,
      motivo: { tipo: "login_diario" }
    });
    res.json({ ok: true, ...info });
  } catch (e) {
    console.error("[login-xp] error:", e);
    res.status(500).json({ error: "No se pudo otorgar XP de login" });
  }
});

export default router;
