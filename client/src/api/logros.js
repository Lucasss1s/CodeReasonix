import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getLogros() {
    const res = await authFetch(`${API_BASE}/logros`);
    const { data } = await parseResponse(res);
    return data;
}

export async function getLogrosMe() {
    const res = await authFetch(`${API_BASE}/logros/me`);
    const { data } = await parseResponse(res);
    return data;
}

export async function checkLogros() {
    const res = await authFetch(`${API_BASE}/logros/check`, { 
            method: "POST", 
        });
    const { data } = await parseResponse(res);
    return data;
}

export async function condicionesLogros() {
    const res = await authFetch(`${API_BASE}/logros/condiciones-soportadas`);
    const { data } = await parseResponse(res);
    return data;
}

export async function updateLogros(id_logro, payload) {
    await authFetch(`${API_BASE}/logros/${id_logro}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function createLogros(payload) {
    await authFetch(`${API_BASE}/logros`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function activoLogros(id_logro, activo) {
    await authFetch(`${API_BASE}/logros/${id_logro}/activo`, { 
        method: 'PATCH',
        body: JSON.stringify({
        activo: activo, 
        }),
    });
}