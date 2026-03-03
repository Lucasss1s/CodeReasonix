import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getPreferencias() {
    const res = await authFetch(`${API_BASE}/preferencias`);
    const { data } = await parseResponse(res);
    return data;
}

export async function preferencias(lenguaje, nivel, modo, tiempo) {
    const res = await authFetch(`${API_BASE}/preferencias`, {
        method: "POST",
        body: JSON.stringify({
        lenguaje_pref: lenguaje,
        dificultad_objetivo: Number(nivel),
        modo_objetivo: modo,
        tiempo_sesion_minutos: Number(tiempo),
        })
    });

    const { data } = await parseResponse(res);
    return data;
}

