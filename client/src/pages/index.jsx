import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import useSesion from "../hooks/useSesion";
import Navbar from "../components/Navbar";
import "../index.css";

const DIFICULTAD_LABELS = ["Fácil", "Intermedio", "Difícil", "Experto"];

export default function Index() {
  const [ejercicios, setEjercicios] = useState([]);
  const [recomendados, setRecomendados] = useState([]);
  const [loading, setLoading] = useState(true);

  const { clienteId, cargandoSesion, usuario } = useSesion();
  const navigate = useNavigate();

  useEffect(() => {
    if (cargandoSesion) return;
    if (!clienteId) return;

    const cargarDatos = async () => {
      try {
        //Pref
        try {
          const prefRes = await axios.get(
            `http://localhost:5000/preferencias/${clienteId}`
          );
          const pref = prefRes.data;
          if (pref?.lenguaje_pref && typeof window !== "undefined") {
            window.localStorage.setItem(
              "crx_pref_lenguaje",
              pref.lenguaje_pref
            );
          }
          if (pref?.dificultad_objetivo && typeof window !== "undefined") {
            window.localStorage.setItem(
              "crx_pref_dificultad",
              String(pref.dificultad_objetivo)
            );
          }
        } catch (err) {
          if (err.response && err.response.status === 404) {
            navigate("/form-preferencias", { replace: true });
            return;
          } else {
            console.error("Error al verificar preferencias:", err);
          }
        }

        //Recomendaciones y ejercicios 
        const [resEj, resRec] = await Promise.all([
          axios.get("http://localhost:5000/ejercicios"),
          axios.get(
            `http://localhost:5000/recomendaciones/home/${clienteId}`
          ),
        ]);

        setEjercicios(resEj.data || []);
        setRecomendados(resRec.data?.recomendados || []);
      } catch (err) {
        console.error("Error cargando datos del home:", err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [cargandoSesion, clienteId, navigate]);

  if (loading || cargandoSesion) {
    return (
      <>
        <Navbar />
        <div className="index-container">
          <div className="home-loading-card">
            <p>Cargando tu panel...</p>
          </div>
        </div>
      </>
    );
  }

  const nombreUsuario =
    usuario?.nombre || usuario?.display_name || usuario?.email || "CodeReasoner";

  return (
    <>
      <Navbar />

      <div className="index-container">
        {/*Head */}
        <header className="home-header">
          <div>
            <h1 className="titulo">Bienvenido, {nombreUsuario} 👋</h1>
            <p className="home-subtitle">
              Estas son tus recomendaciones y la lista completa de ejercicios.
            </p>
          </div>
        </header>

        {/* Recomendaciones*/}
        {recomendados.length > 0 && (
          <section className="recomendados-section">
            <h2 className="subtitulo">Recomendado para vos</h2>
            <ul className="ejercicio-lista">
              {recomendados.map((ej) => (
                <li
                  key={ej.id_ejercicio}
                  className="ejercicio-card recomendado-card"
                >
                  <div className="ej-card-header">
                    <span
                      className={`badge-dificultad dif-${ej.dificultad ?? 1}`}
                    >
                      {DIFICULTAD_LABELS[ej.dificultad - 1] || "N/A"}
                    </span>
                  </div>
                  <h3 className="tituloeje">{ej.titulo}</h3>
                  <p className="ej-descripcion">
                    {ej.descripcion?.slice(0, 120) || "Ejercicio de práctica"}
                    {ej.descripcion && ej.descripcion.length > 120 ? "..." : ""}
                  </p>
                  <Link
                    to={`/ejercicio/${ej.id_ejercicio}`}
                    className="boton-ver"
                  >
                    Resolver ahora
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Ejercicios generales */}
        <section className="todos-section">
          <h2 className="subtitulo">Todos los ejercicios</h2>
          <ul className="ejercicio-lista">
            {ejercicios.map((ej) => (
              <li key={ej.id_ejercicio} className="ejercicio-card">
                <div className="ej-card-header">
                  <span
                    className={`badge-dificultad dif-${ej.dificultad ?? 1}`}
                  >
                    {DIFICULTAD_LABELS[ej.dificultad - 1] || "N/A"}
                  </span>
                </div>
                <h3 className="tituloeje">{ej.titulo}</h3>
                <p className="ej-descripcion">
                  {ej.descripcion?.slice(0, 120) || "Ejercicio de práctica"}
                  {ej.descripcion && ej.descripcion.length > 120 ? "..." : ""}
                </p>
                <Link
                  to={`/ejercicio/${ej.id_ejercicio}`}
                  className="boton-ver"
                >
                  Ver ejercicio
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
