import { supabase } from "../config/db.js";
import { otorgarXP } from "./gamificacion.js";

/*condicion logro*/
async function evalCondition(cond, id_cliente) {
  if (!cond) return false;
  if (typeof cond === "string") {
    try { cond = JSON.parse(cond); } catch (e) { /*continuar*/ }
  }
  if (!cond || !cond.tipo) return false;
  const tipo = (cond.tipo || "").toString().toLowerCase();

  switch (tipo) {
    case "login": {
      const veces = cond.veces ?? 1;
      const { count, error } = await supabase
        .from("actividad_diaria")
        .select("*", { count: "exact", head: true })
        .in("tipo", ["login", "login_diario"]);
      if (error) return false;
      const { count: cnt, error: err2 } = await supabase
        .from("actividad_diaria")
        .select("*", { count: "exact", head: true })
        .eq("id_cliente", id_cliente)
        .in("tipo", ["login", "login_diario"]);
      if (err2) return false;
      return (cnt ?? 0) >= veces;
    }

    case "streak": {
      const dias = cond.dias ?? 1;
      //usuario_streak.streak_actual 
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
      //'nivel' usa propiedad valor, 'xp_minimo' usa valor (xp total)
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

/*verificar y retornar*/
export async function checkAndGrantLogros(id_cliente) {
  if (!id_cliente) throw new Error("id_cliente requerido");

  //leer logros activos
  const { data: logros, error: lErr } = await supabase
    .from("logro")
    .select("*")
    .eq("activo", true);
  if (lErr) throw lErr;

  //logros ya otorgados
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

    //intento insertar en usuario_logro (evitar duplicados)
    const { error: insErr } = await supabase
      .from("usuario_logro")
      .insert({ id_cliente, id_logro: l.id_logro, fecha_otorgado: new Date().toISOString() });
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

    //set para evitar reintentos 
    otorgadosSet.add(l.id_logro);
  }

  return nuevos;
}
