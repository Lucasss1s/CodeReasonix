import { supabase } from "../config/db.js";

async function ensureUsuarioMoneda(id_cliente) {
  const { data, error } = await supabase
    .from("usuario_moneda")
    .select("id_cliente")
    .eq("id_cliente", id_cliente)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) {
    const { error: insErr } = await supabase
      .from("usuario_moneda")
      .insert({
        id_cliente,
        monedas_total: 0,
        ultima_actualizacion: new Date(),
      });
    if (insErr) throw insErr;
  }
}

export async function otorgarMonedas({
  id_cliente,
  cantidad,
  motivo = {},
}) {
  const monedas = Math.max(parseInt(cantidad ?? 0, 10), 0);
  if (monedas === 0) {
    return { monedas_otorgadas: 0, monedas_total: null };
  }

  await ensureUsuarioMoneda(id_cliente);

  const { data: row, error: selErr } = await supabase
    .from("usuario_moneda")
    .select("monedas_total")
    .eq("id_cliente", id_cliente)
    .single();

  if (selErr) throw selErr;

  const nuevoTotal = (row?.monedas_total ?? 0) + monedas;

  const { error: upErr } = await supabase
    .from("usuario_moneda")
    .update({
      monedas_total: nuevoTotal,
      ultima_actualizacion: new Date(),
    })
    .eq("id_cliente", id_cliente);

  if (upErr) throw upErr;

  return {
    monedas_otorgadas: monedas,
    monedas_total: nuevoTotal,
  };
}

export async function obtenerMonedas(id_cliente) {
  const { data, error } = await supabase
    .from("usuario_moneda")
    .select("monedas_total")
    .eq("id_cliente", id_cliente)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;

  return data?.monedas_total ?? 0;
}
