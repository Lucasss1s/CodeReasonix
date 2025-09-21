import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../config/supabase.js";

export default function Logout() {
    const navigate = useNavigate();

    useEffect(() => {
        const doLogout = async () => {
        try {
            await supabase.auth.signOut();
            localStorage.removeItem("usuario");
            localStorage.removeItem("cliente");
        } catch (err) {
            console.error("Error en logout:", err);
        } finally {
            navigate("/");
        }
        };

        doLogout();
    }, [navigate]);

    return <p style={{ textAlign: "center", marginTop: "30px" }}>Cerrando sesión...</p>;
}
