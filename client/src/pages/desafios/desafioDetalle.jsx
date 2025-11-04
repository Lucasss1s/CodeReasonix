import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  const [preguntaActiva, setPreguntaActiva] = useState(null); 
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
      await cargarParticipante();
      if (res.data && res.data.preguntas && res.data.preguntas.length > 0) {
        const notResponded = (res.data.preguntas || []).find(p => !p.respondida) || null;
        if (notResponded) {
          setPreguntaActiva(notResponded);
          setModalOpen(true);
          return;
        }
      }
      alert("Inscripto correctamente.");
    } catch (err) {
      console.error("Error inscribiendo:", err);
      alert("No se pudo inscribir. Intenta nuevamente.");
    }
  };

  const abrirPregunta = (pp) => {
    if (pp.respondida) return;
    setPreguntaActiva(pp);
    setModalOpen(true);
  };

  const handleAfterAnswers = async () => {
    await cargar();
    await cargarParticipante();
    setModalOpen(false);
    setPreguntaActiva(null);
  };

  if (!desafio) return <div className="page-container">Cargando...</div>;

  const yaRespondioTodo =
    participante &&
    preguntasAsignadas.length > 0 &&
    preguntasAsignadas.every((pp) => pp.respondida === true);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="detalle-card">
          <div className="detalle-header">
            <h1 className="detalle-titulo">{desafio.nombre}</h1>
          </div>

          <div className="detalle-media">
            {desafio.imagen_url ? (
              <img src={desafio.imagen_url} alt="boss" className="detalle-image-center" />
            ) : (
              <div className="detalle-image-center placeholder">Boss</div>
            )}

            <div className="hp-block">
              <div className="hp-bar full">
                <div
                  className="hp-fill"
                  style={{
                    width: `${desafio.hp_total > 0 ? Math.max(0, Math.min(100, Math.round((desafio.hp_restante / desafio.hp_total) * 100))) : 0}%`,
                  }}
                />
              </div>
              <div className="hp-text center">
                HP: {desafio.hp_restante ?? desafio.hp_total} / {desafio.hp_total}
              </div>
            </div>
          </div>

          <div className="detalle-footer">
            {!participante ? (
              <button className="btn-primary btn-inscribir" onClick={handleInscribirse}>
                Inscribirme
              </button>
            ) : (
              <div className="inscripto-badge">Inscripto</div>
            )}

            <div className="detalle-meta-right">
              <div>Recompensa: <strong>{desafio.recompensa_xp} XP</strong> • <strong>{desafio.recompensa_moneda} monedas</strong></div>
              <div className="small-muted">Desde: {desafio.fecha_inicio ? new Date(desafio.fecha_inicio).toLocaleDateString() : "-" } {desafio.fecha_fin ? ` • Hasta: ${new Date(desafio.fecha_fin).toLocaleDateString()}` : ""}</div>
            </div>
          </div>
        </div>

        <section className="preguntas-section">
          <h3>Preguntas asignadas</h3>

          {!participante && <div className="vacio">No estás inscripto en este desafío — haz click en Inscribirme para participar.</div>}
          {participante && preguntasAsignadas.length === 0 && <div className="vacio">Aún no se te asignaron preguntas.</div>}
          {participante && preguntasAsignadas.length > 0 && (
            <>
              <div className="preguntas-list">
                {preguntasAsignadas.map((pp) => (
                  <div
                    key={pp.id_participante_pregunta}
                    className={`assigned-card clickable ${pp.respondida ? 'answered' : ''}`}
                    onClick={() => abrirPregunta(pp)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') abrirPregunta(pp); }}
                    aria-disabled={pp.respondida}
                  >
                    <div className="assigned-text">{pp.pregunta?.texto}</div>
                    <div className="assigned-meta">
                      {pp.respondida ? (
                        pp.correcta ? <span className="badge-correct">✅ Correcta</span> : <span className="badge-wrong">❌ Incorrecta</span>
                      ) : (
                        <span className="badge-pending">Sin responder</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {yaRespondioTodo && (
                <div className="vacio" style={{ marginTop: 12 }}>
                  Ya participaste del desafío — no podés responder más preguntas.
                </div>
              )}
            </>
          )}
        </section>

        <QuestionModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setPreguntaActiva(null); }}
          preguntas={preguntaActiva ? [preguntaActiva] : []}
          onAnswerSent={handleAfterAnswers}
        />
      </div>
    </>
  );
}
