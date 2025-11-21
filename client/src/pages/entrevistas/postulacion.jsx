import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "../../config/api";
import Navbar from "../../components/Navbar";
import "./entrevistas.css";

export default function Postulacion() {
  const [items, setItems] = useState([]);
  const id_cliente = localStorage.getItem("cliente");

  const cargar = async () => {
    if (!id_cliente) return;
    try {
      const res = await axios.get(`${API_BASE}/postulaciones/mias/${id_cliente}`);
      setItems(res.data || []);
    } catch (err) {
      console.error("Error cargando postulaciones:", err);
    }
  };

  useEffect(() => {
    cargar();
  }, [id_cliente]);

  const formatFechaHora = (iso) =>
    iso ? new Date(iso).toLocaleString("es-ES") : "";

  return (
    <>
      <Navbar />
      <div className="postulaciones-page">
        <div className="entrevistas-container">
          <h1 className="post-title">Mis postulaciones</h1>

          {!id_cliente && (
            <div className="vacio-dark">Tenés que iniciar sesión para ver tus postulaciones.</div>
          )}

          {id_cliente && items.length === 0 && (
            <div className="vacio-dark">Aún no te postulaste a ninguna oferta.</div>
          )}

          {items.map((p) => (
            <article key={p.id_postulacion} className="post-card">
              <header className="post-header">
                <h3 className="post-heading">
                  {p.oferta?.titulo || `Oferta #${p.id_oferta}`}
                </h3>
                <span className={`post-badge ${`status-${(p.estado || "pendiente").toLowerCase()}`}`}>
                  {p.estado || "pendiente"}
                </span>
              </header>

              <div className="post-meta">
                <span className="meta-chip">ID Oferta: {p.id_oferta}</span>
                <span className="dot">•</span>
                <span className="meta-chip">Fecha: {formatFechaHora(p.fecha)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
