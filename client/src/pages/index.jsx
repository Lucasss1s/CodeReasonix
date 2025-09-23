import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { supabase } from "../config/supabase.js";
import "../index.css"; 

export default function Index() {
  const [ejercicios, setEjercicios] = useState([]);
  const [usuario, setUsuario] = useState(null);

  // Obtener ejercicios
  useEffect(() => {
    axios.get("http://localhost:5000/ejercicios")
      .then(res => setEjercicios(res.data))
      .catch(err => console.error(err));
  }, []);

  // Obtener sesión y el nombre del usuario
  useEffect(() => {
    const fetchUsuario = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (user) {
        const { data, error } = await supabase
          .from("usuario")
          .select("nombre")
          .eq("email", user.email)
          .single();

        if (error) {
          console.error("Error al obtener el nombre:", error);
          setUsuario({ nombre: user.email }); 
        } else {
          setUsuario(data);
        }
      } else {
        setUsuario(null);
      }
    };

    fetchUsuario();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from("usuario")
          .select("nombre")
          .eq("email", session.user.email)
          .single()
          .then(({ data }) => setUsuario(data))
          .catch(() => setUsuario({ nombre: session.user.email }));
      } else {
        setUsuario(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <nav className="navbar">
        <h1 className="logo">CodeReasonix</h1>
        <div className="nav-buttons">
          <Link to="/comunidad" className="btn-nav">Comunidad</Link>
          {usuario ? (
            <>
              <span className="usuario-nombre">Hola, {usuario.nombre}</span>
              <Link to="/logout" className="btn-nav">Cerrar Sesión</Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn-nav">Registrarse</Link>
              <Link to="/login" className="btn-nav">Iniciar Sesión</Link>
            </>
          )}
        </div>
      </nav>

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
