import { useState } from "react";
import { toast } from "sonner";
import "./ejercicio-bug.css";
import API_BASE from "../config/api";

export default function EjercicioBugReport({
    idEjercicio,
    idCliente,
    lenguaje,
    codigoActual,
    onClose,
    }) {
    const [tipo, setTipo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [includeCode, setIncludeCode] = useState(true);
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const desc = descripcion.trim();
        if (!desc) {
        toast.info("Contame brevemente cuál es el problema.");
        return;
        }

        setSending(true);
        try {
        const res = await fetch(`${API_BASE}/ejercicio-bug`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            id_ejercicio: idEjercicio,
            id_cliente: idCliente,
            tipo,
            descripcion: desc,
            codigo_fuente: includeCode ? codigoActual : null,
            }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

        toast.success("Gracias, se registró el reporte 🙌");
        onClose?.();
        } catch (err) {
        console.error("[BUG] submit fail:", err);
        toast.error(err.message || "No se pudo enviar el reporte");
        } finally {
        setSending(false);
        }
    };

    const handleBackdrop = (e) => {
        //cerrar si click fuera 
        if (e.target.classList.contains("bug-modal-backdrop")) {
        onClose?.();
        }
    };

    return (
        <div className="bug-modal-backdrop" onClick={handleBackdrop}>
        <div className="bug-modal">
            <div className="bug-modal__header">
            <h3>
                <i className="fa-regular fa-flag" /> Reportar problema
            </h3>
            <button className="bug-close-btn" onClick={onClose} title="Cerrar">
                ✕
            </button>
            </div>

            <form onSubmit={handleSubmit} className="bug-form">
            <div className="bug-field">
                <label>Tipo de problema (opcional)</label>
                <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                >
                <option value="">Sin especificar</option>
                <option value="enunciado">Enunciado / descripción</option>
                <option value="casos_prueba">Casos de prueba</option>
                <option value="evaluador">Evaluador / ejecución</option>
                <option value="plataforma">Plataforma / UI</option>
                <option value="otro">Otro</option>
                </select>
            </div>

            <div className="bug-field">
                <label>Descripción del problema *</label>
                <textarea
                rows={4}
                placeholder="¿Qué esperabas que pase? ¿Qué pasó en realidad? ¿Algún caso concreto que falle?"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                />
            </div>

            <div className="bug-extra">
                <label className="bug-checkbox">
                <input
                    type="checkbox"
                    checked={includeCode}
                    onChange={(e) => setIncludeCode(e.target.checked)}
                />
                <span>Adjuntar mi código actual del editor</span>
                </label>
                {includeCode && (
                <span className="bug-tag-lang">
                    Lenguaje: <strong>{lenguaje}</strong>
                </span>
                )}
            </div>

            <div className="bug-actions">
                <button
                type="button"
                className="ex-btn ex-btn--ghost"
                onClick={onClose}
                disabled={sending}
                >
                Cancelar
                </button>
                <button
                type="submit"
                className="ex-btn"
                disabled={sending}
                >
                {sending ? "Enviando…" : "Enviar reporte"}
                </button>
            </div>
            </form>
        </div>
        </div>
    );
}
