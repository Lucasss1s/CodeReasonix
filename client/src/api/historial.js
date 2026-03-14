import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getHistorialEjercicio(idEjercicio, query) {
    const res = await authFetch(`${API_BASE}/historial/ejercicio/${idEjercicio}?${query}`);
    const { data } = await parseResponse(res);
    return data;
}

export async function getHistorialSubmit(id_submit_final) {
    const res = await  authFetch(`${API_BASE}/historial/submit/${id_submit_final}`);
    const { data } = await parseResponse(res);
    return data;
}

export async function getHistorialCount(id) {
    const res = await authFetch(`${API_BASE}/historial/ejercicio/${id}/count`);
    const { data } = await parseResponse(res);
    return data;
}