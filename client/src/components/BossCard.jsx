import React, { useEffect, useRef } from "react";
import "../pages/desafios/desafios.css";

export default function BossCard({ desafio, onClick }) {
  const hpTotal = Number(desafio.hp_total || 0);
  const hpRest = Number(
    desafio.hp_restante == null ? desafio.hp_total : desafio.hp_restante
  );
  const pct =
    hpTotal > 0
      ? Math.max(0, Math.min(100, Math.round((hpRest / hpTotal) * 100)))
      : 0;

  const dificultad = (desafio?.dificultad || "").toLowerCase(); 
  const lenguaje = (desafio?.lenguaje || "").toLowerCase();     

  const imgRef = useRef(null);

  useEffect(() => {
    if (!desafio || !desafio.anim) return;
    const node = imgRef.current;
    if (!node) return;

    node.classList.remove(
      "boss-anim-hit",
      "boss-anim-wrong",
      "boss-anim-defeat",
      "boss-flash-wrong"
    );

    const type = desafio.anim;
    if (type === "hit") {
      node.classList.add("boss-anim-hit");
    } else if (type === "wrong") {
      node.classList.add("boss-anim-wrong", "boss-flash-wrong");
    } else if (type === "defeat") {
      node.classList.add("boss-anim-defeat");
    }

    const duration = type === "defeat" ? 950 : type === "wrong" ? 700 : 550;
    const tid = setTimeout(() => {
      node.classList.remove(
        "boss-anim-hit",
        "boss-anim-wrong",
        "boss-anim-defeat",
        "boss-flash-wrong"
      );
    }, duration + 30);

    return () => clearTimeout(tid);
  }, [desafio && desafio.anim]);

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
          <span className={`chip chip--diff chip--diff-${dificultad || "facil"}`}>
            {dificultad || "—"}
          </span>
          <span className={`chip chip--lang chip--lang-${lenguaje || "java"}`}>
            {lenguaje || "—"}
          </span>

          <span>
            Inicio:{" "}
            {desafio.fecha_inicio
              ? new Date(desafio.fecha_inicio).toLocaleDateString()
              : "-"}
          </span>
          {desafio.fecha_fin && (
            <span>
              {" "}| Fin: {new Date(desafio.fecha_fin).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="boss-right">
        {desafio.imagen_url ? (
          <img
            ref={imgRef}
            src={desafio.imagen_url}
            alt={`Boss ${desafio.nombre}`}
            className="boss-image"
            draggable={false}
          />
        ) : (
          <div ref={imgRef} className="boss-image placeholder" aria-hidden>
            Boss
          </div>
        )}

        <div className="hp-bar" aria-hidden>
          <div className="hp-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="hp-text" aria-live="polite">
          HP: {hpRest} / {hpTotal} ({pct}%)
        </div>
      </div>
    </article>
  );
}
