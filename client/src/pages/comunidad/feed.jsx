import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Publicacion from "./publicacion.jsx";
import Comentario from "./comentario.jsx";
import Reaccion from "./reaccion.jsx";
import "./feed.css";

const extraerHashtags = (texto = "") => {
    const regex = /#([a-zA-Z0-9_]+)/g;
    const tags = [];
    let match;
    while ((match = regex.exec(texto))) tags.push(match[1].toLowerCase());
    return tags;
    };

    export default function Feed() {
    const [publicaciones, setPublicaciones] = useState([]);
    const [menuAbierto, setMenuAbierto] = useState(null);
    const [hashtagFiltro, setHashtagFiltro] = useState("");
    const id_cliente = localStorage.getItem("cliente");

    const cargarFeed = async () => {
        try {
        const res = await axios.get("http://localhost:5000/feed");
        setPublicaciones(res.data);
        } catch (err) {
        console.error("Error cargando feed:", err);
        }
    };

    useEffect(() => { cargarFeed(); }, []);

    useEffect(() => {
        const handleClickFuera = (e) => {
        if (!e.target.closest(".menu-container")) setMenuAbierto(null);
        };
        document.addEventListener("mousedown", handleClickFuera);
        return () => document.removeEventListener("mousedown", handleClickFuera);
    }, []);

    const formatFecha = (fecha) => {
        const publicada = new Date(fecha);
        return publicada.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric"
        });
    };

    const handleEliminar = async (idPublicacion) => {
        try {
        await axios.delete(`http://localhost:5000/publicaciones/${idPublicacion}`, {
            data: { id_cliente }
        });
        cargarFeed();
        setMenuAbierto(null);
        } catch (err) {
        console.error("Error eliminando publicación:", err);
        }
    };

    const filtroNormalizado = hashtagFiltro.trim().replace(/^#/, "").toLowerCase();
    const publicacionesFiltradas = filtroNormalizado
        ? publicaciones.filter((p) =>
            extraerHashtags(p.contenido || "").some((tag) =>
            tag.startsWith(filtroNormalizado)
            )
        )
        : publicaciones;

    return (
        <>
        <Navbar />

        <div className="feed-container">
            <h1>Comunidad</h1>

            <Publicacion setPublicaciones={setPublicaciones} />

            <div className="feed-toolbar">
            <input
                className="feed-filter"
                type="text"
                placeholder="Filtrar por #hashtag (ej: #react)"
                value={hashtagFiltro}
                onChange={(e) => setHashtagFiltro(e.target.value)}
            />
            {hashtagFiltro && (
                <button
                className="feed-filter-clear"
                type="button"
                onClick={() => setHashtagFiltro("")}
                >
                Limpiar
                </button>
            )}
            </div>

            {publicacionesFiltradas.length === 0 && (
            <div className="feed-empty">
                {publicaciones.length === 0
                ? "Todavía no hay publicaciones. ¡Sé el primero en escribir algo!"
                : "No hay publicaciones que coincidan con ese hashtag."}
            </div>
            )}

            {publicacionesFiltradas.map(publi => {
            const autor = publi.cliente?.usuario;
            const nombreAutor = autor?.nombre || "Usuario";

            return (
                <div key={publi.id_publicacion} className="publicacion-card">
                <div className="publicacion-header">
                    <div className="publi-author">
                    <Link
                        to={`/perfil/${publi.cliente?.id_cliente}`}
                        className="publi-author-link"
                    >
                        <div className="publi-avatar">
                        <div className="publi-avatar__ph">
                            {nombreAutor.charAt(0).toUpperCase()}
                        </div>
                        </div>
                        <h3>
                        {nombreAutor}
                        <span className="fecha-publicacion">
                            {" • "}{formatFecha(publi.fecha)}
                        </span>
                        </h3>
                    </Link>
                    </div>

                    {publi.cliente?.id_cliente == id_cliente && (
                    <div className="menu-container">
                        <button
                        className="menu-button"
                        onClick={() =>
                            setMenuAbierto(menuAbierto === publi.id_publicacion ? null : publi.id_publicacion)
                        }
                        >
                        ⋮
                        </button>
                        {menuAbierto === publi.id_publicacion && (
                        <div className="menu-dropdown">
                            <button onClick={() => handleEliminar(publi.id_publicacion)}>
                            Eliminar
                            </button>
                        </div>
                        )}
                    </div>
                    )}
                </div>

                <p className="publicacion-texto">{publi.contenido}</p>

                {publi.imagen_url && (
                    <div className="publicacion-imagen-wrap">
                    <img
                        src={publi.imagen_url}
                        alt="Imagen de la publicación"
                        className="publicacion-imagen"
                    />
                    </div>
                )}

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
            );
            })}
        </div>
        </>
    );
}
