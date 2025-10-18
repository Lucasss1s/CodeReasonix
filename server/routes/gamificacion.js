import express from "express";
import { supabase } from "../config/db.js";
import { otorgarXPUnaVezPorDia, desglosarXP   } from "../services/gamificacion.js";

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

router.get("/me/:id_cliente", async (req, res) => {
  const id_cliente = parseInt(req.params.id_cliente, 10);
  if (!id_cliente) return res.status(400).json({ error: "id_cliente inválido" });

  try {
    // usuario_xp
    const { data: ux } = await supabase
      .from("usuario_xp")
      .select("xp_total, nivel")
      .eq("id_cliente", id_cliente)
      .single();

    // progreso en el nivel
    const xp_total = ux?.xp_total ?? 0;
    const nivel = ux?.nivel ?? 1;
    const xpNecesario = (lvl) => 100 + Math.max(lvl - 1, 0) * 20;
    let tmpXP = xp_total, lvl = 1;
    while (tmpXP >= xpNecesario(lvl)) { tmpXP -= xpNecesario(lvl); lvl++; }
    const progreso = {
      xpEnNivel: tmpXP,
      xpParaSubir: xpNecesario(lvl),
      nextLevelRemaining: xpNecesario(lvl) - tmpXP
    };

    // actividad de hoy
    const hoy = new Date().toISOString().slice(0, 10);
    const tipos = ["login", "resolver_ejercicio", "primer_resuelto_dia"];
    const hoyObj = {};
    for (const t of tipos) {
      const { data } = await supabase
        .from("actividad_diaria")
        .select("xp, contador")
        .eq("id_cliente", id_cliente)
        .eq("fecha", hoy)
        .eq("tipo", t)
        .single();
      hoyObj[t] = {
        done: !!data,
        xp: data?.xp ?? 0,
        contador: data?.contador ?? 0
      };
    }

    // streak (días consecutivos con resolver_ejercicio>0)
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const { data } = await supabase
        .from("actividad_diaria")
        .select("xp")
        .eq("id_cliente", id_cliente)
        .eq("fecha", iso)
        .eq("tipo", "resolver_ejercicio")
        .single();
      if (data && (data.xp ?? 0) > 0) streak++;
      else break;
    }

    // últimos 10 cambios (puntuacion)
    const { data: feed } = await supabase
      .from("puntuacion")
      .select("puntos, motivo, fecha")
      .eq("id_cliente", id_cliente)
      .order("fecha", { ascending: false })
      .limit(10);

    res.json({
      id_cliente,
      xp_total,
      nivel,
      progreso,
      hoy: hoyObj,
      streak,
      feed: feed ?? []
    });
  } catch (e) {
    console.error("[me] error:", e);
    res.status(500).json({ error: "No se pudo obtener gamificación" });
  }
});


export default router;
