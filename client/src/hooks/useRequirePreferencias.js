import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSesion from "./useSesion";
import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";

export default function useRequirePreferencias() {
    const { cargandoSesion, usuario, clienteId } = useSesion({
        redirectToLogin: true,
    });

    const [cargandoPreferencias, setCargandoPreferencias] = useState(true);
    const [preferencias, setPreferencias] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (cargandoSesion) return;

        const checkPreferencias = async () => {
        try {
            const res = await authFetch(`${API_BASE}/preferencias`);

            if (res.ok) {
            const pref = await res.json();
            setPreferencias(pref);

            if (pref?.lenguaje_pref && typeof window !== "undefined") {
                window.localStorage.setItem(
                "crx_pref_lenguaje",
                pref.lenguaje_pref
                );
            }

            setCargandoPreferencias(false);
            return;
            }

            if (res.status === 404) {
            navigate("/form-preferencias", { replace: true });
            return;
            }

            if (res.status === 401) {
            navigate("/login", { replace: true });
            return;
            }

            throw new Error(`HTTP ${res.status}`);
        } catch (err) {
            console.error("Error verificando preferencias:", err);
            setCargandoPreferencias(false);
        }
        };

        checkPreferencias();
    }, [cargandoSesion, navigate]);

    return {
        clienteId,
        usuario,
        preferencias,
        cargandoSesion,
        cargandoPreferencias,
    };
}
