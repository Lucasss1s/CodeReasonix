import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE from "../../config/api";
import Navbar from "../../components/Navbar";
import "./entrevistas.css";

export default function OfertaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [oferta, setOferta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [yaPostulado, setYaPostulado] = useState(false);
  const id_cliente = localStorage.getItem("cliente");

  const cargarOferta = async () => {
    try {
      const res = await axios.get(`${API_BASE}/ofertas/${id}`);
      setOferta(res.data);
    } catch (err) {
      console.error("Error cargando oferta:", err);
    } finally {
      setLoading(false);
    }
  };

  const cargarSiPostule = async () => {
    if (!id_cliente) return setYaPostulado(false);
    try {
      const res = await axios.get(`${API_BASE}/postulaciones/mias/${id_cliente}`);
      const lista = res.data || [];
      const found = lista.some((p) => Number(p.id_oferta) === Number(id));
      setYaPostulado(found);
    } catch (err) {
      console.error("Error verificando postulaciones:", err);
    }
  };

  useEffect(() => {
    cargarOferta();
    cargarSiPostule();
  }, [id]);

  const handlePostularme = async () => {
    if (!id_cliente) {
      alert("Tenés que iniciar sesión para postularte.");
      return;
    }
    if (yaPostulado) {
      alert("Ya te postulaste a esta oferta.");
      return;
    }

    try {
      setPosting(true);
      await axios.post(`${API_BASE}/postulaciones`, {
        id_oferta: Number(id),
        id_cliente: Number(id_cliente),
        estado: "pendiente",
      });
      setYaPostulado(true);
      alert("¡Postulación enviada!");
      navigate("/entrevistas/mis-postulaciones");
    } catch (err) {
      console.error("Error postulando:", err);
      alert("No pudimos enviar tu postulación (¿ya postulaste?).");
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <div className="p-4">Cargando oferta…</div>;
  if (!oferta) return <div className="p-4 text-red-600">Oferta no encontrada</div>;

  return (
    <>
      <Navbar />
      <div className="oferta-page">
        <div className="entrevistas-container">
          <div className="oferta-detalle-card">
            <header className="oferta-detalle-header">
              <div className="oferta-detalle-header-left">
                <h1 className="oferta-titulo">{oferta.titulo}</h1>
                <p className="oferta-company">
                  {oferta.empresa?.nombre ?? "Empresa"}
                  {oferta.empresa?.sector ? ` • ${oferta.empresa.sector}` : ""}
                </p>
              </div>
              <div className="oferta-detalle-meta">
                {oferta.ubicacion && <div>{oferta.ubicacion}</div>}
                {oferta.fecha_publicacion && (
                  <div className="oferta-small-muted">
                    {new Date(oferta.fecha_publicacion).toLocaleDateString("es-ES")}
                  </div>
                )}
              </div>
            </header>

            <section className="oferta-detalle-section">
              <h3>Descripción</h3>
              <p className="whitespace-pre-wrap">{oferta.descripcion || "—"}</p>
            </section>

            {oferta.requisitos && (
              <section className="oferta-detalle-section">
                <h3>Requisitos</h3>
                <p className="whitespace-pre-wrap">{oferta.requisitos}</p>
              </section>
            )}

            <div className="oferta-detalle-actions">
              <button
                className="oferta-btn-primary"
                onClick={handlePostularme}
                disabled={posting || yaPostulado}
              >
                {yaPostulado ? "Ya te postulaste" : posting ? "Enviando..." : "Postularme"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
