import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getCasosPruebaAdmin(id_ejercicio) {
    const res = await authFetch(`${API_BASE}/casos-prueba/${id_ejercicio}/admin`);
    const { data } = await parseResponse(res);
    return data;
}

export async function createCasosPrueba(id_ejercicio, payload) {
    const res = await authFetch(`${API_BASE}/casos-prueba/${id_ejercicio}`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    const { data } = await parseResponse(res);
    return data;
}

export async function updateCasosPrueba(editId, payload) {
    const res = await authFetch(`${API_BASE}/casos-prueba/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    const { data } = await parseResponse(res);
    return data;
}