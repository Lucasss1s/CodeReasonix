import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { supabase } from "../../config/supabase.js";
import Publicacion from "./publicacion.jsx";
import Comentario from "./comentario.jsx";
import Reaccion from "./reaccion.jsx";
import "./feed.css";

export default function Feed() {
    const [publicaciones, setPublicaciones] = useState([]);
    const [usuario, setUsuario] = useState(null);

    const cargarFeed = async () => {
        try {
            const res = await axios.get("http://localhost:5000/feed");
            setPublicaciones(res.data);
        } catch (err) {
            console.error("Error cargando feed:", err);
        }
    };

    useEffect(() => {
        cargarFeed();
    }, []);

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
                    console.error("Error obteniendo usuario:", error);
                    setUsuario({ nombre: user.email });
                } else {
                    setUsuario(data);
                }
            } else {
                setUsuario(null);
            }
        };

        fetchUsuario();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                supabase
                    .from("usuario")
                    .select("nombre")
                    .eq("email", session.user.email)
                    .single()
                    .then(({ data }) => setUsuario(data))
                    .catch(() => setUsuario({ nombre: session.user.email }));
            } else {
                setUsuario(null);
            }
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    const formatFecha = (fecha) => {
        const publicada = new Date(fecha);
        return publicada.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    };

    return (
        <div className="feed-container">
            <nav className="navbar">
                <h1 className="logo">CodeReasonix</h1>
                <div className="nav-buttons">
                    <Link to="/" className="btn-nav">Inicio</Link>
                    {usuario ? (
                        <>
                            <span className="usuario-nombre">Hola, {usuario.nombre}</span>
                            <Link to="/logout" className="btn-nav">Cerrar Sesión</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/register" className="btn-nav">Registrarse</Link>
                            <Link to="/login" className="btn-nav">Iniciar Sesión</Link>
                        </>
                    )}
                </div>
            </nav>

            <h1>Comunidad</h1>

            <Publicacion setPublicaciones={setPublicaciones} />

            {publicaciones.map(publi => (
                <div key={publi.id_publicacion} className="publicacion-card">
                    <h3>
                        {publi.cliente?.usuario?.nombre || "Usuario"}
                        <span className="fecha-publicacion">
                            {" • "}{formatFecha(publi.fecha)}
                        </span>
                    </h3>
                    <p>{publi.contenido}</p>

                    <Reaccion
                        idPublicacion={publi.id_publicacion}
                        reacciones={publi.reacciones}
                        onUpdate={cargarFeed}
                    />
                    <Comentario
                        idPublicacion={publi.id_publicacion}
                        comentarios={publi.comentarios}
                        onUpdate={cargarFeed}
                    />
                </div>
            ))}
        </div>
    );
}
