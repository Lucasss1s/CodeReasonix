import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";  
import "../index.css";

export default function Index() {
  const [ejercicios, setEjercicios] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/ejercicios")
      .then(res => setEjercicios(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <>
      <Navbar /> 

      <div className="index-container">
        <h1 className="titulo">Lista de Ejercicios</h1>

        <ul className="ejercicio-lista">
          {ejercicios.map(ej => (
            <li key={ej.id_ejercicio} className="ejercicio-card">
              <h2 className="tituloeje">{ej.titulo}</h2>
              <p>Dificultad: {ej.dificultad}</p>
              <Link to={`/ejercicio/${ej.id_ejercicio}`} className="boton-ver">
                Ver ejercicio
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
