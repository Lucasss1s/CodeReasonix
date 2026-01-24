import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import API_BASE from "../../config/api";
import { authFetch } from "../../utils/authToken";
import Navbar from "../../components/Navbar";
import "./entrevistas.css";

export default function OfertaDetalle() {
  const { id } = useParams();
  const [oferta, setOferta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [yaPostulado, setYaPostulado] = useState(false);
  const [cvFile, setCvFile] = useState(null);

  const fileInputRef = useRef(null);
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
      const res = await authFetch(`${API_BASE}/postulaciones/mias`);
      const lista = await res.json();
      setYaPostulado(lista.some(p => Number(p.id_oferta) === Number(id)));
    } catch (err) {
      console.error("Error verificando postulaciones:", err);
    }
  };

  useEffect(() => {
    cargarOferta();
    cargarSiPostule();
  }, [id]);

  const handleMainButtonClick = async () => {
    if (!id_cliente) {
      toast.error("Tenés que iniciar sesión para postularte.");
      return;
    }
    if (yaPostulado) return;

    if (!cvFile) {
      fileInputRef.current?.click();
      return;
    }

    try {
      setPosting(true);
      await authFetch(`${API_BASE}/postulaciones`, {
        method: 'POST',
        body: JSON.stringify({
          id_oferta: Number(id),
          estado: "pendiente",
        }),
      });
      setYaPostulado(true);
      toast.success("¡Postulación enviada!");
      await cargarSiPostule();
    } catch (err) {
      console.error("Error postulando:", err);
      toast.error("No se pudo enviar la postulación.");
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <div className="p-4">Cargando oferta…</div>;
  if (!oferta) return <div className="p-4 text-red-600">Oferta no encontrada</div>;

  const buttonText = yaPostulado
    ? "Ya te postulaste"
    : posting
    ? "Enviando..."
    : cvFile
    ? "Enviar postulación"
    : "Cargar CV";

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

            <div className="oferta-detalle-actions oferta-actions-column">
              <button className="oferta-btn-primary" onClick={handleMainButtonClick} disabled={posting || yaPostulado}>
                {buttonText}
              </button>

              {cvFile && !yaPostulado && (
                <div className="cv-row-inline">
                  <a href={URL.createObjectURL(cvFile)} target="_blank" rel="noreferrer" className="cv-name-link" title="Ver CV">
                    {cvFile.name}
                  </a>

                  <button type="button" className="cv-remove-btn" title="Quitar CV"
                    onClick={() => {
                      setCvFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" hidden
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) setCvFile(file);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
