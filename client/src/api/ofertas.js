import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getOfertas() {
    const res = await authFetch(`${API_BASE}/ofertas`);
    const { data } = await parseResponse(res);
    return data;
}

export async function getByIDOfertas(id) {
    const res = await authFetch(`${API_BASE}/ofertas/${id}`);
    const { data } = await parseResponse(res);
    return data;
}

export async function putOferta(id_oferta, payload) {
    await authFetch(`${API_BASE}/ofertas/${id_oferta}`,{
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function postOferta(payload) {
    await authFetch(`${API_BASE}/ofertas`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function deleteOfertas(id_oferta) {
    await authFetch(`${API_BASE}/ofertas/${id_oferta}`,{
        method: 'DELETE'
    });
}
