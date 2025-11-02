import React from "react";
import "../pages/desafios/desafios.css";

export default function BossCard({ desafio, onClick }) {
  const hpTotal = Number(desafio.hp_total || 0);
  const hpRest = Number(desafio.hp_restante == null ? desafio.hp_total : desafio.hp_restante);
  const pct = hpTotal > 0 ? Math.max(0, Math.min(100, Math.round((hpRest / hpTotal) * 100))) : 0;

  return (
    <article
      className="boss-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
    >
      <div className="boss-left">
        <h3 className="boss-title">{desafio.nombre}</h3>
        <p className="boss-desc">{desafio.descripcion}</p>
        <div className="boss-meta">
          <span>Inicio: {desafio.fecha_inicio ? new Date(desafio.fecha_inicio).toLocaleDateString() : "-"}</span>
          {desafio.fecha_fin && <span> • Fin: {new Date(desafio.fecha_fin).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="boss-right">
        {desafio.imagen_url ? (
          <img src={desafio.imagen_url} alt={`Boss ${desafio.nombre}`} className="boss-image" />
        ) : (
          <div className="boss-image placeholder">Boss</div>
        )}

        <div className="hp-bar">
          <div className="hp-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="hp-text">
          HP: {hpRest} / {hpTotal} ({pct}%)
        </div>
      </div>
    </article>
  );
}
