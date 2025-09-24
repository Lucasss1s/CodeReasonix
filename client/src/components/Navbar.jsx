import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { supabase } from "../config/supabase.js";
import "./navbar.css";

export default function Navbar() {
    const [usuario, setUsuario] = useState(null);
    const [fotoPerfil, setFotoPerfil] = useState(null);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef(null);

    const id_cliente = localStorage.getItem("cliente");

    useEffect(() => {
        const fetchUsuario = async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData.session?.user;

            if (user) {
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

                if (id_cliente) {
                    try {
                        const res = await axios.get(`http://localhost:5000/perfil/${id_cliente}`);
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

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                setUsuario(null);
                setFotoPerfil(null);
            }
        });

        return () => listener.subscription.unsubscribe();
    }, [id_cliente]);

    useEffect(() => {
        const handleClickFuera = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener("mousedown", handleClickFuera);
        return () => document.removeEventListener("mousedown", handleClickFuera);
    }, []);

    return (
        <nav className="navbar">
            <h1 className="logo">CodeReasonix</h1>
            <div className="nav-buttons">
                <Link to="/comunidad" className="btn-nav">Comunidad</Link>
                <Link to="/" className="btn-nav">Inicio</Link>

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
                                <Link to="/perfil" className="dropdown-item">Ver Perfil</Link>
                                <Link to="/logout" className="dropdown-item">Cerrar Sesión</Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <Link to="/register" className="btn-nav">Registrarse</Link>
                        <Link to="/login" className="btn-nav">Iniciar Sesión</Link>
                    </>
                )}
            </div>
        </nav>

    );
}
