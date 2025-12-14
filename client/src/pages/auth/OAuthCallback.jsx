import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../config/supabase";
import API_BASE from "../../config/api";
import { toast } from "sonner";

export default function OAuthCallback() {
    const navigate = useNavigate();

        useEffect(() => {
        const processOAuth = async () => {
            const { data } = await supabase.auth.getSession();
            const session = data?.session;

            if (!session?.access_token) {
            toast.error("No se pudo obtener la sesión");
            navigate("/login");
            return;
            }

            try {
            const res = await fetch(`${API_BASE}/auth/oauth`, {
                method: "POST",
                headers: {
                Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (!res.ok) {
                const err = await res.json();
                toast.error(err?.error || "Error OAuth");
                navigate("/login");
                return;
            }

            const dataBackend = await res.json();

            localStorage.setItem("usuario", JSON.stringify(dataBackend.usuario));
            localStorage.setItem("es_admin", dataBackend.es_admin ? "true" : "false");

            if (dataBackend.id_cliente) {
                localStorage.setItem("cliente", dataBackend.id_cliente);
            }

            navigate("/", { replace: true });

            } catch (e) {
            console.error(e);
            toast.error("Error procesando OAuth");
            navigate("/login");
            }
        };

        processOAuth();
        }, [navigate]);


    return <p>Procesando inicio de sesión...</p>;
}
