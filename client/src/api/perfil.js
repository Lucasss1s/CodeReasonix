import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getPerfil() {
    const res = await authFetch(`${API_BASE}/perfil`);
    const { data } = await parseResponse(res);
    return data;
}

export async function updatePerfil(payload) {
    const res = await authFetch(`${API_BASE}/perfil`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

    const { data } = await parseResponse(res);
    return data;
}
export async function fotoPerfil(formData) {
    const res = await authFetch(`${API_BASE}/perfil/foto`, {
        method: 'POST',
        body: formData,
    });
    const { data } = await parseResponse(res);
    return data;
}

export async function bannerPerfil(formData) {
    const res = await authFetch(`${API_BASE}/perfil/banner`, {
        method: 'POST',
        body: formData,
    });
    const { data } = await parseResponse(res);
    return data;
}