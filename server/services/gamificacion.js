import { supabase } from "../config/db.js";

//helpers de nivel/XP
function xpRequeridoParaNivel(nivel) {
  return 100 + Math.max(nivel - 1, 0) * 20;
}

export function nivelDesdeXP(xpTotal) {
  let nivel = 1;
  let restante = xpTotal;
  while (restante >= xpRequeridoParaNivel(nivel)) {
    restante -= xpRequeridoParaNivel(nivel);
    nivel += 1;
  }
  return nivel;
}

export function desglosarXP(xpTotal) {
  let nivel = 1;
  let restante = xpTotal;
  while (restante >= xpRequeridoParaNivel(nivel)) {
    restante -= xpRequeridoParaNivel(nivel);
    nivel += 1;
  }
  return {
    nivel,
    xpEnNivel: restante,
    xpParaSubir: xpRequeridoParaNivel(nivel),
  };
}

//actividad diaria
export async function registrarActividadDiaria({
  id_cliente,
  fecha = new Date(),
  tipo = "resolver_ejercicio",
  xpDelta = 0,
  incrementar = true
}) {
  const isoDate = new Date(fecha).toISOString().slice(0, 10);

  const { data: row, error: selErr } = await supabase
    .from("actividad_diaria")
    .select("xp, contador")
    .eq("id_cliente", id_cliente)
    .eq("fecha", isoDate)
    .eq("tipo", tipo)
    .single();

  if (selErr && selErr.code !== "PGRST116") throw selErr;

  const delta = Math.max(parseInt(xpDelta ?? 0, 10), 0);
  const inc = !!incrementar;

  if (!row && delta === 0 && !inc) return;

  if (!row) {
    const { error: insErr } = await supabase.from("actividad_diaria").insert({
      id_cliente,
      fecha: isoDate,
      tipo,
      xp: delta,
      contador: inc ? 1 : 0
    });
    if (insErr) throw insErr;
    return;
  }

  const nuevoXP = (row.xp ?? 0) + delta;
  const nuevoCont = (row.contador ?? 0) + (inc ? 1 : 0);

  const { error: upErr } = await supabase
    .from("actividad_diaria")
    .update({ xp: nuevoXP, contador: nuevoCont })
    .eq("id_cliente", id_cliente)
    .eq("fecha", isoDate)
    .eq("tipo", tipo);
  if (upErr) throw upErr;
}

//asegura fila en usuario_xp
async function ensureUsuarioXP(id_cliente) {
  const { data, error } = await supabase
    .from("usuario_xp")
    .select("id_cliente")
    .eq("id_cliente", id_cliente)
    .single();
  if (error && error.code !== "PGRST116") {
    // PGRST116 ->not found (PostgREST)
    throw error;
  }
  if (!data) {
    const { error: insErr } = await supabase.from("usuario_xp").insert({
      id_cliente,
      xp_total: 0,
      nivel: 1,
      ultima_actualizacion: new Date(),
    });
    if (insErr) throw insErr;
  }
}

//suma XP y recalcula nivel
export async function otorgarXP({
  id_cliente,
  cantidad,
  motivo = {},
  id_ranking = null,
  registrarActividad = false,
}) {
  //validar cantidad
  const xp = Math.max(parseInt(cantidad ?? 0, 10), 0);
  if (xp === 0) {
    return { xp_otorgado: 0, xp_total: null, nivel: null };
  }

  //registro de puntuacion
  const { error: pErr } = await supabase.from("puntuacion").insert([
    {
      id_cliente,
      id_ranking,
      puntos: xp,
      motivo, 
    },
  ]);
  if (pErr) throw pErr;

  //asegurar fila en usuario_xp
  await ensureUsuarioXP(id_cliente);

  //leer xp_total actual
  const { data: xpRow, error: selErr } = await supabase
    .from("usuario_xp")
    .select("xp_total, nivel")
    .eq("id_cliente", id_cliente)
    .single();
  if (selErr) throw selErr;

  const nuevoTotal = (xpRow?.xp_total ?? 0) + xp;
  const nuevoNivel = nivelDesdeXP(nuevoTotal);

  //actualizar usuario_xp
  const { error: upErr } = await supabase
    .from("usuario_xp")
    .update({
      xp_total: nuevoTotal,
      nivel: nuevoNivel,
      ultima_actualizacion: new Date(),
    })
    .eq("id_cliente", id_cliente);
  if (upErr) throw upErr;

  //ctividad diaria 
  if (registrarActividad) {
    await registrarActividadDiaria({ id_cliente, tipo: "resolver_ejercicio" });
  }

  return {
    xp_otorgado: xp,
    xp_total: nuevoTotal,
    nivel: nuevoNivel,
  };
}

//verificación de logros minima
export async function verificarLogros({ id_cliente }) {
  const { data: logros, error: lErr } = await supabase.from("logro").select("*");
  if (lErr) throw lErr;

  const { data: userL, error: uErr } = await supabase
    .from("usuario_logro")
    .select("id_logro")
    .eq("id_cliente", id_cliente);
  if (uErr) throw uErr;

  const existentes = new Set((userL || []).map(x => x.id_logro));
  const nuevos = [];

  for (const l of logros || []) {
    if (existentes.has(l.id_logro)) continue;
    if (await cumpleCondicion(l.condicion, id_cliente)) {
      const { error: insErr } = await supabase
        .from("usuario_logro")
        .insert({ id_cliente, id_logro: l.id_logro });
      if (!insErr) {
        nuevos.push(l);
        if ((l.xp_otorgado ?? 0) > 0) {
          await otorgarXP({
            id_cliente,
            cantidad: l.xp_otorgado,
            motivo: { tipo: "logro", detalle: { id_logro: l.id_logro, titulo: l.titulo } },
          });
        }
      }
    }
  }
  return nuevos;
}

//condiciones comunes
async function cumpleCondicion(cond, id_cliente) {
  if (!cond || !cond.tipo) return false;

  switch (cond.tipo) {
    case "ejercicios_resueltos": {
      //cuenta aceptados en submit_final
      const { count, error } = await supabase
        .from("submit_final")
        .select("*", { count: "exact", head: true })
        .eq("id_cliente", id_cliente)
        .eq("estado", true);
      if (error) return false;
      return (count ?? 0) >= (cond.cantidad ?? 1);
    }

    case "xp_minimo": {
      const { data, error } = await supabase
        .from("usuario_xp")
        .select("xp_total")
        .eq("id_cliente", id_cliente)
        .single();
      if (error) return false;
      return (data?.xp_total ?? 0) >= (cond.valor ?? 0);
    }

    case "racha_minima": {
      //requiere actividad_diaria llenada al resolver
      const dias = cond.dias ?? 3;
      const hoy = new Date();
      for (let i = 0; i < dias; i++) {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("actividad_diaria")
          .select("id_cliente")
          .eq("id_cliente", id_cliente)
          .eq("fecha", iso)
          .limit(1);
        if (error || !data || data.length === 0) return false;
      }
      return true;
    }

    default:
      return false;
  }
}




export async function otorgarXPUnaVezPorDia({
  id_cliente,
  tipoActividad,           // 'login' | 'resolver_ejercicio' | etc.
  xp,
  motivo = {}
}) {
  const hoy = new Date().toISOString().slice(0, 10);

  // ¿Ya existe actividad de este tipo hoy?
  const { data: ya, error: errSel } = await supabase
    .from("actividad_diaria")
    .select("id_cliente")
    .eq("id_cliente", id_cliente)
    .eq("fecha", hoy)
    .eq("tipo", tipoActividad)
    .limit(1);
  if (errSel) throw errSel;

  if (ya && ya.length > 0) {
    // Ya se otorgó hoy: devolvemos estado sin volver a sumar
    const { data: ux } = await supabase
      .from("usuario_xp")
      .select("xp_total, nivel")
      .eq("id_cliente", id_cliente)
      .single();
    return {
      otorgado: false,
      xp_otorgado: 0,
      xp_total: ux?.xp_total ?? 0,
      nivel: ux?.nivel ?? 1
    };
  }

  // Registrar actividad del día y sumar XP
  await registrarActividadDiaria({ id_cliente, tipo: tipoActividad, xpDelta: xp});
  const res = await otorgarXP({
    id_cliente,
    cantidad: xp,
    motivo
  });

  return {
    otorgado: true,
    ...res
  };
}
