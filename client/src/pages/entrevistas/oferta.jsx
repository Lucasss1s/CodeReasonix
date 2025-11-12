import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./entrevistas.css";

export default function Oferta() {
  const [ofertas, setOfertas] = useState([]);
  const navigate = useNavigate();

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

  const snippet = (text, max = 180) => {
    if (!text) return "";
    return text.length > max ? text.slice(0, max).trim() + "…" : text;
  };

  const formatFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

  return (
    <>
      <Navbar />
      <div className="ofertas-page">
        <div className="entrevistas-container">
          <h1 className="ofertas-title">Ofertas laborales</h1>

          {ofertas.length === 0 && (
            <div className="vacio">No hay ofertas disponibles.</div>
          )}

          <div className="grid-ofertas">
            {ofertas.map((of) => (
              <article
                key={of.id_oferta}
                className="oferta-card-clickable oferta-card-dark"
                onClick={() => navigate(`/entrevistas/oferta/${of.id_oferta}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/entrevistas/oferta/${of.id_oferta}`);
                }}
              >
                <div className="oferta-card-main">
                  <div className="oferta-left">
                    <h3 className="oferta-title-dark">{of.titulo}</h3>
                    <p className="oferta-company-dark">
                      {of.empresa?.nombre || "Empresa"}
                      {of.empresa?.sector ? ` • ${of.empresa.sector}` : ""}
                    </p>
                    <p className="oferta-snippet-dark">
                      {snippet(of.descripcion || of.requisitos)}
                    </p>
                  </div>

                  <div className="oferta-right-dark">
                    {of.ubicacion && <div className="meta-line">{of.ubicacion}</div>}
                    <div className="meta-line">{formatFecha(of.fecha_publicacion)}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
