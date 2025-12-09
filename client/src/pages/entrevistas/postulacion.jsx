import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE from "../../config/api";
import Navbar from "../../components/Navbar";
import "./entrevistas.css";

export default function Postulacion() {
  const [items, setItems] = useState([]);
  const id_cliente = localStorage.getItem("cliente");
  const navigate = useNavigate();

  const cargar = async () => {
    if (!id_cliente) return;
    try {
      const res = await axios.get(
        `${API_BASE}/postulaciones/mias/${id_cliente}`
      );
      setItems(res.data || []);
    } catch (err) {
      console.error("Error cargando postulaciones:", err);
    }
  };

  useEffect(() => {
    cargar();
  }, [id_cliente]);

  const formatFechaHora = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Navbar />
      <div className="postulaciones-page">
        <div className="entrevistas-container">
          <h1 className="post-title">Mis postulaciones</h1>

          {!id_cliente && (
            <div className="vacio-dark">
              Tenés que iniciar sesión para ver tus postulaciones.
            </div>
          )}

          {id_cliente && items.length === 0 && (
            <div className="vacio-dark">
              Aún no te postulaste a ninguna oferta.
            </div>
          )}

          {items.map((p) => (
            <article key={p.id_postulacion} className="post-card">
              <header className="post-header">
                <div className="post-header-left">
                  <div className="post-date-top">
                    📅 {formatFechaHora(p.fecha)}
                  </div>

                  <h3 className="post-heading">
                    {p.oferta?.titulo || `Oferta #${p.id_oferta}`}
                  </h3>

                  <button
                    type="button"
                    className="post-link-btn"
                    onClick={() =>
                      navigate(`/entrevistas/oferta/${p.id_oferta}`)
                    }
                  >
                    Ver oferta
                  </button>
                </div>

                <span
                  className={`post-badge ${`status-${(
                    p.estado || "pendiente"
                  ).toLowerCase()}`}`}
                >
                  {p.estado || "pendiente"}
                </span>
              </header>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
