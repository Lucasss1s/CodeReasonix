import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

/* LOGUEADO */
export async function getUsuarioByCliente() {
    const res = await authFetch(`${API_BASE}/usuarios/by-cliente/`);
    const { data } = await parseResponse(res);
    return data;
}

export async function updateUsuarioMe({ nombre }) {
    const res = await authFetch(`${API_BASE}/usuarios/me`, {
        method: "PUT",
        body: JSON.stringify({ nombre }),
    });

    const { data } = await parseResponse(res);
    return data;
}

export async function changePassword(currPass, newPass) {
    const res = await authFetch(`${API_BASE}/usuarios/password`, {
        method: "PUT",
        body: JSON.stringify({ currPass, newPass }),
    });

    await parseResponse(res);
    return true;
}

/* ADMIN */
export async function getUsuarios() {
    const res = await authFetch(`${API_BASE}/usuarios`);
    const { data } = await parseResponse(res);
    return data;
}

export async function updateUsuarioEstado(id_usuario, estado) {
    const res = await authFetch(`${API_BASE}/usuarios/${id_usuario}/estado`, {
        method: "PUT",
        body: JSON.stringify({ estado }),
    });

    const { data } = await parseResponse(res);
    return data;
}

/* NO LOGUEADO */
export async function loginUsuario(email, password) {
    const res = await fetch(`${API_BASE}/usuarios/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    let data = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }

    return {
        ok: res.ok,
        status: res.status,
        data,
    };
}

export async function registerUsuario({ nombre, email, password, sesion_id }) {
    const res = await fetch(`${API_BASE}/usuarios/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, sesion_id }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.error || "Error registrando usuario");
    }

    return data;
}

export async function confirmEmail(sesion_id) {
    const res = await fetch(`${API_BASE}/usuarios/confirm-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesion_id }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.error || "Error confirmando email");
    }

    return data;
}
