import { supabase } from "../config/db.js";
import { otorgarXP } from "./gamificacion.js";

/*Verificar cond */
async function evalCondition(cond, id_cliente) {
  if (!cond || !cond.tipo) return false;
  const tipo = cond.tipo;

  switch (tipo) {
    case "login": {
      const veces = cond.veces ?? 1;
      const { count, error } = await supabase
        .from("actividad_diaria")
        .select("*", { count: "exact", head: true })
        .eq("id_cliente", id_cliente)
        .in("tipo", ["login", "login_diario"]);
      if (error) return false;
      return (count ?? 0) >= veces;
    }

    case "streak": {
      const dias = cond.dias ?? 1;
      const { data: srow, error: sErr } = await supabase
        .from("usuario_streak")
        .select("streak_actual")
        .eq("id_cliente", id_cliente)
        .maybeSingle();
      if (sErr) return false;
      return (srow?.streak_actual ?? 0) >= dias;
    }

    case "ejercicio_resuelto":
    case "ejercicios_resueltos": {
      const cantidad = cond.cantidad ?? 1;
      const { count, error } = await supabase
        .from("submit_final")
        .select("*", { count: "exact", head: true })
        .eq("id_cliente", id_cliente)
        .eq("resultado", true);
      if (error) return false;
      return (count ?? 0) >= cantidad;
    }

    case "nivel":
    case "xp_minimo": {
      if (tipo === "nivel") {
        const objetivo = cond.valor ?? cond.nivel ?? 1;
        const { data } = await supabase
          .from("usuario_xp")
          .select("nivel")
          .eq("id_cliente", id_cliente)
          .maybeSingle();
        return (data?.nivel ?? 1) >= objetivo;
      } else {
        const objetivo = cond.valor ?? 0;
        const { data } = await supabase
          .from("usuario_xp")
          .select("xp_total")
          .eq("id_cliente", id_cliente)
          .maybeSingle();
        return (data?.xp_total ?? 0) >= objetivo;
      }
    }

    default:
      return false;
  }
}

/** 
 * Calcula progreso para cada tipo de condicion usando metricas precargadas
 * metrics: { loginCount, ejerciciosOK, nivel, xp_total, streak_actual }
 */
function buildProgress(cond, metrics) {
  if (!cond || !cond.tipo) return null;

  switch (cond.tipo) {
    case "login": {
      const goal = cond.veces ?? 1;
      const current = Math.min(metrics.loginCount ?? 0, goal);
      return {
        label: `Logins`,
        current,
        goal,
        percent: Math.round((current / goal) * 100)
      };
    }

    case "streak": {
      const goal = cond.dias ?? 1;
      const cur = Math.min(metrics.streak_actual ?? 0, goal);
      return {
        label: `Racha`,
        current: cur,
        goal,
        percent: Math.round((cur / goal) * 100)
      };
    }

    case "ejercicio_resuelto":
    case "ejercicios_resueltos": {
      const goal = cond.cantidad ?? 1;
      const cur = Math.min(metrics.ejerciciosOK ?? 0, goal);
      return {
        label: `Ejercicios aceptados`,
        current: cur,
        goal,
        percent: Math.round((cur / goal) * 100)
      };
    }

    case "nivel": {
      const goal = cond.valor ?? cond.nivel ?? 1;
      const cur = Math.min(metrics.nivel ?? 1, goal);
      return {
        label: `Nivel`,
        current: cur,
        goal,
        percent: Math.round((cur / goal) * 100)
      };
    }

    case "xp_minimo": {
      const goal = cond.valor ?? 0;
      const cur = Math.min(metrics.xp_total ?? 0, goal);
      const pct = goal > 0 ? Math.round((cur / goal) * 100) : 100;
      return {
        label: `XP total`,
        current: cur,
        goal,
        percent: pct
      };
    }

    default:
      return null;
  }
}

/*Metricas basicas para armar progreso sin N consultas por logro*/
async function getUserProgressMetrics(id_cliente) {
  const [loginAgg, ejerciciosAgg, xpRow, streakRow] = await Promise.all([
    supabase
      .from("actividad_diaria")
      .select("*", { count: "exact", head: true })
      .eq("id_cliente", id_cliente)
      .in("tipo", ["login", "login_diario"]),
    supabase
      .from("submit_final")
      .select("*", { count: "exact", head: true })
      .eq("id_cliente", id_cliente)
      .eq("resultado", true),
    supabase
      .from("usuario_xp")
      .select("xp_total, nivel")
      .eq("id_cliente", id_cliente)
      .maybeSingle(),
    supabase
      .from("usuario_streak")
      .select("streak_actual")
      .eq("id_cliente", id_cliente)
      .maybeSingle()
  ]);

  return {
    loginCount: loginAgg?.count ?? 0,
    ejerciciosOK: ejerciciosAgg?.count ?? 0,
    xp_total: xpRow?.data?.xp_total ?? 0,
    nivel: xpRow?.data?.nivel ?? 1,
    streak_actual: streakRow?.data?.streak_actual ?? 0
  };
}

/*Verifica y da logros faltantes */
export async function checkAndGrantLogros(id_cliente) {
  if (!id_cliente) throw new Error("id_cliente requerido");

  const { data: logros, error: lErr } = await supabase
    .from("logro")
    .select("*")
    .eq("activo", true);
  if (lErr) throw lErr;

  const { data: userLogros, error: uErr } = await supabase
    .from("usuario_logro")
    .select("id_logro")
    .eq("id_cliente", id_cliente);
  if (uErr) throw uErr;

  const otorgadosSet = new Set((userLogros || []).map((r) => r.id_logro));
  const nuevos = [];

  for (const l of logros || []) {
    if (otorgadosSet.has(l.id_logro)) continue;

    let condicion;
    try {
      condicion = l.condicion;
      if (typeof condicion === "string") condicion = JSON.parse(condicion);
    } catch (e) {
      console.warn("Condición inválida para logro", l.id_logro, e);
      continue;
    }

    const cumple = await evalCondition(condicion, id_cliente);
    if (!cumple) continue;

    const { error: insErr } = await supabase
      .from("usuario_logro")
      .insert({
        id_cliente,
        id_logro: l.id_logro,
        fecha_otorgado: new Date().toISOString(),
      });
    if (insErr) {
      if (insErr.code && (insErr.code === "23505" || insErr.message?.includes("duplicate"))) {
        continue;
      } else {
        throw insErr;
      }
    }

    const xpToGive = Number(l.xp_otorgado ?? 0);
    if (xpToGive > 0) {
      try {
        await otorgarXP({
          id_cliente,
          cantidad: xpToGive,
          motivo: { tipo: "logro", detalle: { id_logro: l.id_logro, titulo: l.titulo } },
        });
      } catch (e) {
        console.warn("No se pudo otorgar XP por logro", l.id_logro, e);
      }
    }

    nuevos.push({
      id_logro: l.id_logro,
      titulo: l.titulo,
      descripcion: l.descripcion,
      icono: l.icono,
      xp_otorgado: xpToGive,
    });

    otorgadosSet.add(l.id_logro);
  }

  return nuevos;
}

/** 
 * - obtenidos de user
 * - defs: definiciones activas, con "unlocked" (bool) y "progress"({label,current,goal,percent})
 */
export async function getLogrosWithProgress(id_cliente) {
  if (!id_cliente) throw new Error("id_cliente requerido");

  const [{ data: obtenidosRaw }, { data: defsRaw }, metrics] = await Promise.all([
    supabase
      .from("usuario_logro")
      .select("id_logro, fecha_otorgado, logro( id_logro, titulo, descripcion, icono, xp_otorgado, activo )")
      .eq("id_cliente", id_cliente)
      .order("fecha_otorgado", { ascending: false }),
    supabase
      .from("logro")
      .select("*")
      .eq("activo", true),
    getUserProgressMetrics(id_cliente)
  ]);

  const obtenidos = (obtenidosRaw || []).map(u => ({
    id_logro: u.id_logro,
    fecha_otorgado: u.fecha_otorgado,
    ...u.logro
  }));

  const obtainedSet = new Set(obtenidos.map(x => x.id_logro));

  const defs = (defsRaw || []).map((l) => {
    let cond = l.condicion;
    try { if (typeof cond === "string") cond = JSON.parse(cond); } catch {}
    const progress = buildProgress(cond, metrics);
    const unlocked = obtainedSet.has(l.id_logro);
    return { ...l, unlocked, progress };
  });

  return { obtenidos, defs };
}
