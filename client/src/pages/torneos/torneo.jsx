import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./torneo.css";

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const navigate = useNavigate();

  const cargarTorneos = async () => {
    try {
      const res = await axios.get("http://localhost:5000/torneos");
      setTorneos(res.data || []);
    } catch (err) {
      console.error("Error cargando torneos:", err);
    }
  };

  useEffect(() => {
    cargarTorneos();
  }, []);

  const formatFecha = (fecha) =>
    fecha
      ? new Date(fecha).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

  return (
    <>
      <Navbar />
      <div className="torneo-container">
        <h1>Torneos</h1>

        {torneos.length === 0 && (
          <div className="vacio">No hay torneos disponibles.</div>
        )}

        <div className="grid-torneos">
          {torneos.map((t) => (
            <article
              key={t.id_torneo}
              className="torneo-card"
              onClick={() => navigate(`/torneos/${t.id_torneo}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(`/torneos/${t.id_torneo}`);
              }}
            >
              <div className="torneo-card-main">
                <div className="torneo-left">
                  <h3 className="torneo-title">{t.nombre}</h3>
                  <p className="torneo-meta">
                    {formatFecha(t.fecha_inicio)} - {formatFecha(t.fecha_fin)}
                  </p>
                </div>
                <div className="torneo-right">
                  <span
                    className={`torneo-estado badge-${t.estado?.toLowerCase()}`}
                  >
                    {t.estado}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
