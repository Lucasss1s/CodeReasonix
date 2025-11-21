const BASE = "http://localhost:5000";

export async function obtenerRankingGlobal(limite = 50) {
  const respuesta = await fetch(`${BASE}/ranking/global?limit=${limite}`);
  if (!respuesta.ok) throw new Error("No se pudo obtener el ranking global");
  return respuesta.json();
}

export async function obtenerRankingSemanal(limite = 50) {
  const respuesta = await fetch(`${BASE}/ranking/semanal?limit=${limite}`);
  if (!respuesta.ok) throw new Error("No se pudo obtener el ranking semanal");
  return respuesta.json();
}

export async function obtenerRankingHoy(limite = 50) {
  const respuesta = await fetch(`${BASE}/ranking/hoy?limit=${limite}`);
  if (!respuesta.ok) throw new Error("No se pudo obtener el ranking de hoy");
  return respuesta.json();
}

export async function obtenerMiRankingGlobal(id_cliente) {
  const respuesta = await fetch(`${BASE}/ranking/me/${id_cliente}`);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error("No se pudo obtener mi posicion global");
  return respuesta.json();
}

export async function obtenerMiRankingSemanal(id_cliente) {
  const respuesta = await fetch(`${BASE}/ranking/me/semanal/${id_cliente}`);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error("No se pudo obtener mi posicion semanal");
  return respuesta.json();
}

export async function obtenerMiRankingHoy(id_cliente) {
  const respuesta = await fetch(`${BASE}/ranking/me/hoy/${id_cliente}`);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error("No se pudo obtener mi posicion de hoy");
  return respuesta.json();
}
