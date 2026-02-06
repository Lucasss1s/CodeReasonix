import { useCallback, useEffect, useState } from "react";
import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";

export default function useAchievements(id_cliente) {
    const [loading, setLoading] = useState(false);
    const [defs, setDefs] = useState([]);
    const [unlocked, setUnlocked] = useState([]);
    const [locked, setLocked] = useState([]);
    const [error, setError] = useState(null);

    const fetchList = useCallback(async () => {
        if (!id_cliente) return;
        setLoading(true);
        setError(null);
        try {
        const res = await authFetch(`${API_BASE}/logros/me`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.error || "No se pudieron cargar los logros.");
        }

        const obtenidos = Array.isArray(data.obtenidos) ? data.obtenidos : [];
        const allDefs   = Array.isArray(data.defs) ? data.defs : [];

        const unlockedDefs = allDefs.filter(d => obtenidos.some(o => o.id_logro === d.id_logro));
        const lockedDefs  = allDefs.filter(d => !unlockedDefs.some(u => u.id_logro === d.id_logro));

        setDefs(allDefs);
        setUnlocked(unlockedDefs);
        setLocked(lockedDefs);
        } catch (e) {
        setError(e.message || "No se pudieron cargar los logros.");
        setDefs([]); setUnlocked([]); setLocked([]);
        } finally {
        setLoading(false);
        }
    }, [id_cliente]);

    useEffect(() => { if (id_cliente) fetchList(); }, [id_cliente, fetchList]);

    /*Refresh sin recalcular reglas back */
    const refresh = fetchList;

    /*Pido al back que verifique logros y luego devuelve */
    const recalc = useCallback(async () => {
        if (!id_cliente) return { nuevos: [] };
        try {
        const res = await authFetch(`${API_BASE}/logros/check`, { 
            method: "POST", 
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.error || "No se pudieron cargar los logros.");
        }
        await fetchList();
        return data || { nuevos: [] };
        } catch (e) {
        setError(e.message || "Error verificando logros.");
        return { nuevos: [] };
        }
    }, [id_cliente, fetchList]);

    return { loading, error, defs, unlocked, locked, refresh, recalc };
}
