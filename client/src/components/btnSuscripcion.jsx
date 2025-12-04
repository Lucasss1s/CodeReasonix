import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";

export default function SubscriptionButton({ className = "" }) {
    const [sus, setSus] = useState(null);
    // eslint-disable-next-line 
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const navigate = useNavigate();

    const fetchSus = async () => {
        try {
        const res = await authFetch(`${API_BASE}/suscripcion/mi`, { method: "GET" });
        if (res.ok) {
            const b = await res.json().catch(() => ({}));
            setSus(b.suscripcion ?? null);
        } else {
            setSus(null);
        }
        } catch (e) {
        console.warn("fetchSus error:", e);
        setSus(null);
        } finally {
        setInitializing(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
        if (!mounted) return;
        await fetchSus();
        };
        load();
        return () => { mounted = false; };
    }, []);

    const goToCheckoutWith = (id) => {
        const q = id ? `?id=${encodeURIComponent(id)}` : "";
        navigate(`/pago-checkout${q}`);
    };

    // helpers
    const ahora = new Date();
    const vence = sus?.periodo_fin ? new Date(sus.periodo_fin) : null;
    const periodoValido = vence && vence > ahora;
    const puedeRenovar = !sus || sus.estado === "inactivo" || (sus.periodo_fin && new Date(sus.periodo_fin) <= ahora);

    //white
    if (initializing) {
        return (
        <button className={`p-btn ${className}`} disabled aria-busy="true" title="Cargando estado de suscripción...">
            ...
        </button>
        );
    }

    if (puedeRenovar) {
        const label = sus ? `Renovar` : `Hacerse Premium`;
        return (
        <button
            className={`p-btn ${className}`}
            onClick={() => goToCheckoutWith(sus?.id_suscripcion)}
            disabled={loading}
            title="Ir al checkout para completar la suscripción"
        >
            {loading ? "..." : label}
        </button>
        );
    }

    if (sus && periodoValido) {
        const label = sus.auto_renew === false
        ? `Premium`
        : `Premium`;
        return (
        <button
            className={`p-btn p-btn--ghost ${className}`}
            onClick={() => goToCheckoutWith(sus.id_suscripcion)}
            disabled={loading}
            title="Ver o gestionar tu suscripción"
        >
            {loading ? "..." : label}
        </button>
        );
    }

    // Fallback: ir al checkout
    return (
        <button
        className={`p-btn ${className}`}
        onClick={() => goToCheckoutWith(sus?.id_suscripcion)}
        disabled={loading}
        title="Ir al checkout"
        >
        {loading ? "..." : `Hacerse Premium`}
        </button>
    );

}





