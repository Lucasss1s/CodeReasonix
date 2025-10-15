import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./entrevistas.css";

export default function Postulacion() {
  const [items, setItems] = useState([]);
  const id_cliente = localStorage.getItem("cliente");

  const cargar = async () => {
    if (!id_cliente) return;
    try {
      const res = await axios.get(
        `http://localhost:5000/postulaciones/mias/${id_cliente}`
      );
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
      <div className="entrevistas-container">
        <h1>Mis postulaciones</h1>

        {!id_cliente && (
          <div className="vacio">Tenés que iniciar sesión para ver tus postulaciones.</div>
        )}

        {id_cliente && items.length === 0 && (
          <div className="vacio">Aún no te postulaste a ninguna oferta.</div>
        )}

        {items.map((p) => (
          <div key={p.id_postulacion} className="postulacion-card">
            <div className="postulacion-header">
              <h3>{p.oferta?.titulo || `Oferta #${p.id_oferta}`}</h3>
              <span className={`estado badge-${p.estado || "pendiente"}`}>
                {p.estado}
              </span>
            </div>

            <div className="postulacion-meta">
              <span>ID Oferta: {p.id_oferta}</span>
              <span>•</span>
              <span>Fecha: {formatFechaHora(p.fecha)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
