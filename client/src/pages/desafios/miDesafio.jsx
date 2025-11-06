import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./desafios.css";

export default function MisDesafios() {
  const [mis, setMis] = useState([]);
  const [loadingClaim, setLoadingClaim] = useState(null); 
  const id_cliente_raw = localStorage.getItem("cliente");
  const id_cliente = id_cliente_raw ? Number(id_cliente_raw) : null;
  const navigate = useNavigate();

  const cargar = async () => {
    if (!id_cliente) return setMis([]);
    try {
      const res = await axios.get(`http://localhost:5000/participante-desafio/mis/${id_cliente}`);
      setMis(res.data || []);
    } catch (err) {
      console.error("Error cargando mis desafíos:", err);
    }
  };

  useEffect(() => {
    cargar();
  }, [id_cliente]);

  const formatFecha = (iso) => {
    try {
      return new Date(iso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const handleClaim = async (participante) => {
    if (!participante || !participante.id_participante) return;
    const idp = participante.id_participante;
    if (!window.confirm("¿Querés reclamar la recompensa por este desafío?")) return;

    try {
      setLoadingClaim(idp);
      const res = await axios.post(`http://localhost:5000/participante-desafio/${idp}/claim`);
      const data = res.data || {};
      const xp = data.xp ?? data.xp_otorgado ?? null;
      const monedas = data.moneda ?? data.moneda_otorgada ?? null;
      const msgParts = [];
      if (xp != null) msgParts.push(`${xp} XP`);
      if (monedas != null) msgParts.push(`${monedas} monedas`);
      const extra = msgParts.length ? ` (${msgParts.join(" • ")})` : "";
      alert(data.message ? `${data.message}${extra}` : `Recompensa reclamada correctamente${extra}`);

      await cargar();
    } catch (err) {
      console.error("Error reclamando recompensa:", err);
      const msg = err?.response?.data?.error || err.message || "No se pudo reclamar la recompensa";
      alert(`Error: ${msg}`);
    } finally {
      setLoadingClaim(null);
    }
  };

  const renderActionButton = (m) => {
    const estado = m.desafio?.estado ?? "activo";
    const isClaiming = loadingClaim === m.id_participante;
    const alreadyClaimed = !!m.recibio_recompensa;

    if (estado === "activo") {
      return (
        <button
          className="action-btn action-go"
          onClick={() => navigate(`/desafios/${m.id_desafio}`)}
          aria-label={`Ir al desafío ${m.desafio?.nombre}`}
        >
          Ir al desafío
        </button>
      );
    }

    if (!alreadyClaimed) {
      return (
        <button
          className={`action-btn action-claim ${isClaiming ? "claiming" : ""}`}
          onClick={() => handleClaim(m)}
          disabled={isClaiming}
          aria-disabled={isClaiming}
        >
          {isClaiming ? "Reclamando..." : "Reclamar recompensa"}
        </button>
      );
    }

    return (
      <button
        className="action-btn reclaimed"
        disabled
        aria-disabled="true"
        title="Ya reclamaste la recompensa"
      >
        ✅ Reclamado
      </button>
    );
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1>Mis Desafíos</h1>

        {mis.length === 0 && <div className="vacio">No estás participando en ningún desafío.</div>}

        {mis.map((m) => {
          const estado = m.desafio?.estado ?? "activo";
          return (
            <div key={m.id_participante} className="mi-card" aria-live="polite">
              <h3 style={{ textAlign: "left", marginBottom: 6 }}>{m.desafio?.nombre}</h3>
              <div className="small-muted">Inscripto: {formatFecha(m.fecha_inscripcion)}</div>

              <div style={{ margin: "10px 0", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div className="small-muted">Daño: <strong style={{color: "white"}}>{m.dano_total}</strong></div>
                <div className="small-muted">Aciertos: <strong style={{color: "white"}}>{m.aciertos}</strong></div>
                <div className="small-muted" style={{ marginLeft: "auto" }}>
                  Estado: <strong style={{ color: estado === "activo" ? "#00bfa6" : "#ffd166" }}>{estado}</strong>
                </div>
              </div>

              <div className="mi-actions">
                {renderActionButton(m)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
