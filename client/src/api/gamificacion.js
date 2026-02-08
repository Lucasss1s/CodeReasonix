import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";

export async function getGamificacionMe() {
    const res = await authFetch(`${API_BASE}/gamificacion/me`);
    if (!res.ok) throw new Error("No se pudo obtener estado de gamificación");
    return res.json();
}

export async function postLoginXP() {
    const res = await authFetch(`${API_BASE}/gamificacion/login-xp`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("No se pudo otorgar XP de login");
    return res.json(); 
}
