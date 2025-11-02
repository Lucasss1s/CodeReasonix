import React, { useEffect, useState } from "react";
import axios from "axios";
import "../pages/desafios/questionModal.css";

export default function QuestionModal({ open, onClose, preguntas, onAnswerSent }) {
  // preguntas: array of participante_pregunta rows including `desafio_pregunta` and `pregunta`
  const [answers, setAnswers] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) setAnswers({});
  }, [open]);

  if (!open) return null;

  const handleChange = (id, val) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  const handleSubmit = async () => {
    setSending(true);
    try {
      // enviar cada respuesta; el backend ignora respuestas vacías
      for (const p of preguntas) {
        const id = p.id_participante_pregunta;
        const respuesta = answers[id];
        if (!respuesta) continue;
        await axios.post(`http://localhost:5000/participante-pregunta/${id}/respond`, {
          respuesta,
        });
      }
      onAnswerSent && (await onAnswerSent());
      onClose();
    } catch (err) {
      console.error("Error enviando respuestas:", err);
      alert("Error enviando respuestas. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <header className="modal-header">
          <h3>Responde tus preguntas</h3>
          <button className="close-btn" onClick={onClose}>
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
                    <label key={key} className="q-option">
                      <input
                        type="radio"
                        name={`opt-${p.id_participante_pregunta}`}
                        value={key}
                        checked={answers[p.id_participante_pregunta] === key}
                        onChange={() => handleChange(p.id_participante_pregunta, key)}
                      />
                      <span className="opt-label">
                        {key}. {text}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={sending}>
            Enviar respuestas
          </button>
        </footer>
      </div>
    </div>
  );
}
