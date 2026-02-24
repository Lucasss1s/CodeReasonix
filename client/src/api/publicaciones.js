import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function createPublicacion(formData) {
    const res =  await authFetch(`${API_BASE}/publicaciones`, {
        method: "POST",
        body: formData,
    });
    const { data } = await parseResponse(res);
    return data;
}

export async function deletePublicacion(id_publicacion) {
    await authFetch(`${API_BASE}/publicaciones/${id_publicacion}`,{
        method: "DELETE",
    });
}


