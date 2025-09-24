import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function useAuth({ redirectToLogin = true } = {}) {
    const [usuario, setUsuario] = useState(null);
    const [clienteId, setClienteId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUsuario = localStorage.getItem("usuario");
        const storedCliente = localStorage.getItem("cliente");

        if (storedUsuario && storedCliente) {
        try {
            setUsuario(JSON.parse(storedUsuario));
            setClienteId(storedCliente);
        } catch (err) {
            console.error("Error leyendo usuario de localStorage:", err);
            localStorage.removeItem("usuario");
            localStorage.removeItem("cliente");
            if (redirectToLogin) navigate("/login");
        }
        } else if (redirectToLogin) {
        console.warn("No hay sesión activa. Redirigiendo a login.");
        navigate("/login");
        }
    }, [navigate, redirectToLogin]);

    return { usuario, clienteId };
}
