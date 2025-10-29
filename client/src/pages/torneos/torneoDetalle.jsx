import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./torneo.css";

export default function TorneoDetalle() {
  const { id } = useParams();
  const [torneo, setTorneo] = useState(null);
  const [inscripto, setInscripto] = useState(false);
  const id_cliente = localStorage.getItem("cliente");

  const cargarTorneo = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/torneos/${id}`);
      setTorneo(res.data);
    } catch (err) {
      console.error("Error cargando torneo:", err);
    }
  };

  const verificarInscripcion = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/inscripciones/${id}/${id_cliente}`
      );
      setInscripto(res.data.inscripto);
    } catch (err) {
      console.error("Error verificando inscripción:", err);
    }
  };

  const manejarInscripcion = async () => {
    try {
      await axios.post("http://localhost:5000/inscripciones", {
        id_torneo: id,
        id_cliente,
      });
      setInscripto(true);
    } catch (err) {
      console.error("Error inscribiéndose:", err);
    }
  };

  useEffect(() => {
    cargarTorneo();
    verificarInscripcion();
  }, []);

  const formatFecha = (fecha) =>
    fecha
      ? new Date(fecha).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

  if (!torneo) return null;

  return (
    <>
      <Navbar />
      <div className="torneo-container">
        <div className="torneo-detalle-card">
          <h2 className="torneo-title">{torneo.nombre}</h2>
          <p>
            <strong>Fecha:</strong> {formatFecha(torneo.fecha_inicio)} -{" "}
            {formatFecha(torneo.fecha_fin)}
          </p>
          <p>
            <strong>Estado:</strong>{" "}
            <span className={`badge-${torneo.estado?.toLowerCase()}`}>
              {torneo.estado}
            </span>
          </p>

          <div className="torneo-actions">
            {inscripto ? (
              <button className="btn-disabled" disabled>
                Ya estás inscripto
              </button>
            ) : (
              <button className="btn-primary" onClick={manejarInscripcion}>
                Inscribirme
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
