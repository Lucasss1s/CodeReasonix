import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getEmpresas(q) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const queryString = params.toString();
    
    const res = await authFetch(
        `${API_BASE}/empresas${queryString ? `?${queryString}` : ""}`
    );

    return parseResponse(res);
}

export async function getEmpresaById(id) {
    const res = await authFetch(`${API_BASE}/empresas/${id}`);
    return parseResponse(res);
}

export async function postEmpresa(payload) {
    await authFetch(`${API_BASE}/empresas`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function putEmpresa(id, payload) {
    await authFetch(`${API_BASE}/empresas/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export async function deleteEmpresa(id) {
    await authFetch(`${API_BASE}/empresas/${id}`, {
        method: "DELETE",
    });
}