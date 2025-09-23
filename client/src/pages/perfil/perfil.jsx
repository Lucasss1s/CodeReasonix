import { useEffect, useState } from "react";
import axios from "axios";
import { supabase } from "../../config/supabase.js";
import { Link } from "react-router-dom";
import "./perfil.css"; 

export default function Perfil() {
  const [perfil, setPerfil] = useState({
    biografia: "",
    skills: "",
    nivel: 1,
    reputacion: 0,
    redes_sociales: "",
    foto_perfil: ""
  });
  const [mensaje, setMensaje] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [preview, setPreview] = useState(null);

  const id_cliente = localStorage.getItem("cliente");

  // 🔹 Cargar perfil
  const cargarPerfil = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/perfil/${id_cliente}`);
      setPerfil(res.data || {});
      if (res.data?.foto_perfil) {
        setPreview(res.data.foto_perfil);
      }
    } catch (err) {
      console.error("Error cargando perfil:", err);
    }
  };

  useEffect(() => {
    cargarPerfil();

    // Obtener nombre del usuario (para la navbar)
    const fetchUsuario = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (user) {
        const { data } = await supabase
          .from("usuario")
          .select("nombre")
          .eq("email", user.email)
          .single();

        setUsuario(data || { nombre: user.email });
      }
    };
    fetchUsuario();
  }, []);

  // 🔹 Manejar subida de imagen
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result); // Mostrar preview
        setPerfil({ ...perfil, foto_perfil: reader.result }); // Guardar base64
      };
      reader.readAsDataURL(file);
    }
  };

  // 🔹 Guardar perfil
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/perfil/${id_cliente}`, perfil);
      setMensaje("Perfil actualizado ✅");
    } catch (err) {
      console.error("Error actualizando perfil:", err);
      setMensaje("Error al actualizar ❌");
    }
  };

  return (
    <>
      {/* 🔹 Navbar igual a las otras páginas */}
      <nav className="navbar">
        <h1 className="logo">CodeReasonix</h1>
        <div className="nav-buttons">
          <Link to="/" className="btn-nav">Inicio</Link>
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

      {/* 🔹 Formulario de perfil */}
      <div className="perfil-container">
        <h1>Mi Perfil</h1>
        <form onSubmit={handleSubmit} className="perfil-form">
          <label>Biografía</label>
          <textarea
            value={perfil.biografia || ""}
            onChange={(e) => setPerfil({ ...perfil, biografia: e.target.value })}
          />

          <label>Skills</label>
          <input
            type="text"
            value={perfil.skills || ""}
            onChange={(e) => setPerfil({ ...perfil, skills: e.target.value })}
          />

          <label>Nivel</label>
          <input
            type="number"
            value={perfil.nivel ?? 1}
            readOnly
          />

          <label>Reputación</label>
          <input
            type="number"
            value={perfil.reputacion ?? 0}
            readOnly
          />

          <label>Redes Sociales</label>
          <input
            type="text"
            value={perfil.redes_sociales || ""}
            onChange={(e) => setPerfil({ ...perfil, redes_sociales: e.target.value })}
          />

          <label>Foto de perfil</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          {preview && (
            <div className="preview">
              <img src={preview} alt="Foto de perfil" />
            </div>
          )}

          <button type="submit">Guardar cambios</button>
        </form>
        {mensaje && <p className="mensaje">{mensaje}</p>}
      </div>
    </>
  );
}
