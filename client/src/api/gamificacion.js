
const BASE = "http://localhost:5000";
export async function getGamificacionMe(id_cliente) {
    const res = await fetch(`${BASE}/gamificacion/me/${id_cliente}`);
    if (!res.ok) throw new Error("No se pudo obtener estado de gamificación");
    return res.json();
}

export async function postLoginXP(id_cliente) {
    const res = await fetch(`${BASE}/gamificacion/login-xp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_cliente }),
    });
    if (!res.ok) throw new Error("No se pudo otorgar XP de login");
    return res.json(); 
}
