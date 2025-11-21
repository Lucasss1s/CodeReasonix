import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import QuestionModal from "../../components/QuestionModal";
import "./desafios.css";

export default function DesafioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [desafio, setDesafio] = useState(null);
  const [participante, setParticipante] = useState(null);
  const [preguntasAsignadas, setPreguntasAsignadas] = useState([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const id_cliente = localStorage.getItem("cliente");

  const imgRef = useRef(null);
  const prevHpRef = useRef(null);

  const [activePreguntaId, setActivePreguntaId] = useState(null);
  const preguntasSectionRef = useRef(null);

  const cargar = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/desafios/${id}`);
      const d = res.data;
      if (d && (d.hp_restante === null || d.hp_restante === undefined)) {
        d.hp_restante = d.hp_total;
      }
      setDesafio(d);
      if (prevHpRef.current == null) prevHpRef.current = d?.hp_restante ?? null;
      return d;
    } catch (err) {
      console.error("Error cargando desafío:", err);
      return null;
    }
  };

  const cargarParticipante = async () => {
    try {
      if (!id_cliente) {
        setParticipante(null);
        setPreguntasAsignadas([]);
        return;
      }
      const res = await axios.get(
        `http://localhost:5000/participante-desafio/mis/${id_cliente}`
      );
      const part = (res.data || []).find(
        (p) => Number(p.id_desafio) === Number(id)
      );
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
    (async () => {
      const d = await cargar();
      await cargarParticipante();
      if (prevHpRef.current == null && d) {
        prevHpRef.current = d.hp_restante ?? d.hp_total ?? null;
      }
    })();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!preguntasSectionRef.current) return;
      if (!preguntasSectionRef.current.contains(e.target)) {
        setActivePreguntaId(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleInscribirse = async () => {
    if (!id_cliente) {
      alert("Debes iniciar sesión para inscribirte");
      return;
    }
    try {
      await axios.post("http://localhost:5000/participante-desafio", {
        id_desafio: Number(id),
        id_cliente: Number(id_cliente),
      });
      await cargarParticipante();

      const res2 = await axios.get(
        `http://localhost:5000/participante-desafio/mis/${id_cliente}`
      );
      const part2 = (res2.data || []).find(
        (p) => Number(p.id_desafio) === Number(id)
      );
      if (!part2) return;
      const { data } = await axios.get(
        `http://localhost:5000/participante-pregunta/por-participante/${part2.id_participante}`
      );
      const first = data?.[0] ?? null;
      if (first) setActivePreguntaId(first.id_participante_pregunta);
    } catch (err) {
      console.error("Error inscribiendo:", err);
      alert("No se pudo inscribir. Intenta nuevamente.");
    }
  };

  const handleAfterAnswers = async (results = []) => {
    try {
      const anyCorrect =
        Array.isArray(results) &&
        results.some(
          (r) => r.correcta === true || (r?.ok && !r?.error)
        );
      const anyIncorrect =
        Array.isArray(results) &&
        results.some((r) => r.correcta === false || r?.error);

      const defeatByResult =
        Array.isArray(results) &&
        results.some(
          (r) =>
            typeof r.nuevo_hp === "number" && r.nuevo_hp <= 0
        );

      const imgNode =
        imgRef.current ||
        document.querySelector(".detalle-image-center") ||
        document.querySelector(".boss-image");
      const hpFill = document.querySelector(".hp-fill");

      if (hpFill) {
        hpFill.classList.add("hp-pulse");
        setTimeout(() => hpFill.classList.remove("hp-pulse"), 520);
      }

      if (anyCorrect) {
        if (imgNode) {
          imgNode.classList.remove(
            "boss-anim-bounce",
            "boss-anim-defeat",
            "boss-flash-wrong"
          );
          imgNode.classList.add("boss-anim-damage");
          setTimeout(
            () => imgNode.classList.remove("boss-anim-damage"),
            900
          );
        }
      } else if (anyIncorrect) {
        if (imgNode) {
          imgNode.classList.remove("boss-anim-damage", "boss-anim-defeat");
          imgNode.classList.add("boss-anim-bounce", "boss-flash-wrong");
          setTimeout(
            () =>
              imgNode.classList.remove(
                "boss-anim-bounce",
                "boss-flash-wrong"
              ),
            950
          );
        }
      }

      if (defeatByResult && imgNode) {
        setTimeout(() => {
          imgNode.classList.remove(
            "boss-anim-damage",
            "boss-anim-bounce",
            "boss-flash-wrong"
          );
          imgNode.classList.add("boss-anim-defeat");
          setTimeout(
            () => imgNode.classList.remove("boss-anim-defeat"),
            1400
          );
        }, 350);
      }

      const d = await cargar();
      await cargarParticipante();

      let finalHp = null;

      if (defeatByResult) {
        const lastWithHp = [...results]
          .reverse()
          .find((r) => typeof r.nuevo_hp === "number");
        finalHp =
          lastWithHp && typeof lastWithHp.nuevo_hp === "number"
            ? lastWithHp.nuevo_hp
            : 0;
      } else if (d) {
        if (typeof d.hp_restante === "number") {
          finalHp = d.hp_restante;
        } else if (typeof d.hp_total === "number") {
          finalHp = d.hp_total;
        }
      }

      if (finalHp !== null && finalHp <= 0) {
        setShowCompletionModal(true);
        setActivePreguntaId(null);
      }
    } catch (err) {
      console.error("Error en handleAfterAnswers:", err);
      await cargar();
      await cargarParticipante();
      setActivePreguntaId(null);
    }
  };

  if (!desafio) return <div className="page-container">Cargando...</div>;

  const yaRespondioTodo =
    participante &&
    preguntasAsignadas.length > 0 &&
    preguntasAsignadas.every((pp) => pp.respondida === true);

  return (
    <>
      <Navbar />

      {showCompletionModal && (
        <div className="completion-overlay">
          <div className="completion-modal">
            <h2>¡Desafío completado! 🎉</h2>
            <p>
              Has derrotado al boss y finalizado este desafío.
            </p>
            <div className="completion-modal-actions">
              <button
                className="btn-primary completion-btn"
                onClick={() => navigate("/desafios")}
              >
                Volver a desafíos
              </button>
              <div className="completion-subtext">
                Podés revisar tus otros desafíos en “Mis Desafíos”.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="page-container">
        <div className="detalle-card">
          <div className="detalle-header">
            <h1 className="detalle-titulo">{desafio.nombre}</h1>
            <div className="detalle-sub" style={{ display: "none" }}>
              {desafio.descripcion}
            </div>
          </div>

          <div className="detalle-media">
            {desafio.imagen_url ? (
              <img
                ref={imgRef}
                src={desafio.imagen_url}
                alt="boss"
                className="detalle-image-center"
              />
            ) : (
              <div className="detalle-image-center placeholder">
                Boss
              </div>
            )}

            <div className="hp-block">
              <div className="hp-bar full">
                <div
                  className="hp-fill"
                  style={{
                    width: `${desafio.hp_total > 0
                        ? Math.max(
                          0,
                          Math.min(
                            100,
                            Math.round(
                              (desafio.hp_restante / desafio.hp_total) *
                              100
                            )
                          )
                        )
                        : 0
                      }%`,
                  }}
                />
              </div>
              <div className="hp-text center">
                HP: {desafio.hp_restante ?? desafio.hp_total} /{" "}
                {desafio.hp_total}
              </div>
            </div>
          </div>

          <div className="detalle-footer">
            {!participante ? (
              <button
                className="btn-primary btn-inscribir"
                onClick={handleInscribirse}
              >
                Inscribirme
              </button>
            ) : (
              <div className="inscripto-badge">Inscripto</div>
            )}

            <div className="detalle-meta-right">
              <div className="small-muted">
                Recompensa:{" "}
                <span>
                  ⚡ <strong>{desafio.recompensa_xp}</strong> XP
                </span>{" "}
                •{" "}
                <span>
                  🪙 <strong>{desafio.recompensa_moneda}</strong> monedas
                </span>
              </div>
              <div className="small-muted">
                📅 Desde:{" "}
                {desafio.fecha_inicio
                  ? new Date(desafio.fecha_inicio).toLocaleDateString()
                  : "-"}{" "}
                {desafio.fecha_fin
                  ? ` • Hasta: ${new Date(
                    desafio.fecha_fin
                  ).toLocaleDateString()}`
                  : ""}
              </div>
            </div>

          </div>
        </div>

        <section
          className="preguntas-section"
          ref={preguntasSectionRef}
        >
          <h3>Preguntas asignadas</h3>

          {!participante && (
            <div className="vacio">
              No estás inscripto en este desafío — haz click en
              Inscribirme para participar.
            </div>
          )}
          {participante && preguntasAsignadas.length === 0 && (
            <div className="vacio">
              Aún no se te asignaron preguntas.
            </div>
          )}
          {participante && preguntasAsignadas.length > 0 && (
            <>
              <div className="preguntas-list">
                {preguntasAsignadas.map((pp) => {
                  const isActive =
                    activePreguntaId ===
                    pp.id_participante_pregunta;
                  return (
                    <div
                      key={pp.id_participante_pregunta}
                      style={{ marginBottom: 6 }}
                    >
                      <div
                        className={`assigned-card clickable ${pp.respondida ? "answered" : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pp.respondida) return;
                          setActivePreguntaId((cur) =>
                            cur === pp.id_participante_pregunta
                              ? null
                              : pp.id_participante_pregunta
                          );
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !pp.respondida
                          ) {
                            setActivePreguntaId((cur) =>
                              cur ===
                                pp.id_participante_pregunta
                                ? null
                                : pp.id_participante_pregunta
                            );
                          }
                        }}
                        aria-disabled={pp.respondida}
                      >
                        <div className="assigned-text">
                          {pp.pregunta?.texto}
                        </div>
                        <div className="assigned-meta">
                          {pp.respondida ? (
                            pp.correcta ? (
                              <span className="badge-correct">
                                ✅ Correcta
                              </span>
                            ) : (
                              <span className="badge-wrong">
                                ❌ Incorrecta
                              </span>
                            )
                          ) : (
                            <span className="badge-pending">
                              Sin responder
                            </span>
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <div
                          style={{
                            marginTop: 8,
                            marginLeft: 6,
                            marginRight: 6,
                            width: "100%",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <QuestionModal
                            open={true}
                            inline={true}
                            preguntas={[pp]}
                            onClose={() =>
                              setActivePreguntaId(null)
                            }
                            onAnswerSent={handleAfterAnswers}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {yaRespondioTodo && (
                <div
                  className="vacio"
                  style={{ marginTop: 12 }}
                >
                  Ya participaste del desafío — no podés responder
                  más preguntas.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
