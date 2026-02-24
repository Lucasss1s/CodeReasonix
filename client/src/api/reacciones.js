import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";

export async function toggleReaccion(idPublicacion, tipo) {
    await authFetch(`${API_BASE}/reacciones`, {
        method: "POST",
        body: JSON.stringify({
            id_publicacion: idPublicacion,
            tipo,
        }),
    });
}


