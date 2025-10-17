import { supabase } from "../config/db.js";

export async function obtenerDificultadEjercicio(id_ejercicio) {
  const { data, error } = await supabase
    .from("ejercicio")
    .select("dificultad")
    .eq("id_ejercicio", id_ejercicio)
    .single();
  if (error) return 2; // default medio 
  const d = parseInt(data?.dificultad ?? 2, 10);
  return isNaN(d) ? 2 : d;
}

export function xpPorDificultad(dificultadNumero) {
  switch (parseInt(dificultadNumero, 10)) {
    case 1: return 5;
    case 2: return 10;
    case 3: return 20;
    case 4: return 30;
    default: return 10; 
  }
}

export async function esPrimerIntentoCorrecto(id_cliente, id_ejercicio) {
  const { count, error } = await supabase
    .from("submit_final")
    .select("*", { count: "exact", head: true })
    .eq("id_cliente", id_cliente)
    .eq("id_ejercicio", id_ejercicio);
  if (error) return false;
  return (count ?? 0) === 0;
}

export async function yaAceptadoEjercicio(id_cliente, id_ejercicio) {
  const { count, error } = await supabase
    .from("submit_final")
    .select("*", { count: "exact", head: true })
    .eq("id_cliente", id_cliente)
    .eq("id_ejercicio", id_ejercicio)
    .eq("resultado", true);
  if (error) return false;
  return (count ?? 0) > 0;
}
