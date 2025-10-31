import express from "express";
import { supabase } from "../config/db.js";
import { otorgarXPUnaVezPorDia, desglosarXP   } from "../services/gamificacion.js";
import { actualizarStreak } from "../services/streak.js";
import { checkAndGrantLogros } from "../services/logros.js";

const router = express.Router();


router.post("/login-xp", async (req, res) => {
  const { id_cliente } = req.body;
  if (!id_cliente) return res.status(400).json({ error: "Falta id_cliente" });

  try {
    //login diario
    const loginXP = await otorgarXPUnaVezPorDia({
      id_cliente,
      tipoActividad: "login_diario",
      xp: 5,
      motivo: { tipo: "login_diario" }
    });

    //racha 
    let streakRes;
    try {
      streakRes = await actualizarStreak(id_cliente);
    } catch (e) {
      console.warn("No se pudo actualizar streak:", e);
      streakRes = { otorga: false, streak: 0, streak_max: 0, xp: 0 };
    }

    //Logros
    let nuevosLogros = [];
    try {
      nuevosLogros = await checkAndGrantLogros(id_cliente);
    } catch (e) {
      console.warn("[login-xp] checkAndGrantLogros fallo:", e);
      nuevosLogros = [];
    }

    //rewards
    const reward_login = loginXP?.otorgado
      ? { amount: loginXP?.xp_otorgado ?? 0, icon: "💎" }
      : null;

    const reward_streak = (streakRes?.otorga && streakRes.streak >= 2)
      ? { amount: streakRes.xp, icon: "🔥" }
      : null;


    return res.json({
      otorgado: !!loginXP?.otorgado,
      xp_otorgado: loginXP?.xp ?? loginXP?.xp_otorgado ?? 0,
      reward_login,
      reward_streak,
      streak: streakRes.streak,
      streak_max: streakRes.streak_max,
      nuevosLogros 
    });
  } catch (e) {
    console.error("[login-xp] error:", e);
    return res.status(500).json({ error: "No se pudo otorgar XP de login" });
  }
});


router.get("/me/:id_cliente", async (req, res) => {
  const id_cliente = parseInt(req.params.id_cliente, 10);
  if (!id_cliente) return res.status(400).json({ error: "id_cliente inválido" });

  try {
    const { data: ux } = await supabase
      .from("usuario_xp")
      .select("xp_total, nivel")
      .eq("id_cliente", id_cliente)
      .single();

    //progreso nivel
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

    //actividad  hoy 
    const hoy = new Date().toISOString().slice(0, 10);
    const tiposMap = {
      login: "login_diario",
      resolver_ejercicio: "resolver_ejercicio",
      primer_resuelto_dia: "primer_resuelto_dia",
    };
    const hoyObj = {};
    for (const [alias, real] of Object.entries(tiposMap)) {
      const { data } = await supabase
        .from("actividad_diaria")
        .select("xp, contador")
        .eq("id_cliente", id_cliente)
        .eq("fecha", hoy)
        .eq("tipo", real)
        .maybeSingle(); // evita PGRST116
      hoyObj[alias] = {
        done: !!data,
        xp: data?.xp ?? 0,
        contador: data?.contador ?? 0,
      };
    }

    //racha
    const { data: srow } = await supabase
      .from("usuario_streak")
      .select("streak_actual, streak_max")
      .eq("id_cliente", id_cliente)
      .maybeSingle();

    const streak = srow?.streak_actual ?? 0;
    const streak_max = srow?.streak_max ?? 0;

    //ultims 10 cambios
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
      streak_max,
      feed: feed ?? []
    });
  } catch (e) {
    console.error("[me] error:", e);
    res.status(500).json({ error: "No se pudo obtener gamificación" });
  }
});


export default router;
