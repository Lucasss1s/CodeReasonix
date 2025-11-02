import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import BossCard from "../../components/BossCard";
import "./desafios.css"; // mismo estilo que usás en otras páginas

export default function Desafios() {
  const [desafios, setDesafios] = useState([]);
  const navigate = useNavigate();

  const cargar = async () => {
    try {
      const res = await axios.get("http://localhost:5000/desafios");
      setDesafios(res.data || []);
    } catch (err) {
      console.error("Error cargando desafíos:", err);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1>Desafíos</h1>
        <div className="desafios-list">
          {desafios.length === 0 && <div className="vacio">No hay desafíos disponibles.</div>}
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
