import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import QuestionModal from "../../components/QuestionModal";
import "./desafios.css";

export default function DesafioDetalle() {
  const { id } = useParams();
  const [desafio, setDesafio] = useState(null);
  const [participante, setParticipante] = useState(null);
  const [preguntasAsignadas, setPreguntasAsignadas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const id_cliente = localStorage.getItem("cliente");

  const cargar = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/desafios/${id}`);
      const d = res.data;
      if (d && (d.hp_restante === null || d.hp_restante === undefined)) {
        d.hp_restante = d.hp_total;
      }
      setDesafio(d);
    } catch (err) {
      console.error("Error cargando desafío:", err);
    }
  };

  const cargarParticipante = async () => {
    try {
      if (!id_cliente) {
        setParticipante(null);
        setPreguntasAsignadas([]);
        return;
      }
      const res = await axios.get(`http://localhost:5000/participante-desafio/mis/${id_cliente}`);
      const part = (res.data || []).find((p) => Number(p.id_desafio) === Number(id));
      setParticipante(part || null);
      if (part) {
        const { data } = await axios.get(
          `http://localhost:5000/participante-pregunta/por-participante/${part.id_participante}`
        );
        setPreguntasAsignadas(data || []);
      } else {
        setPreguntasAsignadas([]);
      }
    } catch (err) {
      console.error("Error cargando participante/preguntas:", err);
    }
  };

  useEffect(() => {
    cargar();
    cargarParticipante();
    // eslint-disable-next-line
  }, [id]);

  const handleInscribirse = async () => {
    if (!id_cliente) {
      alert("Debes iniciar sesión para inscribirte");
      return;
    }
    try {
      const res = await axios.post("http://localhost:5000/participante-desafio", {
        id_desafio: Number(id),
        id_cliente: Number(id_cliente),
      });
      // recargar participante y preguntas asignadas
      await cargarParticipante();
      if (res.data && res.data.preguntas && res.data.preguntas.length > 0) {
        setModalOpen(true);
      } else {
        alert("Inscripto correctamente.");
      }
    } catch (err) {
      console.error("Error inscribiendo:", err);
      alert("No se pudo inscribir. Intenta nuevamente.");
    }
  };

  const handleAfterAnswers = async () => {
    await cargar();
    await cargarParticipante();
  };

  if (!desafio) return <div className="page-container">Cargando...</div>;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <Link to="/desafios">← Volver a desafíos</Link>

        <div className="detalle-top">
          <div className="detalle-left">
            <h1>{desafio.nombre}</h1>
            <p>{desafio.descripcion}</p>
            <div className="detalle-meta">
              HP: {desafio.hp_restante ?? desafio.hp_total} / {desafio.hp_total}
            </div>
          </div>

          <div className="detalle-right">
            {desafio.imagen_url ? (
              <img src={desafio.imagen_url} alt="boss" className="detalle-image" />
            ) : (
              <div className="detalle-image placeholder">Boss</div>
            )}

            <div className="detalle-actions">
              {!participante ? (
                <button className="btn-primary" onClick={handleInscribirse}>
                  Inscribirme
                </button>
              ) : (
                <>
                  <button className="btn-primary" onClick={() => setModalOpen(true)}>
                    Ver mis preguntas
                  </button>
                  <div className="small-muted">
                    Aciertos: {participante.aciertos} • Respondidas: {participante.respondidas}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <section className="preguntas-section">
          <h3>Preguntas asignadas</h3>
          {preguntasAsignadas.length === 0 && <div className="vacio">No tenés preguntas asignadas aún.</div>}
          {preguntasAsignadas.map((pp) => (
            <div key={pp.id_participante_pregunta} className="assigned-card">
              <div className="assigned-text">{pp.pregunta?.texto || "Pregunta"}</div>
              <div className="assigned-meta">
                {pp.respondida ? (pp.correcta ? "✅ Correcta" : "❌ Incorrecta") : "Sin responder"}
              </div>
            </div>
          ))}
        </section>

        <QuestionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          preguntas={preguntasAsignadas}
          onAnswerSent={handleAfterAnswers}
        />
      </div>
    </>
  );
}
