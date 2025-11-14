import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import BossCard from "../../components/BossCard";
import "./desafios.css";

export default function Desafios() {
  const [desafios, setDesafios] = useState([]);
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [dificultad, setDificultad] = useState(searchParams.get("dificultad") || "");
  const [lenguaje, setLenguaje] = useState(searchParams.get("lenguaje") || "");

  useEffect(() => {
    const params = {};
    if (dificultad) params.dificultad = dificultad;
    if (lenguaje) params.lenguaje = lenguaje;
    setSearchParams(params);
  }, [dificultad, lenguaje, setSearchParams]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (dificultad) p.set("dificultad", dificultad);
    if (lenguaje) p.set("lenguaje", lenguaje);
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  }, [dificultad, lenguaje]);

  const cargar = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/desafios${query}`);
      setDesafios(res.data || []);
    } catch (err) {
      console.error("Error cargando desafíos:", err);
    }
  };

  useEffect(() => {
    cargar();
  }, [query]); 

  const limpiarFiltros = () => {
    setDificultad("");
    setLenguaje("");
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1 className="titulo-desafio">Desafíos</h1>

        <div className="filtros-desafios" style={{display:"flex", gap:12, alignItems:"center", margin:"0 0 18px"}}>
          <select
            value={dificultad}
            onChange={(e) => setDificultad(e.target.value)}
            className="filter-select"
            aria-label="Filtrar por dificultad"
          >
            <option value="">Dificultad (todas)</option>
            <option value="facil">Fácil</option>
            <option value="intermedio">Intermedio</option>
            <option value="dificil">Difícil</option>
            <option value="experto">Experto</option>
          </select>

          <select
            value={lenguaje}
            onChange={(e) => setLenguaje(e.target.value)}
            className="filter-select"
            aria-label="Filtrar por lenguaje"
          >
            <option value="">Lenguaje (todos)</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="php">PHP</option>
          </select>

          {(dificultad || lenguaje) && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="btn-secondary"
              style={{padding:"8px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)"}}
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="desafios-list">
          {desafios.length === 0 && (
            <div className="vacio">No hay desafíos disponibles.</div>
          )}
          {desafios.map((d) => (
            <BossCard
              key={d.id_desafio}
              desafio={d}
              onClick={() => navigate(`/desafios/${d.id_desafio}`)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
