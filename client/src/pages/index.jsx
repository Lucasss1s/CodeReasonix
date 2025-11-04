import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import "../index.css";
import RewardOnRoute from "../components/RewardOnRoute";

export default function Index() {
  const [ejercicios, setEjercicios] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/ejercicios")
      .then((res) => setEjercicios(res.data))
      .catch((err) => console.error(err));

    const id = localStorage.getItem("cliente");
    if (!id) return;

    (async () => {
      try {
        const res = await fetch("http://localhost:5000/gamificacion/login-xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_cliente: Number(id) }),
        });
        const data = await res.json();

        const a = data?.reward_login?.amount || 0;   
        const b = data?.reward_streak?.amount || 0;  
        const total = a + b;

        if (total > 0) {
          const icon = b > 0 ? "🔥" : "💎";
          const note =
            b > 0 && (data?.streak ?? 0) >= 2
              ? `🔥 Racha x${data.streak} (+${b})`
              : undefined;

          window.dispatchEvent(
            new CustomEvent("reward", { detail: { amount: total, icon, note } })
          );
        }
      // eslint-disable-next-line 
      } catch (_) {}
    })();
  }, []);

  return (
    <>
      <Navbar />

      <RewardOnRoute position="top-center" duration={2400} size="lg" />

      <div className="index-container">
        <h1 className="titulo">Lista de Ejercicios</h1>

        <ul className="ejercicio-lista">
          {ejercicios.map((ej) => (
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
