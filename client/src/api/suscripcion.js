import { authFetch } from "../utils/authToken";
import API_BASE from "../config/api";
import { parseResponse } from "./apiClient";

export async function getSuscripcion() {
    const res = await authFetch(`${API_BASE}/suscripcion/mi`);
    const { data } = await parseResponse(res);
    return data.suscripcion ?? null;
}

export async function cancelSuscripcion() {
    const res = await authFetch(`${API_BASE}/suscripcion/cancel`, { 
        method: "POST", 
    });
    const { data } = await parseResponse(res);
    return data.suscripcion ?? null;
}

export async function renewSuscripcion() {
    const res = await authFetch(`${API_BASE}/suscripcion/renew`, { 
        method: "POST", 
    });
    const { data } = await parseResponse(res);
    return data.suscripcion ?? null;
}

