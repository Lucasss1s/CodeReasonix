import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";

export async function obtenerRankingGlobal(limite = 50) {
  const respuesta = await authFetch(`${API_BASE}/ranking/global?limit=${limite}`);
  if (!respuesta.ok) throw new Error("No se pudo obtener el ranking global");
  return respuesta.json();
}

export async function obtenerRankingSemanal(limite = 50) {
  const respuesta = await authFetch(`${API_BASE}/ranking/semanal?limit=${limite}`);
  if (!respuesta.ok) throw new Error("No se pudo obtener el ranking semanal");
  return respuesta.json();
}

export async function obtenerRankingHoy(limite = 50) {
  const respuesta = await authFetch(`${API_BASE}/ranking/hoy?limit=${limite}`);
  if (!respuesta.ok) throw new Error("No se pudo obtener el ranking de hoy");
  return respuesta.json();
}

export async function obtenerMiRankingGlobal() {
  const respuesta = await authFetch(`${API_BASE}/ranking/me`);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error("No se pudo obtener mi posicion global");
  return respuesta.json();
}

export async function obtenerMiRankingSemanal() {
  const respuesta = await authFetch(`${API_BASE}/ranking/me/semanal`);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error("No se pudo obtener mi posicion semanal");
  return respuesta.json();
}

export async function obtenerMiRankingHoy() {
  const respuesta = await authFetch(`${API_BASE}/ranking/me/hoy`);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error("No se pudo obtener mi posicion de hoy");
  return respuesta.json();
}
