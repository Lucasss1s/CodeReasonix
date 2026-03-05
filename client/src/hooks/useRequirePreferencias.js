import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSesion from "./useSesion";
import { getPreferencias } from "../api/preferencias";

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
            const pref = await getPreferencias();

            setPreferencias(pref);

            if (pref?.lenguaje_pref && typeof window !== "undefined") {
                window.localStorage.setItem(
                "crx_pref_lenguaje",
                pref.lenguaje_pref
                );
            }

            setCargandoPreferencias(false);
            return;
        } catch (err) {
            if (err?.status === 404) {
                navigate("/form-preferencias", { replace: true });
                return;
            }

            if (err?.status === 401) {
                navigate("/login", { replace: true });
                return;
            }

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
