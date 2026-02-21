import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function obtenerRankingGlobal(limite = 50) {
  const res = await authFetch(`${API_BASE}/ranking/global?limit=${limite}`);
  if (res.status === 404) return null;
  const { data } = await parseResponse(res);
  return data;
}

export async function obtenerRankingSemanal(limite = 50) {
  const res = await authFetch(`${API_BASE}/ranking/semanal?limit=${limite}`);
  if (res.status === 404) return null;
  const { data } = await parseResponse(res);
  return data;
}

export async function obtenerRankingHoy(limite = 50) {
  const res = await authFetch(`${API_BASE}/ranking/hoy?limit=${limite}`);
  if (res.status === 404) return null;
  const { data } = await parseResponse(res);
  return data;
}

export async function obtenerMiRankingGlobal() {
  const res = await authFetch(`${API_BASE}/ranking/me`);
  const { data } = await parseResponse(res);
  return data;
}

export async function obtenerMiRankingSemanal() {
  const res = await authFetch(`${API_BASE}/ranking/me/semanal`);
  const { data } = await parseResponse(res);
  return data;
}

export async function obtenerMiRankingHoy() {
  const res = await authFetch(`${API_BASE}/ranking/me/hoy`);
  const { data } = await parseResponse(res);
  return data;
}
