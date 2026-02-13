import { authFetch } from "../utils/authToken";
import API_BASE from "../config/api";
import { parseResponse } from "./apiClient";

export async function submitFinal(payload) {
    const res = await authFetch(`${API_BASE}/submit-final`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return parseResponse(res);
}

export async function getSubmitFinal(id_submit_final) {
    const res = await authFetch(`${API_BASE}/submit-final/${id_submit_final}`);
    const { data } = await parseResponse(res);
    return data;
}

export async function getComparacion(id_ejercicio, lenguaje) {
    const qs = lenguaje
        ? `?lenguaje=${encodeURIComponent(lenguaje)}`
        : "";

    const res = await authFetch(`${API_BASE}/submit-final/comparacion/${id_ejercicio}${qs}`);
    const { data } = await parseResponse(res);
    return data;
}
