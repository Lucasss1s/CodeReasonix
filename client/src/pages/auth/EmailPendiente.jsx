import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "../../config/supabase";
import { toast } from "sonner";
import "./emailPendiente.css";

export default function EmailPendiente() {
    const navigate = useNavigate();
    const email = localStorage.getItem("pending_email");

    useEffect(() => {
    const checkConfirm = async () => {
        const { data } = await supabase.auth.getUser();

        if (data?.user?.email_confirmed_at) {
        localStorage.removeItem("pending_email");
        navigate("/login", { replace: true });
        }
    };

    checkConfirm();
    }, []);


    const reenviar = async () => {
        if (!email) {
        toast.error("No se pudo reenviar el correo");
        return;
        }

        const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        });

        if (error) {
        if (error.status === 429) {
            toast.error("Esperá un minuto antes de reenviar");
        } else {
            toast.error("Error reenviando el correo");
        }
        } else {
        toast.success("Correo de confirmación reenviado");
        }
    };

    return (
        <div className="pendiente-page">
        <div className="pendiente-card">
            <h2 className="pendiente-title">Confirmá tu correo</h2>

            <p className="pendiente-text"> Te enviamos un correo a <b>{email}</b>.
            <br />
            Confirmá tu cuenta para poder iniciar sesión.
            </p>

            <button className="pendiente-button" onClick={reenviar}> Reenviar correo </button>

            <div className="pendiente-secondary">
            <button className="pendiente-link" onClick={() => navigate("/login")}> Volver al login </button>
            </div>
        </div>
        </div>
    );
}
