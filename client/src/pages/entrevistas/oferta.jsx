import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./entrevistas.css";

export default function Oferta() {
  const [ofertas, setOfertas] = useState([]);
  const [postingId, setPostingId] = useState(null);
  const id_cliente = localStorage.getItem("cliente");

  const cargarOfertas = async () => {
    try {
      const res = await axios.get("http://localhost:5000/ofertas");
      setOfertas(res.data || []);
    } catch (err) {
      console.error("Error cargando ofertas:", err);
    }
  };

  useEffect(() => {
    cargarOfertas();
  }, []);

  const handlePostularme = async (id_oferta) => {
    if (!id_cliente) {
      alert("Tenés que iniciar sesión para postularte.");
      return;
    }
    try {
      setPostingId(id_oferta);
      await axios.post("http://localhost:5000/postulaciones", {
        id_oferta,
        id_cliente: Number(id_cliente),
        estado: "pendiente",
      });
      alert("¡Postulación enviada!");
    } catch (err) {
      console.error("Error postulando:", err);
      alert("No pudimos enviar tu postulación (¿ya postulaste?).");
    } finally {
      setPostingId(null);
    }
  };

  const formatFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "";

  return (
    <>
      <Navbar />
      <div className="entrevistas-container">
        <h1>Ofertas laborales</h1>

        {ofertas.length === 0 && (
          <div className="vacio">No hay ofertas disponibles.</div>
        )}

        {ofertas.map((of) => (
          <div key={of.id_oferta} className="oferta-card">
            <div className="oferta-header">
              <h3>{of.titulo}</h3>
              <div className="oferta-meta">
                <span>{of.empresa?.nombre || "Empresa"}</span>
                {of.empresa?.sector && <span> • {of.empresa?.sector}</span>}
                {of.ubicacion && <span> • {of.ubicacion}</span>}
                {of.fecha_publicacion && (
                  <span className="fecha"> • {formatFecha(of.fecha_publicacion)}</span>
                )}
              </div>
            </div>

            {of.descripcion && <p className="oferta-descripcion">{of.descripcion}</p>}

            {of.requisitos && (
              <div className="oferta-requisitos">
                <strong>Requisitos:</strong>
                <p className="pre">{of.requisitos}</p>
              </div>
            )}

            <div className="oferta-actions">
              <button
                className="btn-primary"
                onClick={() => handlePostularme(of.id_oferta)}
                disabled={postingId === of.id_oferta}
              >
                {postingId === of.id_oferta ? "Enviando..." : "Postularme"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
