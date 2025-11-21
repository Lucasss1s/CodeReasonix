import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "../config/api";
import "../pages/desafios/questionModal.css";

export default function QuestionModal({
  open,
  inline = false,
  onClose,
  preguntas = [],
  onAnswerSent,
}) {
  const [answers, setAnswers] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) setAnswers({});
  }, [open]);

  if (!open) return null;

  const handleChange = (id, val) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  const allRespondidas =
    preguntas.length > 0 && preguntas.every((p) => p.respondida === true);

  const handleSubmit = async () => {
    setSending(true);
    try {
      if (allRespondidas) {
        setSending(false);
        return;
      }

      let sentAny = false;
      const results = [];

      for (const p of preguntas) {
        const id = p.id_participante_pregunta;
        if (p.respondida) continue;
        const respuesta = answers[id];
        if (!respuesta) continue;
        sentAny = true;
        const res = await axios.post(
          `${API_BASE}/participante-pregunta/${id}/respond`,
          { respuesta }
        );
        results.push(res?.data ?? { id_participante_pregunta: id, ok: true });
      }

      if (!sentAny) {
        alert("Seleccioná al menos una opción antes de enviar.");
        setSending(false);
        return;
      }

      if (onAnswerSent) await onAnswerSent(results);
      if (onClose) onClose();
    } catch (err) {
      console.error("Error enviando respuestas:", err);
      alert("Error enviando respuestas. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  if (inline) {
    if (allRespondidas) return null;

    return (
      <div
        className="modal-card modal-card-inline"
        aria-live="polite"
      >
        <header className="modal-header modal-header-inline">
          <h4 className="modal-inline-title">Marca la respuesta correcta</h4>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="modal-body modal-body-inline">
          {preguntas.map((p) => (
            <div
              key={p.id_participante_pregunta}
              className="modal-question modal-question-inline"
            >
              <div className="q-options q-options-inline">
                {p.pregunta &&
                  Object.entries(p.pregunta.opciones).map(([key, text]) => (
                    <label
                      key={key}
                      className={`q-option ${
                        p.respondida ? "disabled-option" : ""
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !p.respondida)
                          handleChange(p.id_participante_pregunta, key);
                      }}
                    >
                      <input
                        type="radio"
                        name={`opt-${p.id_participante_pregunta}`}
                        value={key}
                        checked={answers[p.id_participante_pregunta] === key}
                        onChange={() =>
                          handleChange(p.id_participante_pregunta, key)
                        }
                        disabled={p.respondida || sending}
                        aria-label={`Opción ${key}`}
                      />
                      <span className="opt-label">
                        {key}. {text}
                      </span>
                      {p.respondida && (
                        <span className="inline-badge-wrapper">
                          {p.correcta ? (
                            <span className="badge-correct">✅</span>
                          ) : (
                            <span className="badge-wrong">❌</span>
                          )}
                        </span>
                      )}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="modal-footer modal-footer-inline">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={sending}
          >
            Cerrar
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={sending || allRespondidas}
          >
            {sending ? "Enviando..." : "Enviar respuesta"}
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header className="modal-header">
          <h3>Responde tu pregunta</h3>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="modal-body">
          {preguntas.map((p, idx) => (
            <div key={p.id_participante_pregunta} className="modal-question">
              <div className="q-number">Pregunta {idx + 1}</div>
              <div className="q-text">{p.pregunta?.texto}</div>

              <div className="q-options">
                {p.pregunta &&
                  Object.entries(p.pregunta.opciones).map(([key, text]) => (
                    <label
                      key={key}
                      className={`q-option ${
                        p.respondida ? "disabled-option" : ""
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !p.respondida)
                          handleChange(p.id_participante_pregunta, key);
                      }}
                    >
                      <input
                        type="radio"
                        name={`opt-${p.id_participante_pregunta}`}
                        value={key}
                        checked={answers[p.id_participante_pregunta] === key}
                        onChange={() =>
                          handleChange(p.id_participante_pregunta, key)
                        }
                        disabled={p.respondida || sending}
                        aria-label={`Opción ${key}`}
                      />
                      <span className="opt-label">
                        {key}. {text}
                      </span>
                      {p.respondida && (
                        <span className="inline-badge-wrapper">
                          {p.correcta ? (
                            <span className="badge-correct">✅</span>
                          ) : (
                            <span className="badge-wrong">❌</span>
                          )}
                        </span>
                      )}
                    </label>
                  ))}
              </div>
            </div>
          ))}

          {allRespondidas && (
            <div className="vacio" style={{ marginTop: 12 }}>
              Ya respondiste esta(s) pregunta(s).
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={sending}
          >
            Cerrar
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={sending || allRespondidas}
          >
            {sending ? "Enviando..." : "Enviar respuesta"}
          </button>
        </footer>
      </div>
    </div>
  );
}
