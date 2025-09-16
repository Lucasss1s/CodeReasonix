import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../config/supabase.js";
import "../index.css"; 

export default function Index() {
  const [ejercicios, setEjercicios] = useState([]);
  const [usuario, setUsuario] = useState(null); // Aquí guardaremos el nombre
  const navigate = useNavigate();

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
        // Consultar tu tabla 'usuario' para obtener el nombre
        const { data, error } = await supabase
          .from("usuario")
          .select("nombre")
          .eq("email", user.email)
          .single();

        if (error) {
          console.error("Error al obtener el nombre:", error);
          setUsuario({ nombre: user.email }); // fallback
        } else {
          setUsuario(data);
        }
      } else {
        setUsuario(null);
      }
    };

    fetchUsuario();

    // Escuchar cambios de sesión
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

  // Función de logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    navigate("/");
  };

  return (
    <div className="index-container">
      {/* Barra de navegación */}
      <nav className="navbar">
        <h1 className="logo">CodeReasonix</h1>
        <div className="nav-buttons">
          {usuario ? (
            <>
              <span className="usuario-nombre">Hola, {usuario.nombre}</span>
              <button onClick={handleLogout} className="btn-nav">Cerrar Sesión</button>
            </>
          ) : (
            <>
              <Link to="/register" className="btn-nav">Registrarse</Link>
              <Link to="/login" className="btn-nav">Iniciar Sesión</Link>
            </>
          )}
        </div>
      </nav>

      <h1 className="titulo">Lista de Ejercicios</h1>

      <ul className="ejercicio-lista">
        {ejercicios.map(ej => (
          <li key={ej.id_ejercicio} className="ejercicio-card">
            <h2>{ej.titulo}</h2>
            <p>Dificultad: {ej.dificultad}</p>
            <Link to={`/ejercicio/${ej.id_ejercicio}`} className="boton-ver">
              Ver ejercicio
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
