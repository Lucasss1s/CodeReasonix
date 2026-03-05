import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getReportesEjercicio(id) {
    const res = await authFetch(`${API_BASE}/ejercicio-bug?ejercicio=${id}`);
    const { data } = await parseResponse(res);
    return data;
}

export async function reporteEjercicio(idEjercicio, tipo, desc, codigoActual) {
    const res = await authFetch(`${API_BASE}/ejercicio-bug`, {
        method: "POST",
        body: JSON.stringify({
            id_ejercicio: idEjercicio,
            tipo,
            descripcion: desc,
            codigo_fuente: codigoActual,
        }),
    });
    const { data } = await parseResponse(res);
    return data;
}
