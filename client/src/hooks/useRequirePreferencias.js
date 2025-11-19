import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useSesion from "./useSesion";

export default function useRequirePreferencias() {
    const { clienteId, cargandoSesion, usuario } = useSesion({
        redirectToLogin: true,
    });
    const [cargandoPreferencias, setCargandoPreferencias] = useState(true);
    const [preferencias, setPreferencias] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (cargandoSesion) return;
        if (!clienteId) return; 

        const check = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/preferencias/${clienteId}`);
            const pref = res.data;
            setPreferencias(pref);

            if (pref?.lenguaje_pref && typeof window !== "undefined") {
                window.localStorage.setItem("crx_pref_lenguaje", pref.lenguaje_pref);
            }

            setCargandoPreferencias(false);
        } catch (err) {
            if (err.response?.status === 404) {
                navigate("/form-preferencias", { replace: true });
            } else {
                console.error("Error verificar preferencias:", err);
                setCargandoPreferencias(false);
            }
        }
        };

        check();
    }, [cargandoSesion, clienteId, navigate]);

    return {
        clienteId,
        usuario,
        preferencias,
        cargandoSesion,
        cargandoPreferencias,
    };
}
