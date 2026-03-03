import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getGamificacionMe() {
    const res = await authFetch(`${API_BASE}/gamificacion/me`);
    const { data } = await parseResponse(res);
    return data;
}

export async function postLoginXP() {
    const res = await authFetch(`${API_BASE}/gamificacion/login-xp`, {
        method: "POST",
    });
    const { data } = await parseResponse(res);
    return data;
}

export async function getMonedasGamificacion() {
    const res = await authFetch(`${API_BASE}/gamificacion/monedas`);
    const { data } = await parseResponse(res);
    return data;
}