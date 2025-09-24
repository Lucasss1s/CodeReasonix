import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar"; 
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
  const [preview, setPreview] = useState(null);

  const id_cliente = localStorage.getItem("cliente");

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
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("foto", file);

    try {
      const res = await axios.post(
        `http://localhost:5000/perfil/${id_cliente}/foto`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setPerfil({ ...perfil, foto_perfil: res.data.url });
      setPreview(res.data.url);
      setMensaje("Foto actualizada ✅");
    } catch (err) {
      console.error("Error subiendo foto:", err);
      setMensaje("Error al subir la foto ❌");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/perfil/${id_cliente}`, perfil);
      setMensaje("Perfil actualizado ✅");

      setTimeout(() => {
        window.location.reload();
      }, 800); 
    } catch (err) {
      console.error("Error actualizando perfil:", err);
      setMensaje("Error al actualizar ❌");
    }
  };

  return (
    <>
      <Navbar /> 

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
          <input type="number" value={perfil.nivel ?? 1} readOnly />

          <label>Reputación</label>
          <input type="number" value={perfil.reputacion ?? 0} readOnly />

          <label>Redes Sociales</label>
          <input
            type="text"
            value={perfil.redes_sociales || ""}
            onChange={(e) => setPerfil({ ...perfil, redes_sociales: e.target.value })}
          />

          <label>Foto de perfil</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
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
