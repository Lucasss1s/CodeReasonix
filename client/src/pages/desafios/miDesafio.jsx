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
      const res = await axios.get(
        `http://localhost:5000/participante-desafio/mis/${id_cliente}`
      );
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

  const formatDificultad = (difRaw) => {
    if (!difRaw) return "Sin dificultad";
    const dif = String(difRaw).toLowerCase();
    switch (dif) {
      case "facil":
        return "Fácil";
      case "intermedio":
        return "Intermedio";
      case "dificil":
        return "Difícil";
      case "experto":
        return "Experto";
      default:
        return difRaw;
    }
  };

  const dificultadChipClass = (difRaw) => {
    if (!difRaw) return "";
    const dif = String(difRaw).toLowerCase();
    switch (dif) {
      case "facil":
        return "mi-chip--diff-facil";
      case "intermedio":
        return "mi-chip--diff-intermedio";
      case "dificil":
        return "mi-chip--diff-dificil";
      case "experto":
        return "mi-chip--diff-experto";
      default:
        return "";
    }
  };

  const formatLenguaje = (langRaw) => {
    if (!langRaw) return "Sin lenguaje";
    const lang = String(langRaw).toLowerCase();
    switch (lang) {
      case "java":
        return "Java";
      case "python":
        return "Python";
      case "javascript":
        return "JavaScript";
      case "php":
        return "PHP";
      default:
        return langRaw;
    }
  };

  const lenguajeChipClass = (langRaw) => {
    if (!langRaw) return "";
    const lang = String(langRaw).toLowerCase();
    switch (lang) {
      case "java":
        return "mi-chip--lang-java";
      case "python":
        return "mi-chip--lang-python";
      case "javascript":
        return "mi-chip--lang-javascript";
      case "php":
        return "mi-chip--lang-php";
      default:
        return "";
    }
  };

  const getEstadoClass = (estadoRaw) => {
    const e = String(estadoRaw || "").toLowerCase();
    if (e === "activo") return "mi-estado--activo";
    if (e === "finalizado") return "mi-estado--finalizado";
    return "mi-estado--otro";
  };

  const handleClaim = async (participante) => {
    if (!participante || !participante.id_participante) return;
    const idp = participante.id_participante;
    if (!window.confirm("¿Querés reclamar la recompensa por este desafío?")) return;

    try {
      setLoadingClaim(idp);
      const res = await axios.post(
        `http://localhost:5000/participante-desafio/${idp}/claim`
      );
      const data = res.data || {};
      const xp = data.xp ?? data.xp_otorgado ?? null;
      const monedas = data.moneda ?? data.moneda_otorgada ?? null;
      const msgParts = [];
      if (xp != null) msgParts.push(`${xp} XP`);
      if (monedas != null) msgParts.push(`${monedas} monedas`);
      const extra = msgParts.length ? ` (${msgParts.join(" • ")})` : "";
      alert(
        data.message
          ? `${data.message}${extra}`
          : `Recompensa reclamada correctamente${extra}`
      );

      await cargar();
    } catch (err) {
      console.error("Error reclamando recompensa:", err);
      const msg =
        err?.response?.data?.error ||
        err.message ||
        "No se pudo reclamar la recompensa";
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
        <h1 className="titulo-desafio">Mis Desafíos</h1>

        {mis.length === 0 && (
          <div className="vacio">No estás participando en ningún desafío.</div>
        )}

        {mis.map((m) => {
          const estado = m.desafio?.estado ?? "activo";
          const dificultad = m.desafio?.dificultad ?? "";
          const lenguaje = m.desafio?.lenguaje ?? "";
          const recompensaXp = m.desafio?.recompensa_xp ?? 0;
          const recompensaMoneda = m.desafio?.recompensa_moneda ?? 0;

          const diffClass = dificultadChipClass(dificultad);
          const langClass = lenguajeChipClass(lenguaje);
          const estadoClass = getEstadoClass(estado);

          return (
            <div key={m.id_participante} className="mi-card" aria-live="polite">
              <h3>{m.desafio?.nombre}</h3>

              <div className="small-muted">
                Inscripto: {formatFecha(m.fecha_inscripcion)}
              </div>

              <div className="mi-chips-row">
                <span className={`mi-chip ${diffClass}`}>
                  {formatDificultad(dificultad)}
                </span>
                <span className={`mi-chip ${langClass}`}>
                  {formatLenguaje(lenguaje)}
                </span>
              </div>

              <div className="mi-stats-row">
                <div className="small-muted">
                  Daño: <strong>{m.dano_total}</strong>
                </div>
                <div className="small-muted">
                  Aciertos: <strong>{m.aciertos}</strong>
                </div>
                <div className="small-muted mi-stats-estado">
                  <span>Estado:</span>
                  <span className={`mi-estado ${estadoClass}`}>{estado}</span>
                </div>
              </div>

              <div className="mi-card-reward">
                Recompensa:{" "}
                <strong>
                  {recompensaXp} XP • {recompensaMoneda} monedas
                </strong>
              </div>

              <div className="mi-actions">{renderActionButton(m)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
