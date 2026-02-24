import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";

export async function createComentario(idPublicacion, nuevoComentario ) {
    await authFetch(`${API_BASE}/comentarios`, {
        method: 'POST',
        body: JSON.stringify({
            id_publicacion: idPublicacion,
            contenido: nuevoComentario,
        }),
    });
}


