import { supabase } from "../config/supabase.js";

/* supabase.auth.getSession() -> si token expira, SDK hce refresh  */
export async function getValidAccessToken() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
        console.warn("[auth] getSession error:", error);
        return null;
        }
        const session = data?.session;
        if (!session?.access_token) return null;

        try {
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("refresh_token", session.refresh_token ?? "");
        localStorage.setItem("expires_at", String(session.expires_at ?? ""));
        // eslint-disable-next-line 
        } catch (e) {_}

        return session.access_token;
    } catch (e) {
        console.error("[auth] fallo getValidAccessToken:", e);
        return null;
    }
}

export async function authFetch(url, options = {}, { retryOn401 = true } = {}) {
    const token = await getValidAccessToken();
    if (!token) {
        return Promise.reject({ code: "NO_TOKEN", message: "No hay sesion" });
    }

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": headersContentType(options.headers),
    };

    let res = await fetch(url, { ...options, headers });

    if (retryOn401 && (res.status === 401 || res.status === 403)) {
        // refresh adicional 
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data?.session?.access_token) {
        const newToken = data.session.access_token;
        localStorage.setItem("access_token", newToken);
        const headers2 = {
            ...(options.headers || {}),
            Authorization: `Bearer ${newToken}`,
            "Content-Type": headersContentType(options.headers),
        };
        res = await fetch(url, { ...options, headers: headers2 });
        }
    }

    return res;
}

function headersContentType(h) {
    if (!h) return "application/json";
    if (typeof h["Content-Type"] !== "undefined") return h["Content-Type"];
    if (typeof h["content-type"] !== "undefined") return h["content-type"];
    return "application/json";
}
