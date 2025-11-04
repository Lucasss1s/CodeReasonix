import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./desafios.css";

export default function MisDesafios() {
  const [mis, setMis] = useState([]);
  const id_cliente_raw = localStorage.getItem("cliente");
  const id_cliente = id_cliente_raw ? Number(id_cliente_raw) : null;

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

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1>Mis Desafíos</h1>

        {mis.length === 0 && <div className="vacio">No estás participando en ningún desafío.</div>}

        {mis.map((m) => (
          <div key={m.id_participante} className="mi-card">
            <h3>{m.desafio?.nombre}</h3>
            <div className="small-muted">Inscripto: {formatFecha(m.fecha_inscripcion)}</div>

            <div style={{ margin: "10px 0", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div className="small-muted">Daño: <strong style={{color: "white"}}>{m.dano_total}</strong></div>
              <div className="small-muted">Aciertos: <strong style={{color: "white"}}>{m.aciertos}</strong></div>
            </div>

            <div style={{ marginTop: 8 }}>
              <Link to={`/desafios/${m.id_desafio}`} className="btn-secondary">
                Ver desafío
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
