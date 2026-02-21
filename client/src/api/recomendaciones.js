import { authFetch } from "../utils/authToken";
import API_BASE from "../config/api";
import { parseResponse } from "./apiClient";

export async function getRecomendaciones() {
    const res = await authFetch(`${API_BASE}/recomendaciones/home`);
    const { data } = await parseResponse(res);
    return data;
}

export async function retomarRecomendaciones() {
    const res = await authFetch(`${API_BASE}/recomendaciones/retomar`);
    const { data } = await parseResponse(res);
    return data;
}

