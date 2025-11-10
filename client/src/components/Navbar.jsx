import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { supabase } from "../config/supabase.js";
import { toast } from "sonner";
import "./navbar.css";
import RewardOnRoute from "./RewardOnRoute";

export default function Navbar() {
    const [usuario, setUsuario] = useState(null);
    const [fotoPerfil, setFotoPerfil] = useState(null);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef(null);

    const id_cliente = localStorage.getItem("cliente");

    //Dtos usuario + ft  perfil
    useEffect(() => {
        const fetchUsuario = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (user) {
            //Name
            const { data, error } = await supabase
            .from("usuario")
            .select("nombre")
            .eq("email", user.email)
            .single();

            if (error) {
            console.error("Error al obtener el nombre:", error);
            setUsuario({ nombre: user.email });
            } else {
            setUsuario(data);
            }

            //Ft perfil
            if (id_cliente) {
            try {
                const res = await axios.get(
                `http://localhost:5000/perfil/${id_cliente}`
                );
                setFotoPerfil(res.data?.foto_perfil || "/default-avatar.png");
            } catch {
                setFotoPerfil("/default-avatar.png");
            }
            }
        } else {
            setUsuario(null);
            setFotoPerfil(null);
        }
        };

        fetchUsuario();

        const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
            if (!session?.user) {
            setUsuario(null);
            setFotoPerfil(null);
            }
        }
        );

        return () => listener.subscription.unsubscribe();
    }, [id_cliente]);

    //Cerrar menu if click fuera
    useEffect(() => {
        const handleClickFuera = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
            setMenuAbierto(false);
        }
        };
        document.addEventListener("mousedown", handleClickFuera);
        return () => document.removeEventListener("mousedown", handleClickFuera);
    }, []);

    //Xp de login diario
    useEffect(() => {
        const id = localStorage.getItem("cliente");
        if (!id) return;

        const today = new Date().toISOString().slice(0, 10);
        const key = `login_xp_last:${id}`;
        const last = localStorage.getItem(key);

        if (last === today) return;

        (async () => {
        try {
            const res = await fetch("http://localhost:5000/gamificacion/login-xp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_cliente: Number(id) }),
            });

            const data = await res.json();

            localStorage.setItem(key, today);

            if (!res.ok) {
            console.warn("login-xp desde Navbar falló:", data?.error);
            return;
            }

            if (data.otorgado) {
            const a = data?.reward_login?.amount || 0;
            const b = data?.reward_streak?.amount || 0;
            const total = a + b;

            if (total > 0) {
                const icon = b > 0 ? "🔥" : "💎";
                const note =
                b > 0 && (data?.streak ?? 0) >= 2
                    ? `🔥 Racha x${data.streak} (+${b})`
                    : undefined;
                window.dispatchEvent(
                new CustomEvent("reward", {
                    detail: { amount: total, icon, note },
                })
                );
            }
            if (Array.isArray(data?.nuevosLogros) && data.nuevosLogros.length) {
                data.nuevosLogros.forEach((l) => {
                toast.success(
                    `¡Logro desbloqueado! ${l.icono} ${l.titulo} ${
                    l.xp_otorgado ? `(+${l.xp_otorgado} XP)` : ""
                    }`
                );
                });
            }
            }
        } catch (e) {
            console.warn("Error llamando login-xp desde Navbar:", e);
        }
        })();
    }, []);

    return (
        <>
        <nav className="navbar">
            <h1 className="logo">CodeReasonix</h1>
            <div className="nav-buttons">
            <Link to="/comunidad" className="btn-nav">
                Comunidad
            </Link>
            <Link to="/entrevistas" className="btn-nav">
                entrevistas
            </Link>
            <Link to="/desafios" className="btn-nav">
                desafios
            </Link>

            <Link to="/" className="btn-nav">
                Inicio
            </Link>

            {usuario ? (
                <div className="menu-container" ref={menuRef}>
                <img
                    src={fotoPerfil || "/default-avatar.png"}
                    alt="Perfil"
                    className="avatar"
                    onClick={() => setMenuAbierto(!menuAbierto)}
                />
                {menuAbierto && (
                    <div className="menu-dropdown">
                    <Link to="/perfil" className="dropdown-item">
                        Ver Perfil
                    </Link>
                    <Link
                        to="/entrevistas/mis-postulaciones"
                        className="dropdown-item"
                    >
                        Postulaciones
                    </Link>
                    <Link to="/mis-desafios" className="dropdown-item">
                        Mis Desafíos
                    </Link>
                    <Link to="/logout" className="dropdown-item">
                        Cerrar Sesión
                    </Link>
                    </div>
                )}
                </div>
            ) : (
                <>
                <Link to="/register" className="btn-nav">
                    Registrarse
                </Link>
                <Link to="/login" className="btn-nav">
                    Iniciar Sesión
                </Link>
                </>
            )}
            </div>
        </nav>


        <RewardOnRoute position="top-center" duration={2400} size="lg" />
        </>
    );
}
