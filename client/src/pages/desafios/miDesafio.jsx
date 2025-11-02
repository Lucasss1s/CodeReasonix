import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./desafios.css";

export default function MisDesafios() {
  const [mis, setMis] = useState([]);
  const id_cliente = localStorage.getItem("cliente");

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
    // eslint-disable-next-line
  }, []);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1>Mis Desafíos</h1>
        {mis.length === 0 && <div className="vacio">No estás participando en ningún desafío.</div>}
        {mis.map((m) => (
          <div key={m.id_participante} className="mi-card">
            <h3>{m.desafio?.nombre}</h3>
            <div className="small-muted">Inscripto: {new Date(m.fecha_inscripcion).toLocaleString()}</div>
            <div>
              Daño: {m.dano_total} • Aciertos: {m.aciertos}
            </div>
            <Link to={`/desafios/${m.id_desafio}`} className="btn-secondary">
              Ver desafío
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
