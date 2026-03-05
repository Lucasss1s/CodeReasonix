import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getComentariosEjercicio(idEjercicio) {
    const res = await authFetch(`${API_BASE}/ejercicio-comentarios/${idEjercicio}`);
    const { data } = await parseResponse(res);
    return data;
}

export async function createComentarioEjercicio(idEjercicio, payload) {
    const res = await authFetch(`${API_BASE}/ejercicio-comentarios/${idEjercicio}`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const { data } = await parseResponse(res);
    return data;
}

export async function createComentarioReaccionEjercicio(idComentario, tipo) {
    await authFetch(`${API_BASE}/ejercicio-comentarios/${idComentario}/reaccion`, {
        method: "POST",
        body: JSON.stringify({tipo}),
    });
}

export async function deleteComentarioEjercicio(idComentario) {
    const res = await authFetch(`${API_BASE}/ejercicio-comentarios/${idComentario}`, {
        method: "DELETE",
    });
    const { data } = await parseResponse(res);
    return data;
}

export async function countComentariosEjercicio(id) {
    const res = await authFetch(`${API_BASE}/ejercicio-comentarios/${id}/count`);;
    const { data } = await parseResponse(res);
    return data;
}