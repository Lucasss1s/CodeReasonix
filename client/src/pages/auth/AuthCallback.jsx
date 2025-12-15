import { useEffect } from "react";
import { supabase } from "../../config/supabase";
import axios from "axios";
import API_BASE from "../../config/api";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const run = async () => {

        const { data: exchangeData} =
            await supabase.auth.exchangeCodeForSession(window.location.href);

        let session = exchangeData?.session;

        if (!session) {
            const { data } = await supabase.auth.getSession();
            session = data?.session;
        }

        if (!session) {
            navigate("/login");
            return;
        }

        const user = session.user;

        if (!user.email_confirmed_at) {
            navigate("/email-pendiente");
            return;
        }

        await axios.post(`${API_BASE}/usuarios/confirm-email`, {
            sesion_id: user.id,
        });

        navigate("/login", { replace: true });
        };

        run();
    }, [navigate]);

    return <div>Confirmando cuenta...</div>;
}
