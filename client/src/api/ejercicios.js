import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getEjercicios() {
    const res = await authFetch(`${API_BASE}/ejercicios/`);
    const { data } = await parseResponse(res);
    return data;
}

export async function getByIDEjercicio(id) {
    const res = await authFetch(`${API_BASE}/ejercicios/${id}`);
    const { data } = await parseResponse(res);
    return data;
}

export async function getEjerciciosAdmin() {
    const res = await authFetch(`${API_BASE}/ejercicios/admin`);
    const { data } = await parseResponse(res);
    return data;
}

export async function getByIDEjercicioAdmin(id) {
    const res = await authFetch(`${API_BASE}/ejercicios/admin/${id}`);
    const { data } = await parseResponse(res);
    return data;
}

export async function updateEjercio(id_ejercicio, payload) {
    await authFetch(`${API_BASE}/ejercicios/${id_ejercicio}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function createEjercicio(payload) {
    await authFetch(`${API_BASE}/ejercicios`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}