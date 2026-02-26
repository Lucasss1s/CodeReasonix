import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getPostulaciones() {
    const res = await authFetch(`${API_BASE}/postulaciones`);
    const { data } = await parseResponse(res);
    return data;
}

export async function patchPostulaciones(id_postulacion, nuevoEstado) {
    await authFetch(`${API_BASE}/postulaciones/${id_postulacion}`, {
        method: 'PATCH',
        body: JSON.stringify({
        estado: nuevoEstado,
        }),
    });
}

export async function deletePostulaciones(id_postulacion) {
    await authFetch(`${API_BASE}/postulaciones/${id_postulacion}`,{
        method: 'DELETE',
    });
}

export async function mePostulaciones() {
    const res = await authFetch(`${API_BASE}/postulaciones/me`);
    const { data } = await parseResponse(res);
    return data;
}

export async function createPostulaciones(id) {
    await authFetch(`${API_BASE}/postulaciones`, {
        method: 'POST',
        body: JSON.stringify({
            id_oferta: Number(id),
            estado: "pendiente",
        }),
    });
}




