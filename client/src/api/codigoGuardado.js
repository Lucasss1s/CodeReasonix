import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function getCodigoSolucion(id_ejercicio, lenguaje) {
    const res = await authFetch(`${API_BASE}/codigoGuardado/${id_ejercicio}/${lenguaje}`);
    const { data } = await parseResponse(res);
    return data;
}


export async function saveCodigoSolucion(id_ejercicio, lenguaje, codigo) {
    const res = await authFetch(`${API_BASE}/codigoGuardado`, {
        method: "POST",
        body: JSON.stringify({
            id_ejercicio: id_ejercicio,
            lenguaje,
            codigo,
        }),
    });
    const { data } = await parseResponse(res);
    return data;
}
