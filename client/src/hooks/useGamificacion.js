import { useEffect, useState } from "react";
import { getGamificacionMe } from "../api/gamificacion.js";

export default function useGamificacion(id_cliente) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(!!id_cliente);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id_cliente) return;
        let cancel = false;
        (async () => {
        try {
            setLoading(true);
            const res = await getGamificacionMe(id_cliente);
            if (!cancel) setData(res);
        } catch (e) {
            if (!cancel) setError(e);
        } finally {
            if (!cancel) setLoading(false);
        }
        })();
        return () => { cancel = true; };
    }, [id_cliente]);

    return { data, loading, error, refetch: async () => {
        if (!id_cliente) return;
        const res = await getGamificacionMe(id_cliente);
        setData(res);
    }};
}
