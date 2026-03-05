import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getPistasEjercicio(id_ejercicio) {
    const res = await authFetch(`${API_BASE}/ejercicio-pistas/${id_ejercicio}`);
    const { data } = await parseResponse(res);
    return data;
}

export async function getPistasEjercicioAdmin(id_ejercicio) {
    const res = await authFetch(`${API_BASE}/ejercicio-pistas/${id_ejercicio}/admin`);
    const { data } = await parseResponse(res);
    return data;
}

export async function createPistasEjercicio(id_ejercicio, nuevo) {
    const res = await authFetch(`${API_BASE}/ejercicio-pistas/${id_ejercicio}`, {
        method: 'POST',
        body: JSON.stringify(nuevo),
    });
    const { data } = await parseResponse(res);
    return data;
}

export async function unlockPistasEjercicio(id_ejercicio) {
    const res = await authFetch(`${API_BASE}/ejercicio-pistas/${id_ejercicio}/unlock`, {
        method: "POST",
    });
    const { data } = await parseResponse(res);
    return data;
}

export async function progressPistasEjercicio(id) {
    const res = await authFetch(`${API_BASE}/ejercicio-pistas/${id}/progress`);
    const { data } = await parseResponse(res);
    return data;
}
